/**
 * WorkIQ integration utilities
 * Frontend helpers for the WorkIQ (Copilot CLI) calendar sync
 */

import { isElectron } from './electron'

/**
 * Check if WorkIQ is available
 */
export async function isWorkiqAvailable(): Promise<boolean> {
  if (!isElectron()) return false
  
  try {
    return await window.electronAPI?.workiq?.isAvailable() ?? false
  } catch {
    return false
  }
}

/**
 * Trigger a manual sync of meetings from WorkIQ
 */
export async function syncMeetings(): Promise<{ success: boolean; synced: number; error?: string }> {
  if (!isElectron()) {
    return { success: false, synced: 0, error: 'Not in Electron' }
  }
  
  try {
    return await window.electronAPI?.workiq?.syncMeetings() ?? { success: false, synced: 0 }
  } catch (error) {
    return { success: false, synced: 0, error: String(error) }
  }
}

/**
 * Block a meeting title from future syncs
 */
export async function blockMeetingTitle(title: string): Promise<boolean> {
  if (!isElectron()) return false
  
  try {
    await window.electronAPI?.workiq?.blockMeetingByTitle(title)
    return true
  } catch {
    return false
  }
}

/**
 * Get all blocked meeting patterns
 */
export async function getBlockedPatterns(): Promise<Array<{ id: string; pattern: string; isRegex: boolean }>> {
  if (!isElectron()) return []
  
  try {
    return await window.electronAPI?.workiq?.getBlockedPatterns() ?? []
  } catch {
    return []
  }
}

/**
 * Remove a blocked meeting pattern
 */
export async function removeBlockedPattern(id: string): Promise<boolean> {
  if (!isElectron()) return false
  
  try {
    return await window.electronAPI?.workiq?.removeBlockedPattern(id) ?? false
  } catch {
    return false
  }
}

/**
 * Listen for sync complete events
 */
export function onSyncComplete(callback: (data: { syncedCount: number; skippedCount: number; blockedCount: number }) => void): void {
  if (!isElectron()) return
  
  window.electronAPI?.workiq?.onSyncComplete(callback)
}

/**
 * Remove sync complete listener
 */
export function removeSyncCompleteListener(): void {
  if (!isElectron()) return
  
  window.electronAPI?.workiq?.removeSyncCompleteListener()
}
