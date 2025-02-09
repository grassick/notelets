import type { Card, Board, Chat, ChatId } from "./types"
import { useState, useEffect } from "react"

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
     * Retrieves all cards belonging to a specific board
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
    removeChat(chatId: ChatId): Promise<void>

    /**
     * Retrieves all chats belonging to a specific board
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
    getChat(chatId: ChatId, callback: (chat: Chat | null) => void): () => void
}

/**
 * Hook to interact with a single board
 * @param store The store instance
 * @param boardId ID of the board to load
 */
export function useBoard(store: Store, boardId: string) {
    const [board, setBoard] = useState<Board | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        setLoading(true)
        setError(null)
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
            setError(null)
            setBoard(newBoard) // Optimistic update
            try {
                await store.setBoard(newBoard)
            } catch (e) {
                setBoard(previousBoard) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to update board'))
            }
        },
        removeBoard: async () => {
            const previousBoard = board
            setError(null)
            setBoard(null) // Optimistic update
            try {
                await store.removeBoard(boardId)
            } catch (e) {
                setBoard(previousBoard) // Rollback on failure
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
        setLoading(true)
        setError(null)
        const unsubscribe = store.getBoards((updatedBoards) => {
            setBoards(updatedBoards)
            setLoading(false)
        })
        return unsubscribe
    }, [store])

    return {
        boards,
        loading,
        error,
        setBoard: async (board: Board) => {
            const previousBoards = boards
            setError(null)
            
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

            try {
                await store.setBoard(board)
            } catch (e) {
                setBoards(previousBoards) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to update board'))
            }
        },
        removeBoard: async (boardId: string) => {
            const previousBoards = boards
            setError(null)
            
            // Optimistic update
            setBoards(prev => prev.filter(b => b.id !== boardId))

            try {
                await store.removeBoard(boardId)
            } catch (e) {
                setBoards(previousBoards) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to remove board'))
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
        setLoading(true)
        setError(null)
        const unsubscribe = store.getCardsByBoard(boardId, (updatedCards) => {
            setCards(updatedCards)
            setLoading(false)
        })
        return unsubscribe
    }, [store, boardId])

    return {
        cards,
        loading,
        error,
        setCard: async (card: Card) => {
            const previousCards = cards
            setError(null)
            
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

            try {
                await store.setCard(card)
            } catch (e) {
                setCards(previousCards) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to update card'))
            }
        },
        removeCard: async (cardId: string) => {
            const previousCards = cards
            setError(null)
            
            // Optimistic update
            setCards(prev => prev.filter(c => c.id !== cardId))

            try {
                await store.removeCard(cardId)
            } catch (e) {
                setCards(previousCards) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to remove card'))
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
        setLoading(true)
        setError(null)
        const unsubscribe = store.getCard(cardId, (updatedCard) => {
            setCard(updatedCard)
            setLoading(false)
        })
        return unsubscribe
    }, [store, cardId])

    return {
        card,
        loading,
        error,
        setCard: async (newCard: Card) => {
            const previousCard = card
            setError(null)
            setCard(newCard) // Optimistic update
            try {
                await store.setCard(newCard)
            } catch (e) {
                setCard(previousCard) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to update card'))
            }
        },
        removeCard: async () => {
            const previousCard = card
            setError(null)
            setCard(null) // Optimistic update
            try {
                await store.removeCard(cardId)
            } catch (e) {
                setCard(previousCard) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to remove card'))
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
        setLoading(true)
        setError(null)
        const unsubscribe = store.getChatsByBoard(boardId, (updatedChats) => {
            setChats(updatedChats)
            setLoading(false)
        })
        return unsubscribe
    }, [store, boardId])

    return {
        chats,
        loading,
        error,
        setChat: async (chat: Chat) => {
            const previousChats = chats
            setError(null)
            
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

            try {
                await store.setChat(chat)
            } catch (e) {
                setChats(previousChats) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to update chat'))
            }
        },
        removeChat: async (chatId: ChatId) => {
            const previousChats = chats
            setError(null)
            
            // Optimistic update
            setChats(prev => prev.filter(c => c.id !== chatId))

            try {
                await store.removeChat(chatId)
            } catch (e) {
                setChats(previousChats) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to remove chat'))
            }
        }
    }
}

/**
 * Hook to interact with a single chat
 * @param store The store instance
 * @param chatId ID of the chat to load
 */
export function useChat(store: Store, chatId: ChatId) {
    const [chat, setChat] = useState<Chat | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        setLoading(true)
        setError(null)
        const unsubscribe = store.getChat(chatId, (updatedChat) => {
            setChat(updatedChat)
            setLoading(false)
        })
        return unsubscribe
    }, [store, chatId])

    return {
        chat,
        loading,
        error,
        setChat: async (newChat: Chat) => {
            const previousChat = chat
            setError(null)
            setChat(newChat) // Optimistic update
            try {
                await store.setChat(newChat)
            } catch (e) {
                setChat(previousChat) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to update chat'))
            }
        },
        removeChat: async () => {
            const previousChat = chat
            setError(null)
            setChat(null) // Optimistic update
            try {
                await store.removeChat(chatId)
            } catch (e) {
                setChat(previousChat) // Rollback on failure
                setError(e instanceof Error ? e : new Error('Failed to remove chat'))
            }
        }
    }
}

