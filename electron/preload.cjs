const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),

  // Open external URL in default browser
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // File system operations (for future use)
  fs: {
    readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
  },

  // Database operations
  db: {
    getPath: () => ipcRenderer.invoke('db:getPath'),
    
    // Tasks
    tasks: {
      getAll: () => ipcRenderer.invoke('db:tasks:getAll'),
      getById: (id) => ipcRenderer.invoke('db:tasks:getById', id),
      getActive: () => ipcRenderer.invoke('db:tasks:getActive'),
      getCompleted: () => ipcRenderer.invoke('db:tasks:getCompleted'),
      create: (task) => ipcRenderer.invoke('db:tasks:create', task),
      update: (id, updates) => ipcRenderer.invoke('db:tasks:update', id, updates),
      delete: (id) => ipcRenderer.invoke('db:tasks:delete', id),
      deleteFromCache: (notionId) => ipcRenderer.invoke('db:tasks:deleteFromCache', notionId),
      toggle: (id) => ipcRenderer.invoke('db:tasks:toggle', id),
      reorder: (taskIds) => ipcRenderer.invoke('db:tasks:reorder', taskIds),
      setSyncPriority: (taskId) => ipcRenderer.invoke('db:tasks:setSyncPriority', taskId),
      getSyncPriority: () => ipcRenderer.invoke('db:tasks:getSyncPriority'),
    },
    
    // Subtasks
    subtasks: {
      getForTask: (taskId) => ipcRenderer.invoke('db:subtasks:getForTask', taskId),
      create: (taskId, title) => ipcRenderer.invoke('db:subtasks:create', taskId, title),
      update: (id, title) => ipcRenderer.invoke('db:subtasks:update', id, title),
      toggle: (id) => ipcRenderer.invoke('db:subtasks:toggle', id),
      delete: (id) => ipcRenderer.invoke('db:subtasks:delete', id),
      reorder: (taskId, subtaskIds) => ipcRenderer.invoke('db:subtasks:reorder', taskId, subtaskIds),
      getSummary: (taskId) => ipcRenderer.invoke('db:subtasks:getSummary', taskId),
      getSummaries: (taskIds) => ipcRenderer.invoke('db:subtasks:getSummaries', taskIds),
    },
    
    // Meetings
    meetings: {
      getAll: () => ipcRenderer.invoke('db:meetings:getAll'),
      getToday: () => ipcRenderer.invoke('db:meetings:getToday'),
      create: (meeting) => ipcRenderer.invoke('db:meetings:create', meeting),
      update: (id, updates) => ipcRenderer.invoke('db:meetings:update', id, updates),
      delete: (id) => ipcRenderer.invoke('db:meetings:delete', id),
      toggle: (id) => ipcRenderer.invoke('db:meetings:toggle', id),
    },
    
    // Daily logs
    dailyLogs: {
      get: (date) => ipcRenderer.invoke('db:dailyLogs:get', date),
      getToday: () => ipcRenderer.invoke('db:dailyLogs:getToday'),
      upsert: (date, updates) => ipcRenderer.invoke('db:dailyLogs:upsert', date, updates),
      getRange: (startDate, endDate) => ipcRenderer.invoke('db:dailyLogs:getRange', startDate, endDate),
    },
    
    // Streaks
    streaks: {
      get: (streakType) => ipcRenderer.invoke('db:streaks:get', streakType),
      getAll: () => ipcRenderer.invoke('db:streaks:getAll'),
      update: (streakType) => ipcRenderer.invoke('db:streaks:update', streakType),
    },
    
    // Weekly Metrics
    weeklyMetrics: {
      get: (year, week) => ipcRenderer.invoke('db:weeklyMetrics:get', year, week),
      getRecent: (numWeeks) => ipcRenderer.invoke('db:weeklyMetrics:getRecent', numWeeks),
      compute: (year, week) => ipcRenderer.invoke('db:weeklyMetrics:compute', year, week),
    },
    
    // Contacts
    contacts: {
      getAll: () => ipcRenderer.invoke('db:contacts:getAll'),
      getById: (id) => ipcRenderer.invoke('db:contacts:getById', id),
      upsert: (contact) => ipcRenderer.invoke('db:contacts:upsert', contact),
      update: (id, updates) => ipcRenderer.invoke('db:contacts:update', id, updates),
      delete: (id) => ipcRenderer.invoke('db:contacts:delete', id),
      search: (query) => ipcRenderer.invoke('db:contacts:search', query),
      clearCache: () => ipcRenderer.invoke('db:contacts:clearCache'),
      // Snooze functions
      snooze: (contactId, snoozeUntil) => ipcRenderer.invoke('db:contacts:snooze', contactId, snoozeUntil),
      snoozeUntilTomorrow: (contactId) => ipcRenderer.invoke('db:contacts:snoozeUntilTomorrow', contactId),
      getSnooze: (contactId) => ipcRenderer.invoke('db:contacts:getSnooze', contactId),
      unsnooze: (contactId) => ipcRenderer.invoke('db:contacts:unsnooze', contactId),
      getSnoozed: () => ipcRenderer.invoke('db:contacts:getSnoozed'),
      isSnoozed: (contactId) => ipcRenderer.invoke('db:contacts:isSnoozed', contactId),
      clearExpiredSnoozes: () => ipcRenderer.invoke('db:contacts:clearExpiredSnoozes'),
    },

    // Meeting-Contact linking
    meetingContacts: {
      link: (meetingId, contactId) => ipcRenderer.invoke('db:meetingContacts:link', meetingId, contactId),
      unlink: (meetingId, contactId) => ipcRenderer.invoke('db:meetingContacts:unlink', meetingId, contactId),
      getForMeeting: (meetingId) => ipcRenderer.invoke('db:meetingContacts:getForMeeting', meetingId),
      getForContact: (contactId) => ipcRenderer.invoke('db:meetingContacts:getForContact', contactId),
      setForMeeting: (meetingId, contactIds) => ipcRenderer.invoke('db:meetingContacts:setForMeeting', meetingId, contactIds),
    },
    
    // Sync status
    sync: {
      getStatus: (source) => ipcRenderer.invoke('db:sync:getStatus', source),
      updateStatus: (source, status, error) => ipcRenderer.invoke('db:sync:updateStatus', source, status, error),
    },
    
    // Goals
    goals: {
      // CRUD
      create: (goal) => ipcRenderer.invoke('db:goals:create', goal),
      getById: (id) => ipcRenderer.invoke('db:goals:getById', id),
      update: (id, updates) => ipcRenderer.invoke('db:goals:update', id, updates),
      delete: (id) => ipcRenderer.invoke('db:goals:delete', id),
      getAll: () => ipcRenderer.invoke('db:goals:getAll'),
      getByLevel: (level, filters) => ipcRenderer.invoke('db:goals:getByLevel', level, filters),
      getActive: () => ipcRenderer.invoke('db:goals:getActive'),
      
      // Hierarchy
      getChildren: (parentId) => ipcRenderer.invoke('db:goals:getChildren', parentId),
      getAncestors: (id) => ipcRenderer.invoke('db:goals:getAncestors', id),
      getDescendants: (id) => ipcRenderer.invoke('db:goals:getDescendants', id),
      
      // Time-based queries
      getForYear: (year) => ipcRenderer.invoke('db:goals:getForYear', year),
      getForSeason: (year, season) => ipcRenderer.invoke('db:goals:getForSeason', year, season),
      getForMonth: (year, month) => ipcRenderer.invoke('db:goals:getForMonth', year, month),
      getForWeek: (year, week) => ipcRenderer.invoke('db:goals:getForWeek', year, week),
      getCurrentWeek: () => ipcRenderer.invoke('db:goals:getCurrentWeek'),
      
      // Goal-Task linking
      linkTask: (goalId, taskId) => ipcRenderer.invoke('db:goals:linkTask', goalId, taskId),
      unlinkTask: (goalId, taskId) => ipcRenderer.invoke('db:goals:unlinkTask', goalId, taskId),
      getTasksForGoal: (goalId) => ipcRenderer.invoke('db:goals:getTasksForGoal', goalId),
      getGoalsForTask: (taskId) => ipcRenderer.invoke('db:goals:getGoalsForTask', taskId),
      
      // Progress
      calculateProgress: (goalId) => ipcRenderer.invoke('db:goals:calculateProgress', goalId),
      updateProgress: (goalId, progress) => ipcRenderer.invoke('db:goals:updateProgress', goalId, progress),
      recalculateProgressChain: (goalId) => ipcRenderer.invoke('db:goals:recalculateProgressChain', goalId),
    },
    
    // Inbox items for triage
    inbox: {
      // CRUD
      create: (item) => ipcRenderer.invoke('db:inbox:create', item),
      getById: (id) => ipcRenderer.invoke('db:inbox:getById', id),
      update: (id, updates) => ipcRenderer.invoke('db:inbox:update', id, updates),
      delete: (id) => ipcRenderer.invoke('db:inbox:delete', id),
      
      // Queries
      getPending: () => ipcRenderer.invoke('db:inbox:getPending'),
      getDeferred: () => ipcRenderer.invoke('db:inbox:getDeferred'),
      getBySource: (source) => ipcRenderer.invoke('db:inbox:getBySource', source),
      getCount: () => ipcRenderer.invoke('db:inbox:getCount'),
      getAll: () => ipcRenderer.invoke('db:inbox:getAll'),
      
      // Triage actions
      routeToTask: (inboxItemId, taskData) => ipcRenderer.invoke('db:inbox:routeToTask', inboxItemId, taskData),
      routeToGoal: (inboxItemId, goalId) => ipcRenderer.invoke('db:inbox:routeToGoal', inboxItemId, goalId),
      routeToWriting: (inboxItemId, writingData) => ipcRenderer.invoke('db:inbox:routeToWriting', inboxItemId, writingData),
      routeToReading: (inboxItemId, readingData) => ipcRenderer.invoke('db:inbox:routeToReading', inboxItemId, readingData),
      markDone: (id) => ipcRenderer.invoke('db:inbox:markDone', id),
      dismiss: (id) => ipcRenderer.invoke('db:inbox:dismiss', id),
      defer: (id, until) => ipcRenderer.invoke('db:inbox:defer', id, until),
      
      // Bulk actions
      bulkMarkDone: (ids) => ipcRenderer.invoke('db:inbox:bulkMarkDone', ids),
      bulkDismiss: (ids) => ipcRenderer.invoke('db:inbox:bulkDismiss', ids),
      
      // Stats
      getStats: () => ipcRenderer.invoke('db:inbox:getStats'),
    },

    // Writing items
    writing: {
      create: (input) => ipcRenderer.invoke('db:writing:create', input),
      getById: (id) => ipcRenderer.invoke('db:writing:getById', id),
      getAll: (filters) => ipcRenderer.invoke('db:writing:getAll', filters),
      update: (id, updates) => ipcRenderer.invoke('db:writing:update', id, updates),
      delete: (id) => ipcRenderer.invoke('db:writing:delete', id),
      readContent: (id) => ipcRenderer.invoke('db:writing:readContent', id),
      writeContent: (id, content) => ipcRenderer.invoke('db:writing:writeContent', id, content),
      scan: () => ipcRenderer.invoke('db:writing:scan'),
    },

    // Reading items
    reading: {
      create: (input) => ipcRenderer.invoke('db:reading:create', input),
      getById: (id) => ipcRenderer.invoke('db:reading:getById', id),
      getAll: (filters) => ipcRenderer.invoke('db:reading:getAll', filters),
      update: (id, updates) => ipcRenderer.invoke('db:reading:update', id, updates),
      delete: (id) => ipcRenderer.invoke('db:reading:delete', id),
    },

    // Project items
    projects: {
      create: (input) => ipcRenderer.invoke('db:project:create', input),
      getById: (id) => ipcRenderer.invoke('db:project:getById', id),
      getAll: (filters) => ipcRenderer.invoke('db:project:getAll', filters),
      update: (id, updates) => ipcRenderer.invoke('db:project:update', id, updates),
      delete: (id) => ipcRenderer.invoke('db:project:delete', id),
    },
  },

  // Config operations
  config: {
    get: (key) => ipcRenderer.invoke('config:get', key),
    set: (key, value) => ipcRenderer.invoke('config:set', key, value),
    getAll: () => ipcRenderer.invoke('config:getAll'),
    getPath: () => ipcRenderer.invoke('config:getPath'),
  },

  // GitHub operations (uses gh CLI)
  github: {
    isAvailable: () => ipcRenderer.invoke('github:isAvailable'),
    fetchPRsToReview: () => ipcRenderer.invoke('github:fetchPRsToReview'),
    fetchMyPRs: () => ipcRenderer.invoke('github:fetchMyPRs'),
    fetchAssignedIssues: () => ipcRenderer.invoke('github:fetchAssignedIssues'),
    fetchCopilotIssues: () => ipcRenderer.invoke('github:fetchCopilotIssues'),
    fetchAll: () => ipcRenderer.invoke('github:fetchAll'),
    getPRDetails: (repoFullName, prNumber) => ipcRenderer.invoke('github:getPRDetails', repoFullName, prNumber),
    getIssueDetails: (repoFullName, issueNumber) => ipcRenderer.invoke('github:getIssueDetails', repoFullName, issueNumber),
    openUrl: (url) => ipcRenderer.invoke('github:openUrl', url),
  },

  // File reader operations (local markdown files)
  files: {
    readMarkdown: (filePath) => ipcRenderer.invoke('files:readMarkdown', filePath),
    listMarkdown: (directory, recursive) => ipcRenderer.invoke('files:listMarkdown', directory, recursive),
    listProjects: () => ipcRenderer.invoke('files:listProjects'),
    listNotes: (subDirectory) => ipcRenderer.invoke('files:listNotes', subDirectory),
    search: (directory, query) => ipcRenderer.invoke('files:search', directory, query),
    searchNotes: (query) => ipcRenderer.invoke('files:searchNotes', query),
    getStats: (filePath) => ipcRenderer.invoke('files:getStats', filePath),
    directoryExists: (dirPath) => ipcRenderer.invoke('files:directoryExists', dirPath),
    openInEditor: (filePath) => ipcRenderer.invoke('files:openInEditor', filePath),
    showInFolder: (filePath) => ipcRenderer.invoke('files:showInFolder', filePath),
  },

  // ElevenLabs text-to-speech
  elevenlabs: {
    isConfigured: () => ipcRenderer.invoke('elevenlabs:isConfigured'),
    textToSpeech: (text, options) => ipcRenderer.invoke('elevenlabs:textToSpeech', text, options),
    getVoices: () => ipcRenderer.invoke('elevenlabs:getVoices'),
  },

  // Apple Calendar sync
  calendar: {
    isAvailable: () => ipcRenderer.invoke('calendar:isAvailable'),
    fetchTodaysMeetings: () => ipcRenderer.invoke('calendar:fetchTodaysMeetings'),
    fetchWeekMeetings: () => ipcRenderer.invoke('calendar:fetchWeekMeetings'),
    syncMeetings: () => ipcRenderer.invoke('calendar:syncMeetings'),
    syncMeetingsForDate: (dateString) => ipcRenderer.invoke('calendar:syncMeetingsForDate', dateString),
    fetchMeetingsForSelection: (dateString) => ipcRenderer.invoke('calendar:fetchMeetingsForSelection', dateString),
    addSelectedMeetings: (meetings) => ipcRenderer.invoke('calendar:addSelectedMeetings', meetings),
    getBlockedPatterns: () => ipcRenderer.invoke('calendar:getBlockedPatterns'),
    addBlockedPattern: (pattern, isRegex) => ipcRenderer.invoke('calendar:addBlockedPattern', pattern, isRegex),
    removeBlockedPattern: (id) => ipcRenderer.invoke('calendar:removeBlockedPattern', id),
    blockMeetingByTitle: (title) => ipcRenderer.invoke('calendar:blockMeetingByTitle', title),
    onSyncComplete: (callback) => {
      ipcRenderer.on('calendar:syncComplete', (_event, data) => callback(data));
    },
    removeSyncCompleteListener: () => {
      ipcRenderer.removeAllListeners('calendar:syncComplete');
    },
  },

  // Event listeners for main process events
  onMainMessage: (callback) => {
    ipcRenderer.on('main:message', (_event, ...args) => callback(...args));
  },

  // Inbox refresh event (from Chrome extension)
  onInboxRefresh: (callback) => {
    ipcRenderer.on('inbox:refresh', () => callback());
  },
  removeInboxRefreshListener: () => {
    ipcRenderer.removeAllListeners('inbox:refresh');
  },

  // Remove listeners
  removeMainMessageListener: () => {
    ipcRenderer.removeAllListeners('main:message');
  },
});
