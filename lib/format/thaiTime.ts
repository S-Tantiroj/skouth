// แสดงเวลาจากฐานข้อมูลเป็นเวลาไทย รูปแบบ `YYYY-MM-DD HH:mm`
//
// **ต้องระบุ timeZone เสมอ** — ฐานข้อมูลเก็บเป็น UTC และ Vercel render server component
// ด้วย timezone UTC การตัดสตริง ISO ตรงๆ (`slice(0, 16)`) หรือใช้ timezone ของเครื่อง
// จึงแสดงช้ากว่าเวลาไทย 7 ชั่วโมงบน production แต่อาจดูถูกตอนรันบนเครื่องที่ตั้งเวลาไทย
const FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// Postgres คืน `2026-11-02 09:26:08.14+00` ซึ่ง Node อ่านได้แต่บางเบราว์เซอร์ไม่อ่าน
// แปลงเป็น ISO มาตรฐานก่อนเพื่อให้ฟังก์ชันนี้ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และ client component
function toIso(s: string): string {
  return s.trim().replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00')
}

export function formatThaiDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(toIso(value))
  if (Number.isNaN(d.getTime())) return ''
  const p = Object.fromEntries(FORMATTER.formatToParts(d).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`
}

/** วันที่ตามเวลาไทย `YYYY-MM-DD` — ใช้แทน `.slice(0, 10)` ที่ได้วันของ UTC */
export function formatThaiDate(value: string | null | undefined): string {
  return formatThaiDateTime(value).slice(0, 10)
}
