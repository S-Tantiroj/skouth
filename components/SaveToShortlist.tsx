'use client'
import { useEffect, useRef, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase/client'
import { track } from '@/lib/activity/client'
import {
  applyToggle,
  isSaved,
  planToggle,
  SHORTLIST_NAME_MAX,
  validateListName,
} from '@/lib/shortlists/saveState'

export type Shortlist = { id: string; name: string }

/**
 * ปุ่มบันทึกเข้า Shortlist แบบติ๊กเพิ่มติ๊กออก (รูปแบบเดียวกับปุ่ม "บันทึก" ของ YouTube)
 *
 * **คอมโพเนนต์นี้ไม่ดึงข้อมูลเอง** — `lists` และ `memberOf` มาจากผู้เรียก เพราะมันถูกวาง
 * ในแถวผลการค้นหาได้หลายสิบแถวพร้อมกัน ถ้าแต่ละตัวดึงเอง หน้าหนึ่งจะยิงคำขอหลายสิบครั้ง
 * ซ้ำกันทั้งหมด ผู้เรียกดึงทีเดียวแล้วแจกจ่ายแทน (ตัวเดิม `AddToShortlist` ดึงเองใน
 * `useEffect` ซึ่งใช้ได้เพราะมันอยู่หน้าละตัวเดียว)
 *
 * **ไม่เปลี่ยนหน้าจอก่อนคำขอสำเร็จ** — `applyToggle` ถูกเรียกหลัง `error` เป็น null
 * เท่านั้น บั๊กที่ `RoleSelect` เคยมีคือเปลี่ยนก่อนแล้วไม่ย้อนกลับเมื่อล้มเหลว
 * ผู้ใช้เห็นติ๊กถูกค้างไว้ทั้งที่ฐานข้อมูลไม่มีแถวนั้น
 */
export default function SaveToShortlist({
  candidateId,
  candidateName,
  lists,
  memberOf,
  onChange,
}: {
  candidateId: string
  candidateName?: string
  lists: Shortlist[]
  /** id ของ Shortlist ที่ผู้สมัครคนนี้อยู่ */
  memberOf: string[]
  /** ให้ผู้เรียกดึงข้อมูลใหม่ — ไม่บังคับ เพราะบางหน้าไม่ต้องรู้ */
  onChange?: () => void
}) {
  const db = getBrowserClient()
  const [open, setOpen] = useState(false)
  const [member, setMember] = useState<string[]>(memberOf)
  const [all, setAll] = useState<Shortlist[]>(lists)
  const [busy, setBusy] = useState<string[]>([])
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  // prop เปลี่ยนเมื่อผู้เรียกดึงข้อมูลใหม่ — ต้องตามไปด้วย ไม่งั้นค่าในหน้าจอจะค้าง
  // ที่ค่าตอนเปิดหน้าแล้วต่างจากฐานข้อมูลโดยไม่มีอะไรบอก
  useEffect(() => setMember(memberOf), [memberOf])
  useEffect(() => setAll(lists), [lists])

  // ปิดแผงเมื่อคลิกข้างนอก — แผงที่ค้างอยู่จะทับแถวอื่นในรายการผลการค้นหา
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const toggle = async (listId: string) => {
    const plan = planToggle(member, busy, listId)
    if (!plan) return

    setBusy((b) => [...b, listId])
    setMsg('')
    try {
      // upsert แทน insert: กดซ้ำแล้วไม่เกิด error คีย์ซ้ำ
      const { error } =
        plan.kind === 'add'
          ? await db
              .from('shortlist_candidates')
              .upsert({ shortlist_id: listId, candidate_id: candidateId })
          : await db
              .from('shortlist_candidates')
              .delete()
              .eq('shortlist_id', listId)
              .eq('candidate_id', candidateId)

      if (error) {
        // ไม่ส่งข้อความ Postgres ดิบให้ผู้ใช้
        console.error('shortlist toggle failed:', error.message)
        setMsg(plan.kind === 'add' ? 'บันทึกไม่สำเร็จ' : 'เอาออกไม่สำเร็จ')
        return
      }

      setMember((m) => applyToggle(m, listId, plan.kind))
      const listName = all.find((l) => l.id === listId)?.name ?? 'shortlist'
      track(
        plan.kind === 'add' ? 'shortlist_add' : 'shortlist_remove',
        `${candidateName ?? 'ผู้สมัคร'} ${plan.kind === 'add' ? '→' : '✕'} ${listName}`,
        listId
      )
      onChange?.()
    } catch {
      setMsg('เชื่อมต่อไม่ได้')
    } finally {
      setBusy((b) => b.filter((x) => x !== listId))
    }
  }

  const create = async () => {
    const check = validateListName(newName)
    if (!check.ok) return setMsg(check.reason)
    if (creating) return

    setCreating(true)
    setMsg('')
    try {
      const {
        data: { user },
      } = await db.auth.getUser()
      if (!user) {
        setMsg('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่')
        return
      }

      const { data, error } = await db
        .from('shortlists')
        .insert({ name: check.value, owner_id: user.id })
        .select('id, name')
        .maybeSingle()

      if (error || !data) {
        console.error('shortlist create failed:', error?.message)
        setMsg('สร้าง Shortlist ไม่สำเร็จ')
        return
      }

      const created = data as unknown as Shortlist
      setAll((a) => [...a, created])
      setNewName('')
      track('shortlist_create', created.name, created.id)

      // **สร้างแล้วใส่ผู้สมัครเข้าไปทันที** — คนกดปุ่มนี้กำลังจะบันทึกคนนี้อยู่แล้ว
      // การสร้างรายการเปล่าแล้วให้ไปติ๊กเองอีกทีคือขั้นตอนที่ไม่มีใครต้องการ
      const { error: addErr } = await db
        .from('shortlist_candidates')
        .upsert({ shortlist_id: created.id, candidate_id: candidateId })

      if (addErr) {
        // รายการถูกสร้างแล้วจริง บอกว่า "ล้มเหลว" ทั้งหมดจะผิด — แยกสองเรื่องให้ชัด
        console.error('shortlist create+add failed:', addErr.message)
        setMsg('สร้างรายการแล้ว แต่เพิ่มผู้สมัครไม่สำเร็จ ลองติ๊กอีกครั้ง')
        return
      }

      setMember((m) => applyToggle(m, created.id, 'add'))
      track('shortlist_add', `${candidateName ?? 'ผู้สมัคร'} → ${created.name}`, created.id)
      onChange?.()
    } catch {
      setMsg('เชื่อมต่อไม่ได้')
    } finally {
      setCreating(false)
    }
  }

  const saved = isSaved(member)

  return (
    <div ref={boxRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className={saved ? 'btn btn-primary' : 'btn'}
        onClick={(e) => {
          // แถวผลการค้นหาถูกครอบด้วย <Link> — ถ้าไม่หยุดการกระจาย การกดปุ่มนี้
          // จะเด้งไปหน้ารายละเอียดแทนที่จะเปิดแผง
          e.preventDefault()
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        aria-expanded={open}
      >
        {saved ? '✓ บันทึกแล้ว' : 'บันทึก'}
      </button>

      {open && (
        <div
          className="card stack"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            zIndex: 20,
            width: 260,
            boxShadow: '0 6px 24px rgba(0,0,0,.12)',
          }}
        >
          <div style={{ fontWeight: 500, fontSize: 14 }}>บันทึกเข้า Shortlist</div>

          {all.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              ยังไม่มี Shortlist — ตั้งชื่อด้านล่างเพื่อสร้างอันแรก
            </p>
          ) : (
            <div className="stack" style={{ maxHeight: 220, overflowY: 'auto', gap: 4 }}>
              {all.map((l) => (
                <label
                  key={l.id}
                  className="row"
                  style={{ fontSize: 14, cursor: busy.includes(l.id) ? 'default' : 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={member.includes(l.id)}
                    disabled={busy.includes(l.id)}
                    onChange={() => toggle(l.id)}
                  />
                  <span style={{ flex: 1, wordBreak: 'break-word' }}>{l.name}</span>
                </label>
              ))}
            </div>
          )}

          <div className="row">
            <input
              className="input"
              value={newName}
              maxLength={SHORTLIST_NAME_MAX}
              placeholder="สร้างรายการใหม่"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
            />
            <button className="btn" disabled={creating} onClick={create}>
              สร้าง
            </button>
          </div>

          {msg && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--bad)' }}>{msg}</p>
          )}
        </div>
      )}
    </div>
  )
}
