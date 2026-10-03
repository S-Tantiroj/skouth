import {
  applyToggle,
  isSaved,
  planToggle,
  SHORTLIST_NAME_MAX,
  validateListName,
} from './saveState'

describe('isSaved', () => {
  test('ไม่อยู่ในรายการใดเลย → ยังไม่ถูกบันทึก', () => {
    expect(isSaved([])).toBe(false)
  })

  test('อยู่อย่างน้อยหนึ่งรายการ → ถูกบันทึกแล้ว', () => {
    expect(isSaved(['a'])).toBe(true)
    expect(isSaved(['a', 'b'])).toBe(true)
  })
})

describe('planToggle', () => {
  test('ยังไม่อยู่ในรายการ → add', () => {
    expect(planToggle([], [], 'L1')).toEqual({ kind: 'add', listId: 'L1' })
    expect(planToggle(['L2'], [], 'L1')).toEqual({ kind: 'add', listId: 'L1' })
  })

  test('อยู่ในรายการแล้ว → remove', () => {
    expect(planToggle(['L1'], [], 'L1')).toEqual({ kind: 'remove', listId: 'L1' })
  })

  // **หัวใจของฟังก์ชันนี้** — ดับเบิลคลิกเร็วๆ จะได้ add กับ remove วิ่งพร้อมกัน
  // แล้วผลสุดท้ายขึ้นกับว่าอันไหนถึงฐานก่อน ซึ่งไม่ใช่สิ่งที่ผู้ใช้เห็นบนหน้าจอเสมอไป
  test('รายการที่มีคำขอค้างอยู่ ต้องไม่ยิงซ้ำ', () => {
    expect(planToggle([], ['L1'], 'L1')).toBeNull()
    expect(planToggle(['L1'], ['L1'], 'L1')).toBeNull()
  })

  test('คำขอค้างที่รายการอื่นไม่กันรายการนี้', () => {
    // ติ๊กหลายรายการพร้อมกันได้ — ล็อกทั้งแผงจะทำให้ใช้งานช้าโดยไม่จำเป็น
    expect(planToggle([], ['L2'], 'L1')).toEqual({ kind: 'add', listId: 'L1' })
  })
})

describe('applyToggle', () => {
  test('add เพิ่มเข้าไป', () => {
    expect(applyToggle([], 'L1', 'add')).toEqual(['L1'])
  })

  test('remove เอาออก', () => {
    expect(applyToggle(['L1', 'L2'], 'L1', 'remove')).toEqual(['L2'])
  })

  // prop `memberOf` ถูกส่งมาจากหลายหน้า ค่าซ้ำจึงเป็นไปได้
  test('add ซ้ำไม่ทำให้มีสองรายการ', () => {
    expect(applyToggle(['L1'], 'L1', 'add')).toEqual(['L1'])
  })

  test('remove สิ่งที่ไม่มีอยู่ไม่พัง', () => {
    expect(applyToggle(['L2'], 'L1', 'remove')).toEqual(['L2'])
  })

  test('ไม่แก้อาร์เรย์เดิม', () => {
    const before = ['L1']
    applyToggle(before, 'L2', 'add')
    expect(before).toEqual(['L1'])
  })
})

describe('validateListName', () => {
  test('ชื่อปกติผ่านและถูกตัดช่องว่างหัวท้าย', () => {
    // constraint ใน 022b ตรวจ trim แต่ไม่ได้ตัดให้ — ถ้าไม่ตัดที่นี่ ชื่อจะถูกเก็บ
    // พร้อมช่องว่างแล้วเรียงลำดับผิดและเทียบกับค่าอื่นไม่ตรง
    expect(validateListName('  น่าสนใจ  ')).toEqual({ ok: true, value: 'น่าสนใจ' })
  })

  test('ชื่อว่างและช่องว่างล้วนไม่ผ่าน', () => {
    expect(validateListName('').ok).toBe(false)
    expect(validateListName('   ').ok).toBe(false)
  })

  // **เขียนเลขลงไปตรงๆ ไม่อ้าง SHORTLIST_NAME_MAX** — เทสต์ที่อ่านค่าคงที่จากโค้ด
  // จะเขียวต่อไปแม้มีคนเปลี่ยนเพดานให้ไม่ตรงกับ constraint ในฐานข้อมูล
  // เพราะมันไปทดสอบค่าใหม่ตามที่โค้ดบอก (บทเรียนจาก JOB_TEXT_LIMITS)
  test('ยาว 60 ตัวผ่าน 61 ตัวไม่ผ่าน', () => {
    expect(validateListName('ก'.repeat(60)).ok).toBe(true)
    expect(validateListName('ก'.repeat(61)).ok).toBe(false)
  })

  test('ค่าคงที่ตรงกับ constraint ใน migration 022b', () => {
    // ค่านี้เป็นสัญญากับ DDL ของตาราง ไม่ใช่ค่าที่เราตั้งเองได้ตามใจ
    expect(SHORTLIST_NAME_MAX).toBe(60)
  })

  test('นับความยาวหลังตัดช่องว่าง ไม่ใช่ก่อน', () => {
    // ตรงกับ char_length(trim(name)) ในฐานข้อมูล — ถ้านับก่อนตัด ชื่อที่ผ่าน
    // ฐานข้อมูลได้จะถูกแอปปฏิเสธ ซึ่งผู้ใช้จะไม่เข้าใจว่าทำไม
    expect(validateListName('  ' + 'ก'.repeat(60) + '  ').ok).toBe(true)
  })
})
