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
export * as calendar from './workiq'
export {
  isWorkiqAvailable,
  syncMeetings as calendarSyncMeetings,
  blockMeetingTitle,
  getBlockedPatterns,
  removeBlockedPattern,
  onSyncComplete as onCalendarSyncComplete,
  removeSyncCompleteListener as removeCalendarSyncCompleteListener,
} from './workiq'
