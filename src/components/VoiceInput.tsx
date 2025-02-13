import React, { useState, useRef, useEffect, useMemo } from 'react'
import { FaMicrophone } from 'react-icons/fa'
import { OpenAIClient } from '../api/openai'
import { UserSettings } from '../types/settings'

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
}

/**
 * A voice input button that handles recording and transcription
 */
export function VoiceInput({ userSettings, className = '', iconSize = 20, onTranscription }: VoiceInputProps) {
    const openaiClient = useMemo(() => {
        if (!userSettings.llm.openaiKey) {
            return null
        }
        return new OpenAIClient(userSettings.llm.openaiKey)
    }, [userSettings.llm.openaiKey])

    const [isRecording, setIsRecording] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const mediaRecorder = useRef<MediaRecorder | null>(null)
    const chunks = useRef<Blob[]>([])

    // Cleanup recording on unmount
    useEffect(() => {
        return () => {
            if (mediaRecorder.current && isRecording) {
                mediaRecorder.current.stop()
                mediaRecorder.current.stream.getTracks().forEach(track => track.stop())
            }
        }
    }, [isRecording])

    async function startRecording(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaRecorder.current = new MediaRecorder(stream)
            chunks.current = []

            mediaRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.current.push(e.data)
                }
            }

            mediaRecorder.current.start()
            setIsRecording(true)
        } catch (error) {
            console.error('Error starting recording:', error)
        }
    }

    async function stopRecording() {
        if (!mediaRecorder.current) return

        setIsRecording(false)
        setIsProcessing(true)

        try {
            // Create a promise that resolves when the mediaRecorder stops
            const stopPromise = new Promise<void>((resolve) => {
                if (mediaRecorder.current) {
                    mediaRecorder.current.onstop = () => resolve()
                }
            })

            // Stop recording
            mediaRecorder.current.stop()
            await stopPromise

            // Stop all tracks
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop())

            // Create blob from chunks
            const audioBlob = new Blob(chunks.current, { type: 'audio/webm' })
            
            // Transcribe audio
            const transcription = await openaiClient!.transcribeAudio(audioBlob)

            console.log('Transcription:', transcription)
            
            // Call the transcription callback
            onTranscription(transcription)
        } catch (error) {
            console.error('Error processing audio:', error)
        } finally {
            setIsProcessing(false)
        }
    }

    function handleClick(e: React.MouseEvent) {
        if (isRecording) {
            stopRecording()
        } else {
            startRecording(e)
        }
    }

    if (!openaiClient) {
        return null
    }

    return (
        <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClick}
            disabled={isProcessing}
            className={`
                p-2 rounded-md transition-all duration-200
                ${isProcessing 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                    : isRecording
                        ? 'bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 ring-4 ring-red-200 dark:ring-red-900 animate-pulse'
                        : 'text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none
                ${className}
            `}
            aria-label={
                isProcessing ? "Processing voice input..." 
                : isRecording ? "Stop recording" 
                : "Start voice input"
            }
            title={
                isProcessing ? "Converting speech to text..." 
                : isRecording ? "Tap to stop recording" 
                : "Tap to start voice input"
            }
        >
            <FaMicrophone 
                size={iconSize}
                className={`
                    transition-transform
                    ${!isProcessing && 'hover:scale-110'}
                `} 
            />
        </button>
    )
} 