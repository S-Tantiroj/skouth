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

  // body ที่ไม่ใช่ JSON ตอบ 400
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

  // ตรวจทุกอย่างก่อนเขียน · แอดมินเปลี่ยนสถานะตัวเองไม่ได้ (กันล็อกตัวเองออก)
  if (id === session.userId) {
    return NextResponse.json(
      { error: 'เปลี่ยนสถานะบัญชีของตัวเองไม่ได้' },
      { status: 400 }
    )
  }

  const db = getServerClient()

  // อ่านค่าเดิมไว้ใช้ในบันทึกกิจกรรม
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
    // ไม่ส่งข้อความ Postgres ดิบออกไป
    console.error('account status update failed:', error.message)
    return NextResponse.json(
      { error: 'เปลี่ยนสถานะบัญชีไม่สำเร็จ กรุณาลองใหม่' },
      { status: 500 }
    )
  }

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
