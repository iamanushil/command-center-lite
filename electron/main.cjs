const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const { spawn } = require('child_process');
const { loadConfig, saveConfig, getConfig, setConfig, getConfigPath } = require('./config.cjs');
const database = require('./database.cjs');

// Disable GPU features that cause errors on macOS
// Fixes: SharedImageManager::ProduceOverlay and Invalid mailbox errors
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-rasterization');
app.commandLine.appendSwitch('disable-software-rasterizer');
const github = require('./integrations/github.cjs');
const fileReader = require('./integrations/fileReader.cjs');
const elevenlabs = require('./integrations/elevenlabs.cjs');
const calendar = require('./integrations/applecalendar.cjs');

// Writing folder path (relative to Notes folder in workspace)
const WRITING_FOLDER = path.join(process.env.HOME || '', 'Documents', 'Notes', 'projects', 'writing');

// HTTP server for Chrome extension integration
const EXTENSION_API_PORT = 45678;
let extensionApiServer = null;

// Keep a global reference of the window object to prevent garbage collection
let mainWindow = null;
let copilotIssuesProcess = null;

function createWindow() {
  // Initialize database before creating window
  database.initDatabase();
  database.seedInitialData();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1e1e2e', // Catppuccin Mocha base color
    titleBarStyle: 'hiddenInset', // Clean macOS title bar
    icon: path.join(__dirname, '../assets/icon.icns'), // Cat icon
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for better-sqlite3
    },
  });

  // Load Vite dev server in development, built files in production
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Create window when Electron is ready
app.whenReady().then(() => {
  // Set dock icon on macOS (required for development mode)
  // Use PNG as it's more reliably supported by Electron's dock.setIcon
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(path.join(__dirname, '../assets/icons/icon-512.png'));
  }
  
  createWindow();
  checkCalendarAvailability();

  // Auto-sync today's calendar events after window loads
  if (mainWindow) {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => syncCalendarMeetings(), 2000);
    });
  }

  // Re-sync every hour so new events appear without restart
  setInterval(() => syncCalendarMeetings(), 60 * 60 * 1000);
});

// ============================================
// WRITING FILE MANAGEMENT
// ============================================

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
    .replace(/^-|-$/g, '');
}

async function ensureWritingFolder() {
  try {
    await fs.mkdir(WRITING_FOLDER, { recursive: true });
  } catch (error) {
    console.error('Error creating writing folder:', error);
  }
}

async function createWritingItemWithFile(title, platform, initialContent = '') {
  await ensureWritingFolder();
  
  const slug = generateSlug(title);
  const fileName = `${slug}.md`;
  const filePath = path.join(WRITING_FOLDER, fileName);
  
  // Create frontmatter and content
  const now = new Date().toISOString();
  const content = `---
title: "${title}"
platform: ${platform}
status: idea
created: ${now}
---

${initialContent}
`;
  
  // Write the file
  await fs.writeFile(filePath, content, 'utf-8');
  
  // Create database entry
  const item = database.createWritingItem({ title, platform, status: 'idea' }, filePath);
  return item;
}

async function readWritingFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading writing file:', error);
    return null;
  }
}

async function writeWritingFile(filePath, content) {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing file:', error);
    return false;
  }
}

async function deleteWritingFile(filePath) {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting writing file:', error);
    return false;
  }
}

async function scanWritingFolder() {
  await ensureWritingFolder();
  
  try {
    const files = await fs.readdir(WRITING_FOLDER);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    const items = [];
    for (const file of mdFiles) {
      const filePath = path.join(WRITING_FOLDER, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Parse frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const titleMatch = frontmatter.match(/title:\s*"?([^"\n]+)"?/);
        const platformMatch = frontmatter.match(/platform:\s*(\S+)/);
        const statusMatch = frontmatter.match(/status:\s*(\S+)/);
        
        items.push({
          slug: file.replace('.md', ''),
          title: titleMatch ? titleMatch[1] : file.replace('.md', ''),
          platform: platformMatch ? platformMatch[1] : 'other',
          status: statusMatch ? statusMatch[1] : 'idea',
          filePath,
        });
      }
    }
    
    return items;
  } catch (error) {
    console.error('Error scanning writing folder:', error);
    return [];
  }
}

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Close database when app is quitting
app.on('before-quit', () => {
  database.closeDatabase();
});

