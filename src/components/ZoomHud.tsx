import { Icon, Icons } from './Icons'

interface ZoomHudProps {
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
}

export function ZoomHud({ scale, onZoomIn, onZoomOut, onFit }: ZoomHudProps) {
  return (
    <div
      className="absolute bottom-4 left-4 flex items-center bg-white p-1 rounded-md shadow border border-gray-200 z-[45]"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onZoomOut}
        className="px-1.5 py-1 hover:bg-gray-100 rounded text-gray-600 text-sm font-medium leading-none"
        title="缩小"
      >
        −
      </button>
      <div className="px-2 py-1 text-xs text-gray-500 font-mono border-x border-gray-100 min-w-[3.25rem] text-center">
        {(scale * 100).toFixed(0)}%
      </div>
      <button
        type="button"
        onClick={onZoomIn}
        className="px-1.5 py-1 hover:bg-gray-100 rounded text-gray-600 text-sm font-medium leading-none"
        title="放大"
      >
        +
      </button>
      <button
        type="button"
        onClick={onFit}
        className="p-1 hover:bg-gray-100 rounded text-gray-600 ml-0.5"
        title="适应视图"
      >
        <Icon path={Icons.Reset} size={14} />
      </button>
    </div>
  )
}
