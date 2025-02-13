import { getAuth } from 'firebase/auth'
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, getDoc, writeBatch, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { EncryptedStore, EncryptedBoard, EncryptedCard, EncryptedChat, EncryptedUserSettings, EncryptedBlob } from './EncryptedTypes'
import { encrypt, decrypt, generateMasterSalt, deriveMasterKey } from './crypto'

// Known text that we'll encrypt to validate the password
const TEST_DATA = 'test-encryption'

/**
 * Implementation of EncryptedStore using Firebase Firestore
 */
export class EncryptedFirestoreStore implements EncryptedStore {
    private masterKey: CryptoKey | null = null

    private getUserId(): string {
        const user = getAuth().currentUser
        if (!user) throw new Error('Not authenticated')
        return user.uid
    }

    private assertKeyAvailable(): void {
        if (!this.masterKey) {
            throw new Error('Encryption key not available. Call validatePassword first.')
        }
    }

    async isInitialized(): Promise<boolean> {
        const userId = this.getUserId()
        const docRef = doc(db, `users/${userId}/settings/encryption`)
        const snapshot = await getDoc(docRef)
        return snapshot.exists()
    }

    async initialize(password: string): Promise<void> {
        if (await this.isInitialized()) {
            throw new Error('Encryption already initialized')
        }

        // Generate a new master salt
        const masterSalt = generateMasterSalt()
        
        // Derive the master key
        this.masterKey = await deriveMasterKey(password, masterSalt)

        // Create test data to validate password later
        const encrypted = await encrypt(TEST_DATA, this.masterKey)
        
        const userId = this.getUserId()
        await setDoc(doc(db, `users/${userId}/settings/encryption`), {
            test: encrypted,
            salt: btoa(String.fromCharCode(...masterSalt)) // Store salt as base64
        })
    }

    async validatePassword(password: string): Promise<boolean> {
        const userId = this.getUserId()
        const docRef = doc(db, `users/${userId}/settings/encryption`)
        const snapshot = await getDoc(docRef)
        
        if (!snapshot.exists()) {
            return false
        }

        try {
            const data = snapshot.data()
            // Convert stored salt from base64 back to Uint8Array
            const masterSalt = Uint8Array.from(atob(data.salt), c => c.charCodeAt(0))
            
            // Derive the master key
            const key = await deriveMasterKey(password, masterSalt)
            
            // Try to decrypt test data
            const decrypted = await decrypt(data.test, key)
            const isValid = decrypted === TEST_DATA
            
            // If valid, store the key
            if (isValid) {
                this.masterKey = key
            }
            
            return isValid
        } catch {
            this.masterKey = null
            return false
        }
    }

    setBoard = async (board: EncryptedBoard): Promise<void> => {
        this.assertKeyAvailable()
        const userId = this.getUserId()
        const { id, ...rest } = board
        await setDoc(doc(db, `users/${userId}/boards/${id}`), rest)
    }

    removeBoard = async (boardId: string): Promise<void> => {
        this.assertKeyAvailable()
        const userId = this.getUserId()
        const batch = writeBatch(db)

        // Delete the board
        batch.delete(doc(db, `users/${userId}/boards/${boardId}`))

        // Get and delete all cards for this board
        const cardsQuery = query(
            collection(db, `users/${userId}/cards`),
            where('boardId', '==', boardId)
        )
        const cardDocs = await getDocs(cardsQuery)
        cardDocs.forEach(doc => {
            batch.delete(doc.ref)
        })

        // Get and delete all chats for this board
        const chatsQuery = query(
            collection(db, `users/${userId}/chats`),
            where('boardId', '==', boardId)
        )
        const chatDocs = await getDocs(chatsQuery)
        chatDocs.forEach(doc => {
            batch.delete(doc.ref)
        })

        // Execute all deletions in a single batch
        await batch.commit()
    }

    getBoards = (callback: (boards: EncryptedBoard[]) => void): () => void => {
        this.assertKeyAvailable()
        const userId = this.getUserId()
        const q = collection(db, `users/${userId}/boards`)
        
        return onSnapshot(q, (snapshot) => {
            const boards = snapshot.docs.map(doc => ({
                id: doc.id,
                createdAt: doc.data().createdAt,
                updatedAt: doc.data().updatedAt,
                data: doc.data().data
            }))
            callback(boards)
        })
    }

