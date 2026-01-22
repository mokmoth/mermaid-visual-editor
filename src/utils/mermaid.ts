import type { GraphNode, GraphLink, FlowDirection } from '@/types'

/**
 * Wrap long text with line breaks
 */
function wrapText(text: string, maxChars = 12): string {
  if (!text || text.length <= maxChars) return text
  
  const words = text.split(/(\s+)/)
  const lines: string[] = []
  let currentLine = ''
  
  for (const word of words) {
    if ((currentLine + word).length <= maxChars) {
      currentLine += word
    } else {
      if (currentLine.trim()) lines.push(currentLine.trim())
      // Force split if single word exceeds maxChars
      if (word.trim().length > maxChars) {
        let remaining = word.trim()
        while (remaining.length > maxChars) {
          lines.push(remaining.substring(0, maxChars))
          remaining = remaining.substring(maxChars)
        }
        currentLine = remaining
      } else {
        currentLine = word
      }
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim())
  
  return lines.join('<br/>')
}

/**
 * Generate Mermaid code from graph state
 */
export function generateMermaidCode(
  nodes: GraphNode[], 
  links: GraphLink[], 
  direction: FlowDirection
): string {
  let code = `flowchart ${direction}\n    classDef default fill:#fff,stroke:#333,stroke-width:2px;\n`
  
  // Generate node definitions
  nodes.forEach(node => {
    let labelText = node.label
    if (!labelText || labelText.trim() === '') labelText = ' '
    
    // Clean and wrap long text
    const cleanLabel = labelText.replace(/"/g, "'")
    const wrappedLabel = wrapText(cleanLabel, 12)
    const needsQuotes = wrappedLabel.includes('<br/>')
    const finalLabel = needsQuotes ? `"${wrappedLabel}"` : wrappedLabel
    
    let shape = `[${finalLabel}]`
    switch (node.type) {
      case 'rect': shape = `[${finalLabel}]`; break
      case 'round': shape = `(${finalLabel})`; break
      case 'circle': shape = `((${finalLabel}))`; break
      case 'rhombus': shape = `{${finalLabel}}`; break
      case 'stadium': shape = `([${finalLabel}])`; break
      case 'subroutine': shape = `[[${finalLabel}]]`; break
      case 'database': shape = `[(${finalLabel})]`; break
      case 'hexagon': shape = `{{${finalLabel}}}`; break
      case 'parallelogram': shape = `[/${finalLabel}/]`; break
      default: shape = `[${finalLabel}]`
    }
    code += `    ${node.id}${shape}\n`
  })
  
  // Generate link definitions
  links.forEach(link => {
    const sourceExists = nodes.some(n => n.id === link.source)
    const targetExists = nodes.some(n => n.id === link.target)
    if (!sourceExists || !targetExists) return

    // Handle link label wrapping
    let label = ''
    if (link.label) {
      const wrappedLinkLabel = wrapText(link.label.replace(/"/g, "'"), 10)
      label = `|${wrappedLinkLabel}|`
    }
    
    let arrow = '-->'
    let src = link.source
    let tgt = link.target

    if (link.arrow === 'back') {
      [src, tgt] = [tgt, src]
      arrow = link.type === 'dotted' ? '-.->' : '-->'
    } else if (link.arrow === 'both') {
      arrow = link.type === 'dotted' ? '<-.->' : '<-->'
    } else if (link.arrow === 'none') {
      arrow = link.type === 'dotted' ? '-.-' : '---'
    } else {
      arrow = link.type === 'dotted' ? '-.->' : '-->'
    }

    code += `    ${src} ${arrow}${label} ${tgt}\n`
  })
  
  return code
}

/**
 * Parse Mermaid code to extract nodes and links
 */
export function parseMermaidCode(
  code: string,
  existingNodes: GraphNode[],
  currentDirection: FlowDirection
): { nodes: GraphNode[], links: GraphLink[], direction: FlowDirection } | null {
  const lines = code.split('\n')
  const nodeMap = new Map<string, { id: string; type: string; label: string }>()
  const linksArr: GraphLink[] = []
  let dir = currentDirection

  // Subgraph tracking
  const subgraphMap = new Map<string, string[]>()
  let currentSubgraph: string | null = null

  const dirMatch = code.match(/^\s*(?:graph|flowchart)\s+(TD|LR|BT|RL)/)
  if (dirMatch) {
    dir = dirMatch[1] === 'BT' ? 'TD' : (dirMatch[1] === 'RL' ? 'LR' : dirMatch[1]) as FlowDirection
  }

  const parseNode = (str: string): { id: string; type: string; label: string } | null => {
    str = str.trim()
    if (!str) return null

    // Strip Mermaid v10+ attribute syntax
    const attrIndex = str.indexOf('@{')
    if (attrIndex > -1) {
      str = str.substring(0, attrIndex).trim()
    }

    const patterns = [
      { type: 'stadium', re: /^([^\s()]+)\s*\(\[(.*?)\]\)$/ },
      { type: 'subroutine', re: /^([^\s[\]]+)\s*\[\[(.*?)\]\]$/ },
      { type: 'database', re: /^([^\s[\]]+)\s*\[\((.*?)\)\]$/ },
      { type: 'circle', re: /^([^\s()]+)\s*\(\((.*?)\)\)$/ },
      { type: 'hexagon', re: /^([^\s{}]+)\s*\{\{(.*?)\}\}$/ },
      { type: 'parallelogram', re: /^([^\s[\]/]+)\s*\[\/(.*?)\/\]$/ },
      { type: 'rhombus', re: /^([^\s{}]+)\s*\{(.*?)\}$/ },
      { type: 'round', re: /^([^\s()]+)\s*\((.*?)\)$/ },
      { type: 'rect', re: /^([^\s[\]]+)\s*\[(.*?)\]$/ },
    ]

    for (const p of patterns) {
      const m = str.match(p.re)
      if (m) {
        return { id: m[1], type: p.type, label: m[2] }
      }
    }

    // Support alphanumeric IDs with underscores
    const idMatch = str.match(/^([a-zA-Z_][a-zA-Z0-9_]*)$/)
    if (idMatch) {
      return { id: idMatch[1], type: 'rect', label: idMatch[1] }
    }
    
    return null
  }

  // Parse multiple nodes separated by &
  const parseMultipleNodes = (str: string) => {
    const parts: string[] = []
    let currentPart = ''
    let bracketDepth = 0

    for (let i = 0; i < str.length; i++) {
      const char = str[i]
      if ('([{'.includes(char)) bracketDepth++
      else if (')]}'.includes(char)) bracketDepth--

      if (char === '&' && bracketDepth === 0) {
        if (currentPart.trim()) parts.push(currentPart.trim())
        currentPart = ''
      } else {
        currentPart += char
      }
    }
    if (currentPart.trim()) parts.push(currentPart.trim())

    const nodes: { id: string; type: string; label: string }[] = []
    for (const part of parts) {
      const node = parseNode(part)
      if (node) nodes.push(node)
    }
    return nodes
  }

  lines.forEach(line => {
    line = line.trim()
    // Skip comments, directives, class statements, etc.
    if (!line || 
        line.startsWith('%') || 
        line.startsWith('classDef') || 
        line.startsWith('class ') || 
        line.startsWith('style') || 
        line.startsWith('linkStyle') || 
        line.startsWith('direction') || 
        line.startsWith('click')) {
      return
    }

    if (line.startsWith('subgraph')) {
      const m = line.match(/subgraph\s+([^\s[]+)/)
      if (m) currentSubgraph = m[1]
      return
    }
    if (line.startsWith('end')) {
      currentSubgraph = null
      return
    }
    if (line.startsWith('graph') || line.startsWith('flowchart')) return

    // Match arrows within the line
    let linkLabel = ''
    let leftPart = ''
    let rightPart = ''
    let arrowType: 'solid' | 'dotted' = 'solid'
    let hasBack = false
    let hasForward = false
    let isLink = false

    // Pattern 1: A -- label --> B
    const inlineLabelMatch = line.match(/^(.+?)\s+--\s+(.+?)\s+(-->|-.->)\s+(.+)$/)
    if (inlineLabelMatch) {
      leftPart = inlineLabelMatch[1].trim()
      linkLabel = inlineLabelMatch[2].trim()
      const arrowStr = inlineLabelMatch[3]
      rightPart = inlineLabelMatch[4].trim()
      arrowType = arrowStr.includes('.') ? 'dotted' : 'solid'
      hasForward = arrowStr.endsWith('>')
      isLink = true
    } else {
      // Pattern 2: Standard arrows with optional |label|
      const arrowMatch = line.match(/(<)?(-{2,}>|<--{2,}>|<-{2,}|-{1,}\.-{0,}>|<-{1,}\.-{0,}>|<-{1,}\.-{0,}-|={2,}>|<={2,}>|-{3,}|-{1,}\.-{0,}-|\.{3,}>) ?/)

      if (arrowMatch && arrowMatch[0].length >= 2) {
        const arrowStr = arrowMatch[0].trim()
        const arrowIndex = arrowMatch.index!
        leftPart = line.substring(0, arrowIndex).trim()
        rightPart = line.substring(arrowIndex + arrowMatch[0].length).trim()

        // Handle label in format: A -->|label| B
        if (rightPart.startsWith('|')) {
          const endPipe = rightPart.indexOf('|', 1)
          if (endPipe > -1) {
            linkLabel = rightPart.substring(1, endPipe)
            rightPart = rightPart.substring(endPipe + 1).trim()
          }
        }

        arrowType = (arrowStr.includes('.') || arrowStr.includes('-.')) ? 'dotted' : 'solid'
        hasBack = arrowStr.startsWith('<')
        hasForward = arrowStr.endsWith('>')
        isLink = true
      }
    }

    if (isLink) {
      const srcNodesRaw = parseMultipleNodes(leftPart)
      const tgtNodesRaw = parseMultipleNodes(rightPart)

      // Register nodes and track subgraphs
      ;[...srcNodesRaw, ...tgtNodesRaw].forEach(n => {
        if (!nodeMap.has(n.id)) {
          nodeMap.set(n.id, n)
        } else if (n.label !== n.id) {
          const ex = nodeMap.get(n.id)!
          ex.type = n.type
          ex.label = n.label
        }
        if (currentSubgraph) {
          if (!subgraphMap.has(currentSubgraph)) subgraphMap.set(currentSubgraph, [])
          const arr = subgraphMap.get(currentSubgraph)!
          if (!arr.includes(n.id)) arr.push(n.id)
        }
      })

      // Expand subgraphs
      const finalSrcIds: string[] = []
      const finalTgtIds: string[] = []

      srcNodesRaw.forEach(src => {
        if (subgraphMap.has(src.id)) {
          finalSrcIds.push(...subgraphMap.get(src.id)!)
        } else {
          finalSrcIds.push(src.id)
        }
      })
      tgtNodesRaw.forEach(tgt => {
        if (subgraphMap.has(tgt.id)) {
          finalTgtIds.push(...subgraphMap.get(tgt.id)!)
        } else {
          finalTgtIds.push(tgt.id)
        }
      })

      // Determine arrow type
      let arrow: 'forward' | 'back' | 'both' | 'none' = 'forward'
      if (hasBack && hasForward) arrow = 'both'
      else if (hasBack) arrow = 'back'
      else if (hasForward) arrow = 'forward'
      else arrow = 'none'

      // Create links
      for (const srcId of finalSrcIds) {
        for (const tgtId of finalTgtIds) {
          linksArr.push({
            id: `link_${srcId}_${tgtId}_${Date.now()}_${Math.random()}`,
            source: srcId,
            target: tgtId,
            label: linkLabel,
            type: arrowType,
            arrow
          })
        }
      }
    } else {
      // Not a link, check if it's a node definition
      const node = parseNode(line)
      if (node) {
        if (!nodeMap.has(node.id)) {
          nodeMap.set(node.id, node)
        } else if (node.label !== node.id) {
          const ex = nodeMap.get(node.id)!
          ex.type = node.type
          ex.label = node.label
        }
        if (currentSubgraph) {
          if (!subgraphMap.has(currentSubgraph)) subgraphMap.set(currentSubgraph, [])
          const arr = subgraphMap.get(currentSubgraph)!
          if (!arr.includes(node.id)) arr.push(node.id)
        }
      }
    }
  })

  // Convert to GraphNode array
  const rawNodes = Array.from(nodeMap.values()).map(n => ({
    id: n.id,
    type: n.type as GraphNode['type'],
    label: n.label,
    x: 0,
    y: 0
  }))

  if (rawNodes.length === 0) return null

  // Preserve existing positions where possible
  const finalNodes = rawNodes.map(n => {
    const existing = existingNodes.find(en => en.id === n.id)
    if (existing) {
      return { ...n, x: existing.x, y: existing.y }
    }
    return { ...n, x: 50 + Math.random() * 200, y: 50 + Math.random() * 200 }
  })

  return { nodes: finalNodes, links: linksArr, direction: dir }
}
