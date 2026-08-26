import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

export function interactiveA11y(label: string, selected: boolean) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': label,
    'aria-pressed': selected,
  }
}

export function activateOnEnterOrSpace(
  e: ReactKeyboardEvent,
  activate: () => void
): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    e.stopPropagation()
    activate()
  }
}
