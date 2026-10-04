import Link from 'next/link'
import { getServerClient } from '@/lib/supabase/server'
import { getSession, hasRole } from '@/lib/auth/session'
import JobForm from '@/components/JobForm'

export const dynamic = 'force-dynamic'

export default async function JobsPage() {
  const db = getServerClient()
  const session = await getSession()

  // **หน้านี้เคยแสดงฟอร์มสร้างงานให้ทุกคน ทั้งที่ `POST /api/jobs` กั้น `data_manager`**
  // `member` จึงกรอกฟอร์มจนครบแล้วถูกปฏิเสธตอนกดส่ง ซึ่งเป็นการเสียเวลาที่ป้องกันได้
  // **นี่ไม่ใช่การเพิ่มด่านความปลอดภัย** — ด่านจริงอยู่ที่ route และมีเทสต์ครอบอยู่แล้ว
  // อันนี้แค่ไม่ให้หน้าจอเชิญชวนให้ทำสิ่งที่เซิร์ฟเวอร์จะปฏิเสธ
  // (หลักเดียวกับ `isSelf` ของ RoleSelect)
  const canCreate = !!session && hasRole(session.role, 'data_manager')

  const { data: jobs, error } = await db
    .from('jobs')
    .select('id, title, company, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  // "อ่านไม่ได้" กับ "ยังไม่มีงาน" เป็นคนละเรื่อง — รายการว่างเป็นคำตอบที่ผู้ใช้
  // เชื่อทันทีโดยไม่สงสัย จึงห้ามเอามาใช้ตอนระบบพัง
  if (error) console.error('read jobs failed:', error.message)
  const rows = (jobs ?? []) as any[]

  return (
    <main>
      <h1>งาน</h1>
      {canCreate && <JobForm />}

      <div className="section-header"><h2>งานทั้งหมด</h2></div>
      {error ? (
        <p style={{ color: 'var(--bad)' }}>โหลดรายการงานไม่สำเร็จ ลองรีเฟรชอีกครั้ง</p>
      ) : rows.length === 0 ? (
        // **ข้อความต้องเปลี่ยนตามสิทธิ์ด้วย** — "เพิ่มงานด้านบนได้เลย" ชี้ไปที่ฟอร์ม
        // ที่ `member` มองไม่เห็นแล้ว การบอกให้ทำสิ่งที่ทำไม่ได้แย่กว่าไม่บอกอะไรเลย
        <p className="faint">
          {canCreate ? 'ยังไม่มีงาน เพิ่มงานด้านบนได้เลย' : 'ยังไม่มีงานในระบบ'}
        </p>
      ) : (
        <div className="list">
          {rows.map((j: any) => (
            <Link key={j.id} href={`/jobs/${j.id}`} className="list-row" style={{ color: 'inherit' }}>
              <span style={{ fontWeight: 500 }}>{j.title}</span>
              {j.company && <span className="muted">{j.company}</span>}
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
