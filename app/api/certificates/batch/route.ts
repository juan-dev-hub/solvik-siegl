import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'
import JSZip from 'jszip'

const ALLOWED_EXTS = ['pdf', 'webp', 'webm']
const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf', webp: 'image/webp', webm: 'video/webm',
}

export async function POST(req: NextRequest) {
  try {
    const wallet = await getWalletSession()
    if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: issuer } = await supabaseAdmin
      .from('issuers').select('*').eq('wallet_address', wallet).single()
    if (!issuer) return NextResponse.json({ error: 'Issuer not found' }, { status: 404 })

    const fd = await req.formData()
    const zipFile  = fd.get('zip') as File | null
    const docType  = fd.get('doc_type') as string
    const expiresAt = fd.get('expires_at') as string | null

    if (!zipFile) return NextResponse.json({ error: 'ZIP required' }, { status: 400 })
    if (zipFile.size > 50 * 1024 * 1024) return NextResponse.json({ error: 'ZIP exceeds 50 MB' }, { status: 400 })

    const zip = await JSZip.loadAsync(await zipFile.arrayBuffer())
    const validFiles: { name: string; ext: string }[] = []
    zip.forEach((path, entry) => {
      if (!entry.dir) {
        const ext = path.split('.').pop()?.toLowerCase() ?? ''
        if (ALLOWED_EXTS.includes(ext)) {
          const baseName = path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? path
          validFiles.push({ name: baseName, ext })
        }
      }
    })

    if (validFiles.length === 0) return NextResponse.json({ error: 'No valid files in ZIP' }, { status: 400 })

    // Create batch job
    const { data: job } = await supabaseAdmin
      .from('batch_jobs')
      .insert({ issuer_wallet: wallet, total_files: validFiles.length })
      .select('id')
      .single()

    if (!job) return NextResponse.json({ error: 'Failed to create batch job' }, { status: 500 })

    // Process async in background (fire and forget)
    processBatch({
      jobId: job.id,
      wallet,
      issuerName: issuer.institution_name,
      validFiles,
      docType,
      expiresAt,
      zip,
    }).catch(e => console.error('Batch error:', e))

    return NextResponse.json({ batch_job_id: job.id })
  } catch (err) {
    console.error('Batch route error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

async function processBatch(params: {
  jobId: string
  wallet: string
  issuerName: string
  validFiles: { name: string; ext: string }[]
  docType: string
  expiresAt: string | null
  zip: JSZip
}) {
  const { jobId, wallet, issuerName, validFiles, docType, expiresAt, zip } = params

  // Dynamic import to avoid heavy bundling
  const { default: PQueue } = await import('p-queue')
  const { uploadToShdwDrive } = await import('@/lib/shdwdrive')
  const { createAttestation } = await import('@/lib/sas')

  const queue = new PQueue({ concurrency: 3 })
  let processed = 0, succeeded = 0, failed = 0

  const tasks = validFiles.map(({ name, ext }) => async () => {
    try {
      const entryKey = Object.keys(zip.files).find(k => {
        const base = k.split('/').pop()?.replace(/\.[^.]+$/, '') ?? ''
        return base === name && k.endsWith(`.${ext}`)
      })
      if (!entryKey) throw new Error(`File not found: ${name}`)

      const fileData = await zip.files[entryKey].async('nodebuffer')
      const mime = EXT_MIME[ext]

      const arweave = await uploadToShdwDrive(fileData, mime, {
        doc_type: docType,
        issuer_wallet: wallet,
        issued_to: name,
      }, wallet)

      let attestationPda: string | null = null
      try {
        attestationPda = await createAttestation({
          subject: wallet,
          arweave_tx_id: arweave.id,
          doc_type: docType,
        })
      } catch {}

      await supabaseAdmin.from('certificates').insert({
        issuer_wallet: wallet,
        arweave_tx_id: arweave.id,
        file_name: `${name}.${ext}`,
        file_size_bytes: fileData.length,
        doc_type: docType,
        issuer_name: issuerName,
        issued_to: name,
        is_public: true,
        expires_at: expiresAt ?? null,
        attestation_pda: attestationPda,
      })

      succeeded++
    } catch (e) {
      console.error(`Batch item error [${name}]:`, e)
      failed++
    } finally {
      processed++
      await supabaseAdmin
        .from('batch_jobs')
        .update({ processed, succeeded, failed })
        .eq('id', jobId)
    }
  })

  await queue.addAll(tasks)

  await supabaseAdmin
    .from('batch_jobs')
    .update({ status: 'done', finished_at: new Date().toISOString() })
    .eq('id', jobId)
}
