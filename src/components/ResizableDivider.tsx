import { memo, useCallback, useEffect, useRef, useState } from 'react'

interface ResizableDividerProps {
  orientation?: 'horizontal' | 'vertical'
  onResize: (delta: number) => void
  onResizeEnd?: () => void
  touchFriendly?: boolean
}

export const ResizableDivider = memo(({ orientation = 'horizontal', onResize, onResizeEnd, touchFriendly = false }: ResizableDividerProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const lastPos = useRef(0)
  const onResizeRef = useRef(onResize)
  const onResizeEndRef = useRef(onResizeEnd)
  onResizeRef.current = onResize
  onResizeEndRef.current = onResizeEnd
  const isVertical = orientation === 'vertical'

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    lastPos.current = isVertical ? e.clientY : e.clientX
    const pointerId = e.pointerId
    try {
      ;(e.target as HTMLElement).setPointerCapture(pointerId)
    } catch {
      /* capture is optional; window listeners still drive the drag */
    }

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      const currentPos = isVertical ? ev.clientY : ev.clientX
      const delta = currentPos - lastPos.current
      lastPos.current = currentPos
      if (delta !== 0) onResizeRef.current(delta)
    }
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      setIsDragging(false)
      onResizeEndRef.current?.()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }, [isVertical])

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
        role="separator"
        aria-orientation="horizontal"
        className={`${touchFriendly ? 'h-6' : 'h-1'} bg-gray-200 hover:bg-blue-400 cursor-row-resize flex-shrink-0 transition-colors ${
          isDragging ? 'bg-blue-500' : ''
        }`}
        onPointerDown={handlePointerDown}
        style={{ touchAction: 'none' }}
      >
        <div className="w-full h-full flex items-center justify-center pointer-events-none">
          <div className={`${touchFriendly ? 'h-1.5 w-14' : 'h-0.5 w-8'} rounded-full ${isDragging ? 'bg-white' : 'bg-gray-400'}`} />
        </div>
      </div>
    )
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className={`${touchFriendly ? 'w-4' : 'w-1'} bg-gray-200 hover:bg-blue-400 cursor-col-resize flex-shrink-0 transition-colors ${
        isDragging ? 'bg-blue-500' : ''
      }`}
      onPointerDown={handlePointerDown}
      style={{ touchAction: 'none' }}
    >
      <div className="h-full w-full flex items-center justify-center pointer-events-none">
        <div className={`${touchFriendly ? 'w-1 h-12' : 'w-0.5 h-8'} rounded-full ${isDragging ? 'bg-white' : 'bg-gray-400'}`} />
      </div>
    </div>
  )
})

ResizableDivider.displayName = 'ResizableDivider'
