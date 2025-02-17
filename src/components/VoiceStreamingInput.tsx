import React, { useState, useRef, useEffect, useMemo } from 'react'
import { FaMicrophone } from 'react-icons/fa'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import { OpenAIClient } from '../api/openai'
import { UserSettings } from '../types/settings'
import RecordRTC, { RecordRTCPromisesHandler } from 'recordrtc'

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

/**
 * A voice input button that handles recording and progressive transcription using OpenAI's Whisper API
 * Uses RecordRTC for better cross-platform compatibility
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
    const [audioLevel, setAudioLevel] = useState(0)
    const recorder = useRef<RecordRTCPromisesHandler | null>(null)
    const stream = useRef<MediaStream | null>(null)
    const audioContext = useRef<AudioContext | null>(null)
    const audioAnalyser = useRef<AnalyserNode | null>(null)
    const audioLevelInterval = useRef<NodeJS.Timeout | null>(null)

    // Cleanup recording on unmount
    useEffect(() => {
        return () => {
            if (recorder.current && isRecording) {
                stopRecording()
            }
            if (audioLevelInterval.current) {
                clearInterval(audioLevelInterval.current)
            }
            if (audioContext.current) {
                audioContext.current.close()
            }
            if (stream.current) {
                stream.current.getTracks().forEach(track => track.stop())
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

    async function startRecording(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        
        if (!openaiClient) {
            onError?.('OpenAI API key not configured')
            return
        }

        try {
            // Request permission and get stream
            stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })

            // Check if we actually got audio tracks
            if (!stream.current.getAudioTracks().length) {
                throw new Error('No audio track available')
            }

            // Set up audio analysis
            audioContext.current = new AudioContext()
            const source = audioContext.current.createMediaStreamSource(stream.current)
            audioAnalyser.current = audioContext.current.createAnalyser()
            audioAnalyser.current.fftSize = 256
            source.connect(audioAnalyser.current)
            audioLevelInterval.current = setInterval(updateAudioLevel, 50)

            // Configure recorder based on platform
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
            const recorderConfig = {
                type: 'audio' as const,
                mimeType: (isIOS ? 'audio/webm?codec=opus' : 'audio/webm') as any,
                recorderType: RecordRTC.StereoAudioRecorder,
                numberOfAudioChannels: 1 as 1 | 2,
                audioBitsPerSecond: 64000
            }

            recorder.current = new RecordRTCPromisesHandler(stream.current, recorderConfig)
            await recorder.current.startRecording()
            setIsRecording(true)

        } catch (error) {
            console.error('Error starting recording:', error)
            onError?.(error instanceof Error ? error.message : 'Failed to start recording')
            // Cleanup any partial setup
            if (stream.current) {
                stream.current.getTracks().forEach(track => track.stop())
                stream.current = null
            }
            if (audioContext.current) {
                audioContext.current.close()
                audioContext.current = null
            }
            if (audioLevelInterval.current) {
                clearInterval(audioLevelInterval.current)
                audioLevelInterval.current = null
            }
            if (audioAnalyser.current) {
                audioAnalyser.current = null
            }
            setAudioLevel(0)
        }
    }

    async function stopRecording() {
        if (!recorder.current || !openaiClient) return

        setIsRecording(false)
        setIsProcessing(true)

        try {
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

            // Stop recording and get blob
            await recorder.current.stopRecording()
            const blob = await recorder.current.getBlob()

            // Stop all tracks
            if (stream.current) {
                stream.current.getTracks().forEach(track => track.stop())
                stream.current = null
            }

            // Verify we have valid audio data
            if (blob.size < 100) {
                throw new Error(`Recording appears to be empty: ${blob.size} bytes`)
            }

            // Transcribe audio
            try {
                const transcription = await openaiClient.transcribeAudio(blob)
                if (!transcription || transcription.trim().length === 0) {
                    throw new Error('No speech detected in recording')
                }
                onTranscription(transcription)
            } catch (error) {
                console.error('Transcription error:', error)
                onError?.(error instanceof Error ? error.message : 'Failed to transcribe audio')
            }
        } catch (error) {
            console.error('Error processing audio:', error)
            onError?.(error instanceof Error ? error.message : 'Failed to process recording')
        } finally {
            setIsProcessing(false)
            if (recorder.current) {
                await recorder.current.reset()
                recorder.current = null
            }
        }
    }

    function handleClick(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
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

            {/* Recording/Processing Modal */}
            {(isRecording || isProcessing) ? (
                <div className="fixed inset-0 flex flex-col items-center justify-center p-4 z-50"
                     onClick={isRecording ? handleClick : undefined}
                >
                    <div 
                        className="relative flex flex-col items-center space-y-8 p-8"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Large Microphone Button */}
                        <div className="relative">
                            <button
                                onClick={isRecording ? stopRecording : undefined}
                                disabled={isProcessing}
                                className={`
                                    relative
                                    w-32 h-32
                                    rounded-full
                                    flex items-center justify-center
                                    transition-all duration-150
                                    focus:outline-none focus:ring-2 focus:ring-offset-2
                                    shadow-lg
                                    ${isProcessing 
                                        ? 'bg-blue-600 dark:bg-blue-500 focus:ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] dark:shadow-[0_0_15px_rgba(59,130,246,0.4)]' 
                                        : 'bg-red-600 dark:bg-red-500 hover:scale-105 focus:ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] dark:shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                                    }
                                `}
                                style={isRecording ? {
                                    boxShadow: `0 0 15px rgba(239, 68, 68, 0.3), 0 0 ${audioLevel * 40}px ${audioLevel * 20}px rgba(239, 68, 68, ${audioLevel * 0.5})`
                                } : undefined}
                            >
                                {/* Permanent soft blur effect */}
                                <div className={`absolute inset-0 rounded-full backdrop-blur-sm ${
                                    isProcessing ? 'bg-blue-500/20' : 'bg-red-500/20'
                                }`} />
                                
                                {/* Fuzzy background expansion - only show during recording */}
                                {isRecording && (
                                    <div 
                                        className="absolute inset-0 rounded-full bg-red-500/40 backdrop-blur-sm transition-transform duration-150"
                                        style={{
                                            transform: `scale(${1 + audioLevel * 0.15})`,
                                            opacity: audioLevel * 0.6
                                        }}
                                    />
                                )}

                                <FaMicrophone 
                                    size={48} 
                                    className="relative z-10 text-white" 
                                />

                                {/* Spinner Overlay for Processing */}
                                {isProcessing && (
                                    <AiOutlineLoading3Quarters 
                                        size={96} 
                                        className="absolute inset-0 m-auto animate-spin text-white opacity-70 z-20" 
                                    />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    )
} 