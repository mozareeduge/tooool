import { Suspense, useMemo } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import type { AssetKind, ImageAsset, PageGeometry, Placement } from '../types'
import { useElementSize } from '../hooks/useElementSize'
import { Pagination } from './Pagination'
import { PdfErrorBoundary } from './PdfErrorBoundary'
import { PlacementLayer } from './PlacementLayer'
import pdfWorkerUrl from '../pdf-worker.ts?worker&url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const pdfjsAssetBase = `${import.meta.env.BASE_URL}pdfjs/`
const documentOptions = {
  cMapUrl: `${pdfjsAssetBase}cmaps/`,
  wasmUrl: `${pdfjsAssetBase}wasm/`,
  standardFontDataUrl: `${pdfjsAssetBase}standard_fonts/`,
}

interface PdfViewerProps {
  pdfUrl: string | null
  pageIndex: number
  pageCount: number
  placements: Placement[]
  assets: Partial<Record<AssetKind, ImageAsset>>
  selectedId: string | null
  onSelect: (id: string | null) => void
  onPageChange: (pageIndex: number) => void
  onDocumentLoad: (pageCount: number) => void
  onPageGeometry: (pageIndex: number, geometry: PageGeometry) => void
  onPlacementChange: (
    id: string,
    patch: Pick<Placement, 'x' | 'y' | 'width' | 'height'>,
  ) => void
  onPlacementDelete: (id: string) => void
  onError: (message: string) => void
}

export function PdfViewer({
  pdfUrl,
  pageIndex,
  pageCount,
  placements,
  assets,
  selectedId,
  onSelect,
  onPageChange,
  onDocumentLoad,
  onPageGeometry,
  onPlacementChange,
  onPlacementDelete,
  onError,
}: PdfViewerProps) {
  const { ref: viewportRef, size: viewportSize } = useElementSize<HTMLDivElement>()
  const { ref: surfaceRef, size: surfaceSize } = useElementSize<HTMLDivElement>()

  const pageWidth = useMemo(() => {
    if (!viewportSize.width) return 720
    return Math.min(1000, Math.max(240, viewportSize.width - 64))
  }, [viewportSize.width])

  if (!pdfUrl) {
    return (
      <main className="grid min-h-[60vh] flex-1 place-items-center bg-slate-100 p-6 lg:min-h-screen">
        <div className="max-w-md rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center shadow-sm">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-2xl text-slate-500">PDF</div>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Upload a PDF to start</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Then upload a stamp or signature, place it on any page, resize it, and export the final PDF.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative flex min-w-0 flex-1 flex-col bg-slate-100">
      <div ref={viewportRef} className="min-h-0 flex-1 overflow-auto p-4 pb-28 sm:p-8 sm:pb-28">
        <div className="mx-auto flex min-h-full w-full items-start justify-center">
          <PdfErrorBoundary resetKey={pdfUrl} onError={onError}>
            <Suspense
              fallback={
                <div className="rounded-2xl bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">Loading PDF…</div>
              }
            >
              <Document
                file={pdfUrl}
                options={documentOptions}
                loading={null}
                onLoadSuccess={(document) => onDocumentLoad(document.numPages)}
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
                    loading={null}
                    onLoadSuccess={(page) => {
                      const viewport = page.getViewport({ scale: 1 })
                      onPageGeometry(pageIndex, {
                        width: viewport.width,
                        height: viewport.height,
                      })
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
                    onDelete={onPlacementDelete}
                  />
                )}
              </div>
              </Document>
            </Suspense>
          </PdfErrorBoundary>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-40 flex justify-center px-4">
        <div className="pointer-events-auto">
          <Pagination pageIndex={pageIndex} pageCount={pageCount} onChange={onPageChange} />
        </div>
      </div>
    </main>
  )
}
