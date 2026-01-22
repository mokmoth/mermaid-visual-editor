import { jsPDF } from 'jspdf'

export type ExportFormat = 'svg' | 'png' | 'pdf'

/**
 * Export diagram to various formats
 */
export async function exportDiagram(
  mermaidElement: HTMLElement | null,
  format: ExportFormat
): Promise<void> {
  if (!mermaidElement) return

  const svgEl = mermaidElement.querySelector('svg')
  if (!svgEl) return

  const svgData = new XMLSerializer().serializeToString(svgEl)

  if (format === 'svg') {
    downloadSVG(svgData)
  } else {
    await downloadRaster(svgEl, svgData, format)
  }
}

function downloadSVG(svgData: string): void {
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `diagram-${Date.now()}.svg`
  a.click()
  URL.revokeObjectURL(url)
}

async function downloadRaster(
  svgEl: SVGSVGElement,
  svgData: string,
  format: 'png' | 'pdf'
): Promise<void> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const img = new Image()
    const bbox = svgEl.viewBox.baseVal || svgEl.getBoundingClientRect()
    const scale = 2

    canvas.width = bbox.width * scale
    canvas.height = bbox.height * scale

    img.onload = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve()
        return
      }

      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const imgData = canvas.toDataURL('image/png')

      if (format === 'png') {
        const a = document.createElement('a')
        a.href = imgData
        a.download = `diagram-${Date.now()}.png`
        a.click()
      } else if (format === 'pdf') {
        const pdf = new jsPDF(
          canvas.width > canvas.height ? 'l' : 'p',
          'mm',
          'a4'
        )
        const pw = pdf.internal.pageSize.getWidth()
        const ph = pdf.internal.pageSize.getHeight()
        const ratio = Math.min(pw / canvas.width, ph / canvas.height) * 0.9
        
        pdf.addImage(
          imgData,
          'PNG',
          (pw - canvas.width * ratio) / 2,
          (ph - canvas.height * ratio) / 2,
          canvas.width * ratio,
          canvas.height * ratio
        )
        pdf.save(`diagram-${Date.now()}.pdf`)
      }
      resolve()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  })
}

/**
 * Save project to local storage
 */
export function saveToLocalStorage(data: {
  nodes: unknown[]
  links: unknown[]
  direction: string
}): void {
  const saveData = {
    ...data,
    version: '2.0',
    timestamp: Date.now()
  }
  localStorage.setItem('mermaid-editor-data', JSON.stringify(saveData))
}

/**
 * Load project from local storage
 */
export function loadFromLocalStorage(): {
  nodes: unknown[]
  links: unknown[]
  direction: string
} | null {
  const saved = localStorage.getItem('mermaid-editor-data')
  if (!saved) return null
  
  try {
    return JSON.parse(saved)
  } catch {
    return null
  }
}

/**
 * Export project to JSON file
 */
export function exportProject(data: {
  nodes: unknown[]
  links: unknown[]
  direction: string
  mermaidCode: string
}): void {
  const exportData = {
    ...data,
    version: '2.0',
    timestamp: Date.now()
  }
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mermaid-project-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Import project from JSON file
 */
export function importProject(callback: (data: {
  nodes: unknown[]
  links: unknown[]
  direction: string
  mermaidCode?: string
}) => void): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (data.nodes && data.links) {
          callback(data)
        }
      } catch (err) {
        console.error('Import failed:', err)
      }
    }
    reader.readAsText(file)
  }
  input.click()
}
