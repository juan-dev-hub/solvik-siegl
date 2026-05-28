import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import nacl from 'tweetnacl'
import { PublicKey } from '@solana/web3.js'
import { supabaseAdmin } from '@/lib/supabase'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const isProd = () => process.env.NODE_ENV === 'production'

// Genera JWT con nonce y actualiza la DB — invalida cualquier sesión anterior
export async function createSessionToken(walletAddress: string): Promise<string> {
  const nonce = crypto.randomUUID()
  await supabaseAdmin
    .from('issuers')
    .update({ session_nonce: nonce })
    .eq('wallet_address', walletAddress)
  return new SignJWT({ wallet: walletAddress, nonce })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(JWT_SECRET)
}

export async function createWalletSession(walletAddress: string) {
  const token = await createSessionToken(walletAddress)
  const cookieStore = await cookies()
  cookieStore.set('wallet_session', token, {
    httpOnly: true, secure: isProd(), sameSite: 'lax',
  })
  cookieStore.set('session_active', '1', {
    httpOnly: false, secure: isProd(), sameSite: 'lax',
  })
  return token
}

export async function getWalletSession(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('wallet_session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const wallet = payload.wallet as string
    const nonce = payload.nonce as string | undefined

    // Sesiones antiguas (sin nonce) siguen válidas hasta que expiren
    if (!nonce) return wallet

    // Verificar que el nonce coincida con el de la DB
    const { data } = await supabaseAdmin
      .from('issuers')
      .select('session_nonce')
      .eq('wallet_address', wallet)
      .single()

    if (!data || data.session_nonce !== nonce) return null
    return wallet
  } catch {
    return null
  }
}

export function verifyWalletSignature(
  message: string,
  signature: number[],
  walletAddress: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message)
    const signatureBytes = new Uint8Array(signature)
    const publicKeyBytes = new PublicKey(walletAddress).toBytes()
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
  } catch {
    return false
  }
}
