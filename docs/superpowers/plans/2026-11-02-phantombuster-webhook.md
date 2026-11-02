# PhantomBuster Webhook → GitHub Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เมื่อ phantom รันเสร็จสำเร็จ PhantomBuster เรียก webhook บน Vercel แล้ว route สั่ง GitHub ให้รัน workflow `sync-candidates` เดิมทันที

**Architecture:** ตรรกะตัดสินว่าจะยอมรับ webhook หรือไม่เป็นฟังก์ชันบริสุทธิ์ (`lib/ingest/webhookGate.ts`) การเรียก GitHub แยกไฟล์ (`lib/ingest/githubDispatch.ts`) route เป็นแค่ตัวประกอบสองชิ้นนี้ สคริปต์นำเข้าเดิมไม่แตะ ยกเว้นป้าย `trigger`

**Tech Stack:** Next.js 15 Route Handler (TypeScript), Vitest (`environment: 'node'`), GitHub REST API `workflow_dispatch`, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-11-02-phantombuster-webhook-design.md`

## Global Constraints

- ชื่อ env: `PHANTOMBUSTER_WEBHOOK_SECRET`, `GITHUB_DISPATCH_TOKEN`, `PHANTOMBUSTER_AGENT_ID` (มีอยู่แล้ว) — ห้ามขึ้นต้น `NEXT_PUBLIC_`
- route: `POST /api/webhooks/phantombuster` รหัสลับรับจาก query `?secret=` เท่านั้น (PhantomBuster ตั้ง header ไม่ได้)
- status: รหัสลับผิด → 401 · env รหัสลับไม่ได้ตั้ง → 503 · body เสีย / agentId ไม่ตรง / exitCode ≠ 0 → 200 · สั่ง GitHub สำเร็จ → 202 · สั่ง GitHub ล้มเหลว → 502 — **ห้ามตอบ 4xx นอกจากกรณีรหัสลับผิด** (4xx ทำให้ PhantomBuster ถอด webhook)
- route ต้องตอบภายใน 11 วินาที → timeout การเรียก GitHub = **3500 ms** (PhantomBuster รอ header 5 วินาที — แก้จาก 8000 หลัง final review)
- GitHub: `POST https://api.github.com/repos/S-Tantiroj/skouth/actions/workflows/sync-candidates.yml/dispatches` body `{"ref":"main","inputs":{"source":"webhook"}}` สำเร็จ = **204**
- header GitHub: `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`, `User-Agent: skouth-webhook`
- ค่า `ingest_runs.trigger`: `'scheduled' | 'manual' | 'webhook'` — ไม่มี migration (คอลัมน์ `text` ไม่มี CHECK)
- ไม่ส่งข้อความ error ดิบของ GitHub กลับไปในคำตอบ (log ฝั่งเซิร์ฟเวอร์ได้)
- `npx vitest` รันใน Cowork sandbox ไม่ได้ (native binary) — รันบน Windows; ใน sandbox ใช้ `npm run typecheck` (baseline 0 error)

## Review Focus

1. รหัสลับใน query **ยาวไม่เท่า** ค่าที่ตั้ง → `crypto.timingSafeEqual` โยน error ถ้าความยาวต่าง ต้องได้ 401 ไม่ใช่ 500
2. env รหัสลับเป็น **สตริงว่างหรือช่องว่างล้วน** → นับว่าไม่ได้ตั้ง (503) ไม่ใช่ "รหัสลับว่างตรงกับ `?secret=` ว่าง"
3. `agentId` มาเป็น **ตัวเลข** แทนสตริง หรือมีช่องว่าง → เทียบด้วย `String(x).trim()`
4. `exitCode` มาเป็น **สตริง `"0"`** หรือ **ไม่มีฟิลด์** → `"0"` นับว่าสำเร็จ, ไม่มีฟิลด์ / null นับว่าไม่สำเร็จ (200 ไม่สั่ง)
5. GitHub **ค้าง** ไม่ตอบ → ยกเลิกที่ 3500 ms แล้วได้ 502 ไม่ใช่ปล่อยให้ PhantomBuster timeout

---

### Task 1: ตรรกะตัดสิน webhook (ฟังก์ชันบริสุทธิ์)

**Files:**
- Create: `lib/ingest/webhookGate.ts`
- Test: `lib/ingest/webhookGate.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type WebhookDecision =
    | { action: 'reject'; status: 401 | 503; reason: string }
    | { action: 'ignore'; status: 200; reason: string }
    | { action: 'dispatch' }
  export function decideWebhook(input: {
    providedSecret: string | null
    expectedSecret: string | undefined
    expectedAgentId: string | undefined
    rawBody: string
  }): WebhookDecision
  ```

