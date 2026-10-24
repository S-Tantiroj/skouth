# บทที่ 4 — ร่างพร้อมวางลง Word (2026-10-21)

เขียนจากระบบเวอร์ชัน **1.1.1** (tag `v1.1.1` · ต่างจาก `v1.1.0` เฉพาะคอมเมนต์ที่ย่อ) ตัวเลขจำนวนไฟล์ทุกตัว
นับจากรีโปจริงเมื่อ 2026-10-21 · ข้อความในกรอบ `>` คือหมายเหตุถึงผู้เขียน **ไม่ต้องคัดลอกลงเล่ม**

> **ภาพหน้าจอเว็บไซต์ย้ายไปบทที่ 5 แล้ว (2026-10-22)** — หัวข้อ 4.2 เหลือคำอธิบายกับตารางโค้ด
> และอ้างถึงภาพในบทที่ 5 · บทนี้เหลือภาพเพียง 2 ภาพในหัวข้อ 4.3 (หน้าตั้งค่า Supabase และ Vercel)

---
---

# บทที่ 4

# การพัฒนาระบบ

## 4.1 เครื่องมือที่ใช้ในการพัฒนาระบบ

เครื่องมือที่ใช้ในการพัฒนาระบบแบ่งตามประเภทเป็นภาษาโปรแกรม (ตารางที่ 4-1) ซอฟต์แวร์และบริการ
(ตารางที่ 4-2) และไลบรารี (ตารางที่ 4-3) แต่ละตารางระบุรุ่นที่ใช้งานจริง ส่วนของระบบที่ใช้
และคำอธิบายการใช้งาน

ตารางที่ 4-1 ภาษาโปรแกรมที่ใช้ในการพัฒนาระบบ

| เครื่องมือ | รุ่น | การใช้งาน | คำอธิบายการใช้งาน |
|---|---|---|---|
| TypeScript | 5.9.3 | Frontend, Backend, API | ภาษาหลักของทั้งระบบ ทั้งส่วนแสดงผล ส่วนประมวลผล และชุดทดสอบ จึงใช้นิยามชนิดข้อมูลร่วมกันได้ทั้งโครงงาน |
| SQL (PostgreSQL) | 17.6 | Database | สร้างตาราง ฟังก์ชันค้นหา และสิทธิ์การเข้าถึงข้อมูล เขียนเป็นไฟล์ migration 24 ไฟล์ |
| CSS | — | Frontend | กำหนดสี ระยะ และคลาสที่ใช้ซ้ำทั้งระบบไว้ในไฟล์เดียว ไม่ใช้ไลบรารีส่วนติดต่อผู้ใช้หรือไลบรารีกราฟ |

ตารางที่ 4-2 ซอฟต์แวร์และบริการที่ใช้ในการพัฒนาระบบ

| เครื่องมือ | รุ่น | การใช้งาน | คำอธิบายการใช้งาน |
|---|---|---|---|
| Node.js | 24 (LTS) | Server, Backend | สภาพแวดล้อมสำหรับรันระบบและชุดคำสั่งเสริม |
| Supabase | PostgreSQL 17.6 | Database, API, Server | ฐานข้อมูล ระบบยืนยันตัวตน REST API อัตโนมัติ และการควบคุมสิทธิ์ระดับแถวและระดับคอลัมน์ |
| Google Gemini API | gemini-embedding-001 · gemini-3.5-flash-lite · gemini-3.8-flash | API | สร้างเวกเตอร์ความหมาย สกัดตัวกรองการค้นหา อ่านไฟล์ PDF และประเมินความเหมาะสม |
| Vercel | — | Server | เผยแพร่ระบบที่ skouth.vercel.app สร้างและเผยแพร่ใหม่อัตโนมัติเมื่อส่งโค้ดขึ้นกิ่งหลัก |
| tsx | 4.23.1 | Backend | รันชุดคำสั่งเสริมที่เขียนด้วย TypeScript เช่น สร้างข้อมูลสังเคราะห์ และเปรียบเทียบแบบจำลอง |
| Git และ GitHub | — | Frontend, Backend, Database | ควบคุมเวอร์ชันของซอร์สโค้ดและไฟล์ migration และติดป้ายเวอร์ชันที่ส่งมอบ (v1.0.0 · v1.1.0) |
| Visual Studio Code | — | Frontend, Backend | โปรแกรมแก้ไขซอร์สโค้ด |

ตารางที่ 4-3 ไลบรารีและกรอบงานที่ใช้ในการพัฒนาระบบ

| เครื่องมือ | รุ่น | การใช้งาน | คำอธิบายการใช้งาน |
|---|---|---|---|
| Next.js (App Router) | 15.5.21 | Frontend, Backend, API | สร้างหน้าเว็บ 26 หน้าและ API 21 เส้นทางในโครงงานเดียว พร้อม Middleware กันหน้าที่ต้องเข้าสู่ระบบ |
| React | 19.2.8 | Frontend | สร้างส่วนติดต่อผู้ใช้ แบ่งเป็น Server Component สำหรับหน้าที่อ่านข้อมูล และ Client Component สำหรับหน้าที่ต้องโต้ตอบ |
| lucide-react | 1.41.0 | Frontend | ชุดสัญลักษณ์ในส่วนติดต่อผู้ใช้ |
| @supabase/supabase-js | 2.110.8 | Frontend, Backend, Database | เชื่อมต่อฐานข้อมูลและระบบยืนยันตัวตน แยกไคลเอนต์ฝั่งเบราว์เซอร์ (คีย์สาธารณะ) ออกจากฝั่งเซิร์ฟเวอร์ (คีย์บริการ) |
| @supabase/ssr | 0.5.2 | Frontend, Backend, Server | จัดการการเข้าสู่ระบบผ่านคุกกี้ ทั้งในเบราว์เซอร์ ฝั่งเซิร์ฟเวอร์ และ Middleware |
| @google/genai | 1.52.0 | Backend, API | เรียกใช้ Google Gemini ทั้งการสร้างเวกเตอร์และแบบจำลองภาษา |
| papaparse | 5.5.4 | Backend | อ่านไฟล์ CSV ที่นำเข้า |
| pgvector | 0.8.2 | Database | ส่วนขยายของ PostgreSQL เก็บเวกเตอร์ 768 มิติ และค้นหาด้วยความคล้ายเชิงโคไซน์ผ่านตัวดำเนินการ `<=>` |
| Vitest | 2.1.9 | Frontend, Backend, Database | ทดสอบระบบ แบ่งเป็นชุดหน่วย 72 ไฟล์ และชุดบูรณาการที่เชื่อมต่อฐานข้อมูลจริง 17 ไฟล์ |

> **ที่มาของรุ่น** — ไลบรารีอ่านจาก `package-lock.json` (รุ่นที่ติดตั้งจริง ไม่ใช่ช่วงรุ่นใน
> `package.json`) · PostgreSQL และ pgvector อ่านจากฐานข้อมูลจริงเมื่อ 2026-10-22 ·
> Node.js จาก `.github/workflows/sync-candidates.yml` · **ช่อง "—" ให้เติมรุ่นที่ใช้บนเครื่อง**
> สำหรับ Git และ Visual Studio Code ส่วน Vercel เป็นบริการที่ไม่มีเลขรุ่น
>
> **แก้ตัวเลขที่ผิดในร่างก่อนหน้า** — เคยเขียน TypeScript 5.6 · supabase-js 2.45 ·
> @google/genai 1.9 · papaparse 5.4 ซึ่งเป็นช่วงรุ่นใน `package.json` ไม่ใช่รุ่นที่ติดตั้งจริง

## 4.2 การพัฒนาระบบของโครงงาน

