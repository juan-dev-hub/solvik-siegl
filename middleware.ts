import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { createClient } from '@supabase/supabase-js'

const SECRET = () => new TextEncoder().encode(process.env.JWT_SECRET!)

async function getWallet(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('wallet_session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET())
    return payload.wallet as string
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Admin ──────────────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    const wallet = await getWallet(request)
    if (!wallet || wallet !== process.env.ADMIN_WALLET) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  if (pathname.startsWith('/dashboard')) {
    const wallet = await getWallet(request)
    if (!wallet) return NextResponse.redirect(new URL('/', request.url))

    // Check active plan — no plan = redirect to pricing, no exceptions
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data } = await supabase
      .from('issuers')
      .select('plan')
      .eq('wallet_address', wallet)
      .single()

    if (!data?.plan) {
      return NextResponse.redirect(new URL('/pricing', request.url))
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
