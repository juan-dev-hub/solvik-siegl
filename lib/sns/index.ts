import { Connection } from '@solana/web3.js'
import { resolve } from '@bonfida/spl-name-service'

export async function resolveSNSDomain(domain: string): Promise<string | null> {
  try {
    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC!, 'confirmed')
    const owner = await resolve(connection, domain.replace('.sol', ''))
    return owner.toBase58()
  } catch {
    return null
  }
}

export async function verifyWalletOwnsDomain(
  walletAddress: string,
  domain: string
): Promise<boolean> {
  const owner = await resolveSNSDomain(domain)
  return owner === walletAddress
}
