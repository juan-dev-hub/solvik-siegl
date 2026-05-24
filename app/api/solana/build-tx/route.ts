import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
} from '@solana/spl-token'

const USDC_MINT     = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const USDC_DECIMALS = 6

export async function POST(req: NextRequest) {
  try {
    const { buyer_wallet, amount_micro_usdc } = (await req.json()) as {
      buyer_wallet: string
      amount_micro_usdc: number
    }

    const buyerPubkey = new PublicKey(buyer_wallet)
    const ownerPubkey = new PublicKey(process.env.OWNER_WALLET!)

    const conn = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC!, 'confirmed')

    const [buyerAta, ownerAta, { blockhash, lastValidBlockHeight }] = await Promise.all([
      getAssociatedTokenAddress(USDC_MINT, buyerPubkey),
      getAssociatedTokenAddress(USDC_MINT, ownerPubkey),
      conn.getLatestBlockhash('confirmed'),
    ])

    const tx = new Transaction()
    tx.recentBlockhash = blockhash
    tx.feePayer = buyerPubkey

    // Crea la ATA del owner si no existe; no hace nada si ya existe
    tx.add(createAssociatedTokenAccountIdempotentInstruction(
      buyerPubkey, ownerAta, ownerPubkey, USDC_MINT,
    ))
    tx.add(createTransferCheckedInstruction(
      buyerAta, USDC_MINT, ownerAta, buyerPubkey,
      BigInt(amount_micro_usdc), USDC_DECIMALS,
    ))

    // Serializar sin firmas para que el cliente pueda firmar
    const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false })
    return NextResponse.json({
      transaction: Buffer.from(serialized).toString('base64'),
      lastValidBlockHeight,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
