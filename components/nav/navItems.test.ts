import { readFileSync } from 'node:fs'
import { NAV_ITEMS, sidebarItems, topRightItems, pageTitle } from './navItems'
import { PROTECTED_PREFIXES, isProtectedPath } from '@/lib/auth/protectedPaths'

// ตัด '/:path*' ออกจากแต่ละรายการใน matcher เหลือคำนำหน้า
// '/admin/:path*' -> '/admin'
function matcherPrefixes(): string[] {
  const src = readFileSync('middleware.ts', 'utf8')
  const start = src.indexOf('matcher:')
  const end = src.indexOf(']', start)
  const block = src.slice(start, end)
  const out: string[] = []
  const re = /'([^']+)'/g
  let m: RegExpExecArray | null
  while ((m = re.exec(block))) out.push(m[1].replace('/:path*', ''))
  return out
}

function isCovered(href: string, prefixes: string[]): boolean {
  return prefixes.some((p) => href === p || href.startsWith(p + '/'))
}

test('href ห้ามซ้ำ', () => {
  const hrefs = NAV_ITEMS.map((i) => i.href)
  expect(new Set(hrefs).size).toBe(hrefs.length)
})

test('ทุกรายการมี label, Icon และ placement', () => {
  for (const i of NAV_ITEMS) {
    expect(i.label.trim().length).toBeGreaterThan(0)
    expect(i.Icon).toBeTruthy()
    expect(['sidebar', 'topRight']).toContain(i.placement)
  }
})

test('รายการที่กั้นด้วย role เป็นสามอันนี้เป๊ะ', () => {
  // ถ้าใครลบ requires ออกจาก Admin โดยไม่ตั้งใจ เทสต์นี้แดงทันที
  const gated = NAV_ITEMS.filter((i) => i.requires).map((i) => i.href).sort()
  expect(gated).toEqual(['/admin/users', '/candidates', '/import'])
})

test('ทุก href ที่ต้องล็อกอิน อยู่ในรายการหน้าที่บังคับล็อกอิน', () => {
  // เพิ่มเมนูชี้ไปหน้าใหม่แล้วลืมใส่ในรายการ = หน้านั้นเปิดได้โดยไม่ต้องล็อกอิน
  // และไม่มีอาการอะไรให้สังเกตเลยเพราะเมนูทำงานปกติ
  for (const i of NAV_ITEMS) {
    if (i.requiresAuth === false) continue
    expect(isProtectedPath(i.href)).toBe(true)
  }
})

test('ทุกหน้าที่บังคับล็อกอิน มี middleware ทำงานอยู่จริง', () => {
  // รายการบังคับล็อกอินไม่มีผลถ้า matcher ไม่ครอบหน้านั้น — middleware จะไม่ถูกเรียกเลย
  const prefixes = matcherPrefixes()
  for (const p of PROTECTED_PREFIXES) expect(isCovered(p, prefixes)).toBe(true)
})

test('/help ต้องไม่บังคับล็อกอิน', () => {
  // ทิศตรงข้าม — /help อยู่ใน matcher ได้ (เพื่อล้างคุกกี้ที่หมดอายุ) แต่ต้องไม่ถูก redirect
  const help = NAV_ITEMS.find((i) => i.href === '/help')
  expect(help?.requiresAuth).toBe(false)
  for (const p of ['/', '/help', '/terms', '/privacy', '/login', '/signup', '/auth/confirm']) {
    expect(isProtectedPath(p)).toBe(false)
  }
})

test('/auth/* ต้องอยู่นอก matcher', () => {
  // /auth/confirm ต้องตั้ง session จากลิงก์อีเมลเองฝั่งเบราว์เซอร์ก่อน (ดู CLAUDE.md Phase 6)
  expect(isCovered('/auth/confirm', matcherPrefixes())).toBe(false)
})

test('isProtectedPath เทียบที่ขอบเส้นทาง', () => {
  expect(isProtectedPath('/search')).toBe(true)
  expect(isProtectedPath('/search/x')).toBe(true)
  expect(isProtectedPath('/searching')).toBe(false)
})

test('sidebarItems กรองตาม role', () => {
  const member = sidebarItems({ isAdmin: false, isDataManager: false }).map((i) => i.href)
  expect(member).not.toContain('/candidates')
  expect(member).not.toContain('/import')
  expect(member).not.toContain('/admin/users')
  expect(member).toContain('/dashboard')

  const dm = sidebarItems({ isAdmin: false, isDataManager: true }).map((i) => i.href)
  expect(dm).toContain('/candidates')
  expect(dm).toContain('/import')
  expect(dm).not.toContain('/admin/users')

  const admin = sidebarItems({ isAdmin: true, isDataManager: true }).map((i) => i.href)
  expect(admin).toContain('/admin/users')
})

test('sidebarItems ไม่คืนรายการของมุมขวาบน', () => {
  const hrefs = sidebarItems({ isAdmin: true, isDataManager: true }).map((i) => i.href)
  expect(hrefs).not.toContain('/help')
  expect(hrefs).not.toContain('/settings')
})

test('topRightItems คือคู่มือกับตั้งค่า เรียงตามนี้', () => {
  expect(topRightItems().map((i) => i.href)).toEqual(['/help', '/settings'])
})

test('pageTitle หาจากคำนำหน้าที่ยาวที่สุด', () => {
  expect(pageTitle('/candidates')).toBe('ข้อมูล')
  expect(pageTitle('/candidates/abc-123')).toBe('ข้อมูล')
  expect(pageTitle('/settings')).toBe('ตั้งค่า')
  expect(pageTitle('/jobs/42')).toBe('Job')
})

test('pageTitle คืน Skouth เมื่อไม่ตรงอะไรเลย', () => {
  expect(pageTitle('/')).toBe('Skouth')
  expect(pageTitle('/ไม่มีอยู่จริง')).toBe('Skouth')
})

test('pageTitle ไม่จับคำนำหน้าที่ไม่ใช่ขอบเส้นทาง', () => {
  // '/searching' ไม่ใช่หน้าลูกของ '/search' — ถ้าใช้ startsWith เฉยๆ จะจับผิด
  expect(pageTitle('/searching')).toBe('Skouth')
})
