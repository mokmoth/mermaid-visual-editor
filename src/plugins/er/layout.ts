import dagre from 'dagre'
import type { Entity, ERRelationship } from './types'
import type { DiagramDirection } from '@/core/types'

/**
 * Apply auto layout to ER diagram using dagre
 */
export function applyERAutoLayout(
  entities: Entity[],
  relationships: ERRelationship[],
  direction: DiagramDirection = 'TD'
): Entity[] {
  if (entities.length === 0) return entities

  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: direction === 'LR' || direction === 'RL' ? 'LR' : 'TB',
    nodesep: 80,
    ranksep: 100,
    marginx: 20,
    marginy: 20
  })
  g.setDefaultEdgeLabel(() => ({}))

  // Add nodes
  entities.forEach(entity => {
    const size = getEntitySize(entity)
    g.setNode(entity.id, { width: size.width, height: size.height })
  })

  // Add edges
  relationships.forEach(rel => {
    if (g.hasNode(rel.from) && g.hasNode(rel.to)) {
      g.setEdge(rel.from, rel.to)
    }
  })

  // Run layout
  dagre.layout(g)

  // Apply new positions
  return entities.map(entity => {
    const nodeWithPos = g.node(entity.id)
    if (nodeWithPos) {
      const size = getEntitySize(entity)
      return {
        ...entity,
        x: nodeWithPos.x - size.width / 2,
        y: nodeWithPos.y - size.height / 2
      }
    }
    return entity
  })
}

function getEntitySize(entity: Entity): { width: number; height: number } {
  const nameWidth = Math.max(120, entity.name.length * 10 + 40)
  const attrWidth = Math.max(
    ...entity.attributes.map(a => (a.name.length + a.type.length) * 8),
    0
  ) + 50

  const width = entity.customWidth || Math.max(nameWidth, attrWidth, 150)

  const headerHeight = 30
  const attributesHeight = Math.max(entity.attributes.length * 22, 40)

  const height = entity.customHeight || (headerHeight + attributesHeight + 10)

  return { width, height }
}
