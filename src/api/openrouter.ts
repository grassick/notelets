import type { ChatMessage } from '../types'
import type { LLMProvider, LLMOptions, LLMResponse } from './llm'

/** Base URL for OpenRouter's API */
const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1'

/** OpenRouter API client implementation */
export class OpenRouterClient implements LLMProvider {
    private apiKey: string

    constructor(apiKey: string) {
        this.apiKey = apiKey
    }

    private convertMessages(messages: ChatMessage[], system?: string): any[] {
        const converted: any[] = []

        if (system) {
            converted.push({
                role: 'system',
                content: system
            })
        }

        messages.forEach(msg => {
            converted.push({
                role: msg.role,
                content: msg.content
            })
        })

        return converted
    }

    async createChatCompletion(
        messages: ChatMessage[],
        options: LLMOptions,
        signal?: AbortSignal
    ): Promise<LLMResponse> {
        const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Notelets'
            },
            body: JSON.stringify({
                model: options.modelId,
                messages: this.convertMessages(messages, options.system),
                max_tokens: options.maxTokens,
                temperature: options.temperature,
                reasoning: options.reasoningEffort ? {
                    effort: options.reasoningEffort
                } : undefined
            }),
            signal
        })

        if (!response.ok) {
            let errorBody
            try {
                errorBody = await response.json()
            } catch {
                errorBody = await response.text()
            }
            throw new Error(`OpenRouter API error: ${response.statusText} - ${JSON.stringify(errorBody)}`)
        }

        const data = await response.json()
        const completion = data.choices[0]?.message?.content
        if (!completion) {
            throw new Error('No completion received from OpenRouter')
        }

        return {
            content: completion,
            model: data.model,
            usage: {
                inputTokens: data.usage?.prompt_tokens,
                outputTokens: data.usage?.completion_tokens
            }
        }
    }

    async *createStreamingChatCompletion(
        messages: ChatMessage[],
        options: LLMOptions,
        signal?: AbortSignal
    ): AsyncGenerator<string, void, unknown> {
        const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Notelets'
            },
            body: JSON.stringify({
                model: options.modelId,
                messages: this.convertMessages(messages, options.system),
                max_tokens: options.maxTokens,
                temperature: options.temperature,
                stream: true,
                reasoning: options.reasoningEffort ? {
                    effort: options.reasoningEffort
                } : undefined
            }),
            signal
        })

        if (!response.ok) {
            let errorBody
            try {
                errorBody = await response.json()
            } catch {
                errorBody = await response.text()
            }
            throw new Error(`OpenRouter API error: ${response.statusText} - ${JSON.stringify(errorBody)}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let buffer = ''

        try {
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (line.trim() === '') continue
                    if (line.trim() === 'data: [DONE]') continue

                    try {
                        const data = JSON.parse(line.replace(/^data: /, ''))
                        const content = data.choices[0]?.delta?.content
                        if (content) yield content
                    } catch (e) {
                        console.warn('Error parsing SSE message:', e)
                    }
                }
            }
        } finally {
            reader.releaseLock()
        }
    }
} 