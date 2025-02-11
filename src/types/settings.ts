/** Device-specific settings stored in localStorage */
export interface DeviceSettings {
  appearance: {
    darkMode: boolean
  }
  storage: {
    /**
     * The type of storage to use.
     * 
     * - 'local' - Store notes only on this device. No account needed.
     * - 'cloud' - Sync notes across all devices. Requires free account.
     */
    type?: 'local' | 'cloud'
  }
}

/** User-specific settings stored in cloud */
export interface UserSettings {
  llm: {
    /** OpenAI API key */
    openaiKey?: string
    /** Anthropic API key */
    anthropicKey?: string
    /** Google Gemini API key */
    geminiKey?: string
    /** DeepSeek API key */
    deepseekKey?: string
  }
}

/** Combined settings type */
export interface Settings extends DeviceSettings {
  llm: UserSettings['llm']
} 