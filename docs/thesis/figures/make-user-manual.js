// สร้าง docs/thesis/2026-10-25-user-manual.docx — ภาคผนวก ก คู่มือการใช้งานระบบ
//
// เนื้อหาหัวข้อทั้งหมดอ่านจาก lib/help/guide.ts ซึ่งเป็นแหล่งเดียวกับหน้า /help
// แก้คู่มือที่ guide.ts แล้วรันสคริปต์นี้ใหม่ — ห้ามแก้ข้อความในไฟล์ docx ด้วยมือ
//   node docs/thesis/figures/make-user-manual.js
// (ต้องมี node_modules/typescript เพื่อแปลง guide.ts — ไม่ต้องใช้ tsx)
const fs = require('fs')
const path = require('path')
const ts = require(path.join(__dirname, '..', '..', '..', 'node_modules', 'typescript'))
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, PageBreak, Header, PageNumber, ImageRun,
} = require('docx')

// ภาพประกอบอ่านจาก GUIDE_IMAGES ใน guide.ts ชุดเดียวกับหน้า /help (ไฟล์อยู่ public/help/ เบลอข้อมูลส่วนบุคคลแล้ว)
// ภาพต้นทางคือภาพที่ 5-x ของบทที่ 5 — FROM บอกเลขภาพนั้นสำหรับคำบรรยายในเล่ม
const FROM = {
  'home.png': '5-1', 'confirm.png': '5-2', 'login.png': '5-3', 'dashboard.png': '5-4', 'search.png': '5-5',
  'candidates.png': '5-6', 'candidate.png': '5-7', 'shortlist-panel.png': '5-8', 'shortlists.png': '5-8',
  'job.png': '5-9', 'self.png': '5-10', 'import.png': '5-11', 'xray.png': '5-11', 'admin.png': '5-12',
  'settings.png': '5-13', 'privacy.png': '5-14',
}
// ขนาดภาพ PNG อ่านจาก header (ไม่ต้องพึ่งไลบรารีภาพ)
function pngSize(buf) { return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) } }

const ROOT = path.join(__dirname, '..', '..', '..')
const src = fs.readFileSync(path.join(ROOT, 'lib', 'help', 'guide.ts'), 'utf8')
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const mod = { exports: {} }
new Function('module', 'exports', js)(mod, mod.exports)
const SECTIONS = mod.exports.GUIDE_SECTIONS
const IMAGES = mod.exports.GUIDE_IMAGES

const FONT = 'TH SarabunPSK'
const SZ = 32 // 16 pt
const run = (text, o = {}) => new TextRun({ text, font: { ascii: FONT, hAnsi: FONT, cs: FONT, eastAsia: FONT }, size: SZ, sizeComplexScript: SZ, ...o })
const p = (children, o = {}) => new Paragraph({ children: Array.isArray(children) ? children : [run(children)], spacing: { after: 0, line: 240 }, ...o })
const body = (t) => p([run(t)], { alignment: AlignmentType.THAI_DISTRIBUTE, indent: { firstLine: 720 } })
const heading = (t) => p([run(t, { bold: true })], { spacing: { before: 240, after: 60 }, keepNext: true })

const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' }
const borders = { top: border, bottom: border, left: border, right: border }
function table(cols, rows) {
  const total = 8306 // A4 กว้าง 11906 − ขอบซ้าย 2160 − ขอบขวา 1440
  const widths = cols.map((c) => Math.round(total * c.w))
  const cell = (text, i, head) => new TableCell({
    borders, width: { size: widths[i], type: WidthType.DXA },
    shading: head ? { fill: 'E7E6E6', type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 40, bottom: 40, left: 100, right: 100 },
    children: [p([run(text, { bold: !!head })], { alignment: head ? AlignmentType.CENTER : AlignmentType.LEFT })],
  })
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: cols.map((c, i) => cell(c.h, i, true)) }),
      ...rows.map((r) => new TableRow({ children: r.map((t, i) => cell(t, i)) }))],
  })
}
const caption = (t) => p([run(t, { bold: true })], { spacing: { before: 120, after: 60 }, keepNext: true })

const children = [
  p([run('ภาคผนวก ก', { bold: true })], { alignment: AlignmentType.CENTER }),
  p([run('คู่มือการใช้งานระบบ', { bold: true })], { alignment: AlignmentType.CENTER, spacing: { after: 240 } }),

  heading('ก.1 ข้อมูลทั่วไป'),
  body('คู่มือนี้อธิบายการใช้งานเว็บแอปพลิเคชัน Skouth สำหรับรวบรวมข้อมูลและจัดหาผู้สมัครที่เหมาะสมกับตำแหน่งงาน เนื้อหาชุดเดียวกันนี้เผยแพร่บนหน้า "คู่มือ" ของเว็บไซต์ ซึ่งเปิดอ่านได้โดยไม่ต้องเข้าสู่ระบบ'),
  caption('ตาราง ก-1 ข้อมูลสำหรับเริ่มใช้งาน'),
  table([{ h: 'รายการ', w: 0.3 }, { h: 'รายละเอียด', w: 0.7 }], [
    ['ที่อยู่เว็บไซต์', 'https://skouth.vercel.app'],
    ['คู่มือบนเว็บไซต์', 'https://skouth.vercel.app/help'],
    ['เบราว์เซอร์ที่รองรับ', 'Google Chrome, Microsoft Edge, Mozilla Firefox หรือ Safari รุ่นปัจจุบัน ทั้งบนคอมพิวเตอร์และโทรศัพท์'],
    ['สิ่งที่ต้องมี', 'อีเมลที่ใช้งานได้สำหรับสมัครสมาชิก และการอนุมัติบัญชีจากผู้ดูแลระบบ'],
  ]),
  caption('ตาราง ก-2 สิทธิ์ของผู้ใช้แต่ละระดับ'),
  table([{ h: 'สิทธิ์', w: 0.28 }, { h: 'เมนูที่ใช้ได้', w: 0.72 }], [
    ['ผู้ใช้ทั่วไป (Member)', 'Dashboard, Search, Job (ดูอย่างเดียว), Shortlist, ประเมินตัวเอง, คู่มือ, ตั้งค่า'],
    ['ผู้จัดการข้อมูล (Data Manager)', 'ทุกเมนูของผู้ใช้ทั่วไป และ ข้อมูล, Import รวมถึงสร้าง แก้ไข และลบตำแหน่งงาน'],
    ['ผู้ดูแลระบบ (Admin)', 'ทุกเมนูของผู้จัดการข้อมูล และ Admin สำหรับอนุมัติบัญชีและกำหนดสิทธิ์'],
  ]),
]

