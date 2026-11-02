// ตัดสินว่าจะเขียนแถวลงคิวรอตรวจ (`pending_candidates`) หรือไม่ — ฟังก์ชันบริสุทธิ์
//
// **เขียนได้เฉพาะเมื่อยังไม่มีแถว หรือแถวยังเป็น `pending`** สถานะอื่นทั้งหมดแปลว่า
// มีคนตัดสินไปแล้ว การเขียน `status: 'pending'` ทับคือการลบการตัดสินนั้นทิ้งเงียบๆ
// เกิดจริง 2026-11-02: แถวที่อนุมัติไปแล้วถูก upsert กลับเป็น pending ในรอบถัดไป
// และเมื่อ webhook ทำให้ sync รันทุกครั้งที่ phantom จบ คนที่ปฏิเสธไปแล้วจะวนกลับมาไม่จบ
//
// สถานะที่ไม่รู้จักให้ข้ามโดยตั้งใจ — ปลุกการตัดสินที่เราไม่เข้าใจกลับมาเป็น pending
// เสี่ยงกว่าการปล่อยไว้ (หลักเดียวกับ decideAccess ที่ปิดประตูให้ค่าที่ไม่รู้จัก)
export type PendingWrite = 'write' | 'skip'

export function planPendingWrite(existingStatus: string | null | undefined): PendingWrite {
  if (existingStatus == null) return 'write'
  return existingStatus === 'pending' ? 'write' : 'skip'
}
