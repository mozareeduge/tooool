import type { AssetKind, ImageAsset, PdfSource } from '../types'
import { UploadCard } from './UploadCard'

interface SidebarProps {
  pdf: PdfSource | null
  assets: Partial<Record<AssetKind, ImageAsset>>
  placementCount: number
  canPlace: boolean
  exporting: boolean
  onPdfUpload: (file: File) => Promise<void>
  onAssetUpload: (kind: AssetKind, file: File) => Promise<void>
  onAdd: (kind: AssetKind) => void
  onExport: () => Promise<void>
}

function AssetPreview({ asset }: { asset?: ImageAsset }) {
  if (!asset) return null

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px] p-2">
      <img
        src={asset.dataUrl}
        alt=""
        className="h-16 w-full object-contain"
        draggable={false}
      />
    </div>
  )
}

export function Sidebar({
  pdf,
  assets,
  placementCount,
  canPlace,
  exporting,
  onPdfUpload,
  onAssetUpload,
  onAdd,
  onExport,
}: SidebarProps) {
  return (
    <aside className="flex w-full flex-col gap-4 border-b border-slate-200 bg-slate-50/95 p-4 lg:h-screen lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0">
      <div>
        <div className="text-lg font-bold tracking-tight text-slate-950">PDF Stamp & Sign</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Local-only. Your PDF and images stay in this browser session.
        </p>
      </div>

      <UploadCard
        label={pdf ? 'Replace PDF' : 'Upload PDF'}
        detail={pdf?.name ?? 'One PDF file'}
        accept="application/pdf,.pdf"
        onFile={onPdfUpload}
      />

      <div className="h-px bg-slate-200" />

      <div className="space-y-3">
        <div>
          <UploadCard
            label={assets.stamp ? 'Replace stamp' : 'Upload stamp'}
            detail={assets.stamp?.name ?? 'PNG or SVG'}
            accept="image/png,image/svg+xml,.png,.svg"
            onFile={(file) => onAssetUpload('stamp', file)}
          >
            <AssetPreview asset={assets.stamp} />
          </UploadCard>
          <button
            className="mt-2 w-full rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!assets.stamp || !canPlace}
            onClick={() => onAdd('stamp')}
          >
            Add Stamp
          </button>
        </div>

        <div>
          <UploadCard
            label={assets.signature ? 'Replace signature' : 'Upload signature'}
            detail={assets.signature?.name ?? 'PNG or SVG'}
            accept="image/png,image/svg+xml,.png,.svg"
            onFile={(file) => onAssetUpload('signature', file)}
          >
            <AssetPreview asset={assets.signature} />
          </UploadCard>
          <button
            className="mt-2 w-full rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!assets.signature || !canPlace}
            onClick={() => onAdd('signature')}
          >
            Add Signature
          </button>
        </div>
      </div>

      <div className="mt-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
          <span>Placed items</span>
          <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
            {placementCount}
          </span>
        </div>
        <button
          className="w-full rounded-xl bg-blue-600 px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!pdf || placementCount === 0 || exporting}
          onClick={() => void onExport()}
        >
          {exporting ? 'Exporting…' : 'Export Final PDF'}
        </button>
        <p className="mt-2 text-[11px] leading-4 text-slate-400">
          This adds visual image overlays; it is not a certificate-based cryptographic PDF signature.
        </p>
      </div>
    </aside>
  )
}
