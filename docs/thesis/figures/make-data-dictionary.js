// สร้าง docs/thesis/2026-10-21-data-dictionary.docx — ตารางข้อมูล 16 ตาราง (ตารางที่ 3-18 ถึง 3-33)
// คอลัมน์: No. · Field Name · Data Type · Key · Description
//
// ที่มาของข้อมูล — ไม่พิมพ์ซ้ำในไฟล์นี้ เพื่อไม่ให้มีสองสำเนาที่เริ่มไม่ตรงกัน
//   · ลำดับคอลัมน์ ชื่อ ชนิดข้อมูล และ Key  → ตาราง T ใน make-er.py (ดึงจาก Supabase จริง 2026-10-21)
//   · คำอธิบาย และชื่อตารางภาษาไทย         → ../2026-09-08-data-dictionary.md
// รัน: node docs/thesis/figures/make-data-dictionary.js
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, VerticalAlign, AlignmentType, ShadingType,
} = require('docx')

const HERE = __dirname
const FONT = 'TH Sarabun New'
const SIZE_CAPTION = 32 // 16pt
const SIZE_TABLE = 28   // 14pt — ขนาดที่นิยมใช้ในตารางของเล่ม ชื่อคอลัมน์ยาวจึงไม่ตัดบรรทัด

// ---------- อ่านข้อมูลจากสองแหล่ง ----------
const py = `
import io, re, json, sys
here = sys.argv[1]
src = io.open(here + '/make-er.py', encoding='utf-8').read(); ns = {}; exec(src.split('def esc')[0], ns); T = ns['T']; FK = ns['FK']
dd = io.open(here + '/../2026-09-08-data-dictionary.md', encoding='utf-8').read()
FKDESC = {
 ('profiles','id'): 'รหัสผู้ใช้',
 ('candidates','created_by'): 'ผู้ใช้ที่นำเข้าข้อมูล',
 ('candidates','ingest_run_id'): 'รอบการนำเข้าที่นำแถวนี้เข้ามา',
 ('education','candidate_id'): 'ผู้สมัครเจ้าของประวัติ',
 ('experience','candidate_id'): 'ผู้สมัครเจ้าของประวัติ',
 ('candidate_skills','candidate_id'): 'ผู้สมัคร',
 ('candidate_skills','skill_id'): 'ทักษะ',
 ('shortlists','owner_id'): 'เจ้าของรายการ',
 ('shortlist_candidates','shortlist_id'): 'รายการ Shortlist',
 ('shortlist_candidates','candidate_id'): 'ผู้สมัครในรายการ',
 ('analyses','candidate_id'): 'ผู้สมัครที่ถูกประเมิน',
 ('analyses','job_id'): 'ตำแหน่งงานที่ใช้ประเมิน (ค่าว่างได้)',
 ('self_profiles','owner_id'): 'เจ้าของโปรไฟล์',
 ('resume_assessments','profile_id'): 'โปรไฟล์ที่ถูกประเมิน',
 ('pending_candidates','ingest_run_id'): 'รอบการนำเข้าที่นำแถวนี้เข้ามา',
 ('pending_candidates','reviewed_by'): 'ผู้ตรวจรายการ',
 ('suppressed_profiles','created_by'): 'ผู้บันทึกการระงับ',
 ('activity_log','actor_id'): 'ผู้กระทำ (ค่าว่าง = ระบบทำเอง)',
}
_c, _n, _a = 'ลบตามเมื่อแถวแม่ถูกลบ', 'เป็นค่าว่างเมื่อแถวแม่ถูกลบ', 'ห้ามลบแถวแม่ที่ยังถูกอ้างอิง'
ONDEL = {k: _c for k in FKDESC}
for k in (('candidates','ingest_run_id'), ('pending_candidates','ingest_run_id'), ('pending_candidates','reviewed_by'),
          ('suppressed_profiles','created_by'), ('activity_log','actor_id')): ONDEL[k] = _n
ONDEL[('candidates','created_by')] = _a
assert set(FKDESC) == set(FK), 'FKDESC ต้องครบตาม FK ใน make-er.py'
out, missing = [], []
for m in re.finditer(r'^## ตารางที่ (3-\\d+) \`([a-z_.]+)\` — (.+)$', dd, flags=re.M):
    no, name, title = m.groups()
    sec = dd[m.end():].split('\\n## ', 1)[0]
    desc = {}
    for line in sec.splitlines():
        if not re.match(r'^\\|\\s*\\d+\\s*\\|', line): continue
        c = [x.strip() for x in line.strip().strip('|').split('|')]
        desc[c[1].strip('~').strip('\`')] = re.sub(r'\\*\\*|\`|~~', '', c[4])
    rows = []
    for i, (k, col, t) in enumerate(T[name], 1):
        if col not in desc: missing.append(name + '.' + col)
        # สัญลักษณ์ Key เดียวกับ ER Diagram ทุกตัว: PK · FK · PK/FK · UQ
        key = k.replace(',', '/')
        d = desc.get(col, '')
        ref = FK.get((name, col))
        # FK ทุกแถวต้องบอกว่าอ้างอิงตารางไหน ให้ตรงกับเส้นความสัมพันธ์ใน ER Diagram
        # คำอธิบาย FK เขียนรูปแบบเดียวกันทุกแถว: ความหมาย · ตารางที่อ้างอิง · ผลเมื่อลบแถวแม่
        # (ผลเมื่อลบตรงกับ pg_constraint และตารางที่ 3-16)
        if ref:
            d = FKDESC[(name, col)] + ' อ้างอิง ' + ref + ' · ' + ONDEL[(name, col)]
        rows.append([str(i), col, t.replace('int4', 'integer'), key, d])
    out.append({'no': no, 'name': name, 'title': title, 'rows': rows})
if missing: sys.exit('ไม่มีคำอธิบายใน data-dictionary.md: ' + ', '.join(missing))
print(json.dumps(out, ensure_ascii=False))
`
const tables = JSON.parse(execFileSync('python3', ['-c', py, HERE], { encoding: 'utf8' }))

