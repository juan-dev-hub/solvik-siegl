import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { mintCNFT } from '@/lib/cnft'
import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress } from '@solana/spl-token'

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com'
const FEE_BPS = 500 // 5%

/**
 * Verifies that txHash contains a transferChecked SPL-token instruction
 * that sends at least `minAmountLamports` USDC to `expectedRecipientAta`.
 */
async function verifyUsdcTransfer(
  txHash: string,
  expectedRecipientAta: string,
  minAmountLamports: number,
): Promise<boolean> {
  try {
    const conn = new Connection(RPC, 'confirmed')
    const tx = await conn.getParsedTransaction(txHash, { maxSupportedTransactionVersion: 0 })
    if (!tx) return false

    type ParsedIx = {
      program: string
      parsed?: {
        type: string
        info: { source: string; destination: string; tokenAmount?: { amount: string }; mint: string }
      }
    }

    const instructions = tx.transaction.message.instructions as ParsedIx[]
    for (const ix of instructions) {
      if (ix.program === 'spl-token' && ix.parsed?.type === 'transferChecked') {
        const { destination, tokenAmount, mint } = ix.parsed.info
        if (
          mint === USDC_MINT.toBase58() &&
          destination === expectedRecipientAta
        ) {
          const actual = parseInt(tokenAmount?.amount ?? '0', 10)
          if (actual >= minAmountLamports) return true
        }
      }
    }
    return false
  } catch { return false }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { txHash, buyerWallet } = (await req.json()) as { txHash: string; buyerWallet: string }
    if (!txHash || !buyerWallet) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Idempotency — reject duplicate tx hashes
    const { data: existing } = await supabaseAdmin
      .from('digital_licenses')
      .select('id')
      .eq('solana_tx_hash', txHash)
      .single()
    if (existing) return NextResponse.json({ error: 'Transaction already used' }, { status: 409 })

    const { data: product } = await supabaseAdmin
      .from('digital_products')
      .select('*')
      .eq('id', params.id)
      .eq('is_active', true)
      .single()
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    if (product.sold_copies >= product.total_copies) {
      return NextResponse.json({ error: 'Sold out' }, { status: 409 })
    }

    // Derive issuer's USDC Associated Token Account
    const issuerPubkey = new PublicKey(product.issuer_wallet)
    const issuerAta = await getAssociatedTokenAddress(USDC_MINT, issuerPubkey)

    // Minimum acceptable amount: price minus the 5% fee the client retains
    const minAmount = Math.floor(product.price_usdc * (1 - FEE_BPS / 10000))

    const valid = await verifyUsdcTransfer(txHash, issuerAta.toBase58(), minAmount)
    if (!valid) {
      return NextResponse.json({ error: 'Payment not verified on-chain' }, { status: 400 })
    }

    // Mint license cNFT to buyer
    const licenseId = crypto.randomUUID()
    const cnftAddress = await mintCNFT({
      name: `Licencia: ${product.title}`,
      symbol: 'SVKL',
      uri: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.solvikstudio.com'}/license/${licenseId}`,
      recipientAddress: buyerWallet,
    }).catch(() => null)

    const { data: license, error } = await supabaseAdmin
      .from('digital_licenses')
      .insert({
        id: licenseId,
        product_id: params.id,
        buyer_wallet: buyerWallet,
        cnft_address: cnftAddress,
        arweave_tx_id: product.arweave_tx_id,
        solana_tx_hash: txHash,
      })
      .select()
      .single()

    if (error) throw error

    // Atomic increment to avoid race conditions with concurrent purchases
    await supabaseAdmin.rpc('increment_sold_copies', { p_product_id: params.id })

    return NextResponse.json({ ok: true, licenseId: license.id })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
