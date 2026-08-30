import { describe, expect, it } from 'vitest'
import { HOST_EMBED_MESSAGES, isTrustedHostMessage } from './useHostEmbedBridge'

describe('HOST_EMBED_MESSAGES', () => {
  it('uses a generic public protocol namespace', () => {
    expect(Object.values(HOST_EMBED_MESSAGES)).toEqual([
      'host-mermaid-set',
      'host-mermaid-request-source',
      'host-mermaid-request-svg',
      'host-mermaid-source',
      'host-mermaid-svg',
      'host-mermaid-ready',
    ])
  })
})

describe('isTrustedHostMessage', () => {
  const parentWindow = {} as Window
  const otherWindow = {} as Window
  const origin = 'https://editor.example.com'

  it('accepts a message from the expected parent and origin', () => {
    expect(isTrustedHostMessage({ source: parentWindow, origin }, parentWindow, origin)).toBe(true)
  })

  it('rejects a message from another origin', () => {
    expect(isTrustedHostMessage(
      { source: parentWindow, origin: 'https://attacker.example' },
      parentWindow,
      origin
    )).toBe(false)
  })

  it('rejects a same-origin message from another window', () => {
    expect(isTrustedHostMessage({ source: otherWindow, origin }, parentWindow, origin)).toBe(false)
  })
})
