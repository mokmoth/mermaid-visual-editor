import { useEffect } from 'react'
import type {
  GraphNode,
  GraphLink,
  Selection,
  ClipboardState,
  DrawingLink
} from '../types'

interface KeyboardShortcutsProps {
  editingNodeId: string | null
  editingLinkId: string | null
  undo: () => void
  redo: () => void
  selection: Selection | null
  nodes: GraphNode[]
  links: GraphLink[]
  clipboard: ClipboardState | null
  setClipboard: (state: ClipboardState | null) => void
  setNodes: (nodes: GraphNode[]) => void
  setSelection: (selection: Selection | null) => void
  setMultiSelect: (ids: Set<string>) => void
  setBoxSelect: (state: any) => void
  deleteSelection: () => void
  multiSelect: Set<string>
  drawingLink?: DrawingLink | null
  onDrawingLinkCancel?: () => void
}

export function useKeyboardShortcuts({
  editingNodeId,
  editingLinkId,
  undo,
  redo,
  selection,
  nodes,
  links,
  clipboard,
  setClipboard,
  setNodes,
  setSelection,
  setMultiSelect,
  setBoxSelect,
  deleteSelection,
  multiSelect,
  drawingLink,
  onDrawingLinkCancel
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingNodeId || editingLinkId) return

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selection) {
        e.preventDefault()
        if (selection.type === 'node') {
          const node = nodes.find(n => n.id === selection.id)
          if (node) setClipboard({ type: 'node', data: { ...node } })
        } else if (selection.type === 'link') {
          const link = links.find(l => l.id === selection.id)
          if (link) setClipboard({ type: 'link', data: { ...link } })
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboard) {
        e.preventDefault()
        if (clipboard.type === 'node') {
          const nodeData = clipboard.data as GraphNode
          const newNode: GraphNode = {
            ...nodeData,
            id: `Node${Date.now()}`,
            x: nodeData.x + 50,
            y: nodeData.y + 50
          }
          setNodes([...nodes, newNode])
          setSelection({ type: 'node', id: newNode.id })
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && (selection || multiSelect.size > 0)) {
        e.preventDefault()
        deleteSelection()
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        setMultiSelect(new Set(nodes.map(n => n.id)))
        setSelection(null)
      } else if (e.key === 'Escape') {
        // Cancel drawing link first if active
        if (drawingLink && onDrawingLinkCancel) {
          onDrawingLinkCancel()
        }
        setSelection(null)
        setMultiSelect(new Set())
        setBoxSelect(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, selection, clipboard, nodes, links, editingNodeId, editingLinkId, multiSelect, drawingLink, setClipboard, setNodes, setSelection, setMultiSelect, setBoxSelect, deleteSelection, onDrawingLinkCancel])
}
