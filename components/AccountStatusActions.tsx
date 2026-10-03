'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Next = 'approved' | 'rejected'

/**
 * ปุ่มอนุมัติ/ปฏิเสธบัญชีที่รออยู่ในคิว
 *
 * **ตามบทเรียนของ `RoleSelect`** — ห้ามเปลี่ยนหน้าจอก่อนคำขอสำเร็จ ที่นี่ทำได้ง่ายกว่า
 * เพราะไม่มี state ที่ต้องย้อน: ปุ่มไม่เปลี่ยนรูปร่างระหว่างรอ มีแต่ถูกปิดไว้
 * แล้ว `router.refresh()` ให้เซิร์ฟเวอร์เป็นคนบอกว่าสถานะใหม่คืออะไร
 * **หน้าจอจึงไม่มีทางแสดงค่าที่ต่างจากฐานข้อมูล** ซึ่งเป็นความผิดพลาดที่ RoleSelect เคยทำ
 */
export default function AccountStatusActions({ userId }: { userId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const act = async (status: Next) => {
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) {
        // แสดงเหตุผลจากเซิร์ฟเวอร์ ไม่ใช่ข้อความกลางที่ปิดบังสาเหตุ — เซิร์ฟเวอร์
        // ส่งข้อความที่ปลอดภัยมาให้อยู่แล้ว (ไม่มีข้อความ Postgres ดิบ)
        const j = await res.json().catch(() => ({}))
        setMsg(j?.error ?? 'ดำเนินการไม่สำเร็จ')
        return
      }

      // ไม่ตั้งข้อความว่าสำเร็จ เพราะแถวกำลังจะหายไปจากคิวอยู่แล้ว
      // ซึ่งเป็นการยืนยันที่ชัดกว่าข้อความที่ผู้ใช้อาจไม่ทันอ่าน
      router.refresh()
    } catch {
      setMsg('เชื่อมต่อไม่ได้')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="row" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {msg && (
        <span style={{ fontSize: 12, color: 'var(--bad)', maxWidth: 260 }}>{msg}</span>
      )}
      <button className="btn" disabled={busy} onClick={() => act('rejected')}>
        ปฏิเสธ
      </button>
      <button className="btn btn-primary" disabled={busy} onClick={() => act('approved')}>
        อนุมัติ
      </button>
    </span>
  )
}
