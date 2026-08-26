import mermaid from 'mermaid'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider } from './i18n'
import { registerAllPlugins } from './plugins'
import App from './App'
import './index.css'

// Disable mermaid's page-scan before window "load". Otherwise mermaid.run()
// picks up preview divs with class "mermaid" and deadlocks mermaid.render().
mermaid.startOnLoad = false
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'loose',
})

// Register all diagram plugins
registerAllPlugins()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
