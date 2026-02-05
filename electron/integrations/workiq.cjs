/**
 * WorkIQ Integration
 * 
 * Uses the Copilot CLI with the workiq plugin to fetch Microsoft 365 calendar data.
 * This integration syncs meetings from your work calendar into the command center.
 * 
 * Prerequisites:
 * - GitHub Copilot CLI installed (comes with VS Code Copilot Chat extension)
 * - workiq plugin installed in Copilot CLI (`copilot` then install workiq from marketplace)
 */

const { exec, spawn } = require('child_process');
const util = require('util');
const path = require('path');
const os = require('os');
const fs = require('fs');
const execAsync = util.promisify(exec);

// Path to meeting filter config
const MEETING_FILTERS_PATH = path.join(__dirname, '..', 'config', 'meeting-filters.json');

/**
 * Load meeting exclusion patterns from config file
 * @returns {string[]} Array of patterns to exclude (case-insensitive matching)
 */
function loadExcludePatterns() {
  try {
    if (fs.existsSync(MEETING_FILTERS_PATH)) {
      const config = JSON.parse(fs.readFileSync(MEETING_FILTERS_PATH, 'utf8'));
      return config.excludePatterns || [];
    }
  } catch (error) {
    console.error('[WorkIQ] Error loading meeting filters:', error.message);
  }
  return [];
}

/**
 * Check if a meeting title should be excluded based on configured patterns
 * @param {string} title - The meeting title to check
 * @returns {boolean} True if the meeting should be excluded
 */
function shouldExcludeMeeting(title) {
  const patterns = loadExcludePatterns();
  const lowerTitle = title.toLowerCase();
  
  for (const pattern of patterns) {
    if (lowerTitle.includes(pattern.toLowerCase())) {
      console.log(`[WorkIQ] Excluding meeting "${title}" - matches pattern "${pattern}"`);
      return true;
    }
  }
  return false;
}

/**
 * Get local date string in YYYY-MM-DD format (respecting local timezone)
 * @param {Date} date 
 * @returns {string}
 */
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Known paths where Copilot CLI might be installed
const COPILOT_CLI_PATHS = [
  // VS Code Copilot Chat extension path
  path.join(os.homedir(), 'Library/Application Support/Code/User/globalStorage/github.copilot-chat/copilotCli/copilot'),
  // Potential other locations
  path.join(os.homedir(), '.local/bin/copilot'),
  path.join(os.homedir(), 'bin/copilot'),
  '/usr/local/bin/copilot',
  '/usr/local/bin/workiq',
  '/usr/local/bin/copilot-cli',
];

// Path to copilot config to check for workiq plugin
const COPILOT_CONFIG_PATH = path.join(os.homedir(), '.copilot/config.json');

/**
 * Find the Copilot CLI executable
 */
function findCopilotCli() {
  // First check known paths
  for (const cliPath of COPILOT_CLI_PATHS) {
    if (fs.existsSync(cliPath)) {
      return cliPath;
    }
  }
  return null;
}

/**
 * Check if workiq plugin is installed in Copilot
 */
function isWorkiqPluginInstalled() {
  try {
    if (!fs.existsSync(COPILOT_CONFIG_PATH)) {
      return false;
    }
    const config = JSON.parse(fs.readFileSync(COPILOT_CONFIG_PATH, 'utf8'));
    const plugins = config.installed_plugins || [];
    return plugins.some(p => p.name === 'workiq' && p.enabled);
  } catch (error) {
    console.error('[WorkIQ] Error checking plugin status:', error.message);
    return false;
  }
}

/**
 * Check if workiq CLI is installed and available
 */
async function isWorkiqAvailable() {
  // Check if Copilot CLI exists
  const cliPath = findCopilotCli();
  if (!cliPath) {
    // Fall back to checking PATH
    try {
      await execAsync('which copilot');
    } catch {
      console.log('[WorkIQ] Copilot CLI not found');
      return false;
    }
  }
  
  // Check if workiq plugin is installed
  if (!isWorkiqPluginInstalled()) {
    console.log('[WorkIQ] workiq plugin not installed or not enabled in Copilot CLI');
    return false;
  }
  
  return true;
}

/**
 * Get the Copilot CLI path
 */
