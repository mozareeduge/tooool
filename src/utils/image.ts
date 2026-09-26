import type { AssetKind, ImageAsset } from '../types'

const SVG_RASTER_LONG_EDGE = 2048
const RASTER_MAX_EDGE = 2048
const SVG_MAX_EDGE = 4096
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const SAFE_EMBEDDED_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp);base64,/i
const CSS_URL = /url\(\s*(["']?)(.*?)\1\s*\)/gi
const SVG_LENGTH = /^([+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)(px|in|cm|mm|q|pt|pc)?$/i
const SVG_LENGTH_TO_PX: Record<string, number> = {
  px: 1,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  q: 96 / 101.6,
  pt: 96 / 72,
  pc: 16,
}


function assertSafeResourceReference(value: string): void {
  const ref = value.trim()
  if (!ref || ref.startsWith('#') || SAFE_EMBEDDED_IMAGE.test(ref)) return
  throw new Error('SVG files with external or active resource references are not allowed.')
}

function assertSafeCssReferences(value: string): void {
  if (/@import\b/i.test(value)) {
    throw new Error('SVG CSS imports are not allowed.')
  }

  CSS_URL.lastIndex = 0
  for (const match of value.matchAll(CSS_URL)) {
    assertSafeResourceReference(match[2] ?? '')
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the image file.'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not decode the image.'))
    image.src = src
  })
}

async function assertPngSignature(file: File): Promise<void> {
  const bytes = new Uint8Array(await file.slice(0, PNG_SIGNATURE.length).arrayBuffer())
  if (
    bytes.length !== PNG_SIGNATURE.length ||
    PNG_SIGNATURE.some((expected, index) => bytes[index] !== expected)
  ) {
    throw new Error('The selected .png file is not a valid PNG image.')
  }
}

function parseSvgLength(value: string | null): number | null {
  if (!value) return null
  const match = value.trim().match(SVG_LENGTH)
  if (!match) return null

  const amount = Number.parseFloat(match[1])
  if (!Number.isFinite(amount) || amount <= 0) return null

  const unit = (match[2] ?? 'px').toLowerCase()
  return amount * SVG_LENGTH_TO_PX[unit]
}

function getSvgDimensions(svg: SVGSVGElement): { width: number; height: number } {
  const width = parseSvgLength(svg.getAttribute('width'))
  const height = parseSvgLength(svg.getAttribute('height'))

  if (width && height) return { width, height }

  const viewBox = svg.getAttribute('viewBox')
  if (viewBox) {
    const values = viewBox
      .trim()
      .split(/[\s,]+/)
      .map((part) => Number.parseFloat(part))

    if (
      values.length === 4 &&
      values.every(Number.isFinite) &&
      values[2] > 0 &&
      values[3] > 0
    ) {
      return { width: values[2], height: values[3] }
    }
  }

  if (width) return { width, height: width }
  if (height) return { width: height, height }

  return { width: 512, height: 512 }
}

function validateLocalSvg(svgDocument: Document): SVGSVGElement {
  const root = svgDocument.documentElement
  if (root.tagName.toLowerCase() !== 'svg') {
    throw new Error('The selected SVG file does not contain an <svg> root.')
  }

  if (svgDocument.querySelector('parsererror')) {
    throw new Error('The selected SVG is malformed.')
  }

  if (svgDocument.doctype) {
    throw new Error('SVG files that declare entities are not allowed.')
  }

  if (svgDocument.querySelector('script, foreignObject')) {
    throw new Error('SVG files containing scripts or foreignObject are not allowed.')
  }

  for (const styleElement of Array.from(svgDocument.querySelectorAll('style'))) {
    assertSafeCssReferences(styleElement.textContent ?? '')
  }

  const all = [root, ...Array.from(svgDocument.querySelectorAll('*'))]
  for (const element of all) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim()

      if (name.startsWith('on')) {
        throw new Error('SVG event-handler attributes are not allowed.')
      }

      if (name === 'href' || name === 'xlink:href') {
        assertSafeResourceReference(value)
      }

      if (name === 'style' || /url\(/i.test(value)) {
        assertSafeCssReferences(value)
      }
    }
  }

  const svg = root as unknown as SVGSVGElement
  if (!svg.hasAttribute('xmlns')) {
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  }
  return svg
}

