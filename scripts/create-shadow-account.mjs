/**
 * Script de uso único: crea el storage account en Shadow Drive.
 * Ejecutar: node scripts/create-shadow-account.mjs
 *
 * Requiere en .env.local:
 *   FEE_POOL_WALLET_SECRET  → clave privada de la wallet owner
 *   NEXT_PUBLIC_SOLANA_RPC  → RPC de Solana (mainnet o devnet)
 *
 * Al terminar, copia el valor de SHADOW_DRIVE_ACCOUNT y pégalo en .env.local
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = join(__dir, '..')

// Leer .env.local manualmente (sin dotenv para no agregar dependencia)
const envLines = readFileSync(join(root, '.env.local'), 'utf8').split('\n')
const env = {}
for (const line of envLines) {
  const [k, ...v] = line.split('=')
  if (k && !k.startsWith('#')) env[k.trim()] = v.join('=').trim()
}

const rpc    = env['NEXT_PUBLIC_SOLANA_RPC']
const secret = env['FEE_POOL_WALLET_SECRET']

if (!rpc || !secret) {
  console.error('❌  Faltan NEXT_PUBLIC_SOLANA_RPC o FEE_POOL_WALLET_SECRET en .env.local')
  process.exit(1)
}

const { Connection, Keypair } = await import('@solana/web3.js')
const { ShdwDrive }           = await import('@shadow-drive/sdk')

const keypair    = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)))
const connection = new Connection(rpc, 'confirmed')

console.log('🔑  Wallet:', keypair.publicKey.toBase58())
console.log('🌐  RPC:   ', rpc)
console.log('⏳  Creando storage account en Shadow Drive (40 GB)...\n')

const drive  = await new ShdwDrive(connection, keypair).init()
const result = await drive.createStorageAccount('solvik-certs', '40GB')

console.log('✅  Storage account creado:')
console.log('    shdw_bucket:          ', result.shdw_bucket)
console.log('    transaction_signature:', result.transaction_signature)
console.log('\n👉  Agrega esto a tu .env.local:')
console.log(`    SHADOW_DRIVE_ACCOUNT=${result.shdw_bucket}`)
