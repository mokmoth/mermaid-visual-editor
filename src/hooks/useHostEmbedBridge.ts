import { useEffect, useRef, type RefObject } from 'react'

export function isHostEmbed(): boolean {
  try {
    return typeof window !== 'undefined' && window.parent !== window
  } catch {
    return true
  }
}

export function isTrustedHostMessage(
  event: Pick<MessageEvent, 'origin' | 'source'>,
  expectedSource: Window,
  expectedOrigin: string
): boolean {
  return event.source === expectedSource && event.origin === expectedOrigin
}

/** postMessage protocol used by PM 工作台's diagram overlay iframe. */
export function useHostEmbedBridge(opts: {
  generatedCode: string
  mermaidRef: RefObject<HTMLDivElement | null>
  applySource: (code: string) => void
}) {
  const applyRef = useRef(opts.applySource)
  applyRef.current = opts.applySource
  const codeRef = useRef(opts.generatedCode)
  codeRef.current = opts.generatedCode
  const mermaidRef = opts.mermaidRef

  useEffect(() => {
    if (!isHostEmbed()) return undefined
    const parentWindow = window.parent
    const targetOrigin = window.location.origin
    if (targetOrigin === 'null') return undefined

    const postToHost = (message: Record<string, unknown>) => {
      parentWindow.postMessage(message, targetOrigin)
    }

    function onMsg(event: MessageEvent) {
      if (!isTrustedHostMessage(event, parentWindow, targetOrigin)) return
      const data = event.data
      if (!data || typeof data !== 'object') return
      if (data.type === 'pm-mermaid-set' && typeof data.source === 'string') {
        applyRef.current(data.source)
      }
      if (data.type === 'pm-mermaid-request-source') {
        postToHost({ type: 'pm-mermaid-source', source: codeRef.current })
      }
      if (data.type === 'pm-mermaid-request-svg') {
        const node = mermaidRef.current
        const svg = node ? node.innerHTML || '' : ''
        postToHost({ type: 'pm-mermaid-svg', svg })
      }
    }
    window.addEventListener('message', onMsg)
    postToHost({ type: 'pm-mermaid-ready' })
    return () => window.removeEventListener('message', onMsg)
  }, [mermaidRef])

  useEffect(() => {
    if (!isHostEmbed()) return
    const targetOrigin = window.location.origin
    if (targetOrigin === 'null') return
    window.parent.postMessage(
      { type: 'pm-mermaid-source', source: opts.generatedCode },
      targetOrigin
    )
  }, [opts.generatedCode])
}
