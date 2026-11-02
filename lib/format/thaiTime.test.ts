import { formatThaiDate, formatThaiDateTime } from './thaiTime'

// วันที่อย่างเดียว — จุดที่เคยใช้ `.slice(0, 10)` ตรงๆ แสดงวันย้อนไปหนึ่งวัน
// สำหรับรายการที่เกิดระหว่างเที่ยงคืนถึง 07:00 เวลาไทย
describe('formatThaiDate', () => {
  test('รายการตีหนึ่งครึ่งเวลาไทย ต้องเป็นวันของไทย ไม่ใช่วันของ UTC', () => {
    expect(formatThaiDate('2026-11-02T18:30:00Z')).toBe('2026-11-03')
  })

  test('กลางวันได้วันเดียวกับ UTC', () => {
    expect(formatThaiDate('2026-11-02 09:26:08.140767+00')).toBe('2026-11-02')
  })

  test('ค่าว่างหรืออ่านไม่ได้คืนสตริงว่าง', () => {
    expect(formatThaiDate(null)).toBe('')
    expect(formatThaiDate('not a date')).toBe('')
  })
})

// ฐานข้อมูลเก็บเวลาเป็น UTC และ Vercel render ฝั่งเซิร์ฟเวอร์ด้วย timezone UTC
// การตัดสตริง ISO ตรงๆ จึงแสดงเวลาช้ากว่าเวลาไทย 7 ชั่วโมง (เห็นจริงที่ /import/auto 2026-11-02)
describe('formatThaiDateTime', () => {
  test('แปลง UTC เป็นเวลาไทย (+7)', () => {
    expect(formatThaiDateTime('2026-11-02T10:40:12.123+00:00')).toBe('2026-11-02 17:40')
  })

  test('ข้ามวันได้ถูกต้อง — 18:30 UTC คือตีหนึ่งครึ่งของวันถัดไปในไทย', () => {
    expect(formatThaiDateTime('2026-11-02T18:30:00Z')).toBe('2026-11-03 01:30')
  })

  test('รูปแบบที่ Postgres คืนมา (ช่องว่างแทน T)', () => {
    expect(formatThaiDateTime('2026-11-02 09:26:08.140767+00')).toBe('2026-11-02 16:26')
  })

  test('เที่ยงคืนแสดงเป็น 00 ไม่ใช่ 24', () => {
    expect(formatThaiDateTime('2026-11-02T17:00:00Z')).toBe('2026-11-03 00:00')
  })

  test('ค่าว่างหรืออ่านไม่ได้คืนสตริงว่าง ไม่ใช่ "Invalid Date"', () => {
    expect(formatThaiDateTime(null)).toBe('')
    expect(formatThaiDateTime(undefined)).toBe('')
    expect(formatThaiDateTime('')).toBe('')
    expect(formatThaiDateTime('not a date')).toBe('')
  })
})
