import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpenRouterClient } from './openrouter'
import { getModelById } from './llm'
import type { ChatMessage } from '../types'

describe('OpenRouterClient', () => {
    afterEach(() => {
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    it('sends adaptive reasoning and verbosity for Claude Opus 4.7 chat completions', async () => {
        vi.stubGlobal('window', {
            location: {
                origin: 'https://notelets.example'
            }
        })

        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            choices: [
                {
                    message: {
                        content: 'Done'
                    }
                }
            ],
            model: 'anthropic/claude-opus-4.7'
        })))
        vi.stubGlobal('fetch', fetchMock)

        const model = getModelById('anthropic/claude-opus-4.7-high')
        expect(model).toBeDefined()

        const client = new OpenRouterClient('test-key')
        const messages: ChatMessage[] = [
            {
                role: 'user',
                content: 'Solve a hard problem',
                createdAt: '2026-04-29T00:00:00.000Z'
            }
        ]

        await client.createChatCompletion(messages, {
            modelId: model!.modelId,
            temperature: model!.noTemperature ? undefined : 0.7,
            reasoningEnabled: model!.reasoningEnabled,
            reasoningEffort: model!.reasoningEffort,
            reasoningMaxTokens: model!.reasoningMaxTokens,
            verbosity: model!.verbosity
        })

        const request = JSON.parse(fetchMock.mock.calls[0][1].body as string)
        expect(request).toMatchObject({
            model: 'anthropic/claude-opus-4.7',
            reasoning: {
                enabled: true
            },
            verbosity: 'high'
        })
        expect(request).not.toHaveProperty('temperature')
        expect(request.reasoning).not.toHaveProperty('effort')
    })

    it('sends adaptive reasoning and verbosity for Claude Opus 4.7 streaming completions', async () => {
        vi.stubGlobal('window', {
            location: {
                origin: 'https://notelets.example'
            }
        })

        const fetchMock = vi.fn(async () => new Response('data: [DONE]\n\n'))
        vi.stubGlobal('fetch', fetchMock)

        const model = getModelById('anthropic/claude-opus-4.7-high')
        expect(model).toBeDefined()

        const client = new OpenRouterClient('test-key')
        const messages: ChatMessage[] = [
            {
                role: 'user',
                content: 'Solve a hard problem',
                createdAt: '2026-04-29T00:00:00.000Z'
            }
        ]

        const stream = client.createStreamingChatCompletion(messages, {
            modelId: model!.modelId,
            temperature: model!.noTemperature ? undefined : 0.7,
            reasoningEnabled: model!.reasoningEnabled,
            reasoningEffort: model!.reasoningEffort,
            reasoningMaxTokens: model!.reasoningMaxTokens,
            verbosity: model!.verbosity
        })

        for await (const _chunk of stream) {
            throw new Error('Expected no content chunks')
        }

        const request = JSON.parse(fetchMock.mock.calls[0][1].body as string)
        expect(request).toMatchObject({
            model: 'anthropic/claude-opus-4.7',
            stream: true,
            reasoning: {
                enabled: true
            },
            verbosity: 'high'
        })
        expect(request).not.toHaveProperty('temperature')
        expect(request.reasoning).not.toHaveProperty('effort')
    })
})
