import type { ChatMessage } from '../types'
import type { LLMProvider, LLMOptions, LLMResponse } from './llm'

/** Base URL for OpenRouter's API */
const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1'

/** Reasoning configuration accepted by OpenRouter chat completions */
interface OpenRouterReasoningConfig {
    /** Enables adaptive reasoning when no specific budget or effort applies */
    enabled?: boolean
    /** Provider-normalized reasoning effort level */
    effort?: LLMOptions['reasoningEffort']
    /** Explicit reasoning token budget */
    max_tokens?: number
}

/** URL citation annotation returned when a model uses web search */
interface OpenRouterUrlCitation {
    type: 'url_citation'
    url_citation: {
        url: string
        title?: string
    }
}

/**
 * Formats web search citations as a markdown "Sources" list, skipping URLs
 * the model already linked in its answer
 */
export function formatCitations(annotations: any[] | undefined, content: string): string {
    const seen = new Set<string>()
    const lines: string[] = []
    for (const annotation of annotations ?? []) {
        if (annotation?.type !== 'url_citation') continue
        const { url, title } = (annotation as OpenRouterUrlCitation).url_citation ?? {}
        if (!url || seen.has(url) || content.includes(url)) continue
        seen.add(url)
        lines.push(`- [${(title || url).replace(/[[\]]/g, '')}](${url})`)
    }
    return lines.length > 0 ? `\n\n**Sources**\n${lines.join('\n')}` : ''
}

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

    /**
     * Builds OpenRouter's reasoning object from normalized LLM options
     */
    private buildReasoningConfig(options: LLMOptions): OpenRouterReasoningConfig | undefined {
        if (options.reasoningMaxTokens !== undefined) {
            return {
                max_tokens: options.reasoningMaxTokens
            }
        }

        if (options.reasoningEffort !== undefined) {
            return {
                effort: options.reasoningEffort
            }
        }

        if (options.reasoningEnabled) {
            return {
                enabled: true
            }
        }

        return undefined
    }

    /**
     * Builds the server tools array (web search) from normalized LLM options
     */
    private buildTools(options: LLMOptions): any[] | undefined {
        if (options.webSearch) {
            return [{ type: 'openrouter:web_search' }]
        }
        return undefined
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
                reasoning: this.buildReasoningConfig(options),
                verbosity: options.verbosity,
                tools: this.buildTools(options)
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
        const message = data.choices[0]?.message
        const completion = message?.content
        if (!completion) {
            throw new Error('No completion received from OpenRouter')
        }

        return {
            content: completion + formatCitations(message.annotations, completion),
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
                reasoning: this.buildReasoningConfig(options),
                verbosity: options.verbosity,
                tools: this.buildTools(options)
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
        let streamedContent = ''
        const annotations: any[] = []

        try {
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const rawLine of lines) {
                    const line = rawLine.trim()
                    if (line === '') continue
                    // SSE comment lines (e.g. ": OPENROUTER PROCESSING" keepalives) are not data
                    if (line.startsWith(':')) continue
                    if (!line.startsWith('data:')) continue
                    const payload = line.slice('data:'.length).trim()
                    if (payload === '[DONE]') continue

                    try {
                        const data = JSON.parse(payload)
                        const delta = data.choices?.[0]?.delta
                        if (Array.isArray(delta?.annotations)) annotations.push(...delta.annotations)
                        const content = delta?.content
                        if (content) {
                            streamedContent += content
                            yield content
                        }
                    } catch (e) {
                        console.warn('Error parsing SSE message:', e)
                    }
                }
            }

            const sources = formatCitations(annotations, streamedContent)
            if (sources) yield sources
        } finally {
            reader.releaseLock()
        }
    }

    /**
     * Transcribe audio using Gemini Flash 2.5 via OpenRouter
     * @param audioBlob - The audio blob to transcribe
     * @param prompt - Optional prompt to guide the transcription
     * @returns The transcribed text
     */
    async transcribeAudio(audioBlob: Blob, prompt?: string): Promise<string> {
        const reader = new FileReader()
        const base64Data = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
                const base64 = reader.result as string
                resolve(base64.split(',')[1])
            }
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(audioBlob)
        })

        const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Notelets'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: prompt || 'Please transcribe this audio. Output only the transcribed text, nothing else.'
                            },
                            {
                                type: 'input_audio',
                                input_audio: {
                                    data: base64Data,
                                    format: 'wav'
                                }
                            }
                        ]
                    }
                ]
            })
        })

        if (!response.ok) {
            let errorBody
            try {
                errorBody = await response.json()
            } catch {
                errorBody = await response.text()
            }
            throw new Error(`OpenRouter transcription error: ${response.statusText} - ${JSON.stringify(errorBody)}`)
        }

        const data = await response.json()
        const transcription = data.choices[0]?.message?.content
        if (!transcription) {
            throw new Error('No transcription received from OpenRouter')
        }

        return transcription
    }

    /**
     * Create a vision completion request with an image
     * @param imageBase64 - Base64 encoded image data (without data URL prefix)
     * @param prompt - Text prompt to accompany the image
     * @param options - LLM options including modelId
     * @param signal - Optional abort signal
     * @returns The completion response
     */
    async createVisionCompletion(
        imageBase64: string,
        prompt: string,
        options: LLMOptions,
        signal?: AbortSignal
    ): Promise<LLMResponse> {
        const messages = [
            ...(options.system ? [{
                role: 'system',
                content: options.system
            }] : []),
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    { 
                        type: 'image_url', 
                        image_url: { 
                            url: imageBase64.startsWith('data:') 
                                ? imageBase64 
                                : `data:image/jpeg;base64,${imageBase64}` 
                        } 
                    }
                ]
            }
        ]

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
                messages,
                max_tokens: options.maxTokens,
                temperature: options.temperature
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
}