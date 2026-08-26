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
    // Stereotype annotation
    if (cls.stereotype === 'interface') {
      lines.push(`    class ${cls.id} {`)
      lines.push(`        <<interface>>`)
    } else if (cls.stereotype === 'abstract') {
      lines.push(`    class ${cls.id} {`)
      lines.push(`        <<abstract>>`)
    } else if (cls.stereotype === 'enum') {
      lines.push(`    class ${cls.id} {`)
      lines.push(`        <<enumeration>>`)
    } else {
      lines.push(`    class ${cls.id} {`)
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

    // Class name if different from ID
    if (cls.name !== cls.id) {
      lines.push(`    ${cls.id} : ${cls.name}`)
    }
  })

  // Generate relationships
  relationships.forEach(rel => {
    let arrow = ''
    switch (rel.type) {
      case 'inheritance':
        arrow = '--|>'
        break
      case 'realization':
        arrow = '..|>'
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

    let relLine = `    ${rel.from} ${arrow} ${rel.to}`
    if (rel.label) {
      relLine += ` : ${rel.label}`
    }
    if (rel.fromCardinality || rel.toCardinality) {
      relLine += ` : "${rel.fromCardinality || ''}" -- "${rel.toCardinality || ''}"`
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

      // Parse class start
      const classStartMatch = line.match(/^class\s+(\w+)\s*\{?/)
      if (classStartMatch) {
        const [, id] = classStartMatch
        currentClass = {
          id,
          name: id,
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
        const memberMatch = line.match(/^([+\-#~])(\$)?(\*)?(\w+)(\([^)]*\))?\s*(.*)$/)
        if (memberMatch) {
          const [, visibility, isStatic, isAbstract, name, params, type] = memberMatch
          const member: ClassMember = {
            id: `m${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            visibility: visibility as '+' | '-' | '#' | '~',
            name,
            type: type?.trim() || undefined,
            isStatic: !!isStatic,
            isAbstract: !!isAbstract,
          }

          if (params) {
            member.parameters = params
            currentClass.methods.push(member)
          } else {
            currentClass.attributes.push(member)
          }
          continue
        }
      }

      // Parse relationships
      const relMatch = line.match(/^(\w+)\s*(--|\.\.|\*--|o--|--|\.\.>)\s*(\w+)(?:\s*:\s*(.+))?$/)
      if (relMatch) {
        const [, from, arrow, to, label] = relMatch
        let type: ClassRelationship['type'] = 'association'

        if (arrow.includes('|>')) {
          type = arrow.includes('..') ? 'realization' : 'inheritance'
        } else if (arrow.startsWith('*')) {
          type = 'composition'
        } else if (arrow.startsWith('o')) {
          type = 'aggregation'
        } else if (arrow.includes('..')) {
          type = 'dependency'
        }

        // Ensure classes exist
        if (!classMap.has(from)) {
          const cls: ClassNode = {
            id: from,
            name: from,
            x: 100 + classes.length * 200,
            y: 100,
            stereotype: 'none',
            attributes: [],
            methods: []
          }
          classes.push(cls)
          classMap.set(from, cls)
        }
        if (!classMap.has(to)) {
          const cls: ClassNode = {
            id: to,
            name: to,
            x: 100 + classes.length * 200,
            y: 100,
            stereotype: 'none',
            attributes: [],
            methods: []
          }
          classes.push(cls)
          classMap.set(to, cls)
        }

        relationships.push({
          id: `r${relationships.length + 1}`,
          from,
          to,
          type,
          label: label?.trim()
        })
      }
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
