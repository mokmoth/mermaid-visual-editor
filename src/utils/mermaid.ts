import mermaid from 'mermaid'
import type { GraphNode, GraphLink, FlowDirection, Swimlane } from '@/types'

let mermaidRenderSeq = 0

/**
 * Render Mermaid source to an SVG string.
 * Uses mermaidAPI.render to bypass the public render() serial queue, which
 * can deadlock with mermaid.run() when startOnLoad is true.
 */
export async function renderMermaidSvg(code: string): Promise<string> {
  const sanitized = sanitizeMermaidCode(code)
  const id = `mmd-svg-${++mermaidRenderSeq}-${Math.random().toString(36).slice(2, 8)}`
  const api = mermaid.mermaidAPI ?? mermaid
  const result = await api.render(id, sanitized)
  return result.svg
}

export function applySvgToPreview(container: HTMLElement, svg: string): void {
  container.innerHTML = svg
  const svgEl = container.querySelector('svg')
  if (!svgEl) return
  svgEl.removeAttribute('width')
  svgEl.removeAttribute('height')
  svgEl.style.width = 'auto'
  svgEl.style.height = 'auto'
  svgEl.style.maxWidth = '100%'
  svgEl.style.maxHeight = '100%'
}

/**
 * Sanitize Mermaid code to fix common syntax issues before rendering
 * This helps handle code from external sources (like AI-generated code)
 */
export function sanitizeMermaidCode(code: string): string {
  const lines = code.split('\n')
  const result: string[] = []
  
  for (const line of lines) {
    let processed = line
    
    // Match node definitions with square brackets: ID[label] or ID["label"]
    // Also handles nested brackets for subroutine [[]], database [()], stadium ([])
    processed = processed.replace(
      /([A-Za-z_][A-Za-z0-9_]*)\s*(\[\[|\[\(|\(\[|\[)([^\]]*?)(\]\]|\)\]|\]\)|\])/g,
      (match, id, openBracket, label, closeBracket) => {
        return fixLabel(match, id, openBracket, label, closeBracket)
      }
    )
    
    // Match node definitions with parentheses: ID(label), ID((label)), ID(((label)))
    processed = processed.replace(
      /([A-Za-z_][A-Za-z0-9_]*)\s*(\(\(\(|\(\(|\()([^)]*?)(\)\)\)|\)\)|\))/g,
      (match, id, openBracket, label, closeBracket) => {
        return fixLabel(match, id, openBracket, label, closeBracket)
      }
    )
    
    // Match node definitions with curly braces: ID{label}, ID{{label}}
    processed = processed.replace(
      /([A-Za-z_][A-Za-z0-9_]*)\s*(\{\{|\{)([^}]*?)(\}\}|\})/g,
      (match, id, openBracket, label, closeBracket) => {
        return fixLabel(match, id, openBracket, label, closeBracket)
      }
    )
    
    result.push(processed)
  }
  
  return result.join('\n')
}

/**
 * Fix label syntax issues: when label contains <br/>, internal quotes must be escaped
 */
