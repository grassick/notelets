import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { db } from '../firebase/config'
import type { EncryptedStore, EncryptedBoard, EncryptedCard, EncryptedChat } from './EncryptedTypes'
import type { ChatId } from '../../types'

/**
 * Implementation of EncryptedStore using Firebase Firestore
 * Handles per-user data isolation and stores encrypted data
 */
export class EncryptedFirestoreStore implements EncryptedStore {
    private getUserId(): string {
        const user = getAuth().currentUser
        if (!user) throw new Error('Not authenticated')
        return user.uid
    }

    async setBoard(board: EncryptedBoard): Promise<void> {
        const userId = this.getUserId()
        await setDoc(doc(db, `encrypted-users/${userId}/boards/${board.id}`), board)
    }

    async removeBoard(boardId: string): Promise<void> {
        const userId = this.getUserId()
        await deleteDoc(doc(db, `encrypted-users/${userId}/boards/${boardId}`))
    }

    getBoards(callback: (boards: EncryptedBoard[]) => void): () => void {
        const userId = this.getUserId()
        const q = collection(db, `encrypted-users/${userId}/boards`)
        
        return onSnapshot(q, (snapshot) => {
            const boards = snapshot.docs.map(doc => doc.data() as EncryptedBoard)
            callback(boards)
        })
    }

    getBoard(boardId: string, callback: (board: EncryptedBoard | null) => void): () => void {
        const userId = this.getUserId()
        const docRef = doc(db, `encrypted-users/${userId}/boards/${boardId}`)
        
        return onSnapshot(docRef, (doc) => {
            callback(doc.exists() ? doc.data() as EncryptedBoard : null)
        })
    }

    async setCard(card: EncryptedCard): Promise<void> {
        const userId = this.getUserId()
        await setDoc(doc(db, `encrypted-users/${userId}/cards/${card.id}`), card)
    }

    async removeCard(cardId: string): Promise<void> {
        const userId = this.getUserId()
        await deleteDoc(doc(db, `encrypted-users/${userId}/cards/${cardId}`))
    }

    getCardsByBoard(boardId: string, callback: (cards: EncryptedCard[]) => void): () => void {
        const userId = this.getUserId()
        const q = query(
            collection(db, `encrypted-users/${userId}/cards`),
            where('boardId', '==', boardId)
        )
        
        return onSnapshot(q, (snapshot) => {
            const cards = snapshot.docs.map(doc => doc.data() as EncryptedCard)
            callback(cards)
        })
    }

    getCard(cardId: string, callback: (card: EncryptedCard | null) => void): () => void {
        const userId = this.getUserId()
        const docRef = doc(db, `encrypted-users/${userId}/cards/${cardId}`)
        
        return onSnapshot(docRef, (doc) => {
            callback(doc.exists() ? doc.data() as EncryptedCard : null)
        })
    }

    async setChat(chat: EncryptedChat): Promise<void> {
        const userId = this.getUserId()
        await setDoc(doc(db, `encrypted-users/${userId}/chats/${chat.id}`), chat)
    }

    async removeChat(chatId: ChatId): Promise<void> {
        const userId = this.getUserId()
        await deleteDoc(doc(db, `encrypted-users/${userId}/chats/${chatId}`))
    }

    getChatsByBoard(boardId: string, callback: (chats: EncryptedChat[]) => void): () => void {
        const userId = this.getUserId()
        const q = query(
            collection(db, `encrypted-users/${userId}/chats`),
            where('boardId', '==', boardId)
        )
        
        return onSnapshot(q, (snapshot) => {
            const chats = snapshot.docs.map(doc => doc.data() as EncryptedChat)
            callback(chats)
        })
    }

    getChat(chatId: ChatId, callback: (chat: EncryptedChat | null) => void): () => void {
        const userId = this.getUserId()
        const docRef = doc(db, `encrypted-users/${userId}/chats/${chatId}`)
        
        return onSnapshot(docRef, (doc) => {
            callback(doc.exists() ? doc.data() as EncryptedChat : null)
        })
    }
} 