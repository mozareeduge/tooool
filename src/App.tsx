import { useEffect, useMemo, useRef, useState } from 'react'
import { PdfViewer, type VisibleCenterGetter } from './components/PdfViewer'
import { Sidebar } from './components/Sidebar'
import type { AssetKind, AssetMap, ImageAsset, PageGeometry, PdfSource, Placement } from './types'
import { deleteStoredAsset, loadStoredAssets, saveStoredAsset } from './utils/assetStore'
import {
  buildFinalPdfBytes,
  canShareFiles,
  downloadBytes,
  outputFileName,
  shareBytes,
} from './utils/exportPdf'
import { clamp, findFreeSpot, placementForPage } from './utils/geometry'
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

interface BuiltPdf {
  key: string
  bytes: Uint8Array
  filename: string
}

function App() {
  const [pdf, setPdf] = useState<PdfSource | null>(null)
  const [assetList, setAssetList] = useState<ImageAsset[]>([])
  const [placements, setPlacements] = useState<Placement[]>([])
  const [pageCount, setPageCount] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageGeometry, setPageGeometry] = useState<Record<number, PageGeometry>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [shareAvailable] = useState(canShareFiles)
  const visibleCenterRef = useRef<VisibleCenterGetter | null>(null)
  const builtRef = useRef<BuiltPdf | null>(null)

  const assets = useMemo<AssetMap>(
    () => Object.fromEntries(assetList.map((asset) => [asset.id, asset])),
    [assetList],
  )

  useEffect(() => {
    let cancelled = false
    void loadStoredAssets().then((stored) => {
      if (cancelled || stored.length === 0) return
      setAssetList((current) => {
        const known = new Set(current.map((asset) => asset.id))
        return [...stored.filter((asset) => !known.has(asset.id)), ...current]
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (pdf?.objectUrl) URL.revokeObjectURL(pdf.objectUrl)
    }
  }, [pdf])

  useEffect(() => {
    if (!status) return
    const timer = window.setTimeout(() => setStatus(null), 4000)
    return () => window.clearTimeout(timer)
  }, [status])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        const target = event.target as HTMLElement | null
        if (target?.matches('input, textarea, [contenteditable="true"]')) return
        event.preventDefault()
        setPlacements((current) => current.filter((item) => item.id !== selectedId))
        setSelectedId(null)
      }
      if (event.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId])

  const canPlace = Boolean(pdf && pageGeometry[pageIndex])

  const showError = (message: string) => {
    setStatus(null)
    setError(message)
  }
  const showStatus = (message: string) => {
    setError(null)
    setStatus(message)
  }

  const handlePdfUpload = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showError('Please choose a PDF file.')
      return
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (!hasPdfHeader(bytes)) {
        throw new Error('This file is not a valid PDF.')
      }

      const blobBytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
      const objectUrl = URL.createObjectURL(new Blob([blobBytes], { type: 'application/pdf' }))

      setPdf({ name: file.name, bytes, objectUrl })
      setPlacements([])
      setPageGeometry({})
      setPageCount(0)
      setPageIndex(0)
      setSelectedId(null)
      builtRef.current = null
      setError(null)
      setStatus(assetList.length ? 'PDF opened. Tap a stamp or signature to place it.' : 'PDF opened. Now add your stamp or signature.')
    } catch (uploadError) {
      showError(uploadError instanceof Error ? uploadError.message : 'Could not read the PDF.')
    }
  }

  const handleAssetFiles = async (files: File[]) => {
    if (!files.length) return
    const added: ImageAsset[] = []
    const failures: string[] = []
    let notSaved = false

    for (const file of files) {
      try {
        const asset = await normalizeImageFile(file)
        added.push(asset)
        if (!(await saveStoredAsset(asset))) notSaved = true
      } catch (uploadError) {
        failures.push(uploadError instanceof Error ? uploadError.message : `Could not read ${file.name}.`)
      }
    }

    if (added.length) setAssetList((current) => [...current, ...added])
    if (failures.length) {
      showError(failures.join(' '))
    } else if (notSaved) {
      showError('Added, but this browser would not store it: you will need to add it again next time.')
    } else {
      showStatus(
        `${added.length === 1 ? `${added[0].name} added` : `${added.length} images added`} and kept on this device.${
          pdf ? ' Tap it to place it.' : ''
        }`,
      )
    }
  }

  const setAssetKind = (assetId: string, kind: AssetKind) => {
    setAssetList((current) =>
      current.map((asset) => {
        if (asset.id !== assetId) return asset
        const updated = { ...asset, kind }
        void saveStoredAsset(updated)
        return updated
      }),
    )
    setPlacements((current) =>
      current.map((placement) => (placement.assetId === assetId ? { ...placement, kind } : placement)),
    )
  }

  const removeAsset = (assetId: string) => {
    const asset = assets[assetId]
    if (!asset) return
    const uses = placements.filter((placement) => placement.assetId === assetId).length
    const question = uses
      ? `Remove "${asset.name}"? It is placed ${uses} time${uses === 1 ? '' : 's'} in this PDF; those will be removed too.`
      : `Remove "${asset.name}" from this device?`
    if (!window.confirm(question)) return

    setAssetList((current) => current.filter((item) => item.id !== assetId))
    setPlacements((current) => current.filter((placement) => placement.assetId !== assetId))
    if (selectedId && placements.some((p) => p.id === selectedId && p.assetId === assetId)) setSelectedId(null)
    void deleteStoredAsset(assetId)
  }

  const placeAsset = (assetId: string) => {
    const asset = assets[assetId]
    const geometry = pageGeometry[pageIndex]
    if (!asset) return
    if (!pdf || !geometry) {
      showError(pdf ? 'The page is still loading. Try again in a moment.' : 'Open a PDF first, then tap the image to place it.')
      return
    }

    const pageAspect = geometry.height / geometry.width
    let width = asset.kind === 'signature' ? 0.3 : 0.22
    let height = width / asset.aspectRatio / pageAspect

    if (height > 0.2) {
      height = 0.2
      width = height * asset.aspectRatio * pageAspect
    }
    if (width > 0.5) {
      width = 0.5
      height = width / asset.aspectRatio / pageAspect
    }

    // Drop it in the middle of what the user is looking at, or the nearest
    // empty spot, so a stamp and two signatures never pile up on each other.
    const onPage = placements.filter((placement) => placement.pageIndex === pageIndex)
    const center = visibleCenterRef.current?.() ?? 0.5
    const { x, y } = findFreeSpot({ width, height }, { x: 0.5, y: center }, onPage)

    const placement: Placement = { id: newId(), assetId, kind: asset.kind, pageIndex, x, y, width, height }
    setPlacements((current) => [...current, placement])
    setSelectedId(placement.id)
    setError(null)
  }

  const updatePlacement = (id: string, patch: Pick<Placement, 'x' | 'y' | 'width' | 'height'>) => {
    setPlacements((current) => current.map((placement) => (placement.id === id ? { ...placement, ...patch } : placement)))
  }

  const deletePlacement = (id: string) => {
    setPlacements((current) => current.filter((placement) => placement.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const copyToAllPages = (id: string) => {
    const source = placements.find((placement) => placement.id === id)
    const asset = source && assets[source.assetId]
    const sourceGeometry = source && pageGeometry[source.pageIndex]
    if (!source || !asset || !sourceGeometry) return

    const copies: Placement[] = []
    for (let index = 0; index < pageCount; index += 1) {
      if (index === source.pageIndex) continue
      const alreadyThere = placements.some(
        (placement) =>
          placement.pageIndex === index &&
          placement.assetId === source.assetId &&
          Math.abs(placement.x - source.x) < 0.005 &&
          Math.abs(placement.y - source.y) < 0.005,
      )
      if (alreadyThere) continue
      const geometry = pageGeometry[index]
      if (!geometry) continue
      copies.push(placementForPage(source, sourceGeometry, geometry, asset.aspectRatio, index, newId()))
    }

    setPlacements((current) => [...current, ...copies])
    showStatus(copies.length ? `Placed on ${copies.length} more page${copies.length === 1 ? '' : 's'}.` : 'Already on every page.')
  }

  const changePage = (nextPageIndex: number) => {
    if (!pageCount) return
    setPageIndex(clamp(nextPageIndex, 0, pageCount - 1))
    setSelectedId(null)
  }

  const buildKey = () => `${pdf?.objectUrl}|${JSON.stringify(placements)}|${assetList.map((a) => a.id).join(',')}`

  const buildPdf = async (): Promise<BuiltPdf | null> => {
    if (!pdf) return null
    const key = buildKey()
    if (builtRef.current?.key === key) return builtRef.current
    const bytes = await buildFinalPdfBytes({ pdfBytes: pdf.bytes, placements, assets })
    builtRef.current = { key, bytes, filename: outputFileName(pdf.name) }
    return builtRef.current
  }

  const exportErrorMessage = (exportError: unknown) =>
    exportError instanceof Error ? exportError.message : 'Saving failed. The PDF may be encrypted or unsupported.'

  const handleSave = async () => {
    setSelectedId(null)
    setBusy(true)
    try {
      const built = await buildPdf()
      if (!built) return
      downloadBytes(built.bytes, built.filename)
      showStatus(`Saved ${built.filename}.`)
    } catch (exportError) {
      showError(exportErrorMessage(exportError))
    } finally {
      setBusy(false)
    }
  }

  const handleShare = async () => {
    setSelectedId(null)
    const cached = builtRef.current?.key === buildKey()
    setBusy(true)
    try {
      const built = await buildPdf()
      if (!built) return
      await shareBytes(built.bytes, built.filename)
    } catch (exportError) {
      // Some browsers only open the share sheet straight from a tap. The file
      // is built now, so a second tap shares instantly.
      if (!cached && exportError instanceof DOMException && exportError.name === 'NotAllowedError') {
        showStatus('Your PDF is ready. Tap Share again.')
      } else {
        showError(exportErrorMessage(exportError))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 lg:flex lg:h-screen lg:overflow-hidden">
      <Sidebar
        pdf={pdf}
        assets={assetList}
        placementCount={placements.length}
        canPlace={canPlace}
        busy={busy}
        shareAvailable={shareAvailable}
        onPdfUpload={handlePdfUpload}
        onAssetFiles={handleAssetFiles}
        onPlace={placeAsset}
        onRemoveAsset={removeAsset}
        onSetKind={setAssetKind}
        onSave={handleSave}
        onShare={handleShare}
      />

      <PdfViewer
        pdfUrl={pdf?.objectUrl ?? null}
        pageIndex={pageIndex}
        pageCount={pageCount}
        placements={placements}
        assets={assets}
        hasAssets={assetList.length > 0}
        selectedId={selectedId}
        visibleCenterRef={visibleCenterRef}
        onSelect={setSelectedId}
        onPageChange={changePage}
        onDocumentLoad={(pages) => {
          setPageCount(pages.length)
          setPageGeometry(Object.fromEntries(pages.map((geometry, index) => [index, geometry])))
          setPageIndex((current) => clamp(current, 0, Math.max(0, pages.length - 1)))
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
        onCopyToAllPages={copyToAllPages}
        onError={showError}
      />

      {(error || status) && (
        <div
          className={`pointer-events-none fixed inset-x-3 z-50 flex justify-center lg:inset-x-auto lg:right-5 lg:bottom-5 ${
            // Phones: sit above the floating page/selection bars, never over the toolbar buttons.
            selectedId ? 'bottom-36' : pageCount > 1 ? 'bottom-20' : 'bottom-4'
          }`}
        >
          <div
            role={error ? 'alert' : 'status'}
            className={`pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-3 text-sm shadow-xl backdrop-blur ${
              error ? 'border-red-200 bg-red-50/95 text-red-800' : 'border-emerald-200 bg-emerald-50/95 text-emerald-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1 leading-5">{error ?? status}</div>
              <button
                className="-my-1 shrink-0 rounded px-2 py-1 text-current/60 hover:text-current"
                onClick={() => {
                  setError(null)
                  setStatus(null)
                }}
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
