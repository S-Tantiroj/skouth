'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Next = 'approved' | 'rejected'

/**
 * ควบคุมสถานะบัญชี — รูปร่างขึ้นกับสถานะปัจจุบัน
 *
 * **บัญชีที่ยังไม่เคยถูกตัดสิน (`pending`) ได้สองปุ่ม ไม่ใช่สวิตช์** เพราะสวิตช์ต้องมี
 * ตำแหน่งปัจจุบันเสมอ จะวางไว้ข้างไหนก็เป็นการบอกว่าบัญชีนี้ "เป็น" อย่างนั้นอยู่แล้ว
 * ทั้งที่ยังไม่มีใครตัดสิน — **สวิตช์ที่ปิดอยู่อ่านได้ว่า "ถูกปฏิเสธ"** ซึ่งเป็นคนละเรื่อง
 * กับ "ยังไม่ได้ดู" และผู้ดูแลจะข้ามคิวไปโดยคิดว่าจัดการไปแล้ว
 *
 * **บัญชีที่ตัดสินไปแล้วได้สวิตช์** เขียว = ใช้งานได้ · แดง = ถูกปฏิเสธ
 *
 * **ตามบทเรียนของ `RoleSelect`** — ไม่เก็บ state ของสถานะไว้เองเลย สวิตช์อ่านจาก prop
 * ที่เซิร์ฟเวอร์ส่งมา แล้วใช้ `router.refresh()` หลังสำเร็จ หน้าจอจึงไม่มีทางแสดงค่า
 * ที่ต่างจากฐานข้อมูล ซึ่งเป็นความผิดพลาดที่ `RoleSelect` เคยทำ (เลื่อนก่อนแล้วไม่ย้อนกลับ)
 */
export default function AccountStatusActions({
  userId,
  status,
  label,
}: {
  userId: string
  /** สถานะปัจจุบันจากฐานข้อมูล */
  status: string
  /** ชื่อที่ผ่าน `identityName` แล้ว — ใช้ในคำถามยืนยัน ไม่ใช่ uuid ที่คนอ่านไม่ออก */
  label: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const act = async (next: Next) => {
    // **ถามก่อนถอนสิทธิ์เท่านั้น ไม่ถามตอนให้** — การถอนทำให้คนที่กำลังใช้งานอยู่
    // เข้าระบบไม่ได้ทันทีโดยไม่มีอะไรเตือนเขา ส่วนการให้สิทธิ์กดผิดแล้วกดกลับได้
    // ถามทุกครั้งจะกลายเป็นขั้นตอนที่คนกด "ตกลง" โดยไม่อ่าน แล้วมันจะกันอะไรไม่ได้เลย
    // **สวิตช์กดง่ายกว่าปุ่ม** คำถามนี้จึงจำเป็นกว่าเดิม ไม่ใช่น้อยลง
    if (next === 'rejected' && status === 'approved') {
      if (!confirm(`ถอนสิทธิ์เข้าใช้งานของ ${label}?\n\nบัญชีนี้จะเข้าระบบไม่ได้ทันที`)) return
    }

    setBusy(true)
    setMsg('')
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })

      if (!res.ok) {
        // แสดงเหตุผลจากเซิร์ฟเวอร์ ไม่ใช่ข้อความกลางที่ปิดบังสาเหตุ — เซิร์ฟเวอร์
        // ส่งข้อความที่ปลอดภัยมาให้อยู่แล้ว (ไม่มีข้อความ Postgres ดิบ)
        const j = await res.json().catch(() => ({}))
        setMsg(j?.error ?? 'ดำเนินการไม่สำเร็จ')
        return
      }

      // ไม่ตั้งข้อความว่าสำเร็จ เพราะสวิตช์กำลังจะเลื่อนและเปลี่ยนสี
      // ซึ่งเป็นการยืนยันที่ชัดกว่าข้อความที่ผู้ใช้อาจไม่ทันอ่าน
      router.refresh()
    } catch {
      setMsg('เชื่อมต่อไม่ได้')
    } finally {
      setBusy(false)
    }
  }

  const error = msg && (
    <span style={{ fontSize: 12, color: 'var(--bad)', maxWidth: 240 }}>{msg}</span>
  )

  // **สวิตช์มีสองตำแหน่ง แต่คอลัมน์ `status` มีค่าได้มากกว่าสองค่า**
  // ค่าที่ไม่ใช่ approved/rejected จึงต้องตกมาทางนี้ ไม่ใช่ถูกยัดเป็น "ปิด"
  // ไม่งั้นวันที่มีคนเพิ่มค่าเข้า enum สวิตช์จะขึ้นแดงว่า "ถูกปฏิเสธ" ทั้งที่ไม่ใช่
  // — หน้าจอโกหกแบบที่ไม่มีอะไรบอก หลักเดียวกับ `width: NaN%` ที่กลายเป็นแท่งเต็ม
  if (status !== 'approved' && status !== 'rejected') {
    return (
      <span className="row" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {error}
        <button className="btn" disabled={busy} onClick={() => act('rejected')}>
          ปฏิเสธ
        </button>
        <button className="btn btn-primary" disabled={busy} onClick={() => act('approved')}>
          อนุมัติ
        </button>
      </span>
    )
  }

  const on = status === 'approved'
  return (
    <span className="row" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {error}
      {/* **ป้ายข้อความต้องมีคู่กับสี** — สีเขียว/แดงอย่างเดียวสื่อไม่ถึงคนตาบอดสี
          และไม่ผ่านโปรแกรมอ่านหน้าจอ ป้ายนี้คือสิ่งที่บอกสถานะจริง สีเป็นตัวเสริม */}
      <span style={{ fontSize: 13, color: on ? 'var(--ok)' : 'var(--bad)' }}>
        {on ? 'ใช้งานได้' : 'ถูกปฏิเสธ'}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`สิทธิ์เข้าใช้งานของ ${label}`}
        className="switch"
        disabled={busy}
        onClick={() => act(on ? 'rejected' : 'approved')}
        title={on ? 'กดเพื่อถอนสิทธิ์' : 'กดเพื่ออนุมัติ'}
      />
    </span>
  )
}