> **เลขบรรทัดในตาราง code ทุกตาราง (4-6 ถึง 4-23) อ้างอิงซอร์สโค้ดเวอร์ชัน 1.1.1**
> (tag `v1.1.1`) ซึ่งต่างจาก 1.1.0 เฉพาะคอมเมนต์ที่ย่อให้สั้นเพื่อแสดงในตาราง ไม่มีการแก้โค้ด
> ถ้าแก้โค้ดภายหลัง เลขบรรทัดจะเลื่อน ต้องตรวจซ้ำ
> **ในเล่มควรเขียนกำกับใต้ตารางว่า "อ้างอิงซอร์สโค้ดเวอร์ชัน 1.1.1"**

### 4.2.1 โครงสร้างของโครงงาน

ตารางที่ 4-4 โครงสร้างโฟลเดอร์ของโครงงาน

| โฟลเดอร์ | เก็บอะไร |
|---|---|
| `app/(public)` | หน้าที่เข้าได้โดยไม่ต้องเข้าสู่ระบบ ได้แก่ หน้าแรก คู่มือ ข้อกำหนดการใช้งาน และนโยบายความเป็นส่วนตัว |
| `app/(auth)` · `app/auth` | สมัครสมาชิก เข้าสู่ระบบ ลืมรหัสผ่าน และยืนยันอีเมล |
| `app/(app)` | หน้าที่ต้องเข้าสู่ระบบ ทั้ง 10 เมนูหลัก |
| `app/api` | API ของระบบ แต่ละไฟล์ `route.ts` คือหนึ่งเส้นทาง |
| `components/` | ส่วนประกอบหน้าจอที่ใช้ซ้ำ |
| `lib/` | ตรรกะของระบบแยกตามเรื่อง เช่น `search` · `gemini` · `ingest` · `auth` · `shortlists` |
| `supabase/migrations/` | ไฟล์ SQL สร้างและแก้โครงสร้างฐานข้อมูล พร้อมชุดทดสอบของแต่ละไฟล์ |
| `scripts/` | ชุดคำสั่งเสริม เช่น สร้างข้อมูลสังเคราะห์ เปรียบเทียบแบบจำลอง นำเข้าอัตโนมัติ |

**หลักการแยกตรรกะออกจากหน้าจอ** — ตรรกะสำคัญเขียนเป็นฟังก์ชันใน `lib/` แยกจาก
ส่วนประกอบหน้าจอ เพื่อให้ทดสอบได้โดยไม่ต้องแสดงผลหน้าจอ เช่น การตัดสินว่าการกดบันทึก
ผู้สมัครควรเพิ่มหรือนำออก (`lib/shortlists/saveState.ts`) และการรวมตัวกรองของ
ปัญญาประดิษฐ์กับของผู้ใช้ (`lib/search/mergeFilters.ts`)

### 4.2.2 ลำดับการพัฒนา

ตารางที่ 4-5 ลำดับการพัฒนาระบบ

| ระยะ | สิ่งที่พัฒนา |
|---|---|
| 1 · ระบบหลัก | โครงงาน Next.js · โครงสร้างฐานข้อมูลและ pgvector · การสร้างเวกเตอร์ · การนำเข้าและตรวจข้อมูลซ้ำ · การค้นหาเชิงความหมาย · การประเมินความเหมาะสม · การยืนยันตัวตน · ข้อมูลสังเคราะห์ |
| 2 · การจับคู่ตำแหน่งงาน | ตารางตำแหน่งงานในปริภูมิเวกเตอร์เดียวกับผู้สมัคร · จัดอันดับผู้สมัครต่อตำแหน่งงาน |
| 3 · นำเข้าไฟล์จาก LinkedIn | รองรับรูปแบบไฟล์ของ PhantomBuster ทั้งสองชนิด · ตรวจข้อมูลซ้ำด้วยลิงก์โปรไฟล์ |
| 4 · ค้นหาด้วยตัวกรอง | สกัดตัวกรองด้วยปัญญาประดิษฐ์ · กรองใน SQL ก่อนจัดอันดับ |
| 5 · ออกแบบส่วนติดต่อผู้ใช้ใหม่ | ระบบสีและคลาสกลาง · เมนูด้านข้างแบบพับได้ |
| 6 · จัดการข้อมูล | สิทธิ์ผู้จัดการข้อมูล · ตารางผู้สมัครพร้อมเครื่องหมายคุณภาพข้อมูล · เปลี่ยนและกู้คืนรหัสผ่าน |
| 7 · ประเมินตนเอง | อ่านไฟล์ PDF ด้วยแบบจำลองหลายรูปแบบ · ตรวจร่างก่อนบันทึก · จัดอันดับตำแหน่งงาน |
| 8 · นำเข้าอัตโนมัติ | บันทึกรอบการนำเข้า · คิวรอตรวจสอบ · รายชื่อผู้ขอระงับ · ชุดคำสั่งตามกำหนดเวลา (ยังไม่เปิดใช้) |
| 9 · แก้ไขและลบตำแหน่งงาน | ล้างผลประเมินเดิมเมื่อข้อความความต้องการเปลี่ยน · ตรวจความยาวข้อความก่อนบันทึก |
| 10 · ปรับระบบตามเอกสาร | ปิดช่องให้ผู้ใช้เปลี่ยนบทบาทตนเอง · แผนภูมิบนแดชบอร์ด · แยกอีเมลออกจากชื่อที่แสดง |
| 11 · ความปลอดภัยหน้าตั้งค่าและผู้ดูแลระบบ | ห้ามลดสิทธิ์ตนเอง · บันทึกการเปลี่ยนสิทธิ์ · ลบข้อมูลประเมินตนเอง |
| 12 · การอนุมัติบัญชี (เวอร์ชัน 1.1.0) | สถานะบัญชีรออนุมัติ · บันทึก Shortlist แบบติ๊กหลายรายการ · ซ่อนฟอร์มตำแหน่งงานตามสิทธิ์ · จำกัดความยาวชื่อที่ชั้นฐานข้อมูล |

### 4.2.3 หน้าแรกและการเข้าสู่ระบบ

หน้าจอของส่วนนี้แสดงในหัวข้อ 5.2 และ 5.3 (ภาพที่ 5-1 ถึง 5-3)

เมื่อผู้ใช้กรอกอีเมลและรหัสผ่าน ระบบยืนยันตัวตนกับ Supabase Auth แล้วอ่านบทบาทและสถานะ
ของบัญชีทันที บัญชีที่ยังไม่ได้รับอนุมัติจะถูกออกจากระบบพร้อมข้อความแจ้งสถานะ แทนการพาเข้า
หน้าแดชบอร์ด

ตารางที่ 4-6 code เข้าสู่ระบบและตรวจสถานะบัญชี (ที่มา: app/(auth)/login/page.tsx:19-42 (submit))

````tsx
  const submit = async () => {
    setMsg('')
    const sb = getBrowserClient()
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pw })
    if (error) return setMsg(authErrorMessage(error.message))
    // เช็คที่นี่เพื่อกันการวนลูป ด่านจริงอยู่ที่ getSession() ฝั่งเซิร์ฟเวอร์
    const uid = data.user?.id
    if (uid) {
      const { data: p, error: readError } = await sb
        .from('profiles')
        .select('role, status')
        .eq('id', uid)
        .maybeSingle()
      const decision = decideAccess(p, !!readError)
      if (!decision.allowed) {
        // ออกจากระบบก่อน ไม่ให้คุกกี้ค้างในสถานะล็อกอินแต่ใช้งานไม่ได้
        await sb.auth.signOut()
        return setMsg(accessDeniedMessage(decision.reason))
      }
    }
    window.location.href = '/dashboard'
  }
````

