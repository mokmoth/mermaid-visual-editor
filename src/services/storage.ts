/**
 * Storage Service for User Data Isolation
 * Uses LocalStorage to store user diagrams with per-user isolation
 */

import type { FlowDirection, GraphState } from '@/types'

// Diagram types supported
export type DiagramType = 'flowchart' | 'state' | 'class' | 'er' | 'sequence'

// Single diagram record
export interface DiagramRecord {
  id: string
  name: string
  type: DiagramType
  direction: FlowDirection
  state: any // Diagram-specific state (GraphState for flowchart, etc.)
  thumbnail?: string // Optional base64 thumbnail for future use
  createdAt: number
  updatedAt: number
}

// User data structure
export interface UserData {
  diagrams: DiagramRecord[]
  currentDiagramId: string | null
  passwordHash: string // Simple hash for password protection
  settings: {
    snapToGrid: boolean
    language: string
  }
}

// LocalStorage keys
const STORAGE_KEYS = {
  CURRENT_USER: 'mermaid_current_user',
  USER_DATA_PREFIX: 'mermaid_user_',
  ADMIN_CONFIG: 'mermaid_admin_config',
}

// Admin configuration
interface AdminConfig {
  adminUsername: string
  createdAt: number
}

/**
 * Get admin configuration
 */
export function getAdminConfig(): AdminConfig | null {
  const data = localStorage.getItem(STORAGE_KEYS.ADMIN_CONFIG)
  if (!data) return null
  try {
    return JSON.parse(data) as AdminConfig
  } catch {
    return null
  }
}

/**
 * Set admin (first registered user becomes admin, or can be set manually)
 */
export function setAdmin(username: string): void {
  const config: AdminConfig = {
    adminUsername: username,
    createdAt: Date.now(),
  }
  localStorage.setItem(STORAGE_KEYS.ADMIN_CONFIG, JSON.stringify(config))
}

/**
 * Check if a user is the admin
 */
export function isAdmin(username?: string): boolean {
  const user = username || getCurrentUser()
  if (!user) return false
  const config = getAdminConfig()
  return config?.adminUsername === user
}

/**
 * List all registered users
 */
export function listAllUsers(): { username: string; diagramCount: number; isAdmin: boolean }[] {
  const users: { username: string; diagramCount: number; isAdmin: boolean }[] = []
  const adminConfig = getAdminConfig()
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STORAGE_KEYS.USER_DATA_PREFIX)) {
      const username = key.replace(STORAGE_KEYS.USER_DATA_PREFIX, '')
      const userData = getUserData(username)
      if (userData) {
        users.push({
          username,
          diagramCount: userData.diagrams.length,
          isAdmin: adminConfig?.adminUsername === username,
        })
      }
    }
  }
  
  // Sort: admin first, then by username
  return users.sort((a, b) => {
    if (a.isAdmin && !b.isAdmin) return -1
    if (!a.isAdmin && b.isAdmin) return 1
    return a.username.localeCompare(b.username)
  })
}

/**
 * Reset a user's password (admin only)
 */
export function resetUserPassword(targetUsername: string, newPassword: string, adminUsername?: string): { success: boolean; error?: string } {
  const admin = adminUsername || getCurrentUser()
  
  // Verify admin
  if (!admin || !isAdmin(admin)) {
    return { success: false, error: '只有管理员可以重置密码' }
  }
  
  // Check target user exists
  const userData = getUserData(targetUsername)
  if (!userData) {
    return { success: false, error: '用户不存在' }
  }
  
  // Validate new password
  if (newPassword.length < 4) {
    return { success: false, error: '密码至少需要 4 个字符' }
  }
  
  // Update password
  userData.passwordHash = hashPassword(newPassword)
  saveUserData(userData, targetUsername)
  
  return { success: true }
}

/**
 * Simple hash function for password (not cryptographically secure, but provides basic protection)
 */
export function hashPassword(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  // Add some complexity
  const salt = 'mermaid_editor_2024'
  let finalHash = hash.toString(16)
  for (let i = 0; i < salt.length; i++) {
    finalHash += (hash + salt.charCodeAt(i)).toString(16)
  }
  return finalHash
}

/**
 * Verify password against stored hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  return hashPassword(password) === storedHash
}

/**
 * Check if a user exists
 */
export function userExists(username: string): boolean {
  const key = getUserStorageKey(username)
  return localStorage.getItem(key) !== null
}

/**
 * Validate user credentials
 */
export function validateUser(username: string, password: string): { valid: boolean; error?: string } {
  const userData = getUserData(username)
  if (!userData) {
    return { valid: false, error: '用户不存在' }
  }
  if (!verifyPassword(password, userData.passwordHash)) {
    return { valid: false, error: '密码错误' }
  }
  return { valid: true }
}

/**
 * Generate a unique ID (UUID v4)
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Get the current logged-in user
 */
export function getCurrentUser(): string | null {
  return localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
}

/**
 * Set the current user (after successful authentication)
 */
export function setCurrentUser(username: string): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, username)
}

/**
 * Register a new user with password
 */
export function registerUser(username: string, password: string): { success: boolean; error?: string; isNewAdmin?: boolean } {
  if (userExists(username)) {
    return { success: false, error: '用户名已存在' }
  }
  if (password.length < 4) {
    return { success: false, error: '密码至少需要 4 个字符' }
  }
  
  // Check if this is the first user (will become admin)
  const isFirstUser = !getAdminConfig()
  
  initializeUserData(username, password)
  setCurrentUser(username)
  
  // First user becomes admin
  if (isFirstUser) {
    setAdmin(username)
  }
  
  return { success: true, isNewAdmin: isFirstUser }
}

/**
 * Login an existing user
 */
