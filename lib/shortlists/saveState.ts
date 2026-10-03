// ตรรกะของปุ่ม "บันทึกเข้า Shortlist" — แยกออกจากคอมโพเนนต์เพราะสองเหตุผล
//
// 1. ชุด unit รันบน `environment: 'node'` ไม่มี jsdom การ render React จึงทดสอบไม่ได้
//    รูปแบบเดียวกับ `buildTimeline` ใน `components/Timeline.tsx` ที่แยกตรรกะออกมาทดสอบ
// 2. `validateListName` ถูกใช้ทั้งที่ปุ่มนี้และหน้า `/shortlists` (แก้ชื่อ)
//    ถ้าอยู่ในไฟล์คอมโพเนนต์ อีกหน้าจะต้อง import ข้ามไปหาคอมโพเนนต์ที่ไม่เกี่ยวกัน

/**
 * เพดานความยาวชื่อ Shortlist
 *
 * **ต้องตรงกับ constraint `shortlists_name_len` ใน migration 022b**
 * ค่านี้เป็นสัญญากับของนอกรีโป (DDL ของตาราง) ไม่ใช่ค่าที่เราตั้งเองได้ตามใจ
 * `saveState.test.ts` จึงมีเทสต์ที่เขียนเลข 60 ลงไปตรงๆ คู่กับเทสต์ที่อ้างค่านี้
 * — เทสต์ที่อ่านค่าคงที่อย่างเดียวจะเขียวต่อไปแม้มีคนเปลี่ยนเพดานให้ไม่ตรงกับฐาน
 * (บทเรียนเดียวกับ `JOB_TEXT_LIMITS` ใน `lib/jobs/validate.test.ts`)
 */
export const SHORTLIST_NAME_MAX = 60

/** ผู้สมัครคนนี้อยู่ใน Shortlist อย่างน้อยหนึ่งรายการแล้วหรือยัง */
export function isSaved(member: readonly string[]): boolean {
  return member.length > 0
}

export type TogglePlan = { kind: 'add' | 'remove'; listId: string } | null

/**
 * ตัดสินว่าการกดติ๊กที่รายการหนึ่งควรยิงคำขออะไร
 *
 * **คืน `null` เมื่อรายการนั้นมีคำขอค้างอยู่** — ไม่ใช่แค่เรื่องกันคีย์ซ้ำ (เราใช้
 * `upsert` ซึ่งกดซ้ำแล้วไม่ error อยู่แล้ว) แต่เป็นเรื่องลำดับ: ดับเบิลคลิกเร็วๆ
 * จะได้ add กับ remove วิ่งพร้อมกัน แล้วผลสุดท้ายขึ้นกับว่าอันไหนถึงฐานก่อน
 * **ซึ่งไม่ใช่สิ่งที่ผู้ใช้เห็นบนหน้าจอเสมอไป** — หน้าจอกับฐานข้อมูลจะต่างกัน
 * โดยไม่มีอะไรบอก เป็นความผิดพลาดชนิดเดียวกับที่ `RoleSelect` เคยทำ
 *
 * รวมการตัดสินทั้งสามเรื่องไว้ที่เดียว (ค้างอยู่ไหม · อยู่ในรายการแล้วไหม · จะทำอะไร)
 * เพื่อให้คอมโพเนนต์ไม่ต้องถือเงื่อนไขเองและทดสอบได้จริงโดยไม่ต้อง render
 */
export function planToggle(
  member: readonly string[],
  busy: readonly string[],
  listId: string
): TogglePlan {
  if (busy.includes(listId)) return null
  return { kind: member.includes(listId) ? 'remove' : 'add', listId }
}

/**
 * สถานะสมาชิกชุดใหม่หลังคำขอ **สำเร็จแล้ว**
 *
 * **ห้ามเรียกก่อนคำขอสำเร็จ** — การเปลี่ยนหน้าจอล่วงหน้าแล้วไม่ย้อนกลับเมื่อล้มเหลว
 * คือบั๊กที่ `RoleSelect` เคยมี ผู้ใช้เห็นติ๊กถูกค้างไว้ทั้งที่ฐานข้อมูลไม่มีแถวนั้น
 *
 * กันค่าซ้ำด้วย เพราะรายการนี้ถูกส่งต่อเป็น prop ได้จากหลายทาง
 */
export function applyToggle(
  member: readonly string[],
  listId: string,
  kind: 'add' | 'remove'
): string[] {
  const without = member.filter((m) => m !== listId)
  return kind === 'add' ? [...without, listId] : without
}

export type NameCheck = { ok: true; value: string } | { ok: false; reason: string }

/**
 * ตรวจชื่อ Shortlist ก่อนส่งไปฐานข้อมูล
 *
 * **ตัดช่องว่างหัวท้ายเสมอ** — constraint ใน 022b ตรวจ `char_length(trim(name))`
 * แต่ **มันไม่ได้ตัดช่องว่างให้** ชื่อ " ก " จึงผ่าน constraint แล้วถูกเก็บพร้อม
 * ช่องว่าง ซึ่งเรียงลำดับผิดและเทียบกับค่าอื่นไม่ตรง การตัดต้องทำที่ฝั่งแอป
 * (เหตุผลเดียวกับ `normalizeDisplayName` ใน `lib/auth/identity.ts`)
 *
 * **ด่านนี้มีไว้ให้ข้อความที่อ่านรู้เรื่อง ไม่ใช่เพื่อความปลอดภัย** ด่านจริงคือ
 * constraint ที่ฐานข้อมูล ซึ่งกันคำขอที่ยิงตรงมาด้วย anon key ได้ด้วย
 */
export function validateListName(raw: string): NameCheck {
  const value = raw.trim()
  if (!value) return { ok: false, reason: 'ตั้งชื่อ Shortlist ก่อน' }
  if (value.length > SHORTLIST_NAME_MAX) {
    return { ok: false, reason: `ชื่อยาวเกิน ${SHORTLIST_NAME_MAX} ตัวอักษร` }
  }
  return { ok: true, value }
}
