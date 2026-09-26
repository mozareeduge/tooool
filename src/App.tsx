import { useEffect, useMemo, useState } from 'react'
import { PdfViewer } from './components/PdfViewer'
import { Sidebar } from './components/Sidebar'
import type { AssetKind, ImageAsset, PageGeometry, PdfSource, Placement } from './types'
import { exportFinalPdf } from './utils/exportPdf'
import { clamp, resizePlacementForAssetAspect } from './utils/geometry'
import { normalizeImageFile } from './utils/image'


const PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d]

function hasPdfHeader(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length - PDF_HEADER.length + 1, 1024)
  for (let start = 0; start < limit; start += 1) {
    if (PDF_HEADER.every((value, offset) => bytes[start + offset] === value)) return true
  }
  return false
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

function App() {
  const [pdf, setPdf] = useState<PdfSource | null>(null)
  const [assets, setAssets] = useState<Partial<Record<AssetKind, ImageAsset>>>({})
  const [placements, setPlacements] = useState<Placement[]>([])
  const [pageCount, setPageCount] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageGeometry, setPageGeometry] = useState<Record<number, PageGeometry>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    return () => {
      if (pdf?.objectUrl) URL.revokeObjectURL(pdf.objectUrl)
    }
  }, [pdf])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        const target = event.target as HTMLElement | null
        if (target?.matches('input, textarea, [contenteditable="true"]')) return
        event.preventDefault()
        setPlacements((current) => current.filter((item) => item.id !== selectedId))
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId])

  const canPlace = Boolean(pdf && pageGeometry[pageIndex])

  const placementsOnCurrentPage = useMemo(
    () => placements.filter((placement) => placement.pageIndex === pageIndex).length,
    [placements, pageIndex],
  )

  const clearMessages = () => {
    setError(null)
    setStatus(null)
  }

  const handlePdfUpload = async (file: File) => {
    clearMessages()
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file.')
      return
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (!hasPdfHeader(bytes)) {
        throw new Error('The selected file does not contain a valid PDF header.')
      }

      const blobBytes = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer
      const objectUrl = URL.createObjectURL(new Blob([blobBytes], { type: 'application/pdf' }))

      setPdf({ name: file.name, bytes, objectUrl })
      setPlacements([])
      setPageGeometry({})
      setPageCount(0)
      setPageIndex(0)
      setSelectedId(null)
      setStatus('PDF loaded. Add a stamp or signature.')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Could not read the PDF.')
    }
  }

  const handleAssetUpload = async (kind: AssetKind, file: File) => {
    clearMessages()
    try {
      const asset = await normalizeImageFile(file, kind)

      // Preserve each existing placement's visual width when replacing an asset,
      // but recompute height for the new aspect ratio so previously placed items
      // never become stretched/squashed. Placements can only exist on pages whose
      // geometry was loaded, so the normal path always has a page aspect ratio.
      setPlacements((current) =>
        current.map((placement) => {
          if (placement.kind !== kind) return placement
          const geometry = pageGeometry[placement.pageIndex]
          if (!geometry?.width || !geometry?.height) return placement

          return resizePlacementForAssetAspect(placement, geometry, asset.aspectRatio)
        }),
      )

      setAssets((current) => ({ ...current, [kind]: asset }))
      setStatus(
        asset.sourceType === 'svg'
          ? `${kind === 'stamp' ? 'Stamp' : 'Signature'} SVG converted to high-resolution PNG.`
          : `${kind === 'stamp' ? 'Stamp' : 'Signature'} loaded.`,
      )
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Could not read this image.')
    }
  }

  const addPlacement = (kind: AssetKind) => {
    clearMessages()
    const asset = assets[kind]
    const geometry = pageGeometry[pageIndex]
    if (!asset || !geometry) return

    const pageAspect = geometry.height / geometry.width
    let width = kind === 'signature' ? 0.28 : 0.18
    let height = width / asset.aspectRatio / pageAspect

    if (height > 0.22) {
      height = 0.22
      width = height * asset.aspectRatio * pageAspect
    }
    if (width > 0.45) {
      width = 0.45
      height = width / asset.aspectRatio / pageAspect
    }

    const cascade = Math.min(placementsOnCurrentPage, 5) * 0.025
    const x = clamp((1 - width) / 2 + cascade, 0, 1 - width)
    const y = clamp(0.08 + cascade, 0, 1 - height)

    const placement: Placement = {
      id: newId(),
      kind,
      pageIndex,
      x,
      y,
      width,
      height,
    }

    setPlacements((current) => [...current, placement])
    setSelectedId(placement.id)
  }

  const updatePlacement = (
    id: string,
    patch: Pick<Placement, 'x' | 'y' | 'width' | 'height'>,
  ) => {
    setPlacements((current) =>
      current.map((placement) => (placement.id === id ? { ...placement, ...patch } : placement)),
    )
  }

  const deletePlacement = (id: string) => {
    setPlacements((current) => current.filter((placement) => placement.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const changePage = (nextPageIndex: number) => {
    if (!pageCount) return
    setPageIndex(clamp(nextPageIndex, 0, pageCount - 1))
    setSelectedId(null)
  }

  const handleExport = async () => {
    clearMessages()
    if (!pdf) return

    setExporting(true)
    try {
      await exportFinalPdf({
        pdfBytes: pdf.bytes,
        originalName: pdf.name,
        placements,
        assets,
      })
      setStatus(`Exported ${placements.length} placed item${placements.length === 1 ? '' : 's'}.`)
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : 'Export failed. The PDF may be encrypted or unsupported.',
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 lg:flex lg:h-screen lg:overflow-hidden">
      <Sidebar
        pdf={pdf}
        assets={assets}
        placementCount={placements.length}
        canPlace={canPlace}
        exporting={exporting}
        onPdfUpload={handlePdfUpload}
        onAssetUpload={handleAssetUpload}
        onAdd={addPlacement}
        onExport={handleExport}
      />

      <PdfViewer
        pdfUrl={pdf?.objectUrl ?? null}
        pageIndex={pageIndex}
        pageCount={pageCount}
        placements={placements}
        assets={assets}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onPageChange={changePage}
        onDocumentLoad={(count) => {
          setPageCount(count)
          setPageIndex((current) => clamp(current, 0, Math.max(0, count - 1)))
          setError(null)
        }}
        onPageGeometry={(index, geometry) =>
          setPageGeometry((current) => {
            const existing = current[index]
            if (existing?.width === geometry.width && existing.height === geometry.height) return current
            return { ...current, [index]: geometry }
          })
        }
        onPlacementChange={updatePlacement}
        onPlacementDelete={deletePlacement}
        onError={setError}
      />

      {(error || status) && (
        <div className="fixed right-4 bottom-24 z-50 max-w-sm lg:bottom-5">
          <div
            className={`rounded-2xl border px-4 py-3 text-sm shadow-xl backdrop-blur ${
              error
                ? 'border-red-200 bg-red-50/95 text-red-800'
                : 'border-emerald-200 bg-emerald-50/95 text-emerald-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1 leading-5">{error ?? status}</div>
              <button
                className="shrink-0 rounded px-1 text-current/60 hover:text-current"
                onClick={clearMessages}
                aria-label="Dismiss message"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
