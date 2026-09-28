import { afterEach, describe, expect, it, vi } from 'vitest'
import { OpenRouterClient } from './openrouter'
import { getModelById } from './llm'
import type { ChatMessage } from '../types'

describe('OpenRouterClient', () => {
    afterEach(() => {
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    it('sends adaptive reasoning for Claude Opus 4.7 chat completions', async () => {
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
            }
        })
        expect(request).not.toHaveProperty('temperature')
        expect(request).not.toHaveProperty('verbosity')
        expect(request.reasoning).not.toHaveProperty('effort')
    })

    it('sends adaptive reasoning for Claude Opus 4.7 streaming completions', async () => {
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
            }
        })
        expect(request).not.toHaveProperty('temperature')
        expect(request).not.toHaveProperty('verbosity')
        expect(request.reasoning).not.toHaveProperty('effort')
    })

    it('sends the web search server tool and appends streamed citations', async () => {
        vi.stubGlobal('window', {
            location: {
                origin: 'https://notelets.example'
            }
        })

        const sse = [
            { choices: [{ delta: { content: 'It rained today.' } }] },
            { choices: [{ delta: { annotations: [
                { type: 'url_citation', url_citation: { url: 'https://weather.example/today', title: 'Weather [Today]' } },
                { type: 'url_citation', url_citation: { url: 'https://weather.example/today', title: 'Weather [Today]' } }
            ] } }] }
        ].map(d => `data: ${JSON.stringify(d)}\n\n`).join('') + 'data: [DONE]\n\n'
        const fetchMock = vi.fn(async () => new Response(sse))
        vi.stubGlobal('fetch', fetchMock)

        const model = getModelById('anthropic/claude-opus-5.5-high')
        expect(model?.webSearch).toBe(true)

        const client = new OpenRouterClient('test-key')
        let output = ''
        for await (const chunk of client.createStreamingChatCompletion(
            [{ role: 'user', content: 'Weather?', createdAt: '2026-09-28T00:00:00.000Z' }],
            { modelId: model!.modelId, webSearch: model!.webSearch }
        )) {
            output += chunk
        }

        const request = JSON.parse(fetchMock.mock.calls[0][1].body as string)
        expect(request.tools).toEqual([{ type: 'openrouter:web_search' }])
        expect(output).toBe('It rained today.\n\n**Sources**\n- [Weather Today](https://weather.example/today)')
    })

    it('omits tools when web search is disabled', async () => {
        vi.stubGlobal('window', {
            location: {
                origin: 'https://notelets.example'
            }
        })

        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            choices: [{ message: { content: 'Done' } }],
            model: 'anthropic/claude-opus-5.5'
        })))
        vi.stubGlobal('fetch', fetchMock)

        const client = new OpenRouterClient('test-key')
        await client.createChatCompletion(
            [{ role: 'user', content: 'Hi', createdAt: '2026-09-28T00:00:00.000Z' }],
            { modelId: 'anthropic/claude-opus-5.5' }
        )

        const request = JSON.parse(fetchMock.mock.calls[0][1].body as string)
        expect(request).not.toHaveProperty('tools')
    })
})
