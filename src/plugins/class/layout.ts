import dagre from 'dagre'
import type { ClassNode, ClassRelationship } from './types'
import type { DiagramDirection } from '@/core/types'

/**
 * Apply auto layout to class diagram using dagre
 */
export function applyClassAutoLayout(
  classes: ClassNode[],
  relationships: ClassRelationship[],
  direction: DiagramDirection = 'TD'
): ClassNode[] {
  if (classes.length === 0) return classes

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
  classes.forEach(cls => {
    const size = getClassSize(cls)
    g.setNode(cls.id, { width: size.width, height: size.height })
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
  return classes.map(cls => {
    const nodeWithPos = g.node(cls.id)
    if (nodeWithPos) {
      const size = getClassSize(cls)
      return {
        ...cls,
        x: nodeWithPos.x - size.width / 2,
        y: nodeWithPos.y - size.height / 2
      }
    }
    return cls
  })
}

function getClassSize(cls: ClassNode): { width: number; height: number } {
  const nameWidth = Math.max(120, cls.name.length * 10 + 40)
  const memberWidth = Math.max(
    ...cls.attributes.map(a => (a.name.length + (a.type?.length || 0)) * 8),
    ...cls.methods.map(m => (m.name.length + (m.parameters?.length || 0) + (m.type?.length || 0)) * 8),
    0
  ) + 30

  const width = cls.customWidth || Math.max(nameWidth, memberWidth, 150)

  const headerHeight = 30
  const stereotypeHeight = cls.stereotype !== 'none' ? 20 : 0
  const attributesHeight = Math.max(cls.attributes.length * 20, 20)
  const methodsHeight = Math.max(cls.methods.length * 20, 20)

  const height = cls.customHeight || (headerHeight + stereotypeHeight + attributesHeight + methodsHeight + 20)

  return { width, height }
}
