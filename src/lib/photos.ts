const MAX_BYTES = 280_000

export async function compressImageToBase64(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const maxSide = 480
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not prepare image canvas')
  ctx.drawImage(bitmap, 0, 0, width, height)

  let quality = 0.82
  let dataUrl = canvas.toDataURL('image/jpeg', quality)

  while (dataUrl.length > MAX_BYTES * 1.37 && quality > 0.35) {
    quality -= 0.08
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }

  if (dataUrl.length > MAX_BYTES * 1.37) {
    throw new Error('Image is still too large after compression. Try a smaller photo.')
  }

  return dataUrl
}
