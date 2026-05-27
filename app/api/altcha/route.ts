import { generateChallenge } from '@/lib/altcha'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const challenge = await generateChallenge()
  return NextResponse.json(challenge)
}
