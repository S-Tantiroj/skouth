import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Protects app routes: unauthenticated users are redirected to /login.
// และต่ออายุ session ให้ทุกคำขอ — ที่นี่เป็นจุดเดียวที่เขียนคุกกี้ใหม่กลับไปที่เบราว์เซอร์ได้แน่นอน
export async function middleware(req: NextRequest) {
  // `let` ไม่ใช่ `const` — ต้องสร้าง response ใหม่หลังเขียนคุกกี้ลง request (แบบที่ @supabase/ssr กำหนด)
  // ไม่งั้น server component / route handler ที่ทำงานต่อจากนี้ได้คุกกี้เก่าที่หมดอายุ แล้วต่ออายุซ้ำ
  // ด้วย refresh token ที่ถูกใช้ไปแล้ว ซึ่ง Supabase ปฏิเสธ (refresh_token_not_found) → หลุดออกจากระบบ
  let res = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = req.nextUrl.pathname
  // API ผ่าน middleware เพื่อต่ออายุ session เท่านั้น — ไม่ redirect เพราะผู้เรียกคือ fetch
  // แต่ละ route ตรวจสิทธิ์เองและตอบ 401/403 อยู่แล้ว
  if (path.startsWith('/api/')) return res
  const isAuthPage = path.startsWith('/login') || path.startsWith('/signup')
  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return res
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/search/:path*',
    '/jobs/:path*',
    '/import/:path*',
    '/candidates/:path*',
    '/shortlists/:path*',
    '/admin/:path*',
    '/settings/:path*',
    '/self-assessment/:path*',
    '/api/:path*',
  ],
}
