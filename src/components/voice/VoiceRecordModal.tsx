import React from 'react'
import { useState, useEffect, useRef } from 'react'
import { FaMicrophone } from 'react-icons/fa'
import { OpenAIClient } from '../../api/openai'

/** Props for the VoiceRecordModal component */
interface VoiceRecordModalProps {
    /** Whether the modal is open */
    isOpen: boolean
    /** Called when the modal should close */
    onClose: () => void
    /** Called when transcription is complete with the transcribed text */
    onTranscriptionComplete: (text: string) => void
    /** OpenAI client instance */
    openaiClient: OpenAIClient
}

/**
 * Modal component for voice recording and transcription
 */
export function VoiceRecordModal(props: VoiceRecordModalProps) {
    const { isOpen, onClose, onTranscriptionComplete, openaiClient } = props
    const [isRecording, setIsRecording] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const mediaRecorder = useRef<MediaRecorder | null>(null)
    const chunks = useRef<Blob[]>([])

    // Start recording when modal opens
    useEffect(() => {
        if (isOpen) {
            startRecording()
        } else {
            setIsRecording(false)
            setIsProcessing(false)
        }
    }, [isOpen])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mediaRecorder.current && isRecording) {
                mediaRecorder.current.stop()
            }
        }
    }, [isRecording])

    async function startRecording() {
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
            onClose()
        }
    }

    async function handleStopRecording() {
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
            const transcription = await openaiClient.transcribeAudio(audioBlob)
            
            // Pass transcription back
            onTranscriptionComplete(transcription)
            onClose()
        } catch (error) {
            console.error('Error processing audio:', error)
            setIsProcessing(false)
        }
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/30 z-50"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!isProcessing) onClose()
                }}
                onMouseDown={(e) => e.preventDefault()}
            />

            {/* Modal */}
            <div 
                className="fixed inset-0 flex items-center justify-center p-4 z-50"
                onMouseDown={(e) => e.preventDefault()}
            >
                <div 
                    className="mx-auto max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        {isProcessing ? 'Processing...' : 'Recording...'}
                    </h2>

                    <div className="flex flex-col items-center gap-4">
                        <button
                            className={`
                                w-24 h-24 rounded-full flex items-center justify-center
                                transition-all duration-200
                                ${isProcessing 
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                                }
                                ${!isProcessing && 'animate-pulse'}
                                disabled:opacity-50 disabled:cursor-not-allowed
                                focus:outline-none
                            `}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (!isProcessing) handleStopRecording()
                            }}
                            disabled={isProcessing}
                            aria-label={isProcessing ? "Processing..." : "Stop recording"}
                        >
                            <FaMicrophone 
                                size={32}
                                className={`
                                    transition-transform
                                    ${!isProcessing && 'hover:scale-110'}
                                `}
                            />
                        </button>

                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {isProcessing 
                                ? 'Converting speech to text...' 
                                : "Tap microphone when you're done speaking"
                            }
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
} 