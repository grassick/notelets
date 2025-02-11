import { useEffect } from 'react'
import { usePersist } from './usePersist'
import { Store } from '../Store'
import { useCallback, useState } from 'react'
import type { DeviceSettings, UserSettings, Settings } from '../types/settings'

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
export function useUserSettings(store?: Store) {
  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings)
  const [loading, setLoading] = useState(true)

  // Fallback to localStorage if no store provided
  const [localSettings, setLocalSettings] = usePersist<UserSettings>('app-user-settings', defaultUserSettings)

  useEffect(() => {
    if (!store) {
      setSettings(localSettings)
      setLoading(false)
      return
    }

    return store.getUserSettings((cloudSettings) => {
      setSettings(cloudSettings || defaultUserSettings)
      setLoading(false)
    })
  }, [store, localSettings])

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

    if (store) {
      store.setUserSettings(newSettings)
    } else {
      setLocalSettings(newSettings)
    }
    setSettings(newSettings)
  }, [store, settings, setLocalSettings])

  return {
    settings,
    updateSettings,
    loading
  }
}

/**
 * Combined hook that provides both device and user settings
 */
export function useSettings() {
  const { settings: deviceSettings, updateSettings: updateDeviceSettings } = useDeviceSettings()
  const { settings: userSettings, updateSettings: updateUserSettings, loading } = useUserSettings()

  const settings: Settings = {
    ...deviceSettings,
    ...userSettings
  }

  const updateSettings = useCallback(<K extends keyof Settings>(
    category: K,
    updates: Partial<Settings[K]>
  ) => {
    if (category === 'llm') {
      updateUserSettings(category, updates)
    } else {
      updateDeviceSettings(category as keyof DeviceSettings, updates)
    }
  }, [updateDeviceSettings, updateUserSettings])

  return {
    settings,
    updateSettings,
    loading
  }
} 