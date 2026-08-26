import { useEffect, useRef, MutableRefObject } from 'react'
import type { ViewState, PanState, BoxSelectState, ResizeHandle } from '../types'

interface DragState {
  nodeId: string
  startX: number
  startY: number
  initialNodeX: number
  initialNodeY: number
}

interface MultiDragState {
  nodeIds: Set<string>
  initialPositions: Map<string, { x: number; y: number }>
  startX: number
  startY: number
}

interface ResizeState {
  nodeId: string
  startX: number
  startY: number
  startW: number
  startH: number
  startNodeX: number
  startNodeY: number
  handle: ResizeHandle
}

interface MultiResizeState {
  nodeIds: Set<string>
  initialData: Map<string, { x: number; y: number; width: number; height: number }>
  boundingBox: { x: number; y: number; width: number; height: number }
  startX: number
  startY: number
  handle: ResizeHandle
}

interface UnifiedDragHandlersProps {
  activeDiagramType: string
  dragState: DragState | null
  setDragState: (state: DragState | null) => void
  multiDragState: MultiDragState | null
  setMultiDragState: (state: MultiDragState | null) => void
  resizeState: ResizeState | null
  setResizeState: (state: ResizeState | null) => void
  multiResizeState: MultiResizeState | null
  setMultiResizeState: (state: MultiResizeState | null) => void
  panState: PanState | null
  setPanState: (state: PanState | null) => void
  boxSelect: BoxSelectState | null
  setBoxSelect: (state: BoxSelectState | null) => void
  editorView: ViewState
  setEditorView: (view: ViewState | ((prev: ViewState) => ViewState)) => void
  setPreviewView: (view: ViewState | ((prev: ViewState) => ViewState)) => void
  snapToGrid: boolean
  gridSize: number
  rAF: MutableRefObject<number | null>
  setMultiSelect: (ids: Set<string>) => void

  // Functions to get/update nodes for each diagram type
  getNodesForType: (type: string) => Array<{ id: string; x: number; y: number; [key: string]: any }>
  updateNodesForType: (type: string, nodes: Array<{ id: string; x: number; y: number; [key: string]: any }>) => void
  getNodeSizeForType: (type: string, node: any) => { width: number; height: number }
  commitHistory: () => void
}

