import { useState, useCallback, useRef } from 'react'
import type { Chat, ChatMessage, Card, RichTextCard } from '../types'
import { LLMFactory, type ModelId, type LLMProvider, getProviderForModel, getModelById } from '../api/llm'
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
    /** Stop the current streaming response */
    stopStreaming: () => void
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
    const abortControllerRef = useRef<AbortController | null>(null)

    /**
     * Stops the current streaming response
     */
    const stopStreaming = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
    }, [])

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
        // Create a new AbortController for this request
        abortControllerRef.current = new AbortController()
        const signal = abortControllerRef.current.signal
        
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
            const model = getModelById(modelId)
            if (!model) {
                throw new Error(`Unknown model: ${modelId}`)
            }
            const provider = await getProvider(modelId)
            const context = buildContext(cards)
            
            const systemPrompt = `You are a helpful AI assistant. Treat the user as an expert - avoid unnecessary disclaimers, warnings, or over-explanation unless specifically asked. Provide direct, sophisticated answers assuming deep domain knowledge.
${context ? `You have access to the following notes that may provide helpful context:

${context}

Feel free to reference this information when relevant, but don't feel constrained to only discuss the notes.` : ''}

Be concise and direct in conversation${context ? ', drawing on both your general knowledge and any relevant context from the notes when appropriate' : ''}.
Use markdown formatting in your responses.`

            // Use streaming API
            const stream = provider.createStreamingChatCompletion(
                currentChat.messages,
                {
                    modelId: model.modelId,
                    system: systemPrompt,
                    temperature: model.noTemperature ? undefined : 0.7,
                    thinkingTokens: model.thinkingTokens,
                },
                signal
            )

            let streamedContent = ''
            try {
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
            } catch (error: any) {
                // If this is an AbortError, add a note that generation was stopped
                if (error.name === 'AbortError' || signal.aborted) {
                    streamedContent += "\n\n*Generation stopped.*"
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
                } else {
                    throw error
                }
            }

        } catch (error: any) {
            // Don't set error state for aborted requests
            if (error.name !== 'AbortError' && !signal.aborted) {
                setError(error instanceof Error ? error : new Error('Unknown error occurred'))
                throw error
            }
        } finally {
            setIsLoading(false)
            abortControllerRef.current = null
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
        stopStreaming,
        isLoading,
        error
    }
} 