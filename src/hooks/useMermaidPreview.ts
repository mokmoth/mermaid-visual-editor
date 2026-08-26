import { useCallback, useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { useI18n } from '@/i18n'
import { applySvgToPreview, cleanupMermaidArtifacts, renderMermaidSvg } from '@/utils/mermaid'

export function useMermaidPreview() {
  const { t } = useI18n()
  const mermaidRef = useRef<HTMLDivElement>(null)
  const renderGeneration = useRef(0)
  const [mermaidError, setMermaidError] = useState<string | null>(null)

  useEffect(() => {
    mermaid.startOnLoad = false
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      flowchart: {
        htmlLabels: true,
        useMaxWidth: true,
        wrappingWidth: 120,
        nodeSpacing: 50,
        rankSpacing: 60,
        curve: 'basis',
        padding: 15,
        diagramPadding: 20
      },
      themeVariables: {
        primaryColor: '#ffffff',
        primaryTextColor: '#1e293b',
        primaryBorderColor: '#475569',
        secondaryColor: '#ffffff',
        secondaryTextColor: '#1e293b',
        secondaryBorderColor: '#475569',
        tertiaryColor: '#ffffff',
        tertiaryTextColor: '#1e293b',
        tertiaryBorderColor: '#475569',
        lineColor: '#475569',
        fontSize: '14px',
        background: '#ffffff',
        mainBkg: '#ffffff',
        nodeBorder: '#475569',
        clusterBkg: '#f0f9ff',
        clusterBorder: '#94a3b8',
        edgeLabelBackground: '#ffffff',
        noteBkgColor: '#fef9c3',
        noteTextColor: '#713f12',
        noteBorderColor: '#facc15'
      }
    })
    return () => cleanupMermaidArtifacts()
  }, [])

  const renderDiagram = useCallback(async (code: string) => {
    const gen = ++renderGeneration.current
    if (!code.trim()) {
      if (mermaidRef.current) mermaidRef.current.innerHTML = ''
      cleanupMermaidArtifacts()
      return
    }

    for (let attempt = 0; attempt < 20; attempt++) {
      if (gen !== renderGeneration.current) return
      if (mermaidRef.current) break
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    if (gen !== renderGeneration.current) return
    if (!mermaidRef.current) return

    try {
      mermaidRef.current.removeAttribute('data-processed')
      const svg = await Promise.race([
        renderMermaidSvg(code),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Mermaid render timeout')), 8000)
        )
      ])
      if (gen !== renderGeneration.current || !mermaidRef.current) return
      applySvgToPreview(mermaidRef.current, svg)
      cleanupMermaidArtifacts()
      setMermaidError(null)
    } catch (e) {
      if (gen !== renderGeneration.current) return
      console.error('Mermaid render error:', e)
      if (mermaidRef.current) {
        mermaidRef.current.innerHTML = ''
      }
      cleanupMermaidArtifacts()
      setMermaidError(t('errors.parseError') + ': ' + (e as Error).message)
    }
  }, [t])

  return { mermaidRef, mermaidError, setMermaidError, renderDiagram }
}
