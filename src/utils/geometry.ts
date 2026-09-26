import type { PDFPage } from 'pdf-lib'
import type { PageGeometry, Placement } from '../types'

export interface PixelRect {
  x: number
  y: number
  width: number
  height: number
}

export interface PdfDrawRect {
  x: number
  y: number
  width: number
  height: number
  rotateDegrees: number
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function placementToPixels(
  placement: Placement,
  pageWidth: number,
  pageHeight: number,
): PixelRect {
  return {
    x: placement.x * pageWidth,
    y: placement.y * pageHeight,
    width: placement.width * pageWidth,
    height: placement.height * pageHeight,
  }
}

export function pixelsToNormalized(
  rect: PixelRect,
  pageWidth: number,
  pageHeight: number,
): Pick<Placement, 'x' | 'y' | 'width' | 'height'> {
  if (pageWidth <= 0 || pageHeight <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  const width = clamp(rect.width / pageWidth, 0, 1)
  const height = clamp(rect.height / pageHeight, 0, 1)
  const x = clamp(rect.x / pageWidth, 0, 1 - width)
  const y = clamp(rect.y / pageHeight, 0, 1 - height)

  return { x, y, width, height }
}

export function resizePlacementForAssetAspect(
  placement: Placement,
  geometry: PageGeometry,
  assetAspectRatio: number,
): Placement {
  if (
    geometry.width <= 0 ||
    geometry.height <= 0 ||
    !Number.isFinite(assetAspectRatio) ||
    assetAspectRatio <= 0
  ) {
    return placement
  }

  const pageAspect = geometry.height / geometry.width
  let width = clamp(placement.width, 0, 1)
  let height = width / assetAspectRatio / pageAspect

  if (height > 1) {
    height = 1
    width = Math.min(1, height * assetAspectRatio * pageAspect)
  }

  const x = clamp(placement.x, 0, Math.max(0, 1 - width))
  const y = clamp(placement.y, 0, Math.max(0, 1 - height))

  return { ...placement, x, y, width, height }
}

/**
 * Copies a placement onto another page so it keeps the same physical size
 * (PDF points) and the same relative position, without distorting the image,
 * even when the pages differ in size or orientation.
 */
export function placementForPage(
  source: Placement,
  sourceGeometry: PageGeometry,
  target: PageGeometry,
  assetAspectRatio: number,
  pageIndex: number,
  id: string,
): Placement {
  let width = (source.width * sourceGeometry.width) / target.width
  let height = (width * target.width) / assetAspectRatio / target.height
  const shrink = Math.max(1, width, height)
  width /= shrink
  height /= shrink

  const centerX = source.x + source.width / 2
  const centerY = source.y + source.height / 2
  return {
    ...source,
    id,
    pageIndex,
    width,
    height,
    x: clamp(centerX - width / 2, 0, 1 - width),
    y: clamp(centerY - height / 2, 0, 1 - height),
  }
}

function normalizeRotation(angle: number): 0 | 90 | 180 | 270 {
  const normalized = ((angle % 360) + 360) % 360
  if (normalized === 90 || normalized === 180 || normalized === 270) {
    return normalized
  }
  return 0
}

/**
 * Maps a normalized, top-left-origin rectangle from the rendered/CropBox view
 * into pdf-lib's page coordinate system.
 *
 * This handles:
 * - DOM top-left -> PDF bottom-left origin conversion
 * - CropBox offsets
 * - page /Rotate values (0/90/180/270)
 *
 * The returned image rotation pre-rotates the overlay opposite to the PDF page
 * display rotation. PDF /Rotate is clockwise, while pdf-lib drawImage rotation
 * uses the content-space transform, so the matching positive angle keeps the
 * overlay upright to the viewer after the page rotation is applied.
 */
export function placementToPdfDrawRect(
  placement: Placement,
  page: PDFPage,
): PdfDrawRect {
  const crop = page.getCropBox()
  const rotation = normalizeRotation(page.getRotation().angle)

  const displayWidth = rotation === 90 || rotation === 270 ? crop.height : crop.width
  const displayHeight = rotation === 90 || rotation === 270 ? crop.width : crop.height

  const displayX = placement.x * displayWidth
  const displayY = (1 - placement.y - placement.height) * displayHeight
  const width = placement.width * displayWidth
  const height = placement.height * displayHeight

  let localX = displayX
  let localY = displayY

  switch (rotation) {
    case 90:
      localX = crop.width - displayY
      localY = displayX
      break
    case 180:
      localX = crop.width - displayX
      localY = crop.height - displayY
      break
    case 270:
      localX = displayY
      localY = crop.height - displayX
      break
    default:
      break
  }

  return {
    x: crop.x + localX,
    y: crop.y + localY,
    width,
    height,
    rotateDegrees: rotation,
  }
}
