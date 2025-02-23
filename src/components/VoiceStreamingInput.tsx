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
            // iOS Safari requires user interaction to create AudioContext
            audioContext.current = new AudioContext()

            // iOS specific constraints that help with consistency
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    // Force low-latency mode where possible
                    latency: 0,
                    // Specifically request voice optimization
                    channelCount: 1,
                }
            }

            stream.current = await navigator.mediaDevices.getUserMedia(constraints)

            // Check if we actually got audio tracks
            if (!stream.current.getAudioTracks().length) {
                throw new Error('No audio track available')
            }

            const source = audioContext.current.createMediaStreamSource(stream.current)
            audioAnalyser.current = audioContext.current.createAnalyser()
            audioAnalyser.current.fftSize = 256
            source.connect(audioAnalyser.current)
            audioLevelInterval.current = setInterval(updateAudioLevel, 50)

            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
            if (isIOS) {
                const options: any = {
                    type: 'audio',
                    mimeType: 'audio/webm;codecs=opus', // Opus compression
                    recorderType: RecordRTC.MediaStreamRecorder, // Required for modern codecs
                    audioBitsPerSecond: 24000, // Adjust for quality (24kbps-96kbps)
                    bufferSize: 4096, // Balance between latency & performance
                    disableLogs: true
                }

                recorder.current = new RecordRTCPromisesHandler(stream.current, options)
            } else {
                // Non-iOS setup remains the same
                recorder.current = new RecordRTCPromisesHandler(stream.current, {
                    type: 'audio',
                    mimeType: 'audio/webm;codec=opus' as any,
                    recorderType: RecordRTC.StereoAudioRecorder,
                    numberOfAudioChannels: 1,
                    desiredSampRate: 16000,
                    audioBitsPerSecond: 16000,
                    // Ensure we get data frequently for better reliability
                    timeSlice: 1000
                })
            }

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
        <div className="relative">
            {/* Glow effect container */}
            {isRecording && (
                <>
                    {/* Intense inner glow */}
                    <div
                        className="absolute inset-0 rounded-full"
                        style={{
                            background: `radial-gradient(circle, rgba(239, 68, 68, ${audioLevel * 0.8}) 0%, transparent 70%)`,
                            transform: `scale(${1.2 + audioLevel * 0.3})`,
                            filter: 'blur(2px)'
                        }}
                    />
                    {/* Pulsing outer glow */}
                    <div
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{
                            background: `radial-gradient(circle, rgba(239, 68, 68, ${audioLevel * 0.6}) 0%, transparent 75%)`,
                            transform: `scale(${1.4 + audioLevel * 0.4})`,
                            filter: 'blur(3px)'
                        }}
                    />
                </>
            )}

            <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleClick}
                disabled={isProcessing}
                className={`
                    relative
                    transition-all duration-200
                    ${isProcessing
                        ? 'text-blue-600 dark:text-blue-400'
                        : isRecording
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300'
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
                {/* Icon container */}
                <div className="relative">
                    <FaMicrophone
                        size={iconSize}
                        className={`
                            transition-all duration-200
                            ${isRecording ? 'text-red-600 dark:text-red-400' : 'hover:scale-110'}
                        `}
                    />

                    {/* Processing spinner */}
                    {isProcessing && (
                        <AiOutlineLoading3Quarters
                            size={iconSize * 1.5}
                            className="absolute inset-0 -m-1 animate-spin text-blue-600 dark:text-blue-400"
                        />
                    )}
                </div>
            </button>
        </div>
    )
} 