ฟังก์ชัน `submit` เรียก `signInWithPassword` ของ Supabase เมื่อยืนยันตัวตนสำเร็จจึงอ่านคอลัมน์
`role` และ `status` จากตาราง `profiles` แล้วส่งให้ `decideAccess` ตัดสิน หากไม่ผ่าน ระบบ
ออกจากระบบก่อนแสดงข้อความ เพื่อไม่ให้คุกกี้ค้างอยู่ในสถานะเข้าสู่ระบบแต่ใช้งานไม่ได้

ตารางที่ 4-7 code ตัดสินสิทธิ์การเข้าใช้งาน (ที่มา: lib/auth/profileGate.ts:39-56 (decideAccess))

````ts
export function decideAccess(row: unknown, hadError: boolean): AccessDecision {
  if (hadError) return { allowed: false, reason: 'read-failed' }
  if (!row || typeof row !== 'object') return { allowed: false, reason: 'no-profile' }
  const role = (row as { role?: unknown }).role
  if (typeof role !== 'string' || !(ROLE_VALUES as readonly string[]).includes(role)) {
    return { allowed: false, reason: 'bad-role' }
  }
  // ตรวจ role ก่อน status เพื่อไม่ให้บัญชีที่ข้อมูลเพี้ยนเข้าคิวรออนุมัติ
  const status = (row as { status?: unknown }).status
  if (status === 'rejected') return { allowed: false, reason: 'rejected' }
  // ทุกค่าที่ไม่ใช่ 'approved' ถูกปฏิเสธ รวมถึงกรณีที่ไม่มีค่า
  if (status !== 'approved') return { allowed: false, reason: 'pending' }
  return { allowed: true, role: role as Role }
}
````

`decideAccess` ตรวจตามลำดับ คืออ่านข้อมูลได้หรือไม่ มีแถวหรือไม่ บทบาทถูกต้องหรือไม่ แล้วจึง
ตรวจสถานะ **ทุกค่าที่ไม่ใช่ `approved` ถูกปฏิเสธ** รวมถึงกรณีที่ไม่มีค่าเลย ฟังก์ชันเดียวกันนี้
ถูกใช้ทั้งในหน้าเข้าสู่ระบบ หน้ายืนยันอีเมล (`app/auth/confirm/page.tsx:31-55`) และการตรวจสิทธิ์
ฝั่งเซิร์ฟเวอร์ (`lib/auth/session.ts:22-65` · `getSession`) กฎการเข้าใช้งานจึงมีเพียงชุดเดียว

ตารางที่ 4-8 code เพิ่มสถานะบัญชีในฐานข้อมูล (ที่มา: supabase/migrations/022a_account_status.sql:15-21 (migration 022a))

````sql
create type account_status as enum ('pending', 'approved', 'rejected');
-- ค่าตั้งต้น 'pending' ทำให้บัญชีใหม่รออนุมัติโดยไม่ต้องแก้ trigger
alter table profiles add column status account_status not null default 'pending';
-- ต้องรันหลัง add column: บัญชีเดิมทั้งหมดรวมถึงผู้ดูแลระบบได้รับอนุมัติ
update profiles set status = 'approved';
````

บัญชีใหม่ได้สถานะ `pending` จากค่าตั้งต้นของคอลัมน์ โดยไม่ต้องแก้ trigger ที่สร้างแถว `profiles`
(`supabase/migrations/002_profile_trigger.sql:4-16`) และบัญชีที่มีอยู่ก่อนถูกตั้งเป็น `approved`
ในขั้นตอนเดียวกัน เพื่อไม่ให้ผู้ใช้เดิมรวมถึงผู้ดูแลระบบถูกกันออกจากระบบ

### 4.2.4 แดชบอร์ด

หน้าจอของส่วนนี้แสดงในหัวข้อ 5.4 (ภาพที่ 5-4)

แดชบอร์ดเป็น Server Component (`app/(app)/dashboard/page.tsx:14-170`) ที่อ่านข้อมูลจาก
ฐานข้อมูลก่อนส่งหน้าเว็บให้ผู้ใช้ การนับสถิติทำในฐานข้อมูลด้วยฟังก์ชัน SQL แทนการดึงข้อมูล
ทั้งตารางมานับในโปรแกรม

ตารางที่ 4-9 code นับทักษะที่พบบ่อย (ที่มา: supabase/migrations/020_dashboard_stats.sql:18-31 (top_skills))

````sql
-- นับจำนวนผู้สมัครต่อทักษะ เรียงตามจำนวนแล้วตามชื่อ ลำดับจึงคงที่ทุกครั้งที่เปิดหน้า
create or replace function public.top_skills(p_limit int default 10)
returns table (name text, cnt bigint)
language sql
stable
set search_path = public, pg_temp
as $$
  select s.name, count(distinct cs.candidate_id) as cnt
  from public.candidate_skills cs
  join public.skills s on s.id = cs.skill_id
  group by s.name
  order by cnt desc, s.name asc
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;
````

ฟังก์ชัน `top_skills` นับจำนวนผู้สมัครต่อทักษะ เรียงตามจำนวนแล้วตามชื่อ เพื่อให้ทักษะที่จำนวน
เท่ากันอยู่ตำแหน่งเดิมทุกครั้งที่เปิดหน้า และจำกัดจำนวนแถวไม่เกิน 50 ฝั่งแอปพลิเคชันเรียกผ่าน
`lib/dashboard/stats.ts:1-61` ซึ่งคืนสถานะล้มเหลวแยกจากรายการว่าง และแสดงผลเป็นแผนภูมิแท่ง
ด้วย `components/dashboard/BarList.tsx:1-61`

### 4.2.5 การค้นหาและคัดกรองผู้สมัคร

หน้าจอของส่วนนี้แสดงในหัวข้อ 5.5 (ภาพที่ 5-5)

การค้นหามีสองขั้น ขั้นแรก `POST /api/search/parse` เรียกแบบจำลองภาษาหนึ่งครั้งเพื่อสกัด
คำอธิบายและตัวกรอง (`lib/search/extractFilters.ts:20-66`) ขั้นที่สอง `POST /api/search`
จัดอันดับผู้สมัครโดยไม่เรียกแบบจำลองภาษา

ตารางที่ 4-10 code สกัดเจตนาการค้นหาด้วยแบบจำลองภาษา (ที่มา: lib/search/extractFilters.ts:20-66 (extractSearchIntent))

````ts
export async function extractSearchIntent(nl: string): Promise<SearchIntent> {
  ...
  // ห้ามโยน error: ตัวกรองเป็นส่วนเสริม ถ้าล้มยังค้นหาด้วยข้อความได้
  let parsed: any = {}
  try {
    const res = await withTimeout(
      getGemini().models.generateContent({
        model: MODEL_FAST,
        contents: prompt,
        // บังคับให้ตอบเป็น JSON ล้วน
        config: { responseMimeType: 'application/json' },
      })
    )
    const raw = (res.text ?? '').replace(/```json|```/g, '').trim()
    // ดึงเฉพาะก้อน JSON แม้แบบจำลองจะตอบมีข้อความปน
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw)
  } catch (e) {
    console.error('extractSearchIntent fell back to plain semantic search:', e)
    parsed = {}
  }
  return {
    semanticQuery: String(parsed.semanticQuery ?? nl),
    filters: (parsed.filters ?? {}) as ChipFilters,
  }
}
````

คำสั่งที่ส่งให้แบบจำลอง (ละไว้ในตาราง) ระบุโครงสร้าง JSON ที่ต้องการ และให้แปลงค่าทั้งหมด
เป็นภาษาอังกฤษ ระบบบังคับให้ตอบเป็น JSON ด้วย `responseMimeType` และหากเรียกไม่สำเร็จ
จะคืนข้อความเดิมโดยไม่มีตัวกรอง **การค้นหาจึงยังทำงานได้แม้บริการปัญญาประดิษฐ์ขัดข้อง**
ที่หน้าค้นหา ตัวกรองที่ได้ถูกรวมกับตัวกรองของผู้ใช้โดยไม่เขียนทับ
(`lib/search/mergeFilters.ts:53-80` · `mergeAiFilters`)