/**
 * Illustrator and older editors emit `<!DOCTYPE svg PUBLIC ... "...svg11.dtd">`.
 * That form is inert, so drop it; a DOCTYPE with an internal subset (`[...]`,
 * i.e. entity definitions) is left in place and rejected by the caller.
 */
function stripPlainDoctype(source: string): string {
  return source.replace(/<!doctype\s+svg\b[^[>]*>/i, '')
}

async function svgToPng(file: File): Promise<{
  dataUrl: string
  width: number
  height: number
}> {
  const source = stripPlainDoctype(await file.text())
  if (/<!doctype\b/i.test(source) || /<!entity\b/i.test(source)) {
    throw new Error('SVG files that declare entities are not allowed.')
  }

  const svgDocument = new DOMParser().parseFromString(source, 'image/svg+xml')
  const svg = validateLocalSvg(svgDocument)
  const intrinsic = getSvgDimensions(svg)

  const longEdge = Math.max(intrinsic.width, intrinsic.height)
  const desiredScale = Math.max(1, SVG_RASTER_LONG_EDGE / longEdge)
  const maxScale = SVG_MAX_EDGE / longEdge
  const scale = Math.min(desiredScale, maxScale)

  const width = Math.max(1, Math.round(intrinsic.width * scale))
  const height = Math.max(1, Math.round(intrinsic.height * scale))

  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))

  const serialized = new XMLSerializer().serializeToString(svgDocument)
  const blobUrl = URL.createObjectURL(
    new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }),
  )

  try {
    const image = await loadImage(blobUrl)
    return { dataUrl: canvasToPng(image, width, height), width, height }
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
}

function canvasToPng(
  image: CanvasImageSource,
  width: number,
  height: number,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is unavailable in this browser.')
  context.clearRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/png')
}

/**
 * PNG files are kept byte-for-byte when they are a sensible size. Very large
 * PNGs and every other browser-decodable format (WebP, GIF, JPEG, AVIF, HEIC on
 * Safari, ...) are redrawn to a transparent PNG no larger than RASTER_MAX_EDGE.
 */
async function normalizeRaster(file: File, isPng: boolean): Promise<{
  dataUrl: string
  width: number
  height: number
}> {
  if (isPng) await assertPngSignature(file)

  const sourceUrl = await fileToDataUrl(file)
  let image: HTMLImageElement
  try {
    image = await loadImage(sourceUrl)
  } catch {
    throw new Error(`This browser cannot open ${file.name}. Use PNG or SVG.`)
  }

  const naturalWidth = image.naturalWidth
  const naturalHeight = image.naturalHeight
  if (!naturalWidth || !naturalHeight) {
    throw new Error('The image has invalid dimensions.')
  }

  const scale = Math.min(1, RASTER_MAX_EDGE / Math.max(naturalWidth, naturalHeight))
  if (isPng && scale === 1) {
    return { dataUrl: sourceUrl, width: naturalWidth, height: naturalHeight }
  }

  const width = Math.max(1, Math.round(naturalWidth * scale))
  const height = Math.max(1, Math.round(naturalHeight * scale))
  return { dataUrl: canvasToPng(image, width, height), width, height }
}

/** Guess the label from the file name; the user can switch it afterwards. */
export function guessAssetKind(fileName: string): AssetKind {
  return /stamp|seal|mohr|\u0645\u0647\u0631/i.test(fileName) ? 'stamp' : 'signature'
}

function newAssetId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

export async function normalizeImageFile(
  file: File,
  kind: AssetKind = guessAssetKind(file.name),
): Promise<ImageAsset> {
  const name = file.name.toLowerCase()
  const isSvg = file.type === 'image/svg+xml' || name.endsWith('.svg')
  const isPng = file.type === 'image/png' || name.endsWith('.png')
  const isImage = isSvg || file.type.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|avif|bmp|heic|heif)$/.test(name)

  if (!isImage) {
    throw new Error(`${file.name} is not an image. Use PNG or SVG (transparent background).`)
  }

  const normalized = isSvg ? await svgToPng(file) : await normalizeRaster(file, isPng)

  return {
    id: newAssetId(),
    kind,
    name: file.name,
    dataUrl: normalized.dataUrl,
    width: normalized.width,
    height: normalized.height,
    aspectRatio: normalized.width / normalized.height,
    sourceType: isSvg ? 'svg' : isPng ? 'png' : 'raster',
    addedAt: Date.now(),
  }
}
