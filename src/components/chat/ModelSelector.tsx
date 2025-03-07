import React from 'react'
import { type ModelId, type LLMProviderType, getAvailableModels } from '../../api/llm'
import { useUserSettings } from '../../hooks/useSettings'
import { Store } from '../../Store'

interface ModelSelectorProps {
    /** Currently selected model ID */
    value: ModelId
    /** Callback when model changes */
    onChange: (modelId: ModelId) => void
    /** Additional class names */
    className?: string
    /** Callback to open settings modal */
    onOpenSettings: () => void
    /** Store instance */
    store: Store
}

type LLMSettingsKey = `${LLMProviderType}Key`

/**
 * Dropdown for selecting the LLM model to use
 */
export function ModelSelector({ value, onChange, className = '', onOpenSettings, store }: ModelSelectorProps) {
    const { settings: userSettings } = useUserSettings(store)

    // Get available models based on API keys
    const availableModels = getAvailableModels(userSettings)

    if (availableModels.length === 0) {
        return (
            <button
                onClick={onOpenSettings}
                className={`px-1.5 py-0.5 text-[10px] rounded border border-gray-200 dark:border-gray-600
                         bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400
                         hover:bg-gray-100 dark:hover:bg-gray-700
                         focus:outline-none focus:ring-1 focus:ring-gray-400
                         transition-colors duration-150 whitespace-nowrap
                         ${className}`}
            >
                Set up LLM API Key →
            </button>
        )
    }

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`px-1.5 py-0.5 text-[10px] rounded
                     bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300
                     hover:bg-gray-100 dark:hover:bg-gray-700
                     focus:outline-none
                     transition-colors duration-150
                     ${className}`}
        >
            {availableModels.map(model => (
                <option key={model.id} value={model.id}>
                    {model.name}
                </option>
            ))}
        </select>
    )
} 