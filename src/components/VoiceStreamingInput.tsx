import React, { useState, useRef, useEffect, useMemo } from 'react'
import { FaMicrophone } from 'react-icons/fa'
import { OpenAIClient } from '../api/openai'
import { UserSettings } from '../types/settings'

/** Props for the VoiceStreamingInput component */
interface VoiceStreamingInputProps {
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

interface TranscriptionProgress {
    text: string
    isComplete: boolean
    timestamp: number
}

/**
 * A voice input button that handles recording and progressive transcription using OpenAI's Whisper API
 */
export function VoiceStreamingInput({ 
    userSettings, 
    className = '', 
    iconSize = 20, 
    onTranscription,
    onError 
}: VoiceStreamingInputProps) {
    const openaiClient = useMemo(() => {
        if (!userSettings.llm.openaiKey) {
            return null
        }
        return new OpenAIClient(userSettings.llm.openaiKey)
    }, [userSettings.llm.openaiKey])

    const [isRecording, setIsRecording] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [currentTranscription, setCurrentTranscription] = useState('')
    const [audioLevel, setAudioLevel] = useState(0)
    const mediaRecorder = useRef<MediaRecorder | null>(null)
    const currentBlob = useRef<Blob | null>(null)
    const lastTranscriptionTime = useRef<number>(0)
    const transcriptionInterval = useRef<NodeJS.Timeout | null>(null)
    const audioLevelInterval = useRef<NodeJS.Timeout | null>(null)
    const audioContext = useRef<AudioContext | null>(null)
    const audioAnalyser = useRef<AnalyserNode | null>(null)

    // Cleanup recording on unmount
    useEffect(() => {
        return () => {
            if (mediaRecorder.current && isRecording) {
                stopRecording()
            }
            if (transcriptionInterval.current) {
                clearInterval(transcriptionInterval.current)
            }
            if (audioLevelInterval.current) {
                clearInterval(audioLevelInterval.current)
            }
            if (audioContext.current) {
                audioContext.current.close()
            }
        }
    }, [])

    // Update audio level visualization
    function updateAudioLevel() {
        if (!audioAnalyser.current) return
        const bufferLength = audioAnalyser.current.fftSize
        const dataArray = new Uint8Array(bufferLength)
        audioAnalyser.current.getByteTimeDomainData(dataArray)
        let sumSquares = 0
        for (let i = 0; i < bufferLength; i++) {
            const normalized = dataArray[i] - 128
            sumSquares += normalized * normalized
        }
        const rms = Math.sqrt(sumSquares / bufferLength) * 6
        const normalizedLevel = Math.min(rms / 128, 1)
        setAudioLevel(normalizedLevel)
    }

    async function transcribeCurrentAudio(isFinal: boolean = false): Promise<TranscriptionProgress> {
        if (!currentBlob.current || !openaiClient) {
            return { text: '', isComplete: false, timestamp: Date.now() }
        }

        try {
            setIsProcessing(true)
            const transcription = await openaiClient.transcribeAudio(currentBlob.current)
            
            // Always update the UI
            setCurrentTranscription(transcription)
            
            // Only trigger the callback for the final transcription
            if (isFinal) {
                onTranscription(transcription)
            }

            return {
                text: transcription,
                isComplete: isFinal,
                timestamp: Date.now()
            }
        } catch (error) {
            console.error('Transcription error:', error)
            onError?.(error instanceof Error ? error.message : 'Failed to transcribe audio')
            return {
                text: '',
                isComplete: false,
                timestamp: Date.now()
            }
        } finally {
            setIsProcessing(false)
        }
    }

    async function startRecording(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        
        if (!openaiClient) {
            onError?.('OpenAI API key not configured')
            return
        }

        // Reset state when starting a new recording
        currentBlob.current = null
        setCurrentTranscription('')

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000
                }
            })

            // Check if we actually got audio tracks
            if (!stream.getAudioTracks().length) {
                throw new Error('No audio track available')
            }

            // Set up audio analysis
            audioContext.current = new AudioContext()
            const source = audioContext.current.createMediaStreamSource(stream)
            audioAnalyser.current = audioContext.current.createAnalyser()
            audioAnalyser.current.fftSize = 256
            source.connect(audioAnalyser.current)
            audioLevelInterval.current = setInterval(updateAudioLevel, 50)

            // Configure recorder
            mediaRecorder.current = new MediaRecorder(stream, {
                mimeType: 'audio/webm'
            })

            mediaRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    if (currentBlob.current) {
                        currentBlob.current = new Blob(
                            [currentBlob.current, e.data], 
                            { type: 'audio/webm' }
                        )
                    } else {
                        currentBlob.current = e.data
                    }
                }
            }

            // Start recording
            mediaRecorder.current.start(1000) // Collect data every second
            setIsRecording(true)
            lastTranscriptionTime.current = Date.now()

            // Start the transcription loop with a 5-second interval for UI updates
            transcriptionInterval.current = setInterval(async () => {
                const now = Date.now()
                if (now - lastTranscriptionTime.current >= 5000) { // Every 5 seconds
                    await transcribeCurrentAudio(false) // Not final
                    lastTranscriptionTime.current = now
                }
            }, 1000)

        } catch (error) {
            console.error('Error starting recording:', error)
            onError?.(error instanceof Error ? error.message : 'Failed to start recording')
            // Cleanup any partial setup
            if (mediaRecorder.current?.stream) {
                mediaRecorder.current.stream.getTracks().forEach(track => track.stop())
            }
            if (audioContext.current) {
                audioContext.current.close()
            }
            if (audioLevelInterval.current) {
                clearInterval(audioLevelInterval.current)
            }
            mediaRecorder.current = null
            currentBlob.current = null
            audioContext.current = null
            audioAnalyser.current = null
        }
    }

    async function stopRecording() {
        setIsRecording(false)
        setIsProcessing(true)

        if (!mediaRecorder.current) return

        try {
            // Clear the transcription interval
            if (transcriptionInterval.current) {
                clearInterval(transcriptionInterval.current)
                transcriptionInterval.current = null
            }

            // Stop audio visualization
            if (audioLevelInterval.current) {
                clearInterval(audioLevelInterval.current)
                audioLevelInterval.current = null
            }

            // Close audio context
            if (audioContext.current) {
                audioContext.current.close()
                audioContext.current = null
                audioAnalyser.current = null
            }

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

            // Get final transcription
            if (currentBlob.current) {
                const finalTranscription = await transcribeCurrentAudio(true) // Final transcription
            }
        } catch (error) {
            console.error('Error processing audio:', error)
            onError?.(error instanceof Error ? error.message : 'Failed to process recording')
        } finally {
            setIsProcessing(false)
            mediaRecorder.current = null
            currentBlob.current = null // Only clear the blob after we're done with it
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
        <>
            <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleClick}
                disabled={isProcessing}
                className={`
                    rounded-full
                    transition-all duration-200
                    opacity-40 hover:opacity-100
                    ${isProcessing 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
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
                    className="transition-transform hover:scale-110" 
                />
            </button>

            {/* Recording Modal */}
            {isRecording ? (
                <div className="fixed inset-0 flex flex-col items-center justify-center p-4 z-50"
                     onClick={stopRecording}
                >
                    <div 
                        className="relative flex flex-col items-center space-y-8 p-8"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Large Microphone Button */}
                        <div className="relative">
                            <button
                                onClick={stopRecording}
                                className="
                                    relative
                                    w-32 h-32
                                    rounded-full
                                    bg-red-600 dark:bg-red-500
                                    text-white
                                    flex items-center justify-center
                                    transition-all duration-150
                                    hover:scale-105
                                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
                                    shadow-[0_0_15px_rgba(239,68,68,0.3)]
                                    dark:shadow-[0_0_15px_rgba(239,68,68,0.4)]
                                "
                                style={{
                                    boxShadow: `0 0 15px rgba(239, 68, 68, 0.3), 0 0 ${audioLevel * 40}px ${audioLevel * 20}px rgba(239, 68, 68, ${audioLevel * 0.5})`
                                }}
                            >
                                {/* Permanent soft blur effect */}
                                <div className="absolute inset-0 rounded-full bg-red-500/20 backdrop-blur-sm" />
                                
                                {/* Fuzzy background expansion */}
                                <div 
                                    className="absolute inset-0 rounded-full bg-red-500/40 backdrop-blur-sm transition-transform duration-150"
                                    style={{
                                        transform: `scale(${1 + audioLevel * 0.15})`,
                                        opacity: audioLevel * 0.6
                                    }}
                                />

                                <FaMicrophone 
                                    size={48} 
                                    className="relative z-10" 
                                />
                            </button>
                        </div>

                        {/* Transcription Preview */}
                        <div className="
                            max-w-md w-full
                            bg-white dark:bg-gray-800 
                            rounded-lg shadow-lg 
                            p-4
                            text-center
                        ">
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                {currentTranscription ? (
                                    currentTranscription.split(' ').slice(-15).join(' ')
                                ) : (
                                    'Speak now...'
                                )}
                            </div>
                            
                            {/* Recording indicator */}
                            <div className="flex justify-center space-x-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Processing indicator */}
            {isProcessing && !isRecording && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2">
                    <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full px-3 py-1 text-sm">
                        Processing...
                    </div>
                </div>
            )}
        </>
    )
} 