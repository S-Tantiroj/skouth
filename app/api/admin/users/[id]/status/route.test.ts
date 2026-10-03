import { vi } from 'vitest'

// จำลอง supabase client แบบต่อลูกโซ่ (รูปแบบเดียวกับ route.delete.test.ts)
//
// **`updateCalls` คือหัวใจของไฟล์นี้** — สิ่งที่ต้องพิสูจน์ไม่ใช่ว่า route คืน 403
// แต่คือว่ามัน **ปฏิเสธก่อนแตะฐานข้อมูล** ประตูที่อยู่หลังการเขียนคืนสถานะถูก
// แต่ข้อมูลเปลี่ยนไปแล้วจริง ซึ่งคือช่องโหว่ที่ `/api/ingest` เคยมีมาก่อน
const h = vi.hoisted(() => ({
  session: null as { userId: string; role: string } | null,
  /** แถวเดิมที่อ่านมาก่อนเขียน ใช้ทำข้อความบันทึก */
  beforeRow: null as any,
  updateError: null as any,
  /** ค่าที่ถูกส่งเข้า .update() จริง */
  updateCalls: [] as any[],
  /** เงื่อนไขของ update — ใช้ยืนยันว่าเล็งไปที่ id ที่ถูกต้อง */
  updateFilters: [] as Array<[string, string]>,
}))

vi.mock('@/lib/auth/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/session')>()),
  getSession: async () => h.session as any,
}))

vi.mock('@/lib/supabase/server', () => ({
  getServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: function (this: any) {
          return this
        },
        maybeSingle: async () => ({ data: h.beforeRow, error: null }),
      }),
      update: (patch: any) => {
        h.updateCalls.push(patch)
        const chain: any = {
          eq: (col: string, val: string) => {
            h.updateFilters.push([col, val])
            return chain
          },
          then: (resolve: any) => resolve({ error: h.updateError }),
        }
        return chain
      },
    }),
  }),
}))

// ประกาศพารามิเตอร์ให้ตรงกับที่เรียกจริง ไม่งั้น TS อนุมานว่ารับ 0 อาร์กิวเมนต์
// แล้วบรรทัดที่เรียก logMock(i) เป็น TS2554 ที่ `npm test` มองไม่เห็น
const logMock = vi.fn(async (_input?: unknown) => {})
vi.mock('@/lib/activity/log', () => ({ logActivity: (i: any) => logMock(i) }))

import { POST } from './route'

const call = (id = 'target-1', body: unknown = { status: 'approved' }) =>
  POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }) as any, {
    params: Promise.resolve({ id }),
  } as any)

beforeEach(() => {
  h.session = { userId: 'admin-1', role: 'admin' }
  h.beforeRow = { display_name: 'สมชาย', email: 'somchai@example.com', status: 'pending' }
  h.updateError = null
  h.updateCalls = []
  h.updateFilters = []
  logMock.mockClear()
})

test('ไม่มีเซสชันได้ 403 และไม่เกิดการเขียน', async () => {
  h.session = null
  const res = await call()
  expect(res.status).toBe(403)
  expect(h.updateCalls).toEqual([])
})

test('member เรียกแล้วได้ 403 และไม่เกิดการเขียนลงฐาน', async () => {
  h.session = { userId: 'u1', role: 'member' }
  const res = await call()
  expect(res.status).toBe(403)
  expect(h.updateCalls).toEqual([])
})

// **data_manager ต้องถูกปิดด้วย** แม้จะเป็น role ที่สูงกว่า member — การอนุมัติบัญชี
// คือการให้สิทธิ์เข้าระบบ ซึ่งอยู่ระดับเดียวกับการเปลี่ยน role ไม่ใช่งานจัดการข้อมูล
test('data_manager เรียกแล้วได้ 403 และไม่เกิดการเขียน', async () => {
  h.session = { userId: 'u2', role: 'data_manager' }
  const res = await call()
  expect(res.status).toBe(403)
  expect(h.updateCalls).toEqual([])
})

// getSession cast ค่าจาก profiles.role ด้วย `as Role` โดยไม่ตรวจ — ROLE_RANK[unknown] ?? 0
// ต้องปิดประตู ไม่ใช่เปิด
test('role ที่ enum ไม่รู้จักถูกปิดประตู', async () => {
  h.session = { userId: 'u3', role: 'superuser' }
  const res = await call()
  expect(res.status).toBe(403)
  expect(h.updateCalls).toEqual([])
})

