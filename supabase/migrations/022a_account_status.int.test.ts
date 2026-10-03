import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { getServerClient } from '@/lib/supabase/server'

// พิสูจน์ว่าสถานะบัญชีทำงานที่ชั้นฐานข้อมูลจริง — ไม่ใช่แค่ว่าคำสั่ง alter รันผ่าน
//
// สองเรื่องที่ต้องจริงพร้อมกัน:
//   1. บัญชีใหม่ติดคิวเองโดยไม่ต้องแก้ trigger handle_new_user()
//   2. เจ้าของบัญชีอนุมัติตัวเองผ่าน anon key ไม่ได้
//
// ข้อสองเดินเส้นทางเดียวกับผู้โจมตีจริงทุกขั้น เหมือน 019_lock_profile_columns —
// ล็อกอินด้วย anon key ซึ่งเป็นค่าสาธารณะที่อยู่ใน bundle ของเบราว์เซอร์ แล้วยิง
// PATCH ตรงไปที่ PostgREST โดยไม่ผ่านหน้าจอหรือ API route ของแอปเลย
// เทสต์ที่ตรวจแค่ว่า "/admin/users ไม่มีช่องให้แก้ status" จะเขียวได้ทั้งที่ช่องโหว่เปิดอยู่
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

test('บัญชีที่สร้างใหม่ได้ status pending โดยไม่ต้องแก้ trigger', async () => {
  const admin = getServerClient()
  const email = `__test__status_${Date.now()}@example.com`
  const password = `Pw_${Math.random().toString(36).slice(2)}A1!`

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  expect(createErr).toBeNull()
  const userId = created!.user!.id

  try {
    const { data: row } = await admin
      .from('profiles')
      .select('role, status')
      .eq('id', userId)
      .maybeSingle()

    // trigger ใส่แค่ (id, display_name, role) — status มาจาก default ของคอลัมน์
    expect((row as any)?.role).toBe('member')
    expect((row as any)?.status).toBe('pending')
  } finally {
    await admin.auth.admin.deleteUser(userId)
  }
}, 30000)

test('ผู้ใช้ที่ล็อกอินแล้วอนุมัติตัวเองไม่ได้', async () => {
  const admin = getServerClient()
  const email = `__test__status_self_${Date.now()}@example.com`
  const password = `Pw_${Math.random().toString(36).slice(2)}A1!`

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  expect(createErr).toBeNull()
  const userId = created!.user!.id

  try {
    const asUser = createClient(URL, ANON)
    const { error: signInErr } = await asUser.auth.signInWithPassword({ email, password })
    expect(signInErr).toBeNull()

    // ---- การโจมตี ----
    // RLS ผ่าน (เป็นแถวของตัวเอง) แต่ไม่มี column-level grant บน status
    const { error: escalateErr } = await asUser
      .from('profiles')
      .update({ status: 'approved' })
      .eq('id', userId)
    expect(escalateErr).not.toBeNull()

    // **ยืนยันที่ฐานข้อมูลด้วย ไม่เชื่อค่า error อย่างเดียว** — ถ้าวันหนึ่ง PostgREST
    // เปลี่ยนไปคืน error เป็น null เมื่อไม่มีแถวถูกแตะ การเช็คแค่ error จะกลายเป็น
    // เทสต์ที่เขียวโดยไม่ได้ตรวจอะไร
    const { data: after } = await admin
      .from('profiles')
      .select('status')
      .eq('id', userId)
      .maybeSingle()
    expect((after as any)?.status).toBe('pending')

    // ---- เส้นทางที่ต้องยังใช้ได้ ----
    // ถ้าถอนสิทธิ์แรงเกินไปจนแก้ชื่อไม่ได้ หน้า /settings จะพังโดยไม่มีใครรู้
    const { error: nameErr } = await asUser
      .from('profiles')
      .update({ display_name: '__test__ ชื่อใหม่' })
      .eq('id', userId)
    expect(nameErr).toBeNull()

    await asUser.auth.signOut()
  } finally {
    await admin.auth.admin.deleteUser(userId)
  }
}, 30000)

test('คอลัมน์ note ถูกลบออกจาก shortlist_candidates แล้ว', async () => {
  const admin = getServerClient()

  // เลือก note ต้องล้มเหลวเพราะคอลัมน์ไม่มีอยู่ — ไม่ใช่คืนค่า null
  const { error } = await admin.from('shortlist_candidates').select('note').limit(1)

  expect(error).not.toBeNull()
  expect(error!.message.toLowerCase()).toContain('note')
}, 30000)
