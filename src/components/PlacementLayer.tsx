import { Rnd } from 'react-rnd'
import type { AssetKind, ImageAsset, Placement } from '../types'
import { pixelsToNormalized, placementToPixels } from '../utils/geometry'

interface PlacementLayerProps {
  pageIndex: number
  pageWidth: number
  pageHeight: number
  placements: Placement[]
  assets: Partial<Record<AssetKind, ImageAsset>>
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChange: (id: string, patch: Pick<Placement, 'x' | 'y' | 'width' | 'height'>) => void
  onDelete: (id: string) => void
}

export function PlacementLayer({
  pageIndex,
  pageWidth,
  pageHeight,
  placements,
  assets,
  selectedId,
  onSelect,
  onChange,
  onDelete,
}: PlacementLayerProps) {
  const visible = placements.filter((placement) => placement.pageIndex === pageIndex)

  return (
    <div
      className="absolute inset-0 z-10 overflow-hidden"
      onPointerDown={(event: React.PointerEvent<HTMLElement>) => {
        if (event.currentTarget === event.target) onSelect(null)
      }}
    >
      {visible.map((placement) => {
        const asset = assets[placement.kind]
        if (!asset) return null

        const pixel = placementToPixels(placement, pageWidth, pageHeight)
        const selected = selectedId === placement.id

        return (
          <Rnd
            key={placement.id}
            bounds="parent"
            lockAspectRatio={asset.aspectRatio}
            minWidth={36}
            minHeight={24}
            size={{ width: pixel.width, height: pixel.height }}
            position={{ x: pixel.x, y: pixel.y }}
            onPointerDown={(event: React.PointerEvent<HTMLElement>) => {
              event.stopPropagation()
              onSelect(placement.id)
            }}
            onDragStop={(_, data) => {
              onChange(
                placement.id,
                pixelsToNormalized(
                  { ...pixel, x: data.x, y: data.y },
                  pageWidth,
                  pageHeight,
                ),
              )
            }}
            onResizeStop={(_, __, ref, ___, position) => {
              onChange(
                placement.id,
                pixelsToNormalized(
                  {
                    x: position.x,
                    y: position.y,
                    width: ref.offsetWidth,
                    height: ref.offsetHeight,
                  },
                  pageWidth,
                  pageHeight,
                ),
              )
            }}
            className={`group !flex items-center justify-center rounded-sm ${
              selected ? 'outline-2 outline-offset-2 outline-blue-500' : 'outline-1 outline-transparent hover:outline-blue-300'
            }`}
            style={{ zIndex: selected ? 30 : 20 }}
          >
            <img
              src={asset.dataUrl}
              alt={placement.kind}
              draggable={false}
              className="pointer-events-none h-full w-full select-none object-fill"
            />
            {selected && (
              <button
                type="button"
                title="Delete item"
                aria-label="Delete item"
                className="absolute -top-3 -right-3 grid size-7 place-items-center rounded-full bg-slate-950 text-sm font-bold text-white shadow-lg hover:bg-red-600"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(placement.id)
                }}
              >
                ×
              </button>
            )}
          </Rnd>
        )
      })}
    </div>
  )
}