ตารางที่ 4-11 code ค้นหาและจัดอันดับผู้สมัคร (ที่มา: lib/search/query.ts:80-142 (searchCandidates))

````ts
export async function searchCandidates(
  semanticQuery: string,
  filters: ChipFilters
): Promise<SearchOutcome> {
  const db = getServerClient()
  const emb = await queryEmbedding(semanticQuery)
  // ใช้เฉพาะทักษะที่มีจริงในฐาน ชื่อที่ AI แต่งขึ้นจะตัดผู้สมัครทิ้งทั้งหมด
  const chips = filters.skills ?? []
  let usableSkills = chips
  let unusedSkills: string[] = []
  if (chips.length) {
    const known = await knownSkillNames(db)
    if (known) {
      const split = splitKnownSkills(chips, known)
      usableSkills = split.usable
      unusedSkills = split.unknown
    }
    // อ่านรายชื่อไม่ได้: ใช้ตัวกรองตามที่ได้มา
  }
  // ต้องเช็ค error ไม่งั้น RPC ที่พังจะแสดงเป็น "ไม่พบผลลัพธ์"
  const { data: matches, error: rpcError } = await db.rpc('match_candidates_filtered', {
    query_embedding: emb,
    match_count: 20,
    p_skills: usableSkills.length ? usableSkills : null,
    p_min_years: filters.minYears ?? null,
    p_field_or_degree: filters.fieldOrDegree?.length ? filters.fieldOrDegree : null,
  })
  if (rpcError) {
    console.error('match_candidates_filtered failed:', rpcError)
    throw new Error('search rpc failed')
  }
  // PostgREST ส่งค่าทศนิยมมาเป็นสตริง จึงแปลงเป็นตัวเลข
  const sims = new Map<string, number>((matches ?? []).map((m: any) => [m.id, Number(m.similarity)]))
  const ids = [...sims.keys()]
  if (!ids.length) return { results: [], unusedSkills }
  ...
  const byId = new Map((rows ?? []).map((r: any) => [r.id, r]))
  const results = (ids.map((id) => byId.get(id)).filter(Boolean) as any[])
    .map((c) => ({
      id: c.id,
      full_name: c.full_name,
      headline: c.headline,
      score: Math.max(0, Math.min(100, Math.round((sims.get(c.id) ?? 0) * 100))),
    }))
    .sort((a, b) => b.score - a.score)
  return { results, unusedSkills }
}
````

`searchCandidates` แปลงคำอธิบายเป็นเวกเตอร์ (เก็บไว้ใช้ซ้ำใน `queryEmbedding` บรรทัด 64-74)
คัดชิปทักษะที่ไม่มีผู้สมัครคนใดถืออยู่ออกด้วย `splitKnownSkills` แล้วเรียกฟังก์ชันในฐานข้อมูล
ผลลัพธ์จำกัด 20 รายการ และแปลงความคล้ายเชิงโคไซน์เป็นคะแนนจำนวนเต็ม 0–100 หากฐานข้อมูล
ตอบกลับผิดพลาด ฟังก์ชันจะส่งข้อผิดพลาดออกไป หน้าจอจึงแยกได้ว่าค้นหาไม่สำเร็จ ไม่ใช่ไม่พบผู้สมัคร

ตารางที่ 4-12 code กรองเงื่อนไขและจัดอันดับในฐานข้อมูล (ที่มา: supabase/migrations/007_flexible_filter_match.sql:10-47 (match_candidates_filtered))

````sql
create or replace function match_candidates_filtered(
  query_embedding vector(768),
  match_count int,
  p_skills text[] default null,
  ...
  p_min_years int default null,
  p_field_or_degree text[] default null
)
returns table (id uuid, similarity float)
language sql stable as $$
  select c.id, 1 - (c.embedding <=> query_embedding) as similarity
  from candidates c
  where c.embedding is not null
    and (p_min_years is null or c.years_experience >= p_min_years)
    ...
    and (p_field_or_degree is null or exists (
      select 1 from education e
      where e.candidate_id = c.id
        and exists (
          select 1 from unnest(p_field_or_degree) as term
          where e.field_of_study ilike '%' || term || '%'
             or e.degree ilike '%' || term || '%'
        )))
    and (p_skills is null or (
      select count(distinct lower(s.name))
      from candidate_skills cs join skills s on s.id = cs.skill_id
      where cs.candidate_id = c.id
        and lower(s.name) = any (select lower(x) from unnest(p_skills) as x)
    ) = array_length(p_skills, 1))
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
````

ฟังก์ชัน SQL กรองผู้สมัครด้วยจำนวนปีประสบการณ์ สาขาหรือระดับการศึกษา (เทียบบางส่วนแบบไม่สนตัวพิมพ์)
และทักษะ (ต้องมีครบทุกทักษะ) **ก่อน**จัดอันดับด้วยตัวดำเนินการ `<=>` ของ pgvector ผลลัพธ์จึงเป็น
20 รายการที่ใกล้เคียงที่สุดในกลุ่มที่ตรงเงื่อนไขแล้ว ไม่ใช่ 20 รายการแรกที่ถูกกรองทิ้งภายหลัง

### 4.2.6 ข้อมูลผู้สมัครและการประเมินความเหมาะสม

หน้าจอของส่วนนี้แสดงในหัวข้อ 5.6 และ 5.7 (ภาพที่ 5-6 และ 5-7)

ตารางผู้สมัคร (`app/(app)/candidates/page.tsx:12-115`) แสดงเครื่องหมายเมื่อข้อมูลขาด
ด้วย `missingFields` (`lib/candidates/quality.ts:21-28`) ส่วนการประเมินความเหมาะสมเริ่มจาก
แผง `AnalyzePanel` ในหน้ารายละเอียดผู้สมัคร ซึ่งเรียก `POST /api/analyze`

ตารางที่ 4-13 code ประเมินความเหมาะสมพร้อมเก็บผลไว้ใช้ซ้ำ (ที่มา: lib/gemini/score.ts:8-63 (scoreCandidateAgainst))

````ts
export async function scoreCandidateAgainst(
  candidateId: string,
  requirement: string,
  jobId?: string
): Promise<{ score: number; reasoning: string; cached: boolean }> {
  const db = getServerClient()
  const hash = requirementHash(requirement)
  // อ่าน cache ไม่ได้: บันทึก log แล้วคำนวณใหม่ ไม่ทำให้คำขอล้ม
  const { data: cached, error: cacheError } = await db
    .from('analyses')
    .select('score,reasoning')
    .eq('candidate_id', candidateId)
    .eq('requirement_hash', hash)
    .maybeSingle()
  if (cacheError) console.error('analyses cache read failed:', cacheError)
  if (cached) {
    return { score: (cached as any).score, reasoning: (cached as any).reasoning, cached: true }
  }
  ...
  // maybeSingle แยก "ไม่พบผู้สมัคร" (404) ออกจาก "อ่านฐานข้อมูลไม่ได้" (500)
  const { data: c, error: candidateError } = await db
    .from('candidates')
    .select('*, education(*), experience(*), candidate_skills(skills(name))')
    .eq('id', candidateId)
    .maybeSingle()
  if (candidateError) {
    console.error('candidate read failed:', candidateError)
    throw new Error('candidate read failed')
  }
  if (!c) throw new Error('candidate not found')
  ...
  const result = await analyzeCandidate(profile as any, requirement)
  // job_id: ลบงานแล้วผลประเมินถูกลบตาม (ค่าว่างเมื่อประเมินจากหน้าผู้สมัคร)
  // เขียน cache ไม่สำเร็จไม่โยน error เพราะได้คะแนนแล้ว
  const { error: insertError } = await db.from('analyses').insert({
    candidate_id: candidateId,
    requirement_text: requirement,
    requirement_hash: hash,
    score: result.score,
    reasoning: result.reasoning,
    job_id: jobId ?? null,
  })
  if (insertError) console.error('analyses cache write failed:', insertError)
  return { ...result, cached: false }
}
````

