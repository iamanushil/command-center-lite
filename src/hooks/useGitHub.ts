/**
 * React hook for managing GitHub data
 * 
 * Fetches PRs to review, authored PRs, and Copilot-assigned issues
 * using the gh CLI through Electron IPC.
 */

import { useState, useEffect, useCallback } from 'react'
import { isElectron } from '../lib/electron'
import type { GitHubPR, GitHubIssue } from '../lib/github'

export interface UseGitHubResult {
  prsToReview: GitHubPR[]
  myPRs: GitHubPR[]
  assignedIssues: GitHubIssue[]
  copilotIssues: GitHubIssue[]
  isLoading: boolean
  error: string | null
  isAvailable: boolean
  lastFetched: string | null
  refresh: () => Promise<void>
}

export function useGitHub(): UseGitHubResult {
  const [prsToReview, setPrsToReview] = useState<GitHubPR[]>([])
  const [myPRs, setMyPRs] = useState<GitHubPR[]>([])
  const [assignedIssues, setAssignedIssues] = useState<GitHubIssue[]>([])
  const [copilotIssues, setCopilotIssues] = useState<GitHubIssue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAvailable, setIsAvailable] = useState(false)
  const [lastFetched, setLastFetched] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isElectron() || !window.electronAPI?.github) {
      setIsLoading(false)
      setError('GitHub integration is only available in Electron mode')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Check if gh CLI is available
      const available = await window.electronAPI.github.isAvailable()
      setIsAvailable(available)

      if (!available) {
        setError('GitHub CLI (gh) is not installed or not authenticated. Run "gh auth login" to authenticate.')
        setIsLoading(false)
        return
      }

      // Fetch all data in parallel
      const [reviewPRs, authoredPRs, issues, copilot] = await Promise.all([
        window.electronAPI.github.fetchPRsToReview().catch((err: Error) => {
          console.error('Error fetching PRs to review:', err)
          return []
        }),
        window.electronAPI.github.fetchMyPRs().catch((err: Error) => {
          console.error('Error fetching my PRs:', err)
          return []
        }),
        window.electronAPI.github.fetchAssignedIssues().catch((err: Error) => {
          console.error('Error fetching assigned issues:', err)
          return []
        }),
        window.electronAPI.github.fetchCopilotIssues().catch((err: Error) => {
          console.error('Error fetching Copilot issues:', err)
          return []
        }),
      ])

      // Sort PRs to review by CI status (SUCCESS first, then PENDING, then FAILURE)
      const sortedReviewPRs = [...reviewPRs].sort((a, b) => {
        const statusOrder = { SUCCESS: 0, PENDING: 1, FAILURE: 2 }
        const aStatus = (a as GitHubPR & { ciStatus?: string }).ciStatus
        const bStatus = (b as GitHubPR & { ciStatus?: string }).ciStatus
        const aOrder = aStatus ? statusOrder[aStatus as keyof typeof statusOrder] ?? 3 : 3
        const bOrder = bStatus ? statusOrder[bStatus as keyof typeof statusOrder] ?? 3 : 3
        return aOrder - bOrder
      })

      setPrsToReview(sortedReviewPRs)
      setMyPRs(authoredPRs)
      setAssignedIssues(issues)
      setCopilotIssues(copilot)
      setLastFetched(new Date().toISOString())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch GitHub data'
      setError(errorMessage)
      console.error('GitHub fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch data on mount
  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    prsToReview,
    myPRs,
    assignedIssues,
    copilotIssues,
    isLoading,
    error,
    isAvailable,
    lastFetched,
    refresh,
  }
}

/**
 * Get count of PRs waiting more than specified days
 */
export function getPRsWaitingCount(prs: GitHubPR[], days: number = 2): number {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  return prs.filter(pr => new Date(pr.createdAt) < cutoffDate).length
}

/**
 * Check if any PRs have been waiting more than specified days
 */
export function hasOldPRs(prs: GitHubPR[], days: number = 2): boolean {
  return getPRsWaitingCount(prs, days) > 0
}
