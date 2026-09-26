import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument } from 'pdf-lib'
import { buildFinalPdfBytes } from '../src/utils/exportPdf.ts'
import type { ImageAsset, Placement } from '../src/types.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const fixturePdf = new Uint8Array(fs.readFileSync(path.join(root, 'fixtures/rotation-test.pdf')))
const png = fs.readFileSync(path.join(root, 'fixtures/signature.png'))
const dataUrl = `data:image/png;base64,${png.toString('base64')}`

const assetBase = {
  name: 'signature.png',
  dataUrl,
  width: 480,
  height: 180,
  aspectRatio: 480 / 180,
  sourceType: 'png' as const,
}

const signature: ImageAsset = { ...assetBase, kind: 'signature' }
const stamp: ImageAsset = { ...assetBase, kind: 'stamp' }

const placements: Placement[] = []
for (let pageIndex = 0; pageIndex < 4; pageIndex += 1) {
  placements.push(
    { id: `s-${pageIndex}`, kind: 'stamp', pageIndex, x: 0.04, y: 0.04, width: 0.18, height: 0.07 },
    { id: `g-${pageIndex}`, kind: 'signature', pageIndex, x: 0.62, y: 0.82, width: 0.30, height: 0.10 },
  )
}

const output = await buildFinalPdfBytes({
  pdfBytes: fixturePdf,
  placements,
  assets: { stamp, signature },
})

if (output.length <= fixturePdf.length) {
  throw new Error(`Export output unexpectedly small: ${output.length} <= ${fixturePdf.length}`)
}

const reloaded = await PDFDocument.load(output)
if (reloaded.getPageCount() !== 4) {
  throw new Error(`Export changed page count: expected 4, got ${reloaded.getPageCount()}`)
}

const rotations = reloaded.getPages().map((page) => ((page.getRotation().angle % 360) + 360) % 360)
const expectedRotations = [0, 90, 180, 270]
for (let index = 0; index < expectedRotations.length; index += 1) {
  if (rotations[index] !== expectedRotations[index]) {
    throw new Error(`Page ${index + 1} rotation changed: expected ${expectedRotations[index]}, got ${rotations[index]}`)
  }
}

let rejectedInvalidPage = false
try {
  await buildFinalPdfBytes({
    pdfBytes: fixturePdf,
    placements: [{ ...placements[0], pageIndex: 99 }],
    assets: { stamp, signature },
  })
} catch (error) {
  rejectedInvalidPage = error instanceof Error && error.message.includes('invalid PDF page')
}
if (!rejectedInvalidPage) {
  throw new Error('Invalid page placement was not rejected.')
}


let rejectedMissingAsset = false
try {
  await buildFinalPdfBytes({
    pdfBytes: fixturePdf,
    placements: [placements[0]],
    assets: { signature },
  })
} catch (error) {
  rejectedMissingAsset = error instanceof Error && error.message.includes('no longer has an uploaded image')
}
if (!rejectedMissingAsset) {
  throw new Error('Missing placed asset was not rejected.')
}

console.log('[OK] Export self-test passed: PDF load/save, image embedding path, page count, rotations, and corruption guards.')
