/**
 * Represents encrypted data with its initialization vector
 */
export interface EncryptedBlob {
    /** The encrypted data as a base64 string */
    ciphertext: string
    /** The initialization vector used for encryption */
    iv: string
}

/**
 * Encrypted version of a Card
 */
export interface EncryptedCard {
    /** The document ID */
    id: string
    /** The board this card belongs to */
    boardId: string
    /** When the card was created in ISO 8601 format */
    createdAt: string
    /** When the card was last updated in ISO 8601 format */
    updatedAt: string
    /** The encrypted card data */
    data: EncryptedBlob
}

/**
 * Encrypted version of a Chat
 */
export interface EncryptedChat {
    /** The document ID */
    id: string
    /** The board this chat belongs to */
    boardId: string
    /** When the chat was created in ISO 8601 format */
    createdAt: string
    /** When the chat was last updated in ISO 8601 format */
    updatedAt: string
    /** The encrypted chat data */
    data: EncryptedBlob
}

/**
 * Encrypted version of a Board
 */
export interface EncryptedBoard {
    /** The document ID */
    id: string
    /** Timestamp when the board was created in ISO 8601 format */
    createdAt: string
    /** Timestamp when the board was last updated in ISO 8601 format */
    updatedAt: string
    /** The encrypted board data */
    data: EncryptedBlob
}

/**
 * Encrypted version of a Document
 */
export interface EncryptedDocument {
    /** The document ID */
    id: string
    /** The encrypted data */
    data: EncryptedBlob
}

/**
 * Encrypted version of a User Settings
 */
export interface EncryptedUserSettings {
    /** The settings ID (always 'user') */
    id: 'user'
    /** The encrypted settings data */
    data: EncryptedBlob
}

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
     * Removes a card
     */
    removeCard(cardId: string): Promise<void>

    /**
     * Retrieves all encrypted cards for a board
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
     * Removes a chat
     */
    removeChat(chatId: string): Promise<void>

    /**
     * Retrieves all encrypted chats for a board
     */
    getChatsByBoard(boardId: string, callback: (chats: EncryptedChat[]) => void): () => void

    /**
     * Retrieves a single encrypted chat by its ID
     */
    getChat(chatId: string, callback: (chat: EncryptedChat | null) => void): () => void

    /**
     * Retrieves encrypted user settings
     */
    getUserSettings(callback: (settings: EncryptedUserSettings | null) => void): () => void

    /**
     * Updates encrypted user settings
     */
    setUserSettings(settings: EncryptedUserSettings): Promise<void>
} 