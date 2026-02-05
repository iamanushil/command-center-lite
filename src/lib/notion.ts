/**
 * Typed Notion API client for the React frontend
 * 
 * This module provides type-safe access to Notion via Electron IPC.
 * When running in a browser (without Electron), these functions return empty data.
 */

import { isElectron } from './electron'
import type { Task, Contact, InboxItem, TaskStatus } from '../types'

// Notion-specific types
export interface NotionInboxItem {
  notionId: string
  note: string
  description?: string
  dateAdded: string
}

export interface NotionTask {
  notionId: string
  title: string
  category: string
  dueDate: string | null
  status: TaskStatus
  notes?: string
}

export interface NotionContact {
  notionId: string
  name: string
  company?: string
  checkInFrequency?: string
  contactMethod?: string
  knownFor?: string
  lastContact?: string
  nextCheckIn?: string
  notes?: string
}

export interface NotionConnectionResult {
  success: boolean
  user?: {
    name: string
    type: string
  }
  error?: string
}

export interface NotionSyncResult {
  inbox: NotionInboxItem[]
  tasks: NotionTask[]
  contacts: NotionContact[]
  errors: Array<{ source: string; error: string }>
}

// Notion API type definition (matches ElectronAPI.notion in electron.ts)
interface NotionAPI {
  init: (apiKey: string) => Promise<unknown>
  testConnection: () => Promise<NotionConnectionResult>
  isReady: () => Promise<boolean>
  fetchInbox: () => Promise<NotionInboxItem[]>
  addToInbox: (note: string, description?: string) => Promise<NotionInboxItem>
  fetchRecurring: () => Promise<NotionTask[]>
  fetchAllTasks: () => Promise<NotionTask[]>
  completeTask: (pageId: string) => Promise<boolean>
  updateTaskStatus: (pageId: string, status: TaskStatus) => Promise<boolean>
  fetchContacts: (daysAhead?: number) => Promise<NotionContact[]>
  fetchAllContacts: () => Promise<NotionContact[]>
  recordCheckIn: (pageId: string, nextCheckInDate?: string) => Promise<boolean>
  syncAll: () => Promise<NotionSyncResult>
}

// Helper to get the Notion API
function getNotionApi(): NotionAPI | null {
  if (!isElectron() || !window.electronAPI?.notion) {
    return null
  }
  return window.electronAPI.notion as NotionAPI
}

/**
 * Check if Notion integration is available
 */
export function isNotionAvailable(): boolean {
  return isElectron() && window.electronAPI?.notion !== undefined
}

// ============================================
// CONNECTION
// ============================================

/**
 * Initialize Notion client with API key
 */
export async function initNotion(apiKey: string): Promise<boolean> {
  const api = getNotionApi()
  if (!api) {
    console.warn('Notion is only available in Electron mode')
    return false
  }
  
  try {
    await api.init(apiKey)
    return true
  } catch (error) {
    console.error('Failed to initialize Notion:', error)
    return false
  }
}

/**
 * Test connection to Notion
 */
export async function testConnection(): Promise<NotionConnectionResult> {
  const api = getNotionApi()
  if (!api) {
    return { success: false, error: 'Notion is only available in Electron mode' }
  }
  
  return api.testConnection()
}

/**
 * Check if Notion client is initialized and ready
 */
export async function isNotionReady(): Promise<boolean> {
  const api = getNotionApi()
  if (!api) return false
  return api.isReady()
}

// ============================================
// INBOX
// ============================================

/**
 * Fetch inbox items from Notion
 */
export async function fetchInbox(): Promise<NotionInboxItem[]> {
  const api = getNotionApi()
  if (!api) return []
  
  try {
    return await api.fetchInbox()
  } catch (error) {
    console.error('Failed to fetch inbox:', error)
    return []
  }
}

/**
 * Add item to Notion inbox
 */
export async function addToInbox(note: string, description?: string): Promise<NotionInboxItem | null> {
  const api = getNotionApi()
  if (!api) return null
  
  try {
    return await api.addToInbox(note, description)
  } catch (error) {
    console.error('Failed to add to inbox:', error)
    return null
  }
}

// ============================================
// TASKS
// ============================================

/**
 * Fetch recurring tasks due today or overdue
 */
