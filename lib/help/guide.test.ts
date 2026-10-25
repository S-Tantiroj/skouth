import { existsSync, readFileSync } from 'node:fs'
import { GUIDE_IMAGES, GUIDE_SECTIONS, renderGuideMarkdown } from './guide'

const DOC = 'docs/uat/skouth-uat.md'

test('renderGuideMarkdown ให้เลขข้อตามลำดับในอาเรย์', () => {
  const md = renderGuideMarkdown([
    { id: 'a', title: 'หนึ่ง', steps: ['ก', 'ข'] },
    { id: 'b', title: 'สอง', steps: ['ค'] },
  ])
  expect(md).toBe('### 1.1 หนึ่ง\n\n1. ก\n2. ข\n\n### 1.2 สอง\n\n1. ค')
})

test('เอกสารส่งมอบงานตรงกับคู่มือบนเว็บ', () => {
  // คู่มืออยู่สองที่: หน้า /help และไฟล์ md ที่ใช้ส่งมอบงาน เทสต์นี้ตกเมื่อแก้
  // ที่หนึ่งแล้วลืมอีกที่ ซึ่งเป็นความล้มเหลวที่มองไม่เห็นจนถึงวันส่งมอบ
  //
  // แก้ให้เขียวด้วย `npx tsx scripts/sync-guide-doc.ts` ไม่ใช่แก้ md ด้วยมือ
  const doc = readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n')
  expect(doc).toContain(renderGuideMarkdown())
})

test('ทุกหัวข้อมี id ไม่ซ้ำและมีขั้นตอนอย่างน้อยหนึ่งข้อ', () => {
  // id คือปลายทางของลิงก์ในสารบัญ ถ้าซ้ำ ลิงก์จะพาไปหัวข้อแรกที่ชนกันเสมอ
  const ids = GUIDE_SECTIONS.map((s) => s.id)
  expect(new Set(ids).size).toBe(ids.length)
  for (const s of GUIDE_SECTIONS) expect(s.steps.length).toBeGreaterThan(0)
})

test('ภาพประกอบผูกกับหัวข้อที่มีอยู่จริง และไฟล์อยู่ใน public/help', () => {
  // id ที่พิมพ์ผิดทำให้ภาพหายจากหน้าเว็บเงียบๆ ส่วนไฟล์ที่ไม่มีอยู่ทำให้เห็นกรอบภาพแตก
  const ids = new Set(GUIDE_SECTIONS.map((s) => s.id))
  for (const [id, imgs] of Object.entries(GUIDE_IMAGES)) {
    expect(ids.has(id)).toBe(true)
    for (const img of imgs) {
      expect(img.src.startsWith('/help/')).toBe(true)
      expect(existsSync(`public${img.src}`)).toBe(true)
    }
  }
})

test('width/height ของภาพตรงกับไฟล์จริง', () => {
  // ค่าผิดทำให้ภาพบนหน้า /help ยืดผิดสัดส่วน — อ่านขนาดจาก header ของ PNG
  for (const imgs of Object.values(GUIDE_IMAGES)) {
    for (const img of imgs) {
      const buf = readFileSync(`public${img.src}`)
      expect([buf.readUInt32BE(16), buf.readUInt32BE(20)]).toEqual([img.width, img.height])
    }
  }
})
