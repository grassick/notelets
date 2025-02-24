import type { ChatMessage } from '../types'
import type { LLMProvider, LLMOptions, LLMResponse } from './llm'

/** Base URL for Anthropic's API */
const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1'

/** Message role for Anthropic's API */
export type AnthropicRole = 'user' | 'assistant'

/** Interface for Anthropic API message */
export interface AnthropicMessage {
    role: AnthropicRole
    content: string
}

/** Interface for Anthropic API request */
export interface AnthropicChatRequest {
    model: string
    messages: AnthropicMessage[]
    max_tokens?: number
    temperature?: number
    system?: string
    stream?: boolean
    thinking?: {
        type: 'enabled'
        budget_tokens: number
    }
}

/** Interface for Anthropic API response */
export interface AnthropicChatResponse {
    /** Message ID */
    id: string
    /** Type of message */
    type: 'message'
    /** Role of who sent the message */
    role: 'assistant'
    /** Model used to generate the response */
    model: string
    /** Array of content blocks */
    content: Array<{
        /** Type of content block */
        type: 'text'
        /** Text content */
        text: string
    }>
    /** Reason the generation stopped */
    stop_reason: string | null
    /** Sequence that caused the stop */
    stop_sequence: string | null
    /** Token usage statistics */
    usage: {
        /** Number of input tokens */
        input_tokens: number
        /** Number of tokens read from cache */
        cache_read_input_tokens: number
        /** Number of tokens used to create cache */
        cache_creation_input_tokens: number
        /** Number of output tokens */
        output_tokens: number
    }
}

/**
 * Error thrown when there's an issue with the Anthropic API
 */
export class AnthropicError extends Error {
    constructor(
        message: string,
        public status?: number,
        public response?: any
    ) {
        super(message)
        this.name = 'AnthropicError'
    }
}

/**
 * Client for interacting with Anthropic's API
 */
export class AnthropicClient implements LLMProvider {
    private apiKey: string

    constructor(apiKey: string) {
        this.apiKey = apiKey
    }

    /**
     * Converts our internal ChatMessage format to Anthropic's format
     */
    private static toAnthropicMessages(messages: ChatMessage[]): AnthropicMessage[] {
        return messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }))
    }

    /**
     * Makes a request to the Anthropic API
     */
    private async makeRequest(endpoint: string, body: any): Promise<Response> {
        const response = await fetch(`${ANTHROPIC_API_BASE}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            let errorBody
            try {
                errorBody = await response.json()
            } catch {
                errorBody = await response.text()
            }
            throw new AnthropicError(
                `Anthropic API error: ${response.statusText}`,
                response.status,
                errorBody
            )
        }

        return response
    }

    /**
     * Sends a chat completion request to Anthropic
     */
    async createChatCompletion(
        messages: ChatMessage[],
        options: LLMOptions
    ): Promise<LLMResponse> {
        const request: AnthropicChatRequest = {
            model: options.modelId,
            messages: AnthropicClient.toAnthropicMessages(messages),
            max_tokens: options.maxTokens ?? 1024,
            temperature: options.temperature ?? 0.7,
            system: options.system
        }

        if (options.thinkingTokens) {
            request.thinking = {
                type: 'enabled',
                budget_tokens: options.thinkingTokens
            }
        }

        const response = await this.makeRequest('/messages', request)
        const anthropicResponse: AnthropicChatResponse = await response.json()

        return {
            content: anthropicResponse.content[0].text,
            model: anthropicResponse.model,
            usage: {
                inputTokens: anthropicResponse.usage.input_tokens,
                outputTokens: anthropicResponse.usage.output_tokens
            }
        }
    }

    /**
     * Creates a streaming chat completion
     * @returns AsyncGenerator that yields chunks of the response
     */
    async *createStreamingChatCompletion(
        messages: ChatMessage[],
        options: LLMOptions
    ): AsyncGenerator<string, void, unknown> {
        const request: AnthropicChatRequest = {
            model: options.modelId,
            messages: AnthropicClient.toAnthropicMessages(messages),
            max_tokens: options.maxTokens ?? (options.thinkingTokens ? 1024 + options.thinkingTokens : 1024),
            temperature: options.temperature ?? 0.7,
            system: options.system,
            stream: true,
        }

        if (options.thinkingTokens) {
            request.thinking = {
                type: 'enabled',
                budget_tokens: options.thinkingTokens
            }
        }

        const response = await this.makeRequest('/messages', request)
        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || '' // Keep the last partial line in the buffer

            for (const line of lines) {
                if (!line.trim()) continue

                // Parse SSE event
                const event = line.startsWith('event: ') 
                    ? line.slice(7).trim() 
                    : undefined
                const data = line.startsWith('data: ') 
                    ? JSON.parse(line.slice(6)) 
                    : undefined

                if (!data) continue

                switch (data.type) {
                    case 'content_block_delta':
                        if (data.delta?.type === 'text_delta' && data.delta.text) {
                            yield data.delta.text
                        }
                        break
                    case 'error':
                        throw new AnthropicError(
                            data.error.message,
                            undefined,
                            data.error
                        )
                    // Handle other event types silently
                }
            }
        }

        // Handle any remaining data in the buffer
        if (buffer.trim()) {
            const line = buffer.trim()
            if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6))
                if (data.type === 'content_block_delta' && 
                    data.delta?.type === 'text_delta' && 
                    data.delta.text) {
                    yield data.delta.text
                }
            }
        }
    }
} 