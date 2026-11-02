import { dispatchSyncWorkflow, DISPATCH_URL, DISPATCH_TIMEOUT_MS } from './githubDispatch'

// hardcode โดยตั้งใจ — ชื่อ repo และไฟล์ workflow เป็นสัญญากับของนอกรีโป
// เทสต์ที่อ่านค่าคงที่จากโค้ดจะจับค่าผิดไม่ได้
test('URL ตรงกับ repo และไฟล์ workflow จริง', () => {
  expect(DISPATCH_URL).toBe(
    'https://api.github.com/repos/S-Tantiroj/skouth/actions/workflows/sync-candidates.yml/dispatches'
  )
})

// PhantomBuster รอ response header แค่ 5 วินาที (จากเพดานรวม 11) route ส่ง header
// หลังเรียก GitHub เสร็จ timeout จึงต้องต่ำกว่า 5 วินาทีพร้อมเผื่อ cold start ของ Vercel
test('timeout ต่ำกว่าเพดานรอ header 5 วินาทีของ PhantomBuster', () => {
  expect(DISPATCH_TIMEOUT_MS).toBe(3500)
})

test('204 → ok และส่ง method/header/body ถูก', async () => {
  const f = vi.fn(async (_u: string, _i: any) => new Response(null, { status: 204 }))
  expect(await dispatchSyncWorkflow('tok', f as any)).toEqual({ ok: true })
  const [url, init] = f.mock.calls[0] as any
  expect(url).toBe(DISPATCH_URL)
  expect(init.method).toBe('POST')
  expect(init.headers.Authorization).toBe('Bearer tok')
  expect(init.headers.Accept).toBe('application/vnd.github+json')
  expect(init.headers['X-GitHub-Api-Version']).toBe('2022-11-28')
  expect(init.headers['User-Agent']).toBe('skouth-webhook')
  expect(JSON.parse(init.body)).toEqual({ ref: 'main', inputs: { source: 'webhook' } })
})

test('401 / 404 / 500 → ok:false พร้อม status', async () => {
  for (const s of [401, 404, 500]) {
    const f = vi.fn(async () => new Response('{"message":"x"}', { status: s }))
    expect(await dispatchSyncWorkflow('tok', f as any)).toMatchObject({ ok: false, status: s })
  }
})

// 200 ไม่ใช่คำตอบปกติของ endpoint นี้ (ตอบ 204 เสมอเมื่อสำเร็จ) — ไม่นับเป็นสำเร็จ
test('200 → ok:false', async () => {
  const f = vi.fn(async () => new Response('{}', { status: 200 }))
  expect(await dispatchSyncWorkflow('tok', f as any)).toMatchObject({ ok: false, status: 200 })
})

test('fetch โยน (network) → ok:false status null', async () => {
  const f = vi.fn(async () => {
    throw new TypeError('fetch failed')
  })
  expect(await dispatchSyncWorkflow('tok', f as any)).toMatchObject({ ok: false, status: null })
})

test('ค้างเกิน timeout → ยกเลิกและ ok:false', async () => {
  const f = vi.fn(
    (_u: string, init: any) =>
      new Promise<Response>((_r, rej) =>
        init.signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))
      )
  )
  expect(await dispatchSyncWorkflow('tok', f as any, 20)).toMatchObject({ ok: false, status: null })
})

test('token ว่าง → ok:false ไม่เรียก fetch', async () => {
  const f = vi.fn()
  expect(await dispatchSyncWorkflow('  ', f as any)).toMatchObject({ ok: false })
  expect(f).not.toHaveBeenCalled()
})
