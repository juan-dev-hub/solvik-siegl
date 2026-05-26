import { createClient } from '@supabase/supabase-js'
import { verifySubscription } from '../contract'

const ALLOWED_TYPES = ['application/pdf', 'image/webp', 'video/webm']
const MAX_SIZE = 5_000_000

export async function validateFileAndAccess(
  walletAddress: string,
  fileSize: number,
  fileType: string
): Promise<{ valid: boolean; error?: string }> {
  const subscription = await verifySubscription(walletAddress)
  if (!subscription.is_active) {
    return { valid: false, error: 'Suscripción inactiva o vencida.' }
  }

  if (!ALLOWED_TYPES.includes(fileType)) {
    return {
      valid: false,
      error: 'Solo aceptamos PDF, WebP y WebM. Convierte tu archivo para pagar menos en Arweave.',
    }
  }

  if (fileSize > MAX_SIZE) {
    return { valid: false, error: 'El archivo excede 5MB.' }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: issuer } = await supabase
    .from('issuers')
    .select('storage_used_bytes, storage_limit_bytes')
    .eq('wallet_address', walletAddress)
    .single()

  if (!issuer) return { valid: false, error: 'Issuer no encontrado.' }

  const spaceAvailable = issuer.storage_limit_bytes - issuer.storage_used_bytes
  if (spaceAvailable < fileSize) {
    return { valid: false, error: 'Espacio insuficiente. Actualiza tu plan.' }
  }

  return { valid: true }
}

export async function updateStorageUsed(
  walletAddress: string,
  fileSize: number
): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: issuer } = await supabase
    .from('issuers')
    .select('storage_used_bytes')
    .eq('wallet_address', walletAddress)
    .single()

  if (issuer) {
    await supabase
      .from('issuers')
      .update({ storage_used_bytes: issuer.storage_used_bytes + fileSize })
      .eq('wallet_address', walletAddress)
  }
}
