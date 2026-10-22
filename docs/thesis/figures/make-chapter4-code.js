// สร้าง docs/thesis/2026-10-22-chapter4-code.docx จากหัวข้อ 4.2.3–4.2.12 และ 4.3 ของร่างบทที่ 4
// รูปแบบ: คำอธิบาย → "ตารางที่ 4-x code … (ที่มา: ไฟล์:บรรทัด (ฟังก์ชัน))" → กล่องโค้ด → คำอธิบายโค้ด
// รัน: node docs/thesis/figures/make-chapter4-code.js [พาธปลายทาง]
const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ShadingType,
} = require('docx')

const HERE = __dirname
const FONT = 'TH Sarabun New'
const MONO = 'Courier New'
const md = fs.readFileSync(path.join(HERE, '..', '2026-10-21-chapter4-draft.md'), 'utf8')
const start = md.indexOf('### 4.2.3 ')
const end = md.indexOf('\n---\n---', start)
const lines = md.slice(start, end).split('\n')

// ข้อความ markdown แบบง่าย: **ตัวหนา** และ `โค้ด`
function runs(text, size = 32) {
  const out = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0, m
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), font: FONT, size }))
    const t = m[0]
    if (t.startsWith('**')) out.push(new TextRun({ text: t.slice(2, -2), font: FONT, size, bold: true }))
    else out.push(new TextRun({ text: t.slice(1, -1), font: FONT, size }))
    last = m.index + t.length
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), font: FONT, size }))
  return out
}
const para = (text, o = {}) => new Paragraph({
  children: runs(text, o.size), spacing: { before: o.before ?? 0, after: o.after ?? 120, line: 360 },
  indent: o.indent ? { firstLine: 720 } : undefined, keepNext: !!o.keepNext,
})
const b = { style: BorderStyle.SINGLE, size: 6, color: '000000' }
function codeBox(codeLines) {
  return new Table({
    width: { size: 8306, type: WidthType.DXA }, columnWidths: [8306],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: 8306, type: WidthType.DXA },
      borders: { top: b, bottom: b, left: b, right: b },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: codeLines.map((l) => new Paragraph({
        spacing: { before: 0, after: 0, line: 240 },
        children: [new TextRun({ text: l.replace(/\t/g, '  ') || ' ', font: MONO, size: 17 })],
      })),
    })] })],
  })
}

// ตารางข้อมูลแบบ markdown → ตาราง Word (หัวตารางแรเงา)
function dataTable(rows) {
  const n = rows[0].length
  // ความกว้างคอลัมน์ตามความยาวข้อความที่ยาวที่สุด (ตัดเพดานไว้ไม่ให้คอลัมน์คำอธิบายกินทั้งตาราง)
  const W = 8306
  const wt = [...Array(n).keys()].map((j) => Math.min(45, Math.max(...rows.map((r) => (r[j] || '').replace(/[`*]/g, '').length))) + 6)
  const sum = wt.reduce((x, y) => x + y, 0)
  const cw = wt.map((x) => Math.floor(W * x / sum))
  const cell = (t, head, j) => new TableCell({
    width: { size: cw[j], type: WidthType.DXA },
    borders: { top: b, bottom: b, left: b, right: b },
    margins: { top: 40, bottom: 40, left: 90, right: 90 },
    shading: head ? { type: ShadingType.CLEAR, color: 'auto', fill: 'E6E6E6' } : undefined,
    children: [new Paragraph({ alignment: head ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { before: 0, after: 0 }, children: head ? [new TextRun({ text: t.replace(/[`*]/g, ''), font: FONT, size: 28, bold: true })] : runs(t, 28) })],
  })
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: cw,
    rows: rows.map((r, i) => new TableRow({ tableHeader: i === 0, cantSplit: true, children: r.map((t, j) => cell(t, i === 0, j)) })) })
}
const children = []
let buf = [], inCode = false, code = [], tbl = []
let listItem = false
const flushTbl = () => { if (tbl.length) { children.push(dataTable(tbl)); children.push(new Paragraph({ children: [], spacing: { after: 120 } })); tbl = [] } }
// บรรทัดในร่างถูกตัดตรงช่องว่างระหว่างวลี จึงต่อกลับด้วยช่องว่าง
const flush = () => { flushTbl(); if (buf.length) { children.push(listItem ? new Paragraph({ children: runs(buf.join(' ')), spacing: { after: 80, line: 360 }, indent: { left: 1080, hanging: 360 } }) : para(buf.join(' '), { indent: true })); buf = [] } listItem = false }
for (const raw of lines) {
  const l = raw.replace(/\s+$/, '')
  if (l.startsWith('````')) {
    if (inCode) { children.push(codeBox(code)); children.push(new Paragraph({ children: [], spacing: { after: 120 } })); code = [] }
    else flush()
    inCode = !inCode; continue
  }
  if (inCode) { code.push(raw); continue }
  if (l.startsWith('|')) {
    if (buf.length) flush()
    if (!/^\|[\s|:-]+\|$/.test(l)) tbl.push(l.slice(1, -1).split('|').map((c) => c.trim()))
    continue
  }
  if (tbl.length) flushTbl()
  if (l.startsWith('>') && !l.startsWith('> **[ภาพที่')) continue // หมายเหตุถึงผู้เขียน ไม่ลงเล่ม
  if (/^\d+\.\s/.test(l)) { flush(); listItem = true; buf.push(l); continue }
  if (l.startsWith('## ') || l.startsWith('### ')) {
    flush()
    const h2 = l.startsWith('## ')
    children.push(new Paragraph({ children: [new TextRun({ text: l.replace(/^#+\s/, ''), font: FONT, size: h2 ? 36 : 32, bold: true })],
      spacing: { before: 240, after: 120 }, keepNext: true }))
    continue
  }
  if (l.startsWith('> **[ภาพที่')) {
    flush()
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
      children: [new TextRun({ text: l.replace(/^>\s*/, '').replace(/\*\*/g, '').replace(/`/g, ''), font: FONT, size: 28, italics: true, color: '777777' })] }))
    continue
  }
  if (l.startsWith('ตารางที่ 4-')) {
    flush()
    const m = l.match(/^(ตารางที่ 4-\d+)\s(.*)$/)
    children.push(new Paragraph({ keepNext: true, spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: m[1] + ' ', font: FONT, size: 32, bold: true }), new TextRun({ text: m[2], font: FONT, size: 32, bold: true })] }))
    continue
  }
  if (!l.trim()) { flush(); continue }
  buf.push(l)
}
flush()

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 32 } } } },
  sections: [{ properties: { page: { margin: { top: 1440, bottom: 1440, left: 2160, right: 1440 } } }, children }],
})
const out = process.argv[2] || path.join(HERE, '..', '2026-10-22-chapter4-code.docx')
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(out, buf); console.log('wrote', out) })
