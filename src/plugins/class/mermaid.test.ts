import { describe, expect, it } from 'vitest'
import { generateClassMermaidCode, parseClassMermaidCode } from './mermaid'

describe('parseClassMermaidCode relationships', () => {
  it('parses Parent <|-- Child as inheritance with triangle on the parent', () => {
    const result = parseClassMermaidCode(`classDiagram
    class Animal
    class Dog
    Animal <|-- Dog
`)
    expect(result).not.toBeNull()
    expect(result!.relationships).toHaveLength(1)
    expect(result!.relationships[0]).toMatchObject({
      from: 'Animal',
      to: 'Dog',
      type: 'inheritance'
    })
  })

  it('parses Child --|> Parent by swapping to parent-from', () => {
    const result = parseClassMermaidCode(`classDiagram
    Dog --|> Animal
`)
    expect(result!.relationships[0]).toMatchObject({
      from: 'Animal',
      to: 'Dog',
      type: 'inheritance'
    })
  })

  it('parses mermaid-style +String name as type then name', () => {
    const result = parseClassMermaidCode(`classDiagram
    class Animal {
        +String name
        +eat() void
    }
`)
    const animal = result!.classes.find(c => c.id === 'Animal')
    expect(animal?.attributes[0]).toMatchObject({ name: 'name', type: 'String', visibility: '+' })
    expect(animal?.methods[0]).toMatchObject({ name: 'eat', type: 'void' })
  })

  it('parses generator-style -attribute string', () => {
    const result = parseClassMermaidCode(`classDiagram
    class Class1 {
        -attribute string
        +method() void
    }
`)
    const cls = result!.classes[0]
    expect(cls.attributes[0]).toMatchObject({ name: 'attribute', type: 'string' })
  })
})

describe('generateClassMermaidCode', () => {
  it('emits Parent <|-- Child', () => {
    const code = generateClassMermaidCode(
      [
        { id: 'Animal', name: 'Animal', x: 0, y: 0, stereotype: 'none', attributes: [], methods: [] },
        { id: 'Dog', name: 'Dog', x: 0, y: 0, stereotype: 'none', attributes: [], methods: [] }
      ],
      [{ id: 'r1', from: 'Animal', to: 'Dog', type: 'inheritance' }]
    )
    expect(code).toContain('Animal <|-- Dog')
    expect(code).not.toContain('--|>')
  })
})
