import { NextRequest, NextResponse } from 'next/server'
import { calculateStorageForUsdc } from '@/lib/shadow/price'

export async function GET(req: NextRequest) {
  const usdc = Number(req.nextUrl.searchParams.get('usdc') ?? '0')
  if (usdc <= 0) return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  try {
    const result = await calculateStorageForUsdc(usdc)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