function fixLabel(
  match: string,
  id: string,
  openBracket: string,
  label: string,
  closeBracket: string
): string {
  // Check if label contains <br/> (which requires quoting)
  const hasBr = /<br\s*\/?>/i.test(label)
  
  if (!hasBr) {
    return match // No fix needed
  }
  
  // Check if already quoted
  const isQuoted = label.startsWith('"') && label.endsWith('"')
  
  if (isQuoted) {
    // Extract inner content and fix any internal quotes
    const inner = label.slice(1, -1)
    if (inner.includes('"')) {
      const fixed = inner.replace(/"/g, "'")
      return `${id}${openBracket}"${fixed}"${closeBracket}`
    }
    return match // Already properly quoted
  }
  
  // Not quoted but has <br/> - need to quote it
  // First, replace any internal quotes with single quotes
  const fixed = label.replace(/"/g, "'")
  return `${id}${openBracket}"${fixed}"${closeBracket}`
}

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
  direction: FlowDirection,
  swimlanes: Swimlane[] = []
): string {
  let code = `flowchart ${direction}\n`

  // Helper to generate node shape
  const generateNodeShape = (node: GraphNode): string => {
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
      case 'flag': shape = `>${finalLabel}]`; break
      case 'trapezoid': shape = `[/${wrappedLabel}\\]`; break
      case 'trapezoid_alt': shape = `[\\${wrappedLabel}/]`; break
      case 'double_circle': shape = `(((${wrappedLabel})))`; break
      case 'parallelogram_alt': shape = `[\\${wrappedLabel}\\]`; break
      default: shape = `[${finalLabel}]`
    }
    return `${node.id}${shape}`
  }

  // Group nodes by swimlane and lane
  const nodesInLanes = new Map<string, GraphNode[]>() // key: "swimlaneId:laneId"
  const nodesInSwimlanes = new Map<string, GraphNode[]>() // nodes in swimlane but not in specific lane
  const nodesWithoutSwimlane: GraphNode[] = []

  nodes.forEach(node => {
    if (node.swimlaneId && swimlanes.some(s => s.id === node.swimlaneId)) {
      if (node.laneId) {
        const key = `${node.swimlaneId}:${node.laneId}`
        if (!nodesInLanes.has(key)) {
          nodesInLanes.set(key, [])
        }
        nodesInLanes.get(key)!.push(node)
      } else {
        if (!nodesInSwimlanes.has(node.swimlaneId)) {
          nodesInSwimlanes.set(node.swimlaneId, [])
        }
        nodesInSwimlanes.get(node.swimlaneId)!.push(node)
      }
    } else {
      nodesWithoutSwimlane.push(node)
    }
  })

  // Generate swimlanes with nested lane subgraphs
  swimlanes.forEach(swimlane => {
    code += `    subgraph ${swimlane.id}["${swimlane.name}"]\n`
    // Set direction based on swimlane orientation
    // horizontal orientation = lanes stacked vertically (column) = TB direction
    // vertical orientation = lanes arranged horizontally (row) = LR direction
    const swimlaneDirection = swimlane.orientation === 'horizontal' ? 'TB' : 'LR'
    code += `        direction ${swimlaneDirection}\n`

    // Generate lane subgraphs
    swimlane.lanes?.forEach(lane => {
      const laneKey = `${swimlane.id}:${lane.id}`
      const laneNodes = nodesInLanes.get(laneKey) || []
      code += `        subgraph ${lane.id}["${lane.name}"]\n`
      laneNodes.forEach(node => {
        code += `            ${generateNodeShape(node)}\n`
      })
      code += `        end\n`
    })

    // Nodes in swimlane but not in specific lane
    const swimlaneOnlyNodes = nodesInSwimlanes.get(swimlane.id) || []
    swimlaneOnlyNodes.forEach(node => {
      code += `        ${generateNodeShape(node)}\n`
    })

    code += `    end\n`
  })

  // Generate nodes outside swimlanes
  nodesWithoutSwimlane.forEach(node => {
    code += `    ${generateNodeShape(node)}\n`
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

    // Determine the base arrow syntax based on link type and arrow type
    const isThick = link.type === 'thick'
    const isDotted = link.type === 'dotted'

    if (link.arrow === 'back') {
      [src, tgt] = [tgt, src]
      if (isThick) arrow = '==>'
      else if (isDotted) arrow = '-.->'
      else arrow = '-->'
    } else if (link.arrow === 'both') {
      if (isThick) arrow = '<==>'
      else if (isDotted) arrow = '<-.->'
      else arrow = '<-->'
    } else if (link.arrow === 'none') {
      if (isThick) arrow = '==='
      else if (isDotted) arrow = '-.-'
      else arrow = '---'
    } else if (link.arrow === 'circle') {
      arrow = isDotted ? '-.-o' : '--o'
    } else if (link.arrow === 'circle_start') {
      arrow = isDotted ? 'o-.-' : 'o---'
    } else if (link.arrow === 'circle_both') {
      arrow = isDotted ? 'o-.-o' : 'o--o'
    } else if (link.arrow === 'cross') {
      arrow = isDotted ? '-.-x' : '--x'
    } else if (link.arrow === 'cross_start') {
      arrow = isDotted ? 'x-.-' : 'x---'
    } else if (link.arrow === 'cross_both') {
      arrow = isDotted ? 'x-.-x' : 'x--x'
    } else {
      // forward arrow (default)
      if (isThick) arrow = '==>'
      else if (isDotted) arrow = '-.->'
      else arrow = '-->'
    }

    code += `    ${src} ${arrow}${label} ${tgt}\n`
  })

  // Add swimlane styles for better visual appearance
  if (swimlanes.length > 0) {
    code += `\n`
    // Style for swimlane containers - match editor style
    swimlanes.forEach(swimlane => {
      const bgColor = swimlane.color || '#f0f9ff'
      code += `    style ${swimlane.id} fill:${bgColor},stroke:#94a3b8,stroke-width:2px,rx:8,ry:8\n`
      // Style for lanes - slightly different shade
      swimlane.lanes?.forEach(lane => {
        code += `    style ${lane.id} fill:#ffffff,stroke:#94a3b8,stroke-width:1px,stroke-dasharray:5 5\n`
      })
    })
  }

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

  const dirMatch = code.match(/^\s*(?:graph|flowchart)\s+(TD|TB|LR|BT|RL)/i)
  if (dirMatch) {
    const parsedDir = dirMatch[1].toUpperCase()
    // TB is an alias for TD
    if (parsedDir === 'TB') {
      dir = 'TD'
    } else if (['TD', 'LR', 'BT', 'RL'].includes(parsedDir)) {
      dir = parsedDir as FlowDirection
    }
  }

  const parseNode = (str: string): { id: string; type: string; label: string } | null => {
    str = str.trim()
    if (!str) return null

    // Strip Mermaid v10+ attribute syntax
    const attrIndex = str.indexOf('@{')
    if (attrIndex > -1) {
      str = str.substring(0, attrIndex).trim()
    }

    // Helper to clean label: remove surrounding quotes and normalize whitespace
    const cleanLabel = (label: string): string => {
      let cleaned = label.trim()
      // Remove surrounding double quotes (Mermaid uses quotes for special chars)
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1)
      }
      // Remove surrounding single quotes
      if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
        cleaned = cleaned.slice(1, -1)
      }
      return cleaned
    }

    // Use greedy matching for labels to handle nested quotes and special chars
    // The patterns match from the last occurrence of closing brackets
    const patterns = [
      { type: 'double_circle', re: /^([^\s()]+)\s*\(\(\(([\s\S]*)\)\)\)$/ },
      { type: 'stadium', re: /^([^\s()]+)\s*\(\[([\s\S]*)\]\)$/ },
      { type: 'subroutine', re: /^([^\s[\]]+)\s*\[\[([\s\S]*)\]\]$/ },
      { type: 'database', re: /^([^\s[\]]+)\s*\[\(([\s\S]*)\)\]$/ },
      { type: 'circle', re: /^([^\s()]+)\s*\(\(([\s\S]*)\)\)$/ },
      { type: 'hexagon', re: /^([^\s{}]+)\s*\{\{([\s\S]*)\}\}$/ },
      { type: 'trapezoid', re: /^([^\s[\]/\\]+)\s*\[\/([\s\S]*)\\]$/ },
      { type: 'trapezoid_alt', re: /^([^\s[\]/\\]+)\s*\[\\([\s\S]*)\/]$/ },
      { type: 'parallelogram', re: /^([^\s[\]/]+)\s*\[\/([\s\S]*)\/]$/ },
      { type: 'parallelogram_alt', re: /^([^\s[\]\\]+)\s*\[\\([\s\S]*)\\]$/ },
      { type: 'flag', re: /^([^\s>]+)\s*>([\s\S]*)]$/ },
      { type: 'rhombus', re: /^([^\s{}]+)\s*\{([\s\S]*)\}$/ },
      { type: 'round', re: /^([^\s()]+)\s*\(([\s\S]*)\)$/ },
      { type: 'rect', re: /^([^\s[\]]+)\s*\[([\s\S]*)\]$/ },
    ]

    for (const p of patterns) {
      const m = str.match(p.re)
      if (m) {
        return { id: m[1], type: p.type, label: cleanLabel(m[2]) }
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
    let linkType: 'solid' | 'dotted' | 'thick' = 'solid'
    let arrowEndType: 'arrow' | 'circle' | 'cross' | 'none' = 'arrow'
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
      linkType = arrowStr.includes('.') ? 'dotted' : 'solid'
      hasForward = arrowStr.endsWith('>')
      isLink = true
    } else {
      // Pattern 2: Standard arrows with optional |label|
      // Extended regex to match circle (o) and cross (x) endpoints
      const arrowMatch = line.match(/(o|x)?(<)?(-{2,}>?|<--{2,}>?|<-{2,}|-{1,}\.-{0,}>?|<-{1,}\.-{0,}>?|<-{1,}\.-{0,}-|={2,}>?|<={2,}>?|-{3,}|-{1,}\.-{0,}-|\.{3,}>?)(o|x)? ?/)

      if (arrowMatch && arrowMatch[0].length >= 2) {
        const fullMatch = arrowMatch[0].trim()
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

        // Determine link type
        if (fullMatch.includes('=')) {
          linkType = 'thick'
        } else if (fullMatch.includes('.') || fullMatch.includes('-.')) {
          linkType = 'dotted'
        } else {
          linkType = 'solid'
        }

        // Check for circle or cross endpoints
        const startChar = arrowMatch[1] // o or x at start
        const endChar = arrowMatch[4] // o or x at end

        if (startChar === 'o' || endChar === 'o') {
          arrowEndType = 'circle'
          hasBack = !!startChar
          hasForward = !!endChar
        } else if (startChar === 'x' || endChar === 'x') {
          arrowEndType = 'cross'
          hasBack = !!startChar
          hasForward = !!endChar
        } else {
          hasBack = fullMatch.startsWith('<') || !!arrowMatch[2]
          hasForward = fullMatch.endsWith('>')
          if (!hasBack && !hasForward) {
            arrowEndType = 'none'
          }
        }

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
      let arrow: 'forward' | 'back' | 'both' | 'none' | 'circle' | 'circle_start' | 'circle_both' | 'cross' | 'cross_start' | 'cross_both' = 'forward'
      if (arrowEndType === 'circle') {
        if (hasBack && hasForward) arrow = 'circle_both'
        else if (hasBack) arrow = 'circle_start'
        else arrow = 'circle'
      } else if (arrowEndType === 'cross') {
        if (hasBack && hasForward) arrow = 'cross_both'
        else if (hasBack) arrow = 'cross_start'
        else arrow = 'cross'
      } else if (arrowEndType === 'none') {
        arrow = 'none'
      } else {
        if (hasBack && hasForward) arrow = 'both'
        else if (hasBack) arrow = 'back'
        else if (hasForward) arrow = 'forward'
        else arrow = 'none'
      }

      // Create links
      for (const srcId of finalSrcIds) {
        for (const tgtId of finalTgtIds) {
          linksArr.push({
            id: `link_${srcId}_${tgtId}_${Date.now()}_${Math.random()}`,
            source: srcId,
            target: tgtId,
            label: linkLabel,
            type: linkType,
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
