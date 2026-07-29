import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyEditOps, numberLines, parseEditOps, smartVoiceEdit, type EditOp } from './smartVoiceEdit'
import type { UserSettings } from '../types/settings'

describe('numberLines', () => {
    it('prefixes each line with its 1-based number', () => {
        expect(numberLines('alpha\nbeta\ngamma')).toBe('1: alpha\n2: beta\n3: gamma')
    })

    it('numbers blank lines too', () => {
        expect(numberLines('alpha\n\nbeta')).toBe('1: alpha\n2: \n3: beta')
    })

    it('returns an empty string for empty content', () => {
        expect(numberLines('')).toBe('')
    })
})

describe('applyEditOps', () => {
    const note = 'line one\nline two\nline three\nline four\nline five'

    it('replaces a single line', () => {
        expect(applyEditOps(note, [{ op: 'replace', start_line: 2, end_line: 2, content: 'TWO' }]))
            .toBe('line one\nTWO\nline three\nline four\nline five')
    })

    it('replaces a range with multi-line content', () => {
        expect(applyEditOps(note, [{ op: 'replace', start_line: 2, end_line: 4, content: 'A\nB' }]))
            .toBe('line one\nA\nB\nline five')
    })

    it('deletes a range', () => {
        expect(applyEditOps(note, [{ op: 'delete', start_line: 2, end_line: 3 }]))
            .toBe('line one\nline four\nline five')
    })

    it('inserts at the top with after_line 0', () => {
        expect(applyEditOps('alpha\nbeta', [{ op: 'insert', after_line: 0, content: '# Title' }]))
            .toBe('# Title\nalpha\nbeta')
    })

    it('appends at the end with after_line equal to the line count', () => {
        expect(applyEditOps('alpha\nbeta', [{ op: 'insert', after_line: 2, content: 'gamma' }]))
            .toBe('alpha\nbeta\ngamma')
    })

    it('inserts multi-line content', () => {
        expect(applyEditOps('alpha', [{ op: 'insert', after_line: 1, content: '\n- new entry\n- detail' }]))
            .toBe('alpha\n\n- new entry\n- detail')
    })

    it('applies multiple non-overlapping ops given in ascending order', () => {
        const ops: EditOp[] = [
            { op: 'replace', start_line: 1, end_line: 1, content: 'ONE' },
            { op: 'delete', start_line: 3, end_line: 3 },
            { op: 'insert', after_line: 5, content: 'SIX' }
        ]
        expect(applyEditOps(note, ops)).toBe('ONE\nline two\nline four\nline five\nSIX')
    })

    it('applies an insert anchored at the same line as a replace after that line', () => {
        const ops: EditOp[] = [
            { op: 'insert', after_line: 2, content: 'INSERTED' },
            { op: 'replace', start_line: 2, end_line: 2, content: 'TWO' }
        ]
        expect(applyEditOps('a\nb\nc', ops)).toBe('a\nTWO\nINSERTED\nc')
    })

    it('preserves the order of two inserts anchored at the same line', () => {
        const ops: EditOp[] = [
            { op: 'insert', after_line: 1, content: 'FIRST' },
            { op: 'insert', after_line: 1, content: 'SECOND' }
        ]
        expect(applyEditOps('a\nb', ops)).toBe('a\nFIRST\nSECOND\nb')
    })

    it('allows an insert at the trailing boundary of a replaced range', () => {
        const ops: EditOp[] = [
            { op: 'replace', start_line: 2, end_line: 3, content: 'MERGED' },
            { op: 'insert', after_line: 3, content: 'AFTER' }
        ]
        expect(applyEditOps('a\nb\nc\nd', ops)).toBe('a\nMERGED\nAFTER\nd')
    })

    it('allows an insert at the leading boundary of a replaced range', () => {
        const ops: EditOp[] = [
            { op: 'replace', start_line: 2, end_line: 3, content: 'MERGED' },
            { op: 'insert', after_line: 1, content: 'BEFORE' }
        ]
        expect(applyEditOps('a\nb\nc\nd', ops)).toBe('a\nBEFORE\nMERGED\nd')
    })

    it('deletes the whole note', () => {
        expect(applyEditOps('a\nb', [{ op: 'delete', start_line: 1, end_line: 2 }])).toBe('')
    })

    it('inserts into an empty note', () => {
        expect(applyEditOps('', [{ op: 'insert', after_line: 0, content: 'first entry' }])).toBe('first entry')
    })

    it('preserves a trailing newline when editing above it', () => {
        expect(applyEditOps('a\nb\n', [{ op: 'replace', start_line: 1, end_line: 1, content: 'A' }]))
            .toBe('A\nb\n')
    })

    it('leaves untouched lines byte-identical', () => {
        const messy = '  indented\n\ttabbed\n\n- item **bold**\n'
        const result = applyEditOps(messy, [{ op: 'insert', after_line: 4, content: '- added' }])
        expect(result).toBe('  indented\n\ttabbed\n\n- item **bold**\n- added\n')
    })

    it('returns the content unchanged for a lone no_change', () => {
        expect(applyEditOps(note, [{ op: 'no_change', reason: 'unclear' }])).toBe(note)
    })

    it('rejects no_change mixed with other operations', () => {
        const ops: EditOp[] = [
            { op: 'no_change', reason: 'unclear' },
            { op: 'delete', start_line: 1, end_line: 1 }
        ]
        expect(() => applyEditOps(note, ops)).toThrow(/no_change/)
    })

    it('rejects overlapping ranges', () => {
        const ops: EditOp[] = [
            { op: 'replace', start_line: 1, end_line: 3, content: 'X' },
            { op: 'delete', start_line: 3, end_line: 4 }
        ]
        expect(() => applyEditOps(note, ops)).toThrow(/overlapping/)
    })

    it('rejects an insert inside a range it also edits', () => {
        const ops: EditOp[] = [
            { op: 'replace', start_line: 2, end_line: 4, content: 'X' },
            { op: 'insert', after_line: 2, content: 'Y' }
        ]
        expect(() => applyEditOps(note, ops)).toThrow(/inside a range/)
    })

    it('rejects line numbers past the end of the note', () => {
        expect(() => applyEditOps(note, [{ op: 'delete', start_line: 4, end_line: 99 }]))
            .toThrow(/outside the note/)
    })

    it('rejects a zero or negative start line', () => {
        expect(() => applyEditOps(note, [{ op: 'replace', start_line: 0, end_line: 1, content: 'X' }]))
            .toThrow(/outside the note/)
    })

    it('rejects an inverted range', () => {
        expect(() => applyEditOps(note, [{ op: 'delete', start_line: 4, end_line: 2 }]))
            .toThrow(/inverted/)
    })

    it('rejects an insert past the end of the note', () => {
        expect(() => applyEditOps(note, [{ op: 'insert', after_line: 99, content: 'X' }]))
            .toThrow(/outside the note/)
    })

    it('rejects non-integer line numbers', () => {
        const ops = [{ op: 'delete', start_line: 1.5, end_line: 2 }] as unknown as EditOp[]
        expect(() => applyEditOps(note, ops)).toThrow(/invalid start_line/)
    })

    it('rejects any edit on an empty note other than an insert', () => {
        expect(() => applyEditOps('', [{ op: 'delete', start_line: 1, end_line: 1 }]))
            .toThrow(/outside the note/)
    })
})

