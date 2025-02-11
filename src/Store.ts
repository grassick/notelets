import type { Card, Board, Chat, ChatId } from "./types"
import { useState, useEffect, useRef, useCallback } from "react"

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
 * Hook to interact with a single document
 * @param store The store instance
 * @param documentId ID of the document to load
 */
export function useDocument<T extends { id: string }>(options : {
    getDocument: (id: string, callback: (document: T | null) => void) => () => void, 
    updateDocument: (document: T) => Promise<void>,
    removeDocument: (id: string) => Promise<void>,
    documentId: string
}) {
    const { getDocument, updateDocument, removeDocument, documentId } = options
    const [document, setDocument] = useState<T | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const mounted = useRef(true)

    useEffect(() => {
        mounted.current = true
        return () => {
            mounted.current = false
        }
    }, [])

    useEffect(() => {
        setLoading(true)
        setError(null)
        const unsubscribe = getDocument(documentId, (updatedDocument) => {
            if (!mounted.current) return
            try {
                setDocument(updatedDocument)
                setLoading(false)
                setError(null)
            } catch (e) {
                setError(e instanceof Error ? e : new Error('Failed to process document update'))
                setLoading(false)
            }
        })
        return () => {
            mounted.current = false
            unsubscribe()
        }
    }, [getDocument, documentId])

    const safeSetState = useCallback((setter: Function) => {
        if (mounted.current) {
            setter()
        }
    }, [])

    return {
        document,
        loading,
        error,
        setDocument: async (newDocument: T) => {
            const previousDocument = document
            safeSetState(() => {
                setError(null)
                setLoading(true)
                setDocument(newDocument) // Optimistic update
            })
            
            try {
                await updateDocument(newDocument)
                safeSetState(() => {
                    setError(null)
                })
            } catch (e) {
                safeSetState(() => {
                    setDocument(previousDocument) // Rollback on failure
                    setError(e instanceof Error ? e : new Error('Failed to update document'))
                })
            } finally {
                safeSetState(() => {
                    setLoading(false)
                })
            }
        },
        removeDocument: async () => {
            const previousDocument = document
            safeSetState(() => {
                setError(null)
                setLoading(true)
                setDocument(null) // Optimistic update
            })
            
            try {
                await removeDocument(documentId)
                safeSetState(() => {
                    setError(null)
                })
            } catch (e) {
                safeSetState(() => {
                    setDocument(previousDocument) // Rollback on failure
                    setError(e instanceof Error ? e : new Error('Failed to remove document'))
                })
            } finally {
                safeSetState(() => {
                    setLoading(false)
                })
            }
        }
    }
}

/**
 * Hook to interact with all documents
 * @param store The store instance
 */
