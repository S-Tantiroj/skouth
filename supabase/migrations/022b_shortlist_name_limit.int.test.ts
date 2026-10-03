import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { getServerClient } from '@/lib/supabase/server'

// พิสูจน์ว่าเพดานชื่อ Shortlist อยู่ที่ชั้นฐานข้อมูลจริง ไม่ใช่แค่ `maxLength` ที่ฟอร์ม
//
// **ยิงด้วย anon key ตรงไปที่ PostgREST** เหมือน 019 และ 022a — `maxLength` กัน
// การพิมพ์และการวางได้ แต่กันคำขอที่ยิงตรงมาด้วย anon key ซึ่งเป็นค่าสาธารณะไม่ได้
// เทสต์ที่ตรวจแค่ว่า "ช่องกรอกจำกัด 60 ตัว" จะเขียวได้ทั้งที่ด่านจริงไม่มีอยู่
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// `as: any` โดยตั้งใจ — `createClient` ที่ไม่มี Database generic อนุมาน schema เป็น
// `never` เมื่อถูกส่งผ่านพารามิเตอร์ แล้ว `.insert({ name })` กลายเป็น TS2353
// เทสต์นี้ตั้งใจส่งค่าที่ฐานข้อมูลต้องปฏิเสธอยู่แล้ว ชนิดฝั่ง TS จึงไม่ใช่ด่านที่ต้องการ
/** สร้างบัญชีจริงแล้วล็อกอิน — RLS ของ `shortlists` ผูกกับ `auth.uid()` */
async function withUser<T>(fn: (as: any, userId: string) => Promise<T>) {
  const admin = getServerClient()
  const email = `__test__sl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`
  const password = `Pw_${Math.random().toString(36).slice(2)}A1!`

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  expect(createErr).toBeNull()
  const userId = created!.user!.id

  try {
    const as = createClient(URL, ANON)
    const { error: signInErr } = await as.auth.signInWithPassword({ email, password })
    expect(signInErr).toBeNull()
    const out = await fn(as, userId)
    await as.auth.signOut()
    return out
  } finally {
    // ลบบัญชีแล้ว shortlists ของเขาหายตาม (owner_id ... on delete cascade)
    await admin.auth.admin.deleteUser(userId)
  }
}

// **เขียนเลข 60 และ 61 ลงไปตรงๆ ห้ามอ่านจากค่าคงที่ในโค้ด** — เทสต์ที่อ่านค่าคงที่
// แล้ววนลูปจะเขียวต่อไปแม้มีคนเปลี่ยนเพดาน เพราะมันไปทดสอบค่าใหม่ตามที่โค้ดบอก
// ตัวเลขตรงนี้คือสัญญากับ DDL ของตาราง ซึ่งอยู่นอกโค้ด TypeScript
// (บทเรียนเดียวกับ JOB_TEXT_LIMITS ใน lib/jobs/validate.test.ts)
test('ชื่อ shortlist ยาวเกิน 60 ตัวอักษรถูกฐานข้อมูลปฏิเสธ', async () => {
  await withUser(async (as, userId) => {
    const ok = await as
      .from('shortlists')
      .insert({ name: '__test__' + 'ก'.repeat(52), owner_id: userId })
      .select('id')
      .maybeSingle()
    // '__test__' = 8 ตัว + 52 = 60 พอดี ต้องผ่าน
    expect(ok.error).toBeNull()

    const tooLong = await as
      .from('shortlists')
      .insert({ name: '__test__' + 'ก'.repeat(53), owner_id: userId })
    expect(tooLong.error).not.toBeNull()

    // **ช่องว่างล้วนต้องไม่ผ่าน** — เป็นเหตุผลที่ `trim` อยู่ข้างใน char_length
    // ถ้าไม่มี trim ชื่อนี้จะผ่านเพราะยาว 3 ตัว แล้วผู้ใช้จะได้การ์ดที่ไม่มีชื่อ
    const blank = await as.from('shortlists').insert({ name: '   ', owner_id: userId })
    expect(blank.error).not.toBeNull()

    const empty = await as.from('shortlists').insert({ name: '', owner_id: userId })
    expect(empty.error).not.toBeNull()
  })
}, 30000)

// พฤติกรรมที่ตั้งใจ ไม่ใช่ช่องโหว่ — ห้ามชื่อซ้ำจะทำให้คนที่พิมพ์ชื่อทั่วไป
// อย่าง "น่าสนใจ" กดสร้างไม่ผ่านโดยไม่เข้าใจว่าทำไม
test('ชื่อ shortlist ซ้ำกันได้ ไม่มี unique constraint', async () => {
  await withUser(async (as, userId) => {
    const name = '__test__ซ้ำกันได้'
    const first = await as.from('shortlists').insert({ name, owner_id: userId })
    const second = await as.from('shortlists').insert({ name, owner_id: userId })
    expect(first.error).toBeNull()
    expect(second.error).toBeNull()
  })
}, 30000)
