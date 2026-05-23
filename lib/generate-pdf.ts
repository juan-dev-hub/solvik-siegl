import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'

export async function generateCertificatePDF(params: {
  issued_to: string
  issuer_name: string
  doc_type: string
  issued_at: string
  expires_at?: string | null
  arweave_tx_id: string
}): Promise<Buffer> {
  const { issued_to, issuer_name, doc_type, issued_at, expires_at, arweave_tx_id } = params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.solvikstudio.com'
  const verifyUrl = `${appUrl}/verify/${arweave_tx_id}`

  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontReg  = await doc.embedFont(StandardFonts.Helvetica)

  // Background gradient approximation — light blue tint
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.96, 0.98, 1) })

  // Header bar
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0, 0.4, 0.8) })

  // Logo text
  page.drawText('Solvik Studio', {
    x: 40, y: height - 52,
    size: 22, font: fontBold, color: rgb(1, 1, 1),
  })
  page.drawText('powered by Solvik Studio', {
    x: 40, y: height - 68,
    size: 8, font: fontReg, color: rgb(0.7, 0.85, 1),
  })

  // Issuer
  page.drawText(issuer_name, {
    x: 40, y: height - 140,
    size: 18, font: fontBold, color: rgb(0, 0.3, 0.7),
  })
  page.drawText('certifica que:', {
    x: 40, y: height - 165,
    size: 12, font: fontReg, color: rgb(0.4, 0.4, 0.5),
  })

  // Recipient
  page.drawText(issued_to, {
    x: 40, y: height - 230,
    size: 32, font: fontBold, color: rgb(0.05, 0.05, 0.1),
  })

  // Divider
  page.drawLine({
    start: { x: 40, y: height - 280 },
    end: { x: width - 40, y: height - 280 },
    thickness: 1, color: rgb(0.8, 0.88, 1),
  })

  // Doc type
  page.drawText(`Tipo de documento: ${doc_type}`, {
    x: 40, y: height - 310,
    size: 12, font: fontReg, color: rgb(0.3, 0.3, 0.4),
  })

  const issuedDate = new Date(issued_at).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  page.drawText(`Fecha de emisión: ${issuedDate}`, {
    x: 40, y: height - 330,
    size: 12, font: fontReg, color: rgb(0.3, 0.3, 0.4),
  })

  if (expires_at) {
    const expDate = new Date(expires_at).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
    page.drawText(`Válido hasta: ${expDate}`, {
      x: 40, y: height - 350,
      size: 12, font: fontReg, color: rgb(0.3, 0.3, 0.4),
    })
  }

  // QR code
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 1 })
  const qrBase64 = qrDataUrl.split(',')[1]
  const qrImage = await doc.embedPng(Buffer.from(qrBase64, 'base64'))
  const qrSize = 100
  page.drawImage(qrImage, {
    x: width - qrSize - 40,
    y: 100,
    width: qrSize,
    height: qrSize,
  })
  page.drawText('Escanea para verificar', {
    x: width - qrSize - 40,
    y: 88,
    size: 7, font: fontReg, color: rgb(0.5, 0.5, 0.6),
  })

  // Footer
  page.drawLine({
    start: { x: 40, y: 80 },
    end: { x: width - 40, y: 80 },
    thickness: 0.5, color: rgb(0.8, 0.88, 1),
  })
  page.drawText(`Arweave TX: ${arweave_tx_id}`, {
    x: 40, y: 65,
    size: 7, font: fontReg, color: rgb(0.6, 0.6, 0.7),
  })
  page.drawText(
    'Este certificado no tiene validez legal por sí mismo. Verifique la legitimidad de la institución emisora.',
    { x: 40, y: 52, size: 8, font: fontReg, color: rgb(0.6, 0.6, 0.7) }
  )
  page.drawText(
    'Solvik Studio es infraestructura blockchain. El contenido es responsabilidad del emisor.',
    { x: 40, y: 40, size: 8, font: fontReg, color: rgb(0.5, 0.5, 0.6) }
  )

  const pdfBytes = await doc.save()
  return Buffer.from(pdfBytes)
}
