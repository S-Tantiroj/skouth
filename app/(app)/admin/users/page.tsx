import { redirect } from 'next/navigation'
import { getSession, hasRole } from '@/lib/auth/session'
import { identityName, identitySecondary } from '@/lib/auth/identity'
import { getServerClient } from '@/lib/supabase/server'
import RoleSelect from '@/components/RoleSelect'
import AccountStatusActions from '@/components/AccountStatusActions'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  pending: 'รออนุมัติ',
  approved: 'ใช้งานได้',
  rejected: 'ถูกปฏิเสธ',
}

// **ค่าที่ไม่รู้จักคืนค่าดิบ ไม่ยุบเป็น "อื่นๆ"** — หลักเดียวกับ `sourceLabel` ของกราฟ
// บน Dashboard ถ้าวันหนึ่งมีคนเพิ่มค่าเข้า enum แล้วลืมเติมป้าย สถานะใหม่ต้องยังเห็นได้
// การซ่อนมันคือการทำให้แอดมินเข้าใจผิดว่าบัญชีนั้นอยู่ในสถานะที่ตัวเองรู้จัก
const statusLabel = (s: string) => STATUS_LABELS[s] ?? s

const statusColor = (s: string) =>
  s === 'approved' ? 'var(--ok)' : s === 'rejected' ? 'var(--bad)' : 'var(--muted)'

export default async function AdminUsers() {
  const session = await getSession()
  if (!session || !hasRole(session.role, 'admin')) redirect('/dashboard')

  // **ต้องดึง email มาด้วย** — display_name เป็นค่าที่ผู้ใช้ตั้งเองได้ (migration 021)
  // ถ้าแสดงแค่ชื่อ ผู้ใช้ที่เปลี่ยนชื่อเป็น "ตั้ม" จะทำให้แอดมินไม่รู้ว่ากำลังแก้สิทธิ์ของใคร
  // เหลือแต่ uuid ให้เดา ซึ่งเป็นหน้าที่ให้สิทธิ์ระดับ admin ได้ จึงต้องระบุตัวได้แน่นอน
  const { data: users, error } = await getServerClient()
    .from('profiles')
    .select('id, display_name, email, role, status, created_at')
    .order('created_at')

  const rows = (users ?? []) as any[]
  const pending = rows.filter((u) => u.status === 'pending')

  return (
    <main>
      <h1>จัดการผู้ใช้</h1>
      {error ? (
        // "อ่านไม่ได้" กับ "ไม่มีผู้ใช้" เป็นคนละเรื่อง — รายการว่างบนหน้าที่ควรมี
        // อย่างน้อยตัวแอดมินเองเสมอ คือสัญญาณว่าพัง ไม่ใช่ข้อมูลจริง
        <p style={{ color: 'var(--bad)' }}>โหลดรายชื่อผู้ใช้ไม่สำเร็จ ลองรีเฟรชอีกครั้ง</p>
      ) : (
        <>
          {/* **คิวว่างไม่แสดงอะไรเลย** — หัวข้อที่อยู่ตลอดเวลาพร้อมข้อความ "ไม่มีรายการ"
              จะกลายเป็นสิ่งที่ตาข้ามไปทุกครั้ง แล้ววันที่มีคนรออยู่จริงก็จะถูกข้ามด้วย
              หลักเดียวกับสัญญาณแดงที่ดังทุกคืนจนไม่มีใครอ่าน */}
          {pending.length > 0 && (
            <section className="card stack" style={{ marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>
                บัญชีรออนุมัติ ({pending.length})
              </h2>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                บัญชีเหล่านี้ยืนยันอีเมลแล้วแต่ยังเข้าใช้งานไม่ได้จนกว่าจะได้รับอนุมัติ
              </p>
              <div className="list">
                {pending.map((u) => {
                  const secondary = identitySecondary(u)
                  const name = identityName(u, u.id)
                  return (
                    <div key={u.id} className="list-row">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{name}</div>
                        {secondary && (
                          <div className="muted" style={{ fontSize: 12 }}>
                            {secondary}
                          </div>
                        )}
                        {/* **ใช้รูปแบบ ปปปป-ดด-วว ไม่ใช่รูปแบบตาม locale** — เครื่อง
                            ภาษาอังกฤษจะแสดง MM/DD/YYYY ที่คนไทยอ่านสลับกับ DD/MM/YYYY
                            ได้ง่าย เป็นบทเรียนเดียวกับที่ `lib/self/monthYear.ts` บันทึกไว้ */}
                        <div className="faint" style={{ fontSize: 12 }}>
                          สมัครเมื่อ {String(u.created_at ?? '').slice(0, 10)}
                        </div>
                      </div>
                      <AccountStatusActions userId={u.id} status={u.status} label={name} />
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <div className="list">
            {rows.map((u) => {
              const secondary = identitySecondary(u)
              const name = identityName(u, u.id)
              return (
                <div key={u.id} className="list-row">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{name}</div>
                    {secondary && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {secondary}
                      </div>
                    )}
                    {/* แถวที่มีสวิตช์ไม่ต้องมีป้ายนี้ เพราะสวิตช์มีป้ายของตัวเองอยู่ข้างๆ
                        แล้ว — สถานะเดียวกันสองที่ทำให้คนไม่รู้ว่าอันไหนคือของจริงเวลา
                        มันไม่ตรงกัน · เหลือไว้เฉพาะแถวในคิวซึ่งไม่มีสวิตช์
                        (ปุ่มของมันอยู่ในกล่องด้านบน) */}
                    {u.status !== 'approved' && u.status !== 'rejected' && (
                      <div style={{ fontSize: 12, color: statusColor(u.status) }}>
                        {statusLabel(u.status)}
                      </div>
                    )}
                  </div>
                  <span className="row" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {/* แถวในคิวไม่ต้องมีปุ่มซ้ำ เพราะกล่องด้านบนมีอยู่แล้ว และแถวของ
                        ตัวเองไม่มีปุ่มเพราะเซิร์ฟเวอร์ปฏิเสธอยู่แล้ว — ไม่ให้เสียเที่ยว
                        หลักเดียวกับ isSelf ของ RoleSelect */}
                    {u.status !== 'pending' && u.id !== session.userId && (
                      <AccountStatusActions userId={u.id} status={u.status} label={name} />
                    )}
                    <RoleSelect userId={u.id} role={u.role} isSelf={u.id === session.userId} />
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </main>
  )
}
