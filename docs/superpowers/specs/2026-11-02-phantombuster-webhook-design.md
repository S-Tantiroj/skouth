# ดึงข้อมูลทันทีเมื่อ phantom รันเสร็จ (PhantomBuster webhook → GitHub Actions)

วันที่ 2026-11-02 · ขนาดงาน: เล็ก (route ใหม่ 1 ไฟล์ + แก้ workflow + แก้สคริปต์ 1 บรรทัด)

## เจตนา

วันนี้ทดสอบการดึงข้อมูลจาก PhantomBuster กับ API จริงผ่านแล้ว (ingest_runs 2 รอบ, 11 คนเข้าระบบ)
แต่ workflow `sync-candidates` รันได้เฉพาะเมื่อมีคนกด Run workflow เอง ผู้ใช้ต้องการให้
**phantom รันเสร็จเมื่อไร ข้อมูลเข้าระบบเองทันที** โดยไม่ต้องกดและไม่ต้องรอรอบตามเวลา

## เป้าหมาย

- phantom ที่ตั้งไว้รันเสร็จสำเร็จ → workflow `sync-candidates` เริ่มรันเองภายในไม่กี่วินาที
- ใช้สคริปต์ `scripts/sync-phantombuster.ts` ตัวเดิมที่ทดสอบผ่านแล้ว ไม่เขียนเส้นทางนำเข้าใหม่
- ประวัติที่ `/import/auto` แยกได้ว่ารอบไหนมาจาก webhook รอบไหนกดเอง

## ไม่ใช่เป้าหมาย

- ไม่นำเข้าข้อมูลบน Vercel โดยตรง (ทาง B ที่ตัดทิ้ง ดูหัวข้อทางเลือก)
- ไม่เปิดตาราง cron — แยกเป็นเรื่องของมันเอง
- ไม่ตั้งเวลารัน phantom ให้ — ผู้ใช้ตั้งเองในหน้า PhantomBuster

## สิ่งที่ต้องไม่เกิด (anti-goals)

- **คนนอกยิง URL แล้วสั่งรัน workflow ได้** — route เป็น URL สาธารณะ ไม่มี session
  ถ้ารั่วคือสั่งให้ระบบเรียก PhantomBuster + Gemini ซ้ำๆ ได้ตามใจ
- **webhook ถูก PhantomBuster ถอดทิ้งเงียบๆ** — PhantomBuster ถอด webhook ออกจากการตั้งค่า
  เมื่อได้ status 4xx (เอกสาร "Webhook errors") ความล้มเหลวที่ไม่ใช่ความผิดของผู้ส่ง
  (GitHub ล่ม, token หมดอายุ) จึงต้องตอบ 5xx ไม่ใช่ 4xx
- **phantom ที่รันล้มเหลวไปกระตุ้นการนำเข้า** — ไฟล์ผลลัพธ์อาจเป็นของรอบก่อนหรือไม่ครบ

## ข้อจำกัดภายนอก (ยืนยันกับเอกสารแล้ว 2026-11-02)

จาก https://hub.phantombuster.com/docs/using-webhooks

- PhantomBuster ส่ง `POST` พร้อม JSON เมื่อ agent จบการทำงาน ฟิลด์ที่ใช้: `agentId`,
  `exitCode` (0 = สำเร็จ), `exitMessage`
- **ตั้ง header เองไม่ได้** — รหัสลับต้องส่งผ่าน query string: `...?secret=...`
- เพดานเวลา 11 วินาที (เปิด connection 5 + รอ header 5 + อ่าน 1) — route ต้องตอบเร็ว
- ไม่ตาม redirect เกิน 2 ครั้ง · body ของคำตอบถูกเมิน
- 4xx / redirect ผิด = ถอด webhook · timeout และ network error ไม่ถอด

## ทางเลือกที่พิจารณา

