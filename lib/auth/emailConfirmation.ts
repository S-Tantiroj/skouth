// สถานะการยืนยันอีเมลของบัญชีในคิวรออนุมัติ
//
// แถวใน `profiles` ถูกสร้างตอนสมัคร (trigger บน auth.users) ไม่ใช่ตอนยืนยันอีเมล
// คิวรออนุมัติจึงมีบัญชีที่ยังไม่ได้กดลิงก์ยืนยันปนอยู่ด้วย
// อ่านไม่ได้ต้องเป็น 'unknown' ไม่ใช่ 'confirmed' — ห้ามบอกแอดมินว่ายืนยันแล้วโดยไม่รู้จริง

export type Confirmation = 'confirmed' | 'unconfirmed' | 'unknown'

type AuthUserLike = { id: string; email_confirmed_at?: string | null }

export function confirmationMap(users: readonly AuthUserLike[] | null): Map<string, Confirmation> | null {
  if (!users) return null
  return new Map(users.map((u) => [u.id, u.email_confirmed_at ? 'confirmed' : 'unconfirmed']))
}

export function confirmationOf(map: Map<string, Confirmation> | null, id: string): Confirmation {
  return map?.get(id) ?? 'unknown'
}

export const CONFIRMATION_LABELS: Record<Confirmation, string> = {
  confirmed: 'ยืนยันอีเมลแล้ว',
  unconfirmed: 'ยังไม่ยืนยันอีเมล',
  unknown: 'ไม่ทราบสถานะอีเมล',
}
