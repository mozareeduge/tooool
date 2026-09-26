import { Rnd } from 'react-rnd'
import type { AssetMap, Placement } from '../types'
import { pixelsToNormalized, placementToPixels } from '../utils/geometry'

interface PlacementLayerProps {
  pageIndex: number
  pageWidth: number
  pageHeight: number
  placements: Placement[]
  assets: AssetMap
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChange: (id: string, patch: Pick<Placement, 'x' | 'y' | 'width' | 'height'>) => void
}

// Large, visible corner grips: finger-sized on phones, precise with a mouse.
const HANDLE = 26
const handleStyle = { width: HANDLE, height: HANDLE, zIndex: 2 }
const cornerStyles = {
  topLeft: { ...handleStyle, left: -HANDLE / 2, top: -HANDLE / 2 },
  topRight: { ...handleStyle, right: -HANDLE / 2, top: -HANDLE / 2 },
  bottomLeft: { ...handleStyle, left: -HANDLE / 2, bottom: -HANDLE / 2 },
  bottomRight: { ...handleStyle, right: -HANDLE / 2, bottom: -HANDLE / 2 },
}
const grip = (
  <div className="grid size-full place-items-center">
    <div className="size-3.5 rounded-full border-2 border-white bg-blue-600 shadow-md" />
  </div>
)
const cornerGrips = { topLeft: grip, topRight: grip, bottomLeft: grip, bottomRight: grip }
const cornersOnly = {
  top: false,
  right: false,
  bottom: false,
  left: false,
  topLeft: true,
  topRight: true,
  bottomLeft: true,
  bottomRight: true,
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
}: PlacementLayerProps) {
  const visible = placements.filter((placement) => placement.pageIndex === pageIndex)

  return (
    <div
      className="absolute inset-0 z-10"
      onPointerDown={(event: React.PointerEvent<HTMLElement>) => {
        if (event.currentTarget === event.target) onSelect(null)
      }}
    >
      {visible.map((placement) => {
        const asset = assets[placement.assetId]
        if (!asset) return null

        const pixel = placementToPixels(placement, pageWidth, pageHeight)
        const selected = selectedId === placement.id

        return (
          <Rnd
            key={placement.id}
            bounds="parent"
            lockAspectRatio={asset.aspectRatio}
            minWidth={24}
            minHeight={16}
            size={{ width: pixel.width, height: pixel.height }}
            position={{ x: pixel.x, y: pixel.y }}
            enableResizing={selected ? cornersOnly : false}
            resizeHandleStyles={cornerStyles}
            resizeHandleComponent={cornerGrips}
            onPointerDown={(event: React.PointerEvent<HTMLElement>) => {
              event.stopPropagation()
              onSelect(placement.id)
            }}
            onDragStart={() => onSelect(placement.id)}
            onDragStop={(_, data) => {
              if (data.x === pixel.x && data.y === pixel.y) return
              onChange(
                placement.id,
                pixelsToNormalized({ ...pixel, x: data.x, y: data.y }, pageWidth, pageHeight),
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
            className={`!flex items-center justify-center ${
              selected
                ? 'outline-2 outline-offset-1 outline-blue-500 outline-dashed'
                : 'outline-1 outline-transparent hover:outline-blue-300'
            }`}
            // Stop the browser from scrolling/zooming while an item is being dragged.
            style={{ zIndex: selected ? 30 : 20, touchAction: 'none' }}
          >
            <img
              src={asset.dataUrl}
              alt={asset.name}
              draggable={false}
              className="pointer-events-none h-full w-full object-fill select-none"
            />
          </Rnd>
        )
      })}
    </div>
  )
}
