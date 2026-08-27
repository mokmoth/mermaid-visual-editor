import { describe, expect, it } from 'vitest'
import { cardinalityToMermaid, generateERMermaidCode, mermaidCardToInternal, parseERMermaidCode } from './mermaid'

describe('ER cardinality mermaid tokens', () => {
  it('flips many/optional on the to-side', () => {
    expect(cardinalityToMermaid('||', 'from')).toBe('||')
    expect(cardinalityToMermaid('}|', 'from')).toBe('}|')
    expect(cardinalityToMermaid('}|', 'to')).toBe('|{')
    expect(cardinalityToMermaid('}o', 'to')).toBe('o{')
    expect(cardinalityToMermaid('|o', 'to')).toBe('o|')
  })

  it('round-trips official mermaid tokens', () => {
    expect(mermaidCardToInternal('|{')).toBe('}|')
    expect(mermaidCardToInternal('o{')).toBe('}o')
    expect(mermaidCardToInternal('o|')).toBe('|o')
    expect(mermaidCardToInternal('}|')).toBe('}|')
  })
})

describe('generateERMermaidCode', () => {
  it('emits ||--|{ not the invalid ||--}|', () => {
    const code = generateERMermaidCode(
      [
        { id: 'CUSTOMER', name: 'CUSTOMER', x: 0, y: 0, attributes: [] },
        { id: 'ORDER', name: 'ORDER', x: 0, y: 0, attributes: [] }
      ],
      [{ id: 'r1', from: 'CUSTOMER', to: 'ORDER', fromCardinality: '||', toCardinality: '}|' }]
    )
    expect(code).toContain('CUSTOMER ||--|{ ORDER')
    expect(code).not.toContain('||--}|')
  })
})

describe('parseERMermaidCode', () => {
  it('parses official crow-foot syntax', () => {
    const result = parseERMermaidCode(`erDiagram
    CUSTOMER {
        INT id PK
        VARCHAR name
    }
    ORDER {
        INT id PK
    }
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
`)
    expect(result).not.toBeNull()
    expect(result!.relationships).toHaveLength(2)
    expect(result!.relationships[0]).toMatchObject({
      from: 'CUSTOMER',
      to: 'ORDER',
      fromCardinality: '||',
      toCardinality: '}o',
      label: 'places'
    })
    expect(result!.relationships[1]).toMatchObject({
      from: 'ORDER',
      to: 'LINE_ITEM',
      toCardinality: '}|'
    })
  })
})
