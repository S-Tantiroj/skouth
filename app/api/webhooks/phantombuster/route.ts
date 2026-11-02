import { decideWebhook } from '@/lib/ingest/webhookGate'
import { dispatchSyncWorkflow } from '@/lib/ingest/githubDispatch'

// รับสัญญาณจาก PhantomBuster เมื่อ phantom รันเสร็จ แล้วสั่ง GitHub รัน sync-candidates
//
// **route สาธารณะ ไม่มี session** — PhantomBuster ไม่มีคุกกี้ของเรา
// ด่านเดียวคือรหัสลับใน `?secret=` (PhantomBuster ตั้ง header เองไม่ได้)
// middleware ปล่อย /api/* ผ่านโดยไม่ redirect และ /api/webhooks ไม่อยู่ใน PROTECTED_PREFIXES
//
// **4xx เฉพาะรหัสลับผิดเท่านั้น** — PhantomBuster ถอด webhook เมื่อได้ 4xx
// ความล้มเหลวฝั่งเรา (GitHub ล่ม, token หมดอายุ) จึงตอบ 502
//
// ดู docs/superpowers/specs/2026-11-02-phantombuster-webhook-design.md
export const dynamic = 'force-dynamic'

export async function POST(req: Request): Promise<Response> {
  const providedSecret = new URL(req.url).searchParams.get('secret')
  // อ่านเป็นข้อความเอง ไม่พึ่ง content-type ที่ผู้ส่งตั้ง
  const rawBody = await req.text()

  const decision = decideWebhook({
    providedSecret,
    expectedSecret: process.env.PHANTOMBUSTER_WEBHOOK_SECRET,
    expectedAgentId: process.env.PHANTOMBUSTER_AGENT_ID,
    rawBody,
  })

  if (decision.action === 'reject') {
    console.error('phantombuster webhook rejected:', decision.reason)
    return Response.json({ ok: false }, { status: decision.status })
  }
  if (decision.action === 'ignore') {
    console.log('phantombuster webhook ignored:', decision.reason)
    return Response.json({ ok: false }, { status: decision.status })
  }

  const result = await dispatchSyncWorkflow(process.env.GITHUB_DISPATCH_TOKEN ?? '')
  if (!result.ok) {
    // เก็บรายละเอียดไว้ใน log ฝั่งเซิร์ฟเวอร์ ไม่ส่งข้อความของ GitHub กลับไป
    console.error('phantombuster webhook: github dispatch failed:', result.status, result.reason)
    return Response.json({ ok: false }, { status: 502 })
  }

  console.log('phantombuster webhook: sync-candidates dispatched')
  return Response.json({ ok: true }, { status: 202 })
}
