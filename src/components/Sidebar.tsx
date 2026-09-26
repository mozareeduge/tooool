import type { ChangeEvent } from 'react'
import type { AssetKind, ImageAsset, PdfSource } from '../types'

interface SidebarProps {
  pdf: PdfSource | null
  assets: ImageAsset[]
  placementCount: number
  canPlace: boolean
  busy: boolean
  shareAvailable: boolean
  onPdfUpload: (file: File) => Promise<void>
  onAssetFiles: (files: File[]) => Promise<void>
  onPlace: (assetId: string) => void
  onRemoveAsset: (assetId: string) => void
  onSetKind: (assetId: string, kind: AssetKind) => void
  onSave: () => Promise<void>
  onShare: () => Promise<void>
}

const IMAGE_ACCEPT =
  'image/png,image/svg+xml,image/webp,image/gif,image/jpeg,image/avif,image/heic,.png,.svg,.webp,.gif,.jpg,.jpeg,.avif,.heic'

const checkerboard =
  'bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[length:12px_12px] bg-[position:0_0,0_6px,6px_-6px,-6px_0px]'

function filesFrom(event: ChangeEvent<HTMLInputElement>): File[] {
  const files = Array.from(event.target.files ?? [])
  event.target.value = ''
  return files
}

function AssetTile({
  asset,
  canPlace,
  onPlace,
  onRemove,
  onSetKind,
}: {
  asset: ImageAsset
  canPlace: boolean
  onPlace: () => void
  onRemove: () => void
  onSetKind: (kind: AssetKind) => void
}) {
  const other: AssetKind = asset.kind === 'stamp' ? 'signature' : 'stamp'

  return (
    <div className="relative w-24 shrink-0 lg:w-auto">
      <button
        type="button"
        onClick={onPlace}
        title={canPlace ? `Place ${asset.name} on this page` : 'Open a PDF first'}
        className={`block w-full rounded-2xl border border-slate-200 bg-white p-1.5 text-left shadow-sm transition active:scale-[0.97] ${
          canPlace ? 'hover:border-blue-400' : 'opacity-70'
        }`}
      >
        <div className={`rounded-xl p-1.5 ${checkerboard}`}>
          <img src={asset.dataUrl} alt="" draggable={false} className="mt-3 h-9 w-full object-contain lg:mt-2 lg:h-16" />
        </div>
        <div className="mt-1 hidden truncate px-1 text-[11px] text-slate-500 lg:block">{asset.name}</div>
      </button>
      <button
        type="button"
        onClick={() => onSetKind(other)}
        title={`Mark as ${other}`}
        className={`absolute top-2 left-2 rounded-full px-1.5 py-px text-[9px] lg:top-2.5 lg:left-2.5 lg:px-2 lg:py-0.5 lg:text-[10px] font-bold tracking-wide uppercase shadow-sm ${
          asset.kind === 'stamp' ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'
        }`}
      >
        {asset.kind === 'stamp' ? 'Stamp' : 'Sign'}
      </button>
      <button
        type="button"
        onClick={onRemove}
        title={`Remove ${asset.name}`}
        aria-label={`Remove ${asset.name}`}
        className="absolute -top-1.5 -right-1.5 grid size-7 place-items-center rounded-full border border-slate-200 bg-white text-sm text-slate-500 shadow-sm hover:text-red-600"
      >
        ×
      </button>
    </div>
  )
}

function ActionButtons({
  pdf,
  placementCount,
  busy,
  shareAvailable,
  onSave,
  onShare,
  compact,
}: Pick<SidebarProps, 'pdf' | 'placementCount' | 'busy' | 'shareAvailable' | 'onSave' | 'onShare'> & {
  compact: boolean
}) {
  const disabled = !pdf || placementCount === 0 || busy
  const size = compact ? 'px-3 py-2 text-sm' : 'w-full px-3 py-3 text-sm'
  return (
    <>
      <button
        type="button"
        className={`rounded-xl bg-blue-600 font-bold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300 ${size}`}
        disabled={disabled}
        onClick={() => void onSave()}
      >
        {busy ? 'Working…' : compact ? 'Save' : 'Save final PDF'}
      </button>
      {shareAvailable && (
        <button
          type="button"
          className={`rounded-xl border border-blue-200 bg-white font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 ${size} ${compact ? '' : 'mt-2'}`}
          disabled={disabled}
          onClick={() => void onShare()}
        >
          Share
        </button>
      )}
    </>
  )
}

