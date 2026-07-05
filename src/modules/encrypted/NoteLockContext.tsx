import React, { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { Card, RichTextCard } from '../../types'
import { useAuth } from '../auth/AuthContext'
import { deriveNoteKey, decrypt, generateMasterSalt, base64FromBytes } from './crypto'
import { noteVault, encryptBodyToCard, isEncryptedNote } from './noteVault'

export { noteVault, isEncryptedNote, encryptBodyToCard } from './noteVault'

interface NoteLockContextValue {
    /** Persists a card through the board's optimistic store updater */
    setCard: (card: Card) => Promise<void>
}

const NoteLockContext = createContext<NoteLockContextValue | null>(null)

/** Props for {@link NoteLockProvider} */
interface NoteLockProviderProps {
    /** The board's `setCard` (from `useCards`), used to persist re-encrypted bodies */
    setCard: (card: Card) => Promise<void>
    /** Child tree that may call {@link useNoteLock} */
    children: React.ReactNode
}

/**
 * Provides note lock/unlock actions to a board subtree. Also relocks all notes
 * when the user logs out (a truthy -> null user transition), while leaving them
 * unlocked in local mode where there is no user.
 */
export function NoteLockProvider({ setCard, children }: NoteLockProviderProps) {
    const { user } = useAuth()
    const prevUser = useRef(user)

    useEffect(() => {
        if (prevUser.current && !user) {
            noteVault.clear()
        }
        prevUser.current = user
    }, [user])

    const value = useMemo(() => ({ setCard }), [setCard])

    return <NoteLockContext.Provider value={value}>{children}</NoteLockContext.Provider>
}

/**
 * The API returned by {@link useNoteLock}.
 */
export interface NoteLockApi {
    /** Whether the card is an encrypted note */
    isEncrypted: (card: Card) => boolean
    /** Whether the note is currently unlocked (plaintext available in memory) */
    isUnlocked: (cardId: string) => boolean
    /** The decrypted body of an unlocked note, or undefined */
    getPlaintext: (cardId: string) => string | undefined
    /** Unlock a note with its password. Rejects on incorrect password. */
    unlock: (card: RichTextCard, password: string) => Promise<void>
    /** Relock a note, dropping its plaintext from memory */
    lock: (cardId: string) => void
    /** Encrypt a plaintext note with a new password and persist ciphertext */
    encryptNote: (card: RichTextCard, password: string) => Promise<void>
    /** Save an edit to an unlocked note: re-encrypt and persist (never plaintext) */
    updatePlaintext: (card: RichTextCard, text: string) => Promise<void>
    /** Permanently remove encryption, writing the plaintext body back to the card */
    removeEncryption: (card: RichTextCard) => Promise<void>
}

/**
 * Hook exposing note lock/unlock actions. Components re-render when any note
 * locks or unlocks. Must be used within a {@link NoteLockProvider}.
 */
export function useNoteLock(): NoteLockApi {
    const ctx = useContext(NoteLockContext)
    if (!ctx) throw new Error('useNoteLock must be used within a NoteLockProvider')
    const { setCard } = ctx

    // Re-render this component on any lock/unlock transition.
    useSyncExternalStore(noteVault.subscribe, noteVault.getVersion, noteVault.getVersion)

    return useMemo<NoteLockApi>(() => ({
        isEncrypted: (card) => isEncryptedNote(card),
        isUnlocked: (cardId) => noteVault.isUnlocked(cardId),
        getPlaintext: (cardId) => noteVault.getPlaintext(cardId),

        unlock: async (card, password) => {
            if (!card.encryption) return
            const key = await deriveNoteKey(card.encryption.salt, password)
            // Throws on wrong password (AES-GCM authentication failure).
            const plaintext = await decrypt(card.encryption.blob, key)
            noteVault.set(card.id, { key, salt: card.encryption.salt, plaintext })
        },

        lock: (cardId) => {
            noteVault.delete(cardId)
        },

        encryptNote: async (card, password) => {
            const plaintext = card.content.markdown
            const salt = base64FromBytes(generateMasterSalt())
            const key = await deriveNoteKey(salt, password)
            await setCard(await encryptBodyToCard(card, plaintext, key, salt))
            noteVault.set(card.id, { key, salt, plaintext })
        },

        updatePlaintext: async (card, text) => {
            const entry = noteVault.getEntry(card.id)
            if (!entry || !card.encryption) return
            noteVault.updatePlaintextValue(card.id, text)
            await setCard(await encryptBodyToCard(card, text, entry.key, entry.salt))
        },

        removeEncryption: async (card) => {
            const entry = noteVault.getEntry(card.id)
            const plaintext = entry?.plaintext ?? ''
            const { encryption, ...rest } = card
            await setCard({
                ...rest,
                content: { markdown: plaintext },
                updatedAt: new Date().toISOString()
            })
            noteVault.delete(card.id)
        }
    }), [setCard])
}
