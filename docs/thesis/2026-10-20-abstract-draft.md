# บทคัดย่อ — ร่างใหม่ พร้อมวางลง Word (2026-10-20)

**เหตุผลที่ต้องเขียนใหม่ ไม่ใช่แค่เกลาคำ** — บทคัดย่อเดิมเขียนด้วยกาลอนาคต
("จะช่วยลด…" · "ซึ่งถือเป็นเครื่องมือสำคัญที่จะยกระดับ…") ซึ่งเป็นภาษาของ
**ข้อเสนอโครงงาน ไม่ใช่ของโครงงานที่ทำเสร็จแล้ว** ตอนนี้ระบบพัฒนาเสร็จและ
เผยแพร่ใช้งานจริง บทคัดย่อจึงต้อง**รายงานผล** ไม่ใช่ประกาศความตั้งใจ

**3 ย่อหน้า · ภาษาไทย 1,330 ตัวอักษร (นับช่องว่าง) · ภาษาอังกฤษ 221 คำ**
ตามกรอบที่สั่งเมื่อ 2026-10-20 คือไม่เกิน 1,500 ตัวอักษร และ 200–250 คำ
ไม่กล่าวถึงผลการทดสอบการยอมรับระบบ · ฉบับที่ยาวกว่าดูได้จากประวัติ Git

> **ตัดอะไรออกไปในรอบนี้** — รายละเอียดส่วนประเมินตนเอง · รายการหน้าจอ ·
> รายการกลไก PDPA (เหลือแค่การอ้างถึงพระราชบัญญัติ) · ข้อความเรื่องข้อกำหนด
> การใช้งาน **สาระหลักยังครบ:** ปัญหาสามข้อ · เทคโนโลยี · RAG และปริภูมิเวกเตอร์
> ร่วม · การแยกสองขั้น · ข้อจำกัดสองข้อ
>
> **คำภาษาไทยนับจำนวนคำแน่นอนไม่ได้** เพราะไม่มีช่องว่างคั่นคำ จึงใช้จำนวน
> ตัวอักษรเป็นเกณฑ์สำหรับฉบับไทย และใช้จำนวนคำกับฉบับอังกฤษ
> ความยาวบนหน้ากระดาษจริงยังต้องตรวจใน Word

---
---

## บทคัดย่อ

การสรรหาบุคลากรบนแพลตฟอร์มเครือข่ายวิชาชีพอย่าง LinkedIn ทำให้เข้าถึงผู้สมัคร
ได้กว้างขึ้น แต่มีข้อมูลเกินกว่าจะอ่านด้วยบุคลากรได้ทั้งหมด การคัดกรองแบบอ่าน
ประวัติย่อทีละรายการจึงใช้เวลามาก มีเกณฑ์ไม่คงที่ตามดุลพินิจของผู้อ่าน และการค้น
ด้วยคำสำคัญเข้าไม่ถึงผู้สมัครที่ใช้ถ้อยคำต่างกันแต่มีคุณสมบัติใกล้เคียงกัน

ปริญญานิพนธ์นี้จึงพัฒนาเว็บแอปพลิเคชันสำหรับรวบรวมข้อมูลและจัดหาผู้สมัครที่เหมาะสม
กับตำแหน่งงาน โดยมุ่งเน้นคนไทยที่สำเร็จการศึกษาจากต่างประเทศ ระบบพัฒนาด้วย
Next.js ใช้ Supabase (PostgreSQL และ pgvector) เป็นฐานข้อมูล และใช้ Google Gemini
ตามแนวทาง Retrieval-Augmented Generation (RAG) โดยแปลงข้อมูลผู้สมัครและตำแหน่งงาน
เป็นเวกเตอร์ความหมาย 768 มิติในปริภูมิเดียวกัน การทำงานแบ่งเป็นสองขั้น ขั้นแรกเรียก
แบบจำลองภาษาครั้งเดียวเพื่อสกัดเงื่อนไขจากข้อความภาษาธรรมชาติ แล้วจัดอันดับด้วย
ความใกล้เคียงเชิงโคไซน์โดยไม่เรียกแบบจำลองภาษาอีก ขั้นที่สองประเมินรายบุคคลเมื่อ
ผู้ใช้ร้องขอ ให้คะแนน 0–100 พร้อมเหตุผลภาษาไทยและจัดเก็บไว้ใช้ซ้ำ ทำให้ระบบทำงานได้
ภายใต้ทรัพยากรแบบไม่มีค่าใช้จ่าย และออกแบบกลไกรองรับพระราชบัญญัติคุ้มครองข้อมูล
ส่วนบุคคล พ.ศ. 2562

ผลการดำเนินงานได้เว็บแอปพลิเคชันที่เผยแพร่ใช้งานได้จริง อย่างไรก็ตาม คะแนนจาก
แบบจำลองภาษาคลาดเคลื่อนได้ถึง 10 คะแนนเมื่อประมวลผลซ้ำด้วยข้อมูลชุดเดียวกัน
จึงเหมาะเป็นข้อมูลประกอบการพิจารณาเท่านั้น และการนำเข้าข้อมูลอัตโนมัติยังไม่เปิด
ใช้งานเนื่องจากต้องใช้บริการภายนอกแบบมีค่าใช้จ่าย

