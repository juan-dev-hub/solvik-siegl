import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(new URL('/?error=invalid', req.url))

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (payload.type !== 'mobile_transfer' || typeof payload.wallet !== 'string') {
      return NextResponse.redirect(new URL('/?error=invalid', req.url))
    }

    const sessionToken = await new SignJWT({ wallet: payload.wallet })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(JWT_SECRET)

    const isProd = process.env.NODE_ENV === 'production'
    const res = NextResponse.redirect(new URL('/dashboard', req.url))
    res.cookies.set('wallet_session', sessionToken, {
      httpOnly: true, secure: isProd, sameSite: 'lax',
    })
    res.cookies.set('session_active', '1', {
      httpOnly: false, secure: isProd, sameSite: 'lax',
    })
    return res
  } catch {
    return NextResponse.redirect(new URL('/?error=expired', req.url))
  }
}
