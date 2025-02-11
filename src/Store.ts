import type { Card, Board, Chat } from "./types"
import { useState, useEffect, useRef, useCallback } from "react"
import type { UserSettings } from "./types/settings"

export interface Store {
    /**
     * Adds or updates a board in the store
     * @param board The board to upsert
     * @returns Promise that resolves when the board is persisted
     */
    setBoard(board: Board): Promise<void>

    /**
     * Removes a board and all its associated cards from the store
     * @param boardId The ID of the board to remove
     * @returns Promise that resolves when the board is removed
     */
    removeBoard(boardId: string): Promise<void>

    /**
     * Retrieves all boards from the store
     * @param callback Function called with array of boards
     * @returns Function to unsubscribe from updates
     */
    getBoards(callback: (boards: Board[]) => void): () => void

    /**
     * Retrieves a single board by its ID
     * @param boardId The ID of the board to retrieve
     * @param callback Function called with the board or null if not found
     * @returns Function to unsubscribe from updates
     */
    getBoard(boardId: string, callback: (board: Board | null) => void): () => void

    /**
     * Adds or updates a card in the store
     * @param card The card to upsert
     * @returns Promise that resolves when the card is persisted
     */
    setCard(card: Card): Promise<void>

    /**
     * Removes a card from the store
     * @param cardId The ID of the card to remove
     * @returns Promise that resolves when the card is removed
     */
    removeCard(cardId: string): Promise<void>

    /**
     * Retrieves all cards for a board from the store
     * @param boardId The ID of the board whose cards to retrieve
     * @param callback Function called with array of cards
     * @returns Function to unsubscribe from updates
     */
    getCardsByBoard(boardId: string, callback: (cards: Card[]) => void): () => void

    /**
     * Retrieves a single card by its ID
     * @param cardId The ID of the card to retrieve
     * @param callback Function called with the card or null if not found
     * @returns Function to unsubscribe from updates
     */
    getCard(cardId: string, callback: (card: Card | null) => void): () => void

    /**
     * Adds or updates a chat in the store
     * @param chat The chat to upsert
     * @returns Promise that resolves when the chat is persisted
     */
    setChat(chat: Chat): Promise<void>

    /**
     * Removes a chat from the store
     * @param chatId The ID of the chat to remove
     * @returns Promise that resolves when the chat is removed
     */
    removeChat(chatId: string): Promise<void>

    /**
     * Retrieves all chats for a board from the store
     * @param boardId The ID of the board whose chats to retrieve
     * @param callback Function called with array of chats
     * @returns Function to unsubscribe from updates
     */
    getChatsByBoard(boardId: string, callback: (chats: Chat[]) => void): () => void

    /**
     * Retrieves a single chat by its ID
     * @param chatId The ID of the chat to retrieve
     * @param callback Function called with the chat or null if not found
     * @returns Function to unsubscribe from updates
     */
    getChat(chatId: string, callback: (chat: Chat | null) => void): () => void

    /**
     * Retrieves user settings from the store
     * @param callback Function called with the settings or null if not found
     * @returns Function to unsubscribe from updates
     */
    getUserSettings(callback: (settings: UserSettings | null) => void): () => void

    /**
     * Updates user settings in the store
     * @param settings The settings to save
     * @returns Promise that resolves when the settings are persisted
     */
    setUserSettings(settings: UserSettings): Promise<void>
}

/**
 * Hook to interact with a single board
 * @param store The store instance
 * @param boardId ID of the board to load
 */
