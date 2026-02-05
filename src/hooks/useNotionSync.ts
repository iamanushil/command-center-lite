/**
 * React hook for managing Notion sync state
 * 
 * Provides real-time sync status updates and manual sync triggering.
 */

import { useState, useEffect, useCallback } from 'react'
import { isElectron } from '../lib/electron'

export interface SyncStatus {
  source: string
  lastSync: string | null
  status: 'idle' | 'syncing' | 'success' | 'error' | 'partial'
  error: string | null
  duration: number | null
}

export interface SyncResult {
  inbox: number
  recurring: number
  contacts: number
  duration: number
  errors?: Array<{ source: string; error: string }>
  timestamp: string
}

export interface SyncErrorData {
  error: string
  timestamp: string
}

// Internal type for the sync service result from Electron
interface SyncServiceResultInternal {
  success: boolean
  error?: string
  skipped?: boolean
  inbox?: number
  recurring?: number
  contacts?: number
  duration?: number
  errors?: Array<{ source: string; error: string }>
  timestamp?: string
}

// Internal type for sync status from Electron
interface SyncStatusInternal {
  source: string
  lastSync: string | null
  status: string
  error: string | null
  duration: number | null
}

export function useNotionSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncServiceRunning, setIsSyncServiceRunning] = useState(false)

  // Load initial status
  useEffect(() => {
    if (!isElectron() || !window.electronAPI?.notion) {
      return
    }

    const api = window.electronAPI.notion

    // Get initial sync status
    api.getSyncStatus().then((status: SyncStatusInternal | null) => {
      if (status) {
        setSyncStatus({
          ...status,
          status: (status.status as SyncStatus['status']) || 'idle',
        })
      }
    })

    // Check if sync service is running
    api.isSyncRunning().then(setIsSyncServiceRunning)

    // Set up event listeners
    api.onSyncStarted(() => {
      setIsLoading(true)
      setSyncStatus((prev) => prev ? { ...prev, status: 'syncing' } : null)
    })

    api.onSynced((data: SyncServiceResultInternal) => {
      setIsLoading(false)
      if (data.inbox !== undefined && data.recurring !== undefined && data.contacts !== undefined && data.duration !== undefined && data.timestamp) {
        setLastSyncResult({
          inbox: data.inbox,
          recurring: data.recurring,
          contacts: data.contacts,
          duration: data.duration,
          errors: data.errors,
          timestamp: data.timestamp,
        })
      }
      setSyncStatus({
        source: 'notion',
        lastSync: data.timestamp || null,
        status: data.errors && data.errors.length > 0 ? 'partial' : 'success',
        error: data.errors ? data.errors.map(e => `${e.source}: ${e.error}`).join('; ') : null,
        duration: data.duration || null,
      })
    })

    api.onSyncError((data: SyncErrorData) => {
      setIsLoading(false)
      setSyncStatus((prev) => ({
        source: 'notion',
        lastSync: prev?.lastSync || null,
        status: 'error',
        error: data.error,
        duration: null,
      }))
    })

    // Cleanup listeners on unmount
    return () => {
      api.removeSyncListeners()
    }
  }, [])

  // Manual sync trigger
  const syncNow = useCallback(async () => {
    if (!isElectron() || !window.electronAPI?.notion) {
      return { success: false, error: 'Not in Electron environment' }
    }

    setIsLoading(true)
    try {
      const result = await window.electronAPI.notion.syncNow()
      return result
    } catch (error) {
      setIsLoading(false)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: errorMessage }
    }
  }, [])

  // Start sync service
  const startSync = useCallback(async (intervalMinutes?: number) => {
    if (!isElectron() || !window.electronAPI?.notion) {
      return { success: false }
    }

    const result = await window.electronAPI.notion.startSync(intervalMinutes)
    if (result.success) {
      setIsSyncServiceRunning(true)
    }
    return result
  }, [])

  // Stop sync service
  const stopSync = useCallback(async () => {
    if (!isElectron() || !window.electronAPI?.notion) {
      return { success: false }
    }

    const result = await window.electronAPI.notion.stopSync()
    if (result.success) {
      setIsSyncServiceRunning(false)
    }
    return result
  }, [])

  // Format last sync time for display
  const lastSyncTime = syncStatus?.lastSync ? new Date(syncStatus.lastSync) : undefined

  return {
    syncStatus,
    lastSyncResult,
    lastSyncTime,
    isLoading,
    isSyncServiceRunning,
    syncNow,
    startSync,
    stopSync,
  }
}
