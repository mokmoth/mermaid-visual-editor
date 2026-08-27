import { useCallback, useLayoutEffect, useRef, useState } from 'react'

export const COMPACT_MIN_PROPS = 44
export const COMPACT_MIN_CODE = 44
export const COMPACT_MIN_PREVIEW = 96
export const COMPACT_DEFAULT_PROPS = 108
export const COMPACT_DEFAULT_CODE = 132

export function clampPanelHeights(opts: {
  containerHeight: number
  compact: boolean
  propertiesHeight: number
  codeHeight: number
}) {
  const { containerHeight: h, compact, propertiesHeight, codeHeight } = opts

  if (!compact || h < 180) {
    const minProps = 150
    const maxProps = 500
    const minCode = 100
    const maxCode = 400
    return {
      minProps,
      maxProps,
      minCode,
      maxCode,
      propsH: Math.min(Math.max(propertiesHeight, minProps), maxProps),
      codeH: Math.min(Math.max(codeHeight, minCode), maxCode)
    }
  }

  const chrome = 20
  const minProps = COMPACT_MIN_PROPS
  const minCode = COMPACT_MIN_CODE
  const minPreview = COMPACT_MIN_PREVIEW
  const usable = Math.max(minProps + minCode, h - minPreview - chrome)
  const maxProps = Math.max(minProps, usable - minCode)
  const maxCode = Math.max(minCode, usable - minProps)
  let propsH = Math.min(Math.max(propertiesHeight, minProps), maxProps)
  let codeH = Math.min(Math.max(codeHeight, minCode), maxCode)
  if (propsH + codeH > usable) {
    codeH = Math.max(minCode, usable - propsH)
  }
  if (propsH + codeH > usable) {
    propsH = Math.max(minProps, usable - codeH)
  }
  return { minProps, maxProps, minCode, maxCode, propsH, codeH }
}

export function usePanelHeights(opts: {
  propsKey: string
  codeKey: string
  defaultProps: number
  defaultCode: number
  compact: boolean
  hasSelection: boolean
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const compactKeyProps = `${opts.propsKey}-compact`
  const compactKeyCode = `${opts.codeKey}-compact`
  const [propertiesHeight, setPropertiesHeight] = useState(() => {
    if (opts.compact) {
      const saved = window.localStorage.getItem(compactKeyProps)
      return saved ? parseInt(saved, 10) : COMPACT_DEFAULT_PROPS
    }
    const saved = window.localStorage.getItem(opts.propsKey)
    return saved ? parseInt(saved, 10) : opts.defaultProps
  })
  const [codeHeight, setCodeHeight] = useState(() => {
    if (opts.compact) {
      const saved = window.localStorage.getItem(compactKeyCode)
      return saved ? parseInt(saved, 10) : COMPACT_DEFAULT_CODE
    }
    const saved = window.localStorage.getItem(opts.codeKey)
    return saved ? parseInt(saved, 10) : opts.defaultCode
  })
  const [containerHeight, setContainerHeight] = useState(0)

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const apply = () => setContainerHeight(el.clientHeight)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const persist = useCallback((kind: 'props' | 'code', next: number) => {
    const key = opts.compact
      ? (kind === 'props' ? compactKeyProps : compactKeyCode)
      : (kind === 'props' ? opts.propsKey : opts.codeKey)
    window.localStorage.setItem(key, String(next))
  }, [opts.compact, opts.propsKey, opts.codeKey, compactKeyProps, compactKeyCode])

  const measure = useCallback(() => {
    return clampPanelHeights({
      containerHeight: rootRef.current?.clientHeight || containerHeight,
      compact: opts.compact,
      propertiesHeight,
      codeHeight
    })
  }, [containerHeight, opts.compact, propertiesHeight, codeHeight])

  const handlePropertiesResize = useCallback((delta: number) => {
    const { minProps, maxProps } = measure()
    setPropertiesHeight(prev => {
      const next = Math.max(minProps, Math.min(maxProps, prev + delta))
      persist('props', next)
      return next
    })
  }, [measure, persist])

  const handleCodeResize = useCallback((delta: number) => {
    const { minCode, maxCode } = measure()
    setCodeHeight(prev => {
      const next = Math.max(minCode, Math.min(maxCode, prev + delta))
      persist('code', next)
      return next
    })
  }, [measure, persist])

  const shown = measure()
  return {
    rootRef,
    propertiesHeight: shown.propsH,
    codeHeight: shown.codeH,
    handlePropertiesResize,
    handleCodeResize
  }
}
