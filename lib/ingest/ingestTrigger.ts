// ค่า `ingest_runs.trigger` จาก environment ของ GitHub Actions
//
// `RUN_SOURCE` มาจาก input `source` ของ workflow_dispatch ซึ่ง webhook route ตั้งเป็น 'webhook'
// คอลัมน์เป็น text ไม่มี CHECK constraint (migration 013) จึงเพิ่มค่าใหม่ได้โดยไม่ต้อง migration
// แต่ค่าที่เขียนลงฐานต้องมาจากชุดนี้เท่านั้น — ไม่ส่งค่าดิบจาก input ต่อ
export type IngestTrigger = 'scheduled' | 'manual' | 'webhook'

export function ingestTrigger(eventName: string | undefined, runSource: string | undefined): IngestTrigger {
  if (eventName === 'schedule') return 'scheduled'
  if ((runSource ?? '').trim() === 'webhook') return 'webhook'
  return 'manual'
}
