import React, { useState, useRef, useEffect, useMemo } from 'react'
import { FaMicrophone } from 'react-icons/fa'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import { MdClose } from 'react-icons/md'
import { UserSettings } from '../../types/settings'
import { FireworksClient, TranscriptionSegment } from '../../api/fireworks'

/**
 * Props for the VoiceFireworksStreamingInput component
 */
interface VoiceFireworksStreamingInputProps {
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
 * A voice input component that uses Fireworks AI for real-time streaming transcription
 * Displays a modal with live transcription while recording
 */
export function VoiceFireworksStreamingInput({
    userSettings,
    className = '',
    iconSize = 20,
    onTranscription,
    onError
}: VoiceFireworksStreamingInputProps) {
    const fireworksClient = useMemo(() => {
        if (!userSettings.llm.fireworksKey) {
            return null
        }
        return new FireworksClient(userSettings.llm.fireworksKey)
    }, [userSettings.llm.fireworksKey])

    const [isRecording, setIsRecording] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isInitializing, setIsInitializing] = useState(false)
    const [audioLevel, setAudioLevel] = useState(0)
    const [showModal, setShowModal] = useState(false)
    const [currentTranscription, setCurrentTranscription] = useState('')
    const [segments, setSegments] = useState<TranscriptionSegment[]>([])
    
    // Audio context references
    const audioContext = useRef<AudioContext | null>(null)
    const mediaStreamSource = useRef<MediaStreamAudioSourceNode | null>(null)
    const audioAnalyser = useRef<AnalyserNode | null>(null)
    const audioWorkletNode = useRef<AudioWorkletNode | null>(null)
    const audioLevelInterval = useRef<NodeJS.Timeout | null>(null)
    const stream = useRef<MediaStream | null>(null)
    const workletReady = useRef<boolean>(false)
    const lastClickTime = useRef<number>(0)
    
    // Streaming references
    const webSocket = useRef<WebSocket | null>(null)
    const streamCleanup = useRef<(() => void) | null>(null)
    const audioChunks = useRef<Float32Array[]>([])
    const audioSampleRate = useRef<number>(0)
    
