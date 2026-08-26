// Plugin Registry - registers all diagram plugins
import { pluginRegistry } from '@/core/registry'
import { flowchartPlugin } from './flowchart'
import { stateDiagramPlugin } from './state'
import { classDiagramPlugin } from './class'
import { erDiagramPlugin } from './er'
import { sequenceDiagramPlugin } from './sequence'

// Register all plugins
export function registerAllPlugins() {
  // Flowchart is the default plugin
  pluginRegistry.register(flowchartPlugin, true)
  pluginRegistry.register(stateDiagramPlugin)
  pluginRegistry.register(classDiagramPlugin)
  pluginRegistry.register(erDiagramPlugin)
  pluginRegistry.register(sequenceDiagramPlugin)
}

// Export plugins
export { flowchartPlugin } from './flowchart'
export { stateDiagramPlugin } from './state'
export { classDiagramPlugin } from './class'
export { erDiagramPlugin } from './er'
export { sequenceDiagramPlugin } from './sequence'

// Re-export registry
export { pluginRegistry }