// Re-create window on macOS when dock icon is clicked
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for future file system and database operations
// These will be expanded as we add SQLite and file system access

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getPlatform', () => {
  return process.platform;
});

// Open external URL in default browser
ipcMain.handle('shell:openExternal', async (_event, url) => {
  return shell.openExternal(url);
});

// Placeholder for future file system operations
ipcMain.handle('fs:readFile', async (_event, filePath) => {
  // Will be implemented when we add file system access
  console.log('fs:readFile called with:', filePath);
  return null;
});

ipcMain.handle('fs:writeFile', async (_event, filePath, data) => {
  // Will be implemented when we add file system access
  console.log('fs:writeFile called with:', filePath);
  return false;
});

// Placeholder for future SQLite operations
ipcMain.handle('db:query', async (_event, sql, params) => {
  // Will be implemented when we add better-sqlite3
  console.log('db:query called with:', sql);
  return [];
});

ipcMain.handle('db:run', async (_event, sql, params) => {
  // Will be implemented when we add better-sqlite3
  console.log('db:run called with:', sql);
  return { changes: 0, lastInsertRowid: 0 };
});

// Config IPC handlers
ipcMain.handle('config:get', (_event, key) => {
  return getConfig(key);
});

ipcMain.handle('config:set', (_event, key, value) => {
  return setConfig(key, value);
});

ipcMain.handle('config:getAll', () => {
  return loadConfig();
});

ipcMain.handle('config:getPath', () => {
  return getConfigPath();
});

// ============================================
// DATABASE IPC HANDLERS
// ============================================

// Database info
ipcMain.handle('db:getPath', () => {
  return database.getDatabasePath();
});

// Tasks
ipcMain.handle('db:tasks:getAll', () => {
  return database.getAllTasks();
});

ipcMain.handle('db:tasks:getById', (_event, id) => {
  return database.getTaskById(id);
});

ipcMain.handle('db:tasks:getActive', () => {
  return database.getActiveTasks();
});

ipcMain.handle('db:tasks:getCompleted', () => {
  return database.getCompletedTasks();
});

ipcMain.handle('db:tasks:create', (_event, task) => {
  return database.createTask(task);
});

ipcMain.handle('db:tasks:update', (_event, id, updates) => {
  return database.updateTask(id, updates);
});

ipcMain.handle('db:tasks:delete', (_event, id) => {
  return database.deleteTask(id);
});

ipcMain.handle('db:tasks:toggle', (_event, id) => {
  return database.toggleTask(id);
});

ipcMain.handle('db:tasks:reorder', (_event, taskIds) => {
  return database.reorderTasks(taskIds);
});

ipcMain.handle('db:tasks:setSyncPriority', (_event, taskId) => {
  return database.setSyncPriority(taskId);
});

ipcMain.handle('db:tasks:getSyncPriority', () => {
  return database.getSyncPriority();
});

// Subtasks
ipcMain.handle('db:subtasks:getForTask', (_event, taskId) => {
  return database.getSubtasksForTask(taskId);
});

ipcMain.handle('db:subtasks:create', (_event, taskId, title) => {
  return database.createSubtask(taskId, title);
});

ipcMain.handle('db:subtasks:update', (_event, id, title) => {
  return database.updateSubtask(id, title);
});

ipcMain.handle('db:subtasks:toggle', (_event, id) => {
  return database.toggleSubtask(id);
});

ipcMain.handle('db:subtasks:delete', (_event, id) => {
  return database.deleteSubtask(id);
});

ipcMain.handle('db:subtasks:reorder', (_event, taskId, subtaskIds) => {
  return database.reorderSubtasks(taskId, subtaskIds);
});

ipcMain.handle('db:subtasks:getSummary', (_event, taskId) => {
  return database.getSubtaskSummary(taskId);
});

ipcMain.handle('db:subtasks:getSummaries', (_event, taskIds) => {
  return database.getSubtaskSummaries(taskIds);
});

// Meetings
ipcMain.handle('db:meetings:getAll', () => {
  return database.getAllMeetings();
});

ipcMain.handle('db:meetings:getToday', () => {
  return database.getTodayMeetings();
});

ipcMain.handle('db:meetings:create', (_event, meeting) => {
  return database.createMeeting(meeting);
});

