import { useState, useCallback, useRef } from 'react'

/**
 * Undo/redo with a live-replace path for dragging.
 * Discrete edits go through `set` (one history entry).
 * Drag/resize: `begin()` at pointer down, `replace()` while moving, `commit()` on pointer up.
 */
export function useUndoRedo<T>(initialValue: T | (() => T)) {
  const [past, setPast] = useState<T[]>([])
  const [present, setPresent] = useState<T>(initialValue)
  const [future, setFuture] = useState<T[]>([])
  const checkpointRef = useRef<T | null>(null)

  const canUndo = past.length > 0
  const canRedo = future.length > 0

  const undo = useCallback(() => {
    setPast(prevPast => {
      if (prevPast.length === 0) return prevPast
      const previous = prevPast[prevPast.length - 1]
      setPresent(curr => {
        setFuture(prevFuture => [curr, ...prevFuture])
        return previous
      })
      return prevPast.slice(0, prevPast.length - 1)
    })
  }, [])

  const redo = useCallback(() => {
    setFuture(prevFuture => {
      if (prevFuture.length === 0) return prevFuture
      const next = prevFuture[0]
      setPresent(curr => {
        setPast(prevPast => [...prevPast, curr])
        return next
      })
      return prevFuture.slice(1)
    })
  }, [])

  const set = useCallback((newPresent: T | ((prev: T) => T), clearFuture = true) => {
    setPresent(curr => {
      const resolvedPresent = typeof newPresent === 'function'
        ? (newPresent as (prev: T) => T)(curr)
        : newPresent
      if (Object.is(resolvedPresent, curr)) return curr
      checkpointRef.current = null
      setPast(prevPast => [...prevPast, curr])
      if (clearFuture) setFuture([])
      return resolvedPresent
    })
  }, [])

  const replace = useCallback((newPresent: T | ((prev: T) => T)) => {
    setPresent(curr =>
      typeof newPresent === 'function'
        ? (newPresent as (prev: T) => T)(curr)
        : newPresent
    )
  }, [])

  const begin = useCallback(() => {
    checkpointRef.current = present
  }, [present])

  const commit = useCallback(() => {
    const before = checkpointRef.current
    checkpointRef.current = null
    if (before == null) return
    setPresent(curr => {
      if (!Object.is(curr, before)) {
        setPast(prevPast => [...prevPast, before])
        setFuture([])
      }
      return curr
    })
  }, [])

  const reset = useCallback((newPresent: T) => {
    checkpointRef.current = null
    setPast([])
    setFuture([])
    setPresent(newPresent)
  }, [])

  return [present, set, undo, redo, canUndo, canRedo, replace, begin, commit, reset] as const
}
