import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import { getSession, hasRole } from '@/lib/auth/session'
import { identityName } from '@/lib/auth/identity'
import { logActivity } from '@/lib/activity/log'

// POST /api/admin/users/[id]/status  body: { status: 'approved' | 'rejected' }
//
// แอดมินเท่านั้น ใช้ service-role client ซึ่ง bypass RLS ได้ — ปลอดภัยเพราะด่านอยู่ที่
// role ของผู้เรียก **และนี่เป็นทางเดียวในแอปที่เปลี่ยน `profiles.status` ได้**
// migration 019/022a ไม่ได้ให้สิทธิ์ UPDATE คอลัมน์นี้แก่ anon/authenticated โดยตั้งใจ
// ผู้ใช้จึงอนุมัติตัวเองผ่าน PostgREST ด้วย anon key ที่เป็นค่าสาธารณะไม่ได้

// **`pending` ไม่อยู่ในรายการ** — แอดมินตัดสินได้สองทางคือรับหรือไม่รับ
// การย้อนกลับไป "รอ" ไม่มีความหมายในกระบวนการนี้ และจะทำให้คิวมีแถวที่เคยถูก
// ตัดสินไปแล้วปนกับแถวที่ยังไม่เคยมีใครดู ซึ่งทำให้ผู้ดูแลตัดสินซ้ำโดยไม่รู้ตัว
const ALLOWED = ['approved', 'rejected'] as const
type Allowed = (typeof ALLOWED)[number]

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !hasRole(session.role, 'admin')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await ctx.params

  // body ที่ไม่ใช่ JSON ต้องได้ 400 ไม่ใช่ 500 ที่อธิบายไม่ได้ — POST /api/jobs
  // เดิมไม่มี try/catch เลยและเจอปัญหาแบบเดียวกัน
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 })
  }

  const status = (body as { status?: unknown })?.status
  if (typeof status !== 'string' || !(ALLOWED as readonly string[]).includes(status)) {
    return NextResponse.json({ error: 'สถานะไม่ถูกต้อง' }, { status: 400 })
  }

  // **ตรวจทุกอย่างก่อนแตะฐานข้อมูล** — ประตูที่อยู่หลังการเขียนคืนสถานะถูก
  // แต่ข้อมูลเปลี่ยนไปแล้วจริง
  //
  // **กันการล็อกตัวเองออก** หลักเดียวกับ `lib/auth/roleChange.ts` — endpoint นี้เป็น
  // ทางเดียวในแอปที่เปลี่ยนสถานะได้ แอดมินที่ปฏิเสธตัวเองจะเข้าระบบไม่ได้อีก และถ้า
  // เป็นแอดมินคนเดียวจะไม่เหลือใครกู้ให้ ต้องไปแก้ที่ Supabase SQL editor
  // ห้ามแม้แต่การอนุมัติตัวเอง เพราะแอดมินที่ผ่าน `getSession()` มาถึงบรรทัดนี้ได้
  // ย่อมเป็น `approved` อยู่แล้ว คำขอนั้นจึงไม่มีเหตุผลที่ถูกต้องสักกรณี
  //
  // **ข้อจำกัดที่บันทึกไว้ตรงๆ:** กฎนี้ไม่รับประกันว่าจะเหลือแอดมินที่ใช้งานได้เสมอ
  // แอดมินสองคนที่ปฏิเสธกันและกันพร้อมกันจะผ่านทั้งคู่ — กันเฉพาะความผิดพลาด
  // คลิกเดียวที่เกิดจริงได้ง่ายที่สุด แทนการอ้างว่าปิดสนิท
  if (id === session.userId) {
    return NextResponse.json(
      { error: 'เปลี่ยนสถานะบัญชีของตัวเองไม่ได้' },
      { status: 400 }
    )
  }

  const db = getServerClient()

  // อ่านค่าเดิมไว้ก่อน เพื่อให้บันทึกกิจกรรมอ่านรู้เรื่องแม้ผู้ใช้คนนั้นถูกลบทีหลัง
  // (หลักการเดียวกับ summary ของการเปลี่ยน role — ไม่ join กลับทีหลัง)
  const { data: before } = await db
    .from('profiles')
    .select('display_name, email, status')
    .eq('id', id)
    .maybeSingle()

  const { error } = await db
    .from('profiles')
    .update({ status: status as Allowed })
    .eq('id', id)

  if (error) {
    // ห้ามส่งข้อความ Postgres ดิบออกไป — บอกชื่อตาราง ชื่อคอลัมน์ และบางครั้งค่าในแถว
    // ฝั่งเซิร์ฟเวอร์ยังเก็บข้อความเต็มไว้เหมือนเดิม
    console.error('account status update failed:', error.message)
    return NextResponse.json(
      { error: 'เปลี่ยนสถานะบัญชีไม่สำเร็จ กรุณาลองใหม่' },
      { status: 500 }
    )
  }

  // บันทึก **หลัง** เขียนสำเร็จ — บันทึกว่าทำสำเร็จทั้งที่ล้มเหลวแย่กว่าไม่มีบันทึก
  // เพราะมันทำให้หลักฐานโกหก · `logActivity` กลืน error เองอยู่แล้ว การบันทึกล้ม
  // จึงไม่ทำให้คำขอที่สำเร็จแล้วกลายเป็นล้มเหลว
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
