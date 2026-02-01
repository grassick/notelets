import React, { useRef, useState } from 'react'
import { FaCamera, FaSpinner } from 'react-icons/fa'
import { imageToMarkdown } from '../../api/imageToMarkdown'
import { UserSettings } from '../../types/settings'
import { useIsMobile } from '../../hooks/useIsMobile'

/** Props for the ImageCaptureInput component */
interface ImageCaptureInputProps {
    /** User settings containing API keys */
    userSettings: UserSettings
    /** Callback when markdown is extracted from an image */
    onMarkdownExtracted: (markdown: string) => void
    /** Optional callback for errors */
    onError?: (error: string) => void
    /** Optional class name for the button */
    className?: string
    /** Optional size for the icon */
    iconSize?: number
}

/**
 * Component that handles capturing or selecting an image and converting it to markdown.
 * On mobile, it opens the camera. On desktop, it opens a file picker.
 */
export function ImageCaptureInput({
    userSettings,
    onMarkdownExtracted,
    onError,
    className = '',
    iconSize = 16
}: ImageCaptureInputProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const isMobile = useIsMobile()

    /**
     * Convert a File to base64 data URL
     */
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result)
                } else {
                    reject(new Error('Failed to read file as base64'))
                }
            }
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file)
        })
    }

    /**
     * Handle file selection from input
     */
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Reset the input so the same file can be selected again
        event.target.value = ''

        setIsProcessing(true)
        try {
            const base64 = await fileToBase64(file)
            const markdown = await imageToMarkdown(base64, userSettings)
            onMarkdownExtracted(markdown)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to process image'
            console.error('Image processing error:', error)
            onError?.(message)
        } finally {
            setIsProcessing(false)
        }
    }

    /**
     * Trigger the file input click
     */
    const handleClick = () => {
        if (!isProcessing) {
            fileInputRef.current?.click()
        }
    }

    return (
        <>
            <button
                onClick={handleClick}
                disabled={isProcessing}
                className={`p-1.5 rounded transition-colors ${
                    isProcessing 
                        ? 'text-blue-500 dark:text-blue-400 cursor-wait' 
                        : 'text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                } ${className}`}
                title={isProcessing ? 'Processing image...' : 'Scan page'}
            >
                {isProcessing ? (
                    <FaSpinner size={iconSize} className="animate-spin" />
                ) : (
                    <FaCamera size={iconSize} />
                )}
            </button>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture={isMobile ? 'environment' : undefined}
                onChange={handleFileChange}
                className="hidden"
            />
        </>
    )
}