ipcMain.handle('db:meetings:update', (_event, id, updates) => {
  return database.updateMeeting(id, updates);
});

ipcMain.handle('db:meetings:delete', (_event, id) => {
  // If calendar meeting, dismiss it so auto-sync doesn't re-add it
  const meeting = database.getMeetingById ? database.getMeetingById(id) : null;
  if (meeting?.source === 'calendar' && meeting?.externalId) {
    database.dismissCalendarMeeting(meeting.externalId, meeting.title);
  }
  return database.deleteMeeting(id);
});

ipcMain.handle('db:meetings:toggle', (_event, id) => {
  return database.toggleMeeting(id);
});

// Daily logs
ipcMain.handle('db:dailyLogs:get', (_event, date) => {
  return database.getDailyLog(date);
});

ipcMain.handle('db:dailyLogs:getToday', () => {
  return database.getTodayLog();
});

ipcMain.handle('db:dailyLogs:upsert', (_event, date, updates) => {
  return database.createOrUpdateDailyLog(date, updates);
});

ipcMain.handle('db:dailyLogs:getRange', (_event, startDate, endDate) => {
  return database.getDailyLogs(startDate, endDate);
});

// Streaks
ipcMain.handle('db:streaks:get', (_event, streakType) => {
  return database.getStreak(streakType);
});

ipcMain.handle('db:streaks:getAll', () => {
  return database.getAllStreaks();
});

ipcMain.handle('db:streaks:update', (_event, streakType) => {
  return database.updateStreak(streakType);
});

// Weekly Metrics
ipcMain.handle('db:weeklyMetrics:get', (_event, year, week) => {
  return database.getWeeklyMetrics(year, week);
});

ipcMain.handle('db:weeklyMetrics:getRecent', (_event, numWeeks) => {
  return database.getRecentWeeklyMetrics(numWeeks);
});

ipcMain.handle('db:weeklyMetrics:compute', (_event, year, week) => {
  return database.computeWeeklyMetrics(year, week);
});

// Contacts
ipcMain.handle('db:contacts:getAll', () => {
  return database.getAllContacts();
});

ipcMain.handle('db:contacts:upsert', (_event, contact) => {
  return database.upsertContact(contact);
});

ipcMain.handle('db:contacts:clearCache', () => {
  return database.clearContactsCache();
});

ipcMain.handle('db:contacts:getById', (_event, id) => {
  return database.getContactById(id);
});

ipcMain.handle('db:contacts:update', (_event, id, updates) => {
  return database.updateContact(id, updates);
});

ipcMain.handle('db:contacts:delete', (_event, id) => {
  return database.deleteContact(id);
});

ipcMain.handle('db:contacts:search', (_event, query) => {
  return database.searchContacts(query);
});

// Contact snoozes
ipcMain.handle('db:contacts:snooze', (_event, contactId, snoozeUntil) => {
  return database.snoozeContact(contactId, snoozeUntil);
});

ipcMain.handle('db:contacts:snoozeUntilTomorrow', (_event, contactId) => {
  return database.snoozeContactUntilTomorrow(contactId);
});

ipcMain.handle('db:contacts:getSnooze', (_event, contactId) => {
  return database.getContactSnooze(contactId);
});

ipcMain.handle('db:contacts:unsnooze', (_event, contactId) => {
  return database.unsnoozeContact(contactId);
});

ipcMain.handle('db:contacts:getSnoozed', () => {
  return database.getSnoozedContacts();
});

ipcMain.handle('db:contacts:isSnoozed', (_event, contactId) => {
  return database.isContactSnoozed(contactId);
});

ipcMain.handle('db:contacts:clearExpiredSnoozes', () => {
  return database.clearExpiredSnoozes();
});

// Meeting-Contact linking
ipcMain.handle('db:meetingContacts:link', (_event, meetingId, contactId) => {
  return database.linkContactToMeeting(meetingId, contactId);
});

ipcMain.handle('db:meetingContacts:unlink', (_event, meetingId, contactId) => {
  return database.unlinkContactFromMeeting(meetingId, contactId);
});

ipcMain.handle('db:meetingContacts:getForMeeting', (_event, meetingId) => {
  return database.getContactsForMeeting(meetingId);
});

ipcMain.handle('db:meetingContacts:getForContact', (_event, contactId) => {
  return database.getMeetingsForContact(contactId);
});