- [ ] **Step 1: Write the failing tests** (`webhookGate.test.ts`, ค่าคงที่ hardcode ทั้งหมด)

  ```ts
  const ok = { providedSecret: 's3cret', expectedSecret: 's3cret', expectedAgentId: '1955470235787672',
    rawBody: JSON.stringify({ agentId: '1955470235787672', exitCode: 0, exitMessage: 'finished' }) }
  test('ครบทุกเงื่อนไข → dispatch', () => expect(decideWebhook(ok)).toEqual({ action: 'dispatch' }))
  test('รหัสลับผิด → 401', () => expect(decideWebhook({ ...ok, providedSecret: 'wrong!' })).toMatchObject({ action: 'reject', status: 401 }))
  test('รหัสลับยาวไม่เท่า → 401 ไม่โยน', () => expect(decideWebhook({ ...ok, providedSecret: 'x' })).toMatchObject({ status: 401 }))
  test('ไม่มี ?secret → 401', () => expect(decideWebhook({ ...ok, providedSecret: null })).toMatchObject({ status: 401 }))
  test('env รหัสลับไม่ได้ตั้ง → 503', () => expect(decideWebhook({ ...ok, expectedSecret: undefined })).toMatchObject({ action: 'reject', status: 503 }))
  test('env รหัสลับว่าง/ช่องว่าง → 503 แม้ ?secret ว่าง', () =>
    expect(decideWebhook({ ...ok, expectedSecret: '  ', providedSecret: '' })).toMatchObject({ status: 503 }))
  test('รหัสลับผิด ตรวจก่อน body เสีย', () =>
    expect(decideWebhook({ ...ok, providedSecret: 'bad', rawBody: 'not json' })).toMatchObject({ status: 401 }))
  test('body ไม่ใช่ JSON → ignore 200', () => expect(decideWebhook({ ...ok, rawBody: '<html>' })).toMatchObject({ action: 'ignore', status: 200 }))
  test('agentId ไม่ตรง → ignore', () =>
    expect(decideWebhook({ ...ok, rawBody: JSON.stringify({ agentId: '999', exitCode: 0 }) })).toMatchObject({ action: 'ignore' }))
  test('agentId เป็นตัวเลข → dispatch', () =>
    expect(decideWebhook({ ...ok, rawBody: JSON.stringify({ agentId: 1955470235787672, exitCode: 0 }) })).toEqual({ action: 'dispatch' }))
  test('env agentId ไม่ได้ตั้ง → 503 (แก้จาก ignore หลัง final review)', () => expect(decideWebhook({ ...ok, expectedAgentId: undefined })).toMatchObject({ action: 'reject', status: 503 }))
  test('exitCode 1 → ignore', () =>
    expect(decideWebhook({ ...ok, rawBody: JSON.stringify({ agentId: '1955470235787672', exitCode: 1 }) })).toMatchObject({ action: 'ignore' }))
  test('exitCode "0" → dispatch', () =>
    expect(decideWebhook({ ...ok, rawBody: JSON.stringify({ agentId: '1955470235787672', exitCode: '0' }) })).toEqual({ action: 'dispatch' }))
  test('ไม่มี exitCode / null → ignore', () => {
    expect(decideWebhook({ ...ok, rawBody: JSON.stringify({ agentId: '1955470235787672' }) })).toMatchObject({ action: 'ignore' })
    expect(decideWebhook({ ...ok, rawBody: JSON.stringify({ agentId: '1955470235787672', exitCode: null }) })).toMatchObject({ action: 'ignore' })
  })
  ```

- [ ] **Step 2: Run to verify it fails** — Windows: `npx vitest run lib/ingest/webhookGate.test.ts` → FAIL (module not found)

- [ ] **Step 3: Implement `decideWebhook` in `lib/ingest/webhookGate.ts`**
  ลำดับ: env รหัสลับ (trim ว่าง → 503) → เทียบรหัสลับด้วย `timingSafeEqual` จาก `node:crypto` บน Buffer (ความยาวต่าง → 401 ก่อนเรียก) → `JSON.parse(rawBody)` ใน try (ล้ม/ไม่ใช่ object → ignore) → agentId (`String(x ?? '').trim()` เทียบ env trim, env ว่าง → ignore) → exitCode (`exitCode === 0 || exitCode === '0'` เท่านั้น) → dispatch · `reason` เป็นข้อความสั้นสำหรับ log

