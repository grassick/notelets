import OpenAI from 'openai'
import { LLMProvider, LLMOptions, LLMResponse } from './llm'
import type { ChatMessage } from '../types'

type SimpleChatMessage = OpenAI.Chat.ChatCompletionSystemMessageParam | OpenAI.Chat.ChatCompletionUserMessageParam | OpenAI.Chat.ChatCompletionAssistantMessageParam

/** OpenAI API client implementation */
export class OpenAIClient implements LLMProvider {
    private client: OpenAI

    constructor(apiKey: string, baseURL?: string) {
        this.client = new OpenAI({ 
            apiKey,
            ...(baseURL ? { baseURL } : {}),
            dangerouslyAllowBrowser: true
        })
    }

    /** Convert our message format to OpenAI's format */
    private convertMessages(messages: ChatMessage[], system?: string): SimpleChatMessage[] {
        const converted: SimpleChatMessage[] = []
        
        if (system) {
            converted.push({
                role: 'system',
                content: system
            })
        }

        converted.push(...messages.map(msg => {
            const role = msg.role as 'system' | 'user' | 'assistant'
            return {
                role,
                content: msg.content
            }
        }))

        return converted
    }

    async createChatCompletion(
        messages: ChatMessage[],
        options: LLMOptions,
        signal?: AbortSignal
    ): Promise<LLMResponse> {
        const response = await this.client.chat.completions.create({
            model: options.modelId,
            messages: this.convertMessages(messages, options.system),
            max_tokens: options.maxTokens,
            temperature: options.temperature,
        }, { signal })

        const completion = response.choices[0]?.message?.content
        if (!completion) {
            throw new Error('No completion received from OpenAI')
        }

        return {
            content: completion,
            model: response.model,
            usage: {
                inputTokens: response.usage?.prompt_tokens,
                outputTokens: response.usage?.completion_tokens
            }
        }
    }

    async *createStreamingChatCompletion(
        messages: ChatMessage[],
        options: LLMOptions,
        signal?: AbortSignal
    ): AsyncGenerator<string, void, unknown> {
        const stream = await this.client.chat.completions.create({
            model: options.modelId,
            messages: this.convertMessages(messages, options.system),
            max_tokens: options.maxTokens,
            temperature: options.temperature,
            stream: true
        }, { signal })

        for await (const chunk of stream) {
            // Check if aborted
            if (signal?.aborted) {
                return
            }
            
            const content = chunk.choices[0]?.delta?.content
            if (content) {
                yield content
            }
        }
    }

    /**
     * Transcribe audio using Whisper
     * @param audioBlob The audio blob to transcribe
     * @returns The transcribed text
     */
    async transcribeAudio(audioBlob: Blob): Promise<string> {
        // Convert blob to file
        const file = new File([audioBlob], 'audio.webm', { type: audioBlob.type })
        
        try {
            const response = await this.client.audio.transcriptions.create({
                file,
                model: 'whisper-1',
                language: 'en'
            })

            return response.text
        } catch (error) {
            console.error('Transcription error:', error)
            throw error
        }
    }
}
