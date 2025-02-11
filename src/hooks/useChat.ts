import { useState, useCallback } from 'react'
import type { Chat, ChatMessage, Card, RichTextCard } from '../types'
import { LLMFactory, type ModelId, type LLMProvider, getProviderForModel } from '../api/llm'
import { useDeviceSettings, useUserSettings } from './useSettings'
import { UserSettings } from '../types/settings'

interface UseChatOptions {
    /** Cards to use for context */
    cards: Card[]
    /** Callback when chat is updated */
    onChatUpdate: (chat: Chat) => void
    /** User settings */
    userSettings: UserSettings
}

interface UseChatResult {
    /** Send a message to the LLM */
    sendMessage: (chat: Chat, content: string, modelId: ModelId) => Promise<void>
    /** Edit an existing message and regenerate responses */
    editMessage: (chat: Chat, messageIndex: number, newContent: string, modelId: ModelId) => Promise<void>
    /** Whether a message is currently being sent */
    isLoading: boolean
    /** Any error that occurred */
    error: Error | null
}

/**
 * Hook to manage chat state and API interactions
 */
export function useChat({ cards, onChatUpdate, userSettings }: UseChatOptions): UseChatResult {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const [providerCache] = useState<Map<string, LLMProvider>>(new Map())

    /**
     * Builds context from cards for the LLM
     */
    const buildContext = useCallback((cards: Card[]): string => {
        const contextParts: string[] = []

        cards.forEach(card => {
            if (card.type === 'richtext') {
                const richTextCard = card as RichTextCard
                contextParts.push(`<note title="${card.title}">\n${richTextCard.content.markdown}\n</note>`)
            }
        })

        return contextParts.join('\n\n')
    }, [])

    /**
     * Gets or creates an LLM provider
     */
    const getProvider = useCallback(async (modelId: ModelId): Promise<LLMProvider> => {
        const provider = getProviderForModel(modelId)
        if (!provider) {
            throw new Error(`Unknown model: ${modelId}`)
        }

        const apiKey = userSettings.llm[`${provider}Key` as keyof typeof userSettings.llm]
        if (!apiKey) {
            throw new Error(`Missing API key for ${provider}`)
        }

        const cacheKey = `${provider}-${apiKey}`
        if (providerCache.has(cacheKey)) {
            return providerCache.get(cacheKey)!
        }

        const newProvider = await LLMFactory.createProvider(modelId, apiKey)
        providerCache.set(cacheKey, newProvider)
        return newProvider
    }, [userSettings.llm, providerCache])

    /**
     * Gets an assistant response for the given chat using the specified model
     */
    const getAssistantResponse = useCallback(async (currentChat: Chat, modelId: ModelId) => {
        setIsLoading(true)
        setError(null)

        try {
            // Create assistant message placeholder
            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: '',
                llm: modelId,
                createdAt: new Date().toISOString()
            }

            // Add empty assistant message that we'll stream into
            const streamingChat: Chat = {
                ...currentChat,
                messages: [...currentChat.messages, assistantMessage],
                updatedAt: new Date().toISOString()
            }
            onChatUpdate(streamingChat)

            // Get response from LLM
            const provider = await getProvider(modelId)
            const context = buildContext(cards)
            
            const systemPrompt = `You are a helpful AI assistant helping the user with their notes. 
You have access to the following notes that provide context for the conversation:

${context}

Keep your responses focused and relevant to the notes and the user's questions.
Always use markdown formatting in responses.`

            // Use streaming API
            const stream = provider.createStreamingChatCompletion(
                currentChat.messages,
                {
                    modelId,
                    system: systemPrompt,
                    temperature: 0.7
                }
            )

            let streamedContent = ''
            for await (const chunk of stream) {
                streamedContent += chunk
                const streamedMessage: ChatMessage = {
                    ...assistantMessage,
                    content: streamedContent
                }
                const updatedStreamingChat: Chat = {
                    ...streamingChat,
                    messages: [...currentChat.messages, streamedMessage],
                    updatedAt: new Date().toISOString()
                }
                onChatUpdate(updatedStreamingChat)
            }

        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error occurred'))
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [cards, getProvider, onChatUpdate, buildContext])

    /**
     * Sends a message to the LLM
     */
    const sendMessage = useCallback(async (chat: Chat, content: string, modelId: ModelId) => {
        try {
            // Add user message
            const userMessage: ChatMessage = {
                role: 'user',
                content,
                createdAt: new Date().toISOString()
            }

            const updatedChat: Chat = {
                ...chat,
                messages: [...chat.messages, userMessage],
                updatedAt: new Date().toISOString()
            }
            onChatUpdate(updatedChat)

            // Get assistant response
            await getAssistantResponse(updatedChat, modelId)

        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error occurred'))
            throw err
        }
    }, [onChatUpdate, getAssistantResponse])

    /**
     * Edits a message and regenerates all subsequent responses
     */
    const editMessage = useCallback(async (chat: Chat, messageIndex: number, newContent: string, modelId: ModelId) => {
        if (messageIndex < 0 || messageIndex >= chat.messages.length) {
            setError(new Error('Invalid message index'))
            return
        }

        // Only allow editing user messages
        if (chat.messages[messageIndex].role !== 'user') {
            setError(new Error('Can only edit user messages'))
            return
        }

        try {
            // Create new chat with history up to the edited message
            const truncatedChat: Chat = {
                ...chat,
                messages: chat.messages.slice(0, messageIndex),
                updatedAt: new Date().toISOString()
            }

            // Add the edited message
            const editedMessage: ChatMessage = {
                role: 'user',
                content: newContent,
                createdAt: new Date().toISOString()
            }

            const updatedChat: Chat = {
                ...truncatedChat,
                messages: [...truncatedChat.messages, editedMessage],
                updatedAt: new Date().toISOString()
            }
            onChatUpdate(updatedChat)

            // Get assistant response
            await getAssistantResponse(updatedChat, modelId)

        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error occurred'))
            throw err
        }
    }, [onChatUpdate, getAssistantResponse])

    return {
        sendMessage,
        editMessage,
        isLoading,
        error
    }
} 