export function loginUser(username: string, password: string): { success: boolean; error?: string } {
  const validation = validateUser(username, password)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }
  setCurrentUser(username)
  return { success: true }
}

/**
 * Clear current user (logout)
 */
export function clearCurrentUser(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
}

/**
 * Get the storage key for a user
 */
function getUserStorageKey(username: string): string {
  return `${STORAGE_KEYS.USER_DATA_PREFIX}${username}`
}

/**
 * Get user data from storage
 */
export function getUserData(username?: string): UserData | null {
  const user = username || getCurrentUser()
  if (!user) return null

  const key = getUserStorageKey(user)
  const data = localStorage.getItem(key)
  if (!data) return null

  try {
    return JSON.parse(data) as UserData
  } catch {
    return null
  }
}

/**
 * Save user data to storage
 */
export function saveUserData(userData: UserData, username?: string): void {
  const user = username || getCurrentUser()
  if (!user) return

  const key = getUserStorageKey(user)
  localStorage.setItem(key, JSON.stringify(userData))
}

/**
 * Initialize user data with defaults
 */
export function initializeUserData(username: string, password: string): UserData {
  const userData: UserData = {
    diagrams: [],
    currentDiagramId: null,
    passwordHash: hashPassword(password),
    settings: {
      snapToGrid: true,
      language: 'zh',
    },
  }
  saveUserData(userData, username)
  return userData
}

/**
 * List all diagrams for the current user
 */
export function listDiagrams(): DiagramRecord[] {
  const userData = getUserData()
  if (!userData) return []
  // Sort by updatedAt descending (most recent first)
  return [...userData.diagrams].sort((a, b) => b.updatedAt - a.updatedAt)
}

/**
 * Get a specific diagram by ID
 */
export function getDiagram(id: string): DiagramRecord | null {
  const userData = getUserData()
  if (!userData) return null
  return userData.diagrams.find((d) => d.id === id) || null
}

/**
 * Create a new diagram
 */
export function createDiagram(
  name: string,
  type: DiagramType,
  direction: FlowDirection = 'TD',
  state?: any
): DiagramRecord {
  const userData = getUserData()
  if (!userData) throw new Error('No user logged in')

  const now = Date.now()
  const diagram: DiagramRecord = {
    id: generateId(),
    name,
    type,
    direction,
    state: state || getInitialStateForType(type),
    createdAt: now,
    updatedAt: now,
  }

  userData.diagrams.push(diagram)
  userData.currentDiagramId = diagram.id
  saveUserData(userData)

  return diagram
}

/**
 * Get initial state for a diagram type
 */
function getInitialStateForType(type: DiagramType): any {
  switch (type) {
    case 'flowchart':
      return {
        nodes: [],
        links: [],
        swimlanes: [],
      } as GraphState
    case 'state':
      return {
        states: [],
        transitions: [],
      }
    case 'class':
      return {
        classes: [],
        relationships: [],
      }
    case 'er':
      return {
        entities: [],
        relationships: [],
      }
    case 'sequence':
      return {
        participants: [],
        messages: [],
      }
    default:
      return {}
  }
}

/**
 * Save/update a diagram
 */
export function saveDiagram(
  id: string,
  updates: Partial<Omit<DiagramRecord, 'id' | 'createdAt'>>
): DiagramRecord | null {
  const userData = getUserData()
  if (!userData) return null

  const index = userData.diagrams.findIndex((d) => d.id === id)
  if (index === -1) return null

  const diagram = userData.diagrams[index]
  const updated: DiagramRecord = {
    ...diagram,
    ...updates,
    updatedAt: Date.now(),
  }

  userData.diagrams[index] = updated
  saveUserData(userData)

  return updated
}

/**
 * Delete a diagram
 */
export function deleteDiagram(id: string): boolean {
  const userData = getUserData()
  if (!userData) return false

  const index = userData.diagrams.findIndex((d) => d.id === id)
  if (index === -1) return false

  userData.diagrams.splice(index, 1)

  // Clear currentDiagramId if it was the deleted diagram
  if (userData.currentDiagramId === id) {
    userData.currentDiagramId = userData.diagrams.length > 0 ? userData.diagrams[0].id : null
  }

  saveUserData(userData)
  return true
}

/**
 * Rename a diagram
 */
export function renameDiagram(id: string, newName: string): DiagramRecord | null {
  return saveDiagram(id, { name: newName })
}

/**
 * Get the current diagram ID
 */
export function getCurrentDiagramId(): string | null {
  const userData = getUserData()
  return userData?.currentDiagramId || null
}

/**
 * Set the current diagram ID
 */
export function setCurrentDiagramId(id: string | null): void {
  const userData = getUserData()
  if (!userData) return

  userData.currentDiagramId = id
  saveUserData(userData)
}

/**
 * Get user settings
 */
export function getUserSettings(): UserData['settings'] | null {
  const userData = getUserData()
  return userData?.settings || null
}

/**
 * Update user settings
 */
export function updateUserSettings(settings: Partial<UserData['settings']>): void {
  const userData = getUserData()
  if (!userData) return

  userData.settings = {
    ...userData.settings,
    ...settings,
  }
  saveUserData(userData)
}

/**
 * Format relative time for display
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return days === 1 ? '昨天' : `${days}天前`
  }
  if (hours > 0) {
    return `${hours}小时前`
  }
  if (minutes > 0) {
    return `${minutes}分钟前`
  }
  return '刚刚'
}

/**
 * Get diagram type display name
 */
export function getDiagramTypeName(type: DiagramType): string {
  const names: Record<DiagramType, string> = {
    flowchart: '流程图',
    state: '状态图',
    class: '类图',
    er: 'ER图',
    sequence: '时序图',
  }
  return names[type] || type
}
