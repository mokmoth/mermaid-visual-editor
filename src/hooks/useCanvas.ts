import { useCallback, RefObject } from 'react'
import type { ViewState, Point } from '@/types'

/**
 * Hook for canvas operations (zoom, pan, coordinate transformation)
 */
export function useCanvas(
  containerRef: RefObject<HTMLElement>,
  view: ViewState,
  setView: (view: ViewState) => void
) {
  // Convert screen coordinates to canvas coordinates
  const getCanvasPos = useCallback((e: { clientX: number; clientY: number }): Point => {
    const container = containerRef.current
    if (!container) return { x: 0, y: 0 }
    
    const rect = container.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left - view.x) / view.scale,
      y: (e.clientY - rect.top - view.y) / view.scale
    }
  }, [containerRef, view])

  // Handle mouse wheel for zooming
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    
    const scaleAmount = -e.deltaY * 0.001
    const newScale = Math.min(Math.max(0.2, view.scale + scaleAmount), 5)
    
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // Zoom towards mouse position
    const worldX = (mouseX - view.x) / view.scale
    const worldY = (mouseY - view.y) / view.scale
    
    setView({
      x: mouseX - worldX * newScale,
      y: mouseY - worldY * newScale,
      scale: newScale
    })
  }, [view, setView])

  // Reset view to default
  const resetView = useCallback(() => {
    setView({ x: 0, y: 0, scale: 1 })
  }, [setView])

  return {
    getCanvasPos,
    handleWheel,
    resetView
  }
}
