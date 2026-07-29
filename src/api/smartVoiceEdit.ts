import { OpenRouterClient } from './openrouter'
import { UserSettings } from '../types/settings'
import type { ChatMessage } from '../types'

/** The model used to interpret a voice transcript as note edits */
const SMART_VOICE_EDIT_MODEL = 'google/gemini-3.6-flash'

/** Maximum tokens allowed for the edit-operation response */
const MAX_TOKENS = 8192

/**
 * A single line-based edit operation. Line numbers refer to the original,
 * pre-edit numbering of the note.
 */
export type EditOp =
    | { op: 'replace'; start_line: number; end_line: number; content: string }
    | { op: 'delete'; start_line: number; end_line: number }
    | { op: 'insert'; after_line: number; content: string }
    | { op: 'no_change'; reason: string }

/** An operation that actually edits lines */
type LineEditOp = Exclude<EditOp, { op: 'no_change' }>

/** An operation that targets a range of existing lines */
type RangeEditOp = Extract<EditOp, { op: 'replace' | 'delete' }>

/** Result of interpreting a voice transcript as an edit to a note */
export interface SmartVoiceEditResult {
    /** The new note content (identical to the input when nothing changed) */
    markdown: string
    /** Whether the content actually changed */
    changed: boolean
    /** The model's explanation when no change was made */
    message?: string
}

/** System prompt instructing the model to emit line-based edit operations */
const SYSTEM_PROMPT = `You are a note-editing assistant. The user dictated something by voice while looking at one of their notes. You receive the note as numbered lines plus the voice transcript. Your job is to apply the user's intent to the note by returning a JSON array of edit operations.

Available operations:
  {"op": "replace", "start_line": N, "end_line": M, "content": "replacement text"}
  {"op": "delete", "start_line": N, "end_line": M}
  {"op": "insert", "after_line": N, "content": "text to insert"}
  {"op": "no_change", "reason": "brief explanation"}

Rules:
- Line numbers ALWAYS refer to the original numbering shown to you. Never adjust them to account for your other operations.
- Operations must not target overlapping line ranges, and an "insert" must not fall inside a range you replace or delete.
- "after_line": 0 inserts at the very top of the note. Use the last line number to append at the end.
- "content" is raw markdown WITHOUT line-number prefixes. Use "\\n" for multiple lines.
- If the transcript is new content rather than an instruction, add it as a new entry that matches the note's existing structure and formatting exactly: the same bullet or heading style, the same date format, the same field ordering, the same blank-line separation. Infer the pattern from the existing entries. Usually this means an "insert" at the end, but respect the note's ordering if entries are newest-first.
- If the transcript is an instruction (for example "delete the entry about the dentist", "change the second item to 12 dollars", "mark the first task done"), edit only the lines it refers to.
- Voice transcripts contain recognition errors, filler words and false starts. Interpret the intent charitably and clean up dictation artifacts when writing content. Do not transcribe filler words like "um" into the note.
- If the request is unclear, ambiguous, or does not apply to this note, return [{"op": "no_change", "reason": "..."}] with a short explanation. Never guess at a destructive edit.
- "no_change" must be the only element when used.

Return ONLY the JSON array. No commentary, no markdown code fences.`

/**
 * Prefix each line of the markdown with its 1-based line number
 * @param markdown - The note content
 * @returns The content with "N: " prefixes, one per line
 */
export function numberLines(markdown: string): string {
    if (markdown === '') {
        return ''
    }
    return markdown
        .split('\n')
        .map((line, index) => `${index + 1}: ${line}`)
        .join('\n')
}

/** Build the user message containing the numbered note and the transcript */
function buildUserMessage(transcript: string, noteMarkdown: string): string {
    const noteSection = noteMarkdown === ''
        ? 'The note is currently empty.'
        : `Note content (numbered):\n${numberLines(noteMarkdown)}`

    return `Today's date: ${new Date().toISOString().split('T')[0]}

${noteSection}

Voice transcript:
"${transcript}"`
}

