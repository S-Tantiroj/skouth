# การอนุมัติบัญชี · Shortlist แบบบันทึก · ซ่อนฟอร์มสร้างงาน — แผนลงมือ

> **สำหรับผู้ทำงานแบบ agent:** REQUIRED SUB-SKILL — ใช้ superpowers:subagent-driven-development
> (แนะนำ) หรือ superpowers:executing-plans เพื่อทำทีละงาน · ขั้นตอนใช้ checkbox (`- [ ]`) เพื่อติดตาม

**Goal:** ปิดการใช้งานบัญชีใหม่จนกว่าผู้ดูแลจะอนุมัติ · ทำ Shortlist ให้เพิ่ม-ลบได้ในที่เดียวแบบปุ่มบันทึก · ซ่อนฟอร์มสร้างงานจากผู้ใช้ที่ไม่มีสิทธิ์

**Architecture:** เพิ่มคอลัมน์ `profiles.status` แล้วตรวจที่ `decideAccess` จุดเดียว ทุก route
จึงได้ผลพร้อมกันโดยไม่ต้องแก้ผู้เรียก 40 จุด · Shortlist ยังเขียนผ่าน PostgREST ด้วย anon key
ภายใต้ RLS ที่มีอยู่ และใช้ CHECK constraint ที่ฐานข้อมูลแทนการตรวจค่าใน API route
· หน้า Jobs เช็ค role ใน server component แล้วส่ง boolean ลงไป

**Tech Stack:** Next.js 15 App Router · Supabase (Postgres + RLS) · Vitest

**Spec:** `docs/superpowers/specs/2026-10-03-access-control-and-shortlist-design.md`

## Global Constraints

- ภาษาในโค้ดเป็นอังกฤษ ข้อความที่ผู้ใช้เห็นเป็นไทย
- `npm test` (unit) ต้องเขียวเสมอ · `npm run typecheck` ต้องเป็น 0 error — **ต้องรันทั้งสองอย่าง** เพราะ `npm test` เขียวไม่ได้แปลว่า typecheck เขียว
- `*.int.test.ts` คือ integration ที่แตะ Supabase จริง · **รันจากเซสชัน Cowork ไม่ได้ ต้องรันบน Windows**
- integration test ต้องเก็บกวาดของตัวเอง ใช้ชื่อขึ้นต้น `__test__` แล้วลบตอนจบ
- ห้ามส่งข้อความ Postgres ดิบออกไปให้ผู้ใช้ · `console.error` ฝั่งเซิร์ฟเวอร์เก็บข้อความเต็ม
- ห้ามใช้ `npx tsc` ใช้ `npm run typecheck`
- migration รันด้วยมือใน Supabase SQL editor ไม่มีตัวรันอัตโนมัติ

## Review Focus

- **ผู้ดูแลเปลี่ยนสถานะตัวเองเป็น `rejected`** → ต้องถูกปฏิเสธ มิฉะนั้นล็อกตัวเองออกและกู้ได้ทางเดียวคือ SQL editor (ครอบใน Task 5)
- **บัญชีที่ถูกปฏิเสธแล้วอนุมัติใหม่** → ต้องใช้งานได้ทันทีโดยไม่ต้องล้าง cookie เพราะ `decideAccess` อ่านสถานะสดทุกคำขอ (ครอบใน Task 2)
- **ส่งชื่อ Shortlist 61 ตัวอักษรผ่าน PostgREST ตรง** → ฐานข้อมูลต้องปฏิเสธ ไม่ใช่กันแค่ที่ `maxLength` ของช่องกรอก (ครอบใน Task 7)
- **กดติ๊กซ้ำเร็วๆ บนผู้สมัครคนเดิม** → ต้องไม่เกิด error จาก primary key ซ้ำ (ครอบใน Task 8)
- **ตั้งชื่อ Shortlist ซ้ำกับรายการที่มีอยู่** → ระบบอนุญาตโดยตั้งใจ ไม่มี unique constraint ต้องไม่โยน error (ครอบใน Task 7)

---

# เฟส 1 — ฐานข้อมูล

### Task 1: migration 022a — สถานะบัญชี และลบคอลัมน์ `note`

