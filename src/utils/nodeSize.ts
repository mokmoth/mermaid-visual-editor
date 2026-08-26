import type { NodeType, Size } from '@/types'

// Canvas element for text measurement (cached)
let measureCanvas: HTMLCanvasElement | null = null

/**
 * Measure text dimensions using canvas
 * Supports multi-line text with <br/> or \n line breaks
 */
export function measureText(text: string, fontSize = 14): Size {
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas')
  }
  
  const context = measureCanvas.getContext('2d')
  if (!context) return { width: 50, height: fontSize * 1.5 }
  
  context.font = `${fontSize}px sans-serif`
  
  // Split text by <br/>, <br>, or \n to handle multi-line labels
  const lines = (text || ' ').split(/<br\s*\/?>/gi).flatMap(s => s.split('\n'))
  
  // Find the widest line
  let maxWidth = 0
  for (const line of lines) {
    const lineWidth = context.measureText(line.trim() || ' ').width
    if (lineWidth > maxWidth) maxWidth = lineWidth
  }
  
  const lineHeight = fontSize * 1.3
  
  return { 
    width: maxWidth, 
    height: lines.length * lineHeight
  }
}

/**
 * Calculate node size based on type, label, and custom dimensions
 */
export function getNodeSize(
  type: NodeType, 
  label = '', 
  customWidth?: number, 
  customHeight?: number
): Size {
  const minW = 60
  const minH = 40
  const paddingX = 30 // Horizontal padding
  const paddingY = 20 // Vertical padding

  const { width: textW, height: textH } = measureText(label)

  let autoW = Math.max(minW, textW + paddingX * 2)
  let autoH = Math.max(minH, textH + paddingY)

  // Shape-specific adjustments
  switch (type) {
    case 'circle': {
      const d = Math.max(autoW, autoH, 60)
      autoW = d
      autoH = d
      break
    }
    case 'rhombus': {
      // Diamond needs more space for internal rectangle
      autoW = Math.max(100, (textW + paddingX) * 2)
      autoH = Math.max(60, (textH + paddingY) * 2)
      break
    }
    case 'hexagon':
      autoW += 20 // Compensation for pointed ends
      break
    case 'parallelogram':
      autoW += 20 // Compensation for slant
      break
    case 'database':
      autoH += 10 // Compensation for top cylinder
      break
    case 'flag':
      autoW += 20 // Compensation for flag point
      break
    case 'trapezoid':
    case 'trapezoid_alt':
      autoW += 20 // Compensation for angled sides
      break
    case 'double_circle': {
      const d = Math.max(autoW, autoH, 70) // Slightly larger than regular circle
      autoW = d
      autoH = d
      break
    }
    case 'parallelogram_alt':
      autoW += 20 // Compensation for slant
      break
  }

  // Apply custom dimensions if provided (with minimum safety)
  const finalW = customWidth ? Math.max(customWidth, 40) : autoW
  const finalH = customHeight ? Math.max(customHeight, 40) : autoH

  return { width: finalW, height: finalH }
}
