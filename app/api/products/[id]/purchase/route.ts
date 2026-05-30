import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { mintCNFT } from '@/lib/cnft'
import { verifyUSDCPayment, calculateBookSplit, executeUSDCSplit } from '@/lib/solana-pay'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { txHash } = (await req.json()) as { txHash: string }
    if (!txHash) {
      return NextResponse.json({ error: 'Missing txHash' }, { status: 400 })
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

    // Payment goes to OWNER_WALLET; backend distributes to issuer after verification.
    const { valid, actualAmount, buyerWallet } = await verifyUSDCPayment(
      txHash,
      (process.env.OWNER_WALLET ?? process.env.NEXT_PUBLIC_OWNER_WALLET)!,
      BigInt(product.price_usdc)
    )
    if (!valid) {
      return NextResponse.json({ error: 'Payment not verified on-chain' }, { status: 400 })
    }

    // 5% Solvik commission | 15% fee pool | 10% contract | 70% issuer
    const split = calculateBookSplit(actualAmount)

    // Transfer fee pool, contract, and issuer shares in one transaction
    const splitTxHash = await executeUSDCSplit([
      { recipient: process.env.FEE_POOL_WALLET!,  amount: split.fee_pool_amount },
      { recipient: process.env.CONTRACT_WALLET!,   amount: split.contract_amount },
      { recipient: product.issuer_wallet,           amount: split.issuer_amount },
    ])

    // Mint license cNFT to buyer
    const licenseId = crypto.randomUUID()
    const cnftAddress = await mintCNFT({
      name: `Licencia: ${product.title}`,
      symbol: 'SVKL',
      uri: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.solvikstudio.com'}/license/${licenseId}`,
      recipientAddress: buyerWallet,
      issuerWallet: product.issuer_wallet,
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

    await supabaseAdmin.rpc('increment_sold_copies', { p_product_id: params.id })

    await supabaseAdmin.from('payments').insert({
      issuer_wallet: product.issuer_wallet,
      buyer_wallet: buyerWallet,
      type: 'book',
      product_id: params.id,
      usdc_amount: Number(actualAmount),
      owner_amount: Number(split.comision_solvik),
      fee_pool_amount: Number(split.fee_pool_amount),
      contract_amount: Number(split.contract_amount),
      issuer_amount: Number(split.issuer_amount),
      solana_tx_hash: txHash,
      split_tx_hash: splitTxHash,
    })

    return NextResponse.json({ ok: true, licenseId: license.id })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
