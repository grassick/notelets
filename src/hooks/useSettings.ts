import { useEffect } from 'react'
import { usePersist } from './usePersist'

interface Settings {
  appearance: {
    darkMode: boolean
  }
  llm: {
    openaiKey?: string
    anthropicKey?: string
    geminiKey?: string
    deepseekKey?: string
    // Add other LLM keys as needed
  }
}

const defaultSettings: Settings = {
  appearance: {
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
  },
  llm: {}
}

export function useSettings() {
  const [settings, setSettings] = usePersist<Settings>('app-settings', defaultSettings)

  // Apply dark mode
  useEffect(() => {
    if (settings.appearance.darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [settings.appearance.darkMode])

  const updateSettings = <K extends keyof Settings>(
    category: K,
    updates: Partial<Settings[K]>
  ) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        ...updates
      }
    }))
  }

  return {
    settings,
    updateSettings
  }
} 