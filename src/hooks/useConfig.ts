import { useState, useEffect, useCallback } from 'react'
import { isElectron } from '../lib/electron'

// Config type definitions
export interface AppConfig {
  user: {
    name: string
  }
  paths: {
    gitcoin: string
    notes: string
  }
  notion: {
    apiKey: string
    inboxDatabaseId: string
    todoDatabaseId: string
    contactsDatabaseId: string
  }
  github: {
    defaultOrg: string
    teamRepos: string[]
  }
  elevenlabs: {
    apiKey: string
    voiceId: string
  }
  sync: {
    notionIntervalMinutes: number
    githubIntervalMinutes: number
  }
}

// Default config for when running in browser (non-Electron)
const defaultConfig: AppConfig = {
  user: {
    name: '',
  },
  paths: {
    gitcoin: '',
    notes: '',
  },
  notion: {
    apiKey: '',
    inboxDatabaseId: '',
    todoDatabaseId: '',
    contactsDatabaseId: '',
  },
  github: {
    defaultOrg: 'github',
    teamRepos: ['billing', 'billing-platform'],
  },
  elevenlabs: {
    apiKey: '',
    voiceId: '',
  },
  sync: {
    notionIntervalMinutes: 60,
    githubIntervalMinutes: 5,
  },
}

/**
 * Hook to access and modify app configuration
 */
export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(defaultConfig)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [configPath, setConfigPath] = useState<string>('')

  // Load config on mount
  useEffect(() => {
    async function loadConfig() {
      if (!isElectron() || !window.electronAPI?.config) {
        setIsLoading(false)
        return
      }

      try {
        const [loadedConfig, path] = await Promise.all([
          window.electronAPI.config.getAll(),
          window.electronAPI.config.getPath(),
        ])
        setConfig(loadedConfig as AppConfig)
        setConfigPath(path)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load config')
      } finally {
        setIsLoading(false)
      }
    }

    loadConfig()
  }, [])

  /**
   * Get a specific config value
   */
  const getValue = useCallback(async <T = unknown>(key: string): Promise<T | undefined> => {
    if (!isElectron() || !window.electronAPI?.config) {
      // Navigate the default config for browser mode
      const keys = key.split('.')
      let value: unknown = config
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = (value as Record<string, unknown>)[k]
        } else {
          return undefined
        }
      }
      return value as T
    }

    return window.electronAPI.config.get(key) as Promise<T | undefined>
  }, [config])

  /**
   * Set a specific config value
   */
  const setValue = useCallback(async (key: string, value: unknown): Promise<boolean> => {
    if (!isElectron() || !window.electronAPI?.config) {
      console.warn('Config changes are only persisted in Electron mode')
      return false
    }

    try {
      const success = await window.electronAPI.config.set(key, value)
      if (success) {
        // Reload the full config to stay in sync
        const newConfig = await window.electronAPI.config.getAll()
        setConfig(newConfig as AppConfig)
      }
      return success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config')
      return false
    }
  }, [])

  /**
   * Update multiple config values at once
   */
  const updateConfig = useCallback(async (updates: Partial<AppConfig>): Promise<boolean> => {
    if (!isElectron() || !window.electronAPI?.config) {
      console.warn('Config changes are only persisted in Electron mode')
      return false
    }

    try {
      // Apply each update
      for (const [section, values] of Object.entries(updates)) {
        if (typeof values === 'object' && values !== null) {
          for (const [key, value] of Object.entries(values)) {
            await window.electronAPI.config.set(`${section}.${key}`, value)
          }
        }
      }

      // Reload the full config
      const newConfig = await window.electronAPI.config.getAll()
      setConfig(newConfig as AppConfig)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config')
      return false
    }
  }, [])

  return {
    config,
    isLoading,
    error,
    configPath,
    getValue,
    setValue,
    updateConfig,
    isElectronMode: isElectron(),
  }
}

/**
 * Check if required config values are set
 */
export function useConfigStatus() {
  const { config, isLoading } = useConfig()

  const hasNotionConfig = Boolean(
    config.notion.apiKey &&
    config.notion.todoDatabaseId
  )

  const hasElevenLabsConfig = Boolean(
    config.elevenlabs.apiKey &&
    config.elevenlabs.voiceId
  )

  const hasPathsConfig = Boolean(
    config.paths.gitcoin ||
    config.paths.notes
  )

  return {
    isLoading,
    hasNotionConfig,
    hasElevenLabsConfig,
    hasPathsConfig,
    isFullyConfigured: hasNotionConfig,
  }
}
