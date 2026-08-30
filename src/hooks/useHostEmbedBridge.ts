import { useEffect, useRef, type RefObject } from 'react'

export const HOST_EMBED_MESSAGES = {
  set: 'host-mermaid-set',
  requestSource: 'host-mermaid-request-source',
  requestSvg: 'host-mermaid-request-svg',
  source: 'host-mermaid-source',
  svg: 'host-mermaid-svg',
  ready: 'host-mermaid-ready',
} as const

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

/** Generic postMessage protocol for same-origin iframe hosts. */
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
      if (data.type === HOST_EMBED_MESSAGES.set && typeof data.source === 'string') {
        applyRef.current(data.source)
      }
      if (data.type === HOST_EMBED_MESSAGES.requestSource) {
        postToHost({ type: HOST_EMBED_MESSAGES.source, source: codeRef.current })
      }
      if (data.type === HOST_EMBED_MESSAGES.requestSvg) {
        const node = mermaidRef.current
        const svg = node ? node.innerHTML || '' : ''
        postToHost({ type: HOST_EMBED_MESSAGES.svg, svg })
      }
    }
    window.addEventListener('message', onMsg)
    postToHost({ type: HOST_EMBED_MESSAGES.ready })
    return () => window.removeEventListener('message', onMsg)
  }, [mermaidRef])

  useEffect(() => {
    if (!isHostEmbed()) return
    const targetOrigin = window.location.origin
    if (targetOrigin === 'null') return
    window.parent.postMessage(
      { type: HOST_EMBED_MESSAGES.source, source: opts.generatedCode },
      targetOrigin
    )
  }, [opts.generatedCode])
}
