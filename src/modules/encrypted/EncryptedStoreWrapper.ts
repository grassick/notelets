import type { Store } from '../../Store'
import type { Board, Card, Chat, ChatId } from '../../types'
import type { EncryptedStore } from './EncryptedTypes'
import {
    encryptBoardData,
    decryptBoardData,
    encryptCardData,
    decryptCardData,
    encryptChatData,
    decryptChatData
} from './crypto'

/**
 * Wraps an EncryptedStore to provide a standard Store interface
 * Handles encryption/decryption transparently
 */
export class EncryptedStoreWrapper implements Store {
    constructor(
        private encryptedStore: EncryptedStore,
        private password: string
    ) {}

    setBoard = async (board: Board): Promise<void> => {
        const { id, createdAt, updatedAt, ...data } = board
        const encryptedData = await encryptBoardData(data, this.password)
        
        await this.encryptedStore.setBoard({
            id,
            createdAt,
            updatedAt,
            data: encryptedData
        })
    }

    removeBoard = async (boardId: string): Promise<void> => {
        await this.encryptedStore.removeBoard(boardId)
    }

    getBoards = (callback: (boards: Board[]) => void): () => void => {
        return this.encryptedStore.getBoards(async (encryptedBoards) => {
            try {
                const boards = await Promise.all(
                    encryptedBoards.map(async (encryptedBoard) => {
                        const { id, createdAt, updatedAt, data } = encryptedBoard
                        const decryptedData = await decryptBoardData(data, this.password)
                        return {
                            ...decryptedData,
                            id,
                            createdAt,
                            updatedAt
                        }
                    })
                )
                callback(boards)
            } catch (error) {
                console.error('Failed to decrypt boards:', error)
                callback([])
            }
        })
    }

    getBoard = (boardId: string, callback: (board: Board | null) => void): () => void => {
        return this.encryptedStore.getBoard(boardId, async (encryptedBoard) => {
            if (!encryptedBoard) {
                callback(null)
                return
            }

            try {
                const { id, createdAt, updatedAt, data } = encryptedBoard
                const decryptedData = await decryptBoardData(data, this.password)
                callback({
                    ...decryptedData,
                    id,
                    createdAt,
                    updatedAt
                })
            } catch (error) {
                console.error('Failed to decrypt board:', error)
                callback(null)
            }
        })
    }

    setCard = async (card: Card): Promise<void> => {
        const { id, boardId, createdAt, updatedAt, ...data } = card
        const encryptedData = await encryptCardData(data, this.password)
        
        await this.encryptedStore.setCard({
            id,
            boardId,
            createdAt,
            updatedAt,
            data: encryptedData
        })
    }

    removeCard = async (cardId: string): Promise<void> => {
        await this.encryptedStore.removeCard(cardId)
    }

    getCardsByBoard = (boardId: string, callback: (cards: Card[]) => void): () => void => {
        return this.encryptedStore.getCardsByBoard(boardId, async (encryptedCards) => {
            try {
                const cards = await Promise.all(
                    encryptedCards.map(async (encryptedCard) => {
                        try {
                            const { id, boardId, createdAt, updatedAt, data } = encryptedCard
                            const decryptedData = await decryptCardData(data, this.password)
                            return {
                                ...decryptedData,
                                id,
                                boardId,
                                createdAt,
                                updatedAt
                            } as Card
                        } catch (error) {
                            console.error('Failed to decrypt card:', error)
                            return null
                        }
                    })
                )
                callback(cards.filter((card): card is Card => card !== null))
            } catch (error) {
                console.error('Failed to decrypt cards:', error)
                callback([])
            }
        })
    }

    getCard = (cardId: string, callback: (card: Card | null) => void): () => void => {
        return this.encryptedStore.getCard(cardId, async (encryptedCard) => {
            if (!encryptedCard) {
                callback(null)
                return
            }

            try {
                const { id, boardId, createdAt, updatedAt, data } = encryptedCard
                const decryptedData = await decryptCardData(data, this.password)
                callback({
                    ...decryptedData,
                    id,
                    boardId,
                    createdAt,
                    updatedAt
                } as Card)
            } catch (error) {
                console.error('Failed to decrypt card:', error)
                callback(null)
            }
        })
    }

    setChat = async (chat: Chat): Promise<void> => {
        const { id, boardId, createdAt, updatedAt, ...data } = chat
        const encryptedData = await encryptChatData(data, this.password)
        
        await this.encryptedStore.setChat({
            id,
            boardId,
            createdAt,
            updatedAt,
            data: encryptedData
        })
    }

    removeChat = async (chatId: ChatId): Promise<void> => {
        await this.encryptedStore.removeChat(chatId)
    }

    getChatsByBoard = (boardId: string, callback: (chats: Chat[]) => void): () => void => {
        return this.encryptedStore.getChatsByBoard(boardId, async (encryptedChats) => {
            try {
                const chats = await Promise.all(
                    encryptedChats.map(async (encryptedChat) => {
                        const { id, boardId, createdAt, updatedAt, data } = encryptedChat
                        const decryptedData = await decryptChatData(data, this.password)
                        return {
                            ...decryptedData,
                            id,
                            boardId,
                            createdAt,
                            updatedAt
                        }
                    })
                )
                callback(chats)
            } catch (error) {
                console.error('Failed to decrypt chats:', error)
                callback([])
            }
        })
    }

    getChat = (chatId: ChatId, callback: (chat: Chat | null) => void): () => void => {
        return this.encryptedStore.getChat(chatId, async (encryptedChat) => {
            if (!encryptedChat) {
                callback(null)
                return
            }

            try {
                const { id, boardId, createdAt, updatedAt, data } = encryptedChat
                const decryptedData = await decryptChatData(data, this.password)
                callback({
                    ...decryptedData,
                    id,
                    boardId,
                    createdAt,
                    updatedAt
                })
            } catch (error) {
                console.error('Failed to decrypt chat:', error)
                callback(null)
            }
        })
    }
}