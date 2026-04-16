/**
 * Apple Calendar integration utilities
 * Frontend helpers for the Apple Calendar sync
 */

import { isElectron } from './electron'

export async function isWorkiqAvailable(): Promise<boolean> {
  if (!isElectron()) return false
  try {
    return await window.electronAPI?.calendar?.isAvailable() ?? false
  } catch {
    return false
  }
}

export async function syncMeetings(): Promise<{ success: boolean; synced: number; error?: string }> {
  if (!isElectron()) {
    return { success: false, synced: 0, error: 'Not in Electron' }
  }
  try {
    return await window.electronAPI?.calendar?.syncMeetings() ?? { success: false, synced: 0 }
  } catch (error) {
    return { success: false, synced: 0, error: String(error) }
  }
}

export async function blockMeetingTitle(title: string): Promise<boolean> {
  if (!isElectron()) return false
  try {
    await window.electronAPI?.calendar?.blockMeetingByTitle(title)
    return true
  } catch {
    return false
  }
}

export async function getBlockedPatterns(): Promise<Array<{ id: string; pattern: string; isRegex: boolean }>> {
  if (!isElectron()) return []
  try {
    return await window.electronAPI?.calendar?.getBlockedPatterns() ?? []
  } catch {
    return []
  }
}

export async function removeBlockedPattern(id: string): Promise<boolean> {
  if (!isElectron()) return false
  try {
    return await window.electronAPI?.calendar?.removeBlockedPattern(id) ?? false
  } catch {
    return false
  }
}

export function onSyncComplete(callback: (data: { syncedCount: number; skippedCount: number; blockedCount: number }) => void): void {
  if (!isElectron()) return
  window.electronAPI?.calendar?.onSyncComplete(callback)
}

export function removeSyncCompleteListener(): void {
  if (!isElectron()) return
  window.electronAPI?.calendar?.removeSyncCompleteListener()
}
