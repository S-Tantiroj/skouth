// สั่ง GitHub ให้รัน workflow `sync-candidates` ผ่าน workflow_dispatch API
//
// **ใช้ workflow_dispatch ไม่ใช่ repository_dispatch โดยตั้งใจ** — repository_dispatch
// ต้องใช้ token สิทธิ์ Contents: write ซึ่งแก้โค้ดใน repo ได้ ส่วนตัวนี้ใช้แค่
// Actions: write ถ้า token รั่ว ความเสียหายแคบกว่ามาก
//
// **ไม่โยน error ออกไปเลย** — ผู้เรียกคือ webhook route ซึ่งต้องตอบ 5xx เสมอเมื่อ
// ฝั่งเราล้มเหลว (4xx ทำให้ PhantomBuster ถอด webhook) การคืนผลเป็นค่าทำให้
// route ตัดสินได้ที่เดียวโดยไม่ต้องเดาชนิดของ error
//
// ดู docs/superpowers/specs/2026-11-02-phantombuster-webhook-design.md
export const DISPATCH_URL =
  'https://api.github.com/repos/S-Tantiroj/skouth/actions/workflows/sync-candidates.yml/dispatches'

/**
 * PhantomBuster แบ่งเพดาน 11 วินาทีเป็น เปิด connection 5 + **รอ response header 5** + อ่าน 1
 * route ส่ง header หลังเรียก GitHub เสร็จ จึงต้องต่ำกว่า 5 วินาทีพร้อมเผื่อ cold start ของ Vercel
 */
export const DISPATCH_TIMEOUT_MS = 3500

export type DispatchResult = { ok: true } | { ok: false; status: number | null; reason: string }

export async function dispatchSyncWorkflow(
  token: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = DISPATCH_TIMEOUT_MS
): Promise<DispatchResult> {
  const t = token.trim()
  if (!t) return { ok: false, status: null, reason: 'GITHUB_DISPATCH_TOKEN is not set' }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetchImpl(DISPATCH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${t}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'skouth-webhook',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main', inputs: { source: 'webhook' } }),
      signal: ctrl.signal,
    })
    // endpoint นี้ตอบ 204 เสมอเมื่อสำเร็จ
    if (res.status === 204) return { ok: true }
    return { ok: false, status: res.status, reason: `github responded ${res.status}` }
  } catch (e: any) {
    const reason = e?.name === 'AbortError' ? `github did not respond within ${timeoutMs}ms` : String(e?.message ?? e)
    return { ok: false, status: null, reason }
  } finally {
    clearTimeout(timer)
  }
}