export function useBoard(store: Store, boardId: string) {
    const [board, setBoard] = useState<Board | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null) // TODO: Expose getBoard errors at store level

    useEffect(() => {
        setBoard(null)
        setLoading(true)
        const unsubscribe = store.getBoard(boardId, (updatedBoard) => {
            setBoard(updatedBoard)
            setLoading(false)
        })
        return unsubscribe
    }, [store, boardId])

    return {
        board,
        loading,
        error,
        setBoard: async (newBoard: Board) => {
            const previousBoard = board
            try {
                setError(null)
                setBoard(newBoard) // Optimistic update
                await store.setBoard(newBoard)
            } catch (e) {
                setBoard(previousBoard)
                setError(e instanceof Error ? e : new Error('Failed to update board'))
            }
        },
        removeBoard: async () => {
            const previousBoard = board
            try {
                setError(null)
                setBoard(null) // Optimistic update
                await store.removeBoard(boardId)
            } catch (e) {
                setBoard(previousBoard)
                setError(e instanceof Error ? e : new Error('Failed to remove board'))
            }
        }
    }
}

/**
 * Hook to interact with all boards
 * @param store The store instance
 */
export function useBoards(store: Store) {
    const [boards, setBoards] = useState<Board[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        setBoards([])
        setLoading(true)
        setError(null)
        const unsubscribe = store.getBoards((updatedBoards) => {
            try {
                setBoards(updatedBoards)
                setLoading(false)
                setError(null)
            } catch (e) {
                setError(e instanceof Error ? e : new Error('Failed to process boards update'))
                setLoading(false)
            }
        })
        return unsubscribe
    }, [store])

    return {
        boards,
        loading,
        error,
        setBoard: async (board: Board) => {
            const previousBoards = boards
            try {
                setError(null)
                setLoading(true)
                // Optimistic update
                setBoards(prev => {
                    const index = prev.findIndex(b => b.id === board.id)
                    if (index >= 0) {
                        const newBoards = [...prev]
                        newBoards[index] = board
                        return newBoards
                    } else {
                        return [...prev, board]
                    }
                })
                await store.setBoard(board)
            } catch (e) {
                setBoards(previousBoards) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to update board'))
            } finally {
                setLoading(false)
            }
        },
        removeBoard: async (boardId: string) => {
            const previousBoards = boards
            try {
                setError(null)
                setLoading(true)
                setBoards(prev => prev.filter(b => b.id !== boardId))
                await store.removeBoard(boardId)
            } catch (e) {
                setBoards(previousBoards) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to remove board'))
            } finally {
                setLoading(false)
            }
        }
    }
}

/**
 * Hook to interact with cards belonging to a board
 * @param store The store instance
 * @param boardId ID of the board whose cards to load
 */
export function useCards(store: Store, boardId: string) {
    const [cards, setCards] = useState<Card[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        setCards([])
        setLoading(true)
        setError(null)
        const unsubscribe = store.getCardsByBoard(boardId, (updatedCards) => {
            try {
                setCards(updatedCards)
                setLoading(false)
                setError(null)
            } catch (e) {
                setError(e instanceof Error ? e : new Error('Failed to process cards update'))
                setLoading(false)
            }
        })
        return unsubscribe
    }, [store, boardId])

    return {
        cards,
        loading,
        error,
        setCard: async (card: Card) => {
            const previousCards = cards
            try {
                setError(null)
                setLoading(true)
                // Optimistic update
                setCards(prev => {
                    const index = prev.findIndex(c => c.id === card.id)
                    if (index >= 0) {
                        const newCards = [...prev]
                        newCards[index] = card
                        return newCards
                    } else {
                        return [...prev, card]
                    }
                })
                await store.setCard(card)
            } catch (e) {
                setCards(previousCards) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to update card'))
            } finally {
                setLoading(false)
            }
        },
        removeCard: async (cardId: string) => {
            const previousCards = cards
            try {
                setError(null)
                setLoading(true)
                setCards(prev => prev.filter(c => c.id !== cardId))
                await store.removeCard(cardId)
            } catch (e) {
                setCards(previousCards) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to remove card'))
            } finally {
                setLoading(false)
            }
        }
    }
}

/**
 * Hook to interact with a single card
 * @param store The store instance
 * @param cardId ID of the card to load
 */
