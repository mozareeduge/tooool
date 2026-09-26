import { placementToPdfDrawRect, pixelsToNormalized, placementToPixels, resizePlacementForAssetAspect } from '../src/utils/geometry.ts'
import type { Placement } from '../src/types.ts'

const EPS = 1e-7
const approx = (a: number, b: number, label: string) => {
  if (Math.abs(a - b) > EPS) throw new Error(`${label}: expected ${b}, got ${a}`)
}

const placement: Placement = {
  id: 'test',
  kind: 'stamp',
  pageIndex: 0,
  x: 0.1,
  y: 0.2,
  width: 0.3,
  height: 0.1,
}

// Normalized <-> pixel storage must be a stable round trip.
const px = placementToPixels(placement, 800, 600)
const normalized = pixelsToNormalized(px, 800, 600)
approx(normalized.x, placement.x, 'normalized x')
approx(normalized.y, placement.y, 'normalized y')
approx(normalized.width, placement.width, 'normalized width')
approx(normalized.height, placement.height, 'normalized height')

const crop = { x: 10, y: 20, width: 600, height: 800 }

function fakePage(rotation: number) {
  return {
    getCropBox: () => crop,
    getRotation: () => ({ angle: rotation }),
  } as never
}

function rotateLocal(x: number, y: number, angle: number) {
  const r = (angle * Math.PI) / 180
  return {
    x: x * Math.cos(r) - y * Math.sin(r),
    y: x * Math.sin(r) + y * Math.cos(r),
  }
}

function pageToDisplay(u: number, v: number, rotation: number) {
  switch (rotation) {
    case 90: return { x: v, y: crop.width - u }
    case 180: return { x: crop.width - u, y: crop.height - v }
    case 270: return { x: crop.height - v, y: u }
    default: return { x: u, y: v }
  }
}

for (const rotation of [0, 90, 180, 270]) {
  const rect = placementToPdfDrawRect(placement, fakePage(rotation))
  const displayWidth = rotation === 90 || rotation === 270 ? crop.height : crop.width
  const displayHeight = rotation === 90 || rotation === 270 ? crop.width : crop.height
  const expected = {
    x: placement.x * displayWidth,
    y: (1 - placement.y - placement.height) * displayHeight,
    width: placement.width * displayWidth,
    height: placement.height * displayHeight,
  }

  const corners = [
    [0, 0], [rect.width, 0], [0, rect.height], [rect.width, rect.height],
  ].map(([x, y]) => {
    const local = rotateLocal(x, y, rect.rotateDegrees)
    const u = rect.x - crop.x + local.x
    const v = rect.y - crop.y + local.y
    return pageToDisplay(u, v, rotation)
  })

  const xs = corners.map((p) => p.x)
  const ys = corners.map((p) => p.y)
  const actual = {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  }

  approx(actual.x, expected.x, `rotation ${rotation} display x`)
  approx(actual.y, expected.y, `rotation ${rotation} display y`)
  approx(actual.width, expected.width, `rotation ${rotation} display width`)
  approx(actual.height, expected.height, `rotation ${rotation} display height`)
}


// Replacing an already-used image must preserve aspect ratio without leaving the page.
const resized = resizePlacementForAssetAspect(
  { ...placement, x: 0.8, y: 0.8, width: 0.19, height: 0.05 },
  { width: 600, height: 800 },
  2,
)
if (resized.x + resized.width > 1 + EPS || resized.y + resized.height > 1 + EPS) {
  throw new Error('replacement aspect resize escaped page bounds')
}
approx(resized.width, 0.19, 'replacement asset keeps width')
approx(
  resized.width / (resized.height * (800 / 600)),
  2,
  'replacement asset aspect ratio',
)

console.log('[OK] Geometry self-test passed for 0°, 90°, 180°, 270°, and asset replacement.')
