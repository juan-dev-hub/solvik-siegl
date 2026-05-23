import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('wallet_session')?.value
    if (!token) return NextResponse.redirect(new URL('/', request.url))
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.JWT_SECRET!)
      )
      if (payload.wallet !== process.env.ADMIN_WALLET) {
        return NextResponse.redirect(new URL('/', request.url))
      }
      return NextResponse.next()
    } catch {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  const token = request.cookies.get('wallet_session')?.value
  if (!token) return NextResponse.redirect(new URL('/', request.url))
  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!))
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/', request.url))
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