function getCopilotCliPath() {
  // Check known paths first
  const cliPath = findCopilotCli();
  if (cliPath) {
    return cliPath;
  }
  
  // Fall back - assume it's in PATH
  return 'copilot';
}

/**
 * Execute a workiq query using the Copilot CLI in non-interactive mode
 * @param {string} query - The natural language query for workiq
 * @returns {Promise<string>} - Raw response from workiq
 */
async function executeWorkiqQuery(query) {
  const cliPath = getCopilotCliPath();
  
  return new Promise((resolve, reject) => {
    console.log(`[WorkIQ] Starting Copilot CLI: ${cliPath}`);
    console.log(`[WorkIQ] Query: ${query}`);
    
    // Use non-interactive mode with -p flag and --allow-all-tools for automated use
    // Also use -s (silent) to get cleaner output
    const args = [
      '-p', query,
      '--allow-all-tools',
      '-s'  // Silent mode - only outputs the response
    ];
    
    console.log(`[WorkIQ] Running: copilot ${args.join(' ')}`);
    
    const copilot = spawn(cliPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      timeout: 120000, // 2 minute timeout
    });
    
    let stdout = '';
    let stderr = '';
    
    // Set a timeout for the entire operation
    const timeout = setTimeout(() => {
      console.log('[WorkIQ] Query timed out, killing process');
      copilot.kill();
      reject(new Error('WorkIQ query timed out after 2 minutes'));
    }, 120000);
    
    copilot.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      // Log chunks for debugging
      if (text.length > 20) {
        console.log('[WorkIQ] Received response chunk:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
      }
    });
    
    copilot.stderr.on('data', (data) => {
      stderr += data.toString();
      // Only log errors, not progress messages
      const msg = data.toString().trim();
      if (msg && !msg.includes('Thinking') && !msg.includes('...')) {
        console.log('[WorkIQ] stderr:', msg);
      }
    });
    
    copilot.on('close', (code) => {
      clearTimeout(timeout);
      console.log(`[WorkIQ] Process exited with code ${code}`);
      console.log(`[WorkIQ] Response length: ${stdout.length} chars`);
      
      if (code !== 0 && stderr && !stdout) {
        reject(new Error(`WorkIQ error (code ${code}): ${stderr}`));
      } else {
        resolve(stdout.trim());
      }
    });
    
    copilot.on('error', (error) => {
      clearTimeout(timeout);
      console.error('[WorkIQ] Process error:', error.message);
      reject(error);
    });
  });
}

/**
 * Parse meeting data from workiq response
 * @param {string} response - Raw response from workiq
 * @returns {Array<{title: string, timeStr: string, dateStr: string | null, link: string | null}>}
 */
