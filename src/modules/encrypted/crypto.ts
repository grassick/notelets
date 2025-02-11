import { EncryptedBlob } from './EncryptedTypes'
import type { Board, Card, Chat } from '../../types'

/**
 * Configuration for the encryption system
 */
interface CryptoConfig {
    /** Number of iterations for key derivation */
    iterations: number
    /** Key length in bits */
    keyLength: number
    /** Salt length in bytes */
    saltLength: number
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: CryptoConfig = {
    iterations: 100000,
    keyLength: 256,
    saltLength: 16
}

/**
 * Derives an encryption key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const passwordBuffer = encoder.encode(password)
    
    const importedKey = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    )
    
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: DEFAULT_CONFIG.iterations,
            hash: 'SHA-256'
        },
        importedKey,
        { name: 'AES-GCM', length: DEFAULT_CONFIG.keyLength },
        false,
        ['encrypt', 'decrypt']
    )
}

/**
 * Encrypts data using AES-GCM
 */
export async function encrypt(data: string, password: string): Promise<EncryptedBlob> {
    const encoder = new TextEncoder()
    const salt = crypto.getRandomValues(new Uint8Array(DEFAULT_CONFIG.saltLength))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const key = await deriveKey(password, salt)
    
    const encryptedData = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv
        },
        key,
        encoder.encode(data)
    )
    
    // Combine salt and encrypted data
    const encryptedArray = new Uint8Array(encryptedData)
    const combined = new Uint8Array(salt.length + encryptedArray.length)
    combined.set(salt)
    combined.set(encryptedArray, salt.length)
    
    return {
        ciphertext: btoa(String.fromCharCode(...combined)),
        iv: btoa(String.fromCharCode(...iv))
    }
}

/**
 * Decrypts data using AES-GCM
 */
export async function decrypt(encrypted: EncryptedBlob, password: string): Promise<string> {
    const decoder = new TextDecoder()
    const combined = Uint8Array.from(atob(encrypted.ciphertext), c => c.charCodeAt(0))
    const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0))
    
    // Extract salt and encrypted data
    const salt = combined.slice(0, DEFAULT_CONFIG.saltLength)
    const encryptedData = combined.slice(DEFAULT_CONFIG.saltLength)
    
    const key = await deriveKey(password, salt)
    
    try {
        const decryptedData = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv
            },
            key,
            encryptedData
        )
        
        return decoder.decode(decryptedData)
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(`Decryption failed: ${error.message}`)
        }
        throw new Error('Decryption failed - incorrect password or corrupted data')
    }
}

/**
 * Type for the data portion of a board
 */
type BoardData = Omit<Board, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Type for the data portion of a card
 */
type CardData = Omit<Card, 'id' | 'boardId' | 'createdAt' | 'updatedAt'>

/**
 * Type for the data portion of a chat
 */
type ChatData = Omit<Chat, 'id' | 'boardId' | 'createdAt' | 'updatedAt'>

/**
 * Encrypts a board's data fields
 */
export async function encryptBoardData(data: BoardData, password: string): Promise<EncryptedBlob> {
    return encrypt(JSON.stringify(data), password)
}

/**
 * Decrypts a board's data fields
 */
export async function decryptBoardData(encrypted: EncryptedBlob, password: string): Promise<BoardData> {
    const decrypted = await decrypt(encrypted, password)
    return JSON.parse(decrypted) as BoardData
}

/**
 * Encrypts a card's data fields
 */
export async function encryptCardData(data: CardData, password: string): Promise<EncryptedBlob> {
    return encrypt(JSON.stringify(data), password)
}

/**
 * Decrypts a card's data fields
 */
export async function decryptCardData(encrypted: EncryptedBlob, password: string): Promise<CardData> {
    const decrypted = await decrypt(encrypted, password)
    return JSON.parse(decrypted) as CardData
}

/**
 * Encrypts a chat's data fields
 */
export async function encryptChatData(data: ChatData, password: string): Promise<EncryptedBlob> {
    return encrypt(JSON.stringify(data), password)
}

/**
 * Decrypts a chat's data fields
 */
export async function decryptChatData(encrypted: EncryptedBlob, password: string): Promise<ChatData> {
    const decrypted = await decrypt(encrypted, password)
    return JSON.parse(decrypted) as ChatData
} 