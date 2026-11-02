import { planPendingWrite } from './pendingQueue'

// คนที่ถูกตรวจในคิวไปแล้ว (อนุมัติ/ปฏิเสธ) ต้องไม่ถูกดึงกลับเป็น pending ทุกครั้งที่ sync รัน
// เกิดจริง 2026-11-02: อนุมัติตอน 09:39 แล้วรอบ 10:34 upsert เขียน status: 'pending' ทับ
// พอมี webhook phantom รันกี่ครั้งคนที่ปฏิเสธไปแล้วก็กลับเข้าคิวกี่ครั้ง

describe('planPendingWrite', () => {
  test('ยังไม่เคยอยู่ในคิว → เขียนเป็น pending', () => {
    expect(planPendingWrite(null)).toBe('write')
    expect(planPendingWrite(undefined)).toBe('write')
  })

  test('ยังรอตรวจอยู่ → เขียนทับได้ (อัปเดตข้อมูลล่าสุด สถานะยังเป็น pending)', () => {
    expect(planPendingWrite('pending')).toBe('write')
  })

  test('อนุมัติแล้ว → ข้าม ห้ามดึงกลับเข้าคิว', () => {
    expect(planPendingWrite('approved')).toBe('skip')
  })

  test('ปฏิเสธแล้ว → ข้าม การตัดสินของคนตรวจต้องคงอยู่', () => {
    expect(planPendingWrite('rejected')).toBe('skip')
  })

  test('สถานะที่ไม่รู้จัก → ข้าม (มีคนตัดสินอะไรไปแล้ว การปลุกกลับมาเป็น pending ปลอดภัยน้อยกว่า)', () => {
    expect(planPendingWrite('archived')).toBe('skip')
    expect(planPendingWrite('')).toBe('skip')
  })
})
