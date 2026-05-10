import { useState, useCallback, useRef, useEffect } from 'react'
import type { Chat, ChatMessage, Card, RichTextCard } from '../types'
import { LLMFactory, type ModelId, type LLMProvider, getProviderForModel, getModelById } from '../api/llm'
import { useDeviceSettings, useUserSettings } from './useSettings'
import { UserSettings } from '../types/settings'

/**
 * Options for the {@link useChat} hook.
 */
interface UseChatOptions {
    /** Cards to use for context */
    cards: Card[]
    /**
     * Callback when the persisted chat is updated. This is called only at
     * turn boundaries (after the user message is added, and after the assistant
     * response completes or is aborted), never per streamed token, so callers
     * can safely write to a remote store from this callback.
     */
    onChatUpdate: (chat: Chat) => void
    /** User settings */
    userSettings: UserSettings
    /** Board-level custom instructions to inject into the system prompt */
    boardInstructions?: string
}

/**
 * Result of the {@link useChat} hook.
 */
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
    /**
     * The in-flight streamed content for the current assistant turn.
     * Updates are throttled to one flush per animation frame so the UI does
     * not re-render on every token. Empty string when no stream is active.
     */
    streamingContent: string
    /** Whether the assistant is currently streaming a response */
    isStreaming: boolean
    /** The model id of the currently streaming assistant response */
    streamingModelId: ModelId | null
}

/**
 * Hook to manage chat state and API interactions
 */
export function useChat({ cards, onChatUpdate, userSettings, boardInstructions }: UseChatOptions): UseChatResult {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const [providerCache] = useState<Map<string, LLMProvider>>(new Map())
    const abortControllerRef = useRef<AbortController | null>(null)

    // Streaming state. The ref holds the latest streamed text so we can append
    // synchronously per token without paying the cost of a React state update;
    // a single rAF-coalesced flush propagates the value to React state.
    const streamingContentRef = useRef('')
    const [streamingContent, setStreamingContent] = useState('')
    const [isStreaming, setIsStreaming] = useState(false)
    const [streamingModelId, setStreamingModelId] = useState<ModelId | null>(null)
    const rafIdRef = useRef<number | null>(null)

    /**
     * Cancels any pending rAF flush of the streaming content.
     */
    const cancelStreamingFlush = useCallback(() => {
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current)
            rafIdRef.current = null
        }
    }, [])

    /**
     * Schedules a single rAF flush that copies the latest streamed text from
     * the ref into React state. Repeated calls within a frame are coalesced.
     */
    const scheduleStreamingFlush = useCallback(() => {
        if (rafIdRef.current !== null) return
        rafIdRef.current = requestAnimationFrame(() => {
            rafIdRef.current = null
            setStreamingContent(streamingContentRef.current)
        })
    }, [])

    // Make sure a backgrounded rAF callback can never fire after unmount.
    useEffect(() => {
        return () => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current)
                rafIdRef.current = null
            }
        }
    }, [])

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
     * Formats an ISO date string to just the date portion (YYYY-MM-DD)
     */
    const formatDate = (isoString: string): string => {
        return isoString.split('T')[0]
    }

    /**
     * Builds context from cards for the LLM
     */
    const buildContext = useCallback((cards: Card[]): string => {
        const contextParts: string[] = []

        cards.forEach(card => {
            if (card.type === 'richtext') {
                const richTextCard = card as RichTextCard
                const createdDate = formatDate(card.createdAt)
                const updatedDate = formatDate(card.updatedAt)
                contextParts.push(`<note title="${card.title}" created="${createdDate}" updated="${updatedDate}">\n${richTextCard.content.markdown}\n</note>`)
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

        // Reset streaming buffer and mark stream as active. The streaming bubble
        // (rendered by the chat UI) will pick up updates from `streamingContent`
        // without us touching the persisted `chat.messages` array.
        streamingContentRef.current = ''
        setStreamingContent('')
        setIsStreaming(true)
        setStreamingModelId(modelId)

        const startedAt = new Date().toISOString()

        try {
            // Get response from LLM
            const model = getModelById(modelId)
            if (!model) {
                throw new Error(`Unknown model: ${modelId}`)
            }
            const provider = await getProvider(modelId)
            const context = buildContext(cards)
            
            const currentDate = formatDate(new Date().toISOString())
            const userInstructions = userSettings.customInstructions?.trim()
            const boardInstructionsTrimmed = boardInstructions?.trim()

            const systemPrompt = `You are a helpful AI assistant. Today's date is ${currentDate}. Treat the user as an expert - avoid unnecessary disclaimers, warnings, or over-explanation unless specifically asked. Provide direct, sophisticated answers assuming deep domain knowledge.
${userInstructions ? `\nThe user has provided the following instructions for all conversations:\n\n${userInstructions}\n` : ''}${boardInstructionsTrimmed ? `\nThe user has provided the following instructions specific to this board:\n\n${boardInstructionsTrimmed}\n` : ''}${context ? `You have access to the following notes that may provide helpful context:

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
                    reasoningEnabled: model.reasoningEnabled,
                    reasoningEffort: model.reasoningEffort,
                    reasoningMaxTokens: model.reasoningMaxTokens,
                    verbosity: model.verbosity
                },
                signal
            )

            let streamedContent = ''
            let aborted = false
            try {
                for await (const chunk of stream) {
                    streamedContent += chunk
                    streamingContentRef.current = streamedContent
                    scheduleStreamingFlush()
                }
            } catch (error: any) {
                // If this is an AbortError, append a note that generation was stopped
                if (error.name === 'AbortError' || signal.aborted) {
                    aborted = true
                    streamedContent += "\n\n*Generation stopped.*"
                } else {
                    throw error
                }
            }

            // Stream is done (or aborted). Cancel any pending flush so the React
            // state doesn't briefly snap back to a stale partial value, then
            // commit the full assistant message to the persisted chat in one
            // single onChatUpdate call (one Firestore write per turn).
            cancelStreamingFlush()

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: streamedContent,
                llm: modelId,
                createdAt: startedAt
            }
            const finalChat: Chat = {
                ...currentChat,
                messages: [...currentChat.messages, assistantMessage],
                updatedAt: new Date().toISOString()
            }
            onChatUpdate(finalChat)

        } catch (error: any) {
            // Don't set error state for aborted requests
            if (error.name !== 'AbortError' && !signal.aborted) {
                setError(error instanceof Error ? error : new Error('Unknown error occurred'))
                throw error
            }
        } finally {
            cancelStreamingFlush()
            streamingContentRef.current = ''
            setStreamingContent('')
            setIsStreaming(false)
            setStreamingModelId(null)
            setIsLoading(false)
            abortControllerRef.current = null
        }
    }, [cards, getProvider, onChatUpdate, buildContext, userSettings.customInstructions, boardInstructions, scheduleStreamingFlush, cancelStreamingFlush])

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
        error,
        streamingContent,
        isStreaming,
        streamingModelId
    }
}
