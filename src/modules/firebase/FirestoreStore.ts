import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
} from 'firebase/firestore'
import type { Store } from '../../Store'
import type { Board, Card, Chat, ChatId } from '../../types'
import { db } from './config'
import { getAuth } from 'firebase/auth'

/**
 * Implementation of Store interface using Firebase Firestore
 * Handles per-user data isolation
 */
export class FirestoreStore implements Store {
    private getUserId(): string {
        const user = getAuth().currentUser
        if (!user) throw new Error('Not authenticated')
        return user.uid
    }

    async setBoard(board: Board): Promise<void> {
        const userId = this.getUserId()
        await setDoc(doc(db, `users/${userId}/boards/${board.id}`), board)
    }

    async removeBoard(boardId: string): Promise<void> {
        const userId = this.getUserId()
        await deleteDoc(doc(db, `users/${userId}/boards/${boardId}`))
    }

    getBoards(callback: (boards: Board[]) => void): () => void {
        const userId = this.getUserId()
        const q = collection(db, `users/${userId}/boards`)
        
        return onSnapshot(q, (snapshot) => {
            const boards = snapshot.docs.map(doc => doc.data() as Board)
            callback(boards)
        })
    }

    getBoard(boardId: string, callback: (board: Board | null) => void): () => void {
        const userId = this.getUserId()
        const docRef = doc(db, `users/${userId}/boards/${boardId}`)
        
        return onSnapshot(docRef, (doc) => {
            callback(doc.exists() ? doc.data() as Board : null)
        })
    }

    async setCard(card: Card): Promise<void> {
        const userId = this.getUserId()
        await setDoc(doc(db, `users/${userId}/cards/${card.id}`), card)
    }

    async removeCard(cardId: string): Promise<void> {
        const userId = this.getUserId()
        await deleteDoc(doc(db, `users/${userId}/cards/${cardId}`))
    }

    getCardsByBoard(boardId: string, callback: (cards: Card[]) => void): () => void {
        const userId = this.getUserId()
        const q = query(
            collection(db, `users/${userId}/cards`),
            where('boardId', '==', boardId)
        )
        
        return onSnapshot(q, (snapshot) => {
            const cards = snapshot.docs.map(doc => doc.data() as Card)
            callback(cards)
        })
    }

    getCard(cardId: string, callback: (card: Card | null) => void): () => void {
        const userId = this.getUserId()
        const docRef = doc(db, `users/${userId}/cards/${cardId}`)
        
        return onSnapshot(docRef, (doc) => {
            callback(doc.exists() ? doc.data() as Card : null)
        })
    }

    async setChat(chat: Chat): Promise<void> {
        const userId = this.getUserId()
        await setDoc(doc(db, `users/${userId}/chats/${chat.id}`), chat)
    }

    async removeChat(chatId: ChatId): Promise<void> {
        const userId = this.getUserId()
        await deleteDoc(doc(db, `users/${userId}/chats/${chatId}`))
    }

    getChatsByBoard(boardId: string, callback: (chats: Chat[]) => void): () => void {
        const userId = this.getUserId()
        const q = query(
            collection(db, `users/${userId}/chats`),
            where('boardId', '==', boardId)
        )
        
        return onSnapshot(q, (snapshot) => {
            const chats = snapshot.docs.map(doc => doc.data() as Chat)
            callback(chats)
        })
    }

    getChat(chatId: ChatId, callback: (chat: Chat | null) => void): () => void {
        const userId = this.getUserId()
        const docRef = doc(db, `users/${userId}/chats/${chatId}`)
        
        return onSnapshot(docRef, (doc) => {
            callback(doc.exists() ? doc.data() as Chat : null)
        })
    }
} 