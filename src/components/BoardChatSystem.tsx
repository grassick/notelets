import React, { useEffect, useState, useCallback, useRef } from 'react'
import type { Store } from '../Store'
import { useCards, useChats } from '../Store'
import type { Chat, RichTextCard } from '../types'
import { ModelId, getDefaultModel, isModelAvailable } from '../api/llm'
import { v4 as uuidv4 } from 'uuid'
import { ChatInterface } from './ChatInterface'
import { useChat } from '../hooks/useChat'
import { useUserSettings } from '../hooks/useSettings'
import { ModelSelector } from './chat/ModelSelector'
import { usePersist } from '../hooks/usePersist'
import { SettingsModal } from './settings/SettingsModal'

interface BoardChatSystemProps {
  /** The data store instance */
  store: Store
  /** The ID of the board this chat system is for */
  boardId: string
  /** Additional class names */
  className?: string
}

interface ChatHeaderProps {
  /** Currently active chat */
  chat: Chat | null
  /** All available chats */
  chats: Chat[]
  /** Create new chat callback */
  onNewChat: () => void
  /** Selected model */
  selectedModel: ModelId
  /** Model change callback */
  onModelChange: (model: ModelId) => void
  /** Callback when a chat is selected from history */
  onChatSelect: (chat: Chat) => void
  /** Callback when a chat is deleted */
  onChatDelete: (chatId: string) => void
  /** Callback to open settings modal */
  onOpenSettings: () => void
  /** The data store instance */
  store: Store
}

/**
 * Manages the chat system for a board, including:
 * - Loading and managing chats
 * - Handling LLM interactions
 * - Managing chat state
 */
