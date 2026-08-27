import type { ClassNode, ClassRelationship, ClassMember } from './types'
import type { DiagramDirection } from '@/core/types'

/**
 * Generate Mermaid code from class diagram state
 */
export function generateClassMermaidCode(
  classes: ClassNode[],
  relationships: ClassRelationship[],
  direction: DiagramDirection = 'TD'
): string {
  const lines: string[] = ['classDiagram']

  // Add direction if not default
  if (direction !== 'TD') {
    lines.push(`    direction ${direction}`)
  }

  // Generate class definitions
  classes.forEach(cls => {
    const safeName = (cls.name || cls.id).replace(/"/g, "'")
    const display = cls.name && cls.name !== cls.id ? `["${safeName}"]` : ''
    lines.push(`    class ${cls.id}${display} {`)

    if (cls.stereotype === 'interface') {
      lines.push(`        <<interface>>`)
    } else if (cls.stereotype === 'abstract') {
      lines.push(`        <<abstract>>`)
    } else if (cls.stereotype === 'enum') {
      lines.push(`        <<enumeration>>`)
    }

    // Attributes
    cls.attributes.forEach(attr => {
      const staticPrefix = attr.isStatic ? '$' : ''
      const abstractPrefix = attr.isAbstract ? '*' : ''
      lines.push(`        ${attr.visibility}${staticPrefix}${abstractPrefix}${attr.name} ${attr.type || ''}`.trimEnd())
    })

    // Methods
    cls.methods.forEach(method => {
      const staticPrefix = method.isStatic ? '$' : ''
      const abstractPrefix = method.isAbstract ? '*' : ''
      const params = method.parameters || '()'
      lines.push(`        ${method.visibility}${staticPrefix}${abstractPrefix}${method.name}${params} ${method.type || 'void'}`.trimEnd())
    })

    lines.push('    }')
  })

  // Generate relationships. Mermaid puts the hollow triangle / diamond on the LEFT
  // of `<|--` / `*--`, which is the parent / whole — stored here as `from`.
  relationships.forEach(rel => {
    let arrow = '--'
    switch (rel.type) {
      case 'inheritance':
        arrow = '<|--'
        break
      case 'realization':
        arrow = '<|..'
        break
      case 'composition':
        arrow = '*--'
        break
      case 'aggregation':
        arrow = 'o--'
        break
      case 'association':
        arrow = '--'
        break
      case 'dependency':
        arrow = '..>'
        break
    }

    const leftCard = rel.fromCardinality ? `"${rel.fromCardinality}" ` : ''
    const rightCard = rel.toCardinality ? ` "${rel.toCardinality}"` : ''
    let relLine = `    ${rel.from} ${leftCard}${arrow}${rightCard} ${rel.to}`
    if (rel.label) {
      relLine += ` : ${rel.label}`
    }
    lines.push(relLine)
  })

  return lines.join('\n')
}

/**
 * Parse Mermaid class diagram code
 */
export function parseClassMermaidCode(
  code: string,
  existingClasses: ClassNode[] = [],
  currentDirection: DiagramDirection = 'TD'
): { classes: ClassNode[]; relationships: ClassRelationship[]; direction: DiagramDirection } | null {
  try {
    const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'))

    // Check if it's a class diagram
    const headerLine = lines.find(l => l.startsWith('classDiagram'))
    if (!headerLine) return null

    let direction: DiagramDirection = currentDirection
    const classes: ClassNode[] = []
    const relationships: ClassRelationship[] = []
    const classMap = new Map<string, ClassNode>()

    let currentClass: ClassNode | null = null

    for (const line of lines) {
      // Skip header
      if (line.startsWith('classDiagram')) continue

      // Parse direction
      const dirMatch = line.match(/direction\s+(TD|LR|BT|RL)/i)
      if (dirMatch) {
        direction = dirMatch[1].toUpperCase() as DiagramDirection
        continue
      }

      // Parse class start, including class Foo["Display Name"] {
      const classStartMatch = line.match(/^class\s+(\w+)(?:\s*\["([^"]*)"\])?\s*\{?/)
      if (classStartMatch) {
        const [, id, displayName] = classStartMatch
        currentClass = {
          id,
          name: displayName || id,
          x: 100 + classes.length * 200,
          y: 100,
          stereotype: 'none',
          attributes: [],
          methods: []
        }
        classes.push(currentClass)
        classMap.set(id, currentClass)
        continue
      }

      // Parse class end
      if (line === '}' && currentClass) {
        currentClass = null
        continue
      }

      // Parse stereotype
      if (currentClass && line.match(/<<\s*(interface|abstract|enumeration)\s*>>/)) {
        const stereotypeMatch = line.match(/<<\s*(interface|abstract|enumeration)\s*>>/)
        if (stereotypeMatch) {
          currentClass.stereotype = stereotypeMatch[1] === 'enumeration' ? 'enum' :
                                   stereotypeMatch[1] as 'interface' | 'abstract'
        }
        continue
      }

      // Parse class members
      if (currentClass) {
        const member = parseClassMember(line)
        if (member) {
          if (member.parameters) currentClass.methods.push(member)
          else currentClass.attributes.push(member)
          continue
        }
      }

      const rel = parseClassRelationship(line)
      if (rel) {
        ensureClass(rel.from)
        ensureClass(rel.to)
        relationships.push({
          id: `r${relationships.length + 1}`,
          ...rel
        })
      }
    }

    function ensureClass(id: string) {
      if (classMap.has(id)) return
      const cls: ClassNode = {
        id,
        name: id,
        x: 100 + classes.length * 200,
        y: 100,
        stereotype: 'none',
        attributes: [],
        methods: []
      }
      classes.push(cls)
      classMap.set(id, cls)
    }

    // Apply existing positions if available
    classes.forEach(cls => {
      const existing = existingClasses.find(c => c.id === cls.id)
      if (existing) {
        cls.x = existing.x
        cls.y = existing.y
        if (existing.customWidth) cls.customWidth = existing.customWidth
        if (existing.customHeight) cls.customHeight = existing.customHeight
      }
    })

    return { classes, relationships, direction }
  } catch (err) {
    console.error('Failed to parse class diagram:', err)
    return null
  }
}

const TYPE_HINT = /^(String|string|int|Int|Integer|void|boolean|Boolean|bool|float|double|long|char|byte|short|number|any|INT|VARCHAR|TEXT|DATE|DECIMAL|FLOAT|TIMESTAMP)$/i

function looksLikeType(token: string): boolean {
  return TYPE_HINT.test(token) || /^[A-Z][A-Za-z0-9_]*$/.test(token)
}

function parseClassMember(line: string): ClassMember | null {
  const visMatch = line.match(/^([+\-#~])/)
  if (!visMatch) return null

  let body = line.slice(1)
  const isStatic = body.startsWith('$')
  if (isStatic) body = body.slice(1)
  const isAbstract = body.startsWith('*')
  if (isAbstract) body = body.slice(1)
  body = body.trim()
  if (!body) return null

  const member = (partial: Omit<ClassMember, 'id' | 'visibility' | 'isStatic' | 'isAbstract'>): ClassMember => ({
    id: `m_${Math.random().toString(36).slice(2, 9)}`,
    visibility: visMatch[1] as ClassMember['visibility'],
    isStatic,
    isAbstract,
    ...partial
  })

  const methodMatch = body.match(/^(\w+)(\([^)]*\))\s*(.*)$/)
  if (methodMatch) {
    return member({
      name: methodMatch[1],
      parameters: methodMatch[2],
      type: methodMatch[3].trim() || 'void'
    })
  }

  const colonMatch = body.match(/^(\w+)\s*:\s*(.+)$/)
  if (colonMatch) {
    return member({ name: colonMatch[1], type: colonMatch[2].trim() })
  }

  const two = body.match(/^(\S+)\s+(\S+)$/)
  if (two) {
    const a = two[1]
    const b = two[2]
    if (looksLikeType(a) && !looksLikeType(b)) {
      return member({ name: b, type: a })
    }
    return member({ name: a, type: b })
  }

  const one = body.match(/^(\w+)$/)
  if (one) return member({ name: one[1] })
  return null
}

const CLASS_ARROWS: Array<{ token: string; type: ClassRelationship['type']; swap?: boolean }> = [
  { token: '<|--', type: 'inheritance' },
  { token: '--|>', type: 'inheritance', swap: true },
  { token: '<|..', type: 'realization' },
  { token: '..|>', type: 'realization', swap: true },
  { token: '*--', type: 'composition' },
  { token: '--*', type: 'composition', swap: true },
  { token: 'o--', type: 'aggregation' },
  { token: '--o', type: 'aggregation', swap: true },
  { token: '..>', type: 'dependency' },
  { token: '<..', type: 'dependency', swap: true },
  { token: '-->', type: 'association' },
  { token: '<--', type: 'association', swap: true },
  { token: '--', type: 'association' },
  { token: '..', type: 'dependency' },
]

function parseClassRelationship(line: string): Omit<ClassRelationship, 'id'> | null {
  for (const spec of CLASS_ARROWS) {
    const idx = line.indexOf(spec.token)
    if (idx <= 0) continue
    const leftRaw = line.slice(0, idx).trim()
    const rightRaw = line.slice(idx + spec.token.length).trim()
    const leftMatch = leftRaw.match(/^(\w+)(?:\s+"([^"]*)")?$/)
    const rightMatch = rightRaw.match(/^(?:"([^"]*)"\s+)?(\w+)(?:\s*:\s*(.+))?$/)
    if (!leftMatch || !rightMatch) continue
    const fromId = spec.swap ? rightMatch[2] : leftMatch[1]
    const toId = spec.swap ? leftMatch[1] : rightMatch[2]
    const fromCardinality = spec.swap ? rightMatch[1] : leftMatch[2]
    const toCardinality = spec.swap ? leftMatch[2] : rightMatch[1]
    return {
      from: fromId,
      to: toId,
      type: spec.type,
      fromCardinality,
      toCardinality,
      label: rightMatch[3]?.trim()
    }
  }
  return null
}