/** Check whether a value is a non-null, non-array object */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Validate that a parsed value is a well-formed array of edit operations */
function validateOps(ops: unknown): EditOp[] {
    if (!Array.isArray(ops)) {
        throw new Error('The model did not return a list of edit operations')
    }
    if (ops.length === 0) {
        throw new Error('The model returned no edit operations')
    }

    return ops.map(raw => {
        if (!isPlainObject(raw)) {
            throw new Error('The model returned a malformed edit operation')
        }

        const requireInteger = (field: string): number => {
            const value = raw[field]
            if (!Number.isInteger(value)) {
                throw new Error(`Edit operation "${String(raw.op)}" has an invalid ${field}`)
            }
            return value as number
        }

        const requireString = (field: string): string => {
            const value = raw[field]
            if (typeof value !== 'string') {
                throw new Error(`Edit operation "${String(raw.op)}" is missing ${field}`)
            }
            return value
        }

        switch (raw.op) {
            case 'replace':
                return {
                    op: 'replace' as const,
                    start_line: requireInteger('start_line'),
                    end_line: requireInteger('end_line'),
                    content: requireString('content')
                }
            case 'delete':
                return {
                    op: 'delete' as const,
                    start_line: requireInteger('start_line'),
                    end_line: requireInteger('end_line')
                }
            case 'insert':
                return {
                    op: 'insert' as const,
                    after_line: requireInteger('after_line'),
                    content: requireString('content')
                }
            case 'no_change':
                return {
                    op: 'no_change' as const,
                    reason: typeof raw.reason === 'string' ? raw.reason : ''
                }
            default:
                throw new Error(`The model returned an unknown edit operation: ${JSON.stringify(raw.op)}`)
        }
    })
}

/**
 * Parse the model's response into edit operations
 * @param response - Raw text returned by the model
 * @returns The validated edit operations
 * @throws Error if the response is not a well-formed list of operations
 */
export function parseEditOps(response: string): EditOp[] {
    const fenced = response.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = (fenced ? fenced[1] : response).trim()

    let parsed: unknown
    try {
        parsed = JSON.parse(jsonStr)
    } catch {
        throw new Error('The model did not return valid JSON edit operations')
    }

    // Tolerate a wrapper object, which some models emit despite the instructions
    if (isPlainObject(parsed)) {
        const wrapped = ['operations', 'ops', 'edits'].map(key => parsed[key]).find(Array.isArray)
        if (wrapped) {
            return validateOps(wrapped)
        }
    }

    return validateOps(parsed)
}

/** Split model-provided content into lines, tolerating CRLF */
function splitContent(content: string): string[] {
    return content.split(/\r?\n/)
}

/**
 * Apply line-based edit operations to markdown content.
 *
 * All operations are validated before any is applied, so a malformed set leaves
 * the content untouched. Operations reference the original line numbering and
 * are applied bottom-up so earlier line numbers never shift.
 *
 * @param markdown - The original note content
 * @param ops - The operations to apply
 * @returns The edited content
 * @throws Error if the operations are out of range, overlapping, or malformed
 */
