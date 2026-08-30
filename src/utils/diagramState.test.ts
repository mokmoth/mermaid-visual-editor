import { describe, expect, it } from 'vitest'
import { countDiagramElements, detectDiagramType, shouldApplyParsedState } from './diagramState'
import { calculateFitToView, zoomView } from './geometry'
import { generateMermaidCode, parseMermaidCode, sanitizeMermaidCode } from './mermaid'

describe('shouldApplyParsedState', () => {
  it('rejects empty parse over a non-empty canvas', () => {
    expect(shouldApplyParsedState(0, 3)).toBe(false)
  })

  it('allows applying a non-empty parse', () => {
    expect(shouldApplyParsedState(2, 3)).toBe(true)
  })

  it('allows applying empty onto empty', () => {
    expect(shouldApplyParsedState(0, 0)).toBe(true)
  })
})

describe('detectDiagramType', () => {
  it('reads the mermaid header after comments', () => {
    expect(detectDiagramType('flowchart TD\n  A-->B')).toBe('flowchart')
    expect(detectDiagramType('graph LR\n  A-->B')).toBe('flowchart')
    expect(detectDiagramType('stateDiagram-v2\n  [*] --> A')).toBe('state')
    expect(detectDiagramType('classDiagram\n  A -- B')).toBe('class')
    expect(detectDiagramType('erDiagram\n  USER ||--o{ ORDER : places')).toBe('er')
    expect(detectDiagramType('sequenceDiagram\n  A->>B: hi')).toBe('sequence')
    expect(detectDiagramType('%% note\nstateDiagram\n  [*] --> A')).toBe('state')
  })
})

describe('countDiagramElements', () => {
  it('counts by diagram type', () => {
    expect(countDiagramElements('flowchart', { nodes: [1, 2] })).toBe(2)
    expect(countDiagramElements('state', { states: [1] })).toBe(1)
    expect(countDiagramElements('class', { classes: [] })).toBe(0)
    expect(countDiagramElements('er', { entities: [1, 2, 3] })).toBe(3)
    expect(countDiagramElements('sequence', { participants: [1] })).toBe(1)
    expect(countDiagramElements('flowchart', null)).toBe(0)
  })
})

describe('calculateFitToView', () => {
  it('does not zoom in past 100%', () => {
    const view = calculateFitToView(
      { minX: 0, minY: 0, maxX: 40, maxY: 40 },
      800,
      600
    )
    expect(view.scale).toBeLessThanOrEqual(1)
  })
})

describe('zoomView', () => {
  it('scales around the given center and clamps to max', () => {
    const next = zoomView({ x: 0, y: 0, scale: 1 }, 1.25, 200, 100)
    expect(next.scale).toBe(1.25)
    expect(next.x).toBe(200 - 200 * 1.25)
    expect(next.y).toBe(100 - 100 * 1.25)

    const clamped = zoomView({ x: 0, y: 0, scale: 5 }, 2, 10, 10)
    expect(clamped.scale).toBe(5)
  })
})

describe('sanitizeMermaidCode', () => {
  it('quotes labels that contain br tags', () => {
    const out = sanitizeMermaidCode('flowchart TD\n  A[hello<br/>world]')
    expect(out).toContain('A["hello<br/>world"]')
  })
})

describe('flowchart mermaid roundtrip', () => {
  it('parses generated code back into the same node ids', () => {
    const nodes = [
      { id: 'Start', type: 'stadium' as const, x: 0, y: 0, label: '开始' },
      { id: 'End', type: 'rect' as const, x: 0, y: 80, label: '结束' },
    ]
    const links = [
      { id: 'l1', source: 'Start', target: 'End', type: 'solid' as const, arrow: 'forward' as const },
    ]
    const code = generateMermaidCode(nodes, links, 'TD')
    const parsed = parseMermaidCode(code, nodes, 'TD')
    expect(parsed).not.toBeNull()
    expect(parsed!.nodes.map(n => n.id).sort()).toEqual(['End', 'Start'])
    expect(parsed!.links).toHaveLength(1)
  })
})
