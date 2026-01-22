import { memo, ReactNode } from 'react'

interface IconProps {
  path: ReactNode
  size?: number
  className?: string
  fill?: string
}

export const Icon = memo(({ path, size = 18, className = '', fill = 'none' }: IconProps) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill={fill} 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    {path}
  </svg>
))

Icon.displayName = 'Icon'

// Icon paths
export const Icons = {
  MousePointer2: <path d="m12 19 7-7 3 3V3H2L12 13l4-4Z" />,
  ArrowRight: <path d="M5 12h14M12 5l7 7-7 7" />,
  Trash2: <>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </>,
  Copy: <>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </>,
  Check: <path d="M20 6 9 17l-5-5" />,
  Maximize2: <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />,
  Minimize2: <path d="M4 14h6v-6M20 10h-6v6M14 10l7-7M3 21l7-7" />,
  Download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  FileText: <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />,
  Reset: <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />,
  Layout: <path d="M3 3h18v18H3zM21 9H3M21 15H3M12 3v18" />,
  Magic: <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />,
  Square: <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />,
  Round: <rect x="3" y="5" width="18" height="14" rx="6" ry="6" />,
  Circle: <circle cx="12" cy="12" r="10" />,
  Rhombus: <path d="M12 2 2 12l10 10 10-10L12 2z" />,
  Stadium: <rect x="2" y="6" width="20" height="12" rx="6" />,
  Subroutine: <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="7" y1="3" x2="7" y2="21" />
    <line x1="17" y1="3" x2="17" y2="21" />
  </>,
  Database: <path d="M12 3c5 0 8 2 8 4s-3 4-8 4-8-2-8-4 3-4 8-4zm0 18c5 0 8-2 8-4V7c0 2-3 4-8 4s-8-2-8-4v10c0 2 3 4 8 4z" />,
  Hexagon: <path d="M12 2 2 7v10l10 5 10-5V7l-10-5z" />,
  Parallelogram: <path d="M2 18 6 6h16l-4 12H2z" />,
  LineSolid: <line x1="2" y1="12" x2="22" y2="12" />,
  LineDotted: <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="4 4" />,
  ArrowForward: <path d="M5 12h14m-6-6l6 6-6 6" />,
  ArrowBack: <path d="M19 12H5m6-6l-6 6 6 6" />,
  ArrowBoth: <path d="M8 12h8m-4-4l4 4-4 4m-4-8l-4 4 4 4" />,
  ArrowNone: <line x1="5" y1="12" x2="19" y2="12" />,
  Save: <>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </>,
  Folder: <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />,
  Upload: <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </>,
}

export const RotateIcon = memo(({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
))

RotateIcon.displayName = 'RotateIcon'

export const CodeIcon = memo(({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
))

CodeIcon.displayName = 'CodeIcon'

export const ImageIcon = memo(({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
))

ImageIcon.displayName = 'ImageIcon'
