import React, { useState, useRef, useEffect, useMemo } from 'react'
import { FaMicrophone } from 'react-icons/fa'
import { OpenAIClient } from '../api/openai'
import { UserSettings } from '../types/settings'
import RecordRTC, { RecordRTCPromisesHandler } from 'recordrtc'

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
 * A voice input button that handles recording and transcription using RecordRTC
 * for better cross-platform compatibility, especially on iOS
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
    const recorder = useRef<RecordRTCPromisesHandler | null>(null)
    const stream = useRef<MediaStream | null>(null)

    // Cleanup recording on unmount
    useEffect(() => {
        return () => {
            if (recorder.current && isRecording) {
                recorder.current.stopRecording()
                if (stream.current) {
                    stream.current.getTracks().forEach(track => track.stop())
                }
            }
        }
    }, [isRecording])

    async function startRecording(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        
        try {
            stream.current = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            })

            recorder.current = new RecordRTCPromisesHandler(stream.current, {
                type: 'audio',
                mimeType: 'audio/webm;codecs=opus' as any,
                recorderType: RecordRTC.StereoAudioRecorder,
                numberOfAudioChannels: 1,
                desiredSampRate: 16000, // Optimal for speech recognition
                timeSlice: 1000,
                // Opus-specific settings for voice
                bitsPerSecond: 24000, // 24kbps is good for speech
                frameRate: 48000,
                bufferSize: 16384
            })

            await recorder.current.startRecording()
            setIsRecording(true)
        } catch (error) {
            console.error('Error starting recording:', error)
        }
    }

    async function stopRecording() {
        if (!recorder.current) return

        setIsRecording(false)
        setIsProcessing(true)

        try {
            await recorder.current.stopRecording()
            const blob = await recorder.current.getBlob()

            // Stop all tracks
            if (stream.current) {
                stream.current.getTracks().forEach(track => track.stop())
            }
            
            // Transcribe audio
            const transcription = await openaiClient!.transcribeAudio(blob)
            console.log('Transcription:', transcription)
            
            // Call the transcription callback
            onTranscription(transcription)
        } catch (error) {
            console.error('Error processing audio:', error)
        } finally {
            setIsProcessing(false)
            if (recorder.current) {
                await recorder.current.reset()
                recorder.current = null
            }
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