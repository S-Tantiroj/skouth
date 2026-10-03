import { getServerClient } from '@/lib/supabase/server'
import { getSession, hasRole } from '@/lib/auth/session'
import Timeline from '@/components/Timeline'
import AnalyzePanel from '@/components/AnalyzePanel'
import SaveToShortlist from '@/components/SaveToShortlist'
import SuppressButton from '@/components/SuppressButton'
import { logActivity } from '@/lib/activity/log'

export const dynamic = 'force-dynamic'

const initials = (name: string) =>
  name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getServerClient()

  const session = await getSession()
  const canSuppress = !!session && hasRole(session.role, 'data_manager')

  const { data: c } = await db
    .from('candidates')
    .select('*, education(*), experience(*), candidate_skills(skills(name))')
    .eq('id', id)
    .single()

  if (!c) return <main><p className="faint">ไม่พบผู้สมัคร</p></main>

  // บันทึกการเปิดดูเพื่อให้ dashboard แสดง "ผู้สมัครที่เพิ่งดู"
  // ไม่ await เพราะเป็นผลพลอยได้ — ไม่ควรหน่วงการแสดงหน้า และ logActivity
  // กลืน error ไว้เองอยู่แล้ว
  if (session) {
    void logActivity({
      actorId: session.userId,
      action: 'view',
      entityType: 'candidate',
      entityId: id,
      summary: (c as any).full_name,
      metadata: { headline: (c as any).headline ?? null },
    })
  }

  const skills: string[] = (c as any).candidate_skills?.map((x: any) => x.skills?.name).filter(Boolean) ?? []

  // **`.eq('owner_id', ...)` คือการควบคุมการเข้าถึง ไม่ใช่การกรองเพื่อความสวยงาม**
  // หน้านี้ใช้ `getServerClient()` ซึ่งเป็น service-role และ **bypass RLS**
  // ตัวเดิม `AddToShortlist` ดึงเองด้วย anon key ที่ RLS กรองเจ้าของให้อัตโนมัติ
  // การย้ายมาดึงฝั่งเซิร์ฟเวอร์จึงถอดด่านนั้นออกโดยไม่มีอะไรเตือน —
  // **ลืมบรรทัดนี้แล้วทุกคนจะเห็น Shortlist ของคนอื่นทั้งระบบ**
  // (หลักเดียวกับที่ route ของ `self_profiles` บันทึกไว้)
  let myLists: { id: string; name: string }[] = []
  let memberOf: string[] = []
  if (session) {
    const { data: ls, error: lsErr } = await db
      .from('shortlists')
      .select('id, name')
      .eq('owner_id', session.userId)
      .order('created_at')
    if (lsErr) console.error('read shortlists failed:', lsErr.message)
    myLists = (ls ?? []) as any[]

    if (myLists.length > 0) {
      // **ต้องจำกัดด้วย `.in()` ด้วย** — `shortlist_candidates` ไม่มีคอลัมน์เจ้าของ
      // มีแต่ `shortlist_id` การกรองด้วย candidate_id อย่างเดียวจะคืนแถวของทุกคน
      const { data: links, error: linkErr } = await db
        .from('shortlist_candidates')
        .select('shortlist_id')
        .eq('candidate_id', id)
        .in('shortlist_id', myLists.map((l) => l.id))
      if (linkErr) console.error('read shortlist links failed:', linkErr.message)
      memberOf = (links ?? []).map((l: any) => l.shortlist_id)
    }
  }

  return (
    <main>
      <div className="card">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <span className="avatar" style={{ width: 44, height: 44 }}>{initials((c as any).full_name)}</span>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0 }}>{(c as any).full_name}</h1>
            <p className="muted" style={{ margin: '2px 0' }}>{(c as any).headline}</p>
            {(c as any).location && <p className="faint" style={{ margin: 0, fontSize: 13 }}>{(c as any).location}</p>}
          </div>
          {/* ปุ่มบันทึกอยู่กับการกระทำอื่นของผู้สมัครคนนี้ ไม่ใช่การ์ดแยกท้ายหน้า
              แบบเดิม — คนที่อ่านโปรไฟล์แล้วตัดสินใจว่าสนใจ จะกดทันทีตรงนั้น
              ไม่ใช่เลื่อนลงไปหาแบบฟอร์มที่ท้ายหน้า
              **ไม่ส่ง `onChange`** เพราะหน้านี้เป็น server component ส่งฟังก์ชัน
              ข้ามไปให้ client component ไม่ได้ — คอมโพเนนต์จัดการ state ของตัวเองอยู่แล้ว */}
          <SaveToShortlist
            candidateId={id}
            candidateName={(c as any).full_name}
            lists={myLists}
            memberOf={memberOf}
          />
          {(c as any).linkedin_url && (
            <a href={(c as any).linkedin_url} target="_blank" rel="noreferrer" className="btn">LinkedIn ↗</a>
          )}
        </div>
        {(c as any).summary && <p style={{ marginTop: 12 }}>{(c as any).summary}</p>}
        {skills.length > 0 && (
          <div className="row" style={{ flexWrap: 'wrap', marginTop: 12 }}>
            {skills.map((s) => <span key={s} className="chip">{s}</span>)}
          </div>
        )}
      </div>

      <div className="section-header"><h2>ไทม์ไลน์</h2></div>
      <div className="card">
        <Timeline edu={(c as any).education} exp={(c as any).experience} />
      </div>

      <AnalyzePanel candidateId={id} />

      {canSuppress && (
        <>
          <div className="section-header"><h2>จัดการข้อมูล</h2></div>
          <div className="card">
            <p className="faint" style={{ fontSize: 13, marginTop: 0 }}>
              ใช้เมื่อเจ้าของข้อมูลขอให้ลบ ระบบจะจำไว้และไม่นำเข้าคนนี้อีก
            </p>
            <SuppressButton candidateId={id} fullName={(c as any).full_name} />
          </div>
        </>
      )}
    </main>
  )
}
