import { memo, useMemo } from 'react'
import type { GraphNode, GraphLink, Swimlane } from '@/types'
import { getNodeSize } from '@/utils/nodeSize'

interface SwimlanePreviewProps {
  swimlanes: Swimlane[]
  nodes: GraphNode[]
  links: GraphLink[]
}

/**
 * Custom swimlane preview renderer
 * Renders swimlanes in standard swimlane diagram style (like the editor canvas)
 */
export const SwimlanePreview = memo(({ swimlanes, nodes, links }: SwimlanePreviewProps) => {
  // Calculate bounding box for all content
  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    swimlanes.forEach(s => {
      minX = Math.min(minX, s.x)
      minY = Math.min(minY, s.y)
      maxX = Math.max(maxX, s.x + s.width)
      maxY = Math.max(maxY, s.y + s.height)
    })

    nodes.forEach(n => {
      const { width, height } = getNodeSize(n.type, n.label, n.customWidth, n.customHeight)
      minX = Math.min(minX, n.x)
      minY = Math.min(minY, n.y)
      maxX = Math.max(maxX, n.x + width)
      maxY = Math.max(maxY, n.y + height)
    })

    if (minX === Infinity) {
      return { x: 0, y: 0, width: 400, height: 300 }
    }

    const padding = 20
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    }
  }, [swimlanes, nodes])

  // Get node center position
  const getNodeCenter = (node: GraphNode) => {
    const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
    return { x: node.x + width / 2, y: node.y + height / 2 }
  }

  // Render node shape path
  const renderNodeShape = (node: GraphNode) => {
    const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
    const x = node.x - bounds.x
    const y = node.y - bounds.y

    const fill = '#ffffff'
    const stroke = '#475569'
    const strokeWidth = 2

    switch (node.type) {
      case 'rect':
        return <rect x={x} y={y} width={width} height={height} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      case 'round':
        return <rect x={x} y={y} width={width} height={height} rx={8} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      case 'stadium':
        return <rect x={x} y={y} width={width} height={height} rx={Math.min(width, height) / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      case 'circle':
        return <ellipse cx={x + width / 2} cy={y + height / 2} rx={width / 2} ry={height / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      case 'rhombus':
        return <path d={`M${x + width / 2} ${y} L${x + width} ${y + height / 2} L${x + width / 2} ${y + height} L${x} ${y + height / 2} Z`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      case 'hexagon':
        const hx = Math.min(15, width * 0.2)
        return <path d={`M${x + hx} ${y} L${x + width - hx} ${y} L${x + width} ${y + height / 2} L${x + width - hx} ${y + height} L${x + hx} ${y + height} L${x} ${y + height / 2} Z`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      case 'parallelogram':
        const px = Math.min(20, width * 0.2)
        return <path d={`M${x + px} ${y} L${x + width} ${y} L${x + width - px} ${y + height} L${x} ${y + height} Z`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      case 'parallelogram_alt':
        // Inverted parallelogram (slants the opposite direction)
        const pax = Math.min(20, width * 0.2)
        return <path d={`M${x} ${y} L${x + width - pax} ${y} L${x + width} ${y + height} L${x + pax} ${y + height} Z`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      case 'trapezoid':
        // Trapezoid: wider at bottom
        const tx = Math.min(20, width * 0.15)
        return <path d={`M${x + tx} ${y} L${x + width - tx} ${y} L${x + width} ${y + height} L${x} ${y + height} Z`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      case 'trapezoid_alt':
        // Inverted trapezoid: wider at top
        const tax = Math.min(20, width * 0.15)
        return <path d={`M${x} ${y} L${x + width} ${y} L${x + width - tax} ${y + height} L${x + tax} ${y + height} Z`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      case 'double_circle':
        // Double circle: two concentric circles
        const outerRx = width / 2
        const outerRy = height / 2
        const innerRx = outerRx - 6
        const innerRy = outerRy - 6
        return (
          <g>
            <ellipse cx={x + width / 2} cy={y + height / 2} rx={outerRx} ry={outerRy} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            <ellipse cx={x + width / 2} cy={y + height / 2} rx={innerRx} ry={innerRy} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          </g>
        )
      case 'database':
        return (
          <g>
            <path d={`M${x} ${y + 10} C${x} ${y + 4} ${x + 15} ${y} ${x + width / 2} ${y} S${x + width} ${y + 4} ${x + width} ${y + 10} V${y + height - 10} C${x + width} ${y + height - 4} ${x + width - 15} ${y + height} ${x + width / 2} ${y + height} S${x} ${y + height - 4} ${x} ${y + height - 10} Z`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            <path d={`M${x} ${y + 10} C${x} ${y + 16} ${x + 15} ${y + 19} ${x + width / 2} ${y + 19} S${x + width} ${y + 16} ${x + width} ${y + 10}`} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
          </g>
        )
      case 'subroutine':
        return (
          <g>
            <rect x={x} y={y} width={width} height={height} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            <line x1={x + 10} y1={y} x2={x + 10} y2={y + height} stroke={stroke} strokeWidth={strokeWidth} />
            <line x1={x + width - 10} y1={y} x2={x + width - 10} y2={y + height} stroke={stroke} strokeWidth={strokeWidth} />
          </g>
        )
      case 'flag':
        // Flag shape: rectangle with notch on right side
        const notchDepth = Math.min(15, width * 0.15)
        return <path d={`M${x} ${y} L${x + width} ${y} L${x + width - notchDepth} ${y + height / 2} L${x + width} ${y + height} L${x} ${y + height} Z`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      default:
        return <rect x={x} y={y} width={width} height={height} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    }
  }

  // Render link with curved path
  const renderLink = (link: GraphLink) => {
    const sourceNode = nodes.find(n => n.id === link.source)
    const targetNode = nodes.find(n => n.id === link.target)
    if (!sourceNode || !targetNode) return null

    const source = getNodeCenter(sourceNode)
    const target = getNodeCenter(targetNode)

    const sx = source.x - bounds.x
    const sy = source.y - bounds.y
    const tx = target.x - bounds.x
    const ty = target.y - bounds.y

    const stroke = '#475569'
    const strokeWidth = link.type === 'thick' ? 3 : 2
    const strokeDasharray = link.type === 'dotted' ? '5,5' : undefined

    // Create curved path
    const dx = tx - sx
    const dy = ty - sy
    const midX = (sx + tx) / 2
    const midY = (sy + ty) / 2

    // Add some curve based on distance
    const curvature = Math.min(50, Math.abs(dx) * 0.2, Math.abs(dy) * 0.2)
    const cx = midX + (Math.abs(dy) > Math.abs(dx) ? curvature * Math.sign(dx || 1) : 0)
    const cy = midY + (Math.abs(dx) > Math.abs(dy) ? curvature * Math.sign(dy || 1) : 0)

    const pathD = `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`
    const markerId = `arrow-${link.id}`
    const markerStartId = `arrow-start-${link.id}`

    // Determine which markers to use based on arrow type
    const needsEndMarker = ['forward', 'both', 'circle', 'circle_both', 'cross', 'cross_both'].includes(link.arrow || 'forward')
    const needsStartMarker = ['back', 'both', 'circle_start', 'circle_both', 'cross_start', 'cross_both'].includes(link.arrow || 'forward')

    return (
      <g key={link.id}>
        <defs>
          {needsEndMarker && (
            <marker
              id={markerId}
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              {link.arrow?.includes('circle') ? (
                <circle cx="5" cy="3.5" r="3" fill={stroke} />
              ) : link.arrow?.includes('cross') ? (
                <path d="M2 0 L8 7 M8 0 L2 7" stroke={stroke} strokeWidth="2" fill="none" />
              ) : (
                <polygon points="0 0, 10 3.5, 0 7" fill={stroke} />
              )}
            </marker>
          )}
          {needsStartMarker && (
            <marker
              id={markerStartId}
              markerWidth="10"
              markerHeight="7"
              refX="1"
              refY="3.5"
              orient="auto-start-reverse"
            >
              {link.arrow?.includes('circle') ? (
                <circle cx="5" cy="3.5" r="3" fill={stroke} />
              ) : link.arrow?.includes('cross') ? (
                <path d="M2 0 L8 7 M8 0 L2 7" stroke={stroke} strokeWidth="2" fill="none" />
              ) : (
                <polygon points="10 0, 0 3.5, 10 7" fill={stroke} />
              )}
            </marker>
          )}
        </defs>
        <path
          d={pathD}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          markerEnd={needsEndMarker ? `url(#${markerId})` : undefined}
          markerStart={needsStartMarker ? `url(#${markerStartId})` : undefined}
        />
        {link.label && (
          <text
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            fontSize={12}
            fill="#475569"
            style={{ backgroundColor: 'white' }}
          >
            <tspan style={{ filter: 'url(#textBg)' }}>{link.label}</tspan>
          </text>
        )}
      </g>
    )
  }

  return (
    <svg
      width={bounds.width}
      height={bounds.height}
      viewBox={`0 0 ${bounds.width} ${bounds.height}`}
      style={{ maxWidth: '100%', maxHeight: '100%' }}
    >
      {/* Render swimlanes */}
      {swimlanes.map(swimlane => {
        const x = swimlane.x - bounds.x
        const y = swimlane.y - bounds.y
        const isHorizontal = swimlane.orientation === 'horizontal'
        const headerHeight = 36
        const lanes = swimlane.lanes || []
        const laneCount = lanes.length || 1
        const contentHeight = swimlane.height - headerHeight
        const contentWidth = swimlane.width

        return (
          <g key={swimlane.id}>
            {/* Swimlane container */}
            <rect
              x={x}
              y={y}
              width={swimlane.width}
              height={swimlane.height}
              fill={swimlane.color || '#f0f9ff'}
              stroke="#94a3b8"
              strokeWidth={2}
              rx={8}
            />
            {/* Header */}
            <rect
              x={x}
              y={y}
              width={swimlane.width}
              height={headerHeight}
              fill="rgba(255,255,255,0.5)"
              rx={8}
            />
            <rect
              x={x}
              y={y + headerHeight - 8}
              width={swimlane.width}
              height={8}
              fill="rgba(255,255,255,0.5)"
            />
            <line
              x1={x}
              y1={y + headerHeight}
              x2={x + swimlane.width}
              y2={y + headerHeight}
              stroke="#94a3b8"
              strokeWidth={1}
            />
            <text
              x={x + 12}
              y={y + headerHeight / 2 + 5}
              fontSize={14}
              fontWeight={600}
              fill="#475569"
            >
              {swimlane.name}
            </text>

            {/* Lanes */}
            {lanes.map((lane, idx) => {
              const isLastLane = idx === laneCount - 1
              let laneX = x
              let laneY = y + headerHeight
              let laneWidth = contentWidth
              let laneHeight = contentHeight

              if (isHorizontal) {
                // Lanes stacked vertically
                laneHeight = contentHeight / laneCount
                laneY = y + headerHeight + idx * laneHeight
              } else {
                // Lanes arranged horizontally
                laneWidth = contentWidth / laneCount
                laneX = x + idx * laneWidth
              }

              return (
                <g key={lane.id}>
                  {/* Lane divider */}
                  {!isLastLane && (
                    isHorizontal ? (
                      <line
                        x1={laneX}
                        y1={laneY + laneHeight}
                        x2={laneX + laneWidth}
                        y2={laneY + laneHeight}
                        stroke="#94a3b8"
                        strokeWidth={1}
                        strokeDasharray="5,5"
                      />
                    ) : (
                      <line
                        x1={laneX + laneWidth}
                        y1={laneY}
                        x2={laneX + laneWidth}
                        y2={laneY + laneHeight}
                        stroke="#94a3b8"
                        strokeWidth={1}
                        strokeDasharray="5,5"
                      />
                    )
                  )}
                  {/* Lane label */}
                  <text
                    x={isHorizontal ? laneX + 8 : laneX + laneWidth / 2}
                    y={isHorizontal ? laneY + laneHeight / 2 : laneY + 16}
                    textAnchor={isHorizontal ? 'start' : 'middle'}
                    fontSize={12}
                    fontWeight={500}
                    fill="#64748b"
                  >
                    {lane.name}
                  </text>
                </g>
              )
            })}
          </g>
        )
      })}

      {/* Render links */}
      {links.map(renderLink)}

      {/* Render nodes */}
      {nodes.map(node => {
        const { width, height } = getNodeSize(node.type, node.label, node.customWidth, node.customHeight)
        const x = node.x - bounds.x
        const y = node.y - bounds.y

        return (
          <g key={node.id}>
            {renderNodeShape(node)}
            <text
              x={x + width / 2}
              y={y + height / 2 + 5}
              textAnchor="middle"
              fontSize={14}
              fill="#1e293b"
            >
              {node.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
})

SwimlanePreview.displayName = 'SwimlanePreview'