describe('parseEditOps', () => {
    it('parses a bare JSON array', () => {
        expect(parseEditOps('[{"op":"delete","start_line":1,"end_line":2}]'))
            .toEqual([{ op: 'delete', start_line: 1, end_line: 2 }])
    })

    it('parses a fenced JSON block', () => {
        const response = 'Here you go:\n```json\n[{"op":"insert","after_line":0,"content":"hi"}]\n```'
        expect(parseEditOps(response)).toEqual([{ op: 'insert', after_line: 0, content: 'hi' }])
    })

    it('unwraps a wrapper object', () => {
        expect(parseEditOps('{"operations":[{"op":"no_change","reason":"nope"}]}'))
            .toEqual([{ op: 'no_change', reason: 'nope' }])
    })

    it('defaults a missing no_change reason to an empty string', () => {
        expect(parseEditOps('[{"op":"no_change"}]')).toEqual([{ op: 'no_change', reason: '' }])
    })

    it('throws on non-JSON output', () => {
        expect(() => parseEditOps('I could not understand that.')).toThrow(/valid JSON/)
    })

    it('throws on a JSON object that holds no operations array', () => {
        expect(() => parseEditOps('{"foo":1}')).toThrow(/list of edit operations/)
    })

    it('throws on an empty array', () => {
        expect(() => parseEditOps('[]')).toThrow(/no edit operations/)
    })

    it('throws on an unknown op', () => {
        expect(() => parseEditOps('[{"op":"rewrite_everything"}]')).toThrow(/unknown edit operation/)
    })

    it('throws when a replace is missing its content', () => {
        expect(() => parseEditOps('[{"op":"replace","start_line":1,"end_line":1}]')).toThrow(/missing content/)
    })
})

