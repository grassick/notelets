import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import { LLMProvider, LLMOptions, LLMResponse } from './llm'
import type { ChatMessage } from '../types'

/** Gemini API client implementation */
export class GeminiClient implements LLMProvider {
    private client: GoogleGenerativeAI
    private model: GenerativeModel

    constructor(apiKey: string, modelId: string = 'gemini-pro') {
        this.client = new GoogleGenerativeAI(apiKey)
        this.model = this.client.getGenerativeModel({ model: modelId })
    }

    /** Convert our message format to Gemini's format */
    private convertMessages(messages: ChatMessage[]) {
        return messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }))
    }

    /** Convert system message to Gemini's Content format */
    private convertSystemMessage(system: string) {
        return {
            role: 'user',
            parts: [{ text: system }]
        }
    }

    async createChatCompletion(
        messages: ChatMessage[],
        options: LLMOptions,
        signal?: AbortSignal
    ): Promise<LLMResponse> {
        const chat = this.model.startChat({
            history: this.convertMessages(messages.slice(0, -1)),
            generationConfig: {
                maxOutputTokens: options.maxTokens,
                temperature: options.temperature,
            },
            ...(options.system && { systemInstruction: this.convertSystemMessage(options.system) })
        })

        const lastMessage = messages[messages.length - 1]
        const result = await chat.sendMessage([{ text: lastMessage.content }])
        const response = await result.response
        const text = response.text()

        if (!text) {
            throw new Error('No completion received from Gemini')
        }

        return {
            content: text,
            model: options.modelId,
            // Note: Gemini API currently doesn't provide token usage information
            usage: {}
        }
    }

    async *createStreamingChatCompletion(
        messages: ChatMessage[],
        options: LLMOptions,
        signal?: AbortSignal
    ): AsyncGenerator<string, void, unknown> {
        const chat = this.model.startChat({
            history: this.convertMessages(messages.slice(0, -1)),
            generationConfig: {
                maxOutputTokens: options.maxTokens,
                temperature: options.temperature,
            },
            ...(options.system && { systemInstruction: this.convertSystemMessage(options.system) })
        })

        const lastMessage = messages[messages.length - 1]
        
        // Create request options with abort signal
        const requestOptions = signal ? { signal } : undefined
        
        try {
            // Pass the abort signal to the Gemini API
            const result = await chat.sendMessageStream(
                [{ text: lastMessage.content }],
                requestOptions
            )
            
            for await (const chunk of result.stream) {
                // Also check if aborted during streaming
                if (signal?.aborted) {
                    return
                }
                
                const text = chunk.text()
                if (text) {
                    yield text
                }
            }
        } catch (error: any) {
            // Handle abort errors
            if (signal?.aborted || error.name === 'AbortError') {
                return
            }
            throw error
        }
    }
} 