**คำสำคัญ:** การจับคู่งาน · การค้นคืนข้อมูลแบบเสริมด้วยการสร้าง ·
เวกเตอร์ความหมาย · การค้นหาเชิงความหมาย · แบบจำลองภาษาขนาดใหญ่ ·
การคุ้มครองข้อมูลส่วนบุคคล

---
---

## Abstract (ฉบับภาษาอังกฤษ — ใช้ถ้าหลักสูตรกำหนด)

Professional networking platforms such as LinkedIn give recruiters access to far
more candidates than they can read. Screening résumés one by one is slow, applies
criteria that vary between reviewers, and relies on keyword search that misses
candidates who describe similar qualifications in different words.

This project develops a web application for collecting candidate data and matching
candidates to job positions, focusing on Thai professionals educated abroad. It is
built with Next.js, uses Supabase (PostgreSQL with pgvector) as its database, and
applies Google Gemini following the Retrieval-Augmented Generation (RAG) approach:
candidate and job records are embedded as 768-dimensional semantic vectors in a
single shared space. Processing has two stages. Ranking calls the language model
once to extract conditions from a natural-language query, then ranks candidates by
cosine similarity without further model calls. Per-candidate assessment runs only
on request, returning a 0–100 score with reasoning in Thai that is cached for
reuse. This design keeps the system within free-tier limits. The system also
includes mechanisms supporting Thailand's Personal Data Protection Act B.E. 2562.

The result is a deployed, working web application. However, language-model scores
varied by up to 10 points when the same input was processed again, so they should
serve only as supporting information. Automated data import is implemented but not
enabled, as it requires a paid external service.

**Keywords:** job matching, retrieval-augmented generation, semantic vectors,
semantic search, large language models, personal data protection

---
---

## ที่มาของตัวเลขทุกตัวในร่างนี้

| ข้อความในบทคัดย่อ | ตรวจจากอะไร |
|---|---|
| 768 มิติ · แบบจำลองเดียวกัน | `lib/gemini/embed.ts` · `supabase/migrations/001` และ `005` |
| เรียกแบบจำลองภาษาครั้งเดียวต่อการค้นหา | `app/api/search/parse/route.ts` (เรียก) เทียบกับ `app/api/search/route.ts` (ไม่เรียก) |
| คะแนน 0–100 พร้อมเหตุผลภาษาไทย · จัดเก็บตามค่าแฮช | `lib/gemini/score.ts` · ตาราง `analyses` |
| 10 หน้าจอหลัก | `components/nav/navItems.ts` (10 รายการ) |
| คลาดเคลื่อน 10 คะแนนเมื่อรันซ้ำ | ผลการวัดด้วย `scripts/compare-gemini-models.ts` ที่บันทึกไว้ใน `CLAUDE.md` หัวข้อ "คะแนน analyze ไม่นิ่ง" — **ไม่ใช่ผลจากการทดสอบการยอมรับระบบ** |
| การนำเข้าอัตโนมัติยังไม่เปิดใช้งาน | `.github/workflows/sync-candidates.yml` (ปิด `schedule:`) · ตาราง `ingest_runs` ว่าง |

> **ไม่ใส่จำนวนผู้สมัครในฐานข้อมูลลงบทคัดย่อโดยตั้งใจ** — ตัวเลขนั้นเปลี่ยนทุกครั้ง
> ที่นำเข้าข้อมูล บทคัดย่อที่พิมพ์ค้างตัวเลขไว้จะผิดทันทีและไม่มีใครกลับมาแก้
> หลักเดียวกับที่ตัดจำนวนเคสออกจากตารางใน `CLAUDE.md`

> **ย่อหน้าที่สามยังต้องมีข้อจำกัดสองข้อไว้** แม้จะตัดเรื่องการทดสอบออกไปแล้ว —
> ความคลาดเคลื่อนของคะแนนและการนำเข้าอัตโนมัติที่ยังไม่เปิดใช้ **ไม่ได้มาจาก UAT**
> แต่เป็นคุณสมบัติของระบบที่ต้องประกาศ บทคัดย่อที่เล่าแต่สิ่งที่ทำได้จะขัดกับ
> บทข้อจำกัดในเล่มเดียวกัน
>
> **ลำดับการตัดเพิ่มถ้ายังยาวเกิน อยู่บนหัวไฟล์แล้ว** (รายการกลไก PDPA
> สามรายการถูกยุบเป็นประโยคเดียวไปแล้วในรอบย่อเมื่อ 2026-10-20)

## สองเรื่องที่เจอตอนตรวจตัวเลข ไม่เกี่ยวกับบทคัดย่อแต่ควรรู้

1. **`docs/uat/results.md` บรรทัด 22 เขียนว่า "ฉบับผู้ใช้ 87 เคส" ซึ่งของจริงคือ 85**
   และช่อง `เวอร์ชันที่ทดสอบ: ______` ยังว่างอยู่ทั้งที่หัวไฟล์ระบุ v1.1.0
   — เป็นเลขที่พิมพ์ค้างแบบเดียวกับที่เพิ่งแก้ไปห้าไฟล์
2. **กิตติกรรมประกาศลงวันที่ "6 เมษายน 2568"** ซึ่ง**ก่อน**เดือนเริ่มดำเนินงาน
   ตามตารางที่ 1-1 (ธันวาคม 2568) น่าจะต้องเป็น **2569** — ตรวจกับปฏิทินจริง
   ก่อนแก้ ผมไม่แก้ให้เองเพราะเป็นวันที่ที่ผู้จัดทำลงนาม