function PdfInput({ onPdfUpload }: Pick<SidebarProps, 'onPdfUpload'>) {
  return (
    <input
      className="sr-only"
      type="file"
      accept="application/pdf,.pdf"
      onChange={(event) => {
        const [file] = filesFrom(event)
        if (file) void onPdfUpload(file)
      }}
    />
  )
}

export function Sidebar(props: SidebarProps) {
  const { pdf, assets, placementCount, canPlace, onPdfUpload, onAssetFiles, onPlace, onRemoveAsset, onSetKind } =
    props

  return (
    <aside
      id="app-toolbar"
      className="sticky top-0 z-40 flex w-full flex-col gap-2 border-b border-slate-200 bg-slate-50/95 p-3 backdrop-blur lg:static lg:h-screen lg:w-80 lg:shrink-0 lg:gap-4 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:p-4"
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold tracking-tight text-slate-950 lg:text-lg">PDF Stamp & Sign</div>
          <p className="hidden text-xs leading-5 text-slate-500 lg:block">
            Everything stays on your device. Nothing is uploaded.
          </p>
        </div>
        <label className="cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold whitespace-nowrap text-slate-800 shadow-sm hover:border-slate-400 lg:hidden">
          {pdf ? 'Change PDF' : 'Open PDF'}
          <PdfInput onPdfUpload={onPdfUpload} />
        </label>
        {pdf && (
          <div className="flex gap-2 lg:hidden">
            <ActionButtons {...props} compact />
          </div>
        )}
      </div>

      <label className="hidden cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow lg:block">
        <PdfInput onPdfUpload={onPdfUpload} />
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
            PDF
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900">{pdf ? 'Change PDF' : 'Open PDF'}</div>
            <div className="truncate text-xs text-slate-500">{pdf?.name ?? 'Choose the document to sign'}</div>
          </div>
        </div>
      </label>

      <section>
        <div className="mb-1 hidden items-baseline justify-between gap-2 lg:flex">
          <div className="text-xs font-semibold text-slate-700">
            Stamps & signatures
            {assets.length > 0 && <span className="ml-1 font-normal text-slate-400">· tap to place</span>}
          </div>
        </div>
        <div className="-mx-3 -mt-1 flex gap-2 overflow-x-auto px-3 pt-2 pb-1 [contain:paint] lg:[contain:none] lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:overflow-visible lg:px-0">
          {assets.map((asset) => (
            <AssetTile
              key={asset.id}
              asset={asset}
              canPlace={canPlace}
              onPlace={() => onPlace(asset.id)}
              onRemove={() => onRemoveAsset(asset.id)}
              onSetKind={(kind) => onSetKind(asset.id, kind)}
            />
          ))}
          <label className="grid w-24 shrink-0 cursor-pointer place-items-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-1.5 text-center text-[11px] lg:p-2 lg:text-xs font-semibold text-slate-600 hover:border-slate-400 lg:min-h-28 lg:w-auto">
            <input
              className="sr-only"
              type="file"
              multiple
              accept={IMAGE_ACCEPT}
              onChange={(event) => void onAssetFiles(filesFrom(event))}
            />
            <span>
              <span className="block text-xl leading-none text-slate-400">+</span>
              {assets.length ? 'Add image' : 'Add stamp / signature'}
              <span className="hidden font-normal text-slate-400 lg:block">SVG or PNG</span>
            </span>
          </label>
        </div>
      </section>

      <div className="mt-auto hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:block">
        <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
          <span>Placed items</span>
          <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">{placementCount}</span>
        </div>
        <ActionButtons {...props} compact={false} />
        <p className="mt-2 text-[11px] leading-4 text-slate-400">
          Adds your images onto the pages. It is not a certificate-based digital signature.
        </p>
      </div>
    </aside>
  )
}