| ทาง | วิธี | ข้อแลก |
|---|---|---|
| **A (เลือก)** | webhook → route บน Vercel → GitHub API สั่งรัน workflow เดิม | ข้อมูลเข้าภายใน ~1 นาที, ใช้สคริปต์เดิม, งานยาวยังรันบน GitHub · ต้องมี GitHub token อีกตัวใน Vercel และ route สาธารณะต้องตรวจรหัสลับ |
| B | webhook → route บน Vercel นำเข้าเอง | สั้นสุด · ชนเพดานเวลาของ Vercel + จังหวะ 1.2 วินาที/คนของ Gemini free tier — เล่มบท 2.4.4 ระบุไว้แล้วว่างานนำเข้ายาวจึงไปอยู่บน GitHub Actions |
| C | cron ถี่ๆ (ทุกชั่วโมง) | ไม่ต้องเขียนโค้ด · ช้าได้ถึง 1 ชม. และ `ingest_runs` เต็มไปด้วยรอบที่ไม่มีอะไรเปลี่ยน |

ผู้ใช้เลือก **A** เมื่อ 2026-11-02

## การออกแบบ

### 1. Route `POST /api/webhooks/phantombuster`

ลำดับการตัดสิน (ลำดับสำคัญ — ตรวจรหัสลับก่อนอ่านอะไรอื่น):

1. `secret` ใน query ไม่ตรง `PHANTOMBUSTER_WEBHOOK_SECRET` → **401**
   เทียบแบบ timing-safe · ถ้า env ไม่ได้ตั้ง ให้ปฏิเสธทุกคำขอ (ปิดประตูเป็นค่าตั้งต้น
   หลักเดียวกับ `decideAccess`) และตอบ **503** ไม่ใช่ 401 เพราะเป็นความผิดฝั่งเรา
   ไม่ควรทำให้ webhook ถูกถอด
2. body อ่านไม่ได้ / ไม่ใช่ JSON → **200** และไม่ทำอะไร (log ไว้) — ไม่ตอบ 400
   เพราะ 4xx ทำให้ webhook ที่ตั้งถูกต้องถูกถอด
3. env `PHANTOMBUSTER_AGENT_ID` ว่าง → **503** (ความผิดฝั่งเรา) · `agentId` ไม่ตรง → **200** ไม่ทำอะไร
4. `exitCode !== 0` → **200** ไม่ทำอะไร (phantom รันล้มเหลว)
5. เรียก GitHub API สั่งรัน workflow → สำเร็จตอบ **202** · ล้มเหลวตอบ **502**
   (5xx ไม่ทำให้ webhook ถูกถอด)

- ไม่ต้องมี session — `middleware.ts` ปล่อย `/api/*` ผ่านโดยไม่ redirect อยู่แล้ว
  และ `/api/webhooks` ไม่อยู่ใน `PROTECTED_PREFIXES`
- ตอบให้เสร็จภายในเพดาน 11 วินาที: การเรียก GitHub มี timeout 3.5 วินาที (PhantomBuster รอ response header แค่ 5 วินาที)
- ไม่ส่งข้อความ error ดิบของ GitHub กลับไป (หลักเดียวกับ "ห้ามส่งข้อความ Postgres ดิบ")

### 2. สั่งรันด้วย `workflow_dispatch` API ไม่ใช่ `repository_dispatch` *(การตัดสินใจของผู้ออกแบบ)*

`POST https://api.github.com/repos/S-Tantiroj/skouth/actions/workflows/sync-candidates.yml/dispatches`
body `{ "ref": "main", "inputs": { "source": "webhook" } }` → GitHub ตอบ 204

เหตุผล: `repository_dispatch` ต้องใช้ token สิทธิ์ **Contents: write** ซึ่งแก้โค้ดใน repo ได้
ส่วน `workflow_dispatch` ใช้แค่ **Actions: write** — ถ้า token รั่ว ความเสียหายแคบกว่ามาก

### 3. Workflow

เพิ่ม input ให้ `workflow_dispatch` และส่งต่อเข้าสคริปต์:

```yaml
workflow_dispatch:
  inputs:
    source:
      description: 'ที่มาของการรัน'
      required: false
      default: 'manual'
```

