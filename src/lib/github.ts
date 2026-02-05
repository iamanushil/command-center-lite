/**
 * Typed GitHub API client for the React frontend
 * 
 * This module provides type-safe access to GitHub via the gh CLI through Electron IPC.
 * When running in a browser (without Electron), these functions return empty data.
 */

import { isElectron } from './electron'

// ============================================
// TYPES
// ============================================

export interface GitHubPR {
  id: string
  number: number
  title: string
  url: string
  repo: string
  repoFullName: string
  createdAt: string
  updatedAt: string
  state?: string
  type: 'review-requested' | 'authored'
}

export interface GitHubIssue {
  id: string
  number: number
  title: string
  url: string
  repo: string
  repoFullName: string
  labels: string[]
  createdAt: string
  updatedAt: string
  type: 'assigned'
}

export interface GitHubPRDetails {
  number: number
  title: string
  body: string
  url: string
  state: string
  author: string
  createdAt: string
  updatedAt: string
  reviews: unknown[]
  reviewDecision: string | null
  ciStatus: unknown
}

export interface GitHubIssueDetails {
  number: number
  title: string
  body: string
  url: string
  state: string
  author: string
  createdAt: string
  updatedAt: string
  labels: string[]
  assignees: string[]
}

export interface GitHubAllData {
  prsToReview: GitHubPR[]
  myPRs: GitHubPR[]
  assignedIssues: GitHubIssue[]
  fetchedAt: string
}

export interface GitHubError {
  message: string
  code?: string
}

// GitHub API type definition (matches ElectronAPI.github in electron.ts)
interface GitHubAPI {
  isAvailable: () => Promise<boolean>
  fetchPRsToReview: () => Promise<GitHubPR[]>
  fetchMyPRs: () => Promise<GitHubPR[]>
  fetchAssignedIssues: () => Promise<GitHubIssue[]>
  fetchCopilotIssues: () => Promise<GitHubIssue[]>
  fetchAll: () => Promise<GitHubAllData>
  getPRDetails: (repoFullName: string, prNumber: number) => Promise<GitHubPRDetails>
  getIssueDetails: (repoFullName: string, issueNumber: number) => Promise<GitHubIssueDetails>
  openUrl: (url: string) => Promise<void>
}

// Helper to get the GitHub API
function getGitHubApi(): GitHubAPI | null {
  if (!isElectron() || !window.electronAPI?.github) {
    return null
  }
  return window.electronAPI.github as GitHubAPI
}

// ============================================
// AVAILABILITY
// ============================================

/**
 * Check if GitHub integration is available (Electron mode)
 */
export function isGitHubAvailable(): boolean {
  return isElectron() && window.electronAPI?.github !== undefined
}

/**
 * Check if gh CLI is available and authenticated
 */
export async function isGhCliAvailable(): Promise<boolean> {
  const api = getGitHubApi()
  if (!api) {
    return false
  }
  
  try {
    return await api.isAvailable()
  } catch (error) {
    console.error('Error checking gh CLI availability:', error)
    return false
  }
}

// ============================================
// PULL REQUESTS
// ============================================

/**
 * Fetch PRs that are requesting your review
 */
export async function fetchPRsToReview(): Promise<GitHubPR[]> {
  const api = getGitHubApi()
  if (!api) {
    console.warn('GitHub is only available in Electron mode')
    return []
  }
  
  try {
    return await api.fetchPRsToReview()
  } catch (error) {
    console.error('Error fetching PRs to review:', error)
    throw error
  }
}

/**
 * Fetch your authored PRs
 */
export async function fetchMyPRs(): Promise<GitHubPR[]> {
  const api = getGitHubApi()
  if (!api) {
    console.warn('GitHub is only available in Electron mode')
    return []
  }
  
  try {
    return await api.fetchMyPRs()
  } catch (error) {
    console.error('Error fetching my PRs:', error)
    throw error
  }
}

/**
 * Get details for a specific PR
 */
export async function getPRDetails(repoFullName: string, prNumber: number): Promise<GitHubPRDetails | null> {
  const api = getGitHubApi()
  if (!api) {
    console.warn('GitHub is only available in Electron mode')
    return null
  }
  
  try {
    return await api.getPRDetails(repoFullName, prNumber)
  } catch (error) {
    console.error('Error fetching PR details:', error)
    throw error
  }
}

// ============================================
// ISSUES
// ============================================

/**
 * Fetch issues assigned to you
 */
export async function fetchAssignedIssues(): Promise<GitHubIssue[]> {
  const api = getGitHubApi()
  if (!api) {
    console.warn('GitHub is only available in Electron mode')
    return []
  }
  
  try {
    return await api.fetchAssignedIssues()
  } catch (error) {
    console.error('Error fetching assigned issues:', error)
    throw error
  }
}

/**
 * Fetch Copilot-assigned issues (issues with 'copilot' label assigned to you)
 */
export async function fetchCopilotIssues(): Promise<GitHubIssue[]> {
  const api = getGitHubApi()
  if (!api) {
    console.warn('GitHub is only available in Electron mode')
    return []
  }
  
  try {
    return await api.fetchCopilotIssues()
  } catch (error) {
    console.error('Error fetching Copilot issues:', error)
    throw error
  }
}

/**
 * Get details for a specific issue
 */
export async function getIssueDetails(repoFullName: string, issueNumber: number): Promise<GitHubIssueDetails | null> {
  const api = getGitHubApi()
  if (!api) {
    console.warn('GitHub is only available in Electron mode')
    return null
  }
  
  try {
    return await api.getIssueDetails(repoFullName, issueNumber)
  } catch (error) {
    console.error('Error fetching issue details:', error)
    throw error
  }
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Fetch all GitHub data at once (PRs to review, my PRs, assigned issues)
 * More efficient than calling individual methods separately
 */
export async function fetchAllGitHubData(): Promise<GitHubAllData | null> {
  const api = getGitHubApi()
  if (!api) {
    console.warn('GitHub is only available in Electron mode')
    return null
  }
  
  try {
    return await api.fetchAll()
  } catch (error) {
    console.error('Error fetching all GitHub data:', error)
    throw error
  }
}

// ============================================
// UTILITIES
// ============================================

/**
 * Open a URL in the default browser
 */
export async function openUrl(url: string): Promise<boolean> {
  const api = getGitHubApi()
  if (!api) {
    // Fallback to window.open in browser mode
    window.open(url, '_blank')
    return true
  }
  
  try {
    await api.openUrl(url)
    return true
  } catch (error) {
    console.error('Error opening URL:', error)
    return false
  }
}

/**
 * Open a PR in the browser
 */
export async function openPR(pr: GitHubPR): Promise<boolean> {
  return openUrl(pr.url)
}

/**
 * Open an issue in the browser
 */
export async function openIssue(issue: GitHubIssue): Promise<boolean> {
  return openUrl(issue.url)
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get a summary count of GitHub items needing attention
 */
export interface GitHubSummary {
  prsToReview: number
  myPRs: number
  assignedIssues: number
  total: number
}

export function getGitHubSummary(data: GitHubAllData | null): GitHubSummary {
  if (!data) {
    return {
      prsToReview: 0,
      myPRs: 0,
      assignedIssues: 0,
      total: 0,
    }
  }
  
  return {
    prsToReview: data.prsToReview.length,
    myPRs: data.myPRs.length,
    assignedIssues: data.assignedIssues.length,
    total: data.prsToReview.length + data.myPRs.length + data.assignedIssues.length,
  }
}

/**
 * Format relative time for display
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  
  return date.toLocaleDateString()
}
