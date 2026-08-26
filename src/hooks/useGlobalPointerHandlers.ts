import { useEffect, MutableRefObject } from 'react'
import type {
  GraphNode,
  GraphState,
  Swimlane,
  ViewState,
  PanState,
  BoxSelectState,
  Selection
} from '../types'
import { getNodeSize } from '../utils/nodeSize'

interface GlobalPointerHandlersProps {
  dragState: any
  setDragState: (state: any) => void
  multiDragState: any
  setMultiDragState: (state: any) => void
  resizeState: any
  setResizeState: (state: any) => void
  multiResizeState: any
  setMultiResizeState: (state: any) => void
  panState: PanState | null
  setPanState: (state: PanState | null) => void
  boxSelect: BoxSelectState | null
  setBoxSelect: (state: BoxSelectState | null) => void
  nodes: GraphNode[]
  graphState: GraphState
  setGraphState: (state: GraphState) => void
  replaceGraphState: (state: GraphState) => void
  editorView: ViewState
  setEditorView: (view: ViewState | ((prev: ViewState) => ViewState)) => void
  setPreviewView: (view: ViewState | ((prev: ViewState) => ViewState)) => void
  snapToGrid: boolean
  GRID_SIZE: number
  rAF: MutableRefObject<number | null>
  setMultiSelect: (ids: Set<string>) => void
  setSelection: (selection: Selection | null) => void
}