export function BoardChatSystem({
  store,
  boardId,
  className = '',
}: BoardChatSystemProps) {
  const { settings: userSettings } = useUserSettings(store)
  const { cards } = useCards(store, boardId)
  const { chats, setChat: storeSetChat, removeChat } = useChats(store, boardId)
  const { setCard } = useCards(store, boardId)
  const [chat, setChat] = useState<Chat | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [selectedModel, setSelectedModel] = usePersist<ModelId>('selectedModel', getDefaultModel(userSettings.llm))
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Validate selected model on settings change
  useEffect(() => {
    if (!isModelAvailable(selectedModel, userSettings.llm)) {
      setSelectedModel(getDefaultModel(userSettings.llm))
    }
  }, [userSettings.llm, selectedModel, setSelectedModel])

  // Update the handleNewChat function
  const handleNewChat = useCallback(async () => {
    setChat(null)
  }, [boardId, storeSetChat])

  const { sendMessage, editMessage, isLoading, error: chatError } = useChat({
    cards,
    onChatUpdate: (updatedChat) => {
      storeSetChat(updatedChat)
      setChat(updatedChat)
    },
    userSettings
  })

  // Add chat selection handler
  const handleChatSelect = useCallback((selectedChat: Chat) => {
    setChat(selectedChat)
    setError(null)
  }, [])

  const handleSendMessage = useCallback(async (content: string, modelId: ModelId) => {
    setError(null)

    try {
      // If no chat exists, create one first
      let activeChat = chat
      if (!activeChat) {
        activeChat = {
          id: uuidv4(),
          boardId,
          title: 'Chat',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        await storeSetChat(activeChat)
        setChat(activeChat)
      }

      // Now let useChat handle adding the message and getting the response
      await sendMessage(activeChat, content, modelId)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to send message'))
    }
  }, [chat, sendMessage, boardId, storeSetChat])

  const handleDeleteChat = useCallback(async (chatId: string) => {
    try {
      await removeChat(chatId)

      // If we deleted the active chat, switch to another one
      if (chat?.id === chatId) {
        const remainingChats = chats.filter((c: Chat) => c.id !== chatId)
        const nonEmptyChat = remainingChats.find(c => c.messages.length > 0)
        if (nonEmptyChat) {
          setChat(nonEmptyChat)
        } else if (remainingChats.length > 0) {
          setChat(remainingChats[0])
        } else {
          setChat(null) // Don't automatically create a new chat
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete chat'))
    }
  }, [chat, chats, removeChat])

  const handleEditMessage = useCallback(async (messageIndex: number, newContent: string) => {
    if (!chat) return
    setError(null)

    try {
      await editMessage(chat, messageIndex, newContent, selectedModel)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to edit message'))
    }
  }, [chat, editMessage, selectedModel])

  const handleSaveToNotes = useCallback(async (content: string) => {
    try {
      const newCard: RichTextCard = {
        id: uuidv4(),
        boardId,
        type: 'richtext',
        title: '',  // Empty title by default
        content: {
          markdown: content
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      await setCard(newCard)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save note'))
    }
  }, [boardId, setCard])

  function renderEmptyState() {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="w-16 h-16 mb-6 text-gray-400 dark:text-gray-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">Set Up Your AI Assistant</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm">
            To use the AI chat features, you'll need to add at least one LLM API key in settings. We support OpenAI, Anthropic, Google Gemini, and DeepSeek.
          </p>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 
                     dark:bg-gray-700 dark:hover:bg-gray-600
                     text-gray-700 dark:text-gray-300 transition-colors duration-150"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Open Settings
          </button>
        </div>
      </>
    )
  }

  // Show empty state only when there are no chats and no chat is selected
  if (chats.length === 0 && !chat) {
    // Show API key missing message if no keys are set
    const hasNoKeys = !Object.values(userSettings.llm).some(key => key)

    return (
      <div className={`flex flex-col h-full ${className}`}>
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          store={store}
        />
        {hasNoKeys ? renderEmptyState() : (
          <>
            <ChatHeader
              chat={chat}
              chats={chats}
              onNewChat={handleNewChat}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              onChatSelect={handleChatSelect}
              onChatDelete={handleDeleteChat}
              onOpenSettings={() => setIsSettingsOpen(false)}
              store={store}
            />
            <ChatInterface
              chat={null}
              onSendMessage={handleSendMessage}
              onEditMessage={handleEditMessage}
              onSaveToNotes={handleSaveToNotes}
              className="flex-1"
              isLoading={isLoading}
              selectedModel={selectedModel}
              error={error || chatError}
            />
          </>
        )}
      </div>
    )
  }

  return (
    <>
      <div className={`flex flex-col h-full ${className}`}>
        <ChatHeader
          chat={chat}
          chats={chats}
          onNewChat={handleNewChat}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          onChatSelect={handleChatSelect}
          onChatDelete={handleDeleteChat}
          onOpenSettings={() => setIsSettingsOpen(true)}
          store={store}
        />
        <ChatInterface
          chat={chat}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onSaveToNotes={handleSaveToNotes}
          className="flex-1"
          isLoading={isLoading}
          selectedModel={selectedModel}
          error={error || chatError}
        />
      </div>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        store={store}
      />
    </>
  )
}

function ChatHeader({ chat, chats, onNewChat, selectedModel, onModelChange, onChatSelect, onChatDelete, onOpenSettings, store }: ChatHeaderProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const { settings: userSettings } = useUserSettings(store)
  const historyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setIsHistoryOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /** Get a preview title from chat messages */
  const getChatPreview = (chat: Chat): string => {
    const firstMessage = chat.messages[0]
    if (!firstMessage) return 'Empty chat'
    return firstMessage.content.slice(0, 30) + (firstMessage.content.length > 30 ? '...' : '')
  }

  // Check if any LLM keys are set
  const hasLLMKeys = Object.values(userSettings.llm).some(key => key)

  return (
    <div className="h-8 px-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
      <span className="text-sm text-gray-600 dark:text-gray-400">Chat</span>
      <div className="flex items-center gap-2">
        <div className="relative" ref={historyRef}>
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="p-1 rounded text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
            title="Chat history"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {isHistoryOpen && (
            <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
              <div className="py-1 max-h-64 overflow-y-auto">
                {[...chats]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((historyChat) => (
                    <div
                      key={historyChat.id}
                      className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer
                        ${historyChat.id === chat?.id
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      onClick={() => {
                        onChatSelect(historyChat)
                        setIsHistoryOpen(false)
                      }}
                    >
                      <span className="truncate flex-1 mr-2">
                        {getChatPreview(historyChat)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onChatDelete(historyChat.id)
                        }}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onNewChat}
          className="p-1 rounded text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
          title="New chat"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <ModelSelector
          value={selectedModel}
          onChange={onModelChange}
          onOpenSettings={onOpenSettings}
          store={store}
          className="text-[10px]"
        />
      </div>
    </div>
  )
}