describe('smartVoiceEdit', () => {
    const userSettings: UserSettings = { llm: { openrouterKey: 'test-key' } }

    const stubFetch = (content: string) => {
        vi.stubGlobal('window', { location: { origin: 'https://notelets.example' } })
        const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify({
            choices: [{ message: { content } }],
            model: 'google/gemini-3.6-flash'
        })))
        vi.stubGlobal('fetch', fetchMock)
        return fetchMock
    }

    /** Read the parsed request body of the given fetch call */
    const requestBody = (fetchMock: ReturnType<typeof stubFetch>) =>
        JSON.parse(fetchMock.mock.calls[0][1].body as string)

    afterEach(() => {
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    it('sends the numbered note and transcript, and applies the returned edits', async () => {
        const fetchMock = stubFetch('[{"op":"insert","after_line":2,"content":"- 2026-07-29: 5k run"}]')

        const result = await smartVoiceEdit(
            'ran five k today',
            '# Workout log\n- 2026-07-28: 3k run',
            userSettings
        )

        expect(result).toEqual({
            markdown: '# Workout log\n- 2026-07-28: 3k run\n- 2026-07-29: 5k run',
            changed: true
        })

        const request = requestBody(fetchMock)
        expect(request.model).toBe('google/gemini-3.6-flash')
        expect(request.temperature).toBe(0.1)
        const userMessage = request.messages.find((m: { role: string }) => m.role === 'user')
        expect(userMessage.content).toContain('1: # Workout log')
        expect(userMessage.content).toContain('2: - 2026-07-28: 3k run')
        expect(userMessage.content).toContain('ran five k today')
    })

    it('reports no change when the model declines to edit', async () => {
        stubFetch('[{"op":"no_change","reason":"The request does not refer to this note"}]')

        const result = await smartVoiceEdit('what is the weather', 'some note', userSettings)

        expect(result).toEqual({
            markdown: 'some note',
            changed: false,
            message: 'The request does not refer to this note'
        })
    })

    it('tells the model when the note is empty', async () => {
        const fetchMock = stubFetch('[{"op":"insert","after_line":0,"content":"first entry"}]')

        const result = await smartVoiceEdit('first entry', '', userSettings)

        expect(result.markdown).toBe('first entry')
        const request = requestBody(fetchMock)
        const userMessage = request.messages.find((m: { role: string }) => m.role === 'user')
        expect(userMessage.content).toContain('The note is currently empty.')
    })

    it('throws when no OpenRouter key is configured', async () => {
        await expect(smartVoiceEdit('anything', 'note', { llm: {} }))
            .rejects.toThrow(/OpenRouter API key is required/)
    })
})
