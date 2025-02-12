import React, { useState, useRef, useEffect } from 'react'
import type { Chat, ChatMessage } from '../types'
import type { ModelId } from '../api/llm'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { VoiceInput } from './VoiceInput'
import { OpenAIClient } from '../api/openai'
import { UserSettings } from '../types/settings'

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

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto'
    // Set the height to match the scrollHeight
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
    <div className={`flex gap-3 mb-4 ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-[80%] rounded-lg relative ${isEditing ? 'w-full' : ''}
        ${isUser 
          ? 'bg-blue-500 text-white rounded-br-none' 
          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'}`}
      >
        {isEditing ? (
          <div className="p-3">
            <textarea
              ref={editInputRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full resize-none bg-white/10 text-sm whitespace-pre-wrap break-words
                       focus:outline-none focus:ring-1 focus:ring-white/30 p-3 block"
            />
            <div className="flex justify-end gap-2 text-xs mt-2">
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditContent(message.content)
                }}
                className="px-2 pt-1 rounded hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="px-2 py-1 rounded bg-white/20 hover:bg-white/30"
              >
                Save (Ctrl+Enter)
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-3 pt-3">
              <div className={`prose dark:prose-invert prose-sm max-w-none
                           ${isUser ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
              {/* {message.llm && (
                <div className="text-[10px] mt-1 opacity-40">
                  {message.llm}
                </div>
              )} */}
            </div>
            <div className="flex gap-2 justify-end px-2">
              {isUser ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-[10px] opacity-0 group-hover:opacity-40 hover:!opacity-100 hover:bg-white/10 px-1.5 pb-0.5 rounded-sm transition-opacity duration-150"
                  title="Edit message"
                >
                  Edit
                </button>
              ) : onSaveToNotes && (
                <button
                  onClick={() => onSaveToNotes(message.content)}
                  className="text-[10px] opacity-0 group-hover:opacity-40 hover:!opacity-100 hover:bg-black/5 dark:hover:bg-white/10 px-1.5 pb-0.5 rounded-sm transition-opacity duration-150"
                  title="Save to notes"
                >
                  Save as note
                </button>
              )}
            </div>
          </>
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

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current
        if (!textarea) return

        const adjustHeight = () => {
            textarea.style.height = 'auto'
            const newHeight = Math.min(textarea.scrollHeight, 200) // Max height of 200px
            textarea.style.height = `${newHeight}px`
        }

        // Initial adjustment
        adjustHeight()

        textarea.addEventListener('input', adjustHeight)
        return () => textarea.removeEventListener('input', adjustHeight)
    }, [message]) // Re-run when message changes

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSendMessage(e)
        }
    }

    const handleVoiceTranscription = (text: string) => {
        // Append the transcribed text to the current message
        const newMessage = message.trim() 
            ? `${message.trim()} ${text}` 
            : text
        onMessageChange(newMessage)
    }

    return (
        <form onSubmit={onSendMessage} className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
            <div className="relative p-2">
                <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={e => onMessageChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                             p-3 pr-24 overflow-y-hidden
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             disabled:opacity-50 disabled:cursor-not-allowed"
                    rows={1}
                    disabled={isLoading}
                />
                <div className="absolute right-4 bottom-5 flex gap-1">
                    <VoiceInput 
                        userSettings={userSettings}
                        onTranscription={handleVoiceTranscription}
                        iconSize={18}
                        className="p-1.5"
                    />
                    <button
                        type="submit"
                        disabled={!message.trim() || isLoading}
                        className="p-2 rounded-md
                                text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300
                                disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5 rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </div>
        </form>
    )
}