**Files:**
- Create: `supabase/migrations/022a_account_status.sql`
- Test: `supabase/migrations/022a_account_status.int.test.ts`

**Interfaces:**
- Produces: คอลัมน์ `profiles.status` ชนิด `account_status` · คอลัมน์ `shortlist_candidates.note` หายไป

> **ทำไมแยกจาก 022b** — สองคำสั่งในไฟล์นี้**ไม่กระทบเว็บที่ deploy อยู่เลย** เพราะโค้ดที่
> ใช้งานจริงทำ `.select('role')` ไม่ได้ดึง `status` และไม่มีที่ไหนอ่าน `note` จึงรันได้ทันที
> แล้วพัฒนาเฟส 2 ต่อโดยไม่มีช่วงที่ฐานข้อมูลเข้มกว่าหน้าจอ · ส่วน constraint ชื่อ Shortlist
> กระทบทันที จึงอยู่ใน 022b ที่รันตอน deploy เฟส 3

- [ ] **Step 1: ตรวจว่า `note` ว่างจริงก่อนเขียน migration**

รันใน Supabase SQL editor

```sql
select count(*) from shortlist_candidates where note is not null and trim(note) <> '';
```

ได้ 0 จึงไปต่อ · ไม่เป็น 0 ให้หยุดและรายงาน — `drop column` เอาคืนไม่ได้ และไม่มี staging

- [ ] **Step 2: เขียน `022a_account_status.sql`**

```sql
create type account_status as enum ('pending', 'approved', 'rejected');
alter table profiles add column status account_status not null default 'pending';
update profiles set status = 'approved';

alter table shortlist_candidates drop column note;
```

**ลำดับสามบรรทัดแรกสลับไม่ได้** — `update` ต้องมาหลัง `add column` และต้องมี มิฉะนั้น
บัญชีที่มีอยู่ทั้งหมดรวมถึงผู้ดูแลจะกลายเป็น `pending` พร้อมกัน

**ห้ามแตะ `grant update` ของ migration 019** คอลัมน์ใหม่ต้องไม่ได้สิทธิ์เขียนจาก client

- [ ] **Step 3: เขียน integration test ให้แดง**

`supabase/migrations/022a_account_status.int.test.ts` ตามรูปแบบของ
`019_lock_profile_columns.int.test.ts` — สร้างบัญชีจริงด้วย `admin.auth.admin.createUser`
แล้วล็อกอินด้วย anon key ยิง PostgREST ตรง

```ts
test('บัญชีที่สร้างใหม่ได้ status pending โดยไม่ต้องแก้ trigger', async () => {
  // createUser → อ่าน profiles.status ด้วย service-role
  expect(profile.status).toBe('pending')
})

test('ผู้ใช้ที่ล็อกอินแล้วแก้ status ของตัวเองไม่ได้', async () => {
  // PATCH /rest/v1/profiles?id=eq.<ตัวเอง> body {"status":"approved"} ด้วย anon key
  // ตรวจค่าในฐานซ้ำด้วย service-role ไม่เชื่อค่า error อย่างเดียว
  expect(after.status).toBe('pending')
})
```

- [ ] **Step 4: รันเทสต์ให้แดง**

Run (บน Windows): `npx vitest run --config vitest.integration.config.ts supabase/migrations/022a_account_status.int.test.ts`
Expected: FAIL — ยังไม่ได้รัน migration

- [ ] **Step 5: รัน migration ใน Supabase SQL editor แล้วรันเทสต์ซ้ำ**

Expected: PASS ทั้งสองเทสต์

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/022a_account_status.sql supabase/migrations/022a_account_status.int.test.ts
git commit -m "feat: migration 022a สถานะบัญชี และลบคอลัมน์ note"
```

---

# เฟส 2 — การอนุมัติบัญชี

### Task 2: `decideAccess` ตรวจสถานะ

**Files:**
- Modify: `lib/auth/profileGate.ts`
- Test: `lib/auth/profileGate.test.ts`

**Interfaces:**
- Produces: `AccessDecision` เพิ่มเหตุผล `'pending' | 'rejected'` · `accessDeniedMessage` รับสองค่าใหม่

- [ ] **Step 1: เขียนเทสต์ให้แดง**

```ts
test('status pending → ปฏิเสธพร้อมเหตุผล pending', () => {
  expect(decideAccess({ role: 'member', status: 'pending' }, false))
    .toEqual({ allowed: false, reason: 'pending' })
})