ระบบคำนวณค่าแฮชของข้อความความต้องการ แล้วค้นผลเดิมในตาราง `analyses` ด้วยคู่
(`candidate_id`, `requirement_hash`) ถ้าพบจะคืนผลทันทีโดยไม่เรียกแบบจำลอง ถ้าไม่พบจึงอ่าน
ข้อมูลผู้สมัครพร้อมการศึกษา ประสบการณ์ และทักษะ ส่งให้ `analyzeCandidate`
(`lib/gemini/analyze.ts:11-45`) แล้วบันทึกผลไว้ การอ่านผู้สมัครแยกกรณี "อ่านไม่ได้" ออกจาก
"ไม่พบผู้สมัคร" เพื่อไม่ให้ฐานข้อมูลขัดข้องถูกแสดงว่าไม่พบข้อมูล และหากบันทึกผลไม่สำเร็จ
ผู้ใช้ยังได้รับคะแนนตามปกติ

### 4.2.7 Shortlist

หน้าจอของส่วนนี้แสดงในหัวข้อ 5.8 (ภาพที่ 5-8)

Shortlist เชื่อมต่อฐานข้อมูลโดยตรงด้วยคีย์สาธารณะ การควบคุมสิทธิ์ระดับแถวจึงจำกัดให้ผู้ใช้
เห็นเฉพาะรายการของตนเอง ตรรกะการตัดสินแยกเป็นฟังก์ชันที่ทดสอบได้โดยไม่ต้องแสดงผลหน้าจอ

ตารางที่ 4-14 code ตัดสินการเพิ่มหรือนำออก (ที่มา: lib/shortlists/saveState.ts:38-55 (planToggle · applyToggle))

````ts
export function planToggle(
  member: readonly string[],
  busy: readonly string[],
  listId: string
): TogglePlan {
  if (busy.includes(listId)) return null
  return { kind: member.includes(listId) ? 'remove' : 'add', listId }
}
...
/** รายการที่ผู้สมัครอยู่หลังคำขอสำเร็จ — ห้ามเรียกก่อนคำขอสำเร็จ */
export function applyToggle(
  member: readonly string[],
  listId: string,
  kind: 'add' | 'remove'
): string[] {
  const without = member.filter((m) => m !== listId)
  return kind === 'add' ? [...without, listId] : without
}
````

`planToggle` คืนค่าว่างเมื่อรายการนั้นยังมีคำขอค้างอยู่ จึงป้องกันการกดซ้ำที่ทำให้คำสั่งเพิ่มและ
นำออกทำงานพร้อมกัน ส่วน `applyToggle` ปรับสถานะบนหน้าจอและถูกเรียกหลังคำขอสำเร็จเท่านั้น

ตารางที่ 4-15 code บันทึกผู้สมัครเข้าหรือออกจากรายการ (ที่มา: components/SaveToShortlist.tsx:67-106 (toggle))

````tsx
  const toggle = async (listId: string) => {
    const plan = planToggle(member, busy, listId)
    if (!plan) return
    setBusy((b) => [...b, listId])
    setMsg('')
    try {
      // upsert แทน insert: กดซ้ำแล้วไม่เกิด error คีย์ซ้ำ
      const { error } =
        plan.kind === 'add'
          ? await db
              .from('shortlist_candidates')
              .upsert({ shortlist_id: listId, candidate_id: candidateId })
          : await db
              .from('shortlist_candidates')
              .delete()
              .eq('shortlist_id', listId)
              .eq('candidate_id', candidateId)
      if (error) {
        // ไม่ส่งข้อความ Postgres ดิบให้ผู้ใช้
        console.error('shortlist toggle failed:', error.message)
        setMsg(plan.kind === 'add' ? 'บันทึกไม่สำเร็จ' : 'เอาออกไม่สำเร็จ')
        return
      }
      ...
      setMember((m) => applyToggle(m, listId, plan.kind))
      ...
      onChange?.()
    } catch {
      setMsg('เชื่อมต่อไม่ได้')
    } finally {
      setBusy((b) => b.filter((x) => x !== listId))
    }
  }
````

การเพิ่มใช้ `upsert` แทน `insert` การกดซ้ำจากหน้าที่ข้อมูลเก่าจึงไม่เกิดข้อผิดพลาดคีย์ซ้ำ
และเครื่องหมายติ๊กเปลี่ยนเฉพาะเมื่อ `error` เป็นค่าว่าง ชื่อรายการถูกตรวจด้วย `validateListName`
(`lib/shortlists/saveState.ts:70-77`) และจำกัดซ้ำที่ฐานข้อมูลด้วย migration 022b

### 4.2.8 ตำแหน่งงาน

หน้าจอของส่วนนี้แสดงในหัวข้อ 5.9 (ภาพที่ 5-9)

การสร้าง แก้ไข และลบตำแหน่งงานผ่าน `app/api/jobs/route.ts` และ `app/api/jobs/[id]/route.ts`
ซึ่งตรวจสิทธิ์ผู้จัดการข้อมูลและตรวจข้อมูลด้วย `validateJobInput` (`lib/jobs/validate.ts:61-116`)
ก่อนบันทึก

ตารางที่ 4-16 code แก้ไขตำแหน่งงาน (ที่มา: lib/jobs/update.ts:22-70 (updateJob))