    const isIOS = useMemo(() => /iPad|iPhone|iPod/.test(navigator.userAgent), [])
    const transcriptionContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (segments.length > 0) {
            const fullTranscription = segments.map(segment => segment.text).join(' ')
            setCurrentTranscription(fullTranscription)
        }
    }, [segments])

    // Auto-scroll to the bottom of the transcription container when transcription updates
    useEffect(() => {
        if (transcriptionContainerRef.current && currentTranscription) {
            transcriptionContainerRef.current.scrollTop = transcriptionContainerRef.current.scrollHeight
        }
    }, [currentTranscription])

    // Audio worklet processor code as a string
    const audioRecorderWorkletCode = `
    class AudioRecorderProcessor extends AudioWorkletProcessor {
      constructor() {
        super()
        this.recording = false
        this.targetSampleRate = 16000
        this.resampleRatio = sampleRate / this.targetSampleRate
        this.lastIndex = 0
        this.accumulatedSamples = []
        
        this.port.onmessage = (e) => {
          if (e.data.message === 'start') {
            this.recording = true
            this.lastIndex = 0
            this.accumulatedSamples = []
          } else if (e.data.message === 'stop') {
            this.recording = false
          }
        }
      }
    
      process(inputs, outputs) {
        // Skip if not recording or no inputs
        if (!this.recording || !inputs[0] || !inputs[0][0]) return true
        
        // Get the input data (already mono from the AudioContext configuration)
        const input = inputs[0][0]
        
        // Accumulate samples and perform downsampling
        for (let i = 0; i < input.length; i++) {
          this.accumulatedSamples.push(input[i])
        }

        // Process accumulated samples when we have enough for a meaningful chunk
        if (this.accumulatedSamples.length >= 2048) {
          // Perform downsampling
          const downsampledLength = Math.floor(this.accumulatedSamples.length / this.resampleRatio)
          const downsampled = new Float32Array(downsampledLength)
          
          for (let i = 0; i < downsampledLength; i++) {
            const index = Math.floor(i * this.resampleRatio)
            // Simple linear interpolation
            const frac = i * this.resampleRatio - index
            const sample1 = this.accumulatedSamples[index]
            const sample2 = this.accumulatedSamples[Math.min(index + 1, this.accumulatedSamples.length - 1)]
            downsampled[i] = sample1 + (sample2 - sample1) * frac
          }
          
          // Send the downsampled buffer to the main thread
          this.port.postMessage({ 
            audioBuffer: downsampled,
            sampleRate: this.targetSampleRate
          })
          
          // Keep any remaining samples
          this.accumulatedSamples = this.accumulatedSamples.slice(2048)
        }
        
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
    }, [isIOS, audioWorkletBlobURL])

    /**
     * Process a chunk of audio data for streaming
     * @param audioData - The audio data to process
     */
    function processAudioChunk(audioData: Float32Array) {
        if (!webSocket.current || !fireworksClient) return
        
        // Convert to 16-bit PCM
        const buffer = new ArrayBuffer(audioData.length * 2)
        const view = new DataView(buffer)
        
        for (let i = 0; i < audioData.length; i++) {
            // Clamp the sample between -1 and 1
            const sample = Math.max(-1, Math.min(1, audioData[i]))
            // Convert to 16-bit PCM (-32768 to 32767)
            const pcm = Math.round(sample * (sample < 0 ? 0x8000 : 0x7FFF))
            view.setInt16(i * 2, pcm, true) // true for little-endian
        }
        
        // Send the audio chunk to the streaming API
        fireworksClient.sendAudioChunk(webSocket.current, new Uint8Array(buffer))
    }

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
        if (streamCleanup.current) {
            streamCleanup.current()
            streamCleanup.current = null
        }
        
        if (webSocket.current) {
            if (webSocket.current.readyState === WebSocket.OPEN) {
                webSocket.current.close()
            }
            webSocket.current = null
        }
        
        if (audioLevelInterval.current) {
            clearInterval(audioLevelInterval.current)
            audioLevelInterval.current = null
        }
        
        if (audioWorkletNode.current) {
            try {
                audioWorkletNode.current.disconnect()
                audioWorkletNode.current.port.postMessage({ message: 'stop' })
            } catch (e) {
                console.warn('Error disconnecting audio worklet node:', e)
            }
            audioWorkletNode.current = null
        }
        
        if (audioAnalyser.current) {
            try {
                audioAnalyser.current.disconnect()
            } catch (e) {
                console.warn('Error disconnecting audio analyser:', e)
            }
            audioAnalyser.current = null
        }
        
        if (mediaStreamSource.current) {
            try {
                mediaStreamSource.current.disconnect()
            } catch (e) {
                console.warn('Error disconnecting media stream source:', e)
            }
            mediaStreamSource.current = null
        }
        
        if (stream.current) {
            stream.current.getTracks().forEach(track => track.stop())
            stream.current = null
        }
        
        if (audioContext.current) {
            try {
                audioContext.current.close()
            } catch (e) {
                console.warn('Error closing audio context:', e)
            }
            audioContext.current = null
        }
        
        workletReady.current = false
        audioChunks.current = []
    }

    /**
     * Initialize the AudioWorklet processor
     */
    async function initializeAudioWorklet(context: AudioContext): Promise<boolean> {
        console.log('Initializing audio worklet...')
        
        // Always re-initialize worklet when starting a new recording
        workletReady.current = false
        
        try {
            // Ensure any previous worklet is properly cleaned up
            if (audioWorkletNode.current) {
                try {
                    audioWorkletNode.current.disconnect()
                    audioWorkletNode.current = null
                } catch (e) {
                    console.warn('Error cleaning up previous worklet:', e)
                }
            }

            // Add the worklet module
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

    /**
     * Start recording and initialize streaming transcription
     */
    async function startRecording(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()

        if (!fireworksClient) {
            onError?.('Fireworks AI API key not configured')
            return
        }

        setIsInitializing(true)
        setCurrentTranscription('')
        setSegments([])
        audioChunks.current = []

        try {
            // Initialize audio context
            if (!audioContext.current) {
                audioContext.current = new AudioContext()
            } else if (audioContext.current.state === 'suspended') {
                await audioContext.current.resume()
            }
            
            const workletInitialized = await initializeAudioWorklet(audioContext.current)
            if (!workletInitialized) {
                throw new Error('Failed to initialize audio processor')
            }
            
            audioSampleRate.current = audioContext.current.sampleRate
            
            // Request microphone access
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
            
            // Set up audio processing
            mediaStreamSource.current = audioContext.current.createMediaStreamSource(stream.current)
            
            // Set up audio level visualization
            audioAnalyser.current = audioContext.current.createAnalyser()
            audioAnalyser.current.fftSize = 256
            mediaStreamSource.current.connect(audioAnalyser.current)
            audioLevelInterval.current = setInterval(updateAudioLevel, 50)
            
            // Set up audio worklet
            audioWorkletNode.current = new AudioWorkletNode(audioContext.current, 'audio-recorder-processor', {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                channelCount: 1,
                processorOptions: {}
            })
            
            // Initialize streaming transcription
            const streamConnection = fireworksClient.createTranscriptionStream({
                onTranscriptionSegments: (segments: TranscriptionSegment[]) => {
                    setSegments([...segments])
                },
                onError: (error: string) => {
                    onError?.(error)
                },
                onClose: () => {
                    console.log('Transcription stream closed')
                },
                language: 'en',
                responseFormat: 'verbose_json'
            })
            
            webSocket.current = streamConnection.ws
            streamCleanup.current = streamConnection.cleanup
            
            // Handle audio data from the worklet
            audioWorkletNode.current.port.onmessage = (event) => {
                if (event.data.audioBuffer) {
                    const audioBuffer = event.data.audioBuffer
                    audioChunks.current.push(audioBuffer)
                    processAudioChunk(audioBuffer)
                }
            }
            
            // Connect audio nodes
            mediaStreamSource.current.connect(audioWorkletNode.current)
            const silentGain = audioContext.current.createGain()
            silentGain.gain.value = 0
            audioWorkletNode.current.connect(silentGain)
            silentGain.connect(audioContext.current.destination)
            
            // Start recording
            audioWorkletNode.current.port.postMessage({ message: 'start' })
            
            setIsRecording(true)
            setShowModal(true)
            setIsInitializing(false)
            
        } catch (error) {
            console.error('Error starting recording:', error)
            onError?.(error instanceof Error ? error.message : 'Failed to start recording')
            cleanupAudio()
            setIsInitializing(false)
        }
    }

    /**
     * Stop recording and finalize the transcription
     */
    async function stopRecording() {
        setIsRecording(false)
        setIsProcessing(true)
        
        try {
            if (audioWorkletNode.current) {
                audioWorkletNode.current.port.postMessage({ message: 'stop' })
            }
            
            // Wait a moment for any final chunks to be processed
            await new Promise(resolve => setTimeout(resolve, 250))
            
            // Use the final transcription
            if (currentTranscription) {
                onTranscription(currentTranscription)
            } else {
                throw new Error('No transcription received')
            }
        } catch (error) {
            console.error('Error finalizing transcription:', error)
            onError?.(error instanceof Error ? error.message : 'Failed to finalize transcription')
        } finally {
            cleanupAudio()
            setShowModal(false)
            setIsProcessing(false)
        }
    }

    /**
     * Cancel recording without saving the transcription
     */
    function cancelRecording() {
        setIsRecording(false)
        cleanupAudio()
        setShowModal(false)
    }

    /**
     * Handle button click to start or stop recording
     */
    function handleClick(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()

        // Prevent rapid clicking
        const now = Date.now()
        if (now - lastClickTime.current < 1000) {
            return
        }
        lastClickTime.current = now

        // Don't allow starting if we're already processing or initializing
        if (!isRecording && (isProcessing || isInitializing)) {
            return
        }
        
        if (isRecording) {
            stopRecording()
        } else {
            startRecording(e)
        }
    }

    if (!fireworksClient) {
        return null
    }

    return (
        <>
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
            
            {/* Transcription Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
                    <div 
                        className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-lg mx-4 
                        overflow-hidden border border-gray-200/20 dark:border-gray-700/30 transform transition-all duration-200
                        animate-slideUp"
                    >
                        <div className="p-6 flex items-center justify-between gap-4">
                            <div className={`
                                w-2.5 h-2.5 rounded-full flex-shrink-0
                                ${isRecording 
                                    ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50' 
                                    : 'bg-gray-400'
                                }
                            `}></div>
                            
                            {isRecording && (
                                <div className="flex-1 h-8 bg-gray-100/50 dark:bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                                    <div className="h-full flex items-center gap-0.5 p-2">
                                        {[...Array(20)].map((_, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 h-full bg-blue-500/80 dark:bg-blue-400/80 rounded-full transform transition-all duration-150"
                                                style={{ 
                                                    transform: `scaleY(${Math.max(0.15, Math.min(1, audioLevel * Math.random() * 2))})`,
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <button 
                                onClick={cancelRecording}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                                        rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors flex-shrink-0"
                            >
                                <MdClose size={20} />
                                <span className="sr-only">Close</span>
                            </button>
                        </div>
                        
                        <div 
                            ref={transcriptionContainerRef}
                            className="px-4 pb-4 h-64 overflow-y-auto"
                        >
                            {currentTranscription ? (
                                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                    {currentTranscription}
                                </p>
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 italic text-center py-8">
                                    {isRecording ? 'Waiting for speech...' : 'No transcription available'}
                                </p>
                            )}
                        </div>
                        
                        <div className="px-4 pb-2 pt-2 flex justify-end">
                            <button
                                onClick={stopRecording}
                                disabled={!isRecording || isProcessing}
                                className={`
                                    px-4 py-2.5 rounded-xl font-medium
                                    transition-all duration-200
                                    ${isRecording 
                                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 ' +
                                          'dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 ' +
                                          'text-white shadow-lg shadow-blue-500/25 dark:shadow-blue-700/25'
                                        : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                                    }
                                    disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                                `}
                            >
                                {isProcessing ? (
                                    <span className="flex items-center gap-2">
                                        <AiOutlineLoading3Quarters className="animate-spin" />
                                        Processing...
                                    </span>
                                ) : (
                                    'Done'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
} 