และใน env ของขั้นรันสคริปต์: `RUN_SOURCE: ${{ inputs.source }}`

กด Run workflow เองจากหน้า GitHub ยังได้ค่า `manual` เหมือนเดิม
`concurrency` เดิม (`cancel-in-progress: false`) ทำให้ webhook ที่มาซ้อนกันเข้าคิว ไม่ชนกัน

### 4. สคริปต์ (1 บรรทัด)

`trigger` ใน `ingest_runs` เปลี่ยนจาก schedule→'scheduled' / อื่นๆ→'manual'
เป็น schedule→'scheduled' / `RUN_SOURCE === 'webhook'`→'webhook' / อื่นๆ→'manual'
คอลัมน์เป็น `text` ไม่มี CHECK constraint (migration 013) **จึงไม่ต้องมี migration**
หน้า `/import/auto` แสดงค่านี้ในคอลัมน์ "ที่มา" อยู่แล้ว

### 5. ค่าที่ต้องตั้งเพิ่ม (Vercel, Production, ชนิด Secret)

| ชื่อ | ค่า |
|---|---|
| `PHANTOMBUSTER_WEBHOOK_SECRET` | สตริงสุ่มยาว (เช่น 32 ไบต์ hex) |
| `GITHUB_DISPATCH_TOKEN` | fine-grained PAT จำกัดเฉพาะ repo `skouth` สิทธิ์ **Actions: Read and write** อย่างเดียว |

`PHANTOMBUSTER_AGENT_ID` มีใน Vercel แล้ว

ฝั่ง PhantomBuster: หน้า phantom → Settings → Advanced Notification Settings → Webhook
`https://skouth.vercel.app/api/webhooks/phantombuster?secret=<ค่าเดียวกัน>`
— ใช้โดเมน production ตรง ไม่ผ่าน redirect

## การทดสอบ

ตามแนวทางของ repo (TDD, `route.test.ts` แบบ mock `fetch`):

- รหัสลับผิด / ไม่มี → 401 และ **ไม่เรียก GitHub** (ตรวจว่า "ปฏิเสธก่อนทำงาน" ไม่ใช่แค่ status)
- env รหัสลับไม่ได้ตั้ง → 503 และไม่เรียก GitHub
- `exitCode` ≠ 0 → 200 ไม่เรียก GitHub
- `agentId` ไม่ตรง → 200 ไม่เรียก GitHub
- body เสีย → 200 ไม่เรียก GitHub
- กรณีปกติ → 202 และเรียก GitHub ด้วย URL, `ref: main`, `inputs.source: webhook`, header token ถูกต้อง
- GitHub ตอบ 4xx/5xx หรือ timeout → 502 (ไม่ใช่ 4xx)
- hardcode ค่าภายนอกในเทสต์ (ชื่อไฟล์ workflow, repo) ตามหลัก "เทสต์ที่อ่านค่าคงที่จากโค้ดจับค่าผิดไม่ได้"

ทดสอบจริงหลัง deploy: กด Launch ที่ phantom → ดู Actions มีรอบใหม่ที่ event เป็น
workflow_dispatch → `/import/auto` มีแถวที่ที่มาเป็น `phantombuster · webhook`

## ทิ้งไว้ให้ผู้ลงมือ

- ชื่อและตำแหน่งไฟล์ helper (เช่น แยกตรรกะตัดสินเป็นฟังก์ชันบริสุทธิ์ใน `lib/ingest/`)
- ค่า timeout ที่แน่นอนของการเรียก GitHub (ต้องต่ำกว่า 11 วินาที)
- ข้อความ log

## เอกสารที่ต้องอัปเดตตาม

- `CLAUDE.md` หัวข้อ Phase 8 — การดึงอัตโนมัติยืนยันกับ API จริงแล้ว และมีเส้นทาง webhook
- หน้า `/import/auto` ข้อความในการ์ดสถานะ (ปัจจุบันพูดถึงแค่ cron)