````ts
export async function updateJob(
  id: string,
  patch: Partial<JobInput>
): Promise<JobUpdateResult | null> {
  const db = getServerClient()
  const { data: before, error: readError } = await db
    .from('jobs')
    .select(JOB_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (readError) {
    console.error('updateJob read failed:', readError)
    throw new Error('job read failed')
  }
  if (!before) return null
  ...
  // ตัด source/external_id ซ้ำอีกชั้น (เป็นข้อมูลที่มาของแถว ไม่ใช่เนื้อหา)
  const { source: _source, external_id: _externalId, ...safe } = patch
  const after = { ...(before as unknown as JobInput), ...safe }
  const reembedded = embedTextChanged(before as unknown as JobInput, after)
  const row: Record<string, unknown> = { ...safe }
  if (reembedded) row.embedding = await embedText(buildJobEmbedText(after))
  const { error: writeError } = await db.from('jobs').update(row).eq('id', id)
  if (writeError) {
    console.error('updateJob write failed:', writeError)
    throw new Error('job update failed')
  }
  ...
  // ลบผลประเมินเดิมหลังบันทึกสำเร็จเท่านั้น (hash เดิมจะไม่ถูกอ่านอีก)
  let staleScoresRemoved = 0
  if (requirementTextChanged(before as unknown as JobInput, after)) {
    const { data: removed, error: delError } = await db
      .from('analyses')
      .delete()
      .eq('job_id', id)
      .select('id')
    if (delError) {
      // ไม่โยน error: งานถูกบันทึกแล้ว
      console.error('stale analyses cleanup failed:', delError)
    } else {
      staleScoresRemoved = (removed ?? []).length
    }
  }
  return { reembedded, staleScoresRemoved }
}
````

ระบบตัดฟิลด์แหล่งที่มาออกจากข้อมูลที่ส่งมา สร้างเวกเตอร์ใหม่เฉพาะเมื่อข้อความที่ใช้สร้างเวกเตอร์
เปลี่ยน และ**ลบผลการประเมินเดิมของงานนั้นเมื่อข้อความความต้องการเปลี่ยน** เพราะผลเดิมอ้างอิง
ค่าแฮชของข้อความเก่าซึ่งจะไม่ถูกอ่านอีก การลบเกิดหลังบันทึกสำเร็จเท่านั้น และหากลบไม่สำเร็จ
ระบบไม่แจ้งว่าการแก้ไขล้มเหลว เพราะงานถูกบันทึกแล้วจริง การจัดอันดับผู้สมัครต่อตำแหน่งงานอยู่ที่
`lib/jobs/match.ts:12-66`

### 4.2.9 การประเมินโปรไฟล์ของตนเอง

หน้าจอของส่วนนี้แสดงในหัวข้อ 5.10 (ภาพที่ 5-10)

การประเมินตนเองแบ่งเป็นสองคำขอ คำขอแรกอ่านไฟล์แล้วคืนร่าง คำขอที่สองบันทึกร่างที่ผู้ใช้
ยืนยันแล้ว (`app/api/self-assessment/route.ts:18-69`)

ตารางที่ 4-17 code รับไฟล์และอ่านเป็นร่างข้อมูล (ที่มา: app/api/self-assessment/parse/route.ts:17-43 (POST /api/self-assessment/parse))

````ts
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, { status: 401 })
  ...
  let file: File | null = null
  try {
    const form = await req.formData()
    const f = form.get('file')
    file = f instanceof File ? f : null
  } catch {
    return NextResponse.json({ error: 'กรุณาเลือกไฟล์ PDF' }, { status: 400 })
  }
  const invalid = validateUpload(file ? { type: file.type, size: file.size } : null)
  if (invalid) {
    ...
    return NextResponse.json({ error: hint }, { status: 400 })
  }
  const pdfBase64 = Buffer.from(await file!.arrayBuffer()).toString('base64')
  try {
    const draft = await parsePdfProfile(pdfBase64)
    return NextResponse.json({ draft, fileName: file!.name })
````

ระบบรับไฟล์ด้วย `FormData` ตรวจชนิดและขนาดด้วย `validateUpload` (PDF ไม่เกิน 4MB) แล้วส่งให้
`parsePdfProfile` **คำขอนี้ไม่บันทึกข้อมูลใดลงฐานข้อมูล** เมื่ออ่านไม่สำเร็จ ระบบแยกข้อความ
ตามสาเหตุ และเสนอให้ผู้ใช้กรอกข้อมูลเองแทน

ตารางที่ 4-18 code ส่งไฟล์ PDF ให้แบบจำลองอ่าน (ที่มา: lib/gemini/parsePdf.ts:121-142 (parsePdfProfile))

````ts
export async function parsePdfProfile(pdfBase64: string): Promise<ProfileDraft> {
  const res = await withTimeout(
    getGemini().models.generateContent({
      model: MODEL_TEXT,
      contents: [
        {
          role: 'user',
          parts: [
            // วางไฟล์ก่อน prompt ตามคำแนะนำของ Gemini
            { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
            { text: PARSE_PDF_PROMPT },
          ],
        },
      ],
      // ใช้ MODEL_TEXT: รุ่น FAST ทำรายการการศึกษาหายใน 2 จาก 3 รอบที่วัด
      config: { responseMimeType: 'application/json', thinkingConfig: THINKING_LOW },
    }),
    GEMINI_TIMEOUT_MS
  )
  return parseProfileResponse(res.text ?? '')
}
````

ไฟล์ถูกส่งเป็น `inlineData` ให้แบบจำลองอ่านแบบหลายรูปแบบโดยไม่ต้องแปลงเป็นข้อความก่อน และใช้
ระดับการคิดต่ำเพื่อให้ผลและเวลาคงที่ คำสั่งที่ส่งไปพร้อมไฟล์ระบุไว้ที่บรรทัด 35 ว่าห้ามสกัด
วันเกิด อายุ ศาสนา สถานภาพสมรส สัญชาติ เชื้อชาติ ข้อมูลสุขภาพ เลขประจำตัวประชาชน และรูปถ่าย
ซึ่งเป็นการปฏิบัติตามมาตรา 26 ที่อธิบายในหัวข้อ 2.6

### 4.2.10 การนำเข้าข้อมูล

หน้าจอของส่วนนี้แสดงในหัวข้อ 5.11 (ภาพที่ 5-11)

ทุกเส้นทางการนำเข้าเรียกฟังก์ชันบันทึกเดียวกัน การตรวจรายชื่อผู้ขอระงับและการตรวจข้อมูลซ้ำจึง
มีผลกับทุกเส้นทาง

ตารางที่ 4-19 code รับไฟล์นำเข้าและตรวจสิทธิ์ (ที่มา: app/api/ingest/route.ts:16-62 (POST /api/ingest))

````ts
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!hasRole(session.role, 'data_manager')) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์นำเข้าข้อมูลนี้' }, { status: 403 })
  }
  const userId = session.userId
  const body = await req.json()
  let inputs: CandidateInput[] = []
  if (body.type === 'csv') {
    inputs = parseCsv(body.csv, body.mapping)
  } else if (body.type === 'linkedin') {
    // source = 'csv' เพราะมีคนอัปโหลดเอง (แยกจากสคริปต์อัตโนมัติในกราฟแหล่งที่มา)
    inputs = parseLinkedInCsv(body.csv, 'csv')
  } else if (body.type === 'upload') {
    inputs = [await parseResume(body.text)]
  } else {
    return NextResponse.json({ error: 'type must be "csv", "linkedin", or "upload"' }, { status: 400 })
  }
  ...
  let imported = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []
  for (const input of inputs) {
    try {
      const r = await upsertCandidate(input, userId)
      if (r.suppressed) skipped++
      else if (r.updated) updated++
      else imported++
    } catch (e: any) {
      errors.push(`${input.full_name}: ${e?.message ?? e}`)
    }
  }
  ...
  return NextResponse.json({ imported, updated, skipped, errors })
}
````

ระบบตรวจสิทธิ์ผู้จัดการข้อมูล**ก่อน**อ่านไฟล์ แล้วเลือกตัวอ่านตามชนิดไฟล์ ได้แก่ CSV ทั่วไป
(`lib/ingest/csv.ts:10-37`) และไฟล์รูปแบบ LinkedIn (`lib/ingest/linkedin.ts:120-231`)
แต่ละรายการถูกบันทึกแยกกัน รายการที่ผิดพลาดจึงไม่ทำให้รายการอื่นล้มเหลว

ตารางที่ 4-20 code บันทึกผู้สมัครพร้อมตรวจรายชื่อระงับและข้อมูลซ้ำ (ที่มา: lib/ingest/upsert.ts:11-112 (upsertCandidate))

