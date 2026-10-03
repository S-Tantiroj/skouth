'use client'
import { useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase/client'
import { hasAuthError } from '@/lib/auth/signupFlow'
import { accessDeniedMessage, decideAccess } from '@/lib/auth/profileGate'

// หน้าพักหลังผู้ใช้กดลิงก์ยืนยันอีเมล
//
// ทำไมต้องมีหน้านี้แทนที่จะชี้ emailRedirectTo ไป /dashboard ตรงๆ:
// middleware.ts คุ้ม /dashboard และอ่าน session จาก cookie ฝั่ง server ซึ่งทำงาน
// ก่อน JS ฝั่ง client จะได้รัน ตอนผู้ใช้เพิ่งกลับมาจากลิงก์ยืนยัน cookie ยังว่าง
// middleware จึงเด้งไป /login ทันทีและ token ที่ติดมากับ URL หายไปกับ redirect นั้น
// path /auth/* ไม่อยู่ใน matcher ของ middleware หน้านี้จึงเปิดได้โดยไม่ถูกเด้ง
// รอให้ createBrowserClient เขียน session ลง cookie เสร็จ แล้วค่อยพาไป /dashboard
export default function ConfirmEmail() {
  const [failed, setFailed] = useState(false)
  const [blocked, setBlocked] = useState('')

  useEffect(() => {
    const db = getBrowserClient()
    let done = false

    // **ห้าม redirect ก่อนรู้สถานะบัญชี** — ตั้งแต่ migration 022a บัญชีใหม่เกิดมาเป็น
    // `pending` การพาไป /dashboard ทันทีจะทำให้ `getSession()` ฝั่งเซิร์ฟเวอร์คืน null
    // แล้ว layout เด้งกลับไป /login โดยไม่มีอะไรบอกว่าเกิดอะไรขึ้น
    // **คนที่เพิ่งยืนยันอีเมลสำเร็จจะเห็นแค่หน้าล็อกอินเปล่าๆ** แล้วสรุปว่าการยืนยันล้มเหลว
    // ทั้งที่มันสำเร็จแล้วจริง — เป็นความเข้าใจผิดที่ทำให้เขาสมัครใหม่ซ้ำๆ โดยไม่มีประโยชน์
    //
    // ใช้ full page load ไม่ใช่ router.push เพื่อให้ server อ่าน cookie ใหม่
    // มิฉะนั้น middleware จะยังเห็น request ที่ไม่มี session
    const proceed = async (userId: string) => {
      if (done) return
      // ตั้งก่อนเริ่มอ่าน ไม่ใช่หลังอ่านเสร็จ — ไม่งั้น timer 8 วินาทีอาจยิงกลางทาง
      // แล้วเด้งไป /login ทับข้อความที่กำลังจะแสดง
      done = true

      const { data: p, error } = await db
        .from('profiles')
        .select('role, status')
        .eq('id', userId)
        .maybeSingle()

      const decision = decideAccess(p, !!error)
      if (decision.allowed) {
        window.location.href = '/dashboard'
        return
      }

      // ออกจากระบบก่อนแสดงข้อความ ด้วยเหตุผลเดียวกับหน้า /login — คุกกี้ที่ค้างไว้
      // ทำให้ผู้ใช้อยู่ในสถานะ "ล็อกอินอยู่แต่ทำอะไรไม่ได้" ซึ่งอธิบายยากกว่าการไม่ได้ล็อกอิน
      // (signOut ทำให้ onAuthStateChange ยิงด้วย session = null ซึ่ง handler ข้างล่าง
      //  ไม่สนใจ จึงไม่วนกลับมาที่นี่)
      await db.auth.signOut()
      setBlocked(accessDeniedMessage(decision.reason))
    }

    // ลิงก์หมดอายุหรือถูกใช้ไปแล้ว Supabase จะส่ง error กลับมาใน query หรือ fragment
    if (hasAuthError(window.location.search, window.location.hash)) {
      setFailed(true)
      return
    }

    // session อาจถูกสร้างเสร็จก่อน listener จะติด จึงต้องเช็คตรงๆ ด้วย
    db.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) void proceed(session.user.id)
    })

    const { data: sub } = db.auth.onAuthStateChange((_event, session) => {
      if (session?.user) void proceed(session.user.id)
    })

    // ถ้าเกินเวลานี้แล้วยังไม่มี session ให้ถอยไปหน้า login แบบไม่ให้ผู้ใช้ค้าง
    // เขายืนยันอีเมลสำเร็จแล้ว แค่ต้องล็อกอินเอง
    const timer = setTimeout(() => {
      if (!done) {
        done = true
        window.location.href = '/login?confirmed=1'
      }
    }, 8000)

    return () => {
      sub.subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  return (
    <main className="auth-wrap">
      <div className="card stack">
        {failed ? (
          <>
            <h1 style={{ margin: 0 }}>ลิงก์ยืนยันไม่ถูกต้อง</h1>
            {/* **ต้องครอบสองสภาวะ เพราะหน้านี้ไม่รู้ว่าบัญชียืนยันแล้วหรือยัง**
                ข้อความเดิมเขียนว่า "ลองเข้าสู่ระบบดู ถ้ายังไม่ได้ให้สมัครใหม่"
                ซึ่งชี้ทางผิดสำหรับคนที่ยังไม่ยืนยัน — ล็อกอินไม่ผ่านแน่นอน
                และการสมัครใหม่ก็ไปเจอ "อีเมลนี้ถูกใช้สมัครแล้ว" ดูเหมือนทางตัน
                **ทั้งที่การสมัครซ้ำคือสิ่งที่ทำให้ได้ลิงก์ใหม่จริงๆ**
                (ยืนยันแล้ว 18 ก.ย. — อีเมลฉบับที่สองมาจริงและกดแล้วเข้าได้) */}
            <p className="muted" style={{ margin: 0 }}>
              ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว
            </p>
            <ul className="muted" style={{ margin: 0, paddingInlineStart: 18, lineHeight: 1.8 }}>
              <li>ถ้ายืนยันอีเมลไปแล้ว — เข้าสู่ระบบได้เลย</li>
              <li>ถ้ายังไม่เคยยืนยัน — สมัครด้วยอีเมลเดิมอีกครั้ง ระบบจะส่งลิงก์ใหม่ให้</li>
            </ul>
            <a href="/login">ไปหน้าเข้าสู่ระบบ</a>
            <a href="/signup">สมัครด้วยอีเมลเดิมเพื่อรับลิงก์ใหม่</a>
          </>
        ) : blocked ? (
          <>
            {/* **หัวข้อต้องยืนยันว่าการยืนยันอีเมลสำเร็จ** ไม่ใช่ขึ้นแต่ข้อความปฏิเสธ
                ผู้ใช้เพิ่งกดลิงก์จากอีเมลมา ถ้าเห็นแต่ "บัญชีนี้รอการอนุมัติ" เขาจะไม่รู้ว่า
                ขั้นตอนที่เพิ่งทำผ่านแล้วหรือไม่ แล้วกดลิงก์เดิมซ้ำ (ซึ่งใช้ไม่ได้อีก)
                หรือสมัครใหม่ — สองอย่างที่ไม่ช่วยอะไรและทำให้เขาคิดว่าระบบพัง */}
            <h1 style={{ margin: 0 }}>ยืนยันอีเมลเรียบร้อยแล้ว</h1>
            <p style={{ color: 'var(--bad)', margin: 0 }}>{blocked}</p>
            <p className="muted" style={{ margin: 0 }}>
              เมื่อได้รับอนุมัติแล้ว เข้าสู่ระบบด้วยอีเมลและรหัสผ่านเดิมได้ทันที
              ไม่ต้องสมัครใหม่
            </p>
            <a href="/login">ไปหน้าเข้าสู่ระบบ</a>
            <a href="/" className="faint">← กลับหน้าแรก</a>
          </>
        ) : (
          <>
            <h1 style={{ margin: 0 }}>กำลังเข้าสู่ระบบ…</h1>
            <p className="faint" style={{ margin: 0 }}>ยืนยันอีเมลเรียบร้อยแล้ว กำลังพาไปหน้า Dashboard</p>
          </>
        )}
      </div>
    </main>
  )
}