    getBoard = (boardId: string, callback: (board: EncryptedBoard | null) => void): () => void => {
        this.assertKeyAvailable()
        const userId = this.getUserId()
        const docRef = doc(db, `users/${userId}/boards/${boardId}`)
        
        return onSnapshot(docRef, (doc) => {
            if (!doc.exists()) {
                callback(null)
                return
            }
            const data = doc.data()
            callback({
                id: doc.id,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                data: data.data
            })
        })
    }

    setCard = async (card: EncryptedCard): Promise<void> => {
        this.assertKeyAvailable()
        const userId = this.getUserId()
        const { id, ...rest } = card
        await setDoc(doc(db, `users/${userId}/cards/${id}`), rest)
    }

    removeCard = async (cardId: string): Promise<void> => {
        this.assertKeyAvailable()
        const userId = this.getUserId()
        await deleteDoc(doc(db, `users/${userId}/cards/${cardId}`))
    }

    getCardsByBoard = (boardId: string, callback: (cards: EncryptedCard[]) => void): () => void => {
        this.assertKeyAvailable()
        const userId = this.getUserId()
        const q = query(
            collection(db, `users/${userId}/cards`),
            where('boardId', '==', boardId)
        )
        
        return onSnapshot(q, (snapshot) => {
            const cards = snapshot.docs.map(doc => ({
                id: doc.id,
                boardId: doc.data().boardId,
                createdAt: doc.data().createdAt,
                updatedAt: doc.data().updatedAt,
                data: doc.data().data
            }))
            callback(cards)
        })
    }

    getCard = (cardId: string, callback: (card: EncryptedCard | null) => void): () => void => {
        this.assertKeyAvailable()
        const userId = this.getUserId()
        const docRef = doc(db, `users/${userId}/cards/${cardId}`)
        
        return onSnapshot(docRef, (doc) => {
            if (!doc.exists()) {
                callback(null)
                return
            }
            const data = doc.data()
            callback({
                id: doc.id,
                boardId: data.boardId,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                data: data.data
            })
        })
    }

    setChat = async (chat: EncryptedChat): Promise<void> => {
        this.assertKeyAvailable()
        const userId = this.getUserId()
        const { id, ...rest } = chat
        await setDoc(doc(db, `users/${userId}/chats/${id}`), rest)
    }

    removeChat = async (chatId: string): Promise<void> => {
        this.assertKeyAvailable()
        const userId = this.getUserId()
        await deleteDoc(doc(db, `users/${userId}/chats/${chatId}`))
    }

    getChatsByBoard = (boardId: string, callback: (chats: EncryptedChat[]) => void): () => void => {
        this.assertKeyAvailable()
        const userId = this.getUserId()
        const q = query(
            collection(db, `users/${userId}/chats`),
            where('boardId', '==', boardId)
        )
        
        return onSnapshot(q, (snapshot) => {
            const chats = snapshot.docs.map(doc => ({
                id: doc.id,
                boardId: doc.data().boardId,
                createdAt: doc.data().createdAt,
                updatedAt: doc.data().updatedAt,
                data: doc.data().data
            }))
            callback(chats)
        })
    }

    getChat = (chatId: string, callback: (chat: EncryptedChat | null) => void): () => void => {
        this.assertKeyAvailable()
        const userId = this.getUserId()
        const docRef = doc(db, `users/${userId}/chats/${chatId}`)
        
        return onSnapshot(docRef, (doc) => {
            callback(doc.exists() ? {
                id: doc.id,
                ...doc.data()
            } as EncryptedChat : null)
        })
    }

    getUserSettings = (callback: (settings: EncryptedUserSettings | null) => void): () => void => {
        this.assertKeyAvailable()
        const userId = this.getUserId()
        const docRef = doc(db, `users/${userId}/settings/user`)
        
        return onSnapshot(docRef, (doc) => {
            callback(doc.exists() ? {
                id: 'user',
                ...doc.data()
            } as EncryptedUserSettings : null)
        })
    }

    setUserSettings = async (settings: EncryptedUserSettings): Promise<void> => {
        this.assertKeyAvailable()
        const userId = this.getUserId()
        const { id, ...rest } = settings
        await setDoc(doc(db, `users/${userId}/settings/user`), rest)
    }
} 