test('status rejected → ปฏิเสธพร้อมเหตุผล rejected', () => {
  expect(decideAccess({ role: 'member', status: 'rejected' }, false))
    .toEqual({ allowed: false, reason: 'rejected' })
})

test('status approved → ผ่านพร้อม role', () => {
  expect(decideAccess({ role: 'admin', status: 'approved' }, false))
    .toEqual({ allowed: true, role: 'admin' })
})

test('role เพี้ยนและ status pending พร้อมกัน → คืน bad-role ไม่ใช่ pending', () => {
  expect(decideAccess({ role: 'wizard', status: 'pending' }, false))
    .toEqual({ allowed: false, reason: 'bad-role' })
})

test('status ที่ไม่รู้จัก → ปฏิเสธ ไม่ใช่ปล่อยผ่าน', () => {
  expect(decideAccess({ role: 'member', status: 'weird' }, false).allowed).toBe(false)
})

test('ข้อความของ pending บอกว่ารออนุมัติ ไม่ใช่ให้ลองใหม่', () => {
  expect(accessDeniedMessage('pending')).toContain('รอการอนุมัติ')
  expect(accessDeniedMessage('rejected')).toContain('ไม่ได้รับอนุมัติ')
})
```

- [ ] **Step 2: รันเทสต์ให้แดง**

Run: `npx vitest run lib/auth/profileGate.test.ts`
Expected: FAIL

- [ ] **Step 3: แก้ `lib/auth/profileGate.ts`**

เพิ่ม `export const STATUS_VALUES = ['pending', 'approved', 'rejected'] as const`
· ขยาย union ของ `reason` เป็น `'read-failed' | 'no-profile' | 'bad-role' | 'pending' | 'rejected'`
ทั้งใน `AccessDecision` และพารามิเตอร์ของ `accessDeniedMessage`
· ใน `decideAccess` อ่าน `status` **หลัง** การตรวจ role: ค่าที่ไม่อยู่ใน `STATUS_VALUES`
คืน `'pending'` (ปิดไว้ก่อน ไม่ใช่ปล่อยผ่าน) · `'approved'` เท่านั้นที่ผ่าน

ข้อความสองค่าใหม่

| reason | ข้อความ |
|---|---|
| `pending` | `บัญชีนี้รอการอนุมัติจากผู้ดูแลระบบ กรุณาติดต่อผู้ดูแลหากรอเกินสมควร` |
| `rejected` | `บัญชีนี้ไม่ได้รับอนุมัติให้ใช้งาน กรุณาติดต่อผู้ดูแลระบบ` |

- [ ] **Step 4: รันเทสต์ + typecheck**

Run: `npx vitest run lib/auth/profileGate.test.ts` → PASS
Run: `npm run typecheck` → 0 error (จะแดงที่จุดที่ยังส่ง reason แบบเดิม ให้แก้ให้ครบ)

- [ ] **Step 5: Commit**

```bash
git add lib/auth/profileGate.ts lib/auth/profileGate.test.ts
git commit -m "feat: decideAccess ตรวจสถานะบัญชีหลังตรวจ role"
```

### Task 3: `getSession` อ่านสถานะ

**Files:**
- Modify: `lib/auth/session.ts:45` — `.select('role')` → `.select('role, status')`
- Modify: `app/(auth)/login/page.tsx` — `.select('role')` → `.select('role, status')`

- [ ] **Step 1: แก้ select ทั้งสองที่**

ไม่ต้องแก้อย่างอื่น — `decideAccess` และ `accessDeniedMessage` รับงานต่อเอง และ
`getSession` ยังคืน `null` เหมือนเดิมเมื่อไม่ผ่าน

- [ ] **Step 2: รันชุดเทสต์ทั้งหมด + typecheck**

Run: `npm test` → เขียวทั้งหมด
Run: `npm run typecheck` → 0 error

- [ ] **Step 3: Commit**

```bash
git add lib/auth/session.ts "app/(auth)/login/page.tsx"
git commit -m "feat: อ่าน status มาพร้อม role ที่จุดตรวจสิทธิ์"
```

### Task 4: `/auth/confirm` บอกสถานะแทนการเด้ง

**Files:**
- Modify: `app/auth/confirm/page.tsx`

- [ ] **Step 1: แก้ฟังก์ชัน `go`**

ก่อน `window.location.href = '/dashboard'` ให้อ่านสถานะของตัวเองก่อน

```
db.from('profiles').select('role, status').eq('id', session.user.id).maybeSingle()
```

แล้วส่งผลเข้า `decideAccess` — ผ่านจึงไป `/dashboard` · ไม่ผ่านให้ `setMsg(accessDeniedMessage(reason))`
และคงอยู่หน้าเดิม **ห้าม redirect** มิฉะนั้นผู้ที่เพิ่งยืนยันอีเมลจะถูกเด้งโดยไม่รู้สาเหตุ

- [ ] **Step 2: ตรวจด้วยมือ**

สมัครบัญชีใหม่ → กดลิงก์ยืนยัน → ต้องเห็นข้อความรออนุมัติ ไม่ใช่ถูกพาไป `/login`

- [ ] **Step 3: รัน typecheck แล้ว commit**

```bash
git add "app/auth/confirm/page.tsx"
git commit -m "feat: หน้ายืนยันอีเมลแสดงสถานะรออนุมัติแทนการเด้งไป dashboard"
```

### Task 5: API เปลี่ยนสถานะบัญชี

**Files:**
- Create: `app/api/admin/users/[id]/status/route.ts`
- Create: `app/api/admin/users/[id]/status/route.test.ts`
- Modify: `lib/activity/log.ts` — เพิ่ม `'account_status'` เข้า `Action` และ `ACTION_LABELS`

**Interfaces:**
- Consumes: `getSession`, `hasRole` จาก `@/lib/auth/session` · `logActivity` จาก `@/lib/activity/log`
- Produces: `POST /api/admin/users/[id]/status` รับ `{ status: 'approved' | 'rejected' }`

- [ ] **Step 1: เขียนเทสต์ให้แดง**

ตามรูปแบบของ `app/api/ingest/route.test.ts` — mock เฉพาะ `getSession` ผ่าน `vi.hoisted`
ใช้ `hasRole` ตัวจริงผ่าน `importOriginal`

```ts
test('member เรียกแล้วได้ 403 และไม่เกิดการเขียนลงฐาน', async () => {
  // updateMock ต้องไม่ถูกเรียกเลย — ประตูที่อยู่หลังการทำงานคืนสถานะถูกแต่รั่วจริง
})

