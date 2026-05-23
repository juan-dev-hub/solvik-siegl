import { NextResponse } from 'next/server'
import { Connection } from '@solana/web3.js'
import { PythHttpClient, getPythClusterApiUrl, getPythProgramKeyForCluster } from '@pythnetwork/client'

export const revalidate = 60

export async function GET() {
  try {
    const connection = new Connection(
      getPythClusterApiUrl('mainnet-beta'),
      'confirmed'
    )
    const pythPublicKey = getPythProgramKeyForCluster('mainnet-beta')
    const pythClient = new PythHttpClient(connection, pythPublicKey)
    const data = await pythClient.getData()

    const arProduct = data.products.find(p => p.base === 'AR' && p.quote_currency === 'USD')
    let arUsdPrice = 0
    if (arProduct) {
      const priceData = data.productPrice.get(arProduct.symbol)
      arUsdPrice = priceData?.price ?? 0
    }

    // Estimated bytes for a typical cert (200 KB PDF)
    const BYTES = 200 * 1024
    const AR_COST_BYTES = 0.0000001 // approximate AR per byte
    const certCostAR = BYTES * AR_COST_BYTES
    const certCostUSD = arUsdPrice > 0 ? certCostAR * arUsdPrice : null

    return NextResponse.json({
      ar_usd: arUsdPrice,
      cert_cost_ar: certCostAR,
      cert_cost_usd: certCostUSD,
    })
  } catch (err) {
    console.error('Prices error:', err)
    return NextResponse.json({ ar_usd: 0, cert_cost_ar: 0, cert_cost_usd: null })
  }
}
