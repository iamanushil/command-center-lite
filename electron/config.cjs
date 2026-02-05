const fs = require('fs');
const path = require('path');
const os = require('os');

// Load dotenv from the project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const CONFIG_DIR = path.join(os.homedir(), '.command-center-lite');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const defaultConfig = {
  // User settings
  user: {
    name: '',         // Your name for personalized greetings
  },
  // API keys (stored locally, not in repo)
  // These can be overridden by .env file
  // Optional integrations
  elevenlabs: {
    apiKey: '',
    voiceId: '',
  },
  // Sync settings
  sync: {
    githubIntervalMinutes: 5,
  },
};

/**
 * Ensure the config directory exists
 */
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Load config from file, merging with defaults and env vars
 */
function loadConfig() {
  ensureConfigDir();
  
  let fileConfig = {};
  
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      fileConfig = JSON.parse(content);
    } catch (error) {
      console.error('Error reading config file:', error);
    }
  }
  
  // Deep merge with defaults
  const config = deepMerge(defaultConfig, fileConfig);

  if (process.env.ELEVENLABS_API_KEY) {
    config.elevenlabs.apiKey = process.env.ELEVENLABS_API_KEY;
  }
  if (process.env.ELEVENLABS_VOICE_ID) {
    config.elevenlabs.voiceId = process.env.ELEVENLABS_VOICE_ID;
  }
  if (process.env.NAME) {
    config.user.name = process.env.NAME;
  }
  
  return config;
}

/**
 * Save config to file
 */
function saveConfig(config) {
  ensureConfigDir();
  
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing config file:', error);
    return false;
  }
}

/**
 * Get a specific config value by dot-notation key
 * e.g., getConfig('name')
 */
function getConfig(key) {
  const config = loadConfig();
  
  if (!key) return config;
  
  const keys = key.split('.');
  let value = config;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return undefined;
    }
  }
  
  return value;
}

/**
 * Set a specific config value by dot-notation key
 * e.g., setConfig('name', 'Brittany')
 */
function setConfig(key, value) {
  const config = loadConfig();
  
  const keys = key.split('.');
  let current = config;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!(k in current) || typeof current[k] !== 'object') {
      current[k] = {};
    }
    current = current[k];
  }
  
  current[keys[keys.length - 1]] = value;
  
  return saveConfig(config);
}

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Get the config file path (for debugging/display)
 */
function getConfigPath() {
  return CONFIG_FILE;
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfig,
  setConfig,
  getConfigPath,
  CONFIG_DIR,
  CONFIG_FILE,
};