test('data_manager เรียกแล้วได้ 403 และไม่เกิดการเขียน', async () => {})

test('role ที่ enum ไม่รู้จักถูกปิดประตู', async () => {})

test('แอดมินเปลี่ยนสถานะตัวเองเป็น rejected ไม่ได้', async () => {
  // ได้ 400 และ updateMock ไม่ถูกเรียก — กันการล็อกตัวเองออก
})

test('ค่า status ที่ไม่ใช่ approved หรือ rejected ได้ 400', async () => {})

test('แอดมินอนุมัติบัญชีอื่นสำเร็จ และบันทึกลง activity_log หลังเขียนสำเร็จ', async () => {
  // logActivity ถูกเรียกด้วย action 'account_status'
})

test('เขียนฐานข้อมูลล้มเหลว → 500 และไม่ส่งข้อความ Postgres ดิบออกไป', async () => {})
```

- [ ] **Step 2: รันเทสต์ให้แดง**

Run: `npx vitest run "app/api/admin/users/[id]/status/route.test.ts"`
Expected: FAIL — ยังไม่มีไฟล์ route

- [ ] **Step 3: เพิ่ม `'account_status'` เข้า `lib/activity/log.ts`**

เพิ่มเข้า union `Action` และเพิ่มป้าย `account_status: 'เปลี่ยนสถานะบัญชี'` ใน `ACTION_LABELS`
**ไม่ต้องทำ migration** เพราะ `activity_log.action` เป็น `text` เปล่าไม่มี CHECK

- [ ] **Step 4: เขียน `app/api/admin/users/[id]/status/route.ts`**

`export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> })`

ลำดับ: `getSession()` → `hasRole(session.role, 'admin')` ไม่ผ่านคืน 403 →
อ่าน `status` จาก body ไม่อยู่ใน `['approved','rejected']` คืน 400 →
`id === session.userId` คืน 400 พร้อมข้อความว่าเปลี่ยนสถานะของตัวเองไม่ได้ →
`db.from('profiles').update({ status }).eq('id', id)` เช็ค `error` คืน 500 พร้อม
ข้อความกลาง และ `console.error` ข้อความเต็ม → `logActivity` **หลัง**เขียนสำเร็จ

- [ ] **Step 5: รันเทสต์ + typecheck**

Run: `npx vitest run "app/api/admin/users/[id]/status/route.test.ts"` → PASS
Run: `npm run typecheck` → 0 error

- [ ] **Step 6: Commit**

```bash
git add "app/api/admin/users/[id]/status" lib/activity/log.ts
git commit -m "feat: API เปลี่ยนสถานะบัญชี พร้อมกันแอดมินปฏิเสธตัวเอง"
```

### Task 6: หน้าจอผู้ดูแล

**Files:**
- Modify: `app/(app)/admin/users/page.tsx`
- Create: `components/AccountStatusActions.tsx`

**Interfaces:**
- Consumes: `POST /api/admin/users/[id]/status` จาก Task 5

- [ ] **Step 1: สร้าง `components/AccountStatusActions.tsx`**

client component รับ `{ userId: string }` · ปุ่ม **อนุมัติ** และ **ปฏิเสธ** ยิงไปที่ route
ของ Task 5 แล้ว `router.refresh()` เมื่อสำเร็จ

**ตามบทเรียนของ `RoleSelect`** — อย่าเปลี่ยนสถานะบนหน้าจอก่อนคำขอสำเร็จ และเมื่อล้มเหลว
ให้แสดงเหตุผลจากเซิร์ฟเวอร์ด้วย `var(--bad)` ไม่ใช่ `var(--ok)`

- [ ] **Step 2: แก้ `app/(app)/admin/users/page.tsx`**

เปลี่ยน select เป็น `'id, display_name, email, role, status, created_at'`

เพิ่มส่วน **"บัญชีรออนุมัติ"** ไว้**เหนือ**ตารางผู้ใช้ แสดงเฉพาะแถวที่ `status === 'pending'`
แต่ละแถวมี `identityName` · วันที่สมัคร · `<AccountStatusActions />`
**คิวว่างไม่ต้องแสดงอะไรเลย**

ตารางผู้ใช้หลักเพิ่มคอลัมน์สถานะ เพื่อให้เห็นบัญชีที่ถูกปฏิเสธและเปลี่ยนใจได้

- [ ] **Step 3: ตรวจด้วยมือ**

ล็อกอินเป็นแอดมิน → เห็นคิว → กดอนุมัติ → แถวหายจากคิวและสถานะในตารางเปลี่ยน
→ ล็อกอินด้วยบัญชีนั้นได้

- [ ] **Step 4: รัน `npm test` + typecheck แล้ว commit**

```bash
git add "app/(app)/admin/users/page.tsx" components/AccountStatusActions.tsx
git commit -m "feat: หน้าจัดการผู้ใช้แสดงคิวรออนุมัติและสถานะบัญชี"
```

---

# เฟส 3 — Shortlist

### Task 7: migration 022b — เพดานชื่อ Shortlist

**Files:**
- Create: `supabase/migrations/022b_shortlist_name_limit.sql`
- Test: `supabase/migrations/022b_shortlist_name_limit.int.test.ts`

**Interfaces:**
- Produces: constraint `shortlists_name_len` บน `shortlists.name`

> **ไฟล์นี้กระทบเว็บที่ deploy อยู่ทันทีที่รัน** ต่างจาก 022a — หลังรันแล้ว ถ้ามีคนสร้าง
> Shortlist ชื่อยาวเกิน 60 หรือเว้นวรรคล้วนบนเวอร์ชันที่ deploy อยู่ จะเห็นข้อความ
> Postgres ดิบ เพราะโค้ดเดิมเขียน `setMsg(error.message)` · **จึงรันพร้อมตอน deploy
> เฟส 3** เพื่อให้ `maxLength={60}` ที่ช่องกรอกมาถึงผู้ใช้พร้อมกับ constraint

- [ ] **Step 1: ตรวจแถวที่มีอยู่ก่อนรัน**

`ALTER TABLE ADD CONSTRAINT` ตรวจแถวเดิมด้วย — **มีแถวที่ผิดเงื่อนไขแม้แถวเดียว
migration จะล้มทั้งไฟล์**

```sql
select id, name, char_length(name) as len from shortlists
where char_length(trim(name)) not between 1 and 60;
```

ได้ 0 แถวจึงรันได้ · มีแถวต้องแก้ชื่อก่อน

- [ ] **Step 2: เขียน `022b_shortlist_name_limit.sql`**

```sql
alter table shortlists add constraint shortlists_name_len
  check (char_length(trim(name)) between 1 and 60);