function parseMeetingsFromResponse(response) {
  const meetings = [];
  
  console.log('[WorkIQ] Parsing response:', response.substring(0, 500));
  
  // Split response into lines and look for meeting patterns
  const lines = response.split('\n');
  
  // The workiq response format tends to be:
  // **Meeting Title**
  // - **Time:** HH:MM AM/PM – HH:MM AM/PM
  // OR
  // "Meeting Title" at HH:MM AM/PM
  // OR
  // - Meeting Title - HH:MM AM/PM
  
  let currentMeeting = null;
  let currentDate = null; // Track current date context for multi-day responses
  
  // Date patterns to look for
  const datePatterns = [
    // "Wednesday, February 4" or "February 4, 2026"
    /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i,
    // "2/4/2026" or "02/04/2026"
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    // "2026-02-04"
    /(\d{4})-(\d{2})-(\d{2})/,
  ];
  
  const monthToNum = {
    'january': 0, 'february': 1, 'march': 2, 'april': 3,
    'may': 4, 'june': 5, 'july': 6, 'august': 7,
    'september': 8, 'october': 9, 'november': 10, 'december': 11
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Check if line contains a date header (for multi-day responses)
    for (const datePattern of datePatterns) {
      const dateMatch = line.match(datePattern);
      if (dateMatch) {
        let year, month, day;
        
        if (dateMatch[0].includes('/')) {
          // MM/DD/YYYY format
          month = parseInt(dateMatch[1], 10) - 1;
          day = parseInt(dateMatch[2], 10);
          year = parseInt(dateMatch[3], 10);
        } else if (dateMatch[0].includes('-')) {
          // YYYY-MM-DD format
          year = parseInt(dateMatch[1], 10);
          month = parseInt(dateMatch[2], 10) - 1;
          day = parseInt(dateMatch[3], 10);
        } else {
          // Month Day, Year format
          month = monthToNum[dateMatch[1].toLowerCase()];
          day = parseInt(dateMatch[2], 10);
          year = dateMatch[3] ? parseInt(dateMatch[3], 10) : new Date().getFullYear();
        }
        
        const parsedDate = new Date(year, month, day);
        currentDate = getLocalDateString(parsedDate);
        break;
      }
    }
    
    // Pattern 1: Bold title line like **Meeting Title** or **:emoji: Meeting Title:**
    const boldTitleMatch = line.match(/^\*\*([^*]+)\*\*\s*:?\s*$/);
    if (boldTitleMatch) {
      // Clean up emoji patterns like :pair: :copilot:
      let title = boldTitleMatch[1]
        .replace(/:[a-z_]+:/g, '') // Remove :emoji: patterns
        .replace(/^\s*on\s+/i, '') // Remove "on " prefix
        .trim();
      
      if (title.length > 0) {
        currentMeeting = {
          title: title,
          timeStr: null,
          dateStr: currentDate,
          link: null,
        };
      }
      continue;
    }
    
    // Pattern 2: Time line like "- **Time:** 12:30 PM – 1:00 PM" or "**Time:** 12:30 PM"
    const timeLineMatch = line.match(/\*\*Time:\*\*\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (timeLineMatch && currentMeeting) {
      currentMeeting.timeStr = timeLineMatch[1];
      currentMeeting.dateStr = currentDate;
      // If we have title and time, save the meeting
      if (currentMeeting.title && currentMeeting.timeStr) {
        meetings.push({ ...currentMeeting });
        currentMeeting = null;
      }
      continue;
    }
    
    // Pattern 3: Inline format "Meeting Title at HH:MM AM/PM" or "1:1 with Person at HH:MM"
    const inlineMatch = line.match(/(?:^[\-•]\s*)?(.+?)\s+at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (inlineMatch) {
      let title = inlineMatch[1]
        .replace(/^\*\*/g, '')
        .replace(/\*\*$/g, '')
        .replace(/^["']|["']$/g, '')
        .trim();
      
      if (title.length > 2) {
        meetings.push({
          title: title,
          timeStr: inlineMatch[2],
          dateStr: currentDate,
          link: null,
        });
      }
      continue;
    }
    
    // Pattern 4: Simple time pattern on same line "Meeting - 9:00 AM" or "9:00 AM - Meeting"
    const simpleTimeMatch = line.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (simpleTimeMatch) {
      let title = line
        .replace(/^[\-•*]\s*/, '') // Remove bullet
        .replace(/\*\*/g, '') // Remove bold markers
        .replace(/\d{1,2}:\d{2}\s*(?:AM|PM)?\s*[–-]\s*\d{1,2}:\d{2}\s*(?:AM|PM)?/gi, '') // Remove time ranges
        .replace(/\d{1,2}:\d{2}\s*(?:AM|PM)?/gi, '') // Remove times
        .replace(/^[\s\-–:]+|[\s\-–:]+$/g, '') // Trim separators
        .trim();
      
      // Skip if no meaningful title
      if (title && title.length > 2 && !title.toLowerCase().includes('time')) {
        meetings.push({
          title: title,
          timeStr: simpleTimeMatch[1],
          dateStr: currentDate,
          link: null,
        });
      }
      continue;
    }
    
    // Look for meeting links (Teams, Zoom, Google Meet, etc.) to attach to previous meeting
    const linkPattern = /(https?:\/\/(?:teams\.microsoft\.com|zoom\.us|meet\.google\.com|.*\.webex\.com|app\.cal\.com|.*\.chime\.aws)[^\s)>\]"']*)/i;
    const linkMatch = line.match(linkPattern);
    if (linkMatch && meetings.length > 0) {
      const lastMeeting = meetings[meetings.length - 1];
      if (!lastMeeting.link) {
        lastMeeting.link = linkMatch[1];
      }
    }
  }
  
  console.log(`[WorkIQ] Parsed ${meetings.length} meetings:`, meetings.map(m => `${m.title} (${m.dateStr || 'no date'})`).join(', '));
  return meetings;
}

/**
 * Fetch meetings for a specific date range
 * @param {Date} startDate - Start of the date range
 * @param {Date} endDate - End of the date range (optional, defaults to same day)
 * @returns {Promise<Array<{title: string, date: string, time: string, link: string | null}>>}
 */
async function fetchMeetingsForDateRange(startDate, endDate = null) {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;
  
  // Format dates for the query using local timezone
  const formatDate = (d) => {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  };
  
  const isSingleDay = start.toDateString() === end.toDateString();
  
  let query;
  if (isSingleDay) {
    // Single day query
    const isToday = start.toDateString() === new Date().toDateString();
    query = isToday 
      ? "Using the workiq tool, please get my work calendar meetings for today only (not tomorrow). For each meeting, list: the meeting title (not just 'Microsoft Teams Meeting'), start time, and the full meeting join link URL if available. Format each meeting on its own line."
      : `Using the workiq tool, please get my work calendar meetings for ${formatDate(start)} only. For each meeting, list: the meeting title (not just 'Microsoft Teams Meeting'), start time, and the full meeting join link URL if available. Format each meeting on its own line.`;
  } else {
    query = `Using the workiq tool, please get my work calendar meetings from ${formatDate(start)} to ${formatDate(end)}. For each meeting, include: the meeting title (not just 'Microsoft Teams Meeting'), date, start time, and the full meeting join link URL if available. Format each meeting on its own line with the date clearly indicated.`;
  }
  
  const response = await executeWorkiqQuery(query);
  const parsedMeetings = parseMeetingsFromResponse(response);
  
  // Use local date string (not UTC)
  const defaultDateStr = getLocalDateString(start);
  
  console.log(`[WorkIQ] Processing meetings. Single day: ${isSingleDay}, Default date: ${defaultDateStr}`);
  
  // Convert parsed meetings to our format and filter out excluded patterns
  const allMeetings = parsedMeetings.map(meeting => {
    // Parse the time string to 24-hour format
    const time = parseTimeString(meeting.timeStr);
    
    // Use parsed date if available, otherwise use start date
    // For single-day queries, always use the requested date
    const dateStr = isSingleDay ? defaultDateStr : (meeting.dateStr || defaultDateStr);
    
    // Clean up the title and extract any embedded link
    const { title: cleanTitle, embeddedLink } = cleanMeetingTitle(meeting.title);
    
    // Use embedded link if found, otherwise use the link from parsing
    const link = embeddedLink || meeting.link;
    
    console.log(`[WorkIQ] Meeting: "${cleanTitle}" -> Date: ${dateStr}, Time: ${time}, Link: ${link ? 'yes' : 'no'}`);
    
    return {
      title: cleanTitle,
      date: dateStr,
      time: time,
      link: link,
      externalId: generateExternalId(cleanTitle, dateStr, time),
    };
  });

  // Filter out excluded meetings
  const filteredMeetings = allMeetings.filter(meeting => !shouldExcludeMeeting(meeting.title));
  
  if (filteredMeetings.length < allMeetings.length) {
    console.log(`[WorkIQ] Filtered out ${allMeetings.length - filteredMeetings.length} meetings based on exclusion patterns`);
  }
  
  return filteredMeetings;
}

/**
 * Fetch today's meetings
 * @returns {Promise<Array<{title: string, date: string, time: string, link: string | null}>>}
 */
async function fetchTodaysMeetings() {
  return fetchMeetingsForDateRange(new Date());
}

/**
 * Fetch this week's meetings
 * @returns {Promise<Array<{title: string, date: string, time: string, link: string | null}>>}
 */
async function fetchWeekMeetings() {
  const today = new Date();
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (5 - today.getDay())); // Friday
  
  return fetchMeetingsForDateRange(today, endOfWeek);
}

/**
 * Parse a time string like "9:00 AM" or "14:30" to "HH:MM" 24-hour format
 * @param {string} timeStr 
 * @returns {string}
 */
function parseTimeString(timeStr) {
  if (!timeStr) return '09:00';
  
  const normalized = timeStr.trim().toUpperCase();
  
  // Check for AM/PM format
  const ampmMatch = normalized.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const period = ampmMatch[3];
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // Check for 24-hour format
  const militaryMatch = normalized.match(/(\d{1,2}):(\d{2})/);
  if (militaryMatch) {
    const hours = parseInt(militaryMatch[1], 10);
    const minutes = parseInt(militaryMatch[2], 10);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  return '09:00'; // Default if parsing fails
}

/**
 * Clean up meeting title and extract embedded link
 * Handles formats like: 
 *   "Meeting Title | | https://app.cal.com/..."
 *   "1. Meeting Title — — No join link"
 *   "Microsoft Teams Meeting" titles with embedded links
 * @param {string} title - Raw meeting title
 * @returns {{title: string, embeddedLink: string | null}}
 */
function cleanMeetingTitle(title) {
  if (!title) return { title: '', embeddedLink: null };
  
  let cleanTitle = title;
  let embeddedLink = null;
  
  // Common meeting link patterns
  const meetingLinkPattern = /https?:\/\/(?:teams\.microsoft\.com|zoom\.us|meet\.google\.com|.*\.webex\.com|app\.cal\.com|.*\.chime\.aws)[^\s)>\]"']*/i;
  
  // Extract any URL first
  const urlMatch = cleanTitle.match(meetingLinkPattern);
  if (urlMatch) {
    embeddedLink = urlMatch[0];
    cleanTitle = cleanTitle.replace(embeddedLink, '');
  }
  
  // Remove leading number prefix (e.g., "1. ", "2. ", "10. ")
  cleanTitle = cleanTitle.replace(/^\d+\.\s*/, '');
  
  // Remove "No join link" text (case-insensitive)
  cleanTitle = cleanTitle.replace(/\s*no join link\s*/gi, '');
  
  // Remove trailing separators: pipes, em-dashes, en-dashes, hyphens
  // Handles: "Title | |", "Title — —", "Title - -", "Title ||"
  cleanTitle = cleanTitle
    .replace(/\s*[\|—–-]\s*[\|—–-]?\s*$/g, '')  // Trailing | | or — — or - -
    .replace(/^\s*[\|—–-]\s*[\|—–-]?\s*/g, '')  // Leading | | or — —
    .replace(/\s*\|\s*\|?\s*$/g, '')             // Trailing | |
    .replace(/^\s*\|\s*\|?\s*/g, '');            // Leading | |
  
  // Normalize whitespace
  cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();
  
  // If title is empty after cleaning, use a default
  if (!cleanTitle) {
    cleanTitle = 'Meeting';
  }
  
  return {
    title: cleanTitle,
    embeddedLink: embeddedLink
  };
}

/**
 * Generate a unique external ID for a meeting to track synced meetings
 * Uses only title + date (not time) so that rescheduled meetings can be detected and updated
 * @param {string} title 
 * @param {string} date 
 * @param {string} time - Not used in ID generation, kept for API compatibility
 * @returns {string}
 */
function generateExternalId(title, date, time) {
  // Create a deterministic ID based on title and date only (not time)
  // This allows detecting when a meeting has been rescheduled
  const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const str = `workiq:${date}:${normalizedTitle}`;
  // Simple hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `workiq-${Math.abs(hash).toString(36)}`;
}

/**
 * Check if a meeting title matches any blocked patterns
 * @param {string} title - Meeting title to check
 * @param {Array<{pattern: string, isRegex: boolean}>} blockedPatterns - List of blocked patterns
 * @returns {boolean}
 */
function isMeetingBlocked(title, blockedPatterns) {
  const normalizedTitle = title.toLowerCase().trim();
  
  for (const { pattern, isRegex } of blockedPatterns) {
    if (isRegex) {
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(title)) return true;
      } catch {
        // Invalid regex, treat as plain text
        if (normalizedTitle.includes(pattern.toLowerCase())) return true;
      }
    } else {
      // Plain text match (case-insensitive, partial match)
      if (normalizedTitle.includes(pattern.toLowerCase())) return true;
    }
  }
  
  return false;
}

module.exports = {
  isWorkiqAvailable,
  executeWorkiqQuery,
  fetchMeetingsForDateRange,
  fetchTodaysMeetings,
  fetchWeekMeetings,
  isMeetingBlocked,
  generateExternalId,
};
