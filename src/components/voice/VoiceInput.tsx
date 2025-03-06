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
 * A smart voice input component that chooses between Fireworks AI (preferred) 
 * or OpenAI's Whisper based on available API keys
 */
export function VoiceInput(props: VoiceInputProps) {
    // Prefer Fireworks AI if the API key is available
    if (props.userSettings.llm.fireworksKey) {
        return <VoiceFireworksStreamingInput {...props} />
    }
    
    // Fall back to OpenAI's Whisper if that key is available
    if (props.userSettings.llm.openaiKey) {
        return <VoiceTranscriptionInput {...props} />
    }
    
    // If no API keys are available, don't render anything
    return null
}