```

`trim` อยู่ข้างในเพราะชื่อที่เป็นช่องว่างล้วนต้องไม่ผ่าน

- [ ] **Step 3: เขียน integration test ให้แดง**

```ts
test('ชื่อ shortlist ยาวเกิน 60 ตัวอักษรถูกฐานข้อมูลปฏิเสธ', async () => {
  // insert ด้วย anon key: 60 ตัวผ่าน · 61 ตัวไม่ผ่าน · '   ' ไม่ผ่าน
})

test('ชื่อ shortlist ซ้ำกันได้ ไม่มี unique constraint', async () => {
  // insert ชื่อเดียวกันสองครั้งด้วย anon key → ทั้งสองครั้งสำเร็จ
  // เป็นพฤติกรรมที่ตั้งใจ ผู้ใช้ตั้งชื่อซ้ำได้ถ้าต้องการ
})
```

**เขียนเลข 60 และ 61 ลงไปตรงๆ ห้ามอ่านจากค่าคงที่ในโค้ด** — เทสต์ที่อ่านค่าคงที่
แล้ววนลูปจะเขียวต่อไปแม้มีคนเปลี่ยนเพดาน

- [ ] **Step 4: รันเทสต์ให้แดง → รัน migration → รันซ้ำให้เขียว**

Run (บน Windows): `npx vitest run --config vitest.integration.config.ts supabase/migrations/022b_shortlist_name_limit.int.test.ts`

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/022b_shortlist_name_limit.sql supabase/migrations/022b_shortlist_name_limit.int.test.ts
git commit -m "feat: migration 022b เพดานความยาวชื่อ shortlist"
```