export function useCard(store: Store, cardId: string) {
    const [card, setCard] = useState<Card | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        setCard(null)
        setLoading(true)
        setError(null)
        const unsubscribe = store.getCard(cardId, (updatedCard) => {
            try {
                setCard(updatedCard)
                setLoading(false)
                setError(null)
            } catch (e) {
                setError(e instanceof Error ? e : new Error('Failed to process card update'))
                setLoading(false)
            }
        })
        return unsubscribe
    }, [store, cardId])

    return {
        card,
        loading,
        error,
        setCard: async (updatedCard: Card) => {
            const previousCard = card
            try {
                setError(null)
                setLoading(true)
                setCard(updatedCard) // Optimistic update
                await store.setCard(updatedCard)
            } catch (e) {
                setCard(previousCard) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to update card'))
            } finally {
                setLoading(false)
            }
        },
        removeCard: async (cardId: string) => {
            const previousCard = card
            try {
                setError(null)
                setLoading(true)
                setCard(null)
                await store.removeCard(cardId)
            } catch (e) {
                setCard(previousCard) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to remove card'))
            } finally {
                setLoading(false)
            }
        }
    }
}

/**
 * Hook to interact with chats belonging to a board
 * @param store The store instance
 * @param boardId ID of the board whose chats to load
 */
export function useChats(store: Store, boardId: string) {
    const [chats, setChats] = useState<Chat[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    
    useEffect(() => {
        setChats([])
        setLoading(true)
        setError(null)
        const unsubscribe = store.getChatsByBoard(boardId, (updatedChats) => {
            try {
                setChats(updatedChats)
                setLoading(false)
                setError(null)
            } catch (e) {
                setError(e instanceof Error ? e : new Error('Failed to process chats update'))
                setLoading(false)
            }
        })
        return unsubscribe
    }, [store, boardId])

    return {
        chats,
        loading,
        error,
        setChat: async (chat: Chat) => {
            const previousChats = chats
            try {
                setError(null)
                setLoading(true)
                // Optimistic update
                setChats(prev => {
                    const index = prev.findIndex(c => c.id === chat.id)
                    if (index >= 0) {
                        const newChats = [...prev]
                        newChats[index] = chat
                        return newChats
                    } else {
                        return [...prev, chat]
                    }
                })
                await store.setChat(chat)
            } catch (e) {
                setChats(previousChats) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to update chat'))
            } finally {
                setLoading(false)
            }
        },
        removeChat: async (chatId: string) => {
            const previousChats = chats
            try {
                setError(null)
                setLoading(true)
                setChats(prev => prev.filter(c => c.id !== chatId))
                await store.removeChat(chatId)
            } catch (e) {
                setChats(previousChats) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to remove chat'))
            } finally {
                setLoading(false)
            }
        }
    }
}

/**
 * Hook to interact with a single chat
 * @param store The store instance
 * @param chatId ID of the chat to load
 */
export function useChat(store: Store, chatId: string) {
    const [chat, setChat] = useState<Chat | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        setChat(null)
        setLoading(true)
        setError(null)
        const unsubscribe = store.getChat(chatId, (updatedChat) => {
            try {
                setChat(updatedChat)
                setLoading(false)
                setError(null)
            } catch (e) {
                setError(e instanceof Error ? e : new Error('Failed to process chat update'))
                setLoading(false)
            }
        })
        return unsubscribe
    }, [store, chatId])

    return {
        chat,
        loading,
        error,
        setChat: async (updatedChat: Chat) => {
            const previousChat = chat
            try {
                setError(null)
                setLoading(true)
                setChat(updatedChat) // Optimistic update
                await store.setChat(updatedChat)
            } catch (e) {
                setChat(previousChat) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to update chat'))
            } finally {
                setLoading(false)
            }
        },
        removeChat: async (chatId: string) => {
            const previousChat = chat
            try {
                setError(null)
                setLoading(true)
                setChat(null)
                await store.removeChat(chatId)
            } catch (e) {
                setChat(previousChat) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to remove chat'))
            } finally {
                setLoading(false)
            }
        }
    }
}