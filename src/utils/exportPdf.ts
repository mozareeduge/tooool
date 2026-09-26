import { degrees, PDFDocument, type PDFImage } from 'pdf-lib'
import type { AssetKind, ImageAsset, Placement } from '../types'
import { placementToPdfDrawRect } from './geometry.ts'

interface ExportArgs {
  pdfBytes: Uint8Array
  originalName: string
  placements: Placement[]
  assets: Partial<Record<AssetKind, ImageAsset>>
}

type BuildArgs = Omit<ExportArgs, 'originalName'>

function outputFileName(originalName: string): string {
  const base = originalName.replace(/\.pdf$/i, '') || 'document'
  return `${base}-stamped.pdf`
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
}

function downloadBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([toArrayBuffer(bytes)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

function validatePlacement(placement: Placement, pageCount: number): void {
  if (!Number.isInteger(placement.pageIndex) || placement.pageIndex < 0 || placement.pageIndex >= pageCount) {
    throw new Error(`A ${placement.kind} placement points to an invalid PDF page.`)
  }

  for (const [name, value] of Object.entries({
    x: placement.x,
    y: placement.y,
    width: placement.width,
    height: placement.height,
  })) {
    if (!Number.isFinite(value)) {
      throw new Error(`A ${placement.kind} placement has an invalid ${name} value.`)
    }
  }

  if (
    placement.x < 0 ||
    placement.y < 0 ||
    placement.width <= 0 ||
    placement.height <= 0 ||
    placement.x + placement.width > 1.000001 ||
    placement.y + placement.height > 1.000001
  ) {
    throw new Error(`A ${placement.kind} placement falls outside its PDF page.`)
  }
}

/** Pure export core used by both the browser download path and Node self-test. */
export async function buildFinalPdfBytes({
  pdfBytes,
  placements,
  assets,
}: BuildArgs): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes.slice())
  const pages = pdfDoc.getPages()
  const embedded = new Map<AssetKind, PDFImage>()

  for (const placement of placements) validatePlacement(placement, pages.length)

  const neededKinds = new Set(placements.map((placement) => placement.kind))
  for (const kind of neededKinds) {
    const asset = assets[kind]
    if (!asset) {
      throw new Error(`A placed ${kind} no longer has an uploaded image.`)
    }
    embedded.set(kind, await pdfDoc.embedPng(asset.dataUrl))
  }

  for (const placement of placements) {
    const page = pages[placement.pageIndex]
    const image = embedded.get(placement.kind)
    if (!image) throw new Error(`Could not embed the ${placement.kind} image.`)

    const rect = placementToPdfDrawRect(placement, page)
    page.drawImage(image, {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      rotate: degrees(rect.rotateDegrees),
    })
  }

  return pdfDoc.save()
}

export async function exportFinalPdf({
  pdfBytes,
  originalName,
  placements,
  assets,
}: ExportArgs): Promise<void> {
  const output = await buildFinalPdfBytes({ pdfBytes, placements, assets })
  downloadBytes(output, outputFileName(originalName))
}