- [ ] **Step 4: Run tests** — Windows: `npx vitest run lib/ingest/webhookGate.test.ts` → PASS · sandbox: `npm run typecheck` → 0 errors

- [ ] **Step 5: Commit**
  ```bash
  git add lib/ingest/webhookGate.ts lib/ingest/webhookGate.test.ts
  git commit -m "feat(ingest): ตรรกะตัดสิน PhantomBuster webhook"
  ```

---

### Task 2: สั่ง GitHub รัน workflow

**Files:**
- Create: `lib/ingest/githubDispatch.ts`
- Test: `lib/ingest/githubDispatch.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const DISPATCH_URL: string   // ค่าตาม Global Constraints
  export const DISPATCH_TIMEOUT_MS = 3500
  export async function dispatchSyncWorkflow(
    token: string,
    fetchImpl: typeof fetch = fetch,
    timeoutMs: number = DISPATCH_TIMEOUT_MS,
  ): Promise<{ ok: true } | { ok: false; status: number | null; reason: string }>
  ```

- [ ] **Step 1: Write the failing tests** (mock `fetchImpl` ด้วย `vi.fn`)

  ```ts
  test('URL ตรงกับ repo และไฟล์ workflow จริง', () =>
    expect(DISPATCH_URL).toBe('https://api.github.com/repos/S-Tantiroj/skouth/actions/workflows/sync-candidates.yml/dispatches'))
  test('204 → ok และส่ง method/header/body ถูก', async () => {
    const f = vi.fn(async () => new Response(null, { status: 204 }))
    expect(await dispatchSyncWorkflow('tok', f as any)).toEqual({ ok: true })
    const [url, init] = f.mock.calls[0] as any
    expect(url).toBe(DISPATCH_URL)
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer tok')
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
  test('fetch โยน (network) → ok:false status null', async () => {
    const f = vi.fn(async () => { throw new TypeError('fetch failed') })
    expect(await dispatchSyncWorkflow('tok', f as any)).toMatchObject({ ok: false, status: null })
  })
  test('ค้างเกิน timeout → ยกเลิกและ ok:false', async () => {
    const f = vi.fn((_u: string, init: any) => new Promise((_r, rej) =>
      init.signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')))))
    expect(await dispatchSyncWorkflow('tok', f as any, 20)).toMatchObject({ ok: false, status: null })
  })
  test('token ว่าง → ok:false ไม่เรียก fetch', async () => {
    const f = vi.fn()
    expect(await dispatchSyncWorkflow('  ', f as any)).toMatchObject({ ok: false })
    expect(f).not.toHaveBeenCalled()
  })
  ```

- [ ] **Step 2: Run to verify it fails** — Windows: `npx vitest run lib/ingest/githubDispatch.test.ts` → FAIL

- [ ] **Step 3: Implement `dispatchSyncWorkflow` in `lib/ingest/githubDispatch.ts`** — `AbortController` + `setTimeout(timeoutMs)` ล้างใน `finally` · สำเร็จเฉพาะ `res.status === 204` · ไม่โยนออกไปเลย ทุกความล้มเหลวคืน `{ ok: false }`

- [ ] **Step 4: Run tests** — Windows: PASS · sandbox: `npm run typecheck` → 0 errors

- [ ] **Step 5: Commit**
  ```bash
  git add lib/ingest/githubDispatch.ts lib/ingest/githubDispatch.test.ts
  git commit -m "feat(ingest): สั่ง GitHub รัน sync-candidates ผ่าน workflow_dispatch"
  ```

---

### Task 3: Route `POST /api/webhooks/phantombuster`

**Files:**
- Create: `app/api/webhooks/phantombuster/route.ts`
- Test: `app/api/webhooks/phantombuster/route.test.ts`

**Interfaces:**
- Consumes: `decideWebhook` (Task 1), `dispatchSyncWorkflow` (Task 2)
- Produces: `export async function POST(req: Request): Promise<Response>`