test('ค่า status ที่ไม่ใช่ approved หรือ rejected ได้ 400 และไม่เกิดการเขียน', async () => {
  for (const bad of [{ status: 'pending' }, { status: 'weird' }, { status: null }, {}]) {
    h.updateCalls = []
    const res = await call('target-1', bad)
    expect(res.status).toBe(400)
    expect(h.updateCalls).toEqual([])
  }
})

// **กันการล็อกตัวเองออก** หลักเดียวกับ lib/auth/roleChange.ts — endpoint นี้เป็น
// ทางเดียวในแอปที่เปลี่ยนสถานะได้ แอดมินที่ปฏิเสธตัวเองจะเข้าระบบไม่ได้อีก
// และถ้าเป็นแอดมินคนเดียวจะไม่เหลือใครกู้ให้ ต้องไปแก้ที่ Supabase SQL editor
test('แอดมินเปลี่ยนสถานะตัวเองไม่ได้ แม้เป็นการอนุมัติ', async () => {
  for (const s of ['approved', 'rejected']) {
    h.updateCalls = []
    const res = await call('admin-1', { status: s })
    expect(res.status).toBe(400)
    expect(h.updateCalls).toEqual([])
  }
})

test('แอดมินอนุมัติบัญชีอื่นสำเร็จ และเล็งไปที่ id ที่ถูกต้อง', async () => {
  const res = await call('target-1', { status: 'approved' })
  expect(res.status).toBe(200)
  expect(h.updateCalls).toEqual([{ status: 'approved' }])
  expect(h.updateFilters).toContainEqual(['id', 'target-1'])
})

test('แอดมินปฏิเสธบัญชีอื่นได้', async () => {
  const res = await call('target-1', { status: 'rejected' })
  expect(res.status).toBe(200)
  expect(h.updateCalls).toEqual([{ status: 'rejected' }])
})

test('บันทึกลง activity_log ด้วย action account_status หลังเขียนสำเร็จ', async () => {
  await call('target-1', { status: 'approved' })
  expect(logMock).toHaveBeenCalledTimes(1)
  const entry = logMock.mock.calls[0][0] as any
  expect(entry.action).toBe('account_status')
  expect(entry.entityType).toBe('user')
  expect(entry.entityId).toBe('target-1')
  // actorId ต้องมาจากเซสชันเสมอ ไม่ใช่จาก body ที่ผู้เรียกควบคุมได้
  expect(entry.actorId).toBe('admin-1')
  // ข้อความต้องอ่านรู้เรื่องแม้ผู้ใช้คนนั้นถูกลบทีหลัง — ไม่ join กลับ
  expect(entry.summary).toContain('สมชาย')
})

test('เขียนฐานข้อมูลล้มเหลว → 500 และไม่บันทึกกิจกรรม', async () => {
  h.updateError = { message: 'relation "profiles" column "status" ...' }
  const res = await call('target-1', { status: 'approved' })
  expect(res.status).toBe(500)
  // บันทึกว่าทำสำเร็จทั้งที่ล้มเหลว แย่กว่าไม่มีบันทึก — มันทำให้หลักฐานโกหก
  expect(logMock).not.toHaveBeenCalled()
})

test('ไม่ส่งข้อความ Postgres ดิบออกไป', async () => {
  h.updateError = { message: 'relation "profiles" does not exist' }
  const res = await call('target-1', { status: 'approved' })
  const json = await res.json()
  expect(JSON.stringify(json)).not.toContain('profiles')
  expect(JSON.stringify(json)).not.toContain('relation')
})

// body ที่ไม่ใช่ JSON ต้องไม่ทำให้ route ระเบิดเป็น 500 ที่อธิบายไม่ได้
// (POST /api/jobs เดิมไม่มี try/catch เลย แล้วเจอปัญหาแบบเดียวกัน)
test('body ที่ไม่ใช่ JSON ได้ 400 ไม่ใช่ 500', async () => {
  const res = await POST(
    new Request('http://x', { method: 'POST', body: 'ไม่ใช่ json' }) as any,
    { params: Promise.resolve({ id: 'target-1' }) } as any
  )
  expect(res.status).toBe(400)
  expect(h.updateCalls).toEqual([])
})
