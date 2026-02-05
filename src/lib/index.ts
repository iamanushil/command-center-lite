export { AppProvider, AppContext, type AppContextType } from './AppContext'
export { useApp, useTasks, useSyncPriority, useMeetings } from './useAppHooks'
export {
  getCategoryColor,
  getCategoryBadgeColor,
  generateId,
  getGreeting,
  formatDate,
  getDaysUntil,
} from './utils'
export { isElectron, getAppVersion, getPlatform, fs, onMainMessage } from './electron'
export * as db from './db'
export { isDatabaseAvailable, getDatabasePath } from './db'
export * as workiq from './workiq'
export {
  isWorkiqAvailable,
  syncMeetings as workiqSyncMeetings,
  blockMeetingTitle,
  getBlockedPatterns,
  removeBlockedPattern,
  onSyncComplete as onWorkiqSyncComplete,
  removeSyncCompleteListener as removeWorkiqSyncCompleteListener,
} from './workiq'
