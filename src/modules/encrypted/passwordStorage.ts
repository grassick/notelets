const STORAGE_KEY = 'notelets-encryption-passwords'

interface StoredEncryptionPassword {
    userId: string
    password: string
    timestamp: string
}

/**
 * Store an encryption password for a user
 */
export function storePassword(userId: string, password: string): void {
    const stored: Record<string, StoredEncryptionPassword> = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '{}'
    )
    
    stored[userId] = {
        userId,
        password,
        timestamp: new Date().toISOString()
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}

/**
 * Get a stored encryption password for a user
 * Returns null if no password is stored
 */
export function getStoredPassword(userId: string): string | null {
    const stored: Record<string, StoredEncryptionPassword> = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '{}'
    )
    
    return stored[userId]?.password || null
}

/**
 * Clear stored password for a user
 */
export function clearStoredPassword(userId: string): void {
    const stored: Record<string, StoredEncryptionPassword> = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '{}'
    )
    
    delete stored[userId]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}

/**
 * Clear all stored passwords
 */
export function clearAllStoredPasswords(): void {
    localStorage.removeItem(STORAGE_KEY)
} 