ipcMain.handle('db:meetingContacts:setForMeeting', (_event, meetingId, contactIds) => {
  return database.setMeetingContacts(meetingId, contactIds);
});

// Sync status
ipcMain.handle('db:sync:getStatus', (_event, source) => {
  return database.getSyncStatus(source);
});

ipcMain.handle('db:sync:updateStatus', (_event, source, status, error) => {
  return database.updateSyncStatus(source, status, error);
});

// ============================================
// GOALS IPC HANDLERS
// ============================================

// Goals CRUD
ipcMain.handle('db:goals:create', (_event, goal) => {
  return database.createGoal(goal);
});

ipcMain.handle('db:goals:getById', (_event, id) => {
  return database.getGoalById(id);
});

ipcMain.handle('db:goals:update', (_event, id, updates) => {
  return database.updateGoal(id, updates);
});

ipcMain.handle('db:goals:delete', (_event, id) => {
  return database.deleteGoal(id);
});

ipcMain.handle('db:goals:getAll', () => {
  return database.getAllGoals();
});

ipcMain.handle('db:goals:getByLevel', (_event, level, filters) => {
  return database.getGoalsByLevel(level, filters);
});

ipcMain.handle('db:goals:getActive', () => {
  return database.getActiveGoals();
});

// Goals hierarchy
ipcMain.handle('db:goals:getChildren', (_event, parentId) => {
  return database.getChildGoals(parentId);
});

ipcMain.handle('db:goals:getAncestors', (_event, id) => {
  return database.getGoalAncestors(id);
});

ipcMain.handle('db:goals:getDescendants', (_event, id) => {
  return database.getGoalDescendants(id);
});

// Goals time-based queries
ipcMain.handle('db:goals:getForYear', (_event, year) => {
  return database.getGoalsForYear(year);
});

ipcMain.handle('db:goals:getForSeason', (_event, year, season) => {
  return database.getGoalsForSeason(year, season);
});

ipcMain.handle('db:goals:getForMonth', (_event, year, month) => {
  return database.getGoalsForMonth(year, month);
});

ipcMain.handle('db:goals:getForWeek', (_event, year, week) => {
  return database.getGoalsForWeek(year, week);
});

ipcMain.handle('db:goals:getCurrentWeek', () => {
  return database.getCurrentWeekGoals();
});

// Goal-Task linking
ipcMain.handle('db:goals:linkTask', (_event, goalId, taskId) => {
  return database.linkGoalToTask(goalId, taskId);
});

ipcMain.handle('db:goals:unlinkTask', (_event, goalId, taskId) => {
  return database.unlinkGoalFromTask(goalId, taskId);
});

ipcMain.handle('db:goals:getTasksForGoal', (_event, goalId) => {
  return database.getTasksForGoal(goalId);
});

ipcMain.handle('db:goals:getGoalsForTask', (_event, taskId) => {
  return database.getGoalsForTask(taskId);
});

// Goal progress
ipcMain.handle('db:goals:calculateProgress', (_event, goalId) => {
  return database.calculateGoalProgress(goalId);
});

ipcMain.handle('db:goals:updateProgress', (_event, goalId, progress) => {
  return database.updateGoalProgress(goalId, progress);
});

ipcMain.handle('db:goals:recalculateProgressChain', (_event, goalId) => {
  return database.recalculateGoalProgressChain(goalId);
});

// ============================================
// INBOX IPC HANDLERS
// ============================================

// Inbox CRUD
ipcMain.handle('db:inbox:create', (_event, item) => {
  return database.createInboxItem(item);
});

ipcMain.handle('db:inbox:getById', (_event, id) => {
  return database.getInboxItemById(id);
});

ipcMain.handle('db:inbox:update', (_event, id, updates) => {
  return database.updateInboxItem(id, updates);
});

ipcMain.handle('db:inbox:delete', (_event, id) => {
  return database.deleteInboxItem(id);
});

ipcMain.handle('db:inbox:getPending', () => {
  return database.getPendingInboxItems();
});

ipcMain.handle('db:inbox:getDeferred', () => {
  return database.getDeferredItems();
});

ipcMain.handle('db:inbox:getBySource', (_event, source) => {
  return database.getInboxItemsBySource(source);
});

