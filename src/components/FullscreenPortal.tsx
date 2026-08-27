import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function FullscreenPortal({
  active,
  children
}: {
  active: boolean
  children: ReactNode
}) {
  if (!active) return <>{children}</>
  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-white flex flex-col"
      data-testid="mermaid-fullscreen-preview"
    >
      {children}
    </div>,
    document.body
  )
}
