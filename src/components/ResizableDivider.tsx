import { memo, useCallback, useEffect, useState } from 'react'

interface ResizableDividerProps {
  orientation?: 'horizontal' | 'vertical'
  onResize: (delta: number) => void
  onResizeEnd?: () => void
}

export const ResizableDivider = memo(({ orientation = 'horizontal', onResize, onResizeEnd }: ResizableDividerProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState(0)

  const isVertical = orientation === 'vertical'

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setStartPos(isVertical ? e.clientY : e.clientX)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [isVertical])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return
    const currentPos = isVertical ? e.clientY : e.clientX
    const delta = currentPos - startPos
    setStartPos(currentPos)
    onResize(delta)
  }, [isDragging, startPos, isVertical, onResize])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false)
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      onResizeEnd?.()
    }
  }, [isDragging, onResizeEnd])

  // Prevent text selection while dragging
  useEffect(() => {
    if (isDragging) {
      document.body.style.userSelect = 'none'
      document.body.style.cursor = isVertical ? 'row-resize' : 'col-resize'
    } else {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
    return () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isDragging, isVertical])

  if (isVertical) {
    return (
      <div
        className={`h-1 bg-gray-200 hover:bg-blue-400 cursor-row-resize flex-shrink-0 transition-colors ${
          isDragging ? 'bg-blue-500' : ''
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        {/* Visual indicator */}
        <div className="w-full h-full flex items-center justify-center">
          <div className={`h-0.5 w-8 rounded-full ${isDragging ? 'bg-white' : 'bg-gray-400'}`} />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize flex-shrink-0 transition-colors ${
        isDragging ? 'bg-blue-500' : ''
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: 'none' }}
    >
      {/* Visual indicator */}
      <div className="h-full w-full flex items-center justify-center">
        <div className={`w-0.5 h-8 rounded-full ${isDragging ? 'bg-white' : 'bg-gray-400'}`} />
      </div>
    </div>
  )
})

ResizableDivider.displayName = 'ResizableDivider'