export function applyEditOps(markdown: string, ops: EditOp[]): string {
    const validated = validateOps(ops)

    if (validated.some(op => op.op === 'no_change')) {
        if (validated.length > 1) {
            throw new Error('The model mixed "no_change" with other edits; no changes were applied')
        }
        return markdown
    }

    // Every remaining op edits lines; no_change already returned above
    const edits = validated.filter((op): op is LineEditOp => op.op !== 'no_change')

    // An empty note has no lines at all, so only an insert at position 0 applies
    const lines = markdown === '' ? [] : markdown.split('\n')

    for (const op of edits) {
        if (op.op === 'insert') {
            if (op.after_line < 0 || op.after_line > lines.length) {
                throw new Error(`The model tried to insert after line ${op.after_line}, which is outside the note`)
            }
        } else {
            if (op.start_line > op.end_line) {
                throw new Error(`The model returned an inverted line range (${op.start_line}-${op.end_line})`)
            }
            if (op.start_line < 1 || op.end_line > lines.length) {
                throw new Error(`The model referenced lines ${op.start_line}-${op.end_line}, which are outside the note`)
            }
        }
    }

    const ranges = edits.filter((op): op is RangeEditOp => op.op === 'replace' || op.op === 'delete')

    for (let i = 0; i < ranges.length; i++) {
        for (let j = i + 1; j < ranges.length; j++) {
            const a = ranges[i]
            const b = ranges[j]
            if (a.start_line <= b.end_line && b.start_line <= a.end_line) {
                throw new Error('The model returned overlapping edits; no changes were applied')
            }
        }
    }

    for (const op of edits) {
        if (op.op !== 'insert') continue
        for (const range of ranges) {
            // Inserting at a range boundary is fine; inside it is ambiguous
            if (op.after_line >= range.start_line && op.after_line <= range.end_line - 1) {
                throw new Error('The model tried to insert inside a range it also edits; no changes were applied')
            }
        }
    }

    // Apply bottom-up. For equal positions, later operations apply first so that
    // the final order matches the order the model listed them in.
    const ordered = edits
        .map((op, index) => ({
            op,
            index,
            position: op.op === 'insert' ? op.after_line + 0.5 : op.start_line
        }))
        .sort((a, b) => b.position - a.position || b.index - a.index)

    const result = [...lines]
    for (const { op } of ordered) {
        switch (op.op) {
            case 'insert':
                result.splice(op.after_line, 0, ...splitContent(op.content))
                break
            case 'delete':
                result.splice(op.start_line - 1, op.end_line - op.start_line + 1)
                break
            case 'replace':
                result.splice(op.start_line - 1, op.end_line - op.start_line + 1, ...splitContent(op.content))
                break
        }
    }

    return result.join('\n')
}

/**
 * Interpret a voice transcript as an edit to a note and return the edited content
 * @param transcript - The transcribed voice input
 * @param noteMarkdown - The current note content
 * @param userSettings - User settings containing API keys
 * @returns The edited content, or the original content when no change was needed
 * @throws Error if the OpenRouter key is missing, the call fails, or the edits are invalid
 */
export async function smartVoiceEdit(
    transcript: string,
    noteMarkdown: string,
    userSettings: UserSettings
): Promise<SmartVoiceEditResult> {
    const apiKey = userSettings.llm.openrouterKey
    if (!apiKey) {
        throw new Error('OpenRouter API key is required for smart voice edit')
    }

    const client = new OpenRouterClient(apiKey)

    const messages: ChatMessage[] = [
        {
            role: 'user',
            content: buildUserMessage(transcript, noteMarkdown),
            createdAt: new Date().toISOString()
        }
    ]

    const response = await client.createChatCompletion(messages, {
        modelId: SMART_VOICE_EDIT_MODEL,
        system: SYSTEM_PROMPT,
        maxTokens: MAX_TOKENS,
        temperature: 0.1
    })

    const ops = parseEditOps(response.content)

    const noChange = ops.find(op => op.op === 'no_change')
    if (noChange && ops.length === 1) {
        return {
            markdown: noteMarkdown,
            changed: false,
            message: noChange.op === 'no_change' && noChange.reason ? noChange.reason : undefined
        }
    }

    const markdown = applyEditOps(noteMarkdown, ops)
    return {
        markdown,
        changed: markdown !== noteMarkdown
    }
}

/**
 * Check if smart voice edit is available based on user settings
 * @param userSettings - User settings to check
 * @returns true if OpenRouter API key is configured
 */
export function isSmartVoiceEditAvailable(userSettings: UserSettings): boolean {
    return !!userSettings.llm.openrouterKey
}
