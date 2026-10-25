import { getServerClient } from '@/lib/supabase/server'
import { analyzeCandidate } from './analyze'
import { requirementHash } from './cache'

// Cache-first deep score of a candidate against a free-text requirement. Shared
// by /api/analyze (search) and /api/jobs/[id]/analyze (job matching) so both
// reuse the same analyses cache keyed by (candidate_id, requirement_hash).
export async function scoreCandidateAgainst(
  candidateId: string,
  requirement: string,
  jobId?: string
): Promise<{ score: number; reasoning: string; cached: boolean }> {
  const db = getServerClient()
  const hash = requirementHash(requirement)

  // อ่าน cache ไม่ได้: บันทึก log แล้วคำนวณใหม่ ไม่ทำให้คำขอล้ม
  const { data: cached, error: cacheError } = await db
    .from('analyses')
    .select('score,reasoning')
    .eq('candidate_id', candidateId)
    .eq('requirement_hash', hash)
    .maybeSingle()
  if (cacheError) console.error('analyses cache read failed:', cacheError)
  if (cached) {
    return { score: (cached as any).score, reasoning: (cached as any).reasoning, cached: true }
  }

  // maybeSingle แยก "ไม่พบผู้สมัคร" (404) ออกจาก "อ่านฐานข้อมูลไม่ได้" (500)
  const { data: c, error: candidateError } = await db
    .from('candidates')
    .select('*, education(*), experience(*), candidate_skills(skills(name))')
    .eq('id', candidateId)
    .maybeSingle()
  if (candidateError) {
    console.error('candidate read failed:', candidateError)
    throw new Error('candidate read failed')
  }
  if (!c) throw new Error('candidate not found')

  const profile = {
    full_name: (c as any).full_name,
    headline: (c as any).headline,
    summary: (c as any).summary,
    source: (c as any).source,
    education: (c as any).education,
    experience: (c as any).experience,
    skills: (c as any).candidate_skills?.map((x: any) => x.skills.name),
  }

  const result = await analyzeCandidate(profile as any, requirement)
  // job_id: ลบงานแล้วผลประเมินถูกลบตาม (ค่าว่างเมื่อประเมินจากหน้าผู้สมัคร)
  // เขียน cache ไม่สำเร็จไม่โยน error เพราะได้คะแนนแล้ว
  const { error: insertError } = await db.from('analyses').insert({
    candidate_id: candidateId,
    requirement_text: requirement,
    requirement_hash: hash,
    score: result.score,
    reasoning: result.reasoning,
    job_id: jobId ?? null,
  })
  if (insertError) console.error('analyses cache write failed:', insertError)
  return { ...result, cached: false }
}
