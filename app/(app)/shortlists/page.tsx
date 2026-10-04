'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase/client'
import { track } from '@/lib/activity/client'
import { SHORTLIST_NAME_MAX, validateListName } from '@/lib/shortlists/saveState'

export default function ShortlistsPage() {
  const db = getBrowserClient()
  const [data, setData] = useState<any[]>([])
  const [newName, setNewName] = useState('')
  const [err, setErr] = useState('')
  // **แยก "อ่านไม่ได้" ออกจาก "ยังไม่มีรายการ"** — เดิม `load` กลืน error แล้วตั้ง
  // รายการเป็นว่าง หน้าจอจึงขึ้น "ยังไม่มี shortlist" ตอนฐานข้อมูลพัง ซึ่งเป็นคำตอบ
  // ที่ผู้ใช้เชื่อทันทีโดยไม่สงสัย (บั๊กเดียวกับ lib/search/query.ts และ dashboard/stats.ts)
  const [loadFailed, setLoadFailed] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data, error } = await db
      .from('shortlists')
      .select('id, name, shortlist_candidates(candidate_id, candidates(id, full_name, headline))')
      .order('created_at')
    if (error) {
      console.error('read shortlists failed:', error.message)
      setLoadFailed(true)
      return
    }
    setLoadFailed(false)
    setData(data ?? [])
  }
  useEffect(() => {
    load()
  }, [])

  const create = async () => {
    // **ด่านฝั่งแอปมีไว้ให้ข้อความที่อ่านรู้เรื่อง** ด่านจริงคือ constraint
    // `shortlists_name_len` (migration 022b) ซึ่งกันคำขอที่ยิงตรงมาด้วย anon key ได้ด้วย
    const check = validateListName(newName)
    if (!check.ok) return setErr(check.reason)
    if (busy) return

    setBusy(true)
    setErr('')
    try {
      const {
        data: { user },
      } = await db.auth.getUser()
      if (!user) {
        setErr('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่')
        return
      }

      // **เดิมบรรทัดนี้ไม่เช็ค `error` เลย** — หลัง migration 022b ชื่อที่ยาวเกิน
      // จะถูกฐานข้อมูลปฏิเสธแล้วหน้าจอ**ไม่มีอะไรเกิดขึ้นเลย** ผู้ใช้กดซ้ำแล้วสรุปว่าเว็บพัง
      const { data: created, error } = await db
        .from('shortlists')
        .insert({ name: check.value, owner_id: user.id })
        .select('id, name')
        .maybeSingle()

      if (error || !created) {
        console.error('create shortlist failed:', error?.message)
        setErr('สร้าง Shortlist ไม่สำเร็จ กรุณาลองใหม่')
        return
      }

      track('shortlist_create', (created as any).name, (created as any).id)
      setNewName('')
      await load()
    } catch {
      setErr('เชื่อมต่อไม่ได้')
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (id: string, current: string) => {
    setErr('')
    setEditing(id)
    setDraft(current)
  }

  const saveName = async (id: string, current: string) => {
    const check = validateListName(draft)
    // **ชื่อว่างย้อนกลับค่าเดิมโดยไม่ยิงคำขอ** — คนที่ลบข้อความหมดแล้วคลิกที่อื่น
    // ไม่ได้ตั้งใจจะลบชื่อ เขาแค่เปลี่ยนใจ การขึ้น error ตรงนั้นคือการดุคนที่ไม่ได้ทำผิด
    if (!check.ok) {
      setEditing(null)
      return
    }
    // ไม่เปลี่ยนก็ไม่ต้องยิง — ทุกการคลิกออกจากช่องจะกลายเป็นคำขอโดยไม่จำเป็น
    if (check.value === current) {
      setEditing(null)
      return
    }

    setBusy(true)
    setErr('')
    try {
      const { error } = await db.from('shortlists').update({ name: check.value }).eq('id', id)
      if (error) {
        console.error('rename shortlist failed:', error.message)
        setErr('เปลี่ยนชื่อไม่สำเร็จ กรุณาลองใหม่')
        return
      }
      setEditing(null)
      await load()
    } catch {
      setErr('เชื่อมต่อไม่ได้')
    } finally {
      setBusy(false)
    }
  }

  const removeList = async (id: string, name: string, count: number) => {
    // **บอกจำนวนผู้สมัครในคำถาม** — "ลบ Shortlist นี้?" ไม่ได้บอกว่ากำลังจะเสียอะไร
    // รายการที่สะสมคนไว้ 30 คนกับรายการเปล่าดูเหมือนกันหมดถ้าไม่บอก
    const detail = count > 0 ? `\n\nผู้สมัคร ${count} คนในรายการนี้จะถูกเอาออกด้วย` : ''
    if (!confirm(`ลบ Shortlist "${name}"?${detail}\n\nกู้คืนไม่ได้`)) return

    setBusy(true)
    setErr('')
    try {
      // `shortlist_candidates` หายตาม `on delete cascade` ของ migration 001
      // ไม่ต้องลบเอง (หลักเดียวกับ resume_assessments ของ self_profiles)
      const { error } = await db.from('shortlists').delete().eq('id', id)
      if (error) {
        console.error('delete shortlist failed:', error.message)
        setErr('ลบไม่สำเร็จ กรุณาลองใหม่')
        return
      }
      await load()
    } catch {
      setErr('เชื่อมต่อไม่ได้')
    } finally {
      setBusy(false)
    }
  }

  const removeCandidate = async (shortlistId: string, candidateId: string, who: string, listName: string) => {
    setErr('')
    const { error } = await db
      .from('shortlist_candidates')
      .delete()
      .eq('shortlist_id', shortlistId)
      .eq('candidate_id', candidateId)
    if (error) {
      console.error('remove from shortlist failed:', error.message)
      return setErr('เอาผู้สมัครออกไม่สำเร็จ กรุณาลองใหม่')
    }
    track('shortlist_remove', `${who} ✕ ${listName}`, shortlistId)
    load()
  }

  return (
    <main>
      <h1>Shortlists</h1>
      <div className="row" style={{ margin: '12px 0' }}>
        <input
          className="input"
          style={{ maxWidth: 320 }}
          value={newName}
          maxLength={SHORTLIST_NAME_MAX}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
          placeholder="ชื่อ shortlist ใหม่"
        />
        <button className="btn btn-primary" onClick={create} disabled={busy}>
          สร้าง
        </button>
      </div>

      {err && <p style={{ color: 'var(--bad)' }} role="alert">{err}</p>}

      {loadFailed ? (
        <p style={{ color: 'var(--bad)' }}>โหลดรายการไม่สำเร็จ ลองรีเฟรชอีกครั้ง</p>
      ) : (
        <>
          {data.length === 0 && <p className="faint">ยังไม่มี shortlist</p>}
          <div className="stack" style={{ gap: 12 }}>
            {data.map((sl) => {
              const members = sl.shortlist_candidates ?? []
              return (
                <div key={sl.id} id={sl.id} className="card shortlist-card" style={{ gap: 8 }}>
                  <div className="row">
                    {editing === sl.id ? (
                      <input
                        className="input"
                        autoFocus
                        value={draft}
                        maxLength={SHORTLIST_NAME_MAX}
                        disabled={busy}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => saveName(sl.id, sl.name)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveName(sl.id, sl.name)
                          // Escape ต้องยกเลิกโดยไม่บันทึก — ไม่งั้นคนที่เปลี่ยนใจกลางคัน
                          // ไม่มีทางออกจากช่องโดยไม่ทิ้งค่าที่พิมพ์ค้างไว้
                          if (e.key === 'Escape') setEditing(null)
                        }}
                        style={{ maxWidth: 320 }}
                      />
                    ) : (
                      /* **ไอคอนปากกาคือสิ่งที่บอกว่าแก้ชื่อได้** — เดิมมีแต่ `cursor: pointer`
                         กับ `title` ซึ่งเห็นได้ต่อเมื่อเอาเมาส์ไปวางค้างไว้ก่อน
                         คนที่ไม่รู้ว่ามีฟีเจอร์นี้จึงไม่มีทางรู้ว่าต้องเอาเมาส์ไปวางตรงไหน
                         และบนจอสัมผัสไม่มี hover เลย · ยังคลิกที่ชื่อได้เหมือนเดิม
                         ไอคอนเป็นป้ายบอก ไม่ใช่ทางเดียวที่เข้าถึงได้ */
                      <>
                        <h3
                          style={{ margin: 0, cursor: 'pointer' }}
                          onClick={() => startEdit(sl.id, sl.name)}
                        >
                          {sl.name}
                        </h3>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: 4, lineHeight: 0, color: 'var(--text-faint)' }}
                          aria-label={`เปลี่ยนชื่อ ${sl.name}`}
                          title="เปลี่ยนชื่อ"
                          onClick={() => startEdit(sl.id, sl.name)}
                        >
                          <Pencil size={15} />
                        </button>
                      </>
                    )}
                    <span className="faint" style={{ fontSize: 13 }}>
                      {members.length} คน
                    </span>
                    <button
                      className="btn btn-ghost"
                      style={{ marginLeft: 'auto', color: 'var(--bad)' }}
                      disabled={busy}
                      onClick={() => removeList(sl.id, sl.name, members.length)}
                    >
                      ลบรายการ
                    </button>
                  </div>

                  <div className="stack" style={{ gap: 4 }}>
                    {members.map((sc: any) => (
                      <div key={sc.candidate_id} className="row">
                        <Link href={`/candidates/${sc.candidates?.id}`} style={{ fontWeight: 500 }}>
                          {sc.candidates?.full_name}
                        </Link>
                        <span className="muted">{sc.candidates?.headline}</span>
                        <button
                          className="btn btn-ghost"
                          style={{ marginLeft: 'auto' }}
                          onClick={() =>
                            removeCandidate(
                              sl.id,
                              sc.candidate_id,
                              sc.candidates?.full_name ?? 'ผู้สมัคร',
                              sl.name
                            )
                          }
                        >
                          เอาออก
                        </button>
                      </div>
                    ))}
                    {members.length === 0 && (
                      <span className="faint">ยังไม่มีผู้สมัครในกลุ่มนี้</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </main>
  )
}
