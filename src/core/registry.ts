import type { DiagramPlugin } from './types'

/**
 * Plugin Registry - manages all diagram type plugins
 */
class PluginRegistry {
  private plugins = new Map<string, DiagramPlugin<any>>()
  private defaultPluginId: string | null = null

  /**
   * Register a diagram plugin
   */
  register<T>(plugin: DiagramPlugin<T>, isDefault = false): void {
    this.plugins.set(plugin.id, plugin)
    if (isDefault || this.defaultPluginId === null) {
      this.defaultPluginId = plugin.id
    }
  }

  /**
   * Unregister a plugin
   */
  unregister(id: string): void {
    this.plugins.delete(id)
    if (this.defaultPluginId === id) {
      const firstPlugin = this.plugins.keys().next().value
      this.defaultPluginId = firstPlugin || null
    }
  }

  /**
   * Get a plugin by ID
   */
  get<T = unknown>(id: string): DiagramPlugin<T> | undefined {
    return this.plugins.get(id) as DiagramPlugin<T> | undefined
  }

  /**
   * Get the default plugin
   */
  getDefault<T = unknown>(): DiagramPlugin<T> | undefined {
    if (!this.defaultPluginId) return undefined
    return this.plugins.get(this.defaultPluginId) as DiagramPlugin<T> | undefined
  }

  /**
   * Get all registered plugins
   */
  getAll(): DiagramPlugin<any>[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Get all plugin IDs
   */
  getIds(): string[] {
    return Array.from(this.plugins.keys())
  }

  /**
   * Check if a plugin is registered
   */
  has(id: string): boolean {
    return this.plugins.has(id)
  }

  /**
   * Get the default plugin ID
   */
  getDefaultId(): string | null {
    return this.defaultPluginId
  }

  /**
   * Set the default plugin
   */
  setDefault(id: string): void {
    if (this.plugins.has(id)) {
      this.defaultPluginId = id
    }
  }
}

// Singleton instance
export const pluginRegistry = new PluginRegistry()
