/**
 * Apple Calendar Integration
 *
 * Reads events from Calendar.app via osascript (AppleScript).
 * No API keys or auth tokens required — uses macOS EventKit through
 * the Calendar app. User must grant Calendar access on first run
 * (macOS Privacy & Security prompt).
 *
 * Prerequisites:
 * - macOS only
 * - Calendar.app with accounts configured (iCloud, Google, Exchange, etc.)
 */

const { execFile } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');

const execFileAsync = util.promisify(execFile);

// Path to meeting filter config (shared with old workiq config)
const MEETING_FILTERS_PATH = path.join(__dirname, '..', 'config', 'meeting-filters.json');

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function loadExcludePatterns() {
  try {
    if (fs.existsSync(MEETING_FILTERS_PATH)) {
      const config = JSON.parse(fs.readFileSync(MEETING_FILTERS_PATH, 'utf8'));
      return config.excludePatterns || [];
    }
  } catch (err) {
    console.error('[Calendar] Error loading meeting filters:', err.message);
  }
  return [];
}

function shouldExcludeMeeting(title) {
  const patterns = loadExcludePatterns();
  const lower = title.toLowerCase();
  for (const p of patterns) {
    if (lower.includes(p.toLowerCase())) return true;
  }
  return false;
}

function getLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const SWIFT_SCRIPT = path.join(__dirname, 'fetch-calendar.swift');

/**
 * Fetch events via Swift + EventKit (bypasses macOS TCC subprocess restrictions).
 * Returns pipe-delimited lines: title|date|time|url|calendarName
 */
async function runSwiftFetcher(startDate, endDate) {
  const startStr = getLocalDateString(startDate);
  const endStr   = getLocalDateString(endDate);
  const { stdout } = await execFileAsync('swift', [SWIFT_SCRIPT, startStr, endStr], {
    timeout: 60000,
    maxBuffer: 1024 * 1024,
  });
  return stdout.trim();
}

/**
 * Parse the pipe-delimited output from the Swift fetcher.
 * Format: title|date|time|url|calendarName
 */
function parseSwiftOutput(output) {
  const events = [];
  const lines = output.split('\n').filter(l => l.trim());
  for (const line of lines) {
    const parts = line.split('|');
    if (parts.length < 5) continue;
    const [title, date, time, url, calendarName] = parts;
    if (!title || !date || !time) continue;
    events.push({
      title: title.trim(),
      date: date.trim(),
      time: time.trim(),
      link: (url && url.trim()) ? url.trim() : null,
      calendarName: calendarName ? calendarName.trim() : '',
    });
  }
  return events;
}

/**
 * Stable external ID so we can detect duplicate / rescheduled events.
 */
function generateExternalId(title, date) {
  const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const str = `apple:${date}:${normalized}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return `apple-${Math.abs(hash).toString(36)}`;
}

// ──────────────────────────────────────────────
// Public API (mirrors workiq.cjs interface)
// ──────────────────────────────────────────────

/**
 * Apple Calendar is always "available" on macOS.
 * Returns false on non-macOS platforms.
 */
async function isCalendarAvailable() {
  return process.platform === 'darwin';
}

/**
 * Fetch events for a date range.
 * startDate and endDate are JS Date objects.
 */
async function fetchMeetingsForDateRange(startDate, endDate = null) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = endDate ? new Date(endDate) : new Date(start);
  end.setHours(23, 59, 59, 999);

  console.log(`[Calendar] Fetching events ${getLocalDateString(start)} → ${getLocalDateString(end)}`);
  const output = await runSwiftFetcher(start, end);

  const events = parseSwiftOutput(output);
  console.log(`[Calendar] Raw events: ${events.length}`);

  return events
    .filter(e => !shouldExcludeMeeting(e.title))
    .map(e => ({
      ...e,
      externalId: generateExternalId(e.title, e.date),
    }));
}

async function fetchTodaysMeetings() {
  return fetchMeetingsForDateRange(new Date());
}

async function fetchWeekMeetings() {
  const today = new Date();
  const friday = new Date(today);
  friday.setDate(today.getDate() + (5 - today.getDay()));
  return fetchMeetingsForDateRange(today, friday);
}

/**
 * Check if a meeting title matches any blocked patterns.
 */
function isMeetingBlocked(title, blockedPatterns) {
  const lower = title.toLowerCase().trim();
  for (const { pattern, isRegex } of blockedPatterns) {
    if (isRegex) {
      try {
        if (new RegExp(pattern, 'i').test(title)) return true;
      } catch {
        if (lower.includes(pattern.toLowerCase())) return true;
      }
    } else {
      if (lower.includes(pattern.toLowerCase())) return true;
    }
  }
  return false;
}

module.exports = {
  isCalendarAvailable,
  fetchMeetingsForDateRange,
  fetchTodaysMeetings,
  fetchWeekMeetings,
  isMeetingBlocked,
  generateExternalId,
};
