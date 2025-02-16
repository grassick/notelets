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
        console.log('VoiceStreamingInput mounting')
        return () => {
            console.log('VoiceStreamingInput unmounting')
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
        const rms = Math.sqrt(sumSquares / bufferLength)
        const normalizedLevel = Math.min(rms / 128, 1)
        setAudioLevel(normalizedLevel)
    }

    async function transcribeCurrentAudio(): Promise<TranscriptionProgress> {
        if (!currentBlob.current || !openaiClient) {
            return { text: '', isComplete: false, timestamp: Date.now() }
        }

        try {
            setIsProcessing(true)
            const transcription = await openaiClient.transcribeAudio(currentBlob.current)
            
            // Update the current transcription
            setCurrentTranscription(transcription)
            onTranscription(transcription)
            // Reset the current blob so that subsequent transcriptions only use new audio
            currentBlob.current = null

            return {
                text: transcription,
                isComplete: false,
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
            audioLevelInterval.current = setInterval(updateAudioLevel, 100)

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

            // Start the transcription loop with a 3-second interval threshold for progressive transcription
            transcriptionInterval.current = setInterval(async () => {
                const now = Date.now()
                if (now - lastTranscriptionTime.current >= 3000) { // Every 3 seconds
                    await transcribeCurrentAudio()
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
        if (!mediaRecorder.current) return

        setIsRecording(false)
        setIsProcessing(true)

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
                const finalTranscription = await transcribeCurrentAudio()
                onTranscription(finalTranscription.text)
            }
        } catch (error) {
            console.error('Error processing audio:', error)
            onError?.(error instanceof Error ? error.message : 'Failed to process recording')
        } finally {
            setIsProcessing(false)
            mediaRecorder.current = null
            currentBlob.current = null
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
                    p-2 rounded-md transition-all duration-200
                    ${isProcessing 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : isRecording
                            ? 'bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600'
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

            {/* Recording Modal */}
            {isRecording && (
                <>
                    {/* Modal Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50"
                        onClick={stopRecording}
                    />
                    
                    {/* Modal Content */}
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
                        <div 
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                    Recording in Progress
                                </h2>
                                <button
                                    onClick={stopRecording}
                                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Audio Level Visualization */}
                            <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                    className="absolute inset-y-0 left-0 bg-red-500 dark:bg-red-400 transition-all duration-150"
                                    style={{ width: `${audioLevel * 100}%` }}
                                />
                            </div>

                            {/* Transcription Display */}
                            <div className="relative">
                                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-white dark:to-gray-800" />
                                <div className="h-48 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                    {currentTranscription ? (
                                        <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                                            {currentTranscription}
                                        </p>
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400 italic">
                                            Speak now... Transcription will appear here
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Status and Controls */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {isProcessing ? "Processing..." : "Recording"}
                                    </span>
                                </div>
                                <button
                                    onClick={stopRecording}
                                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 
                                             dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 
                                             rounded-lg transition-colors duration-150"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    )
} 