### Task 8: `SaveToShortlist`

**Files:**
- Create: `components/SaveToShortlist.tsx`
- Delete: `components/AddToShortlist.tsx`
- Modify: `app/(app)/candidates/[id]/page.tsx` — เปลี่ยนคอมโพเนนต์ที่ใช้

**Interfaces:**
- Produces: `<SaveToShortlist candidateId={string} candidateName?={string} lists={Shortlist[]} memberOf={string[]} onChange?={() => void} />`
  โดย `Shortlist = { id: string; name: string }` · `memberOf` คือ id ของรายการที่ผู้สมัครคนนี้อยู่

- [ ] **Step 1: เขียนเทสต์ให้แดง**

`components/SaveToShortlist.test.tsx` — ทดสอบตรรกะล้วน ไม่แตะเครือข่าย

```ts
test('ไม่อยู่ในรายการใดเลย → ปุ่มแสดง "บันทึก"', () => {})
test('อยู่อย่างน้อยหนึ่งรายการ → ปุ่มแสดง "บันทึกแล้ว"', () => {})
test('กดติ๊กซ้ำขณะคำขอแรกยังไม่เสร็จ ต้องไม่ยิงซ้ำ', () => {
  // กัน primary key ซ้ำจากการดับเบิลคลิก
})
```

