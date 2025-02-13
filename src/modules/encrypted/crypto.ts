import type { EncryptedBlob } from './EncryptedTypes'
import type { Board, Card, Chat } from '../../types'
import type { UserSettings } from '../../types/settings'

/**
 * Configuration for the encryption system
 */
interface CryptoConfig {
    /** Number of iterations for key derivation */
    iterations: number
    /** Key length in bits */
    keyLength: number
    /** Master salt length in bytes */
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
 * Derives the master encryption key from a password and salt
 */
export async function deriveMasterKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
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
 * Generates a new random salt for initial setup
 */
export function generateMasterSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(DEFAULT_CONFIG.saltLength))
}

/**
 * Encrypts data using AES-GCM with the provided key
 */
export async function encrypt(data: string, key: CryptoKey): Promise<EncryptedBlob> {
    const encoder = new TextEncoder()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    const encryptedData = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv
        },
        key,
        encoder.encode(data)
    )
    
    return {
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
        iv: btoa(String.fromCharCode(...iv))
    }
}

/**
 * Decrypts data using AES-GCM with the provided key
 */
export async function decrypt(encrypted: EncryptedBlob, key: CryptoKey): Promise<string> {
    const decoder = new TextDecoder()
    const encryptedData = Uint8Array.from(atob(encrypted.ciphertext), c => c.charCodeAt(0))
    const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0))
    
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
export async function encryptBoardData(data: BoardData, key: CryptoKey): Promise<EncryptedBlob> {
    return encrypt(JSON.stringify(data), key)
}

/**
 * Decrypts a board's data fields
 */
export async function decryptBoardData(encrypted: EncryptedBlob, key: CryptoKey): Promise<BoardData> {
    const decrypted = await decrypt(encrypted, key)
    return JSON.parse(decrypted) as BoardData
}

/**
 * Encrypts a card's data fields
 */
export async function encryptCardData(data: CardData, key: CryptoKey): Promise<EncryptedBlob> {
    return encrypt(JSON.stringify(data), key)
}

/**
 * Decrypts a card's data fields
 */
export async function decryptCardData(encrypted: EncryptedBlob, key: CryptoKey): Promise<CardData> {
    const decrypted = await decrypt(encrypted, key)
    return JSON.parse(decrypted) as CardData
}

/**
 * Encrypts a chat's data fields
 */
export async function encryptChatData(data: ChatData, key: CryptoKey): Promise<EncryptedBlob> {
    return encrypt(JSON.stringify(data), key)
}

/**
 * Decrypts a chat's data fields
 */
export async function decryptChatData(encrypted: EncryptedBlob, key: CryptoKey): Promise<ChatData> {
    const decrypted = await decrypt(encrypted, key)
    return JSON.parse(decrypted) as ChatData
}

/**
 * Encrypt user settings data
 */
export async function encryptUserSettings(
    settings: UserSettings,
    key: CryptoKey
): Promise<EncryptedBlob> {
    return encrypt(JSON.stringify(settings), key)
}

/**
 * Decrypt user settings data
 */
export async function decryptUserSettings(
    encrypted: EncryptedBlob,
    key: CryptoKey
): Promise<UserSettings> {
    const decrypted = await decrypt(encrypted, key)
    return JSON.parse(decrypted) as UserSettings
} 