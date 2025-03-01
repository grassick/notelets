import React, { useState, useRef, useEffect, useMemo } from 'react'
import { FaMicrophone } from 'react-icons/fa'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
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

/**
 * A voice input button that handles recording and progressive transcription using OpenAI's Whisper API
 * Uses pure AudioContext for better control and fewer dependencies
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
    
    // Audio context references
    const audioContext = useRef<AudioContext | null>(null)
    const mediaStreamSource = useRef<MediaStreamAudioSourceNode | null>(null)
    const audioAnalyser = useRef<AnalyserNode | null>(null)
    const audioProcessor = useRef<ScriptProcessorNode | null>(null)
    const audioLevelInterval = useRef<NodeJS.Timeout | null>(null)
    const stream = useRef<MediaStream | null>(null)
    
    // Audio data storage
    const audioChunks = useRef<Float32Array[]>([])
    const audioSampleRate = useRef<number>(0)
    
    const isIOS = useMemo(() => /iPad|iPhone|iPod/.test(navigator.userAgent), [])

    // Pre-initialize AudioContext on component mount for iOS
    useEffect(() => {
        // Only pre-initialize for iOS to avoid unnecessary resource usage on other platforms
        if (isIOS && !audioContext.current) {
            try {
                // Create but don't start the AudioContext yet
                audioContext.current = new AudioContext()
                
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
            if (isRecording) {
                stopRecording()
            }
            cleanupAudio()
        }
    }, [isIOS, isRecording])

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

    /**
     * Cleanup all audio resources
     */
    function cleanupAudio() {
        if (audioLevelInterval.current) {
            clearInterval(audioLevelInterval.current)
            audioLevelInterval.current = null
        }
        
        if (audioProcessor.current) {
            audioProcessor.current.disconnect()
            audioProcessor.current = null
        }
        
        if (audioAnalyser.current) {
            audioAnalyser.current.disconnect()
            audioAnalyser.current = null
        }
        
        if (mediaStreamSource.current) {
            mediaStreamSource.current.disconnect()
            mediaStreamSource.current = null
        }
        
        if (stream.current) {
            stream.current.getTracks().forEach(track => track.stop())
            stream.current = null
        }
        
        if (audioContext.current) {
            audioContext.current.close()
            audioContext.current = null
        }
        
        audioChunks.current = []
    }

    /**
     * Creates a WAV file from the recorded audio data
     * @param audioData - Float32Array of audio samples
     * @param sampleRate - The sample rate of the audio
     * @param targetSampleRate - The target sample rate for downsampling (default: 16000)
     * @returns A Blob containing the WAV file
     */
    function createWavFile(audioData: Float32Array, sampleRate: number, targetSampleRate: number = 16000): Blob {
        // Downsample if needed
        const downsampledData = downsampleAudio(audioData, sampleRate, targetSampleRate)
        
        // Convert to 16-bit PCM
        const numSamples = downsampledData.length
        const numBytes = numSamples * 2 // 16-bit = 2 bytes per sample
        const buffer = new ArrayBuffer(44 + numBytes) // 44 bytes for header
        const view = new DataView(buffer)
        
        // RIFF header
        writeString(view, 0, 'RIFF')
        view.setUint32(4, 36 + numBytes, true) // File size - 8
        writeString(view, 8, 'WAVE')
        
        // fmt subchunk
        writeString(view, 12, 'fmt ')
        view.setUint32(16, 16, true) // Subchunk size (16 for PCM)
        view.setUint16(20, 1, true) // Audio format (1 for PCM)
        view.setUint16(22, 1, true) // Number of channels (1 for mono)
        view.setUint32(24, targetSampleRate, true) // Sample rate
        view.setUint32(28, targetSampleRate * 2, true) // Byte rate (SampleRate * BlockAlign)
        view.setUint16(32, 2, true) // Block align (NumChannels * BitsPerSample/8)
        view.setUint16(34, 16, true) // Bits per sample
        
        // data subchunk
        writeString(view, 36, 'data')
        view.setUint32(40, numBytes, true) // Subchunk size
        
        // Write the audio data
        floatTo16BitPCM(view, 44, downsampledData)
        
        return new Blob([buffer], { type: 'audio/wav' })
    }
    
    /**
     * Downsamples audio data to a lower sample rate
     */
    function downsampleAudio(audioData: Float32Array, sampleRate: number, targetSampleRate: number): Float32Array {
        if (targetSampleRate === sampleRate) {
            return audioData
        }
        
        const ratio = sampleRate / targetSampleRate
        const newLength = Math.round(audioData.length / ratio)
        const result = new Float32Array(newLength)
        
        for (let i = 0; i < newLength; i++) {
            const position = i * ratio
            const index = Math.floor(position)
            const fraction = position - index
            
            // Linear interpolation
            if (index + 1 < audioData.length) {
                result[i] = audioData[index] * (1 - fraction) + audioData[index + 1] * fraction
            } else {
                result[i] = audioData[index]
            }
        }
        
        return result
    }
    
    /**
     * Writes a string to a DataView at a specified offset
     */
    function writeString(view: DataView, offset: number, string: string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i))
        }
    }
    
    /**
     * Converts float audio data to 16-bit PCM
     */
    function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
        for (let i = 0; i < input.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, input[i]))
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
        }
    }

    /**
     * Combines all recorded audio chunks into a single Float32Array
     */
    function mergeAudioChunks(chunks: Float32Array[]): Float32Array {
        let totalLength = 0
        chunks.forEach(chunk => {
            totalLength += chunk.length
        })
        
        const result = new Float32Array(totalLength)
        let offset = 0
        
        chunks.forEach(chunk => {
            result.set(chunk, offset)
            offset += chunk.length
        })
        
        return result
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
        audioChunks.current = [] // Reset audio chunks

        try {
            // If we already have an AudioContext, resume it instead of creating a new one
            if (!audioContext.current) {
                audioContext.current = new AudioContext()
            } else if (audioContext.current.state === 'suspended') {
                await audioContext.current.resume()
            }
            
            // Store the sample rate
            audioSampleRate.current = audioContext.current.sampleRate
            
            // iOS specific constraints that help with consistency
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1
                }
            }

            // Request media stream
            stream.current = await navigator.mediaDevices.getUserMedia(constraints)

            // Check if we actually got audio tracks
            if (!stream.current.getAudioTracks().length) {
                throw new Error('No audio track available')
            }

            // Set up audio processing pipeline
            mediaStreamSource.current = audioContext.current.createMediaStreamSource(stream.current)
            
            // Set up audio analysis for visualization
            audioAnalyser.current = audioContext.current.createAnalyser()
            audioAnalyser.current.fftSize = 256
            mediaStreamSource.current.connect(audioAnalyser.current)
            audioLevelInterval.current = setInterval(updateAudioLevel, 50)
            
            // Create ScriptProcessorNode for recording
            // Note: This is deprecated but more widely supported than AudioWorkletNode
            audioProcessor.current = audioContext.current.createScriptProcessor(4096, 1, 1)
            
            // Handle audio processing event
            audioProcessor.current.onaudioprocess = (e) => {
                if (!isRecording) return
                
                // Get channel data and store it
                const audioBuffer = e.inputBuffer.getChannelData(0)
                const bufferCopy = new Float32Array(audioBuffer.length)
                bufferCopy.set(audioBuffer)
                audioChunks.current.push(bufferCopy)
            }
            
            // Connect processor but not to the destination (we don't want to hear playback)
            mediaStreamSource.current.connect(audioProcessor.current)
            audioProcessor.current.connect(audioContext.current.destination)
            
            // Short delay for iOS to prepare
            if (isIOS) {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
            
            setIsRecording(true)
            setIsInitializing(false)

        } catch (error) {
            console.error('Error starting recording:', error)
            onError?.(error instanceof Error ? error.message : 'Failed to start recording')
            // Cleanup any partial setup
            cleanupAudio()
            setAudioLevel(0)
            setIsInitializing(false)
        }
    }

    async function stopRecording() {
        if (!audioContext.current || !openaiClient) return

        setIsRecording(false)
        setIsProcessing(true)

        try {
            // iOS specific handling - add a small delay before stopping
            if (isIOS) {
                // Give iOS a moment to finalize the recording
                await new Promise(resolve => setTimeout(resolve, 200))
            }
            
            // Merge all audio chunks
            const audioData = mergeAudioChunks(audioChunks.current)
            
            // Stop audio visualization
            if (audioLevelInterval.current) {
                clearInterval(audioLevelInterval.current)
                audioLevelInterval.current = null
            }
            
            // Cleanup audio nodes
            if (audioProcessor.current) {
                audioProcessor.current.disconnect()
                audioProcessor.current = null
            }
            
            if (audioAnalyser.current) {
                audioAnalyser.current.disconnect()
                audioAnalyser.current = null
            }
            
            if (mediaStreamSource.current) {
                mediaStreamSource.current.disconnect()
                mediaStreamSource.current = null
            }
            
            // Stop all tracks
            if (stream.current) {
                stream.current.getTracks().forEach(track => track.stop())
                stream.current = null
            }

            // Verify we have valid audio data
            if (audioData.length < 100) {
                throw new Error(`Recording appears to be empty: ${audioData.length} samples`)
            }
            
            // Create WAV file, downsampling to 16kHz
            const blob = createWavFile(audioData, audioSampleRate.current, 16000)

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
            
            // Cleanup audio context
            if (audioContext.current) {
                audioContext.current.close()
                audioContext.current = null
            }
            
            audioChunks.current = []
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
                {isProcessing || isInitializing ? (
                    <AiOutlineLoading3Quarters
                        size={iconSize}
                        className="animate-spin text-blue-600 dark:text-blue-400"
                    />
                ) : (
                    <FaMicrophone
                        size={iconSize}
                        className={`
                            transition-all duration-200
                            ${isRecording 
                                ? audioLevel > 0.1 
                                    ? 'text-white' 
                                    : 'text-black dark:text-black'
                                : 'text-gray-700 dark:text-gray-300'
                            }
                        `}
                        style={isRecording && audioLevel > 0.1 ? { opacity: Math.max(0.5, audioLevel) } : {}}
                    />
                )}
            </button>
        </div>
    )
} 