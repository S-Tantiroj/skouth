import { confirmationMap, confirmationOf, CONFIRMATION_LABELS } from './emailConfirmation'

test('แยกบัญชีที่ยืนยันอีเมลแล้วออกจากที่ยังไม่ยืนยัน', () => {
  const m = confirmationMap([
    { id: 'a', email_confirmed_at: '2026-10-22T00:00:00Z' },
    { id: 'b', email_confirmed_at: null },
    { id: 'c' },
  ])
  expect(confirmationOf(m, 'a')).toBe('confirmed')
  expect(confirmationOf(m, 'b')).toBe('unconfirmed')
  expect(confirmationOf(m, 'c')).toBe('unconfirmed')
})

test('อ่านรายชื่อไม่ได้ ต้องได้ unknown ไม่ใช่ confirmed', () => {
  expect(confirmationOf(confirmationMap(null), 'a')).toBe('unknown')
})

test('บัญชีที่ไม่อยู่ในรายชื่อได้ unknown', () => {
  expect(confirmationOf(confirmationMap([]), 'x')).toBe('unknown')
})

test('ป้ายข้อความ', () => {
  expect(CONFIRMATION_LABELS).toEqual({
    confirmed: 'ยืนยันอีเมลแล้ว',
    unconfirmed: 'ยังไม่ยืนยันอีเมล',
    unknown: 'ไม่ทราบสถานะอีเมล',
  })
})