let fig = 0
SECTIONS.forEach((s, i) => {
  children.push(heading(`ก.${i + 2} ${s.title}`))
  s.steps.forEach((step) => children.push(new Paragraph({
    numbering: { reference: `steps-${i}`, level: 0 },
    alignment: AlignmentType.THAI_DISTRIBUTE, spacing: { after: 0, line: 240 },
    children: [run(step)],
  })))
  for (const img of IMAGES[s.id] || []) {
    const file = path.basename(img.src)
    const cap = img.caption
    const from = FROM[file]
    if (!from) throw new Error(`ไม่รู้ว่า ${file} มาจากภาพที่เท่าไรของบทที่ 5 — เพิ่มใน FROM`)
    const data = fs.readFileSync(path.join(ROOT, 'public', img.src))
    const { w, h } = pngSize(data)
    // กว้างไม่เกินพื้นที่พิมพ์ (≈ 540 px) และสูงไม่เกิน 380 px คงสัดส่วนเดิม
    const k = Math.min(540 / w, 380 / h, 1)
    fig += 1
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 160, after: 0 }, keepNext: true,
      children: [new ImageRun({ type: 'png', data, transformation: { width: Math.round(w * k), height: Math.round(h * k) },
        altText: { title: cap, description: cap, name: file } })],
    }))
    children.push(p([run(`ภาพที่ ก-${fig} `, { bold: true }), run(`${cap} (ภาพเดียวกับภาพที่ ${from})`)],
      { alignment: AlignmentType.CENTER, spacing: { before: 60, after: 160 } }))
  }
})

children.push(heading(`ก.${SECTIONS.length + 2} ข้อความที่พบบ่อยและวิธีแก้`))
children.push(caption(`ตาราง ก-3 ข้อความแจ้งเตือนที่พบบ่อย`))
children.push(table([{ h: 'ข้อความที่เห็น', w: 0.42 }, { h: 'สาเหตุและวิธีแก้', w: 0.58 }], [
  ['บัญชีนี้รอการอนุมัติจากผู้ดูแลระบบ', 'ผู้ดูแลระบบยังไม่ได้อนุมัติบัญชี ให้รอ หรือติดต่อผู้ดูแลระบบถ้ารอนานเกินสมควร'],
  ['บัญชีนี้ไม่ได้รับอนุมัติให้ใช้งาน', 'บัญชีถูกปฏิเสธ รอไปก็ไม่เปลี่ยน ให้ติดต่อผู้ดูแลระบบ'],
  ['อีเมลนี้ถูกใช้สมัครแล้ว', 'อีเมลนี้มีบัญชีอยู่แล้ว ให้เข้าสู่ระบบ หรือกด "ลืมรหัสผ่าน" ถ้าจำรหัสไม่ได้'],
  ['เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'การเข้าสู่ระบบหมดอายุ ให้เข้าสู่ระบบอีกครั้งแล้วทำรายการเดิม'],
  ['ไม่พบผู้สมัคร / ไม่มีใครตรงเงื่อนไข', 'ไม่มีผู้สมัครที่ตรงตัวกรอง ลองลบชิปบางรายการหรือลดประสบการณ์ขั้นต่ำ'],
  ['ค้นหาไม่ได้ / ระบบมีปัญหาชั่วคราว', 'ระบบหรือบริการ AI ขัดข้องชั่วคราว ให้ลองใหม่ ถ้ายังไม่ได้ให้แจ้งผู้ดูแลระบบ'],
  ['เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'อินเทอร์เน็ตขัดข้อง ให้ตรวจการเชื่อมต่อแล้วลองใหม่'],
  ['คุณไม่มีสิทธิ์ทำรายการนี้', 'สิทธิ์ของบัญชีไม่พอสำหรับงานนั้น ให้ติดต่อผู้ดูแลระบบ'],
  ['ลดสิทธิ์ของตัวเองไม่ได้', 'ผู้ดูแลระบบเปลี่ยนสิทธิ์ของตัวเองไม่ได้ ให้ผู้ดูแลระบบคนอื่นเป็นคนเปลี่ยนให้'],
]))

const numbering = { config: SECTIONS.map((_, i) => ({
  reference: `steps-${i}`,
  levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 1080, hanging: 360 } }, run: { font: FONT, size: SZ } } }],
})) }

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: SZ } } } },
  numbering,
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 2160, right: 1440, bottom: 1440, left: 2160, header: 708, footer: 708 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SZ })] })] }) },
    children,
  }],
})
const out = process.argv[2] || path.join(ROOT, 'docs', 'thesis', '2026-10-25-user-manual.docx')
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(out, b); console.log('wrote', out, SECTIONS.length, 'sections') })
