import { Suspense, useCallback, useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { Document, Page } from 'react-pdf'
import type { AssetMap, PageGeometry, Placement } from '../types'
import { useElementSize } from '../hooks/useElementSize'
import { Pagination } from './Pagination'
import { PdfErrorBoundary } from './PdfErrorBoundary'
import { PlacementLayer } from './PlacementLayer'
import { documentOptions } from '../utils/pdfjs'

/** Returns the normalized (0..1) vertical centre of the part of the page the user can currently see. */
export type VisibleCenterGetter = () => number | null

interface PdfViewerProps {
  pdfUrl: string | null
  pageIndex: number
  pageCount: number
  placements: Placement[]
  assets: AssetMap
  hasAssets: boolean
  selectedId: string | null
  visibleCenterRef: MutableRefObject<VisibleCenterGetter | null>
  onSelect: (id: string | null) => void
  onPageChange: (pageIndex: number) => void
  onDocumentLoad: (pages: PageGeometry[]) => void
  onPageGeometry: (pageIndex: number, geometry: PageGeometry) => void
  onPlacementChange: (id: string, patch: Pick<Placement, 'x' | 'y' | 'width' | 'height'>) => void
  onPlacementDelete: (id: string) => void
  onCopyToAllPages: (id: string) => void
  onError: (message: string) => void
}

function obscuredTop(): number {
  const toolbar = document.getElementById('app-toolbar')
  if (!toolbar || getComputedStyle(toolbar).position !== 'sticky') return 0
  return toolbar.getBoundingClientRect().bottom
}

export function PdfViewer({
  pdfUrl,
  pageIndex,
  pageCount,
  placements,
  assets,
  hasAssets,
  selectedId,
  visibleCenterRef,
  onSelect,
  onPageChange,
  onDocumentLoad,
  onPageGeometry,
  onPlacementChange,
  onPlacementDelete,
  onCopyToAllPages,
  onError,
}: PdfViewerProps) {
  const { ref: viewportRef, size: viewportSize } = useElementSize<HTMLDivElement>()
  const { ref: surfaceSizeRef, size: surfaceSize } = useElementSize<HTMLDivElement>()
  const surfaceElement = useRef<HTMLDivElement | null>(null)
  const viewportElement = useRef<HTMLDivElement | null>(null)

  const surfaceRef = useCallback(
    (node: HTMLDivElement | null) => {
      surfaceElement.current = node
      surfaceSizeRef(node)
    },
    [surfaceSizeRef],
  )
  const setViewportRef = useCallback(
    (node: HTMLDivElement | null) => {
      viewportElement.current = node
      viewportRef(node)
    },
    [viewportRef],
  )

  useEffect(() => {
    visibleCenterRef.current = () => {
      const surface = surfaceElement.current
      const viewport = viewportElement.current
      if (!surface || !viewport) return null
      const page = surface.getBoundingClientRect()
      const box = viewport.getBoundingClientRect()
      if (page.height <= 0) return null
      const top = Math.max(page.top, box.top, obscuredTop())
      // Leave room for the floating page/selection bars at the bottom.
      const bottom = Math.min(page.bottom, box.bottom, window.innerHeight) - 72
      if (bottom <= top) return null
      return ((top + bottom) / 2 - page.top) / page.height
    }
    return () => {
      visibleCenterRef.current = null
    }
  }, [visibleCenterRef])

  const pageWidth = useMemo(() => {
    // Never render wider than the screen: an oversized first render makes phone
    // browsers widen (zoom out) the whole layout, which then never recovers.
    const screenWidth = document.documentElement.clientWidth || window.innerWidth
    const available = Math.min(viewportSize.width || screenWidth, screenWidth)
    const gutter = available < 640 ? 24 : 64
    return Math.min(1000, Math.max(240, available - gutter))
  }, [viewportSize.width])

  const selected = placements.find((placement) => placement.id === selectedId) ?? null

  if (!pdfUrl) {
    return (
      <main className="grid min-h-[60vh] flex-1 place-items-center bg-slate-100 p-6 lg:min-h-screen">
        <div className="max-w-md rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-500">
            PDF
          </div>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Open a PDF or a photo to start</h1>
          <ol className="mt-3 space-y-1 text-left text-sm leading-6 text-slate-500">
            <li>
              1. {hasAssets ? 'Your saved stamps & signatures are ready above.' : 'Add your stamp and signatures (SVG or PNG) once. They are kept on this device.'}
            </li>
            <li>2. Open the PDF (or a photo/scan of the document), go to a page, tap an image to place it.</li>
            <li>3. Drag to move, pull a blue corner to resize.</li>
            <li>4. Save or Share the finished PDF.</li>
          </ol>
        </div>
      </main>
    )
  }

  return (
    <main className="relative flex min-w-0 flex-1 flex-col bg-slate-100">
      <div ref={setViewportRef} className="min-h-0 flex-1 overflow-auto px-3 pt-4 pb-40 sm:px-8 sm:pt-8 lg:pb-32">
        <div className="mx-auto flex min-h-full w-full items-start justify-center">
          <PdfErrorBoundary resetKey={pdfUrl} onError={onError}>
            <Suspense
              fallback={<div className="rounded-2xl bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">Loading PDF…</div>}
            >
              <Document
                file={pdfUrl}
                options={documentOptions}
                loading={<div className="rounded-2xl bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">Loading PDF…</div>}
                onLoadSuccess={async (document) => {
                  try {
                    const pages = await Promise.all(
                      Array.from({ length: document.numPages }, async (_, index) => {
                        const viewport = (await document.getPage(index + 1)).getViewport({ scale: 1 })
                        return { width: viewport.width, height: viewport.height }
                      }),
                    )
                    onDocumentLoad(pages)
                  } catch (error) {
                    onError(error instanceof Error ? error.message : 'Could not read the PDF pages.')
                  }
                }}
                onLoadError={(error) => onError(error.message || 'Could not load this PDF.')}
              >
                <div
                  key={pageIndex}
                  ref={surfaceRef}
                  className="relative inline-block overflow-visible bg-white shadow-2xl shadow-slate-900/10"
                >
                  <Suspense
                    fallback={
                      <div
                        style={{ width: pageWidth, height: pageWidth * 1.414 }}
                        className="grid place-items-center bg-white text-sm text-slate-400"
                      >
                        Loading page…
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageIndex + 1}
                      width={pageWidth}
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                      loading={
                        <div style={{ width: pageWidth, height: pageWidth * 1.414 }} className="bg-white" />
                      }
                      onLoadSuccess={(page) => {
                        const viewport = page.getViewport({ scale: 1 })
                        onPageGeometry(pageIndex, { width: viewport.width, height: viewport.height })
                      }}
                      onRenderError={(error) => onError(error.message || 'Could not render this page.')}
                    />
                  </Suspense>

                  {surfaceSize.width > 0 && surfaceSize.height > 0 && (
                    <PlacementLayer
                      pageIndex={pageIndex}
                      pageWidth={surfaceSize.width}
                      pageHeight={surfaceSize.height}
                      placements={placements}
                      assets={assets}
                      selectedId={selectedId}
                      onSelect={onSelect}
                      onChange={onPlacementChange}
                    />
                  )}
                </div>
              </Document>
            </Suspense>
          </PdfErrorBoundary>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex flex-col items-center gap-2 px-3 lg:absolute lg:bottom-5">
        {selected && (
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur">
            {pageCount > 1 && (
              <button
                type="button"
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold whitespace-nowrap text-white hover:bg-slate-800"
                onClick={() => onCopyToAllPages(selected.id)}
              >
                Add to all pages
              </button>
            )}
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              onClick={() => onPlacementDelete(selected.id)}
            >
              Delete
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => onSelect(null)}
            >
              Done
            </button>
          </div>
        )}
        {pageCount > 1 && (
          <div className="pointer-events-auto">
            <Pagination pageIndex={pageIndex} pageCount={pageCount} onChange={onPageChange} />
          </div>
        )}
      </div>
    </main>
  )
}
