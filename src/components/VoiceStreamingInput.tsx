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
    const [isInitializing, setIsInitializing] = useState(false)
    const recorder = useRef<RecordRTCPromisesHandler | null>(null)
    const stream = useRef<MediaStream | null>(null)
    const audioContext = useRef<AudioContext | null>(null)
    const audioAnalyser = useRef<AnalyserNode | null>(null)
    const audioLevelInterval = useRef<NodeJS.Timeout | null>(null)
    const isIOS = useMemo(() => /iPad|iPhone|iPod/.test(navigator.userAgent), [])

    // Pre-initialize AudioContext on component mount for iOS
    useEffect(() => {
        // Only pre-initialize for iOS to avoid unnecessary resource usage on other platforms
        if (isIOS && !audioContext.current) {
            try {
                // Create but don't start the AudioContext yet
                audioContext.current = new AudioContext({
                    sampleRate: 16000,
                    latencyHint: 'interactive'
                })
                
                // Suspend it immediately to save resources
                if (audioContext.current.state === 'running') {
                    audioContext.current.suspend()
                }
            } catch (error) {
                console.warn('Failed to pre-initialize AudioContext:', error)
                // Not critical, we'll try again when recording starts
            }
        }
        
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
    }, [isIOS])

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

        // Set initializing state to provide immediate feedback
        setIsInitializing(true)

        try {
            // If we already have an AudioContext, resume it instead of creating a new one
            if (!audioContext.current) {
                audioContext.current = new AudioContext({
                    sampleRate: 16000,
                    latencyHint: 'interactive'
                })
            } else if (audioContext.current.state === 'suspended') {
                await audioContext.current.resume()
            }

            // iOS specific constraints that help with consistency
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    latency: 0,
                    channelCount: 1,
                    sampleRate: 16000,
                    sampleSize: 16
                }
            }

            // Request media stream - this is the most time-consuming operation
            stream.current = await navigator.mediaDevices.getUserMedia(constraints)

            // Check if we actually got audio tracks
            if (!stream.current.getAudioTracks().length) {
                throw new Error('No audio track available')
            }

            // Set up audio analysis
            const source = audioContext.current.createMediaStreamSource(stream.current)
            audioAnalyser.current = audioContext.current.createAnalyser()
            audioAnalyser.current.fftSize = 256
            source.connect(audioAnalyser.current)
            audioLevelInterval.current = setInterval(updateAudioLevel, 50)

            if (isIOS) {
                const options: any = {
                    type: 'audio',
                    mimeType: 'audio/wav',
                    recorderType: RecordRTC.StereoAudioRecorder,
                    audioBitsPerSecond: 16000,
                    bufferSize: 2048,
                    numberOfAudioChannels: 1,
                    timeSlice: 500,
                    disableLogs: true,
                    checkForInactiveTracks: true,
                    detectSilence: false
                }

                // Initialize recorder
                recorder.current = new RecordRTCPromisesHandler(stream.current, options)
                
                // Reduced delay from 300ms to 100ms - just enough to let iOS prepare
                // but not so long that it feels laggy to the user
                setTimeout(async () => {
                    try {
                        if (recorder.current) {
                            await recorder.current.startRecording()
                            setIsRecording(true)
                            setIsInitializing(false)
                        }
                    } catch (iosError) {
                        console.error('iOS specific recording error:', iosError)
                        onError?.(iosError instanceof Error ? iosError.message : 'iOS recording failed to start')
                        // Cleanup
                        if (stream.current) {
                            stream.current.getTracks().forEach(track => track.stop())
                            stream.current = null
                        }
                        if (audioContext.current) {
                            audioContext.current.close()
                            audioContext.current = null
                        }
                        setAudioLevel(0)
                        setIsInitializing(false)
                    }
                }, 100)
            } else {
                // Non-iOS setup remains the same
                recorder.current = new RecordRTCPromisesHandler(stream.current, {
                    type: 'audio',
                    mimeType: 'audio/webm;codecs=opus' as any,
                    recorderType: RecordRTC.StereoAudioRecorder,
                    numberOfAudioChannels: 1,
                    desiredSampRate: 16000,
                    audioBitsPerSecond: 16000,
                    // Ensure we get data frequently for better reliability
                    timeSlice: 1000
                })
                
                await recorder.current.startRecording()
                setIsRecording(true)
                setIsInitializing(false)
            }

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
            setIsInitializing(false)
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

            // iOS specific handling - add a small delay before stopping
            if (isIOS) {
                // Give iOS a moment to finalize the recording
                await new Promise(resolve => setTimeout(resolve, 200))
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

            // For iOS, verify the blob type is correct
            if (isIOS && blob.type !== 'audio/wav') {
                console.warn(`iOS recording produced unexpected MIME type: ${blob.type}, expected audio/wav`)
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
            <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleClick}
                disabled={isProcessing}
                className={`
                    relative
                    transition-all duration-200
                    rounded-full p-2
                    ${isRecording 
                        ? 'bg-red-500 dark:bg-red-600' 
                        : isInitializing
                            ? 'bg-yellow-400 dark:bg-yellow-500'
                            : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                    focus:outline-none
                    ${className}
                `}
                aria-label={
                    isProcessing ? "Processing voice input..."
                        : isInitializing ? "Initializing microphone..."
                        : isRecording ? "Stop recording"
                            : "Start voice input"
                }
                title={
                    isProcessing ? "Converting speech to text..."
                        : isInitializing ? "Preparing microphone..."
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
                            ${isRecording 
                                ? audioLevel > 0.1 
                                    ? 'text-white' 
                                    : 'text-black dark:text-black'
                                : isInitializing
                                    ? 'text-black dark:text-black'
                                    : 'text-gray-700 dark:text-gray-300'
                            }
                        `}
                        style={isRecording && audioLevel > 0.1 ? { opacity: Math.max(0.5, audioLevel) } : {}}
                    />

                    {/* Processing spinner */}
                    {(isProcessing || isInitializing || true
                    ) && (
                        <AiOutlineLoading3Quarters
                            size={iconSize * 1.5}
                            className={`
                                absolute inset-0 -m-1 animate-spin
                                ${isProcessing 
                                    ? 'text-blue-600 dark:text-blue-400' 
                                    : 'text-black dark:text-white'
                                }
                            `}
                        />
                    )}
                </div>
            </button>
        </div>
    )
} 