import { useState, useCallback } from 'react'

/**
 * Custom hook for undo/redo functionality
 * @param initialState - The initial state value
 * @returns Tuple of [present, set, undo, redo, canUndo, canRedo, replace]
 */
export function useUndoRedo<T>(initialState: T) {
  const [past, setPast] = useState<T[]>([])
  const [present, setPresent] = useState<T>(initialState)
  const [future, setFuture] = useState<T[]>([])

  const canUndo = past.length > 0
  const canRedo = future.length > 0

  const undo = useCallback(() => {
    if (past.length === 0) return
    
    const previous = past[past.length - 1]
    const newPast = past.slice(0, past.length - 1)
    
    setPast(newPast)
    setFuture([present, ...future])
    setPresent(previous)
  }, [past, present, future])

  const redo = useCallback(() => {
    if (future.length === 0) return
    
    const next = future[0]
    const newFuture = future.slice(1)
    
    setFuture(newFuture)
    setPast([...past, present])
    setPresent(next)
  }, [past, present, future])

  const set = useCallback((newPresent: T, clearFuture = true) => {
    if (newPresent === present) return
    
    setPast(prev => [...prev, present])
    if (clearFuture) setFuture([])
    setPresent(newPresent)
  }, [present])

  // Update current state without recording history (for continuous operations like dragging)
  const replace = useCallback((newPresent: T) => {
    setPresent(newPresent)
  }, [])

  return [present, set, undo, redo, canUndo, canRedo, replace] as const
}
