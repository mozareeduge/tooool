import { PDFDocument } from 'pdf-lib'

/** Enough detail for print, small enough for phones. */
const MAX_EDGE = 3000
/** Long side of the page in points (A4 height), so prints come out at a normal size. */
const PAGE_LONG_EDGE = 842

export const DOCUMENT_IMAGE_TYPES = /\.(jpe?g|png|webp|gif|avif|bmp|heic|heif|tiff?)$/i

export function isImageFile(file: File): boolean {
  return (file.type.startsWith('image/') && file.type !== 'image/svg+xml') || DOCUMENT_IMAGE_TYPES.test(file.name)
}

function loadFileImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`This browser cannot open ${file.name}. Try a JPEG or PNG.`))
    image.src = url
  }).finally(() => URL.revokeObjectURL(url))
}

/**
 * Turns photos/scans into a PDF, one page per image, so they can be stamped,
 * signed and saved like any PDF. Images are redrawn through a canvas, which
 * applies the camera's EXIF rotation (phone photos otherwise come out
 * sideways) and flattens any transparency onto white paper.
 */
export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is unavailable in this browser.')

  for (const file of files) {
    const image = await loadFileImage(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
    if (!blob) throw new Error(`Could not convert ${file.name}.`)
    const jpg = await pdf.embedJpg(new Uint8Array(await blob.arrayBuffer()))

    const pageScale = PAGE_LONG_EDGE / Math.max(canvas.width, canvas.height)
    const width = canvas.width * pageScale
    const height = canvas.height * pageScale
    pdf.addPage([width, height]).drawImage(jpg, { x: 0, y: 0, width, height })
  }

  return pdf.save()
}
