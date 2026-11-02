import { timingSafeEqual } from 'node:crypto'

// ตัดสินว่าจะรับ webhook จาก PhantomBuster หรือไม่ — ฟังก์ชันบริสุทธิ์ ไม่แตะเครือข่าย
//
// **กติกาที่บังคับรูปร่างของ status** (เอกสาร PhantomBuster "Webhook errors")
// PhantomBuster ถอด webhook ออกจากการตั้งค่าเมื่อได้ status 4xx จึงตอบ 4xx ได้กรณีเดียว
// คือรหัสลับผิด (ผู้ส่งตั้งค่าผิดจริง) ความผิดฝั่งเรา (env ไม่ได้ตั้ง) ตอบ 503
// ส่วนคำขอที่ถูกต้องแต่ไม่ต้องทำอะไร (phantom ล้มเหลว, agent อื่น, body เสีย) ตอบ 200
//
// ดู docs/superpowers/specs/2026-11-02-phantombuster-webhook-design.md
export type WebhookDecision =
  | { action: 'reject'; status: 401 | 503; reason: string }
  | { action: 'ignore'; status: 200; reason: string }
  | { action: 'dispatch' }

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  // timingSafeEqual โยน error เมื่อความยาวต่างกัน — ต้องเช็คก่อน
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function decideWebhook(input: {
  providedSecret: string | null
  expectedSecret: string | undefined
  expectedAgentId: string | undefined
  rawBody: string
}): WebhookDecision {
  // ปิดประตูเป็นค่าตั้งต้น — หลักเดียวกับ decideAccess ถ้าไม่ได้ตั้งรหัสลับ
  // "ว่างตรงกับว่าง" ต้องไม่ผ่าน
  const expected = (input.expectedSecret ?? '').trim()
  if (!expected) return { action: 'reject', status: 503, reason: 'PHANTOMBUSTER_WEBHOOK_SECRET is not set' }

  // ตรวจรหัสลับก่อนอ่านอะไรอื่น
  if (input.providedSecret === null || !secretMatches(input.providedSecret, expected)) {
    return { action: 'reject', status: 401, reason: 'bad secret' }
  }

  let body: unknown
  try {
    body = JSON.parse(input.rawBody)
  } catch {
    return { action: 'ignore', status: 200, reason: 'body is not JSON' }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { action: 'ignore', status: 200, reason: 'body is not an object' }
  }
  const payload = body as { agentId?: unknown; exitCode?: unknown }

  const expectedAgent = (input.expectedAgentId ?? '').trim()
  // ความผิดฝั่งเรา — ตอบ 503 ไม่ใช่ 200 ไม่งั้นการนำเข้าหยุดเงียบๆ โดยผู้ส่งไม่รู้
  if (!expectedAgent) return { action: 'reject', status: 503, reason: 'PHANTOMBUSTER_AGENT_ID is not set' }
  if (String(payload.agentId ?? '').trim() !== expectedAgent) {
    return { action: 'ignore', status: 200, reason: 'different agent' }
  }

  // เอกสารระบุเป็น number แต่รับ "0" ด้วย — ถ้ามาเป็นสตริงแล้วเราเมิน การนำเข้าจะไม่เกิดเลยโดยไม่มีอาการ
  if (payload.exitCode !== 0 && payload.exitCode !== '0') {
    return { action: 'ignore', status: 200, reason: `phantom did not succeed (exitCode ${String(payload.exitCode)})` }
  }

  return { action: 'dispatch' }
}
