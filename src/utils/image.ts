export async function compressImageToDataUrl(file: File, maxKB = 200, mime = 'image/jpeg', qualityStart = 0.92): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  const maxSide = 1920
  let { width, height } = bitmap
  if (Math.max(width, height) > maxSide) {
    const scale = maxSide / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, width, height)
  let quality = qualityStart
  let dataUrl = canvas.toDataURL(mime, quality)
  const limit = maxKB * 1024
  let guard = 10
  while (dataUrl.length * 0.75 > limit && guard-- > 0) {
    quality = Math.max(0.5, quality - 0.1)
    dataUrl = canvas.toDataURL(mime, quality)
  }
  return dataUrl
}