````ts
export async function upsertCandidate(
  input: CandidateInput,
  createdBy: string | null = null,
  ingestRunId: string | null = null
): Promise<{ id: string | null; updated: boolean; suppressed: boolean }> {
  const db = getServerClient()
  // ตรวจรายชื่อระงับก่อน embed — ทุกเส้นทางนำเข้าผ่านจุดนี้
  if (input.linkedin_url) {
    const { data: blocked } = await db
      .from('suppressed_profiles')
      .select('id')
      .eq('linkedin_url', input.linkedin_url)
      .maybeSingle()
    if (blocked) return { id: null, updated: false, suppressed: true }
  }
  const embedding = await embedText(buildEmbedText(input))
  let existingId: string | null = null
  if (input.linkedin_url) {
    const { data } = await db
      .from('candidates')
      .select('id')
      .eq('linkedin_url', input.linkedin_url)
      .limit(1)
      .maybeSingle()
    existingId = (data as any)?.id ?? null
  ...
  if (existingId) {
    candidateId = existingId
    updated = true
    await db.from('candidates').update(row).eq('id', candidateId)
    await db.from('education').delete().eq('candidate_id', candidateId)
    await db.from('experience').delete().eq('candidate_id', candidateId)
    await db.from('candidate_skills').delete().eq('candidate_id', candidateId)
  } else {
    const { data } = await db.from('candidates').insert(row).select('id').single()
    candidateId = (data as any).id
  }
  ...
  return { id: candidateId, updated, suppressed: false }
}
````

ระบบตรวจรายชื่อผู้ขอระงับ**ก่อน**สร้างเวกเตอร์ ข้อมูลของผู้ขอระงับจึงไม่ถูกส่งออกไปประมวลผล
ภายนอก จากนั้นตรวจข้อมูลซ้ำด้วยลิงก์โปรไฟล์ (หรือชื่อเมื่อไม่มีลิงก์) แล้วปรับปรุงหรือเพิ่มรายการ
ข้อความที่ใช้สร้างเวกเตอร์ประกอบจาก `buildEmbedText` (`lib/ingest/normalize.ts:31-47`)

### 4.2.11 การจัดการผู้ใช้

หน้าจอของส่วนนี้แสดงในหัวข้อ 5.12 (ภาพที่ 5-12)

หน้าจัดการผู้ใช้ (`app/(app)/admin/users/page.tsx:24-127`) เรียก API ที่ใช้คีย์บริการ ซึ่งเป็น
ทางเดียวที่เปลี่ยนบทบาทและสถานะบัญชีได้

ตารางที่ 4-21 code เปลี่ยนสถานะบัญชี (ที่มา: app/api/admin/users/[id]/status/route.ts:20-84 (POST /api/admin/users/[id]/status))

````ts
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !hasRole(session.role, 'admin')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  ...
  const status = (body as { status?: unknown })?.status
  if (typeof status !== 'string' || !(ALLOWED as readonly string[]).includes(status)) {
    return NextResponse.json({ error: 'สถานะไม่ถูกต้อง' }, { status: 400 })
  }
  // ตรวจทุกอย่างก่อนเขียน · แอดมินเปลี่ยนสถานะตัวเองไม่ได้ (กันล็อกตัวเองออก)
  if (id === session.userId) {
    return NextResponse.json(
      { error: 'เปลี่ยนสถานะบัญชีของตัวเองไม่ได้' },
      { status: 400 }
    )
  }
  ...
  const { error } = await db
    .from('profiles')
    .update({ status: status as Allowed })
    .eq('id', id)
  ...
  // บันทึกกิจกรรมหลังเขียนสำเร็จเท่านั้น
  const who = before ? identityName(before, id) : id
  await logActivity({
    actorId: session.userId,
    action: 'account_status',
    entityType: 'user',
    entityId: id,
    summary: `${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}บัญชีของ ${who}`,
    metadata: { from: before?.status ?? null, to: status },
  })
  return NextResponse.json({ ok: true })
}
````

API รับเฉพาะค่า `approved` หรือ `rejected` ไม่อนุญาตให้ผู้ดูแลระบบเปลี่ยนสถานะของตนเอง และ
บันทึกการเปลี่ยนแปลงลงประวัติกิจกรรม การเปลี่ยนบทบาท (`app/api/admin/users/route.ts:11-55`)
ใช้หลักเดียวกันผ่าน `checkRoleChange` (`lib/auth/roleChange.ts`)

ตารางที่ 4-22 code จำกัดคอลัมน์ที่ผู้ใช้แก้ไขได้ (ที่มา: supabase/migrations/019_lock_profile_columns.sql:33-40 (migration 019))

````sql
revoke update on public.profiles from anon, authenticated;
-- ผู้ใช้แก้ได้เฉพาะ display_name และ settings (หน้า /settings) ไม่รวม role และ id
grant update (display_name, settings) on public.profiles to authenticated;
-- ถอนสิทธิ์เขียนที่ไม่มีใครใช้ (TRUNCATE ไม่อยู่ใต้ RLS)
revoke insert, delete, truncate, references, trigger on public.profiles
  from anon, authenticated;
````

ผู้ใช้ที่เข้าสู่ระบบแก้ไขตาราง `profiles` ได้เฉพาะ `display_name` และ `settings` ผู้ใช้จึง
ไม่สามารถเปลี่ยนบทบาทหรืออนุมัติบัญชีตนเองผ่าน REST API ของฐานข้อมูลได้ แม้คีย์สาธารณะ
จะอยู่ในหน้าเว็บ

### 4.2.12 หน้าเอกสารสาธารณะ

หน้าจอของส่วนนี้แสดงในหัวข้อ 5.14 (ภาพที่ 5-14)

หน้านโยบายความเป็นส่วนตัว (`components/legal/PrivacyPolicy.tsx:44-197`) อ่านค่าทางกฎหมาย
ทั้งหมดจากไฟล์เดียว

ตารางที่ 4-23 code ผู้ประมวลผลข้อมูลภายนอก (ที่มา: lib/legal/meta.ts:48-64 (PROCESSORS))

````ts
export const PROCESSORS = [
  {
    name: 'Supabase',
    purpose: 'เก็บฐานข้อมูล ระบบบัญชีผู้ใช้ และไฟล์ที่อัปโหลด',
    location: 'สิงคโปร์และสหรัฐอเมริกา',
  },
  {
    name: 'Google (Gemini API)',
    purpose: 'ประมวลผลข้อความเพื่อค้นหาเชิงความหมายและให้คะแนนความเหมาะสม',
    location: 'นอกประเทศไทย',
  },
  {
    name: 'Vercel',
    purpose: 'ให้บริการเว็บไซต์',
    location: 'นอกประเทศไทย',
  },
]
````

รายชื่อผู้ประมวลผลภายนอกและที่ตั้งถูกกำหนดไว้ที่นี่ที่เดียว และแสดงในนโยบายความเป็นส่วนตัว
ตามหน้าที่เปิดเผยการโอนข้อมูลไปต่างประเทศ (มาตรา 28–29) หากเพิ่มบริการภายนอกที่ใช้ข้อมูล
ส่วนบุคคล ต้องเพิ่มรายการในค่าคงที่นี้

## 4.3 การติดตั้งระบบ

> **หมายเหตุถึงผู้เขียน:** ตาราง 4-24 ถึง 4-26 · ภาพที่ 4-1 และ 4-2 ในหัวข้อนี้เป็นหน้าตั้งค่าของ Vercel
> และ Supabase **ถ่ายภาพหน้าตั้งค่าตัวแปรสภาพแวดล้อมโดยไม่ให้เห็นค่าของคีย์** (กด "Hide" หรือ
> ถ่ายเฉพาะคอลัมน์ชื่อ) · ยังไม่ได้ยืนยันว่า Vercel ถูกตั้งให้ deploy อัตโนมัติเมื่อ push ไป
> `main` หรือ deploy ด้วยคำสั่ง `vercel --prod` (README เขียนแบบหลัง) ให้ดูที่ Vercel →
> Settings → Git ก่อนเลือกประโยคในข้อ 4.3.4

ระบบติดตั้งบนบริการคลาวด์สามส่วน ได้แก่ Vercel สำหรับเว็บแอปพลิเคชันและ API, Supabase
สำหรับฐานข้อมูล ระบบบัญชีผู้ใช้ และการค้นหาเวกเตอร์ และ Gemini API สำหรับแบบจำลองภาษา
ทั้งสามส่วนเชื่อมกันผ่านตัวแปรสภาพแวดล้อม จึงไม่มีเครื่องแม่ข่ายที่ต้องดูแลเอง

