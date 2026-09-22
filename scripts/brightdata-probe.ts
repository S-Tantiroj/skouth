// **ต้องมีบรรทัดนี้** — `npx tsx` ไม่โหลด .env ให้เอง เหมือนที่ Vitest ไม่โหลด
// (CLAUDE.md บันทึกไว้แล้วว่า integration test ต้องขึ้นต้นด้วย `import 'dotenv/config'`)
// ไม่มีบรรทัดนี้ สคริปต์จะบอกว่าไม่พบคีย์ทั้งที่ใส่ไว้ใน .env เรียบร้อยแล้ว
import 'dotenv/config'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// วัดอัตราการได้ข้อมูลจริงจาก Bright Data LinkedIn Profiles Scraper API
//
//   BRIGHTDATA_API_KEY=xxx npx tsx scripts/brightdata-probe.ts <ไฟล์รายการ URL>
//
// **จุดประสงค์คือวัด ไม่ใช่นำเข้า** — สคริปต์นี้ไม่แตะฐานข้อมูลเลย ไม่เรียก Gemini
// ไม่เขียนอะไรลง `candidates` · ผลที่ได้เอาไปเขียนในบทผลการทดสอบ
//
// **ทำไมต้องวัดเอง** เอกสารของ Bright Data ระบุว่าตั้งแต่ 13 พ.ย. 2568 LinkedIn
// จำกัดการเข้าถึงสาธารณะของฟิลด์ position · experience · education ทำให้อัตรา
// การได้ข้อมูลลดจาก 50-64% เหลือราว 2% **สามฟิลด์นั้นคือฟิลด์ที่ `classifyRow`
// ต้องการ** ตัวเลขที่วัดเองจากโปรไฟล์จริงมีน้ำหนักกว่าการอ้างเอกสารผู้ให้บริการ
//
// **ผลลัพธ์ดิบเป็นข้อมูลบุคคลจริง** จึงเขียนลง .brightdata-probe/ ซึ่ง git ไม่เก็บ
// และหน้าจอพิมพ์เฉพาะตัวเลขรวม ไม่พิมพ์ชื่อหรือรายละเอียดของใคร —
// เพราะผลการรันมักถูกแคปหน้าจอส่งต่อ

const DATASET_ID = 'gd_l1viktl72bvl7bjuj0' // LinkedIn people profiles — collect by URL
const ENDPOINT = 'https://api.brightdata.com/datasets/v3/scrape'
const OUT_DIR = resolve(process.cwd(), '.brightdata-probe')

const key = process.env.BRIGHTDATA_API_KEY?.trim()
if (!key) {
  console.error('ไม่พบ BRIGHTDATA_API_KEY — ใส่ไว้ใน .env หรือส่งมากับคำสั่ง')
  process.exit(1)
}

const listFile = process.argv[2]
if (!listFile || !existsSync(listFile)) {
  console.error('ใช้: npx tsx scripts/brightdata-probe.ts <ไฟล์ที่มี URL บรรทัดละหนึ่งอัน>')
  process.exit(1)
}

// **แปลงซับโดเมนรายประเทศเป็น www. ก่อนส่ง**
//
// X-ray ของระบบค้นด้วย `site:th.linkedin.com/in` ลิงก์ที่คัดลอกมาจึงเป็น th. เสมอ
// แต่เอกสารของ Bright Data ระบุรูปแบบอินพุตว่าเป็น `https://www.linkedin.com/in/<user>`
// (ตัวอย่างผลลัพธ์ของเขาคืน `ar.linkedin.com` ได้ จึงน่าจะรองรับซับโดเมนอยู่แล้ว
// แต่ไม่ได้รับรองไว้) **ถ้าบางแถวกลับมาว่าง เราต้องแยกออกว่าเป็นเพราะซับโดเมน
// หรือเพราะฟิลด์ถูกจำกัด** — ตัวแปรที่ตัดได้ก่อนวัดควรตัด
const raw = readFileSync(listFile, 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))

