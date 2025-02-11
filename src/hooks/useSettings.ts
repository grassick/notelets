import { useEffect } from 'react'
import { usePersist } from './usePersist'
import { Store } from '../Store'
import { useCallback, useState } from 'react'
import type { DeviceSettings, UserSettings } from '../types/settings'

const defaultDeviceSettings: DeviceSettings = {
  appearance: {
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
  },
  storage: {}
}

const defaultUserSettings: UserSettings = {
  llm: {}
}

/**
 * Hook to manage device-specific settings stored in localStorage
 */
export function useDeviceSettings() {
  const [settings, setSettings] = usePersist<DeviceSettings>('app-device-settings', defaultDeviceSettings)

  // Apply dark mode
  useEffect(() => {
    if (settings.appearance.darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [settings.appearance.darkMode])

  const updateSettings = useCallback(<K extends keyof DeviceSettings>(
    category: K,
    updates: Partial<DeviceSettings[K]>
  ) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        ...updates
      }
    }))
  }, [setSettings])

  return {
    settings,
    updateSettings
  }
}

/**
 * Hook to manage user-specific settings stored in the cloud
 */
export function useUserSettings(store: Store) {
  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return store.getUserSettings((cloudSettings) => {
      setSettings(cloudSettings || defaultUserSettings)
      setLoading(false)
    })
  }, [store])

  const updateSettings = useCallback(<K extends keyof UserSettings>(
    category: K,
    updates: Partial<UserSettings[K]>
  ) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        ...updates
      }
    }

    store.setUserSettings(newSettings)
    setSettings(newSettings)
  }, [store, settings])

  return {
    settings,
    updateSettings,
    loading
  }
} 