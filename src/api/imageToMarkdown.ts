import { OpenRouterClient } from './openrouter'
import { UserSettings } from '../types/settings'

/** The model to use for image-to-markdown conversion */
const IMAGE_TO_MARKDOWN_MODEL = 'google/gemini-3-flash-preview'

/** System prompt for extracting markdown from images */
const SYSTEM_PROMPT = `You are a document text extraction assistant. Your task is to extract all text content from the provided image and format it as clean, well-structured markdown.

Guidelines:
- Preserve the document's structure (headings, lists, paragraphs)
- Use appropriate markdown formatting (headers, bullet points, numbered lists, bold, italic)
- Maintain the reading order of the content
- If there are tables, format them as markdown tables
- If there are code snippets, use code blocks with appropriate language tags
- Ignore watermarks, page numbers, and other non-content elements
- If the image contains handwritten text, do your best to transcribe it accurately
- Output ONLY the extracted markdown content, no explanations or commentary`

/** User prompt for the image extraction */
const USER_PROMPT = 'Please extract all text from this image and format it as clean markdown.'

/**
 * Convert an image to markdown text using Gemini 3 Flash via OpenRouter
 * @param imageBase64 - Base64 encoded image data (can include data URL prefix or not)
 * @param userSettings - User settings containing API keys
 * @returns The extracted markdown text
 * @throws Error if OpenRouter API key is not configured or if the API call fails
 */
export async function imageToMarkdown(
    imageBase64: string,
    userSettings: UserSettings
): Promise<string> {
    const apiKey = userSettings.llm.openrouterKey
    if (!apiKey) {
        throw new Error('OpenRouter API key is required for image-to-markdown conversion')
    }

    const client = new OpenRouterClient(apiKey)
    
    const response = await client.createVisionCompletion(
        imageBase64,
        USER_PROMPT,
        {
            modelId: IMAGE_TO_MARKDOWN_MODEL,
            system: SYSTEM_PROMPT,
            maxTokens: 4096,
            temperature: 0.1
        }
    )

    return response.content
}

/**
 * Check if image-to-markdown is available based on user settings
 * @param userSettings - User settings to check
 * @returns true if OpenRouter API key is configured
 */
export function isImageToMarkdownAvailable(userSettings: UserSettings): boolean {
    return !!userSettings.llm.openrouterKey
}