export function useDocuments<T extends { id: string }>(options : {
    getDocuments: (callback: (documents: T[]) => void) => () => void,
    updateDocument: (document: T) => Promise<void>,
    removeDocument: (id: string) => Promise<void>,
}) {
    const { getDocuments, updateDocument, removeDocument } = options
    const [documents, setDocuments] = useState<T[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const mounted = useRef(true)

    useEffect(() => {
        mounted.current = true
        return () => {
            mounted.current = false
        }
    }, [])

    useEffect(() => {
        setLoading(true)
        setError(null)
        const unsubscribe = getDocuments((updatedDocuments) => {
            if (!mounted.current) return
            try {
                setDocuments(updatedDocuments)
                setLoading(false)
                setError(null)
            } catch (e) {
                setError(e instanceof Error ? e : new Error('Failed to process boards update'))
                setLoading(false)
            }
        })
        return () => {
            mounted.current = false
            unsubscribe()
        }
    }, [getDocuments])

    const safeSetState = useCallback((setter: Function) => {
        if (mounted.current) {
            setter()
        }
    }, [])

    return {
        documents,
        loading,
        error,
        setDocument: async (document: T) => {
            const previousDocuments = documents
            safeSetState(() => {
                setError(null)
                setLoading(true)
                // Optimistic update
                setDocuments(prev => {
                    const index = prev.findIndex(d => d.id === document.id)
                    if (index >= 0) {
                        const newDocuments = [...prev]
                        newDocuments[index] = document
                        return newDocuments
                    } else {
                        return [...prev, document]
                    }
                })
            })

            try {
                await updateDocument(document)
                safeSetState(() => {
                    setError(null)
                })
            } catch (e) {
                safeSetState(() => {
                    setDocuments(previousDocuments) // Rollback on failure
                    setError(e instanceof Error ? e : new Error('Failed to update document'))
                })
            } finally {
                safeSetState(() => {
                    setLoading(false)
                })
            }
        },
        removeDocument: async (documentId: string) => {
            const previousDocuments = documents
            safeSetState(() => {
                setError(null)
                setLoading(true)
                setDocuments(prev => prev.filter(d => d.id !== documentId))
            })

            try {
                await removeDocument(documentId)
                safeSetState(() => {
                    setError(null)
                })
            } catch (e) {
                safeSetState(() => {
                    setDocuments(previousDocuments) // Rollback on failure
                    setError(e instanceof Error ? e : new Error('Failed to remove document'))
                })
            } finally {
                safeSetState(() => {
                    setLoading(false)
                })
            }
        }
    }
}



/**
 * Hook to interact with a single board
 * @param store The store instance
 * @param boardId ID of the board to load
 */
export function useBoard(store: Store, boardId: string) {
    const { document, loading, error, setDocument, removeDocument } = useDocument<Board>({
        getDocument: store.getBoard,
        updateDocument: store.setBoard,
        removeDocument: store.removeBoard,
        documentId: boardId
    })
    
    return {
        board: document,
        loading,
        error,
        setBoard: setDocument,
        removeBoard: removeDocument
    }
}

/**
 * Hook to interact with all boards
 * @param store The store instance
 */
export function useBoards(store: Store) {
    const { documents, loading, error, setDocument, removeDocument } = useDocuments<Board>({
        getDocuments: store.getBoards,
        updateDocument: store.setBoard,
        removeDocument: store.removeBoard,
    })

    return {
        boards: documents,
        loading,
        error,
        setBoard: setDocument,
        removeBoard: removeDocument
    }
}

/**
 * Hook to interact with cards belonging to a board
 * @param store The store instance
 * @param boardId ID of the board whose cards to load
 */
export function useCards(store: Store, boardId: string) {
    const getDocuments = useCallback((callback: (documents: Card[]) => void) => {
        return store.getCardsByBoard(boardId, callback)
    }, [boardId, store])

    const { documents, loading, error, setDocument, removeDocument } = useDocuments<Card>({
        getDocuments,
        updateDocument: store.setCard,
        removeDocument: store.removeCard,
    })

    return {
        cards: documents,
        loading,
        error,
        setCard: setDocument,
        removeCard: removeDocument
    }
}
 
/**
 * Hook to interact with a single card
 * @param store The store instance
 * @param cardId ID of the card to load
 */
export function useCard(store: Store, cardId: string) {
    const { document, loading, error, setDocument, removeDocument } = useDocument<Card>({
        getDocument: store.getCard,
        updateDocument: store.setCard,
        removeDocument: store.removeCard,
        documentId: cardId
    })
    
    return {
        card: document,
        loading,
        error,
        setCard: setDocument,
        removeCard: removeDocument
    }
}
    
/**
 * Hook to interact with chats belonging to a board
 * @param store The store instance
 * @param boardId ID of the board whose chats to load
 */
export function useChats(store: Store, boardId: string) {
    const getDocuments = useCallback((callback: (documents: Chat[]) => void) => {
        return store.getChatsByBoard(boardId, callback)
    }, [boardId, store])

    const { documents, loading, error, setDocument, removeDocument } = useDocuments<Chat>({
        getDocuments,
        updateDocument: store.setChat,
        removeDocument: store.removeChat,
    })

    return {
        chats: documents,
        loading,
        error,
        setChat: setDocument,
        removeChat: removeDocument
    }
}

/**
 * Hook to interact with a single chat
 * @param store The store instance
 * @param chatId ID of the chat to load
 */
export function useChat(store: Store, chatId: ChatId) {
    const { document, loading, error, setDocument, removeDocument } = useDocument<Chat>({
        getDocument: store.getChat,
        updateDocument: store.setChat,
        removeDocument: store.removeChat,
        documentId: chatId
    })
    
    return {
        chat: document,
        loading,
        error,
        setChat: setDocument,
        removeChat: removeDocument
    }
}
            