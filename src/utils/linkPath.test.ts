import { describe, expect, it } from 'vitest'
import { getLinkVisuals, parallelOffsetByLinkId, undirectedPairKey } from './linkPath'
import type { GraphLink, GraphNode } from '@/types'

const link = (id: string, source: string, target: string, extra: Partial<GraphLink> = {}): GraphLink => ({
  id,
  source,
  target,
  type: 'solid',
  arrow: 'forward',
  ...extra
})

describe('parallelOffsetByLinkId', () => {
  it('separates two links on the same pair', () => {
    const offsets = parallelOffsetByLinkId([
      link('a', 'Proc', 'Cond', { label: '检查' }),
      link('b', 'Cond', 'Proc', { label: '不通过', type: 'dotted' })
    ])
    expect(offsets.get('a')).toBe(-26)
    expect(offsets.get('b')).toBe(26)
  })

  it('keeps a single link on center', () => {
    const offsets = parallelOffsetByLinkId([link('a', 'Start', 'Proc')])
    expect(offsets.get('a')).toBe(0)
  })
})

describe('undirectedPairKey', () => {
  it('is order-insensitive', () => {
    expect(undirectedPairKey('Wait', 'Check')).toBe(undirectedPairKey('Check', 'Wait'))
  })
})

describe('getLinkVisuals', () => {
  const node = (id: string, x: number, y: number): GraphNode => ({
    id, type: 'rect', x, y, label: id
  })

  it('routes a vertical pair with orthogonal segments', () => {
    ;(globalThis as unknown as { document: unknown }).document = {
      createElement: () => ({ getContext: () => null })
    }
    const nodes = new Map([
      ['A', node('A', 100, 40)],
      ['B', node('B', 100, 200)],
    ])
    const visuals = getLinkVisuals(link('ab', 'A', 'B'), nodes)
    expect(visuals.path).toContain(' L')
    expect(visuals.path).not.toContain(' Q')
  })
})