ipcMain.handle('db:inbox:getCount', () => {
  return database.getInboxCount();
});

ipcMain.handle('db:inbox:getAll', () => {
  return database.getAllInboxItems();
});

// Inbox triage actions
ipcMain.handle('db:inbox:routeToTask', (_event, inboxItemId, taskData) => {
  return database.routeToTask(inboxItemId, taskData);
});

ipcMain.handle('db:inbox:routeToGoal', (_event, inboxItemId, goalId) => {
  return database.routeToGoal(inboxItemId, goalId);
});

ipcMain.handle('db:inbox:markDone', (_event, inboxItemId) => {
  return database.markInboxDone(inboxItemId);
});

ipcMain.handle('db:inbox:dismiss', (_event, inboxItemId) => {
  return database.dismissInboxItem(inboxItemId);
});

ipcMain.handle('db:inbox:defer', (_event, inboxItemId, untilDate) => {
  return database.deferInboxItem(inboxItemId, untilDate);
});

// Triage history
ipcMain.handle('db:inbox:getTriageStats', (_event, startDate, endDate) => {
  return database.getTriageStats(startDate, endDate);
});

ipcMain.handle('db:inbox:getTriageHistory', () => {
  return database.getAllTriageHistory();
});

// Route to writing
ipcMain.handle('db:inbox:routeToWriting', async (_event, inboxItemId, writingData) => {
  const result = database.routeToWriting(inboxItemId, writingData);
  // Create the actual writing item and file
  const writingItem = await createWritingItemWithFile(result.title, result.platform);
  return writingItem;
});

// Route to reading
ipcMain.handle('db:inbox:routeToReading', (_event, inboxItemId, readingData) => {
  return database.routeToReading(inboxItemId, readingData);
});

// ============================================
// WRITING IPC HANDLERS
// ============================================

ipcMain.handle('db:writing:create', async (_event, input) => {
  const item = await createWritingItemWithFile(input.title, input.platform, input.content || '');
  return item;
});

ipcMain.handle('db:writing:getById', (_event, id) => {
  return database.getWritingItemById(id);
});

ipcMain.handle('db:writing:getAll', (_event, filters) => {
  return database.getAllWritingItems(filters || {});
});

ipcMain.handle('db:writing:update', (_event, id, updates) => {
  return database.updateWritingItem(id, updates);
});

ipcMain.handle('db:writing:delete', async (_event, id) => {
  const item = database.getWritingItemById(id);
  if (item && item.filePath) {
    await deleteWritingFile(item.filePath);
  }
  return database.deleteWritingItem(id);
});

ipcMain.handle('db:writing:readContent', async (_event, id) => {
  const item = database.getWritingItemById(id);
  if (!item) return null;
  const content = await readWritingFile(item.filePath);
  return content;
});

ipcMain.handle('db:writing:writeContent', async (_event, id, content) => {
  const item = database.getWritingItemById(id);
  if (!item) return false;
  const success = await writeWritingFile(item.filePath, content);
  if (success) {
    database.updateWritingItem(id, {}); // Update the updated_at timestamp
  }
  return success;
});

ipcMain.handle('db:writing:scan', async () => {
  return await scanWritingFolder();
});

// ============================================
// READING IPC HANDLERS
// ============================================

ipcMain.handle('db:reading:create', (_event, input) => {
  return database.createReadingItem(input);
});

ipcMain.handle('db:reading:getById', (_event, id) => {
  return database.getReadingItemById(id);
});

ipcMain.handle('db:reading:getAll', (_event, filters) => {
  return database.getAllReadingItems(filters || {});
});

ipcMain.handle('db:reading:update', (_event, id, updates) => {
  return database.updateReadingItem(id, updates);
});

ipcMain.handle('db:reading:delete', (_event, id) => {
  return database.deleteReadingItem(id);
});

// ============================================
// PROJECT IPC HANDLERS
// ============================================

ipcMain.handle('db:project:create', (_event, input) => {
  return database.createProjectItem(input);
});

ipcMain.handle('db:project:getById', (_event, id) => {
  return database.getProjectItemById(id);
});

ipcMain.handle('db:project:getAll', (_event, filters) => {
  return database.getAllProjectItems(filters || {});
});

ipcMain.handle('db:project:update', (_event, id, updates) => {
  return database.updateProjectItem(id, updates);
});

