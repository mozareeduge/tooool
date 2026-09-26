import { hasOpaqueBackground, removeBackground } from '../src/utils/background.ts'

// Synthetic "phone photo" of a signature: warm paper with a lighting gradient
// and grain, a thin blue pen stroke and a solid red block (thick stamp ink).
const width = 480
const height = 240
const data = new Uint8ClampedArray(width * height * 4)
let seed = 7
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 12

const onStroke = (x: number, y: number) => Math.abs(y - (120 + 50 * Math.sin(x / 30))) < 3 && x > 60 && x < 300
const inBlock = (x: number, y: number) => x >= 340 && x < 420 && y >= 80 && y < 160

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const i = (y * width + x) * 4
    const light = 235 - (x / width) * 40 - (y / height) * 15 // uneven lighting
    let rgb = [light + 8 + noise(), light + 2 + noise(), light - 10 + noise()]
    if (onStroke(x, y)) rgb = [30, 50, 190]
    if (inBlock(x, y)) rgb = [200, 25, 30]
    data.set([rgb[0], rgb[1], rgb[2], 255], i)
  }
}

const image = { data, width, height }
if (!hasOpaqueBackground(image)) throw new Error('opaque photo background was not detected')

const box = removeBackground(image)
if (!box) throw new Error('no ink found')

const alphaAt = (x: number, y: number) => data[(y * width + x) * 4 + 3]
let paper = 0
let paperClear = 0
let ink = 0
let inkSolid = 0
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const nearInk = [-5, 0, 5].some((d) => onStroke(x, y + d)) || inBlock(x, y) ||
      (x >= 334 && x < 426 && y >= 74 && y < 166)
    if (onStroke(x, y) || inBlock(x, y)) {
      ink += 1
      if (alphaAt(x, y) > 240) inkSolid += 1
    } else if (!nearInk) {
      paper += 1
      if (alphaAt(x, y) < 10) paperClear += 1
    }
  }
}
if (paperClear / paper < 0.99) throw new Error(`paper not removed: ${(100 * paperClear / paper).toFixed(1)}% clear`)
if (inkSolid / ink < 0.97) throw new Error(`ink lost: only ${(100 * inkSolid / ink).toFixed(1)}% stayed solid`)

const centre = (380 * 1 + 120 * width) * 4
if (data[centre] < 180 || data[centre + 1] > 60) throw new Error('solid red block lost its colour')

// Trimmed to the ink, not the whole photo.
if (box.x > 60 || box.x + box.width < 420 || box.width > 400 || box.height > 145) {
  throw new Error(`unexpected trim box ${JSON.stringify(box)}`)
}

// Already-transparent artwork is left alone.
const transparent = new Uint8ClampedArray(64 * 64 * 4)
transparent.set([0, 0, 0, 255], (32 * 64 + 32) * 4)
if (hasOpaqueBackground({ data: transparent, width: 64, height: 64 })) {
  throw new Error('transparent image wrongly flagged as having a background')
}

console.log(
  `[OK] Background self-test passed: ${(100 * paperClear / paper).toFixed(1)}% paper removed, ` +
    `${(100 * inkSolid / ink).toFixed(1)}% ink kept, trimmed to ${box.width}x${box.height}.`,
)