export function useGlobalPointerHandlers({
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
  nodes,
  graphState,
  setGraphState,
  replaceGraphState,
  editorView,
  setEditorView,
  setPreviewView,
  snapToGrid,
  GRID_SIZE,
  rAF,
  setMultiSelect,
  setSelection
}: GlobalPointerHandlersProps) {
  useEffect(() => {
    // Helper to find swimlane and lane for a node based on position
    const findSwimlaneAndLaneForNode = (
      node: GraphNode,
      swimlanes: Swimlane[]
    ): { swimlaneId?: string; laneId?: string } => {
      const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
      const centerX = node.x + width / 2
      const centerY = node.y + height / 2

      for (const swimlane of swimlanes) {
        // Check if node is inside swimlane bounds
        if (
          centerX >= swimlane.x &&
          centerX <= swimlane.x + swimlane.width &&
          centerY >= swimlane.y &&
          centerY <= swimlane.y + swimlane.height
        ) {
          // Find which lane the node is in
          const headerHeight = 36
          const laneCount = swimlane.lanes?.length || 1
          const contentHeight = swimlane.height - headerHeight
          const contentWidth = swimlane.width

          // Calculate position relative to content area (excluding header)
          const relativeY = centerY - swimlane.y - headerHeight
          const relativeX = centerX - swimlane.x

          if (relativeY < 0) {
            // Node is in header area, assign to swimlane but no lane
            return { swimlaneId: swimlane.id, laneId: undefined }
          }

          let laneIndex = 0
          if (swimlane.orientation === 'horizontal') {
            // Horizontal = lanes are rows
            const laneHeight = contentHeight / laneCount
            laneIndex = Math.min(Math.floor(relativeY / laneHeight), laneCount - 1)
          } else {
            // Vertical = lanes are columns
            const laneWidth = contentWidth / laneCount
            laneIndex = Math.min(Math.floor(relativeX / laneWidth), laneCount - 1)
          }

          const laneId = swimlane.lanes?.[laneIndex]?.id
          return { swimlaneId: swimlane.id, laneId }
        }
      }
      return { swimlaneId: undefined, laneId: undefined }
    }

    const handleGlobalPointerUp = () => {
      if (dragState) {
        // Assign swimlane and lane to dragged node based on position
        const updatedNodes = graphState.nodes.map(n => {
          if (n.id === dragState.nodeId) {
            const { swimlaneId, laneId } = findSwimlaneAndLaneForNode(n, graphState.swimlanes)
            return { ...n, swimlaneId, laneId }
          }
          return n
        })
        setGraphState({ ...graphState, nodes: updatedNodes })
        setDragState(null)
      }
      if (multiDragState) {
        // Assign swimlanes and lanes to all dragged nodes
        const updatedNodes = graphState.nodes.map(n => {
          if (multiDragState.nodeIds.has(n.id)) {
            const { swimlaneId, laneId } = findSwimlaneAndLaneForNode(n, graphState.swimlanes)
            return { ...n, swimlaneId, laneId }
          }
          return n
        })
        setGraphState({ ...graphState, nodes: updatedNodes })
        setMultiDragState(null)
      }
      if (resizeState) {
        setGraphState(graphState)
        setResizeState(null)
      }
      if (multiResizeState) {
        setGraphState(graphState)
        setMultiResizeState(null)
      }
      if (panState) setPanState(null)

      if (boxSelect) {
        const minX = Math.min(boxSelect.startX, boxSelect.endX)
        const maxX = Math.max(boxSelect.startX, boxSelect.endX)
        const minY = Math.min(boxSelect.startY, boxSelect.endY)
        const maxY = Math.max(boxSelect.startY, boxSelect.endY)

        const selectedItems = new Set<string>()

        // Check nodes
        nodes.forEach(node => {
          const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
          const nodeRight = node.x + width
          const nodeBottom = node.y + height
          if (node.x < maxX && nodeRight > minX && node.y < maxY && nodeBottom > minY) {
            selectedItems.add(node.id)
          }
        })

        // Check swimlanes
        graphState.swimlanes.forEach(swimlane => {
          const swimlaneRight = swimlane.x + swimlane.width
          const swimlaneBottom = swimlane.y + swimlane.height
          if (swimlane.x < maxX && swimlaneRight > minX && swimlane.y < maxY && swimlaneBottom > minY) {
            selectedItems.add(swimlane.id)
          }
        })

        setMultiSelect(selectedItems)
        // Clear single selection when box select completes (fixes swimlane deselection)
        setSelection(null)
        setBoxSelect(null)
      }
    }

    window.addEventListener('pointerup', handleGlobalPointerUp, true)
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp, true)
  }, [dragState, multiDragState, resizeState, multiResizeState, panState, boxSelect, nodes, graphState, setGraphState, setDragState, setMultiDragState, setResizeState, setMultiResizeState, setPanState, setBoxSelect, setMultiSelect, setSelection])

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      // Don't do anything if no drag/resize/pan is active for flowchart
      if (!panState && !resizeState && !multiResizeState && !dragState && !multiDragState) return

      if (rAF.current) return
      const clientX = e.clientX
      const clientY = e.clientY

      rAF.current = requestAnimationFrame(() => {
        if (panState) {
          const dx = clientX - panState.startX
          const dy = clientY - panState.startY
          if (panState.type === 'editor') {
            setEditorView(prev => ({ ...prev, x: panState.viewStartX + dx, y: panState.viewStartY + dy }))
          } else {
            setPreviewView(prev => ({ ...prev, x: panState.viewStartX + dx, y: panState.viewStartY + dy }))
          }
        } else if (resizeState) {
          const dx = (clientX - resizeState.startX) / editorView.scale
          const dy = (clientY - resizeState.startY) / editorView.scale
          const { nodeId, startW, startH, startNodeX, startNodeY, handle } = resizeState

          let newW = startW
          let newH = startH
          let newX = startNodeX
          let newY = startNodeY

          if (handle.includes('e')) newW = Math.max(40, startW + dx)
          if (handle.includes('w')) {
            newW = Math.max(40, startW - dx)
            newX = startNodeX + (startW - newW)
          }
          if (handle.includes('s')) newH = Math.max(40, startH + dy)
          if (handle.includes('n')) {
            newH = Math.max(40, startH - dy)
            newY = startNodeY + (startH - newH)
          }

          const updatedNodes = nodes.map(n =>
            n.id === nodeId ? { ...n, customWidth: newW, customHeight: newH, x: newX, y: newY } : n
          )
          replaceGraphState({ ...graphState, nodes: updatedNodes })
        } else if (dragState) {
          const dist = Math.hypot(clientX - dragState.startX, clientY - dragState.startY)
          if (dist > 5) {
            const dx = (clientX - dragState.startX) / editorView.scale
            const dy = (clientY - dragState.startY) / editorView.scale
            
            const updatedNodes = nodes.map(n =>
              n.id === dragState.nodeId
                ? {
                    ...n,
                    x: snapToGrid ? Math.round((dragState.initialNodeX + dx) / GRID_SIZE) * GRID_SIZE : dragState.initialNodeX + dx,
                    y: snapToGrid ? Math.round((dragState.initialNodeY + dy) / GRID_SIZE) * GRID_SIZE : dragState.initialNodeY + dy
                  }
                : n
            )
            replaceGraphState({ ...graphState, nodes: updatedNodes })
          }
        } else if (multiDragState) {
          const dx = (clientX - multiDragState.startX) / editorView.scale
          const dy = (clientY - multiDragState.startY) / editorView.scale

          // Update nodes
          const updatedNodes = nodes.map(n => {
            if (multiDragState.nodeIds.has(n.id)) {
              const initial = multiDragState.initialPositions.get(n.id)!
              return {
                ...n,
                x: snapToGrid ? Math.round((initial.x + dx) / GRID_SIZE) * GRID_SIZE : initial.x + dx,
                y: snapToGrid ? Math.round((initial.y + dy) / GRID_SIZE) * GRID_SIZE : initial.y + dy
              }
            }
            return n
          })

          // Update swimlanes
          const updatedSwimlanes = graphState.swimlanes.map(s => {
            if (multiDragState.nodeIds.has(s.id)) {
              const initial = multiDragState.initialPositions.get(s.id)!
              return {
                ...s,
                x: snapToGrid ? Math.round((initial.x + dx) / GRID_SIZE) * GRID_SIZE : initial.x + dx,
                y: snapToGrid ? Math.round((initial.y + dy) / GRID_SIZE) * GRID_SIZE : initial.y + dy
              }
            }
            return s
          })

          replaceGraphState({ ...graphState, nodes: updatedNodes, swimlanes: updatedSwimlanes })
        } else if (multiResizeState) {
          const dx = (clientX - multiResizeState.startX) / editorView.scale
          const dy = (clientY - multiResizeState.startY) / editorView.scale
          const { nodeIds, initialData, boundingBox, handle } = multiResizeState

          // Calculate scale factors based on handle and deltas
          let scaleX = 1, scaleY = 1
          let offsetX = 0, offsetY = 0
          const minSize = 40

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

          // For corner handles, use uniform scaling
          if (handle.length === 2) {
            const uniformScale = Math.max(scaleX, scaleY)
            scaleX = uniformScale
            scaleY = uniformScale
            if (handle.includes('w')) {
              offsetX = boundingBox.width * (1 - uniformScale)
            }
            if (handle.includes('n')) {
              offsetY = boundingBox.height * (1 - uniformScale)
            }
          }

          // Update nodes
          const updatedNodes = nodes.map(n => {
            if (nodeIds.has(n.id)) {
              const initial = initialData.get(n.id)!
              const relX = initial.x - boundingBox.x
              const relY = initial.y - boundingBox.y

              const newX = boundingBox.x + offsetX + relX * scaleX
              const newY = boundingBox.y + offsetY + relY * scaleY
              const newWidth = Math.max(40, initial.width * scaleX)
              const newHeight = Math.max(30, initial.height * scaleY)

              return {
                ...n,
                x: snapToGrid ? Math.round(newX / GRID_SIZE) * GRID_SIZE : newX,
                y: snapToGrid ? Math.round(newY / GRID_SIZE) * GRID_SIZE : newY,
                customWidth: newWidth,
                customHeight: newHeight
              }
            }
            return n
          })

          // Update swimlanes
          const updatedSwimlanes = graphState.swimlanes.map(s => {
            if (nodeIds.has(s.id)) {
              const initial = initialData.get(s.id)!
              const relX = initial.x - boundingBox.x
              const relY = initial.y - boundingBox.y

              const newX = boundingBox.x + offsetX + relX * scaleX
              const newY = boundingBox.y + offsetY + relY * scaleY
              const newWidth = Math.max(100, initial.width * scaleX)
              const newHeight = Math.max(80, initial.height * scaleY)

              return {
                ...s,
                x: snapToGrid ? Math.round(newX / GRID_SIZE) * GRID_SIZE : newX,
                y: snapToGrid ? Math.round(newY / GRID_SIZE) * GRID_SIZE : newY,
                width: newWidth,
                height: newHeight
              }
            }
            return s
          })

          replaceGraphState({ ...graphState, nodes: updatedNodes, swimlanes: updatedSwimlanes })
        }
        rAF.current = null
      })
    }

    window.addEventListener('pointermove', handleGlobalPointerMove)
    return () => window.removeEventListener('pointermove', handleGlobalPointerMove)
  }, [panState, resizeState, multiResizeState, dragState, multiDragState, editorView.scale, nodes, graphState, replaceGraphState, snapToGrid, GRID_SIZE, rAF, setEditorView, setPreviewView])
}
