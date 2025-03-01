import React, { useState, useRef, useEffect, useMemo } from 'react'
import { FaMicrophone } from 'react-icons/fa'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import { OpenAIClient } from '../api/openai'
import { UserSettings } from '../types/settings'

/** Props for the VoiceStreamingInput component */
interface VoiceTranscriptionInputProps {
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
 * Uses modern AudioWorkletNode for high-performance audio processing
 */
export function VoiceTranscriptionInput({
    userSettings,
    className = '',
    iconSize = 20,
    onTranscription,
    onError
}: VoiceTranscriptionInputProps) {
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
    const audioWorkletNode = useRef<AudioWorkletNode | null>(null)
    const audioLevelInterval = useRef<NodeJS.Timeout | null>(null)
    const stream = useRef<MediaStream | null>(null)
    const workletReady = useRef<boolean>(false)
    const lastClickTime = useRef<number>(0)
    
    // Audio data storage
    const audioChunks = useRef<Float32Array[]>([])
    const audioSampleRate = useRef<number>(0)
    
    const isIOS = useMemo(() => /iPad|iPhone|iPod/.test(navigator.userAgent), [])

    // Audio worklet processor code as a string
    const audioRecorderWorkletCode = `
    class AudioRecorderProcessor extends AudioWorkletProcessor {
      constructor() {
        super()
        this.recording = false
        this.port.onmessage = (e) => {
          if (e.data.message === 'start') {
            this.recording = true
          } else if (e.data.message === 'stop') {
            this.recording = false
          }
        }
      }
    
      process(inputs, outputs) {
        // Skip if not recording or no inputs
        if (!this.recording || !inputs[0] || !inputs[0][0]) return true
        
        // Get the input data
        const input = inputs[0][0]
        
        // Create a copy to send via the port
        const buffer = new Float32Array(input.length)
        buffer.set(input)
        
        // Send the buffer to the main thread
        this.port.postMessage({ audioBuffer: buffer })
        
        return true
      }
    }
    
    registerProcessor('audio-recorder-processor', AudioRecorderProcessor)
    `

    // Create a Blob URL for the worklet processor
    const audioWorkletBlobURL = useMemo(() => {
        const blob = new Blob([audioRecorderWorkletCode], { type: 'application/javascript' })
        return URL.createObjectURL(blob)
    }, [])

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
        
        // Cleanup only on component unmount
        return () => {
            cleanupAudio()
            
            // Revoke the Blob URL when component unmounts
            URL.revokeObjectURL(audioWorkletBlobURL)
        }
    }, [isIOS, audioWorkletBlobURL]) // Remove isRecording from dependencies

    // Update audio level visualization
    function updateAudioLevel() {
        if (!audioAnalyser.current) {
            console.log('No audio analyser available for level update')
            return
        }
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
        if (normalizedLevel > 0.1) {
            console.log('Audio level:', normalizedLevel.toFixed(2))
        }
        setAudioLevel(normalizedLevel)
    }

    /**
     * Cleanup all audio resources
     */
    function cleanupAudio() {
        console.log('Cleaning up audio resources')
        
        if (audioLevelInterval.current) {
            clearInterval(audioLevelInterval.current)
            audioLevelInterval.current = null
        }
        
        if (audioWorkletNode.current) {
            console.log('Disconnecting audio worklet node')
            audioWorkletNode.current.disconnect()
            audioWorkletNode.current.port.postMessage({ message: 'stop' })
            audioWorkletNode.current = null
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
            console.log('Stopping media stream tracks')
            stream.current.getTracks().forEach(track => track.stop())
            stream.current = null
        }
        
        if (audioContext.current) {
            console.log('Closing audio context')
            audioContext.current.close()
            audioContext.current = null
        }
        
        workletReady.current = false
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
     * Downsamples audio data to a lower sample rate using a more accurate algorithm
     */
    function downsampleAudio(audioData: Float32Array, sampleRate: number, targetSampleRate: number): Float32Array {
        if (targetSampleRate === sampleRate) {
            return audioData
        }
        
        const ratio = sampleRate / targetSampleRate
        const newLength = Math.round(audioData.length / ratio)
        const result = new Float32Array(newLength)
        
        // Higher quality linear interpolation with anti-aliasing
        const filter = Math.min(1.0, targetSampleRate / sampleRate)
        
        for (let i = 0; i < newLength; i++) {
            const position = i * ratio
            const leftIndex = Math.floor(position)
            const rightIndex = Math.ceil(position)
            const fraction = position - leftIndex
            
            // Simple anti-aliasing by averaging nearby samples
            let sum = 0
            let count = 0
            const filterWidth = Math.ceil(ratio * filter)
            
            for (let j = Math.max(0, leftIndex - filterWidth); j <= Math.min(audioData.length - 1, rightIndex + filterWidth); j++) {
                // Apply a simple triangular window function
                const distance = Math.abs(position - j) / filterWidth
                const weight = Math.max(0, 1 - distance)
                sum += audioData[j] * weight
                count += weight
            }
            
            result[i] = count > 0 ? sum / count : 0
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

    /**
     * Initialize the AudioWorklet processor
     */
    async function initializeAudioWorklet(context: AudioContext): Promise<boolean> {
        console.log('Initializing audio worklet...')
        if (workletReady.current) {
            console.log('Audio worklet already initialized')
            return true
        }
        
        try {
            await context.audioWorklet.addModule(audioWorkletBlobURL)
            console.log('Audio worklet successfully initialized')
            workletReady.current = true
            return true
        } catch (error) {
            console.error('Failed to initialize Audio Worklet:', error)
            onError?.('Failed to initialize audio processor')
            return false
        }
    }

    async function startRecording(e: React.MouseEvent) {
        console.log('Starting recording...')
        e.preventDefault()
        e.stopPropagation()

        if (!openaiClient) {
            console.error('OpenAI client not configured')
            onError?.('OpenAI API key not configured')
            return
        }

        setIsInitializing(true)
        audioChunks.current = []

        try {
            if (!audioContext.current) {
                console.log('Creating new AudioContext')
                audioContext.current = new AudioContext()
            } else if (audioContext.current.state === 'suspended') {
                console.log('Resuming suspended AudioContext')
                await audioContext.current.resume()
            }
            
            const workletInitialized = await initializeAudioWorklet(audioContext.current)
            if (!workletInitialized) {
                throw new Error('Failed to initialize audio processor')
            }
            
            audioSampleRate.current = audioContext.current.sampleRate
            console.log('Audio sample rate:', audioSampleRate.current)
            
            console.log('Requesting media stream...')
            stream.current = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1
                }
            })

            if (!stream.current.getAudioTracks().length) {
                throw new Error('No audio track available')
            }
            console.log('Media stream acquired successfully')

            mediaStreamSource.current = audioContext.current.createMediaStreamSource(stream.current)
            
            console.log('Setting up audio analyser')
            audioAnalyser.current = audioContext.current.createAnalyser()
            audioAnalyser.current.fftSize = 256
            mediaStreamSource.current.connect(audioAnalyser.current)
            audioLevelInterval.current = setInterval(updateAudioLevel, 50)
            
            console.log('Creating AudioWorkletNode')
            audioWorkletNode.current = new AudioWorkletNode(audioContext.current, 'audio-recorder-processor', {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                channelCount: 1,
                processorOptions: {}
            })
            
            audioWorkletNode.current.port.onmessage = (event) => {
                if (event.data.audioBuffer) {
                    audioChunks.current.push(event.data.audioBuffer)
                    if (audioChunks.current.length % 50 === 0) {
                        console.log('Recorded chunks:', audioChunks.current.length)
                    }
                }
            }
            
            console.log('Connecting audio nodes')
            mediaStreamSource.current.connect(audioWorkletNode.current)
            const silentGain = audioContext.current.createGain()
            silentGain.gain.value = 0
            audioWorkletNode.current.connect(silentGain)
            silentGain.connect(audioContext.current.destination)
            
            console.log('Starting audio recording')
            audioWorkletNode.current.port.postMessage({ message: 'start' })
            
            if (isIOS) {
                console.log('iOS detected, adding delay')
                await new Promise(resolve => setTimeout(resolve, 100))
            }
            
            setIsRecording(true)
            setIsInitializing(false)
            console.log('Recording started successfully')

        } catch (error) {
            console.error('Error starting recording:', error)
            onError?.(error instanceof Error ? error.message : 'Failed to start recording')
            cleanupAudio()
            setAudioLevel(0)
            setIsInitializing(false)
        }
    }

    async function stopRecording() {
        console.log('Stopping recording...')
        if (!audioContext.current || !openaiClient || !audioWorkletNode.current) {
            console.error('Missing required audio components for stopping')
            return
        }

        setIsRecording(false)
        setIsProcessing(true)

        try {
            if (audioWorkletNode.current) {
                console.log('Sending stop message to worklet')
                audioWorkletNode.current.port.postMessage({ message: 'stop' })
            }
            
            if (isIOS) {
                console.log('iOS detected, adding stop delay')
                await new Promise(resolve => setTimeout(resolve, 200))
            }
            
            console.log('Merging audio chunks...')
            const audioData = mergeAudioChunks(audioChunks.current)
            console.log('Total samples:', audioData.length)
            
            if (audioLevelInterval.current) {
                clearInterval(audioLevelInterval.current)
                audioLevelInterval.current = null
            }
            
            if (audioWorkletNode.current) {
                audioWorkletNode.current.disconnect()
                audioWorkletNode.current = null
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

            if (audioData.length < 100) {
                throw new Error(`Recording appears to be empty: ${audioData.length} samples`)
            }
            
            console.log('Creating WAV file...')
            const blob = createWavFile(audioData, audioSampleRate.current, 16000)
            console.log('WAV file size:', blob.size, 'bytes')

            console.log('Starting transcription...')
            try {
                const transcription = await openaiClient.transcribeAudio(blob)
                if (!transcription || transcription.trim().length === 0) {
                    throw new Error('No speech detected in recording')
                }
                console.log('Transcription successful:', transcription)
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
            
            if (audioContext.current) {
                console.log('Closing audio context')
                audioContext.current.close()
                audioContext.current = null
            }
            
            audioChunks.current = []
            console.log('Recording cleanup complete')
        }
    }

    function handleClick(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()

        // Prevent rapid clicking
        const now = Date.now()
        if (now - lastClickTime.current < 1000) {
            console.log('Click ignored - too soon after last click')
            return
        }
        lastClickTime.current = now

        // Don't allow starting if we're already processing or initializing
        if (!isRecording && (isProcessing || isInitializing)) {
            console.log('Click ignored - already processing or initializing')
            return
        }

        console.log('Click handled, current state:', { isRecording, isProcessing, isInitializing })
        
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