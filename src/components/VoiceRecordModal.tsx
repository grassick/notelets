import React from 'react'
import { useState, useEffect } from 'react'
import { FaStop } from 'react-icons/fa'

/** Props for the VoiceRecordModal component */
interface VoiceRecordModalProps {
    /** Whether the modal is open */
    isOpen: boolean
    /** Called when the modal should close */
    onClose: () => void
    /** Called when transcription is complete with the transcribed text */
    onTranscriptionComplete: (text: string) => void
}

/**
 * Modal component for voice recording and transcription
 */
export function VoiceRecordModal(props: VoiceRecordModalProps) {
    const { isOpen, onClose, onTranscriptionComplete } = props
    const [isRecording, setIsRecording] = useState(false)

    // Start recording when modal opens, stop when it closes
    useEffect(() => {
        if (isOpen) {
            setIsRecording(true)
        } else {
            setIsRecording(false)
        }
    }, [isOpen])

    function handleStopRecording() {
        setIsRecording(false)
        // For proof of concept, just output "hello world"
        onTranscriptionComplete("hello world")
        onClose()
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
                    onClose()
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
                        Recording...
                    </h2>

                    <div className="flex flex-col items-center gap-4">
                        <div className="w-24 h-24 rounded-full flex items-center justify-center
                                    transition-colors duration-200
                                    bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse">
                            <FaStop 
                                size={32}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleStopRecording()
                                }}
                                className="cursor-pointer hover:scale-110 transition-transform"
                            />
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Click stop when you're done speaking
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
} 