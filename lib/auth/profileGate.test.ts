import { accessDeniedMessage, decideAccess, ROLE_VALUES } from './profileGate'

describe('decideAccess', () => {
  test('แถวที่มี role ถูกต้องและได้รับอนุมัติแล้วผ่าน', () => {
    for (const role of ROLE_VALUES) {
      expect(decideAccess({ role, status: 'approved' }, false)).toEqual({ allowed: true, role })
    }
  })

  // นี่คือกรณีที่ทำให้ไฟล์นี้ถูกสร้างขึ้น — เจอจริง 2026-09-17
  test('ไม่มีแถวเลย ต้องไม่ผ่าน ไม่ใช่ได้ member', () => {
    expect(decideAccess(null, false)).toEqual({ allowed: false, reason: 'no-profile' })
    expect(decideAccess(undefined, false)).toEqual({ allowed: false, reason: 'no-profile' })
  })

  test('อ่านล้มเหลวแยกจากไม่มีแถว แม้ row เป็น null เหมือนกัน', () => {
    // **ลำดับการตรวจ** — ตอนอ่านล้ม row ก็เป็น null ถ้าตรวจ !row ก่อน hadError
    // จะรายงานว่า "ไม่มีโปรไฟล์" ทั้งที่ฐานข้อมูลพัง แล้วไล่หาสาเหตุผิดที่
    expect(decideAccess(null, true)).toEqual({ allowed: false, reason: 'read-failed' })
    expect(decideAccess({ role: 'admin' }, true)).toEqual({ allowed: false, reason: 'read-failed' })
  })

  test('role ที่ enum ไม่รู้จักต้องปิดประตู ไม่ใช่เปิด', () => {
    // หลักเดียวกับ ROLE_RANK[unknown] ?? 0 ใน hasRole
    expect(decideAccess({ role: 'superuser' }, false)).toEqual({ allowed: false, reason: 'bad-role' })
    expect(decideAccess({ role: '' }, false)).toEqual({ allowed: false, reason: 'bad-role' })
    expect(decideAccess({ role: null }, false)).toEqual({ allowed: false, reason: 'bad-role' })
    expect(decideAccess({}, false)).toEqual({ allowed: false, reason: 'bad-role' })
  })

  test('ค่าที่ไม่ใช่อ็อบเจกต์ไม่ทำให้ระเบิด', () => {
    expect(decideAccess('admin', false).allowed).toBe(false)
    expect(decideAccess(42, false).allowed).toBe(false)
  })

  test('status pending ปิดประตูพร้อมเหตุผลที่บอกว่ารออนุมัติ', () => {
    expect(decideAccess({ role: 'member', status: 'pending' }, false)).toEqual({
      allowed: false,
      reason: 'pending',
    })
  })

  test('status rejected แยกจาก pending เพราะผู้ใช้ต้องทำคนละอย่าง', () => {
    expect(decideAccess({ role: 'member', status: 'rejected' }, false)).toEqual({
      allowed: false,
      reason: 'rejected',
    })
  })

  // **ลำดับการตรวจ** — ข้อมูลเพี้ยนต้องถูกจับก่อนสถานะเสมอ ไม่งั้นบัญชีที่ role เสีย
  // จะไปโผล่ในคิว "รออนุมัติ" แล้วผู้ดูแลจะกดอนุมัติให้บัญชีที่พัง
  test('role เพี้ยนและ status pending พร้อมกัน คืน bad-role ไม่ใช่ pending', () => {
    expect(decideAccess({ role: 'wizard', status: 'pending' }, false)).toEqual({
      allowed: false,
      reason: 'bad-role',
    })
  })

  // หลักเดียวกับ ROLE_RANK[unknown] ?? 0 — ค่าที่ไม่รู้จักปิดประตู ไม่ใช่เปิด
  test('status ที่ enum ไม่รู้จักปิดประตู', () => {
    expect(decideAccess({ role: 'member', status: 'weird' }, false).allowed).toBe(false)
    expect(decideAccess({ role: 'member', status: null }, false).allowed).toBe(false)
  })

  // **ช่องที่อันตรายที่สุด** — ถ้าแถวที่ไม่มี status แปลว่าผ่าน วันไหนมีคนลืม
  // .select('status') ทุกคนจะเข้าได้หมดโดยไม่มีสัญญาณใดเลย
  test('แถวที่ไม่มี status เลยต้องไม่ผ่าน', () => {
    expect(decideAccess({ role: 'admin' }, false).allowed).toBe(false)
  })
})

describe('accessDeniedMessage', () => {
  test('บัญชีไม่มีโปรไฟล์ ไม่บอกให้ลองใหม่', () => {
    // ลองอีกกี่ครั้งก็เหมือนเดิม — ข้อความที่ชวนให้กดซ้ำทำให้ผู้ใช้สรุปว่าเว็บพัง
    // แทนที่จะไปหาผู้ดูแล (บั๊กเดียวกับ catch-all ของ PATCH /api/jobs)
    const m = accessDeniedMessage('no-profile')
    expect(m).toContain('ผู้ดูแลระบบ')
    expect(m).not.toContain('ลองใหม่')
  })

  test('ระบบขัดข้องชั่วคราวบอกให้ลองใหม่ได้ เพราะลองแล้วอาจหาย', () => {
    expect(accessDeniedMessage('read-failed')).toContain('ลองใหม่')
  })

  test('ไม่หลุดรายละเอียดภายในออกไป', () => {
    for (const r of ['read-failed', 'no-profile', 'bad-role', 'pending', 'rejected'] as const) {
      const m = accessDeniedMessage(r)
      expect(m).not.toContain('profiles')
      expect(m).not.toContain('role')
      expect(m).not.toContain('status')
    }
  })

  test('รออนุมัติกับไม่ได้รับอนุมัติเป็นคนละข้อความ', () => {
    // สองสถานะนี้ผู้ใช้ต้องทำคนละอย่าง — อันหนึ่งรอได้ อีกอันรอไปก็ไม่มีอะไรเปลี่ยน
    expect(accessDeniedMessage('pending')).toContain('รอการอนุมัติ')
    expect(accessDeniedMessage('rejected')).toContain('ไม่ได้รับอนุมัติ')
    expect(accessDeniedMessage('pending')).not.toBe(accessDeniedMessage('rejected'))
  })

  test('ทั้งสองสถานะบอกช่องทางต่อไป ไม่ใช่ทางตัน', () => {
    expect(accessDeniedMessage('pending')).toContain('ผู้ดูแล')
    expect(accessDeniedMessage('rejected')).toContain('ผู้ดูแล')
  })
})