export function useUnifiedDragHandlers({
  activeDiagramType,
  dragState,
  setDragState,
  multiDragState,
  setMultiDragState,
  resizeState,
  setResizeState,
  multiResizeState,
  setMultiResizeState,
  panState,
  setPanState,
  boxSelect,
  setBoxSelect,
  editorView,
  setEditorView,
  setPreviewView,
  snapToGrid,
  gridSize,
  rAF,
  setMultiSelect,
  getNodesForType,
  updateNodesForType,
  getNodeSizeForType,
  commitHistory
}: UnifiedDragHandlersProps) {
  // Use refs to always have access to latest state values
  // Refs are updated synchronously during render (before any effects)
  const dragStateRef = useRef(dragState)
  const multiDragStateRef = useRef(multiDragState)
  const resizeStateRef = useRef(resizeState)
  const multiResizeStateRef = useRef(multiResizeState)
  const panStateRef = useRef(panState)
  const boxSelectRef = useRef(boxSelect)
  const editorViewRef = useRef(editorView)
  const activeDiagramTypeRef = useRef(activeDiagramType)

  // Keep refs in sync - this runs synchronously during render
  dragStateRef.current = dragState
  multiDragStateRef.current = multiDragState
  resizeStateRef.current = resizeState
  multiResizeStateRef.current = multiResizeState
  panStateRef.current = panState
  boxSelectRef.current = boxSelect
  editorViewRef.current = editorView
  activeDiagramTypeRef.current = activeDiagramType

  // Handle pointer up - finalize drag operations
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      const hadMutation = !!(
        dragStateRef.current ||
        multiDragStateRef.current ||
        resizeStateRef.current ||
        multiResizeStateRef.current
      )
      if (dragStateRef.current) {
        setDragState(null)
      }
      if (multiDragStateRef.current) {
        setMultiDragState(null)
      }
      if (resizeStateRef.current) {
        setResizeState(null)
      }
      if (multiResizeStateRef.current) {
        setMultiResizeState(null)
      }
      if (hadMutation) {
        commitHistory()
      }
      if (panStateRef.current) setPanState(null)

      const currentBoxSelect = boxSelectRef.current
      const currentDiagramType = activeDiagramTypeRef.current
      if (currentBoxSelect) {
        const minX = Math.min(currentBoxSelect.startX, currentBoxSelect.endX)
        const maxX = Math.max(currentBoxSelect.startX, currentBoxSelect.endX)
        const minY = Math.min(currentBoxSelect.startY, currentBoxSelect.endY)
        const maxY = Math.max(currentBoxSelect.startY, currentBoxSelect.endY)

        const selectedNodes = new Set<string>()
        const nodes = getNodesForType(currentDiagramType)
        nodes.forEach(node => {
          const { width, height } = getNodeSizeForType(currentDiagramType, node)
          const nodeRight = node.x + width
          const nodeBottom = node.y + height
          if (node.x < maxX && nodeRight > minX && node.y < maxY && nodeBottom > minY) {
            selectedNodes.add(node.id)
          }
        })
        setMultiSelect(selectedNodes)
        setBoxSelect(null)
      }
    }

    window.addEventListener('pointerup', handleGlobalPointerUp, true)
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp, true)
  }, [setDragState, setMultiDragState, setResizeState, setMultiResizeState, setPanState, setBoxSelect, setMultiSelect, getNodesForType, getNodeSizeForType, commitHistory])

  // Handle pointer move - update positions during drag
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      const currentDragState = dragStateRef.current
      const currentMultiDragState = multiDragStateRef.current
      const currentResizeState = resizeStateRef.current
      const currentMultiResizeState = multiResizeStateRef.current
      const currentPanState = panStateRef.current

      // Don't do anything if no drag/resize/pan is active for this handler
      if (!currentPanState && !currentDragState && !currentMultiDragState && !currentResizeState && !currentMultiResizeState) return

      if (rAF.current) return
      const clientX = e.clientX
      const clientY = e.clientY

      rAF.current = requestAnimationFrame(() => {
        const scale = editorViewRef.current.scale
        const diagramType = activeDiagramTypeRef.current
        const currentDrag = dragStateRef.current
        const currentMultiDrag = multiDragStateRef.current
        const currentResize = resizeStateRef.current
        const currentMultiResize = multiResizeStateRef.current
        const currentPan = panStateRef.current

        if (currentPan) {
          const dx = clientX - currentPan.startX
          const dy = clientY - currentPan.startY
          if (currentPan.type === 'editor') {
            setEditorView(prev => ({ ...prev, x: currentPan.viewStartX + dx, y: currentPan.viewStartY + dy }))
          } else {
            setPreviewView(prev => ({ ...prev, x: currentPan.viewStartX + dx, y: currentPan.viewStartY + dy }))
          }
        } else if (currentResize) {
          const dx = (clientX - currentResize.startX) / scale
          const dy = (clientY - currentResize.startY) / scale
          const { nodeId, startW, startH, startNodeX, startNodeY, handle } = currentResize

          let newW = startW
          let newH = startH
          let newX = startNodeX
          let newY = startNodeY

          if (handle.includes('e')) newW = Math.max(60, startW + dx)
          if (handle.includes('w')) {
            newW = Math.max(60, startW - dx)
            newX = startNodeX + (startW - newW)
          }
          if (handle.includes('s')) newH = Math.max(40, startH + dy)
          if (handle.includes('n')) {
            newH = Math.max(40, startH - dy)
            newY = startNodeY + (startH - newH)
          }

          const nodes = getNodesForType(diagramType)
          const updatedNodes = nodes.map(n =>
            n.id === nodeId
              ? { ...n, customWidth: newW, customHeight: newH, x: newX, y: newY }
              : n
          )
          updateNodesForType(diagramType, updatedNodes)
        } else if (currentDrag) {
          const dist = Math.hypot(clientX - currentDrag.startX, clientY - currentDrag.startY)
          if (dist > 5) {
            const dx = (clientX - currentDrag.startX) / scale
            const dy = (clientY - currentDrag.startY) / scale

            const nodes = getNodesForType(diagramType)
            const updatedNodes = nodes.map(n =>
              n.id === currentDrag.nodeId
                ? {
                    ...n,
                    x: snapToGrid ? Math.round((currentDrag.initialNodeX + dx) / gridSize) * gridSize : currentDrag.initialNodeX + dx,
                    y: snapToGrid ? Math.round((currentDrag.initialNodeY + dy) / gridSize) * gridSize : currentDrag.initialNodeY + dy
                  }
                : n
            )
            updateNodesForType(diagramType, updatedNodes)
          }
        } else if (currentMultiDrag) {
          const dx = (clientX - currentMultiDrag.startX) / scale
          const dy = (clientY - currentMultiDrag.startY) / scale

          const nodes = getNodesForType(diagramType)
          const updatedNodes = nodes.map(n => {
            if (currentMultiDrag.nodeIds.has(n.id)) {
              const initial = currentMultiDrag.initialPositions.get(n.id)!
              return {
                ...n,
                x: snapToGrid ? Math.round((initial.x + dx) / gridSize) * gridSize : initial.x + dx,
                y: snapToGrid ? Math.round((initial.y + dy) / gridSize) * gridSize : initial.y + dy
              }
            }
            return n
          })
          updateNodesForType(diagramType, updatedNodes)
        } else if (currentMultiResize) {
          const dx = (clientX - currentMultiResize.startX) / scale
          const dy = (clientY - currentMultiResize.startY) / scale
          const { nodeIds, initialData, boundingBox, handle } = currentMultiResize

          // Calculate scale factors based on handle and deltas
          let scaleX = 1, scaleY = 1
          let offsetX = 0, offsetY = 0

          const minSize = 40 // Minimum size for bounding box

          if (handle.includes('e')) {
            const newWidth = Math.max(minSize, boundingBox.width + dx)
            scaleX = newWidth / boundingBox.width
          }
          if (handle.includes('w')) {
            const newWidth = Math.max(minSize, boundingBox.width - dx)
            scaleX = newWidth / boundingBox.width
            offsetX = boundingBox.width - newWidth
          }
          if (handle.includes('s')) {
            const newHeight = Math.max(minSize, boundingBox.height + dy)
            scaleY = newHeight / boundingBox.height
          }
          if (handle.includes('n')) {
            const newHeight = Math.max(minSize, boundingBox.height - dy)
            scaleY = newHeight / boundingBox.height
            offsetY = boundingBox.height - newHeight
          }

          // For corner handles, use uniform scaling (aspect ratio preserved)
          if (handle.length === 2) {
            const uniformScale = Math.max(scaleX, scaleY)
            scaleX = uniformScale
            scaleY = uniformScale
            // Recalculate offsets for uniform scale
            if (handle.includes('w')) {
              offsetX = boundingBox.width * (1 - uniformScale)
            }
            if (handle.includes('n')) {
              offsetY = boundingBox.height * (1 - uniformScale)
            }
          }

          const nodes = getNodesForType(diagramType)
          const updatedNodes = nodes.map(n => {
            if (nodeIds.has(n.id)) {
              const initial = initialData.get(n.id)!
              // Calculate relative position within bounding box
              const relX = initial.x - boundingBox.x
              const relY = initial.y - boundingBox.y

              // Apply scale and offset
              const newX = boundingBox.x + offsetX + relX * scaleX
              const newY = boundingBox.y + offsetY + relY * scaleY
              const newWidth = Math.max(40, initial.width * scaleX)
              const newHeight = Math.max(30, initial.height * scaleY)

              return {
                ...n,
                x: snapToGrid ? Math.round(newX / gridSize) * gridSize : newX,
                y: snapToGrid ? Math.round(newY / gridSize) * gridSize : newY,
                customWidth: newWidth,
                customHeight: newHeight
              }
            }
            return n
          })
          updateNodesForType(diagramType, updatedNodes)
        }
        rAF.current = null
      })
    }

    window.addEventListener('pointermove', handleGlobalPointerMove)
    return () => window.removeEventListener('pointermove', handleGlobalPointerMove)
  }, [snapToGrid, gridSize, rAF, setEditorView, setPreviewView, getNodesForType, updateNodesForType])
}
