/**
 * Typed File Reader API client for the React frontend
 * 
 * This module provides type-safe access to local markdown files via Electron IPC.
 * When running in a browser (without Electron), these functions return empty data.
 */

import { isElectron } from './electron'

// ============================================
// TYPES
// ============================================

export interface MarkdownFile {
  path: string
  name: string
  frontmatter: Record<string, unknown>
  body: string
  modifiedAt: string
}

export interface ProjectFile {
  path: string
  name: string
  excerpt: string
  modifiedAt: string
  title?: string
  status?: string
  tags?: string[]
  [key: string]: unknown
}

export interface NoteFile {
  path: string
  relativePath: string
  name: string
  excerpt: string
  modifiedAt: string
  title?: string
  tags?: string[]
  [key: string]: unknown
}

export interface FileSearchResult {
  path: string
  name: string
  title: string
  excerpt: string
  modifiedAt: string
  matchType: 'title' | 'tags' | 'body'
  [key: string]: unknown
}

export interface FileStats {
  path: string
  name: string
  size: number
  createdAt: string
  modifiedAt: string
  isDirectory: boolean
  isFile: boolean
}

// Files API type definition (matches ElectronAPI.files in preload.cjs)
interface FilesAPI {
  readMarkdown: (filePath: string) => Promise<MarkdownFile>
  listMarkdown: (directory: string, recursive?: boolean) => Promise<string[]>
  listProjects: () => Promise<ProjectFile[]>
  listNotes: (subDirectory?: string) => Promise<NoteFile[]>
  search: (directory: string, query: string) => Promise<FileSearchResult[]>
  searchNotes: (query: string) => Promise<FileSearchResult[]>
  getStats: (filePath: string) => Promise<FileStats>
  directoryExists: (dirPath: string) => Promise<boolean>
  openInEditor: (filePath: string) => Promise<string>
  showInFolder: (filePath: string) => Promise<boolean>
}

// Helper to get the Files API
function getFilesApi(): FilesAPI | null {
  if (!isElectron() || !window.electronAPI?.files) {
    return null
  }
  return window.electronAPI.files as FilesAPI
}

// ============================================
// AVAILABILITY
// ============================================

/**
 * Check if file reader integration is available (Electron mode)
 */
export function isFilesAvailable(): boolean {
  return isElectron() && window.electronAPI?.files !== undefined
}

// ============================================
// READING FILES
// ============================================

/**
 * Read a single markdown file with frontmatter parsing
 */
export async function readMarkdownFile(filePath: string): Promise<MarkdownFile | null> {
  const api = getFilesApi()
  if (!api) {
    console.warn('File reader is only available in Electron mode')
    return null
  }

  try {
    return await api.readMarkdown(filePath)
  } catch (error) {
    console.error('Error reading markdown file:', error)
    throw error
  }
}

/**
 * List all markdown files in a directory
 */
export async function listMarkdownFiles(directory: string, recursive = true): Promise<string[]> {
  const api = getFilesApi()
  if (!api) {
    console.warn('File reader is only available in Electron mode')
    return []
  }

  try {
    return await api.listMarkdown(directory, recursive)
  } catch (error) {
    console.error('Error listing markdown files:', error)
    throw error
  }
}

// ============================================
// PROJECTS
// ============================================

/**
 * List all project files from the notes repo
 */
export async function listProjects(): Promise<ProjectFile[]> {
  const api = getFilesApi()
  if (!api) {
    console.warn('File reader is only available in Electron mode')
    return []
  }

  try {
    return await api.listProjects()
  } catch (error) {
    console.error('Error listing projects:', error)
    throw error
  }
}

// ============================================
// NOTES
// ============================================

/**
 * List all notes files from the notes repo
 */
export async function listNotes(subDirectory?: string): Promise<NoteFile[]> {
  const api = getFilesApi()
  if (!api) {
    console.warn('File reader is only available in Electron mode')
    return []
  }

  try {
    return await api.listNotes(subDirectory)
  } catch (error) {
    console.error('Error listing notes:', error)
    throw error
  }
}

// ============================================
// SEARCH
// ============================================

/**
 * Search files in a directory
 */
export async function searchFiles(directory: string, query: string): Promise<FileSearchResult[]> {
  const api = getFilesApi()
  if (!api) {
    console.warn('File reader is only available in Electron mode')
    return []
  }

  try {
    return await api.search(directory, query)
  } catch (error) {
    console.error('Error searching files:', error)
    throw error
  }
}

/**
 * Search files in the notes repo
 */
export async function searchNotes(query: string): Promise<FileSearchResult[]> {
  const api = getFilesApi()
  if (!api) {
    console.warn('File reader is only available in Electron mode')
    return []
  }

  try {
    return await api.searchNotes(query)
  } catch (error) {
    console.error('Error searching notes:', error)
    throw error
  }
}

// ============================================
// FILE OPERATIONS
// ============================================

/**
 * Get file statistics
 */
export async function getFileStats(filePath: string): Promise<FileStats | null> {
  const api = getFilesApi()
  if (!api) {
    console.warn('File reader is only available in Electron mode')
    return null
  }

  try {
    return await api.getStats(filePath)
  } catch (error) {
    console.error('Error getting file stats:', error)
    throw error
  }
}

/**
 * Check if a directory exists
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  const api = getFilesApi()
  if (!api) {
    return false
  }

  try {
    return await api.directoryExists(dirPath)
  } catch (error) {
    console.error('Error checking directory:', error)
    return false
  }
}

/**
 * Open a file in the default editor
 */
export async function openInEditor(filePath: string): Promise<boolean> {
  const api = getFilesApi()
  if (!api) {
    console.warn('File reader is only available in Electron mode')
    return false
  }

  try {
    await api.openInEditor(filePath)
    return true
  } catch (error) {
    console.error('Error opening file in editor:', error)
    return false
  }
}

/**
 * Show a file in the system file explorer
 */
export async function showInFolder(filePath: string): Promise<boolean> {
  const api = getFilesApi()
  if (!api) {
    console.warn('File reader is only available in Electron mode')
    return false
  }

  try {
    return await api.showInFolder(filePath)
  } catch (error) {
    console.error('Error showing file in folder:', error)
    return false
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Format relative time for file modification
 */
export function formatModifiedTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  
  return date.toLocaleDateString()
}

/**
 * Extract title from frontmatter or filename
 */
export function getFileTitle(file: ProjectFile | NoteFile): string {
  return (file.title as string) || file.name.replace(/-/g, ' ')
}
