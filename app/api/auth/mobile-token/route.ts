import { NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { getWalletSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function POST() {
  const wallet = await getWalletSession()
  if (!wallet) return NextResponse.json({ error: 'No session' }, { status: 401 })

  const token = await new SignJWT({ wallet, type: 'mobile_transfer' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m')
    .sign(JWT_SECRET)

  return NextResponse.json({ token })
}