- [ ] **Step 1: Write the failing tests**
  ใช้ `decideWebhook` ตัวจริง (ห้าม stub ฟังก์ชันที่กำลังทดสอบ — หลักใน CLAUDE.md) mock เฉพาะ `@/lib/ingest/githubDispatch` ด้วย `vi.hoisted` ให้แต่ละเทสต์ตั้งผลได้ · ตั้ง env ใน `beforeEach`: `PHANTOMBUSTER_WEBHOOK_SECRET='s3cret'`, `PHANTOMBUSTER_AGENT_ID='1955470235787672'`, `GITHUB_DISPATCH_TOKEN='tok'` และคืนค่าเดิมใน `afterEach`

  - `'สำเร็จ → 202 และสั่ง GitHub ด้วย token จาก env'` — `POST(new Request('http://x/api/webhooks/phantombuster?secret=s3cret', { method:'POST', body: JSON.stringify({ agentId:'1955470235787672', exitCode:0 }) }))` → status 202, dispatch mock ถูกเรียก 1 ครั้งด้วย `'tok'`
  - `'รหัสลับผิด → 401 และไม่สั่ง GitHub'` — `?secret=nope` → 401, dispatch ไม่ถูกเรียก
  - `'env รหัสลับไม่ได้ตั้ง → 503 และไม่สั่ง GitHub'`
  - `'exitCode 1 → 200 และไม่สั่ง GitHub'`
  - `'GitHub ล้มเหลว → 502 ไม่ใช่ 4xx'` — dispatch mock คืน `{ ok:false, status:401, reason:'bad token' }` → status 502 และ body ไม่มีคำว่า `bad token`
  - `'GITHUB_DISPATCH_TOKEN ไม่ได้ตั้ง → 502'` — ลบ env แล้วส่งคำขอถูกต้อง → 502 (ให้ `dispatchSyncWorkflow('')` คืน ok:false ตามจริง หรือ route ตรวจเองก็ได้ ผลต้องเป็น 502)
  - `'secret ใน query ถูก decode'` — env `'a+b/c'`, query `?secret=a%2Bb%2Fc` → 202

- [ ] **Step 2: Run to verify it fails** — Windows: `npx vitest run app/api/webhooks/phantombuster/route.test.ts` → FAIL

- [ ] **Step 3: Implement `POST`** — อ่าน `new URL(req.url).searchParams.get('secret')`, `await req.text()` (ไม่พึ่ง content-type), เรียก `decideWebhook` ด้วยค่าจาก `process.env` · reject/ignore → `Response.json({ ok: false }, { status })` · dispatch → `dispatchSyncWorkflow(process.env.GITHUB_DISPATCH_TOKEN ?? '')` → 202 หรือ 502 · `console.log`/`console.error` พร้อม `reason` · `export const dynamic = 'force-dynamic'` · ไม่เรียก `getSession` (route สาธารณะ)

- [ ] **Step 4: Run tests** — Windows: `npx vitest run app/api/webhooks/phantombuster/route.test.ts` → PASS · `npm test` ทั้งชุด → เขียว · sandbox: `npm run typecheck` → 0 errors

- [ ] **Step 5: Commit**
  ```bash
  git add app/api/webhooks/phantombuster/
  git commit -m "feat(api): webhook รับสัญญาณ PhantomBuster แล้วสั่งรัน sync-candidates"
  ```

---

### Task 4: Workflow input, ป้าย trigger, ข้อความหน้า /import/auto และเอกสาร

**Files:**
- Create: `lib/ingest/ingestTrigger.ts`, `lib/ingest/ingestTrigger.test.ts`
- Modify: `scripts/sync-phantombuster.ts` (บรรทัด `trigger: process.env.GITHUB_EVENT_NAME === 'schedule' ? ...`)
- Modify: `.github/workflows/sync-candidates.yml` (`workflow_dispatch:` และ env ของขั้นรันสคริปต์)
- Modify: `app/(app)/import/auto/page.tsx` (การ์ดสถานะ `config.kind === 'ok'`)
- Modify: `CLAUDE.md` (Phase 8)

**Interfaces:**
- Produces: `export function ingestTrigger(eventName: string | undefined, runSource: string | undefined): 'scheduled' | 'manual' | 'webhook'`

- [ ] **Step 1: Write the failing tests** (`ingestTrigger.test.ts`)
  ```ts
  test('schedule → scheduled', () => expect(ingestTrigger('schedule', undefined)).toBe('scheduled'))
  test('workflow_dispatch + webhook → webhook', () => expect(ingestTrigger('workflow_dispatch', 'webhook')).toBe('webhook'))
  test('workflow_dispatch + manual/ว่าง → manual', () => {
    expect(ingestTrigger('workflow_dispatch', 'manual')).toBe('manual')
    expect(ingestTrigger('workflow_dispatch', '')).toBe('manual')
  })
  test('รันบนเครื่อง (ไม่มี env) → manual', () => expect(ingestTrigger(undefined, undefined)).toBe('manual'))
  test('ค่าแปลกใน RUN_SOURCE → manual ไม่ใช่ส่งต่อดิบ', () => expect(ingestTrigger('workflow_dispatch', 'evil')).toBe('manual'))
  ```

