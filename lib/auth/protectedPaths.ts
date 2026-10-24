// หน้าที่ต้องเข้าสู่ระบบก่อน — middleware ส่งคนที่ไม่มี session ไปหน้า /login เฉพาะหน้าเหล่านี้
//
// แยกจาก `matcher` ของ middleware โดยตั้งใจ: matcher บอกว่า "middleware ทำงานที่ไหน"
// ส่วนรายการนี้บอกว่า "ที่ไหนต้องล็อกอิน" middleware ต้องทำงานบนหน้าสาธารณะด้วย
// เพื่อต่ออายุหรือล้างคุกกี้ session ที่หมดอายุ — server component เขียนคุกกี้ไม่ได้
// คุกกี้ที่ถูกเพิกถอนจึงค้างและทำให้ supabase-js พิมพ์ refresh_token_not_found
// ทุกครั้งที่เปิดหน้าแรก (เกิดจริง 2026-10-25) แต่หน้าสาธารณะต้องไม่ถูก redirect
export const PROTECTED_PREFIXES = [
  '/dashboard',
  '/search',
  '/jobs',
  '/import',
  '/candidates',
  '/shortlists',
  '/admin',
  '/settings',
  '/self-assessment',
] as const

export function isProtectedPath(path: string): boolean {
  return PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))
}
