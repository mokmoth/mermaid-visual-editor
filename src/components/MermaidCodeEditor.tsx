import { memo, useCallback } from 'react'
import Editor from 'react-simple-code-editor'

/**
 * Simple Mermaid syntax highlighter
 * Highlights keywords, arrows, strings, comments, node IDs, etc.
 */
function highlightMermaid(code: string): string {
  // Escape HTML first
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Define highlight rules (order matters - more specific first)
  const rules: [RegExp, string][] = [
    // Comments (%%...)
    [/(%%[^\n]*)/g, '<span class="text-gray-500 italic">$1</span>'],
    
    // Strings ("..." or '...')
    [/(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;|"[^"]*"|'[^']*')/g, '<span class="text-emerald-300">$1</span>'],
    
    // Diagram type keywords
    [/\b(flowchart|graph|subgraph|end|direction|classDef|class|style|linkStyle|click|stateDiagram|stateDiagram-v2|classDiagram|erDiagram|sequenceDiagram|gantt|pie|journey|gitGraph)\b/gi, '<span class="text-purple-400 font-semibold">$1</span>'],
    
    // Direction keywords
    [/\b(TD|TB|LR|RL|BT)\b/g, '<span class="text-cyan-400 font-bold">$1</span>'],
    
    // Sequence/state diagram keywords
    [/\b(participant|actor|activate|deactivate|note|loop|alt|else|opt|par|and|critical|break|rect|entity|relationship|state|fork|join|choice)\b/gi, '<span class="text-blue-400">$1</span>'],
    
    // Arrows and link operators (escaped > and <)
    [/(--&gt;|&lt;--&gt;|&lt;--|---|-\.-&gt;|-\.-|==&gt;|===|~~~|--x|--o|o--|x--|\.\.\.|\|-\|)/g, '<span class="text-yellow-400 font-medium">$1</span>'],
    
    // Unescaped arrows for standard cases
    [/(-->|<-->|<--|---|-\.->|==>|--x|--o)/g, '<span class="text-yellow-400 font-medium">$1</span>'],
    
    // Brackets highlighting
    [/(\[{1,2}|\]{1,2}|\({1,3}|\){1,3}|\{{1,2}|\}{1,2})/g, '<span class="text-slate-400">$1</span>'],
  ]

  // Apply each rule
  for (const [pattern, replacement] of rules) {
    html = html.replace(pattern, replacement)
  }

  return html
}

interface MermaidCodeEditorProps {
  value: string
  onChange: (code: string) => void
  onBlur?: () => void
  className?: string
}

export const MermaidCodeEditor = memo(({
  value,
  onChange,
  onBlur,
  className = ''
}: MermaidCodeEditorProps) => {
  
  const highlight = useCallback((code: string) => highlightMermaid(code), [])

  return (
    <div className={`flex-1 min-h-0 overflow-auto ${className}`}>
      <Editor
        value={value}
        onValueChange={onChange}
        highlight={highlight}
        padding={16}
        onBlur={onBlur}
        className="min-h-full"
        style={{
          fontFamily: '"Fira Code", "Fira Mono", Menlo, Consolas, "Courier New", monospace',
          fontSize: 12,
          lineHeight: 1.6,
          backgroundColor: '#1e293b',
          color: '#86efac', // Default text color (green-300)
          minHeight: '100%',
        }}
        textareaClassName="focus:outline-none caret-green-400"
      />
    </div>
  )
})

MermaidCodeEditor.displayName = 'MermaidCodeEditor'
