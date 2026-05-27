import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import nacl from 'tweetnacl'
import { PublicKey } from '@solana/web3.js'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function createWalletSession(walletAddress: string) {
  const token = await new SignJWT({ wallet: walletAddress })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(JWT_SECRET)
  const cookieStore = await cookies()
  cookieStore.set('wallet_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    // No maxAge/expires = session cookie — browser deletes it on close
  })
  cookieStore.set('session_active', '1', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    // No maxAge/expires = session cookie
  })
  return token
}

export async function getWalletSession(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('wallet_session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.wallet as string
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
