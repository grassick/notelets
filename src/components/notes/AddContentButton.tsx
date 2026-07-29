import React, { useRef, useState } from 'react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { FaPlus, FaMicrophone, FaCamera, FaImage, FaSpinner, FaMagic } from 'react-icons/fa'
import { VoiceInput } from '../voice/VoiceInput'
import { imageToMarkdown, isImageToMarkdownAvailable } from '../../api/imageToMarkdown'
import { isSmartVoiceEditAvailable } from '../../api/smartVoiceEdit'
import { UserSettings } from '../../types/settings'
import { useIsMobile } from '../../hooks/useIsMobile'

/** Props for the AddContentButton component */
interface AddContentButtonProps {
    /** User settings containing API keys */
    userSettings: UserSettings
    /** Callback when voice transcription is received */
    onTranscription: (text: string) => void
    /** Callback when markdown is extracted from an image */
    onImageMarkdown: (markdown: string) => void
    /**
     * Callback when a transcription should be interpreted as an edit to the note
     * rather than appended. Omit to hide the smart voice edit option.
     */
    onSmartTranscription?: (text: string) => void
    /** Whether a smart voice edit is currently being processed */
    smartBusy?: boolean
    /** Optional callback for errors */
    onError?: (error: string) => void
    /** Optional class name for the button */
    className?: string
    /** Optional size for icons */
    iconSize?: number
}

/** Which voice capture flow is currently active */
type VoiceMode = 'append' | 'smart'

/**
 * Check if voice input is available based on user settings.
 * Mirrors the provider selection in VoiceInput.
 */
function isVoiceAvailable(userSettings: UserSettings): boolean {
    return !!(userSettings.llm.fireworksKey || userSettings.llm.openaiKey || userSettings.llm.openrouterKey)
}

/**
 * A button that opens a menu with options to add content via voice or image scanning.
 * Only shows options that are available based on configured API keys.
 */
export function AddContentButton({
    userSettings,
    onTranscription,
    onImageMarkdown,
    onSmartTranscription,
    smartBusy = false,
    onError,
    className = '',
    iconSize = 16
}: AddContentButtonProps) {
    const cameraInputRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isProcessingImage, setIsProcessingImage] = useState(false)
    const [voiceMode, setVoiceMode] = useState<VoiceMode | null>(null)
    const isMobile = useIsMobile()

    const voiceAvailable = isVoiceAvailable(userSettings)
    const imageAvailable = isImageToMarkdownAvailable(userSettings)
    const smartVoiceAvailable = voiceAvailable && !!onSmartTranscription && isSmartVoiceEditAvailable(userSettings)

    // If neither option is available, don't render anything
    if (!voiceAvailable && !imageAvailable) {
        return null
    }

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

        setIsProcessingImage(true)
        try {
            const base64 = await fileToBase64(file)
            const markdown = await imageToMarkdown(base64, userSettings)
            onImageMarkdown(markdown)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to process image'
            console.error('Image processing error:', error)
            onError?.(message)
        } finally {
            setIsProcessingImage(false)
        }
    }

    /**
     * Handle clicking the camera option (mobile only)
     */
    const handleCameraClick = () => {
        cameraInputRef.current?.click()
    }

    /**
     * Handle clicking the upload/scan option
     */
    const handleUploadClick = () => {
        fileInputRef.current?.click()
    }

    /**
     * Handle voice transcription completion, routing to the append or smart
     * handler depending on which menu option started the capture
     */
    const handleVoiceTranscription = (text: string) => {
        const mode = voiceMode
        setVoiceMode(null)
        if (mode === 'smart' && onSmartTranscription) {
            onSmartTranscription(text)
        } else {
            onTranscription(text)
        }
    }

    // If voice input is active, show the voice input component instead.
    // Smart mode gets a ring so it stays distinguishable from plain dictation.
    if (voiceMode && voiceAvailable) {
        return (
            <VoiceInput
                userSettings={userSettings}
                onTranscription={handleVoiceTranscription}
                onError={onError}
                iconSize={iconSize}
                className={`${className} ${voiceMode === 'smart' ? 'ring-2 ring-purple-400 dark:ring-purple-500' : ''}`}
            />
        )
    }

    // Show processing spinner when an image or a smart voice edit is being processed
    if (isProcessingImage || smartBusy) {
        return (
            <button
                disabled
                className={`p-1.5 rounded text-blue-500 dark:text-blue-400 cursor-wait ${className}`}
                title={smartBusy ? 'Applying voice edit...' : 'Processing image...'}
            >
                <FaSpinner size={iconSize} className="animate-spin" />
            </button>
        )
    }

    return (
        <>
            <Menu as="div" className="relative">
                <MenuButton 
                    className={`p-1.5 rounded transition-colors text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 ${className}`}
                    title="Add content"
                >
                    <FaPlus size={iconSize} />
                </MenuButton>
                <MenuItems 
                    portal
                    anchor="top end"
                    className="py-1 w-44 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50 focus:outline-none"
                >
                    {voiceAvailable && (
                        <MenuItem>
                            <button
                                onClick={() => setVoiceMode('append')}
                                className="w-full px-3 py-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-700"
                            >
                                <FaMicrophone size={14} />
                                Voice input
                            </button>
                        </MenuItem>
                    )}
                    {smartVoiceAvailable && (
                        <MenuItem>
                            <button
                                onClick={() => setVoiceMode('smart')}
                                className="w-full px-3 py-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-700"
                                title="Dictate an instruction or a new entry and let the AI edit the note"
                            >
                                <FaMagic size={14} />
                                Smart voice edit
                            </button>
                        </MenuItem>
                    )}
                    {imageAvailable && isMobile && (
                        <>
                            <MenuItem>
                                <button
                                    onClick={handleCameraClick}
                                    className="w-full px-3 py-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-700"
                                >
                                    <FaCamera size={14} />
                                    Take photo
                                </button>
                            </MenuItem>
                            <MenuItem>
                                <button
                                    onClick={handleUploadClick}
                                    className="w-full px-3 py-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-700"
                                >
                                    <FaImage size={14} />
                                    Upload image
                                </button>
                            </MenuItem>
                        </>
                    )}
                    {imageAvailable && !isMobile && (
                        <MenuItem>
                            <button
                                onClick={handleUploadClick}
                                className="w-full px-3 py-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap data-[focus]:bg-gray-100 dark:data-[focus]:bg-gray-700"
                            >
                                <FaCamera size={14} />
                                Scan page
                            </button>
                        </MenuItem>
                    )}
                </MenuItems>
            </Menu>
            {/* Camera input for mobile - opens camera directly */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
            />
            {/* File input for upload/scan - opens file picker */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />
        </>
    )
}
