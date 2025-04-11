import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import type { Store } from '../Store'
import { useCards, useChats } from '../Store'
import type { Card, Chat, RichTextCard } from '../types'
import { ModelId, getDefaultModel, isModelAvailable } from '../api/llm'
import { v4 as uuidv4 } from 'uuid'
import { ChatInterface } from './ChatInterface'
import { useChat } from '../hooks/useChat'
import { useUserSettings } from '../hooks/useSettings'
import { ModelSelector } from './chat/ModelSelector'
import { usePersist } from '../hooks/usePersist'
import { SettingsModal } from './settings/SettingsModal'
import { FaTimes, FaTrash } from 'react-icons/fa'
import { getCardTitle } from '../modules/cards'

type ChatContextMode = 'quick' | 'selected' | 'all'

interface BoardChatSystemProps {
  /** The data store instance */
  store: Store
  /** The ID of the board this chat system is for */
  boardId: string
  /** Additional class names */
  className?: string
  /** The cards on the board */
  cards: Card[]
  /** The function to set a card */
  setCard: (card: Card) => void
  /** Currently selected card */
  selectedCard: Card | null
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
  cards,
  setCard,
  selectedCard
}: BoardChatSystemProps) {
  const { settings: userSettings, loading: userSettingsLoading } = useUserSettings(store)
  const { chats, setChat: storeSetChat, removeChat } = useChats(store, boardId)
  const [chat, setChat] = useState<Chat | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [selectedModel, setSelectedModel] = usePersist<ModelId>('selectedModel', getDefaultModel(userSettings.llm))
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHistoryMode, setIsHistoryMode] = useState(false)
  const [contextMode, setContextMode] = usePersist<ChatContextMode>(`board_${boardId}_chatContext`, 'quick')

  // Filter cards based on context mode
  const contextCards = useMemo(() => {
    switch (contextMode) {
      case 'quick':
        return []
      case 'selected':
        return selectedCard ? [selectedCard] : []
      case 'all':
        return cards.filter((c): c is RichTextCard => c.type === 'richtext')
      default:
        return []
    }
  }, [contextMode, selectedCard, cards])

  // Validate selected model on settings change
  useEffect(() => {
    if (!userSettingsLoading && !isModelAvailable(selectedModel, userSettings.llm)) {
      setSelectedModel(getDefaultModel(userSettings.llm))
    }
  }, [userSettings.llm, selectedModel, setSelectedModel, userSettingsLoading])

  // Update the handleNewChat function
  const handleNewChat = useCallback(async () => {
    setChat(null)
    setError(null)  // Clear any existing errors
  }, [])

  const { sendMessage, editMessage, stopStreaming, isLoading, error: chatError } = useChat({
    cards: contextCards, // Pass filtered cards based on context mode
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
    setIsHistoryMode(false) // Exit history mode when a chat is selected
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

  /** Get a preview title from chat messages */
  const getChatPreview = (chat: Chat): string => {
    const firstMessage = chat.messages[0]
    if (!firstMessage) return 'Empty chat'
    return firstMessage.content.slice(0, 60) + (firstMessage.content.length > 60 ? '...' : '')
  }

  function ChatHistoryView() {
    const [searchQuery, setSearchQuery] = useState('')
    
    const sortedChats = [...chats].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

    const filteredChats = useMemo(() => {
      if (!searchQuery.trim()) return sortedChats
      const query = searchQuery.toLowerCase()
      return sortedChats.filter(chat => 
        // Search in messages
        chat.messages.some(msg => msg.content.toLowerCase().includes(query)) ||
        // Search in preview
        getChatPreview(chat).toLowerCase().includes(query)
      )
    }, [sortedChats, searchQuery])

    if (sortedChats.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="text-gray-500 dark:text-gray-400 mb-4">No chat history yet</div>
          <button
            onClick={() => {
              handleNewChat()
              setIsHistoryMode(false)
            }}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                     dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
          >
            Start New Chat
          </button>
        </div>
      )
    }

    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full px-4 py-2 pl-10 text-sm rounded-lg border border-gray-200 
                       dark:border-gray-700 bg-white dark:bg-gray-800 
                       text-gray-900 dark:text-gray-100
                       placeholder-gray-500 dark:placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                       focus:border-transparent"
            />
            <svg 
              className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-3">
            {filteredChats.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                No chats match your search
              </div>
            ) : (
              filteredChats.map((historyChat) => (
                <div
                  key={historyChat.id}
                  className="group flex items-start gap-3 p-3 rounded-lg cursor-pointer
                           bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                           hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                  onClick={() => handleChatSelect(historyChat)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {new Date(historyChat.updatedAt).toLocaleDateString()} {new Date(historyChat.updatedAt).toLocaleTimeString()}
                    </div>
                    <div className="text-sm text-gray-900 dark:text-gray-100 break-words">
                      {getChatPreview(historyChat)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {historyChat.messages.length} message{historyChat.messages.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteChat(historyChat.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 
                             dark:text-gray-500 dark:hover:text-red-400 transition-opacity"
                    title="Delete chat"
                  >
                    <FaTrash size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
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
          isHistoryMode={isHistoryMode}
          onToggleHistory={() => setIsHistoryMode(!isHistoryMode)}
          store={store}
          contextMode={contextMode}
          onContextModeChange={setContextMode}
          selectedCard={selectedCard}
        />
        {isHistoryMode ? (
          <ChatHistoryView />
        ) : (
          <ChatInterface
            chat={chat}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onSaveToNotes={handleSaveToNotes}
            onStopStreaming={stopStreaming}
            className="flex-1"
            isLoading={isLoading}
            selectedModel={selectedModel}
            error={error || chatError}
            userSettings={userSettings}
            contextMode={contextMode}
            contextCards={contextCards}
          />
        )}
      </div>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        store={store}
      />
    </>
  )
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
  /** Whether history mode is active */
  isHistoryMode: boolean
  /** Toggle history mode */
  onToggleHistory: () => void
  /** The data store instance */
  store: Store
  /** Current context mode */
  contextMode: ChatContextMode
  /** Context mode change callback */
  onContextModeChange: (mode: ChatContextMode) => void
  /** Currently selected card */
  selectedCard: Card | null
}

function ChatHeader({ 
  chat, 
  chats, 
  onNewChat, 
  selectedModel, 
  onModelChange, 
  onChatSelect, 
  onChatDelete, 
  onOpenSettings,
  isHistoryMode,
  onToggleHistory,
  store,
  contextMode,
  onContextModeChange,
  selectedCard
}: ChatHeaderProps) {
  return (
    <div className="h-8 px-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onContextModeChange('quick')}
          className={`p-1 rounded transition-colors text-xs
            ${contextMode === 'quick' 
              ? 'bg-blue-50 text-blue-500 dark:bg-blue-900/50 dark:text-blue-400' 
              : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          title="Quick chat (no context)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>

        {selectedCard && (
          <button
            onClick={() => onContextModeChange('selected')}
            className={`p-1 rounded transition-colors text-xs flex items-center gap-1
              ${contextMode === 'selected'
                ? 'bg-blue-50 text-blue-500 dark:bg-blue-900/50 dark:text-blue-400' 
                : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            title={`Use context from: ${getCardTitle(selectedCard)}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        )}

        <button
          onClick={() => onContextModeChange('all')}
          className={`p-1 rounded transition-colors text-xs
            ${contextMode === 'all'
              ? 'bg-blue-50 text-blue-500 dark:bg-blue-900/50 dark:text-blue-400' 
              : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          title="Use all notes as context"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {/* Back document */}
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  transform="translate(-2, -2)"
                  opacity="0.5" />
            {/* Front document */}
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  transform="translate(2, 2)" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <ModelSelector
          value={selectedModel}
          onChange={onModelChange}
          onOpenSettings={onOpenSettings}
          store={store}
          className="text-[10px]"
        />
        <button
          onClick={onToggleHistory}
          className={`p-1 rounded transition-colors ${
            isHistoryMode 
              ? 'bg-blue-50 text-blue-500 dark:bg-blue-900/50 dark:text-blue-400' 
              : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
          title={isHistoryMode ? 'Back to chat' : 'View history'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <button
          onClick={onNewChat}
          className="p-1 rounded text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
          title="New chat"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  )
}
