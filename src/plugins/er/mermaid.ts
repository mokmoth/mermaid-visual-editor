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
    const fromCard = cardinalityToMermaid(rel.fromCardinality)
    const toCard = cardinalityToMermaid(rel.toCardinality)
    let relLine = `    ${rel.from} ${fromCard}--${toCard} ${rel.to}`
    if (rel.label) {
      relLine += ` : "${rel.label}"`
    }
    lines.push(relLine)
  })

  return lines.join('\n')
}

function cardinalityToMermaid(card: Cardinality): string {
  switch (card) {
    case '||': return '||'
    case '|o': return '|o'
    case '}|': return '}|'
    case '}o': return '}o'
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

      // Parse relationship
      const relMatch = line.match(/^(\w+)\s*(\|\||}\||}\o|\|o)--(\|\||}\||}\o|\|o)\s*(\w+)(?:\s*:\s*"([^"]*)")?/)
      if (relMatch) {
        const [, from, fromCard, toCard, to, label] = relMatch

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
          fromCardinality: fromCard as Cardinality,
          toCardinality: toCard as Cardinality,
          label: label || undefined
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
