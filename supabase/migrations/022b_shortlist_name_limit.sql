-- 022b — เพดานความยาวชื่อ Shortlist
--
-- **ไฟล์นี้กระทบเว็บที่ deploy อยู่ทันทีที่รัน ต่างจาก 022a**
-- ตาราง `shortlists` ถูกใช้งานจริงอยู่แล้ว และโค้ดเวอร์ชันที่ deploy อยู่ยังไม่มี
-- `maxLength={60}` ที่ช่องกรอก คนที่สร้าง Shortlist ชื่อยาวเกินบนเวอร์ชันนั้น
-- จะเห็นข้อความ Postgres ดิบ เพราะโค้ดเดิมเขียน `setMsg(error.message)`
-- **จึงต้องรันพร้อมตอน deploy เฟส 3** ไม่ใช่รันล่วงหน้าเหมือน 022a
--
-- **ก่อนรันต้องตรวจแถวเดิมก่อน** — ALTER TABLE ADD CONSTRAINT ตรวจแถวที่มีอยู่ด้วย
-- มีแถวผิดเงื่อนไขแม้แถวเดียว migration จะล้มทั้งไฟล์:
--
--   select id, name, char_length(name) as len from shortlists
--   where char_length(trim(name)) not between 1 and 60;
--
-- **ทำไมต้องมี constraint ทั้งที่ฟอร์มมี maxLength แล้ว** — `maxLength` กันการพิมพ์
-- และการวางได้ แต่กันคำขอที่ยิงตรงมาที่ PostgREST ด้วย anon key ซึ่งเป็นค่าสาธารณะไม่ได้
-- หลักเดียวกับที่ `lib/jobs/validate.ts` บันทึกไว้: ด่านที่หน้าจอไม่ใช่ด่าน
--
-- **`trim` อยู่ข้างใน `char_length` โดยตั้งใจ** — ชื่อที่เป็นช่องว่างล้วนต้องไม่ผ่าน
-- ถ้าเขียน `char_length(name) between 1 and 60` ชื่อ "   " จะผ่านเพราะยาว 3 ตัว
-- แล้วผู้ใช้จะได้การ์ดที่ไม่มีชื่อบนหน้า Shortlist ซึ่งกดแก้กลับก็ยาก
-- **แต่ constraint ไม่ได้ตัดช่องว่างให้** — ชื่อ " ก " ยังถูกเก็บพร้อมช่องว่าง
-- การตัดต้องทำที่ฝั่งแอปก่อนส่ง (เหตุผลเดียวกับ `normalizeDisplayName`)
--
-- ไม่มี unique constraint บนชื่อโดยตั้งใจ — ผู้ใช้ตั้งชื่อซ้ำได้ถ้าต้องการ
-- การห้ามจะทำให้คนที่พิมพ์ชื่อทั่วไปอย่าง "น่าสนใจ" กดสร้างไม่ผ่านโดยไม่เข้าใจว่าทำไม

alter table shortlists add constraint shortlists_name_len
  check (char_length(trim(name)) between 1 and 60);
