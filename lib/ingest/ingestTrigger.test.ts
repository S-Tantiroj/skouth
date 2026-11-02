import { ingestTrigger } from './ingestTrigger'

test('schedule → scheduled', () => {
  expect(ingestTrigger('schedule', undefined)).toBe('scheduled')
})

test('workflow_dispatch + webhook → webhook', () => {
  expect(ingestTrigger('workflow_dispatch', 'webhook')).toBe('webhook')
})

test('workflow_dispatch + manual/ว่าง → manual', () => {
  expect(ingestTrigger('workflow_dispatch', 'manual')).toBe('manual')
  expect(ingestTrigger('workflow_dispatch', '')).toBe('manual')
})

test('รันบนเครื่อง (ไม่มี env) → manual', () => {
  expect(ingestTrigger(undefined, undefined)).toBe('manual')
})

// ค่าที่เขียนลงฐานต้องมาจากชุดที่รู้จักเท่านั้น ไม่ส่งต่อค่าดิบจาก input ของ workflow
test('ค่าแปลกใน RUN_SOURCE → manual ไม่ใช่ส่งต่อดิบ', () => {
  expect(ingestTrigger('workflow_dispatch', 'evil')).toBe('manual')
})
