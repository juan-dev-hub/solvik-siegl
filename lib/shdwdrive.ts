// Storage provider: Shadow Drive (GenesysGo)
// TODO: replace the body of uploadToShdwDrive with the actual @shadow-drive/sdk call
// once you have a storage account and SHADOW_WALLET_SECRET configured.
// Current fallback uses Arweave via Turbo SDK so uploads keep working in the meantime.
import { uploadToArweave } from './arweave'

export type ShdwUploadResult = {
  id: string  // will be the ShdwDrive file URL once the real implementation is in place
}

export async function uploadToShdwDrive(
  data: Buffer,
  contentType: string,
  tags: Record<string, string>
): Promise<ShdwUploadResult> {
  return uploadToArweave(data, contentType, tags)
}