- [ ] **Step 2: รันเทสต์ให้แดง**

Run: `npx vitest run components/SaveToShortlist.test.tsx`

- [ ] **Step 3: เขียน `components/SaveToShortlist.tsx`**

ปุ่มสองสถานะตามจำนวนใน `memberOf` · กดแล้วเปิดแผงแสดง `lists` พร้อม checkbox
· ติ๊ก = `upsert` ลง `shortlist_candidates` · เอาติ๊กออก = `delete` ด้วย
`.eq('shortlist_id', id).eq('candidate_id', candidateId)`
· ช่องพิมพ์ชื่อ + ปุ่มสร้าง: `insert` ลง `shortlists` แล้ว `upsert` ทันที

ใช้ `upsert` ไม่ใช่ `insert` สำหรับ `shortlist_candidates` เพื่อให้การกดซ้ำไม่เป็น error
· ล็อกปุ่มระหว่างคำขอยังไม่เสร็จ · เรียก `track()` ด้วย action เดิม
(`shortlist_create` · `shortlist_add` · `shortlist_remove`)
· ช่องชื่อใส่ `maxLength={60}` ให้ตรงกับ constraint ของ Task 7

- [ ] **Step 4: เปลี่ยนหน้ารายละเอียดผู้สมัครให้ใช้ตัวใหม่ แล้วลบ `AddToShortlist.tsx`**

หน้านี้ต้องดึงข้อมูลสองชุดส่งเข้าคอมโพเนนต์ เพราะ `SaveToShortlist` ไม่ดึงเอง

```
shortlists        → select('id, name').order('created_at')
shortlist_candidates → select('shortlist_id').eq('candidate_id', <id ของหน้านี้>)
```

ชุดที่สองคือที่มาของ `memberOf` · Task 8 ใช้รูปแบบเดียวกันแต่เป็น `.in()` หลายคน

- [ ] **Step 5: รันเทสต์ + typecheck + ตรวจด้วยมือ แล้ว commit**

```bash
git add components/SaveToShortlist.tsx components/SaveToShortlist.test.tsx "app/(app)/candidates/[id]/page.tsx"
git rm components/AddToShortlist.tsx
git commit -m "feat: ปุ่มบันทึกเข้า Shortlist แบบติ๊กเพิ่มติ๊กออก"
```

### Task 9: ใส่ปุ่มที่ผลการค้นหาและหน้างาน

**Files:**
- Modify: `app/(app)/search/page.tsx:201-202`
- Modify: `components/JobMatches.tsx`

**Interfaces:**
- Consumes: `<SaveToShortlist>` จาก Task 8

- [ ] **Step 1: ดึงข้อมูลสองชุดต่อหน้า**

`select('id, name').order('created_at')` จาก `shortlists` · และ
`select('shortlist_id, candidate_id').in('candidate_id', <id ที่แสดงอยู่>)` จาก
`shortlist_candidates` — RLS กรองให้เหลือของเจ้าของอยู่แล้ว

- [ ] **Step 2: วางปุ่มในแต่ละแถว**

ที่ `search/page.tsx` แถวผลลัพธ์เป็น `<Link>` ครอบทั้งแถว — **ต้องย้ายปุ่มออกนอก `Link`
หรือเรียก `e.stopPropagation()`** มิฉะนั้นกดปุ่มแล้วจะเด้งไปหน้ารายละเอียดแทนที่จะเปิดแผง

- [ ] **Step 3: ตรวจด้วยมือทั้งสองหน้า แล้ว commit**

```bash
git add "app/(app)/search/page.tsx" components/JobMatches.tsx
git commit -m "feat: บันทึกเข้า Shortlist ได้จากผลการค้นหาและหน้างาน"
```

### Task 10: หน้า `/shortlists` แก้ชื่อและลบ

**Files:**
- Modify: `app/(app)/shortlists/page.tsx`

- [ ] **Step 1: เพิ่มการแก้ชื่อ**

คลิกชื่อ → กลายเป็น input (`maxLength={60}`) → Enter หรือ blur สั่ง
`update({ name }).eq('id', id)` · ชื่อว่างหรือช่องว่างล้วนให้ย้อนกลับค่าเดิมโดยไม่ยิงคำขอ
· **ชื่อซ้ำกับรายการอื่นอนุญาตได้** ไม่มี unique constraint

