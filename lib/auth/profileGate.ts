import type { Role } from './session'

// ตัดสินว่าแถวใน `profiles` ที่อ่านมาได้ ให้สิทธิ์เข้าระบบหรือไม่
//
// **ทำไมต้องมีไฟล์นี้** — `getSession` เดิมเขียนว่า `role: p?.role ?? 'member'`
// ซึ่งแปลว่า**คนที่ไม่มีแถวใน `profiles` เลย ได้สิทธิ์ member เงียบๆ**
// เกิดขึ้นจริง 2026-09-17: ลบแถวใน `profiles` ทิ้งแต่บัญชีใน `auth.users` ยังอยู่
// (FK cascade วิ่งทางเดียว ลบ auth user → ลบ profile ไม่ใช่ทางกลับ) ผลคือบัญชีนั้น
// **ยังล็อกอินและใช้งานได้ตามปกติ แต่หายไปจาก `/admin/users` ซึ่งอ่านจาก `profiles`**
// แอดมินเปลี่ยนสิทธิ์ไม่ได้เพราะไม่มีแถวให้ update และ `activity_log` ย้อนชื่อไม่ได้
//
// **การลบแถวใน `profiles` จึงดูเหมือนถอดสิทธิ์ แต่จริงๆ แค่ทำให้คนนั้นล่องหน**
// ซึ่งตรงข้ามกับสิ่งที่คนกดลบคาดหวังทุกประการ
//
// ทางที่เลือกคือปิดกั้นแล้วบอกเหตุผล ไม่ใช่เดาสิทธิ์ให้ — **คำตอบที่ดูสมเหตุสมผล
// แต่ผิด แย่กว่า error** เป็นหลักเดียวกับที่ `.maybeSingle()` ถูกนำมาใช้แทน
// `.single()` ใน `scoreCandidateAgainst` เพื่อแยก "ไม่มีแถว" ออกจาก "ฐานข้อมูลพัง"

export const ROLE_VALUES = ['admin', 'data_manager', 'member'] as const

/** ค่าของ `profiles.status` — enum `account_status` ใน migration 022a */
export const STATUS_VALUES = ['pending', 'approved', 'rejected'] as const

export type DenyReason = 'read-failed' | 'no-profile' | 'bad-role' | 'pending' | 'rejected'

export type AccessDecision =
  | { allowed: true; role: Role }
  | { allowed: false; reason: DenyReason }

/**
 * @param row     แถวจาก `profiles` (null เมื่อไม่มี) — ใช้ `.maybeSingle()` เท่านั้น
 * @param hadError `error` จากการอ่านเป็นค่าจริงหรือไม่
 *
 * **ลำดับการตรวจสำคัญ** — ต้องดู `hadError` ก่อน `!row` เพราะตอนอ่านล้มเหลว
 * `row` ก็เป็น null เหมือนกัน ถ้าตรวจสลับกันจะรายงานว่า "ไม่มีโปรไฟล์" ทั้งที่
 * ฐานข้อมูลพัง แล้วคนจะไปตามหาสาเหตุผิดที่ (บั๊กเดียวกับที่เคยทำให้หน้าผู้สมัคร
 * ขึ้น 404 ตอนฐานข้อมูลล่ม)
 */
export function decideAccess(row: unknown, hadError: boolean): AccessDecision {
  if (hadError) return { allowed: false, reason: 'read-failed' }
  if (!row || typeof row !== 'object') return { allowed: false, reason: 'no-profile' }

  const role = (row as { role?: unknown }).role
  if (typeof role !== 'string' || !(ROLE_VALUES as readonly string[]).includes(role)) {
    return { allowed: false, reason: 'bad-role' }
  }

  // **ตรวจสถานะหลัง role เสมอ** — แถวที่ข้อมูลเพี้ยนต้องถูกจับว่าเพี้ยน ไม่ใช่ถูกรายงาน
  // ว่า "รออนุมัติ" แล้วไปโผล่ในคิวให้ผู้ดูแลกดอนุมัติบัญชีที่พัง
  const status = (row as { status?: unknown }).status
  if (status === 'rejected') return { allowed: false, reason: 'rejected' }

  // **ทุกค่าที่ไม่ใช่ 'approved' ปิดประตู รวมถึงค่าที่ไม่มีเลย** หลักเดียวกับ
  // `ROLE_RANK[unknown] ?? 0` ใน hasRole — ถ้าให้ status ที่หายไปแปลว่าผ่าน
  // วันไหนมีคนลืม `.select('status')` ทุกคนจะเข้าได้หมดโดยไม่มีสัญญาณใดเลย
  // ซึ่งเป็นความพังชนิดที่หาสาเหตุยากที่สุด
  //
  // ค่าที่อยู่นอก enum ไปรวมกับ 'pending' โดยตั้งใจ — คอลัมน์เป็น enum ที่ not null
  // ค่านอกรายการจึงเกิดจากฐานข้อมูลจริงไม่ได้ เหลือแต่ทางเทสต์
  if (status !== 'approved') return { allowed: false, reason: 'pending' }

  return { allowed: true, role: role as Role }
}

/**
 * ข้อความที่ผู้ใช้เห็น — **ไม่บอกรายละเอียดภายใน** แต่บอกให้พอรู้ว่าต้องทำอะไรต่อ
 * บัญชีที่ไม่มีโปรไฟล์กู้เองไม่ได้ ต้องให้ผู้ดูแลระบบจัดการ การบอกให้ "ลองใหม่"
 * จึงผิด เพราะลองอีกกี่ครั้งก็เหมือนเดิม
 */
export function accessDeniedMessage(reason: DenyReason): string {
  if (reason === 'read-failed') return 'ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง'

  // **สองสถานะนี้ต้องเป็นคนละข้อความ** เพราะผู้ใช้ต้องทำคนละอย่าง — คนที่รออนุมัติ
  // รอต่อได้และมีโอกาสได้ใช้ ส่วนคนที่ถูกปฏิเสธรอไปก็ไม่มีอะไรเปลี่ยน ต้องติดต่อคน
  // ข้อความรวมที่ใช้ได้ทั้งสองกรณีจะทำให้ฝ่ายหนึ่งรอเก้อเสมอ
  if (reason === 'pending') {
    return 'บัญชีนี้รอการอนุมัติจากผู้ดูแลระบบ กรุณาติดต่อผู้ดูแลหากรอเกินสมควร'
  }
  if (reason === 'rejected') {
    return 'บัญชีนี้ไม่ได้รับอนุมัติให้ใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
  }

  return 'บัญชีนี้ยังไม่ได้ตั้งค่าในระบบ กรุณาติดต่อผู้ดูแลระบบ'
}
