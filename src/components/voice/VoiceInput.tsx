import React from 'react'
import { VoiceTranscriptionInput } from './VoiceTranscriptionInput'
import { VoiceFireworksStreamingInput } from './VoiceFireworksStreamingInput'
import { UserSettings } from '../../types/settings'

/** Props for the VoiceInput component */
interface VoiceInputProps {
    /** User settings */
    userSettings: UserSettings
    /** Optional class name for the button */
    className?: string
    /** Optional size for the microphone icon */
    iconSize?: number
    /** Callback function called with transcribed text */
    onTranscription: (text: string) => void
    /** Optional error callback */
    onError?: (error: string) => void
}

/**
 * A smart voice input component that chooses between Fireworks AI (preferred),
 * OpenRouter with Gemini Flash 2.5, or OpenAI's Whisper based on settings and available API keys
 */
export function VoiceInput(props: VoiceInputProps) {
    const { llm } = props.userSettings

    // Prefer Fireworks AI if the API key is available
    if (llm.fireworksKey) {
        return <VoiceFireworksStreamingInput {...props} />
    }

    // If OpenRouter transcription is selected and the key is available, use it
    if (llm.transcriptionProvider === 'openrouter' && llm.openrouterKey) {
        return <VoiceTranscriptionInput {...props} />
    }

    // Fall back to OpenAI's Whisper if that key is available
    if (llm.openaiKey) {
        return <VoiceTranscriptionInput {...props} />
    }

    // Last resort: if OpenRouter key is available, use it even if not explicitly selected
    if (llm.openrouterKey) {
        return <VoiceTranscriptionInput {...props} />
    }

    // If no API keys are available, don't render anything
    return null
}
