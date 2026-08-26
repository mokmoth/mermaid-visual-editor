import { useEffect, MutableRefObject } from 'react'
import type { ViewState, PanState, BoxSelectState } from '../types'

interface PluginDragHandlersProps<TState> {
  activeDiagramType: string
  dragState: {
    nodeId: string
    startX: number
    startY: number
    initialNodeX: number
    initialNodeY: number
  } | null
  setDragState: (state: any) => void
  multiDragState: {
    nodeIds: Set<string>
    initialPositions: Map<string, { x: number; y: number }>
    startX: number
    startY: number
  } | null
  setMultiDragState: (state: any) => void
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
  // Plugin state and updater
  pluginState: TState
  setPluginState: (state: TState) => void
  // Function to get nodes array from plugin state
  getNodes: (state: TState) => Array<{ id: string; x: number; y: number; [key: string]: any }>
  // Function to update nodes in plugin state
  updateNodes: (state: TState, nodes: Array<{ id: string; x: number; y: number; [key: string]: any }>) => TState
  // Function to get node size
  getNodeSize?: (node: any) => { width: number; height: number }
}

export function usePluginDragHandlers<TState>({
  activeDiagramType,
  dragState,
  setDragState,
  multiDragState,
  setMultiDragState,
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
  pluginState,
  setPluginState,
  getNodes,
  updateNodes,
  getNodeSize = () => ({ width: 100, height: 60 })
}: PluginDragHandlersProps<TState>) {
  // Handle pointer up - finalize drag operations
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (dragState) {
        setDragState(null)
      }
      if (multiDragState) {
        setMultiDragState(null)
      }
      if (panState) setPanState(null)

      if (boxSelect) {
        const minX = Math.min(boxSelect.startX, boxSelect.endX)
        const maxX = Math.max(boxSelect.startX, boxSelect.endX)
        const minY = Math.min(boxSelect.startY, boxSelect.endY)
        const maxY = Math.max(boxSelect.startY, boxSelect.endY)

        const selectedNodes = new Set<string>()
        const nodes = getNodes(pluginState)
        nodes.forEach(node => {
          const { width, height } = getNodeSize(node)
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
  }, [activeDiagramType, dragState, multiDragState, panState, boxSelect, pluginState, setDragState, setMultiDragState, setPanState, setBoxSelect, setMultiSelect, getNodes, getNodeSize])

  // Handle pointer move - update positions during drag
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
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
        } else if (dragState) {
          const dist = Math.hypot(clientX - dragState.startX, clientY - dragState.startY)
          if (dist > 5) {
            const dx = (clientX - dragState.startX) / editorView.scale
            const dy = (clientY - dragState.startY) / editorView.scale

            const nodes = getNodes(pluginState)
            const updatedNodes = nodes.map(n =>
              n.id === dragState.nodeId
                ? {
                    ...n,
                    x: snapToGrid ? Math.round((dragState.initialNodeX + dx) / gridSize) * gridSize : dragState.initialNodeX + dx,
                    y: snapToGrid ? Math.round((dragState.initialNodeY + dy) / gridSize) * gridSize : dragState.initialNodeY + dy
                  }
                : n
            )
            setPluginState(updateNodes(pluginState, updatedNodes))
          }
        } else if (multiDragState) {
          const dx = (clientX - multiDragState.startX) / editorView.scale
          const dy = (clientY - multiDragState.startY) / editorView.scale

          const nodes = getNodes(pluginState)
          const updatedNodes = nodes.map(n => {
            if (multiDragState.nodeIds.has(n.id)) {
              const initial = multiDragState.initialPositions.get(n.id)!
              return {
                ...n,
                x: snapToGrid ? Math.round((initial.x + dx) / gridSize) * gridSize : initial.x + dx,
                y: snapToGrid ? Math.round((initial.y + dy) / gridSize) * gridSize : initial.y + dy
              }
            }
            return n
          })
          setPluginState(updateNodes(pluginState, updatedNodes))
        }
        rAF.current = null
      })
    }

    window.addEventListener('pointermove', handleGlobalPointerMove)
    return () => window.removeEventListener('pointermove', handleGlobalPointerMove)
  }, [activeDiagramType, panState, dragState, multiDragState, editorView.scale, pluginState, setPluginState, snapToGrid, gridSize, rAF, setEditorView, setPreviewView, getNodes, updateNodes])
}