export async function fetchRecurringTasks(): Promise<NotionTask[]> {
  const api = getNotionApi()
  if (!api) return []
  
  try {
    return await api.fetchRecurring()
  } catch (error) {
    console.error('Failed to fetch recurring tasks:', error)
    return []
  }
}

/**
 * Fetch all tasks from Notion
 */
export async function fetchAllTasks(): Promise<NotionTask[]> {
  const api = getNotionApi()
  if (!api) return []
  
  try {
    return await api.fetchAllTasks()
  } catch (error) {
    console.error('Failed to fetch all tasks:', error)
    return []
  }
}

/**
 * Mark a task as complete in Notion
 */
export async function completeTask(pageId: string): Promise<boolean> {
  const api = getNotionApi()
  if (!api) return false
  
  try {
    return await api.completeTask(pageId)
  } catch (error) {
    console.error('Failed to complete task:', error)
    return false
  }
}

/**
 * Update task status in Notion
 */
export async function updateTaskStatus(pageId: string, status: TaskStatus): Promise<boolean> {
  const api = getNotionApi()
  if (!api) return false
  
  try {
    return await api.updateTaskStatus(pageId, status)
  } catch (error) {
    console.error('Failed to update task status:', error)
    return false
  }
}

/**
 * Convert Notion task to app Task type
 */
export function notionTaskToTask(notionTask: NotionTask): Omit<Task, 'id' | 'createdAt'> {
  return {
    title: notionTask.title,
    notes: notionTask.notes,
    category: notionTask.category as Task['category'],
    status: notionTask.status,
    dueDate: notionTask.dueDate || undefined,
    isSyncPriority: false,
    source: 'notion',
    notionId: notionTask.notionId,
  }
}

// ============================================
// CONTACTS
// ============================================

/**
 * Fetch contacts due for check-in
 */
export async function fetchContactsDueSoon(daysAhead: number = 7): Promise<NotionContact[]> {
  const api = getNotionApi()
  if (!api) return []
  
  try {
    return await api.fetchContacts(daysAhead)
  } catch (error) {
    console.error('Failed to fetch contacts:', error)
    return []
  }
}

/**
 * Fetch all contacts from Notion
 */
export async function fetchAllContacts(): Promise<NotionContact[]> {
  const api = getNotionApi()
  if (!api) return []
  
  try {
    return await api.fetchAllContacts()
  } catch (error) {
    console.error('Failed to fetch all contacts:', error)
    return []
  }
}

/**
 * Record a check-in with a contact
 */
export async function recordCheckIn(pageId: string, nextCheckInDate?: string): Promise<boolean> {
  const api = getNotionApi()
  if (!api) return false
  
  try {
    return await api.recordCheckIn(pageId, nextCheckInDate)
  } catch (error) {
    console.error('Failed to record check-in:', error)
    return false
  }
}

/**
 * Convert Notion contact to app Contact type
 */
export function notionContactToContact(notionContact: NotionContact): Contact {
  return {
    id: notionContact.notionId,
    notionId: notionContact.notionId,
    name: notionContact.name,
    checkInFrequency: notionContact.checkInFrequency || '',
    contactMethod: notionContact.contactMethod || '',
    knownFor: notionContact.knownFor || '',
    lastCheckIn: notionContact.lastContact,
    nextCheckIn: notionContact.nextCheckIn,
    notes: notionContact.notes,
  }
}

// ============================================
// SYNC
// ============================================

/**
 * Sync all data from Notion
 */
export async function syncAll(): Promise<NotionSyncResult> {
  const api = getNotionApi()
  if (!api) {
    return {
      inbox: [],
      tasks: [],
      contacts: [],
      errors: [{ source: 'notion', error: 'Notion is only available in Electron mode' }],
    }
  }
  
  try {
    return await api.syncAll()
  } catch (error) {
    console.error('Failed to sync with Notion:', error)
    return {
      inbox: [],
      tasks: [],
      contacts: [],
      errors: [{ source: 'notion', error: String(error) }],
    }
  }
}

/**
 * Convert Notion inbox item to app InboxItem type
 */
export function notionInboxToInboxItem(item: NotionInboxItem): InboxItem {
  return {
    id: item.notionId,
    notionId: item.notionId,
    note: item.note,
    description: item.description,
    dateAdded: item.dateAdded,
  }
}
