import type { ChatMessage } from '../types'

/** Base interface for all LLM providers */
export interface LLMProvider {
    /** Send a chat completion request */
    createChatCompletion(
        messages: ChatMessage[],
        options: LLMOptions
    ): Promise<LLMResponse>

    /** Create a streaming chat completion */
    createStreamingChatCompletion(
        messages: ChatMessage[],
        options: LLMOptions
    ): AsyncGenerator<string, void, unknown>
}

/** Available LLM providers */
export type LLMProviderType = 'anthropic' | 'gemini' | 'openai' | 'deepseek'

/** Model information */
export interface ModelInfo {
    /** Unique identifier for the model in our application */
    id: string
    /** The provider of this model */
    provider: LLMProviderType
    /** The model ID used in API calls */
    modelId: string
    /** Human-friendly name of the model */
    name: string
    /** Base URL for API calls (optional) */
    baseURL?: string
    /** Whether this model supports temperature */
    noTemperature?: boolean
    /** Number of thinking tokens for models that support thinking mode (optional) */
    thinkingTokens?: number
}

/** Settings interface for LLM API keys */
export interface LLMSettings {
    anthropicKey?: string
    geminiKey?: string
    openaiKey?: string
}

/** Get the default model based on available API keys */
export function getDefaultModel(settings: LLMSettings): ModelId {
    // Try to find first available model in order of preference
    const modelPreference: ModelId[] = [
        'claude-3-7-sonnet-latest',
        'claude-3-7-sonnet-thinking-latest',
        'claude-3-5-sonnet-latest',
        'gemini-2.0-pro-exp-02-05',
        'gpt-4o'
    ]

    for (const modelId of modelPreference) {
        if (isModelAvailable(modelId, settings)) {
            return modelId
        }
    }

    // If no preferred models are available, return first model with available key
    if (settings.anthropicKey) return 'claude-3-7-sonnet-latest'
    if (settings.geminiKey) return 'gemini-2.0-pro-exp-02-05'
    if (settings.openaiKey) return 'gpt-4o'
    
    // Fallback to Claude as default (will show API key missing message)
    return 'claude-3-7-sonnet-latest'
}

/** Check if a model is available (has API key) */
export function isModelAvailable(modelId: ModelId, settings: LLMSettings): boolean {
    const model = getModelById(modelId)
    if (!model) return false

    switch (model.provider) {
        case 'anthropic':
            return !!settings.anthropicKey
        case 'gemini':
            return !!settings.geminiKey
        case 'openai':
            return !!settings.openaiKey
        default:
            return false
    }
}

