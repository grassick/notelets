import { Store } from '../../Store'
import type { Board, Card, Chat, ChatId } from '../../types'

/**
 * LocalStore implementation that uses IndexedDB for storage
 */
export class LocalStore implements Store {
    private db: IDBDatabase | null = null
    private readonly DB_NAME = 'notelets-local'
    private readonly DB_VERSION = 1
    private listeners: Map<string, Set<Function>> = new Map()

    constructor() {
        this.initDB()
    }

    private initDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

            request.onerror = () => reject(request.error)

            request.onsuccess = () => {
                this.db = request.result
                resolve()
            }

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result
                
                // Create stores if they don't exist
                if (!db.objectStoreNames.contains('boards')) {
                    db.createObjectStore('boards', { keyPath: 'id' })
                }
                if (!db.objectStoreNames.contains('cards')) {
                    db.createObjectStore('cards', { keyPath: 'id' })
                }
                if (!db.objectStoreNames.contains('chats')) {
                    db.createObjectStore('chats', { keyPath: 'id' })
                }
            }
        })
    }

    private async ensureDB(): Promise<IDBDatabase> {
        if (!this.db) {
            await this.initDB()
        }
        if (!this.db) {
            throw new Error('Failed to initialize database')
        }
        return this.db
    }

    private getStore(name: 'boards' | 'cards' | 'chats', mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
        const db = this.db
        if (!db) {
            throw new Error('Database not initialized')
        }
        const transaction = db.transaction(name, mode)
        return transaction.objectStore(name)
    }

    private notifyListeners(key: string, data: any) {
        const listeners = this.listeners.get(key)
        if (listeners) {
            listeners.forEach(listener => listener(data))
        }
    }

    private addListener(key: string, callback: Function): () => void {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set())
        }
        this.listeners.get(key)!.add(callback)
        return () => {
            const listeners = this.listeners.get(key)
            if (listeners) {
                listeners.delete(callback)
                if (listeners.size === 0) {
                    this.listeners.delete(key)
                }
            }
        }
    }

    setBoard = async (board: Board): Promise<void> => {
        await this.ensureDB()
        return new Promise((resolve, reject) => {
            const store = this.getStore('boards', 'readwrite')
            const request = store.put(board)
            request.onerror = () => reject(request.error)
            request.onsuccess = () => {
                this.notifyListeners(`board:${board.id}`, board)
                this.notifyListeners('boards', null) // Trigger boards list refresh
                resolve()
            }
        })
    }

    removeBoard = async (boardId: string): Promise<void> => {
        await this.ensureDB()
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['boards', 'cards', 'chats'], 'readwrite')
            const boardStore = transaction.objectStore('boards')
            const cardStore = transaction.objectStore('cards')
            const chatStore = transaction.objectStore('chats')

            // Delete the board
            const boardRequest = boardStore.delete(boardId)
            boardRequest.onerror = () => reject(boardRequest.error)

            // Delete all cards for this board
            const cardRequest = cardStore.getAll()
            cardRequest.onsuccess = () => {
                const cards = cardRequest.result || []
                cards.forEach(card => {
                    if (card.boardId === boardId) {
                        cardStore.delete(card.id)
                        this.notifyListeners(`card:${card.id}`, null)
                    }
                })
            }

            // Delete all chats for this board
            const chatRequest = chatStore.getAll()
            chatRequest.onsuccess = () => {
                const chats = chatRequest.result || []
                chats.forEach(chat => {
                    if (chat.boardId === boardId) {
                        chatStore.delete(chat.id)
                        this.notifyListeners(`chat:${chat.id}`, null)
                    }
                })
            }

            transaction.oncomplete = () => {
                this.notifyListeners(`board:${boardId}`, null)
                this.notifyListeners('boards', null)
                this.notifyListeners(`cards:${boardId}`, null)
                this.notifyListeners(`chats:${boardId}`, null)
                resolve()
            }

            transaction.onerror = () => reject(transaction.error)
        })
    }

    getBoards = (callback: (boards: Board[]) => void): () => void => {
        const fetchAndNotify = async () => {
            await this.ensureDB()
            const store = this.getStore('boards')
            const request = store.getAll()
            request.onerror = () => console.error('Failed to fetch boards:', request.error)
            request.onsuccess = () => callback(request.result || [])
        }

        fetchAndNotify()
        return this.addListener('boards', fetchAndNotify)
    }

    getBoard = (boardId: string, callback: (board: Board | null) => void): () => void => {
        const fetchAndNotify = async () => {
            await this.ensureDB()
            const store = this.getStore('boards')
            const request = store.get(boardId)
            request.onerror = () => console.error('Failed to fetch board:', request.error)
            request.onsuccess = () => callback(request.result || null)
        }

        fetchAndNotify()
        return this.addListener(`board:${boardId}`, fetchAndNotify)
    }

    setCard = async (card: Card): Promise<void> => {
        await this.ensureDB()
        return new Promise((resolve, reject) => {
            const store = this.getStore('cards', 'readwrite')
            const request = store.put(card)
            request.onerror = () => reject(request.error)
            request.onsuccess = () => {
                this.notifyListeners(`card:${card.id}`, card)
                this.notifyListeners(`cards:${card.boardId}`, null)
                resolve()
            }
        })
    }

    removeCard = async (cardId: string): Promise<void> => {
        await this.ensureDB()
        return new Promise((resolve, reject) => {
            const store = this.getStore('cards', 'readwrite')
            // Get the card first to know its boardId
            const getRequest = store.get(cardId)
            getRequest.onerror = () => reject(getRequest.error)
            getRequest.onsuccess = (event: Event) => {
                const request = event.target as IDBRequest<Card>
                const card = request.result
                const boardId = card?.boardId
                
                const deleteRequest = store.delete(cardId)
                deleteRequest.onerror = () => reject(deleteRequest.error)
                deleteRequest.onsuccess = () => {
                    this.notifyListeners(`card:${cardId}`, null)
                    if (boardId) {
                        this.notifyListeners(`cards:${boardId}`, null)
                    }
                    resolve()
                }
            }
        })
    }

    getCardsByBoard = (boardId: string, callback: (cards: Card[]) => void): () => void => {
        const fetchAndNotify = async () => {
            await this.ensureDB()
            const store = this.getStore('cards')
            const request = store.getAll()
            request.onerror = () => console.error('Failed to fetch cards:', request.error)
            request.onsuccess = () => {
                const cards = (request.result || []).filter(card => card.boardId === boardId)
                callback(cards)
            }
        }

        fetchAndNotify()
        return this.addListener(`cards:${boardId}`, fetchAndNotify)
    }

    getCard = (cardId: string, callback: (card: Card | null) => void): () => void => {
        const fetchAndNotify = async () => {
            await this.ensureDB()
            const store = this.getStore('cards')
            const request = store.get(cardId)
            request.onerror = () => console.error('Failed to fetch card:', request.error)
            request.onsuccess = () => callback(request.result || null)
        }

        fetchAndNotify()
        return this.addListener(`card:${cardId}`, fetchAndNotify)
    }

    setChat = async (chat: Chat): Promise<void> => {
        await this.ensureDB()
        return new Promise((resolve, reject) => {
            const store = this.getStore('chats', 'readwrite')
            const request = store.put(chat)
            request.onerror = () => reject(request.error)
            request.onsuccess = () => {
                this.notifyListeners(`chat:${chat.id}`, chat)
                this.notifyListeners(`chats:${chat.boardId}`, null)
                resolve()
            }
        })
    }

    removeChat = async (chatId: ChatId): Promise<void> => {
        await this.ensureDB()
        return new Promise((resolve, reject) => {
            const store = this.getStore('chats', 'readwrite')
            // Get the chat first to know its boardId
            const getRequest = store.get(chatId)
            getRequest.onerror = () => reject(getRequest.error)
            getRequest.onsuccess = (event: Event) => {
                const request = event.target as IDBRequest<Chat>
                const chat = request.result
                const boardId = chat?.boardId
                
                const deleteRequest = store.delete(chatId)
                deleteRequest.onerror = () => reject(deleteRequest.error)
                deleteRequest.onsuccess = () => {
                    this.notifyListeners(`chat:${chatId}`, null)
                    if (boardId) {
                        this.notifyListeners(`chats:${boardId}`, null)
                    }
                    resolve()
                }
            }
        })
    }

    getChatsByBoard = (boardId: string, callback: (chats: Chat[]) => void): () => void => {
        const fetchAndNotify = async () => {
            await this.ensureDB()
            const store = this.getStore('chats')
            const request = store.getAll()
            request.onerror = () => console.error('Failed to fetch chats:', request.error)
            request.onsuccess = () => {
                const chats = (request.result || []).filter(chat => chat.boardId === boardId)
                callback(chats)
            }
        }

        fetchAndNotify()
        return this.addListener(`chats:${boardId}`, fetchAndNotify)
    }

    getChat = (chatId: ChatId, callback: (chat: Chat | null) => void): () => void => {
        const fetchAndNotify = async () => {
            await this.ensureDB()
            const store = this.getStore('chats')
            const request = store.get(chatId)
            request.onerror = () => console.error('Failed to fetch chat:', request.error)
            request.onsuccess = () => callback(request.result || null)
        }

        fetchAndNotify()
        return this.addListener(`chat:${chatId}`, fetchAndNotify)
    }
} 