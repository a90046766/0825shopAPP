export async function compressImageToDataUrl(file: File, maxKB = 200, mime = 'image/jpeg', qualityStart = 0.92): Promise<string> {
  // 一些 Android/舊瀏覽器可能不支援 createImageBitmap，改用 Image 後備
  async function loadBitmap(f: File): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }> {
    try {
      const bmp = await (window as any).createImageBitmap?.(f)
      if (bmp) {
        return {
          width: (bmp as any).width,
          height: (bmp as any).height,
          draw: (ctx, w, h) => ctx.drawImage(bmp as any, 0, 0, w, h)
        }
      }
    } catch {}
    // 後備：以 FileReader + HTMLImageElement 載入
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(String(fr.result))
      fr.onerror = reject
      fr.readAsDataURL(f)
    })
    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = dataUrl
    })
    return {
      width: img.width,
      height: img.height,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h)
    }
  }

  const bmp = await loadBitmap(file)
  const canvas = document.createElement('canvas')
  const maxSide = 1920
  let { width, height } = bmp
  if (Math.max(width, height) > maxSide) {
    const scale = maxSide / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  bmp.draw(ctx, width, height)
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