/** Available models */
export const AVAILABLE_MODELS: ModelInfo[] = [
    // Anthropic models
    {
        provider: 'anthropic',
        id: 'claude-3-7-sonnet-latest',
        modelId: 'claude-3-7-sonnet-latest',
        name: 'Claude 3.7 Sonnet'
    },
    {
        provider: 'anthropic',
        id: 'claude-3-7-sonnet-thinking-latest',
        modelId: 'claude-3-7-sonnet-latest',
        name: 'Claude 3.7 Sonnet (Thinking)',
        thinkingTokens: 16000
    },
    {
        provider: 'anthropic',
        id: 'claude-3-5-sonnet-latest',
        modelId: 'claude-3-5-sonnet-20240620',
        name: 'Claude 3.5 Sonnet'
    },
    {
        provider: 'anthropic',
        id: 'claude-3-5-haiku-latest',
        modelId: 'claude-3-5-haiku-20240620',
        name: 'Claude 3.5 Haiku'
    },
    // {
    //     provider: 'anthropic',
    //     id: 'claude-3-haiku-20240307',
    //     name: 'Claude 3 Haiku'
    // },
    // OpenAI models
    {
        provider: 'openai',
        id: 'gpt-4o',
        modelId: 'gpt-4o',
        name: 'GPT-4o'
    },
    {
        provider: 'openai',
        id: 'gpt-4o-mini',
        modelId: 'gpt-4o-mini',
        name: 'GPT-4o Mini'
    },
    {
        provider: 'openai',
        id: 'o1',
        modelId: 'o1',
        name: 'O1',
        noTemperature: true
    },
    {
        provider: 'openai',
        id: 'o1-mini',
        modelId: 'o1-mini',
        name: 'O1 Mini',
        noTemperature: true
    },
    {
        provider: 'openai',
        id: 'o3-mini',
        modelId: 'o3-mini',
        name: 'O3 Mini',
        noTemperature: true
    },
    {
        provider: 'openai',
        id: 'chatgpt-4o-latest',
        modelId: 'chatgpt-4o-latest',
        name: 'ChatGPT 4o'
    },
    // Gemini models
    {
        provider: 'gemini',
        id: 'gemini-2.0-flash',
        modelId: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
    },
    {
        provider: 'gemini',
        id: 'gemini-2.0-flash-lite-preview-02-05',
        modelId: 'gemini-2.0-flash-lite-preview-02-05',
        name: 'Gemini 2.0 Flash Lite',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
    },
    {
        provider: 'gemini',
        id: 'gemini-2.0-pro-exp-02-05',
        modelId: 'gemini-2.0-pro-exp-02-05',
        name: 'Gemini 2.0 Pro',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
    },
    {
        provider: 'gemini',
        id: 'gemini-2.0-flash-thinking-exp-01-21',
        modelId: 'gemini-2.0-flash-thinking-exp-01-21',
        name: 'Gemini 2.0 Flash Thinking',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
    },
    // // Google models
    // {
    //     provider: 'gemini',
    //     id: 'gemini-pro',
    //     name: 'Gemini Pro'
    // },
    // // DeepSeek models
    // {
    //     provider: 'deepseek',
    //     id: 'deepseek-chat',
    //     name: 'DeepSeek Chat'
    // }
]

/** Model ID type */
export type ModelId = string

/** Common options for all LLM requests */
export interface LLMOptions {
    /** The model ID to use */
    modelId: ModelId
    /** Maximum tokens to generate */
    maxTokens?: number
    /** Temperature for sampling */
    temperature?: number
    /** System prompt */
    system?: string
    /** Thinking tokens */
    thinkingTokens?: number
}

/** Common response format for all LLMs */
export interface LLMResponse {
    /** The generated content */
    content: string
    /** The model that generated the response */
    model: string
    /** Usage statistics if available */
    usage?: {
        inputTokens?: number
        outputTokens?: number
    }
}

/** Factory to create LLM providers */
export class LLMFactory {
    static async createProvider(
        modelId: ModelId,
        apiKey: string
    ): Promise<LLMProvider> {
        const model = getModelById(modelId)
        if (!model) {
            throw new Error(`Unknown model: ${modelId}`)
        }

        switch (model.provider) {
            case 'anthropic': {
                const { AnthropicClient } = await import('./anthropic')
                return new AnthropicClient(apiKey)
            }
            case 'openai': {
                const { OpenAIClient } = await import('./openai')
                return new OpenAIClient(apiKey, model.baseURL)
            }
            case 'gemini': {
                const { GeminiClient } = await import('./gemini')
                return new GeminiClient(apiKey, model.modelId)
            }
            default:
                throw new Error(`Provider ${model.provider} not implemented`)
        }
    }
}

/** Helper to get models for a specific provider */
export function getModelsForProvider(provider: LLMProviderType): ModelInfo[] {
    return AVAILABLE_MODELS.filter(model => model.provider === provider)
}

/** Helper to get model info by ID */
export function getModelById(modelId: ModelId): ModelInfo | undefined {
    return AVAILABLE_MODELS.find(model => model.id === modelId)
}

/** Helper to get provider for a model */
export function getProviderForModel(modelId: ModelId): LLMProviderType | undefined {
    return getModelById(modelId)?.provider
} 