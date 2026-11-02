import { decideWebhook } from './webhookGate'

// ค่าคงที่ hardcode ทั้งหมดโดยตั้งใจ — agent id ตรงกับ phantom จริงที่ทดสอบผ่านเมื่อ 2026-11-02
const AGENT = '1955470235787672'
const ok = {
  providedSecret: 's3cret',
  expectedSecret: 's3cret',
  expectedAgentId: AGENT,
  rawBody: JSON.stringify({ agentId: AGENT, exitCode: 0, exitMessage: 'finished' }),
}

test('ครบทุกเงื่อนไข → dispatch', () => {
  expect(decideWebhook(ok)).toEqual({ action: 'dispatch' })
})

test('รหัสลับผิด → 401', () => {
  expect(decideWebhook({ ...ok, providedSecret: 'wrong!' })).toMatchObject({ action: 'reject', status: 401 })
})

// timingSafeEqual โยน error เมื่อความยาวต่างกัน — ต้องได้ 401 ไม่ใช่ 500
test('รหัสลับยาวไม่เท่า → 401 ไม่โยน', () => {
  expect(decideWebhook({ ...ok, providedSecret: 'x' })).toMatchObject({ action: 'reject', status: 401 })
})

test('ไม่มี ?secret → 401', () => {
  expect(decideWebhook({ ...ok, providedSecret: null })).toMatchObject({ action: 'reject', status: 401 })
})

// ความผิดฝั่งเรา ไม่ใช่ของผู้ส่ง — ห้ามเป็น 4xx เพราะ PhantomBuster จะถอด webhook
test('env รหัสลับไม่ได้ตั้ง → 503', () => {
  expect(decideWebhook({ ...ok, expectedSecret: undefined })).toMatchObject({ action: 'reject', status: 503 })
})

// "ว่างตรงกับว่าง" ต้องไม่ผ่าน — ปิดประตูเป็นค่าตั้งต้น
test('env รหัสลับว่าง/ช่องว่าง → 503 แม้ ?secret ว่าง', () => {
  expect(decideWebhook({ ...ok, expectedSecret: '  ', providedSecret: '' })).toMatchObject({ action: 'reject', status: 503 })
})

test('รหัสลับผิด ตรวจก่อน body เสีย', () => {
  expect(decideWebhook({ ...ok, providedSecret: 'bad', rawBody: 'not json' })).toMatchObject({ action: 'reject', status: 401 })
})

test('body ไม่ใช่ JSON → ignore 200', () => {
  expect(decideWebhook({ ...ok, rawBody: '<html>' })).toMatchObject({ action: 'ignore', status: 200 })
})

test('body เป็น JSON แต่ไม่ใช่ object → ignore 200', () => {
  expect(decideWebhook({ ...ok, rawBody: 'null' })).toMatchObject({ action: 'ignore', status: 200 })
  expect(decideWebhook({ ...ok, rawBody: '[1,2]' })).toMatchObject({ action: 'ignore', status: 200 })
})

test('agentId ไม่ตรง → ignore', () => {
  expect(decideWebhook({ ...ok, rawBody: JSON.stringify({ agentId: '999', exitCode: 0 }) })).toMatchObject({ action: 'ignore', status: 200 })
})

test('agentId เป็นตัวเลข → dispatch', () => {
  expect(decideWebhook({ ...ok, rawBody: JSON.stringify({ agentId: 1955470235787672, exitCode: 0 }) })).toEqual({ action: 'dispatch' })
})

// ความผิดฝั่งเรา — ถ้าตอบ 200 การนำเข้าจะหยุดเงียบๆ โดยไม่มีสัญญาณ
test('env agentId ไม่ได้ตั้ง/ว่าง → 503', () => {
  expect(decideWebhook({ ...ok, expectedAgentId: undefined })).toMatchObject({ action: 'reject', status: 503 })
  expect(decideWebhook({ ...ok, expectedAgentId: '  ' })).toMatchObject({ action: 'reject', status: 503 })
})

test('exitCode 1 → ignore', () => {
  expect(decideWebhook({ ...ok, rawBody: JSON.stringify({ agentId: AGENT, exitCode: 1 }) })).toMatchObject({ action: 'ignore', status: 200 })
})

test('exitCode "0" → dispatch', () => {
  expect(decideWebhook({ ...ok, rawBody: JSON.stringify({ agentId: AGENT, exitCode: '0' }) })).toEqual({ action: 'dispatch' })
})

test('ไม่มี exitCode / null → ignore', () => {
  expect(decideWebhook({ ...ok, rawBody: JSON.stringify({ agentId: AGENT }) })).toMatchObject({ action: 'ignore', status: 200 })
  expect(decideWebhook({ ...ok, rawBody: JSON.stringify({ agentId: AGENT, exitCode: null }) })).toMatchObject({ action: 'ignore', status: 200 })
})