### 4.3.1 สภาพแวดล้อมการติดตั้ง

ตารางที่ 4-24 สภาพแวดล้อมการติดตั้งระบบ

| ส่วนประกอบ | บริการ | รายละเอียด |
|---|---|---|
| เว็บแอปพลิเคชันและ API | Vercel | Next.js 15 ทำงานแบบ serverless ที่ `https://skouth.vercel.app` |
| ฐานข้อมูลและบัญชีผู้ใช้ | Supabase | PostgreSQL 17.6 พร้อม pgvector 0.8.2 ภูมิภาค ap-southeast-1 (สิงคโปร์) |
| แบบจำลองภาษาและเวกเตอร์ | Google Gemini API | `gemini-embedding-001` (768 มิติ) · `gemini-3.5-flash-lite` · `gemini-3.8-flash` |
| ซอร์สโค้ด | GitHub | รีโป `S-Tantiroj/skouth` ติดป้ายเวอร์ชันที่ส่งมอบ (`v1.1.1`) |

### 4.3.2 การเตรียมฐานข้อมูล

1. สร้างโปรเจกต์ใน Supabase แล้วเปิดส่วนขยาย pgvector
2. รันไฟล์ใน `supabase/migrations/` ทีละไฟล์ตามลำดับเลข (001 ถึง 023 รวม 24 ไฟล์) ใน SQL
   Editor ไฟล์ migration เป็นแบบเพิ่มเท่านั้น ไม่แก้หรือลบตาราง `jobs` ที่มีอยู่เดิม
3. ตั้งค่าการยืนยันตัวตนที่ Authentication → URL Configuration ให้ **Site URL** เป็นโดเมนของ
   ระบบ และเพิ่ม `/auth/confirm` กับ `/reset-password` ใน **Redirect URLs** เพราะลิงก์ในอีเมล
   ยืนยันและอีเมลรีเซ็ตรหัสผ่านพาผู้ใช้กลับมาที่สองหน้านี้
4. เปิด "Confirm email" ที่ Authentication → Providers → Email บัญชีที่สมัครใหม่ต้องยืนยันอีเมล
   ก่อน แล้วจึงเข้าคิวรอผู้ดูแลระบบอนุมัติ

> **[ภาพที่ 4-1]** หน้า SQL Editor ของ Supabase หลังรัน migration

### 4.3.3 ตัวแปรสภาพแวดล้อม

ตารางที่ 4-25 ตัวแปรสภาพแวดล้อมของระบบ

| ตัวแปร | ใช้ที่ | ชนิดใน Vercel | คำอธิบาย |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ทั้งสองฝั่ง | Config | ที่อยู่โปรเจกต์ Supabase (Project URL ไม่มี `/rest/v1` ต่อท้าย) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ทั้งสองฝั่ง | Config | คีย์สาธารณะ (`sb_publishable_…`) สิทธิ์ถูกจำกัดด้วย RLS และ column grant |
| `SUPABASE_SERVICE_ROLE_KEY` | เซิร์ฟเวอร์ | Secret | คีย์ลับ (`sb_secret_…`) ข้ามการตรวจ RLS ใช้ใน `lib/supabase/server.ts` |
| `GEMINI_API_KEY` | เซิร์ฟเวอร์ | Secret | คีย์เรียก Gemini API |
| `GEMINI_TIMEOUT_MS` | เซิร์ฟเวอร์ | Config | (ไม่บังคับ) เพดานเวลาการเรียก Gemini ค่าตั้งต้น 20,000 มิลลิวินาที |

คอลัมน์ "ใช้ที่" ระบุว่าตัวแปรถูกอ่านฝั่งใด โดย "ทั้งสองฝั่ง" หมายถึงทั้งเบราว์เซอร์และเซิร์ฟเวอร์
ตัวแปรที่ขึ้นต้นด้วย `NEXT_PUBLIC_` ถูกฝังลงในโค้ดที่ส่งไปเบราว์เซอร์ตอน build จึงไม่ถือเป็น
ความลับ ส่วนคีย์ลับสองตัวถูกอ่านเฉพาะในโค้ดฝั่งเซิร์ฟเวอร์ `DATABASE_URL` ใช้เฉพาะการเชื่อมต่อ
ฐานข้อมูลโดยตรงจากเครื่องผู้พัฒนา จึงไม่ตั้งไว้บน Vercel

### 4.3.4 การติดตั้งบน Vercel

1. นำเข้ารีโปจาก GitHub ใน Vercel ระบบตรวจพบกรอบงาน Next.js และใช้คำสั่ง `next build` เอง
2. กำหนดตัวแปรสภาพแวดล้อมตามตารางที่ 4-25 สำหรับ Production และ Preview
3. สั่ง deploy ระบบจะ build และเผยแพร่ที่ `https://skouth.vercel.app`
4. สร้างผู้ดูแลระบบคนแรก โดยสมัครบัญชีที่หน้า `/signup` ยืนยันอีเมล แล้วรันคำสั่งต่อไปนี้ใน
   SQL Editor เนื่องจากบัญชีใหม่มีสถานะรออนุมัติและยังไม่มีผู้ดูแลระบบคนใดอนุมัติให้ได้

````sql
update profiles set role = 'admin', status = 'approved'
where email = '<อีเมลผู้ดูแลระบบ>';
````

> **[ภาพที่ 4-2]** หน้า Environment Variables ของ Vercel (ซ่อนค่าของคีย์)

การนำเข้าข้อมูลอัตโนมัติด้วย GitHub Actions (หัวข้อ 3.1) ยังไม่เปิดใช้ในการติดตั้งนี้ ตาราง
เวลาถูกปิดไว้และไม่ได้ตั้งค่า secret ของบริการ scraper

### 4.3.5 การตรวจสอบหลังติดตั้ง

ตารางที่ 4-26 รายการตรวจสอบหลังติดตั้งระบบ

| รายการ | วิธีตรวจ | ผลที่คาดหวัง |
|---|---|---|
| หน้าสาธารณะ | เปิด `/` `/help` `/privacy` โดยไม่เข้าสู่ระบบ | แสดงได้ และท้ายหน้าแสดง `Skouth v1.1.1` |
| การเข้าสู่ระบบ | เข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ | เข้าหน้าแดชบอร์ดได้ |
| การป้องกันหน้า | เปิด `/dashboard` โดยไม่เข้าสู่ระบบ | ถูกพากลับไปหน้าเข้าสู่ระบบ |
| การอนุมัติบัญชี | สมัครบัญชีใหม่แล้วเข้าสู่ระบบ | แจ้งว่ารออนุมัติ และบัญชีปรากฏในคิวที่ `/admin/users` |
| การค้นหา | ค้นหาด้วยข้อความภาษาไทย | ได้รายชื่อผู้สมัครพร้อมคะแนน 0–100 |
| การเรียก Gemini | กดประเมินความเหมาะสมที่หน้าผู้สมัคร | ได้คะแนนและเหตุผลภาษาไทย |

---
---

## รายการภาพที่ต้องถ่าย

| ภาพที่ | หน้า | บัญชีที่ใช้ถ่าย |
|---|---|---|
| 4-1 | Supabase → SQL Editor หลังรัน migration | บัญชีเจ้าของโปรเจกต์ |
| 4-2 | Vercel → Settings → Environment Variables (ซ่อนค่าคีย์) | บัญชีเจ้าของโปรเจกต์ |

> ภาพหน้าจอเว็บไซต์ทั้งหมดอยู่ในรายการท้าย `2026-10-22-chapter5-draft.md`
>
> **เลขภาพ** — บทที่ 4 นับเลขภาพใหม่เริ่มที่ 4-1 ถ้าใช้ Insert Caption ของ Word
> เลขจะเรียงให้เอง