let rewritten = 0
const urls = raw.map((u) => {
  const next = u.replace(/^https:\/\/[a-z]{2,3}\.linkedin\.com\//i, 'https://www.linkedin.com/')
  if (next !== u) rewritten++
  return next
})

// **20 คือเพดานของ endpoint แบบ sync** ส่งเกินแล้วจะถูกปฏิเสธ
if (urls.length === 0 || urls.length > 20) {
  console.error(`ต้องมี URL 1-20 รายการ (พบ ${urls.length}) · เกินกว่านี้ต้องใช้ /trigger แบบ async`)
  process.exit(1)
}

// ฟิลด์ที่ `classifyRow` ต้องการ — ดู lib/ingest/classify.ts
const NEEDED = ['position', 'experience', 'education', 'url', 'name'] as const

const filled = (v: unknown): boolean => {
  if (v == null) return false
  if (typeof v === 'string') return v.trim().length > 0
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object') return Object.keys(v as object).length > 0
  return true
}

async function main() {
  console.log(`ส่ง ${urls.length} URL ไปที่ Bright Data…`)
  if (rewritten) console.log(`(แปลงซับโดเมนรายประเทศเป็น www. จำนวน ${rewritten} รายการ)`)
  console.log()

  const res = await fetch(`${ENDPOINT}?dataset_id=${DATASET_ID}&format=json`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(urls.map((url) => ({ url }))),
  })

  // **202 ไม่ใช่ความล้มเหลว** — แปลว่างานใช้เวลาเกินหนึ่งนาที แล้วย้ายไปทำแบบ async
  // ต้องไปดึงผลด้วย snapshot_id ทีหลัง ไม่ใช่ลองใหม่ (ลองใหม่ = เสีย credit ซ้ำ)
  if (res.status === 202) {
    const body = await res.json().catch(() => ({}))
    console.log('งานยาวเกินหนึ่งนาที ระบบย้ายไปทำแบบ async แล้ว')
    console.log(`snapshot_id: ${(body as any).snapshot_id}`)
    console.log('ไปดึงผลด้วย endpoint /snapshot แล้วรันสคริปต์นี้ซ้ำกับไฟล์ผลที่ได้')
    return
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error(`คำขอล้มเหลว status ${res.status}`)
    // 401/403 = คีย์ผิดหรือหมดอายุ · 400 = รูปแบบ input ผิด
    console.error(text.slice(0, 400))
    process.exit(1)
  }

  const rows = (await res.json()) as any[]
  if (!Array.isArray(rows)) {
    console.error('รูปแบบผลลัพธ์ไม่ใช่อาร์เรย์ตามที่คาด — ดูไฟล์ดิบที่บันทึกไว้')
    mkdirSync(OUT_DIR, { recursive: true })
    writeFileSync(resolve(OUT_DIR, 'raw.json'), JSON.stringify(rows, null, 2))
    process.exit(1)
  }

  mkdirSync(OUT_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  writeFileSync(resolve(OUT_DIR, `raw-${stamp}.json`), JSON.stringify(rows, null, 2))

  console.log(`ได้ผลกลับมา ${rows.length} จาก ${urls.length} รายการ\n`)
  console.log('อัตราการได้ข้อมูลรายฟิลด์')
  console.log('─'.repeat(52))

  for (const f of NEEDED) {
    const n = rows.filter((r) => filled(r?.[f])).length
    const pct = rows.length ? Math.round((n / rows.length) * 100) : 0
    const critical = f === 'experience' || f === 'education'
    const bar = '█'.repeat(Math.round(pct / 5)).padEnd(20, '·')
    console.log(`${f.padEnd(12)} ${bar} ${String(pct).padStart(3)}%  (${n}/${rows.length})${critical ? '  ← classifyRow ต้องการ' : ''}`)
  }

  // ผ่านเกณฑ์จริงกี่แถว — เกณฑ์เดียวกับ classifyRow (สี่อย่างต้องครบ)
  const pass = rows.filter(
    (r) => filled(r?.position) && filled(r?.experience) && filled(r?.education) && filled(r?.url)
  ).length
  console.log('─'.repeat(52))
  console.log(`ผ่านเกณฑ์ครบทั้งสี่ฟิลด์: ${pass}/${rows.length}`)
  console.log(`ที่เหลือจะตกไปอยู่ในคิวรอตรวจ: ${rows.length - pass}`)
  console.log(`\nผลดิบอยู่ที่ .brightdata-probe/raw-${stamp}.json (git ไม่เก็บโฟลเดอร์นี้)`)
}

main().catch((e) => {
  console.error('ผิดพลาด:', e?.message ?? e)
  process.exit(1)
})
