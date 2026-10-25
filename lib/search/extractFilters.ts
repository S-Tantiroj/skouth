import { getGemini } from '@/lib/gemini/client'
import { withTimeout } from '@/lib/gemini/withTimeout'
import { MODEL_FAST } from '@/lib/gemini/models'

export type ChipFilters = {
  skills?: string[]
  minYears?: number
  fieldOrDegree?: string[]
}

export type SearchIntent = { semanticQuery: string; filters: ChipFilters }

// Turns a natural-language recruiter query into a semantic query string (for
// vector search over role/skills meaning) plus structured hard-filter chips.
// เรียกโมเดลครั้งเดียว ค่าที่ได้เป็นภาษาอังกฤษ
//
// ใช้ MODEL_FAST เพราะฟังก์ชันนี้วิ่งทุกครั้งที่มีคนกดค้นหา และเป็นงานสกัดโครงสร้าง
// ที่ไม่ต้องใช้การให้เหตุผล วัดแล้วผลตรงกับรุ่นใหญ่ทุกฟิลด์ แต่เร็วกว่า 2.9 เท่า
// และถูกกว่า 10 เท่า (ดู lib/gemini/models.ts)
export async function extractSearchIntent(nl: string): Promise<SearchIntent> {
  const prompt = `You extract structured search filters from a recruiter's natural-language request. Respond with JSON ONLY, no prose.

Schema:
{
  "semanticQuery": "<short English phrase describing the ROLE and core skills, for semantic search>",
  "filters": {
    "skills": ["<hard skill>", ...],
    "minYears": <integer years of experience>,
    "fieldOrDegree": ["<field of study or degree>", ...]
  }
}

Rules:
- Omit any filter key not mentioned. Omit "filters" entirely if none apply.
- Put the job title / role in semanticQuery, NOT in filters.
- Translate any Thai in the query to English for ALL output values.
- An education level counts as fieldOrDegree. Map Thai levels: ปริญญาตรี = "Bachelor", ปริญญาโท = "Master", ปริญญาเอก = "PhD". A field of study (e.g. "Computer Science") also goes in fieldOrDegree.
- Output English values.

Request: ${nl}`

  // ห้ามโยน error: ตัวกรองเป็นส่วนเสริม ถ้าล้มยังค้นหาด้วยข้อความได้
  let parsed: any = {}
  try {
    const res = await withTimeout(
      getGemini().models.generateContent({
        model: MODEL_FAST,
        contents: prompt,
        // บังคับให้ตอบเป็น JSON ล้วน
        config: { responseMimeType: 'application/json' },
      })
    )
    const raw = (res.text ?? '').replace(/```json|```/g, '').trim()
    // ดึงเฉพาะก้อน JSON แม้แบบจำลองจะตอบมีข้อความปน
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw)
  } catch (e) {
    console.error('extractSearchIntent fell back to plain semantic search:', e)
    parsed = {}
  }
  return {
    semanticQuery: String(parsed.semanticQuery ?? nl),
    filters: (parsed.filters ?? {}) as ChipFilters,
  }
}
