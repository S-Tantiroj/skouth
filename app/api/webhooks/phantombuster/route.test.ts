import { vi } from 'vitest'

// mock เฉพาะการเรียก GitHub — `decideWebhook` ใช้ตัวจริง
// (ห้าม stub ฟังก์ชันที่กำลังทดสอบ — หลักใน CLAUDE.md หัวข้อ Testing)
const h = vi.hoisted(() => ({
  result: { ok: true } as { ok: true } | { ok: false; status: number | null; reason: string },
}))
const dispatchMock = vi.fn(async (_token: string) => h.result)
vi.mock('@/lib/ingest/githubDispatch', () => ({
  dispatchSyncWorkflow: (token: string) => dispatchMock(token),
}))

import { POST } from './route'

const AGENT = '1955470235787672'
const goodBody = JSON.stringify({ agentId: AGENT, exitCode: 0, exitMessage: 'finished' })
const KEYS = ['PHANTOMBUSTER_WEBHOOK_SECRET', 'PHANTOMBUSTER_AGENT_ID', 'GITHUB_DISPATCH_TOKEN'] as const
let saved: Record<string, string | undefined> = {}

function post(query: string, body: string = goodBody) {
  return POST(new Request(`http://x/api/webhooks/phantombuster${query}`, { method: 'POST', body }))
}

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]))
  process.env.PHANTOMBUSTER_WEBHOOK_SECRET = 's3cret'
  process.env.PHANTOMBUSTER_AGENT_ID = AGENT
  process.env.GITHUB_DISPATCH_TOKEN = 'tok'
  h.result = { ok: true }
  dispatchMock.mockClear()
})

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

test('สำเร็จ → 202 และสั่ง GitHub ด้วย token จาก env', async () => {
  const res = await post('?secret=s3cret')
  expect(res.status).toBe(202)
  expect(dispatchMock).toHaveBeenCalledTimes(1)
  expect(dispatchMock).toHaveBeenCalledWith('tok')
})

test('รหัสลับผิด → 401 และไม่สั่ง GitHub', async () => {
  const res = await post('?secret=nope')
  expect(res.status).toBe(401)
  expect(dispatchMock).not.toHaveBeenCalled()
})

test('env รหัสลับไม่ได้ตั้ง → 503 และไม่สั่ง GitHub', async () => {
  delete process.env.PHANTOMBUSTER_WEBHOOK_SECRET
  const res = await post('?secret=s3cret')
  expect(res.status).toBe(503)
  expect(dispatchMock).not.toHaveBeenCalled()
})

test('exitCode 1 → 200 และไม่สั่ง GitHub', async () => {
  const res = await post('?secret=s3cret', JSON.stringify({ agentId: AGENT, exitCode: 1 }))
  expect(res.status).toBe(200)
  expect(dispatchMock).not.toHaveBeenCalled()
})

test('GitHub ล้มเหลว → 502 ไม่ใช่ 4xx', async () => {
  h.result = { ok: false, status: 401, reason: 'bad token' }
  const res = await post('?secret=s3cret')
  expect(res.status).toBe(502)
  expect(await res.text()).not.toContain('bad token')
})

test('GITHUB_DISPATCH_TOKEN ไม่ได้ตั้ง → 502', async () => {
  delete process.env.GITHUB_DISPATCH_TOKEN
  h.result = { ok: false, status: null, reason: 'GITHUB_DISPATCH_TOKEN is not set' }
  const res = await post('?secret=s3cret')
  expect(res.status).toBe(502)
})

test('secret ใน query ถูก decode', async () => {
  process.env.PHANTOMBUSTER_WEBHOOK_SECRET = 'a+b/c'
  const res = await post('?secret=a%2Bb%2Fc')
  expect(res.status).toBe(202)
})
