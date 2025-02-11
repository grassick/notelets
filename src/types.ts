/**
 * Base interface for all card types
 * Contains common properties shared across all cards
 */
interface BaseCard {
    /** Unique identifier for the card */
    id: string
    /** Board that the card belongs to */
    boardId: string
    /** Title of the card */
    title: string
    /** Timestamp when the card was created in ISO 8601 format */
    createdAt: string
    /** Timestamp when the card was last updated in ISO 8601 format */
    updatedAt: string
}

/**
 * Card type for rich text content
 * Supports markdown formatting
 */
export interface RichTextCard extends BaseCard {
    type: 'richtext'
    content: {
        /** Markdown formatted text content */
        markdown: string
    }
}

/**
 * Card type for file attachments
 * Stores file metadata and URL
 */
export interface FileCard extends BaseCard {
    type: 'file'
    content: {
        /** URL to access the file */
        url: string
        /** Original filename */
        filename: string
        /** MIME type of the file */
        mimeType: string
    }
}

/**
 * Card type for images
 * Stores image URL and optional alt text
 */
export interface ImageCard extends BaseCard {
    type: 'image'
    content: {
        /** URL to access the image */
        url: string
        /** Optional alternative text for accessibility */
        alt?: string
    }
}

/** Union type of all possible card types */
export type Card = RichTextCard | FileCard | ImageCard

/**
 * Interface representing a chat message
 */
export interface ChatMessage {
    /** Role of who sent the message */
    role: 'user' | 'assistant'
    /** Content of the message */
    content: string
    /** For assistant messages, which LLM was used */
    llm?: string
    /** Timestamp when the message was created in ISO 8601 format */
    createdAt: string
}

/**
 * Interface representing a chat thread
 */
export interface Chat {
    /** Unique identifier for the chat */
    id: string
    /** Board that the chat belongs to */
    boardId: string
    /** Title of the chat thread */
    title: string
    /** Array of messages in the chat */
    messages: ChatMessage[]
    /** Timestamp when the chat was created in ISO 8601 format */
    createdAt: string
    /** Timestamp when the chat was last updated in ISO 8601 format */
    updatedAt: string
}

/**
 * Interface representing a board
 * Contains board metadata and an array of cards
 */
export interface Board {
    /** Unique identifier for the board */
    id: string
    /** Title of the board */
    title: string
    /** Visual layout type for displaying the board */
    viewType: 'vertical'
    /** Layout configuration that varies by view type */
    layoutConfig: {
        // /** For canvas view: store position/size per card */
        // canvas?: Record<string, {
        //     position: { x: number; y: number }
        //     size: { width: number; height: number }
        // }>
        // /** For vertical/sidebar views: store display order */
        // linear?: string[] // Array of card IDs in display order

        /** Currently selected card */
        currentCardId?: string
    }
    /** Timestamp when the board was created in ISO 8601 format */
    createdAt: string
    /** Timestamp when the board was last updated in ISO 8601 format */
    updatedAt: string
}

/**
 * Interface representing a board tab
 * Contains information about an open board tab
 */
export interface BoardTab {
    /** Unique identifier for the tab */
    id: string
    /** ID of the board being displayed */
    boardId: string
}

/** View mode for the board layout */
export type ViewMode = 'chat' | 'notes' | 'split'
