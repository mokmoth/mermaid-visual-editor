import type { Entity, ERRelationship, Cardinality } from './types'
import type { DiagramDirection } from '@/core/types'

/**
 * Generate Mermaid code from ER diagram state
 */
export function generateERMermaidCode(
  entities: Entity[],
  relationships: ERRelationship[],
  _direction: DiagramDirection = 'TD'
): string {
  const lines: string[] = ['erDiagram']

  // Generate entity definitions
  entities.forEach(entity => {
    lines.push(`    ${entity.name} {`)
    entity.attributes.forEach(attr => {
      let attrLine = `        ${attr.type} ${attr.name}`
      if (attr.isPK) attrLine += ' PK'
      if (attr.isFK) attrLine += ' FK'
      if (attr.isUnique) attrLine += ' UK'
      lines.push(attrLine)
    })
    lines.push('    }')
  })

  // Generate relationships
  relationships.forEach(rel => {
    const fromCard = cardinalityToMermaid(rel.fromCardinality, 'from')
    const toCard = cardinalityToMermaid(rel.toCardinality, 'to')
    const connector = rel.identifying === false ? '..' : '--'
    let relLine = `    ${rel.from} ${fromCard}${connector}${toCard} ${rel.to}`
    if (rel.label) {
      relLine += ` : "${rel.label}"`
    }
    lines.push(relLine)
  })

  return lines.join('\n')
}

/** Crow's-foot tokens flip depending on which side of `--` they sit. */
export function cardinalityToMermaid(card: Cardinality, side: 'from' | 'to'): string {
  if (side === 'from') {
    switch (card) {
      case '||': return '||'
      case '|o': return '|o'
      case '}|': return '}|'
      case '}o': return '}o'
      default: return '||'
    }
  }
  switch (card) {
    case '||': return '||'
    case '|o': return 'o|'
    case '}|': return '|{'
    case '}o': return 'o{'
    default: return '||'
  }
}

export function mermaidCardToInternal(token: string): Cardinality {
  switch (token) {
    case '||': return '||'
    case '|o':
    case 'o|': return '|o'
    case '}|':
    case '|{': return '}|'
    case '}o':
    case 'o{': return '}o'
    default: return '||'
  }
}

/**
 * Parse Mermaid ER diagram code
 */
export function parseERMermaidCode(
  code: string,
  existingEntities: Entity[] = [],
  _currentDirection: DiagramDirection = 'TD'
): { entities: Entity[]; relationships: ERRelationship[]; direction: DiagramDirection } | null {
  try {
    const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'))

    // Check if it's an ER diagram
    const headerLine = lines.find(l => l.startsWith('erDiagram'))
    if (!headerLine) return null

    const entities: Entity[] = []
    const relationships: ERRelationship[] = []
    const entityMap = new Map<string, Entity>()

    let currentEntity: Entity | null = null

    for (const line of lines) {
      // Skip header
      if (line.startsWith('erDiagram')) continue

      // Parse entity start
      const entityStartMatch = line.match(/^(\w+)\s*\{$/)
      if (entityStartMatch) {
        const [, name] = entityStartMatch
        currentEntity = {
          id: name,
          name,
          x: 100 + entities.length * 250,
          y: 100,
          attributes: []
        }
        entities.push(currentEntity)
        entityMap.set(name, currentEntity)
        continue
      }

      // Parse entity end
      if (line === '}' && currentEntity) {
        currentEntity = null
        continue
      }

      // Parse attribute
      if (currentEntity) {
        const attrMatch = line.match(/^(\w+)\s+(\w+)(?:\s+(PK|FK|UK))?(?:\s+(PK|FK|UK))?/)
        if (attrMatch) {
          const [, type, name, flag1, flag2] = attrMatch
          const flags = [flag1, flag2].filter(Boolean)
          currentEntity.attributes.push({
            id: `a${currentEntity.attributes.length + 1}`,
            name,
            type: type as any,
            isPK: flags.includes('PK'),
            isFK: flags.includes('FK'),
            isUnique: flags.includes('UK')
          })
          continue
        }
      }

      // Parse relationship. Tokens differ on each side of -- / ..
      const relMatch = line.match(/^(\w+)\s*(\|\||\|o|o\||}\||\|\{|}o|o\{)\s*(--|\.\.)\s*(\|\||\|o|o\||}\||\|\{|}o|o\{)\s*(\w+)(?:\s*:\s*"?([^"]*)"?\s*)?$/)
      if (relMatch) {
        const [, from, fromCard, connector, toCard, to, label] = relMatch

        // Ensure entities exist
        if (!entityMap.has(from)) {
          const entity: Entity = {
            id: from,
            name: from,
            x: 100 + entities.length * 250,
            y: 100,
            attributes: []
          }
          entities.push(entity)
          entityMap.set(from, entity)
        }
        if (!entityMap.has(to)) {
          const entity: Entity = {
            id: to,
            name: to,
            x: 100 + entities.length * 250,
            y: 100,
            attributes: []
          }
          entities.push(entity)
          entityMap.set(to, entity)
        }

        relationships.push({
          id: `r${relationships.length + 1}`,
          from,
          to,
          fromCardinality: mermaidCardToInternal(fromCard),
          toCardinality: mermaidCardToInternal(toCard),
          label: label || undefined,
          identifying: connector !== '..'
        })
      }
    }

    // Apply existing positions if available
    entities.forEach(entity => {
      const existing = existingEntities.find(e => e.id === entity.id)
      if (existing) {
        entity.x = existing.x
        entity.y = existing.y
        if (existing.customWidth) entity.customWidth = existing.customWidth
        if (existing.customHeight) entity.customHeight = existing.customHeight
      }
    })

    return { entities, relationships, direction: 'TD' }
  } catch (err) {
    console.error('Failed to parse ER diagram:', err)
    return null
  }
}
