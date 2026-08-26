/**
 * Pure helpers for diagram element counts and code-sync guards.
 */

export function countDiagramElements(type: string, state: unknown): number {
  if (!state || typeof state !== 'object') return 0
  const s = state as Record<string, unknown>
  if (type === 'flowchart') return Array.isArray(s.nodes) ? s.nodes.length : 0
  if (type === 'state') return Array.isArray(s.states) ? s.states.length : 0
  if (type === 'class') return Array.isArray(s.classes) ? s.classes.length : 0
  if (type === 'er') return Array.isArray(s.entities) ? s.entities.length : 0
  if (type === 'sequence') return Array.isArray(s.participants) ? s.participants.length : 0
  return 0
}

/** Incomplete / failed parses must not wipe a non-empty canvas. */
export function shouldApplyParsedState(parsedCount: number, currentCount: number): boolean {
  return !(parsedCount === 0 && currentCount > 0)
}
