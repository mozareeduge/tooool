/**
 * Background removal for stamp/signature images (photos or scans of ink on
 * paper, or graphics with a solid box behind them).
 *
 * The background is estimated locally, so uneven lighting and shadows in a
 * phone photo are handled: the image is split into blocks, each block's
 * background is the average of its brightest pixels, then blocks borrow the
 * brightest neighbour so blocks covered by thick ink do not count as paper.
 * Each pixel's opacity is how far its colour is from that local paper colour,
 * and its colour is "un-mixed" from the paper so edges keep no pale halo.
 *
 * Pure functions on RGBA pixel buffers: no DOM, so they are unit-tested in Node.
 */

export interface Rgba {
  data: Uint8ClampedArray
  width: number
  height: number
}

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/** Colour distance at which a pixel starts to count as ink, and becomes solid. */
const INK_START = 30
const INK_SOLID = 95

const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b

/**
 * True when the image has an opaque background worth removing: its outer
 * frame is (almost) fully opaque. Transparent PNGs/SVGs are left alone.
 */
export function hasOpaqueBackground({ data, width, height }: Rgba): boolean {
  const frame = Math.max(1, Math.round(Math.min(width, height) * 0.03))
  let opaque = 0
  let total = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const inFrame = y < frame || y >= height - frame || x < frame || x >= width - frame
      if (!inFrame) continue
      total += 1
      if (data[(y * width + x) * 4 + 3] > 250) opaque += 1
    }
  }
  return total > 0 && opaque / total > 0.9
}

function estimateBackground({ data, width, height }: Rgba) {
  const size = Math.max(8, Math.round(Math.max(width, height) / 24))
  const cols = Math.ceil(width / size)
  const rows = Math.ceil(height / size)
  const blocks = new Float32Array(cols * rows * 4) // r, g, b, luma

  for (let by = 0; by < rows; by += 1) {
    for (let bx = 0; bx < cols; bx += 1) {
      const lumas: number[] = []
      const x0 = bx * size
      const y0 = by * size
      const x1 = Math.min(width, x0 + size)
      const y1 = Math.min(height, y0 + size)
      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          const i = (y * width + x) * 4
          lumas.push(luma(data[i], data[i + 1], data[i + 2]))
        }
      }
      lumas.sort((a, b) => a - b)
      const cut = lumas[Math.floor(lumas.length * 0.85)] ?? 255
      let r = 0
      let g = 0
      let b = 0
      let n = 0
      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          const i = (y * width + x) * 4
          if (luma(data[i], data[i + 1], data[i + 2]) >= cut) {
            r += data[i]
            g += data[i + 1]
            b += data[i + 2]
            n += 1
          }
        }
      }
      const k = (by * cols + bx) * 4
      blocks[k] = r / Math.max(1, n)
      blocks[k + 1] = g / Math.max(1, n)
      blocks[k + 2] = b / Math.max(1, n)
      blocks[k + 3] = luma(blocks[k], blocks[k + 1], blocks[k + 2])
    }
  }

  // A block fully covered by ink must not be mistaken for paper: take the
  // brightest block in a 5x5 neighbourhood.
  const smoothed = new Float32Array(blocks.length)
  for (let by = 0; by < rows; by += 1) {
    for (let bx = 0; bx < cols; bx += 1) {
      let best = (by * cols + bx) * 4
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const nx = bx + dx
          const ny = by + dy
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
          const k = (ny * cols + nx) * 4
          if (blocks[k + 3] > blocks[best + 3]) best = k
        }
      }
      const k = (by * cols + bx) * 4
      smoothed[k] = blocks[best]
      smoothed[k + 1] = blocks[best + 1]
      smoothed[k + 2] = blocks[best + 2]
    }
  }

  // Bilinear lookup between block centres.
  return (x: number, y: number, out: Float32Array) => {
    const fx = Math.min(cols - 1, Math.max(0, (x + 0.5) / size - 0.5))
    const fy = Math.min(rows - 1, Math.max(0, (y + 0.5) / size - 0.5))
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const x1 = Math.min(cols - 1, x0 + 1)
    const y1 = Math.min(rows - 1, y0 + 1)
    const tx = fx - x0
    const ty = fy - y0
    for (let c = 0; c < 3; c += 1) {
      const a = smoothed[(y0 * cols + x0) * 4 + c]
      const b = smoothed[(y0 * cols + x1) * 4 + c]
      const d = smoothed[(y1 * cols + x0) * 4 + c]
      const e = smoothed[(y1 * cols + x1) * 4 + c]
      out[c] = (a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty
    }
  }
}

/**
 * Makes the background transparent in place and returns the bounding box of
 * what remains (with a small margin), or null if nothing but background was found.
 */
export function removeBackground(image: Rgba): Box | null {
  const { data, width, height } = image
  const background = estimateBackground(image)
  const bg = new Float32Array(3)
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      background(x, y, bg)
      const dr = data[i] - bg[0]
      const dg = data[i + 1] - bg[1]
      const db = data[i + 2] - bg[2]
      const distance = Math.sqrt(dr * dr + dg * dg + db * db)
      const t = Math.min(1, Math.max(0, (distance - INK_START) / (INK_SOLID - INK_START)))
      const alpha = t * t * (3 - 2 * t) // smoothstep: clean edges, no hard jaggies

      if (alpha <= 0) {
        data[i + 3] = 0
        continue
      }
      // Un-mix the paper colour so anti-aliased edges keep the ink colour.
      data[i] = Math.min(255, Math.max(0, (data[i] - (1 - alpha) * bg[0]) / alpha))
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - (1 - alpha) * bg[1]) / alpha))
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - (1 - alpha) * bg[2]) / alpha))
      data[i + 3] = Math.round(alpha * data[i + 3])

      if (data[i + 3] > 24) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (maxX < 0) return null
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.03) + 2
  const x = Math.max(0, minX - pad)
  const y = Math.max(0, minY - pad)
  return {
    x,
    y,
    width: Math.min(width, maxX + pad + 1) - x,
    height: Math.min(height, maxY + pad + 1) - y,
  }
}
