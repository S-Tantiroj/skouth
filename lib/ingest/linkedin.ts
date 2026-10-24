import Papa from 'papaparse'
import type { CandidateInput } from './normalize'
import { parseLinkedInDateRange } from './linkedinDate'

// Normalize a header/key to a lookup token: lowercase, strip non-alphanumerics.
// "firstName" and "First Name" both become "firstname".
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// Returns the first alias that holds a non-empty value.
//
// Two PhantomBuster phantoms feed this parser and they name columns differently:
// the profile scraper uses linkedin*-prefixed names (linkedinJobTitle), the
// search export uses short ones (jobTitle). A file does not say which phantom
// produced it, so every field accepts both. Prefixed names are passed FIRST
// because the profile scraper is the richer source — if a file somehow carries
// both, that column is the one to trust.
function makeGetter(row: Record<string, string>) {
  const map = new Map<string, string>()
  for (const [k, v] of Object.entries(row)) map.set(norm(k), v ?? '')
  return (...keys: string[]) => {
    for (const key of keys) {
      const v = (map.get(norm(key)) ?? '').trim()
      if (v) return decodeEntities(v)
    }
    return ''
  }
}

const yearOf = (iso: string | null) => (iso ? Number(iso.slice(0, 4)) : undefined)

// Every column name this parser looks at, in both phantoms' naming schemes.
//
// Used by `scripts/check-linkedin-csv.ts` to report columns a CSV carries that
// we ignore — the failure this catches is a phantom renaming a field, which is
// otherwise silent: the value just never reaches the database and nothing errors.
//
// **Keep in sync by hand when adding a `get(...)` call below.** A test cannot
// verify this list matches usage without re-implementing the parser, so the
// list is a diagnostic aid, not a guarantee.
export const KNOWN_COLUMNS = [
  'firstName', 'lastName', 'fullName',
  'linkedinHeadline', 'headline',
  'linkedinCompanyIndustry', 'companyIndustry', 'industry',
  'location',
  'linkedinDescription', 'additionalInfo',
  'linkedinProfileUrl', 'profileUrl',
  'professionalEmail',
  'refreshedAt', 'timestamp',
  'linkedinJobTitle', 'jobTitle',
  'companyName', 'company',
  'linkedinJobDateRange', 'jobDateRange',
  'linkedinJobDescription', 'jobDescription',
  'linkedinPreviousJobTitle', 'jobTitle2',
  'previousCompanyName', 'company2',
  'linkedinPreviousJobDateRange', 'jobDateRange2',
  'linkedinPreviousJobDescription', 'jobDescription2',
  'linkedinSchoolName', 'school',
  'linkedinSchoolDegree', 'schoolDegree',
  'linkedinSchoolFieldOfStudy', 'schoolFieldOfStudy',
  'linkedinSchoolDateRange', 'schoolDateRange',
  'linkedinPreviousSchoolName', 'school2',
  'linkedinPreviousSchoolDegree', 'schoolDegree2',
  'linkedinPreviousSchoolFieldOfStudy', 'schoolFieldOfStudy2',
  'linkedinPreviousSchoolDateRange', 'schoolDateRange2',
  'linkedinSkillsLabel', 'skillsLabel',
] as const

// รายการที่ 3 ขึ้นไป — ต่อเลขท้ายชื่อคอลัมน์แบบเดียวกับ `company2` / `school2`
// ที่ PhantomBuster ใช้อยู่แล้ว เช่น `jobTitle3` `company3` `school3` `schoolDegree4`
//
// เดิมระบบอ่านได้แค่สองชุด (ปัจจุบัน + ก่อนหน้า) ตามไฟล์ตัวอย่างของ phantom ทั้งสองแบบ
// ฐานข้อมูลเก็บได้ไม่จำกัดอยู่แล้ว (education / experience เป็นตารางลูก) ข้อจำกัดจึงอยู่ที่
// ตัวอ่านไฟล์ล้วนๆ ชุดที่ 1–2 ยังอ่านชื่อเดิมทั้งสองแบบ ไฟล์เก่าทุกไฟล์จึงได้ผลเท่าเดิม
export const MAX_NUMBERED_SLOT = 20
const EXP_FIELDS = ['jobTitle', 'company', 'jobDateRange', 'jobDescription'] as const
const EDU_FIELDS = ['school', 'schoolDegree', 'schoolFieldOfStudy', 'schoolDateRange'] as const
const NUMBERED = new RegExp(
  `^(${[...EXP_FIELDS, ...EDU_FIELDS].map(norm).join('|')})([0-9]+)$`
)

