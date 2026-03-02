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

/**
 * Available transcription providers for voice input.
 * - 'whisper' uses OpenAI's Whisper API (requires openaiKey)
 * - 'openrouter' uses Gemini Flash 2.5 via OpenRouter (requires openrouterKey)
 */
export type TranscriptionProvider = 'whisper' | 'openrouter'

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
    /** Fireworks AI API key */
    fireworksKey?: string
    /** OpenRouter API key */
    openrouterKey?: string
    /** Which provider to use for voice transcription */
    transcriptionProvider?: TranscriptionProvider
  }
} 