import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const require = createRequire(import.meta.url)

let pdfjsRoot
try {
  pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'))
} catch {
  console.error('[FAIL] pdfjs-dist is not installed. Run npm install first.')
  process.exit(1)
}

const targets = [
  ['cmaps', 'cmaps'],
  ['wasm', 'wasm'],
  ['standard_fonts', 'standard_fonts'],
]
const publicRoot = path.join(root, 'public', 'pdfjs')
fs.rmSync(publicRoot, { recursive: true, force: true })
fs.mkdirSync(publicRoot, { recursive: true })

for (const [sourceName, destinationName] of targets) {
  const source = path.join(pdfjsRoot, sourceName)
  const destination = path.join(publicRoot, destinationName)
  if (!fs.existsSync(source)) {
    console.error(`[FAIL] pdfjs-dist asset directory is missing: ${sourceName}`)
    process.exit(1)
  }
  fs.cpSync(source, destination, { recursive: true })
}

console.log('[OK] PDF.js CMaps, WASM codecs, and standard fonts synced to public/pdfjs/.')