/** true when the parser reads this column under either naming scheme */
export function isKnownColumn(header: string): boolean {
  if (KNOWN_COLUMNS.some((k) => norm(k) === norm(header))) return true
  const m = norm(header).match(NUMBERED)
  if (!m) return false
  const n = Number(m[2])
  return n >= 3 && n <= MAX_NUMBERED_SLOT
}

// PhantomBuster HTML-escapes some columns and not others — in a real search
// export, additionalInfo came back with "&amp;" while headline had a raw "&".
// Decoding matters twice over: the text is shown to recruiters, and it feeds
// buildEmbedText, where "amp" would become a junk token in the vector.
// &amp; is decoded LAST so "&amp;lt;" does not turn into "<".
const ENTITIES: [RegExp, string][] = [
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
  [/&quot;/g, '"'],
  [/&#0?39;|&#x27;|&apos;/gi, "'"],
  [/&nbsp;/g, ' '],
  [/&amp;/g, '&'],
]
const decodeEntities = (s: string) =>
  ENTITIES.reduce((acc, [re, ch]) => acc.replace(re, ch), s)

// Parse a LinkedIn-shaped CSV into CandidateInput rows.
// Deterministic (no LLM). Accepts camelCase or friendly-label headers. Captures
// current + previous job and school, plus numbered slots 3..MAX_NUMBERED_SLOT
// (jobTitle3, school3 …). Education country is intentionally omitted.
//
// `source` is a PARAMETER because the file cannot tell you where it came from.
// The same column layout arrives two ways: a PhantomBuster export (`scraper`)
// and a human filling in `lib/ingest/csvTemplate.ts` by hand (`csv`). Only the
// caller knows which. Labelling a hand-typed row `scraper` is not a cosmetic
// slip — `candidate_source_counts` feeds the Dashboard chart that exists to
// answer "where did this data come from", which is PDPA evidence.
//
// The default stays `scraper` so `scripts/sync-candidates.ts` keeps its old
// behaviour without a change; `/api/ingest` type `linkedin` passes `'csv'`.
export function parseLinkedInCsv(
  text: string,
  source: CandidateInput['source'] = 'scraper'
): CandidateInput[] {
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  })

  return data
    .map((row): CandidateInput | null => {
      const get = makeGetter(row)
      // The split pair is trusted only when BOTH halves are there. Otherwise
      // fullName wins if it exists.
      //
      // The old rule was `pair || fullName`, which looks equivalent but is not:
      // filter(Boolean) drops an empty lastName, leaving a truthy first name, so
      // `||` never reaches fullName. A row with firstName "Nattapong", blank
      // lastName and fullName "Nattapong Wong" stored just "Nattapong" —
      // **the more complete value was ignored because a partial one was truthy**.
      // Caught 2026-09-13 by scripts/check-linkedin-csv.ts on the sample file.
      //
      // Why this matters beyond the display name: `linkedin_url` is the dedup key
      // (migration 008), and rows without one fall back to matching on name.
      const first = get('firstName')
      const last = get('lastName')
      const pair = [first, last].filter(Boolean).join(' ').trim()
      const full_name = first && last ? pair : get('fullName') || pair
      if (!full_name) return null

      // ชื่อคอลัมน์ของแต่ละชุด: ชุด 1–2 รับทั้งสองแบบของ phantom ชุด 3+ ใช้เลขต่อท้าย
      const expKeys = (n: number) =>
        n === 1
          ? { title: ['linkedinJobTitle', 'jobTitle'], company: ['companyName', 'company'],
              range: ['linkedinJobDateRange', 'jobDateRange'], desc: ['linkedinJobDescription', 'jobDescription'] }
          : n === 2
            ? { title: ['linkedinPreviousJobTitle', 'jobTitle2'], company: ['previousCompanyName', 'company2'],
                range: ['linkedinPreviousJobDateRange', 'jobDateRange2'],
                desc: ['linkedinPreviousJobDescription', 'jobDescription2'] }
            : { title: [`jobTitle${n}`], company: [`company${n}`], range: [`jobDateRange${n}`], desc: [`jobDescription${n}`] }
      const eduKeys = (n: number) =>
        n === 1
          ? { name: ['linkedinSchoolName', 'school'], degree: ['linkedinSchoolDegree', 'schoolDegree'],
              field: ['linkedinSchoolFieldOfStudy', 'schoolFieldOfStudy'], range: ['linkedinSchoolDateRange', 'schoolDateRange'] }
          : n === 2
            ? { name: ['linkedinPreviousSchoolName', 'school2'], degree: ['linkedinPreviousSchoolDegree', 'schoolDegree2'],
                field: ['linkedinPreviousSchoolFieldOfStudy', 'schoolFieldOfStudy2'],
                range: ['linkedinPreviousSchoolDateRange', 'schoolDateRange2'] }
            : { name: [`school${n}`], degree: [`schoolDegree${n}`], field: [`schoolFieldOfStudy${n}`], range: [`schoolDateRange${n}`] }

      // อ่านทุกชุดจนถึงเพดาน ไม่หยุดที่ชุดแรกที่ว่าง — แถวที่กรอกชุด 4 แต่เว้นชุด 3
      // ต้องไม่ทำให้ชุด 4 หายเงียบๆ
      const experience: NonNullable<CandidateInput['experience']> = []
      for (let n = 1; n <= MAX_NUMBERED_SLOT; n++) {
        const k = expKeys(n)
        const title = get(...k.title)
        const company = get(...k.company)
        if (!title && !company) continue
        const r = parseLinkedInDateRange(get(...k.range))
        experience.push({
          company: company || undefined,
          title: title || undefined,
          start_date: r.start_date ?? undefined,
          end_date: r.end_date ?? undefined,
          description: get(...k.desc) || undefined,
        })
      }

      const education: NonNullable<CandidateInput['education']> = []
      for (let n = 1; n <= MAX_NUMBERED_SLOT; n++) {
        const k = eduKeys(n)
        const institution = get(...k.name)
        if (!institution) continue
        const r = parseLinkedInDateRange(get(...k.range))
        education.push({
          institution,
          degree: get(...k.degree) || undefined,
          field_of_study: get(...k.field) || undefined,
          start_year: yearOf(r.start_date),
          end_year: yearOf(r.end_date),
        })
      }

      // The search export has no skills column at all. Absent stays undefined
      // ("no information"), never [] — upsert reads [] as "delete every skill".
      const skillsRaw = get('linkedinSkillsLabel', 'skillsLabel')
      const skills = skillsRaw
        ? [...new Set(skillsRaw.split(/[,;|\n]/).map((s) => s.trim()).filter(Boolean))]
        : undefined

      return {
        full_name,
        headline: get('linkedinHeadline', 'headline') || undefined,
        industry: get('linkedinCompanyIndustry', 'companyIndustry', 'industry') || undefined,
        location: get('location') || undefined,
        // additionalInfo is the search export's closest thing to the About
        // section. It feeds buildEmbedText, so losing it thins the vector.
        summary: get('linkedinDescription', 'additionalInfo') || undefined,
        source,
        linkedin_url: get('linkedinProfileUrl', 'profileUrl') || undefined,
        professional_email: get('professionalEmail') || undefined,
        // timestamp = when the phantom scraped the row, which is what
        // refreshed_at means here.
        refreshed_at: get('refreshedAt', 'timestamp') || undefined,
        education: education.length ? education : undefined,
        experience: experience.length ? experience : undefined,
        skills,
        raw: row,
      }
    })
    .filter((r): r is CandidateInput => r !== null)
}