ipcMain.handle('db:project:delete', (_event, id) => {
  return database.deleteProjectItem(id);
});

// ============================================
// GITHUB IPC HANDLERS
// ============================================

// Check if gh CLI is available
ipcMain.handle('github:isAvailable', async () => {
  return github.isGhCliAvailable();
});

/**
 * Helper to get full repo names (owner/repo format)
 */
function getFullRepoNames() {
  const config = loadConfig();
  const defaultOrg = config.github?.defaultOrg || 'github';
  const teamRepos = config.github?.teamRepos || [];
  
  // Convert short names to full names (owner/repo)
  return teamRepos.map(repo => {
    // If repo already includes org (has a slash), use as-is
    if (repo.includes('/')) {
      return repo;
    }
    // Otherwise, prepend the default org
    return `${defaultOrg}/${repo}`;
  });
}

// Fetch PRs requesting your review
ipcMain.handle('github:fetchPRsToReview', async () => {
  const repos = getFullRepoNames();
  return github.fetchPRsToReview(repos);
});

// Fetch your authored PRs
ipcMain.handle('github:fetchMyPRs', async () => {
  const repos = getFullRepoNames();
  return github.fetchMyPRs(repos);
});

// Fetch assigned issues
ipcMain.handle('github:fetchAssignedIssues', async () => {
  const repos = getFullRepoNames();
  return github.fetchAssignedIssues(repos);
});

// Fetch Copilot-assigned issues
ipcMain.handle('github:fetchCopilotIssues', async () => {
  const repos = getFullRepoNames();
  return github.fetchCopilotAssignedIssues(repos);
});

// Fetch all GitHub data at once
ipcMain.handle('github:fetchAll', async () => {
  const repos = getFullRepoNames();
  return github.fetchAllGitHubData(repos);
});

// Get PR details
ipcMain.handle('github:getPRDetails', async (_event, repoFullName, prNumber) => {
  return github.getPRDetails(repoFullName, prNumber);
});

// Get issue details
ipcMain.handle('github:getIssueDetails', async (_event, repoFullName, issueNumber) => {
  return github.getIssueDetails(repoFullName, issueNumber);
});

// Open URL in browser
ipcMain.handle('github:openUrl', async (_event, url) => {
  return shell.openExternal(url);
});

// ============================================
// FILE READER IPC HANDLERS
// ============================================

// Read a single markdown file
ipcMain.handle('files:readMarkdown', async (_event, filePath) => {
  return fileReader.readMarkdownFile(filePath);
});

// List all markdown files in a directory
ipcMain.handle('files:listMarkdown', async (_event, directory, recursive = true) => {
  return fileReader.listMarkdownFiles(directory, recursive);
});

// List all project files from notes repo
ipcMain.handle('files:listProjects', async () => {
  const config = loadConfig();
  return fileReader.readProjectFiles(config.paths?.notes);
});

// List all notes files from notes repo
ipcMain.handle('files:listNotes', async (_event, subDirectory = '') => {
  const config = loadConfig();
  return fileReader.readNotesFiles(config.paths?.notes, subDirectory);
});

// Search files in a directory
ipcMain.handle('files:search', async (_event, directory, query) => {
  return fileReader.searchFiles(directory, query);
});

// Search in notes repo
ipcMain.handle('files:searchNotes', async (_event, query) => {
  const config = loadConfig();
  return fileReader.searchFiles(config.paths?.notes, query);
});

// Get file stats
ipcMain.handle('files:getStats', async (_event, filePath) => {
  return fileReader.getFileStats(filePath);
});

// Check if directory exists
ipcMain.handle('files:directoryExists', async (_event, dirPath) => {
  return fileReader.directoryExists(dirPath);
});

// Open file in default editor
ipcMain.handle('files:openInEditor', async (_event, filePath) => {
  return shell.openPath(filePath);
});

// Open file's containing folder
ipcMain.handle('files:showInFolder', async (_event, filePath) => {
  shell.showItemInFolder(filePath);
  return true;
});

// ============================================
// ELEVENLABS IPC HANDLERS
// ============================================

// Check if ElevenLabs is configured
ipcMain.handle('elevenlabs:isConfigured', async () => {
  return elevenlabs.isConfigured();
});