// คำอธิบายที่ยาวเกินไปสำหรับช่องในตาราง — ฉบับเต็มอยู่ใน data-dictionary.md
const SHORT = {
  'self_profiles.raw_text': 'ไม่ได้ใช้แล้ว เดิมเก็บข้อความดิบจากไฟล์ (คงคอลัมน์ไว้เพราะแก้โครงสร้างแบบเพิ่มเท่านั้น)',
}

// ---------- layout ----------
const COL = [550, 2300, 1800, 950, 2706] // รวม 8306 = A4 ลบขอบซ้าย 1.5" ขวา 1"
const TOTAL = COL.reduce((a, b) => a + b, 0)
const HEADERS = ['No.', 'Field Name', 'Data Type', 'Key', 'Description']
const b = { style: BorderStyle.SINGLE, size: 4, color: '000000' }
const borders = { top: b, bottom: b, left: b, right: b }
const margins = { top: 40, bottom: 40, left: 90, right: 90 }

const run = (t, o = {}) => new TextRun({ text: t, font: FONT, size: o.size ?? SIZE_TABLE, bold: !!o.bold })
const cell = (text, i, o = {}) => new TableCell({
  borders, margins,
  width: { size: COL[i], type: WidthType.DXA },
  verticalAlign: VerticalAlign.TOP,
  shading: o.head ? { type: ShadingType.CLEAR, color: 'auto', fill: 'E6E6E6' } : undefined,
  children: [new Paragraph({
    alignment: (o.head || i === 0 || i === 3) ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { before: 0, after: 0 },
    children: [run(text, { bold: o.head })],
  })],
})

const children = []
tables.forEach((t, ti) => {
  children.push(new Paragraph({
    keepNext: true,
    spacing: { before: ti === 0 ? 0 : 360, after: 80 },
    children: [run(`ตารางที่ ${t.no} `, { bold: true, size: SIZE_CAPTION }),
               run(`${t.name}: ${t.title}`, { size: SIZE_CAPTION })],
  }))
  children.push(new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: COL,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: HEADERS.map((h, i) => cell(h, i, { head: true })) }),
      ...t.rows.map((r) => new TableRow({
        cantSplit: true,
        children: r.map((v, i) => cell(i === 4 ? (SHORT[`${t.name}.${r[1]}`] ?? v) : v, i)),
      })),
    ],
  }))
})

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: SIZE_TABLE } } } },
  sections: [{ properties: { page: { margin: { top: 1440, bottom: 1440, left: 2160, right: 1440 } } }, children }],
})
// ส่งพาธปลายทางเป็นอาร์กิวเมนต์ได้ — ใช้ตอนไฟล์เดิมเปิดค้างอยู่ใน Word
const out = process.argv[2] || path.join(HERE, '..', '2026-10-22-data-dictionary.docx')
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(out, buf); console.log('wrote', out, '·', tables.length, 'tables') })