- [ ] **Step 2: Run to verify it fails** — Windows: `npx vitest run lib/ingest/ingestTrigger.test.ts` → FAIL

- [ ] **Step 3: Implement `ingestTrigger`** แล้วแทนบรรทัด trigger ในสคริปต์ด้วย `trigger: ingestTrigger(process.env.GITHUB_EVENT_NAME, process.env.RUN_SOURCE)`

- [ ] **Step 4: แก้ workflow**
  ```yaml
  workflow_dispatch:
    inputs:
      source:
        description: 'ที่มาของการรัน'
        required: false
        default: 'manual'
  ```
  และเพิ่ม `RUN_SOURCE: ${{ inputs.source }}` ใน `env:` ของขั้น `npx tsx scripts/sync-phantombuster.ts` · ห้ามแตะบล็อก `schedule:` ที่คอมเมนต์ไว้

- [ ] **Step 5: แก้ข้อความการ์ดสถานะ `ok`** ใน `/import/auto` — บอกว่าการดึงเกิดได้ 2 ทาง: กด Run workflow บน GitHub หรือ webhook จาก PhantomBuster (ตั้ง URL `…/api/webhooks/phantombuster?secret=…` ใน Advanced Notification Settings ของ phantom) และตาราง cron ยังเป็นทางเลือกเสริม — **ห้ามแสดงค่ารหัสลับ**

- [ ] **Step 6: แก้ `CLAUDE.md` Phase 8** — แทนบรรทัด "ยังไม่ได้ยืนยัน `lib/ingest/phantombuster.ts` กับ API จริง" ด้วย: ยืนยันกับ API จริงแล้ว 2026-11-02 (phantom LinkedIn Search Export, agent 1955470235787672, 12 แถว → 11 เข้าระบบ 1 เข้าคิว, รันซ้ำ skipped_unchanged 11) และเพิ่มหัวข้อ webhook: route, env สองตัวใน Vercel, กติกา 4xx = ถอด webhook, เหตุผลที่ใช้ `workflow_dispatch` (Actions: write แทน Contents: write), ค่า trigger `'webhook'`

- [ ] **Step 7: Run tests** — Windows: `npm test` → เขียวทั้งชุด · sandbox: `npm run typecheck` → 0 errors

- [ ] **Step 8: Commit**
  ```bash
  git add lib/ingest/ingestTrigger.ts lib/ingest/ingestTrigger.test.ts scripts/sync-phantombuster.ts .github/workflows/sync-candidates.yml "app/(app)/import/auto/page.tsx" CLAUDE.md docs/superpowers/specs/2026-11-02-phantombuster-webhook-design.md docs/superpowers/plans/2026-11-02-phantombuster-webhook.md
  git commit -m "feat(ingest): ป้าย trigger webhook + workflow input + เอกสาร"
  ```

---

### Task 5: ตั้งค่าและทดสอบจริง (ผู้ใช้ทำ — ไม่มีโค้ด)

- [ ] **Step 1:** push ขึ้น `main` → รอ Vercel deploy เป็น Ready
- [ ] **Step 2:** สร้าง fine-grained PAT (GitHub → Settings → Developer settings → Fine-grained tokens) Repository access = เฉพาะ `S-Tantiroj/skouth`, Permissions = **Actions: Read and write** เท่านั้น
- [ ] **Step 3:** Vercel → Environment Variables (Production, ชนิด Secret): `GITHUB_DISPATCH_TOKEN` = PAT, `PHANTOMBUSTER_WEBHOOK_SECRET` = สตริงสุ่ม (PowerShell, hex 64 ตัว: `$b=New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); ($b|%{$_.ToString('x2')}) -join ''`) → Redeploy
- [ ] **Step 4:** PhantomBuster → phantom DEMO → Settings → Advanced Notification Settings → Webhook = `https://skouth.vercel.app/api/webhooks/phantombuster?secret=<ค่าเดียวกัน>`
- [ ] **Step 5:** กด Launch ที่ phantom → รอจบ → GitHub Actions มีรอบใหม่ (event `workflow_dispatch`) → `/import/auto` มีแถวที่มา `phantombuster · webhook`
- [ ] **Step 6 (ตรวจด่านความปลอดภัย):** PowerShell
  `Invoke-WebRequest -Method POST -Uri "https://skouth.vercel.app/api/webhooks/phantombuster?secret=wrong" -Body '{}' -SkipHttpErrorCheck` → StatusCode **401** และ Actions ไม่มีรอบใหม่