// Convert text to speech
ipcMain.handle('elevenlabs:textToSpeech', async (_event, text, options = {}) => {
  try {
    const audioBuffer = await elevenlabs.textToSpeech(text, options);
    // Convert ArrayBuffer to base64 for IPC transfer
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    return { success: true, audio: base64Audio };
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    return { success: false, error: error.message };
  }
});

// Get available voices
ipcMain.handle('elevenlabs:getVoices', async () => {
  try {
    const voices = await elevenlabs.getVoices();
    return { success: true, voices };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// APPLE CALENDAR IPC HANDLERS
// ============================================

// Check if Apple Calendar is available (macOS only)
ipcMain.handle('calendar:isAvailable', async () => {
  return calendar.isCalendarAvailable();
});

// Fetch today's meetings from Apple Calendar
ipcMain.handle('calendar:fetchTodaysMeetings', async () => {
  return calendar.fetchTodaysMeetings();
});

// Fetch this week's meetings from Apple Calendar
ipcMain.handle('calendar:fetchWeekMeetings', async () => {
  return calendar.fetchWeekMeetings();
});

// Sync meetings from Apple Calendar to database (today)
ipcMain.handle('calendar:syncMeetings', async () => {
  return syncCalendarMeetings();
});

// Sync meetings from Apple Calendar for a specific date
ipcMain.handle('calendar:syncMeetingsForDate', async (_event, dateString) => {
  return syncCalendarMeetingsForDate(dateString);
});

// Fetch meetings from Apple Calendar for selection (returns meetings without adding to database)
ipcMain.handle('calendar:fetchMeetingsForSelection', async (_event, dateString) => {
  return fetchCalendarMeetingsForSelection(dateString);
});

// Add selected meetings to database
ipcMain.handle('calendar:addSelectedMeetings', async (_event, meetings) => {
  return addSelectedMeetings(meetings);
});

// Get blocked meeting patterns
ipcMain.handle('calendar:getBlockedPatterns', async () => {
  return database.getBlockedMeetingPatterns();
});

// Add a blocked meeting pattern
ipcMain.handle('calendar:addBlockedPattern', async (_event, pattern, isRegex = false) => {
  return database.addBlockedMeetingPattern(pattern, isRegex);
});

// Remove a blocked meeting pattern
ipcMain.handle('calendar:removeBlockedPattern', async (_event, id) => {
  return database.removeBlockedMeetingPattern(id);
});

// Block a specific meeting by title (creates a pattern from the title)
ipcMain.handle('calendar:blockMeetingByTitle', async (_event, title) => {
  return database.addBlockedMeetingPattern(title, false);
});

// ============================================
// APPLE CALENDAR SYNC FUNCTIONS
// ============================================

async function syncCalendarMeetings() {
  return syncCalendarMeetingsForDate(null); // null means today
}

async function syncCalendarMeetingsForDate(dateString = null) {
  try {
    const isAvailable = await calendar.isCalendarAvailable();
    if (!isAvailable) {
      console.log('[Calendar] Not available (non-macOS?), skipping sync');
      return { success: false, error: 'Apple Calendar not available', synced: 0 };
    }

    const targetDate = dateString ? new Date(dateString + 'T12:00:00') : new Date();
    const dateLabel = dateString || 'today';

    console.log(`[Calendar] Starting sync for ${dateLabel}...`);

    const blockedPatterns = database.getBlockedMeetingPatterns();
    console.log(`[Calendar] Blocked patterns: ${blockedPatterns.length}`);

    const meetings = await calendar.fetchMeetingsForDateRange(targetDate, targetDate);
    console.log(`[Calendar] Fetched ${meetings.length} events for ${dateLabel}`);

    let syncedCount = 0;
    let skippedCount = 0;
    let blockedCount = 0;
    let updatedCount = 0;

    for (const meeting of meetings) {
      if (calendar.isMeetingBlocked(meeting.title, blockedPatterns)) {
        blockedCount++;
        console.log(`[Calendar] Skipping blocked: ${meeting.title}`);
        continue;
      }

      if (database.isCalendarMeetingDismissed(meeting.externalId)) {
        console.log(`[Calendar] Skipping dismissed: ${meeting.title}`);
        continue;
      }

      const existing = database.getMeetingByExternalId(meeting.externalId);
      if (existing) {
        if (existing.time !== meeting.time || existing.title !== meeting.title || existing.link !== meeting.link) {
          database.updateMeeting(existing.id, {
            time: meeting.time,
            title: meeting.title,
            link: meeting.link,
          });
          updatedCount++;
          console.log(`[Calendar] Updated: ${meeting.title} (${existing.time} → ${meeting.time})`);
        } else {
          skippedCount++;
        }
        continue;
      }

      database.createMeeting({
        title: meeting.title,
        date: meeting.date,
        time: meeting.time,
        category: 'work',
        done: false,
        link: meeting.link,
        source: 'calendar',
        externalId: meeting.externalId,
        calendarName: meeting.calendarName || null,
      });

      syncedCount++;
      console.log(`[Calendar] Synced: ${meeting.title} at ${meeting.time}`);
    }

    console.log(`[Calendar] Done. New: ${syncedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Blocked: ${blockedCount}`);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('calendar:syncComplete', { syncedCount, updatedCount, skippedCount, blockedCount });
    }

    return { success: true, synced: syncedCount, updated: updatedCount, skipped: skippedCount, blocked: blockedCount };
  } catch (error) {
    console.error('[Calendar] Sync error:', error);
    return { success: false, error: error.message, synced: 0 };
  }
}

/**
 * Fetch meetings from Apple Calendar for user selection (doesn't add to database).
 * Returns meetings annotated with status: new | existing | blocked
 */
async function fetchCalendarMeetingsForSelection(dateString = null) {
  try {
    const isAvailable = await calendar.isCalendarAvailable();
    if (!isAvailable) {
      return { success: false, error: 'Apple Calendar not available', meetings: [] };
    }

    const targetDate = dateString ? new Date(dateString + 'T12:00:00') : new Date();
    const dateLabel = dateString || 'today';

    console.log(`[Calendar] Fetching for selection: ${dateLabel}...`);

    const blockedPatterns = database.getBlockedMeetingPatterns();
    const meetings = await calendar.fetchMeetingsForDateRange(targetDate, targetDate);
    console.log(`[Calendar] Fetched ${meetings.length} events`);

    const annotatedMeetings = meetings.map(meeting => {
      const isBlocked = calendar.isMeetingBlocked(meeting.title, blockedPatterns);
      const existing = database.getMeetingByExternalId(meeting.externalId);
      return {
        ...meeting,
        status: isBlocked ? 'blocked' : existing ? 'existing' : 'new',
        existingId: existing?.id || null,
        existingTime: existing?.time || null,
        hasTimeChanged: existing ? existing.time !== meeting.time : false,
      };
    });

    return { success: true, meetings: annotatedMeetings, date: dateString || new Date().toISOString().split('T')[0] };
  } catch (error) {
    console.error('[Calendar] Fetch error:', error);
    return { success: false, error: error.message, meetings: [] };
  }
}

/**
 * Add selected meetings to the database
 */
async function addSelectedMeetings(meetings) {
  try {
    let addedCount = 0;
    let updatedCount = 0;
    
    for (const meeting of meetings) {
      // Check if meeting already exists
      const existing = database.getMeetingByExternalId(meeting.externalId);
      
      if (existing) {
        // Update if time/title/link changed
        if (existing.time !== meeting.time || existing.title !== meeting.title || existing.link !== meeting.link) {
          database.updateMeeting(existing.id, {
            time: meeting.time,
            title: meeting.title,
            link: meeting.link,
          });
          updatedCount++;
        }
      } else {
        // Create new meeting
        database.createMeeting({
          title: meeting.title,
          date: meeting.date,
          time: meeting.time,
          category: 'work',
          done: false,
          link: meeting.link,
          source: 'calendar',
          externalId: meeting.externalId,
        });
        addedCount++;
      }
    }

    console.log(`[Calendar] Added ${addedCount} new meetings, updated ${updatedCount}`);
    return { success: true, added: addedCount, updated: updatedCount };
  } catch (error) {
    console.error('[Calendar] Add meetings error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if Apple Calendar is available (called on startup for logging)
 */
async function checkCalendarAvailability() {
  const isAvailable = await calendar.isCalendarAvailable();
  if (!isAvailable) {
    console.log('[Calendar] Apple Calendar not available (non-macOS?).');
  } else {
    console.log('[Calendar] Apple Calendar available. Use Sync button to fetch events on demand.');
  }
  return isAvailable;
}
