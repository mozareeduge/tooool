import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const fail = (message) => {
  console.error(`\n[FAIL] ${message}\n`)
  process.exit(1)
}

const [major, minor] = process.versions.node.split('.').map(Number)
if (major < 22 || (major === 22 && minor < 13)) {
  fail(`Node ${process.versions.node} is too old. Install Node >= 22.13.0 (current LTS is fine).`)
}

const requiredFiles = [
  'package.json',
  'HANDOFF.json',
  '.npmrc',
  'vite.config.ts',
  'src/App.tsx',
  'src/main.tsx',
  'src/components/AppErrorBoundary.tsx',
  'src/components/PdfViewer.tsx',
  'src/components/PdfErrorBoundary.tsx',
  'src/components/PlacementLayer.tsx',
  'src/components/Sidebar.tsx',
  'src/components/Pagination.tsx',
  'src/components/UploadCard.tsx',
  'src/hooks/useElementSize.ts',
  'src/utils/image.ts',
  'src/utils/geometry.ts',
  'src/utils/exportPdf.ts',
  'scripts/geometry-selftest.ts',
  'scripts/export-selftest.ts',
  'scripts/sync-pdfjs-assets.mjs',
  'fixtures/sample-multipage.pdf',
  'fixtures/rotation-test.pdf',
  'fixtures/signature.png',
  'fixtures/stamp.svg',
  'AGENT_ONE_CLICK_WINDOWS.cmd',
  'AGENT_ONE_CLICK_UNIX.sh',
  'STOP_WINDOWS.cmd',
  'STOP_UNIX.sh',
  'scripts/stop.ps1',
  'AGENT_HANDOFF.md',
  'LOCAL_AGENT_PROMPT.txt',
  'docs/ACCEPTANCE_TESTS.md',
  'docs/FAILURE_PLAYBOOK.md',
  'RELEASE_AUDIT.md',
  'RELEASE_SHA256.txt',
]
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail(`Missing required file: ${file}`)
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
if (pkg.name !== 'pdf-stamp-signer' || pkg.version !== '1.2.0') {
  fail(`package identity drift: expected pdf-stamp-signer@1.2.0; found ${pkg.name}@${pkg.version}.`)
}

const handoff = JSON.parse(fs.readFileSync(path.join(root, 'HANDOFF.json'), 'utf8'))
if (handoff.package !== 'pdf-stamp-signer_AGENT_READY_v1.2') {
  fail(`HANDOFF.json package drift: ${handoff.package ?? 'missing'}.`)
}
if (handoff.primary_action_windows !== 'AGENT_ONE_CLICK_WINDOWS.cmd') {
  fail('HANDOFF.json must keep AGENT_ONE_CLICK_WINDOWS.cmd as the primary Windows action.')
}
const expectedDependencies = {
  'pdf-lib': '1.17.1',
  'pdfjs-dist': '6.3.289',
  react: '19.3.0',
  'react-dom': '19.3.0',
  'react-pdf': '11.0.0',
  'react-rnd': '10.5.3',
}
const expectedDevDependencies = {
  '@tailwindcss/vite': '4.3.3',
  '@types/react': '19.3.0',
  '@types/react-dom': '19.3.0',
  '@vitejs/plugin-react': '6.1.1',
  tailwindcss: '4.3.3',
  typescript: '~5.9.2',
  vite: '8.3.1',
}

for (const [name, version] of Object.entries(expectedDependencies)) {
  if (pkg.dependencies?.[name] !== version) {
    fail(`package.json drift: dependency ${name} must stay pinned to ${version}; found ${pkg.dependencies?.[name] ?? 'missing'}.`)
  }
}
for (const [name, version] of Object.entries(expectedDevDependencies)) {
  if (pkg.devDependencies?.[name] !== version) {
    fail(`package.json drift: devDependency ${name} must stay at ${version}; found ${pkg.devDependencies?.[name] ?? 'missing'}.`)
  }
}
if (pkg.engines?.node !== '>=22.13.0') {
  fail(`package.json engines.node must stay at >=22.13.0; found ${pkg.engines?.node ?? 'missing'}.`)
}

const npmrc = fs.readFileSync(path.join(root, '.npmrc'), 'utf8')
for (const requiredSetting of ['audit=false', 'fund=false', 'save-exact=true']) {
  if (!npmrc.split(/\r?\n/).includes(requiredSetting)) {
    fail(`.npmrc is missing required setting: ${requiredSetting}`)
  }
}

const srcRoot = path.join(root, 'src')
const sourceFiles = []
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(ts|tsx|css)$/.test(entry.name)) sourceFiles.push(full)
  }
}
walk(srcRoot)

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8')
  if (/\b(TODO|FIXME|PLACEHOLDER)\b/i.test(text)) {
    fail(`Unresolved marker found in ${path.relative(root, file)}.`)
  }
}

const pdfHeader = Buffer.from('%PDF-')
for (const name of ['sample-multipage.pdf', 'rotation-test.pdf']) {
  const bytes = fs.readFileSync(path.join(root, 'fixtures', name))
  if (!bytes.subarray(0, pdfHeader.length).equals(pdfHeader)) {
    fail(`Fixture ${name} does not start with a PDF header.`)
  }
}

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const pngBytes = fs.readFileSync(path.join(root, 'fixtures/signature.png'))
if (!pngBytes.subarray(0, pngSignature.length).equals(pngSignature)) {
  fail('Fixture signature.png does not have a valid PNG signature.')
}

const svgText = fs.readFileSync(path.join(root, 'fixtures/stamp.svg'), 'utf8').trimStart()
if (!svgText.startsWith('<svg')) fail('Fixture stamp.svg does not start with an <svg> root.')

console.log(`[OK] Preflight passed on Node ${process.versions.node}.`)
console.log(`[OK] ${sourceFiles.length} source files + fixtures + launchers checked; dependency versions are pinned.`)
