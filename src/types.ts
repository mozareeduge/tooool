export type AssetKind = 'stamp' | 'signature'

export interface ImageAsset {
  id: string
  /** Label only: decides the default placement size and how the item is described. */
  kind: AssetKind
  name: string
  /** Transparent PNG data URL (SVG and other formats are converted on upload). */
  dataUrl: string
  width: number
  height: number
  aspectRatio: number
  sourceType: 'png' | 'svg' | 'raster'
  addedAt: number
}

export type AssetMap = Record<string, ImageAsset>

export interface Placement {
  id: string
  assetId: string
  kind: AssetKind
  pageIndex: number
  /** Normalized left coordinate, 0..1, relative to visible page width. */
  x: number
  /** Normalized top coordinate, 0..1, relative to visible page height. */
  y: number
  /** Normalized width, 0..1, relative to visible page width. */
  width: number
  /** Normalized height, 0..1, relative to visible page height. */
  height: number
}

export interface PageGeometry {
  /** Visual page width from PDF.js viewport at scale=1. */
  width: number
  /** Visual page height from PDF.js viewport at scale=1. */
  height: number
}

export interface PdfSource {
  name: string
  bytes: Uint8Array
  objectUrl: string
}
