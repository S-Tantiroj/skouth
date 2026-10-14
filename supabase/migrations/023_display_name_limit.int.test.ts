import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { getServerClient } from '@/lib/supabase/server'

// พิสูจน์ว่าเพดานความยาว `display_name` อยู่ที่ชั้นฐานข้อมูลจริง — ปิดช่อง UAT ST-13
//
// **เดินเส้นทางเดียวกับผู้ทดสอบ ST-13 ทุกขั้น** — ล็อกอินด้วย anon key ซึ่งเป็นค่า
// สาธารณะที่อยู่ใน bundle ของเบราว์เซอร์ แล้ว PATCH ตรงไปที่ PostgREST
// **ไม่ผ่าน `DisplayNameCard` และไม่ผ่าน route ไหนเลย** เพราะช่องโหว่ไม่ได้อยู่ที่หน้าจอ
// (หลักเดียวกับ `019_lock_profile_columns.int.test.ts` และ `022a_account_status`)
//
// เทสต์ที่ตรวจแค่ว่า "ฟอร์มมี maxLength" จะเขียวได้ทั้งที่ด่านจริงไม่มีอยู่ —
// ซึ่งเป็นสภาพของระบบก่อน migration นี้เป๊ะ
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function withUser<T>(fn: (as: any, userId: string) => Promise<T>) {
  const admin = getServerClient()
  const email = `__test__dn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`
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
    await admin.auth.admin.deleteUser(userId)
  }
}

// **เขียนเลข 254 และ 255 ลงไปตรงๆ ห้ามอ้างค่าคงที่จากโค้ด** — ตัวเลขนี้เป็นสัญญากับ
// DDL ของตาราง ไม่ใช่ค่าที่เราตั้งเองได้ตามใจ · เทสต์ที่อ่านค่าคงที่แล้ววนลูปจะเขียว
// ต่อไปแม้มีคนเปลี่ยนเพดานให้ไม่ตรงกับฐาน (บทเรียนจาก JOB_TEXT_LIMITS)
test('display_name ยาวเกิน 254 ตัวถูกฐานข้อมูลปฏิเสธผ่าน anon key', async () => {
  await withUser(async (as, userId) => {
    const admin = getServerClient()

    const ok = await as
      .from('profiles')
      .update({ display_name: 'ก'.repeat(254) })
      .eq('id', userId)
    expect(ok.error).toBeNull()

    const tooLong = await as
      .from('profiles')
      .update({ display_name: 'ก'.repeat(255) })
      .eq('id', userId)
    expect(tooLong.error).not.toBeNull()

    // **ยืนยันที่ฐานข้อมูลด้วย ไม่เชื่อค่า error อย่างเดียว** — ถ้าวันหนึ่ง PostgREST
    // เปลี่ยนไปคืน error เป็น null เมื่อไม่มีแถวถูกแตะ การเช็คแค่ error จะกลายเป็น
    // เทสต์ที่เขียวโดยไม่ได้ตรวจอะไร
    const { data: after } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle()
    expect(char((after as any)?.display_name)).toBe(254)
  })
}, 30000)

test('ชื่อที่เป็นช่องว่างล้วนถูกปฏิเสธ', async () => {
  await withUser(async (as, userId) => {
    const blank = await as.from('profiles').update({ display_name: '   ' }).eq('id', userId)
    expect(blank.error).not.toBeNull()

    const empty = await as.from('profiles').update({ display_name: '' }).eq('id', userId)
    expect(empty.error).not.toBeNull()
  })
}, 30000)

// **เส้นทางที่ต้องยังใช้ได้** — ถ้า constraint แรงเกินไปจนแก้ชื่อปกติไม่ได้
// หน้า /settings จะพังโดยไม่มีใครรู้จนกว่าจะมีคนลองกดบันทึก
test('ชื่อปกติยังบันทึกได้ และ null ยังยอมรับได้', async () => {
  await withUser(async (as, userId) => {
    const normal = await as
      .from('profiles')
      .update({ display_name: '__test__ สมใจ แซ่แต้' })
      .eq('id', userId)
    expect(normal.error).toBeNull()

    // `identityName` ถอยไปใช้ email เมื่อไม่มีชื่อ (migration 021) ค่า null จึงต้องผ่าน
    const cleared = await as.from('profiles').update({ display_name: null }).eq('id', userId)
    expect(cleared.error).toBeNull()
  })
}, 30000)

// **เพดานของฐาน (254) กับของฟอร์ม (60) ต่างกันโดยตั้งใจ** — ข้อนี้ดักไม่ให้ใครยุบ
// สองค่าให้เท่ากัน ซึ่งจะทำให้คนที่สมัครด้วยอีเมลยาวเกิน 60 สมัครไม่ผ่าน เพราะ
// trigger handle_new_user() เติม display_name ด้วยอีเมล (migration 002)
test('อีเมลความยาวระดับที่ trigger อาจเจอ ยังเป็น display_name ได้', async () => {
  await withUser(async (as, userId) => {
    // ยาวกว่าเพดานฟอร์ม (60) แต่ไม่เกินเพดานฐาน — ต้องผ่าน
    const longEmailLike = 'a'.repeat(50) + '@' + 'b'.repeat(40) + '.example.com'
    expect(longEmailLike.length).toBeGreaterThan(60)

    const r = await as.from('profiles').update({ display_name: longEmailLike }).eq('id', userId)
    expect(r.error).toBeNull()
  })
}, 30000)

/** นับความยาวแบบเดียวกับ char_length ของ Postgres (นับอักขระ ไม่ใช่ไบต์) */
function char(v: unknown): number {
  return typeof v === 'string' ? [...v].length : -1
}
