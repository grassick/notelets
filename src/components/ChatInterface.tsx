import React, { useState, useRef, useEffect } from 'react'
import type { Chat, ChatMessage } from '../types'
import type { ModelId } from '../api/llm'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { UserSettings } from '../types/settings'
import { VoiceStreamingInput } from './VoiceStreamingInput'

interface ChatInterfaceProps {
  chat: Chat | null
  onSendMessage: (content: string, modelConfig: ModelId) => Promise<void>
  onEditMessage: (messageIndex: number, newContent: string) => Promise<void>
  onSaveToNotes?: (content: string) => Promise<void>
  className?: string
  isLoading?: boolean
  selectedModel: ModelId
  error?: Error | null
  userSettings: UserSettings
}

/**
 * ChatInterface component
 * 
 * This component provides a chat interface for the user to interact with the AI.
 * It displays messages, allows the user to send messages, and has a text input for typing messages.
 * 
 */
export function ChatInterface({ 
  chat, 
  onSendMessage,
  onEditMessage,
  onSaveToNotes,
  className = '', 
  isLoading = false,
  selectedModel,
  error,
  userSettings
}: ChatInterfaceProps) {
  const [message, setMessage] = useState('')
  const [lastAttemptedMessage, setLastAttemptedMessage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat?.messages])

  const handleSubmit = async (e: React.FormEvent, retryMessage?: string) => {
    e?.preventDefault()
    const messageToSend = retryMessage || message.trim()
    if (!messageToSend || isLoading) return

    try {
      setLastAttemptedMessage(messageToSend)
      await onSendMessage(messageToSend, selectedModel)
      setMessage('')
      setLastAttemptedMessage(null)
    } catch (err) {
      // Error will be handled by parent component
      console.error('Failed to send message:', err)
    }
  }

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 [scrollbar-width:thin] 
                    [scrollbar-color:rgba(100,116,139,0.2)_transparent] 
                    dark:[scrollbar-color:rgba(100,116,139,0.2)_transparent]
                    [::-webkit-scrollbar]:w-2
                    [::-webkit-scrollbar-thumb]:rounded-full
                    [::-webkit-scrollbar-thumb]:bg-slate-500/20
                    hover:[::-webkit-scrollbar-thumb]:bg-slate-500/30
                    dark:[::-webkit-scrollbar-thumb]:bg-slate-500/20
                    dark:hover:[::-webkit-scrollbar-thumb]:bg-slate-500/30
                    [::-webkit-scrollbar-track]:bg-transparent">
        {chat?.messages.map((msg, i) => (
          <ChatMessage 
            key={i} 
            message={msg} 
            index={i}
            onEdit={onEditMessage}
            onSaveToNotes={!msg.role || msg.role === 'assistant' ? onSaveToNotes : undefined}
          />
        ))}
        {error && (
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200 rounded-lg p-3 text-sm">
              {error.message}
            </div>
            {lastAttemptedMessage && (
              <button
                onClick={(e) => handleSubmit(e, lastAttemptedMessage)}
                className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 
                         flex items-center gap-1"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        message={message}
        onMessageChange={setMessage}
        onSendMessage={handleSubmit}
        isLoading={isLoading}
        userSettings={userSettings}
      />
    </div>
  )
} 

function ChatMessage({ message, index, onEdit, onSaveToNotes }: { 
  message: ChatMessage, 
  index: number, 
  onEdit: (index: number, content: string) => Promise<void>,
  onSaveToNotes?: (content: string) => Promise<void>
}) {
  const isUser = message.role === 'user'
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const editInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.setSelectionRange(editContent.length, editContent.length)
      adjustTextareaHeight()
    }
  }, [isEditing])

  const adjustTextareaHeight = () => {
    const textarea = editInputRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [editContent])

  const handleEdit = async () => {
    try {
      await onEdit(index, editContent.trim())
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to edit message:', err)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleEdit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditContent(message.content)
    }
  }
  
  return (
    <div className="group mb-6">
      <div className={`relative ${isUser ? 'bg-blue-50/80 dark:bg-blue-900/20 rounded-lg p-4' : ''}`}>
        {isUser && (
          <button
            onClick={() => setIsEditing(true)}
            className="absolute -top-2 -right-2 p-1.5 rounded-full bg-white dark:bg-gray-800 
                     shadow-sm border border-gray-200 dark:border-gray-700
                     opacity-0 group-hover:opacity-100 transition-opacity
                     hover:bg-gray-50 dark:hover:bg-gray-700"
            title="Edit message"
          >
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="text-gray-500 dark:text-gray-400"
            >
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </button>
        )}

        {isEditing ? (
          <div className="w-full">
            <textarea
              ref={editInputRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base
                       border border-gray-200 dark:border-gray-700 rounded-md
                       focus:outline-none focus:ring-2 focus:ring-blue-500 p-3
                       placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditContent(message.content)
                }}
                className="px-3 py-1 text-sm rounded-md text-gray-600 dark:text-gray-300 
                         hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="px-3 py-1 text-sm rounded-md bg-blue-500 text-white 
                         hover:bg-blue-600 dark:hover:bg-blue-400"
              >
                Save (Ctrl+Enter)
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className={`prose dark:prose-invert max-w-none text-base
                          ${isUser ? 'text-gray-900 dark:text-gray-100' : 'text-gray-900 dark:text-gray-100'}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
            {!isUser && onSaveToNotes && (
              <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onSaveToNotes(message.content)}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Save to notes"
                >
                  Save as note
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Props for the ChatInput component */
interface ChatInputProps {
    /** The current message text */
    message: string
    /** Called when the message text changes */
    onMessageChange: (message: string) => void
    /** Called when a message should be sent */
    onSendMessage: (e: React.FormEvent) => void
    /** Whether the chat is currently loading/processing */
    isLoading?: boolean
    /** User settings */
    userSettings: UserSettings
}

/**
 * Text input area for the chat interface with auto-resizing textarea
 */
function ChatInput({ message, onMessageChange, onSendMessage, isLoading = false, userSettings }: ChatInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        const textarea = textareaRef.current
        if (!textarea) return

        const adjustHeight = () => {
            textarea.style.height = 'auto'
            const newHeight = Math.min(textarea.scrollHeight, 200)
            textarea.style.height = `${newHeight}px`
        }

        adjustHeight()

        textarea.addEventListener('input', adjustHeight)
        return () => textarea.removeEventListener('input', adjustHeight)
    }, [message])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSendMessage(e)
        }
    }

    const handleVoiceTranscription = (text: string) => {
        const newMessage = message.trim() 
            ? `${message.trim()} ${text}` 
            : text
        onMessageChange(newMessage)
    }

    return (
        <form onSubmit={onSendMessage} className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2">
            <div className="relative">
                <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={e => onMessageChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message"
                    className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 
                             bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 
                             p-4 pr-24 text-base overflow-y-hidden
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             disabled:opacity-50 disabled:cursor-not-allowed
                             placeholder:text-gray-400/60 dark:placeholder:text-gray-500/60"
                    rows={1}
                    disabled={isLoading}
                />
                <div className="absolute right-4 bottom-4 flex gap-2">
                    <VoiceStreamingInput 
                        userSettings={userSettings}
                        onTranscription={handleVoiceTranscription}
                        iconSize={20}
                        className="p-1.5 opacity-60 hover:opacity-100"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !message.trim()}
                        className="p-1.5 opacity-60 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed
                                 text-gray-600 dark:text-gray-300"
                        title="Send message (Enter)"
                    >
                        <svg 
                            width="20" 
                            height="20" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        >
                            <path d="M12 20V4M5 11l7-7 7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </form>
    )
}
