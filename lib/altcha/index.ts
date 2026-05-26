import { createChallenge, verifySolution } from 'altcha-lib'

export async function generateChallenge() {
  return createChallenge({
    hmacKey: process.env.ALTCHA_HMAC_KEY!,
    maxNumber: 100000,
  })
}

export async function verifyChallenge(payload: string): Promise<boolean> {
  try {
    return await verifySolution(payload, process.env.ALTCHA_HMAC_KEY!)
  } catch {
    return false
  }
}
