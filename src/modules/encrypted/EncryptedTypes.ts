/**
 * Represents encrypted data with its initialization vector
 */
export interface EncryptedBlob {
    /** The encrypted data as a base64 string */
    ciphertext: string
    /** The initialization vector used for encryption as a base64 string */
    iv: string
}

/**
 * Encrypted version of a Card
 */
export interface EncryptedCard {
    /** Unique identifier for the card */
    id: CardId
    /** Board that the card belongs to */
    boardId: BoardId
    /** Timestamp when the card was created in ISO 8601 format */
    createdAt: string
    /** Timestamp when the card was last updated in ISO 8601 format */
    updatedAt: string
    /** The encrypted card data (type, title, content, etc.) */
    data: EncryptedBlob
}

/**
 * Encrypted version of a Chat
 */
export interface EncryptedChat {
    /** Unique identifier for the chat */
    id: ChatId
    /** Board that the chat belongs to */
    boardId: BoardId
    /** Timestamp when the chat was created in ISO 8601 format */
    createdAt: string
    /** Timestamp when the chat was last updated in ISO 8601 format */
    updatedAt: string
    /** The encrypted chat data (title, messages, etc.) */
    data: EncryptedBlob
}

/**
 * Encrypted version of a Board
 */
export interface EncryptedBoard {
    /** Unique identifier for the board */
    id: BoardId
    /** Timestamp when the board was created in ISO 8601 format */
    createdAt: string
    /** Timestamp when the board was last updated in ISO 8601 format */
    updatedAt: string
    /** The encrypted board data (title, viewType, layoutConfig, etc.) */
    data: EncryptedBlob
}

import type { BoardId, CardId, ChatId } from '../../types'

/**
 * Interface for a store that handles encrypted data
 */
export interface EncryptedStore {
    /**
     * Check if the store has been initialized with encryption
     * Returns true if any encrypted data exists for this user
     */
    isInitialized(): Promise<boolean>

    /**
     * Set up encryption for the first time with a password
     * Should fail if already initialized
     * @throws Error if already initialized
     */
    initialize(password: string): Promise<void>

    /**
     * Test if a password can decrypt the store's data
     * Returns true if password is correct
     */
    validatePassword(password: string): Promise<boolean>

    /**
     * Adds or updates an encrypted board
     */
    setBoard(board: EncryptedBoard): Promise<void>

    /**
     * Removes a board and all its associated cards
     */
    removeBoard(boardId: string): Promise<void>

    /**
     * Retrieves all encrypted boards
     */
    getBoards(callback: (boards: EncryptedBoard[]) => void): () => void

    /**
     * Retrieves a single encrypted board by its ID
     */
    getBoard(boardId: string, callback: (board: EncryptedBoard | null) => void): () => void

    /**
     * Adds or updates an encrypted card
     */
    setCard(card: EncryptedCard): Promise<void>

    /**
     * Removes an encrypted card
     */
    removeCard(cardId: string): Promise<void>

    /**
     * Retrieves all encrypted cards belonging to a board
     */
    getCardsByBoard(boardId: string, callback: (cards: EncryptedCard[]) => void): () => void

    /**
     * Retrieves a single encrypted card by its ID
     */
    getCard(cardId: string, callback: (card: EncryptedCard | null) => void): () => void

    /**
     * Adds or updates an encrypted chat
     */
    setChat(chat: EncryptedChat): Promise<void>

    /**
     * Removes an encrypted chat
     */
    removeChat(chatId: ChatId): Promise<void>

    /**
     * Retrieves all encrypted chats belonging to a board
     */
    getChatsByBoard(boardId: string, callback: (chats: EncryptedChat[]) => void): () => void

    /**
     * Retrieves a single encrypted chat by its ID
     */
    getChat(chatId: ChatId, callback: (chat: EncryptedChat | null) => void): () => void
} 