- [ ] **Step 2: เพิ่มการลบรายการ**

ปุ่มลบ → `window.confirm` ที่**บอกจำนวนผู้สมัครในรายการนั้น** →
`delete().eq('id', id)` · `shortlist_candidates` หายตาม `on delete cascade` ของ migration 001

- [ ] **Step 3: ตรวจด้วยมือ**

แก้ชื่อเป็น 61 ตัวอักษรผ่าน DevTools → ฐานข้อมูลต้องปฏิเสธและหน้าจอแสดงข้อความ
ไม่ใช่เงียบหาย

- [ ] **Step 4: รัน `npm test` + typecheck แล้ว commit**

```bash
git add "app/(app)/shortlists/page.tsx"
git commit -m "feat: แก้ชื่อและลบ Shortlist ได้"
```

---

# เฟส 4 — หน้า Jobs

### Task 11: ซ่อนการ์ดสร้างงาน

**Files:**
- Modify: `app/(app)/jobs/page.tsx`

- [ ] **Step 1: เช็คสิทธิ์แล้วซ่อนการ์ด**

```tsx
const session = await getSession()
const canCreate = !!session && hasRole(session.role, 'data_manager')
...
{canCreate && <JobForm />}
```

**ไม่แตะ `components/JobForm.tsx`** เพราะหน้าแก้ไขงานใช้คอมโพเนนต์เดียวกัน

- [ ] **Step 2: ตรวจด้วยมือ**

ล็อกอินเป็น `member` → ไม่เห็นการ์ดสร้างงาน แต่ยังเห็นรายการงานและเปิดดูได้
· ล็อกอินเป็น `data_manager` → เห็นการ์ดตามเดิม

**ไม่เขียนเทสต์ใหม่โดยตั้งใจ** — ด่านจริงคือ `POST /api/jobs` ซึ่งมีเทสต์ครอบอยู่แล้ว
เทสต์ที่ยืนยันว่า `canCreate` เป็น false จะพิสูจน์แค่ว่า `hasRole` ทำงาน ซึ่งมีเทสต์
ของตัวเองอยู่แล้ว — เป็นเทสต์ที่แดงไม่ได้

- [ ] **Step 3: รัน `npm test` + typecheck แล้ว commit**

```bash
git add "app/(app)/jobs/page.tsx"
git commit -m "fix: ซ่อนการ์ดสร้างงานจากผู้ใช้ที่ API ปฏิเสธอยู่แล้ว"
```

---

# ปิดงาน

- [ ] **รันชุดเทสต์ทั้งหมด**

Run: `npm test` → เขียว
Run: `npm run typecheck` → 0 error
Run (Windows): `npm run test:integration` → เขียว

- [ ] **Break check — ทำนายจำนวนเทสต์ที่จะแดงก่อนรันทุกครั้ง**

| ถอดอะไรออก | คาดว่าแดงกี่เทสต์ |
|---|---|
| การตรวจ `status` ใน `decideAccess` | เทสต์ใน `profileGate.test.ts` ที่เกี่ยวกับสถานะ |
| `id === session.userId` ใน route ของ Task 5 | เทสต์ "แอดมินเปลี่ยนสถานะตัวเองไม่ได้" |
| `shortlists_name_len` constraint | เทสต์ความยาวชื่อใน int test ของ Task 7 |
| `canCreate &&` ในหน้า Jobs | ไม่มีเทสต์แดง — ตามที่ตั้งใจไว้ใน Task 11 |

คืนทุกอย่างกลับหลังตรวจเสร็จ

- [ ] **อัปเดต `CLAUDE.md`**

เพิ่มหัวข้อ migration 022a และ 022b พร้อมเหตุผลที่แยกไฟล์ · กฎว่า `status` ต้องไม่อยู่ใน `grant update` ·
บันทึกว่าหน้า Jobs เคยแสดงฟอร์มที่ API ปฏิเสธ · และว่าคอลัมน์ `note` ถูกลบแล้ว
