import type { Card, RichTextCard } from '../../types'
import type { EncryptedBlob } from './EncryptedTypes'
import { encrypt } from './crypto'

/**
 * An unlocked note's in-memory state. Never persisted.
 */
export interface UnlockedEntry {
    /** AES-GCM key derived once at unlock, reused to re-encrypt on edit */
    key: CryptoKey
    /** The note's base64 salt (needed to rebuild its `encryption` on save) */
    salt: string
    /** The current decrypted markdown body */
    plaintext: string
}

/**
 * Session-only, module-level store of unlocked note plaintext + keys.
 *
 * This holds decrypted content in memory ONLY. It is never serialized and is
 * dropped on relock, logout, or page reload. Because it is a module singleton,
 * non-React code (e.g. chat context building) can read unlocked plaintext
 * directly without going through React state.
 */
class NoteVault {
    private entries = new Map<string, UnlockedEntry>()
    private listeners = new Set<() => void>()
    private version = 0

    /** Subscribe to lock/unlock transitions (for `useSyncExternalStore`) */
    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener)
        return () => {
            this.listeners.delete(listener)
        }
    }

    /** Monotonic version, bumped on every state transition */
    getVersion = (): number => this.version

    private emit(): void {
        this.version++
        this.listeners.forEach(listener => listener())
    }

    /** Whether the given note is currently unlocked */
    isUnlocked(cardId: string): boolean {
        return this.entries.has(cardId)
    }

    /** The decrypted body of an unlocked note, or undefined if locked */
    getPlaintext(cardId: string): string | undefined {
        return this.entries.get(cardId)?.plaintext
    }

    /** The full unlocked entry, or undefined if locked */
    getEntry(cardId: string): UnlockedEntry | undefined {
        return this.entries.get(cardId)
    }

    /** Registers an unlocked note (unlock/encrypt) */
    set(cardId: string, entry: UnlockedEntry): void {
        this.entries.set(cardId, entry)
        this.emit()
    }

    /**
     * Updates the in-memory plaintext of an already-unlocked note without
     * emitting. The live editor is the source of this value, so no re-render
     * is needed; skipping the emit avoids remounting the editor mid-edit.
     */
    updatePlaintextValue(cardId: string, plaintext: string): void {
        const entry = this.entries.get(cardId)
        if (entry) entry.plaintext = plaintext
    }

    /** Relocks a note, dropping its key and plaintext from memory */
    delete(cardId: string): void {
        if (this.entries.delete(cardId)) this.emit()
    }

    /** Relocks every note (e.g. on logout) */
    clear(): void {
        if (this.entries.size > 0) {
            this.entries.clear()
            this.emit()
        }
    }
}

/** The single, app-wide note vault. */
export const noteVault = new NoteVault()

/**
 * Convenience predicate: whether a card is an encrypted (sensitive) note.
 */
export function isEncryptedNote(card: Card): card is RichTextCard {
    return card.type === 'richtext' && !!card.encryption
}

/**
 * Builds the persisted form of an encrypted note: the plaintext is encrypted
 * into `encryption.blob` and `content.markdown` is always emptied. This is the
 * single seam through which encrypted-note edits are saved — it guarantees no
 * plaintext ever reaches the store.
 */
export async function encryptBodyToCard(
    card: RichTextCard,
    text: string,
    key: CryptoKey,
    salt: string
): Promise<RichTextCard> {
    const blob: EncryptedBlob = await encrypt(text, key)
    return {
        ...card,
        content: { markdown: '' },
        encryption: { salt, blob, v: 1 },
        updatedAt: new Date().toISOString()
    }
}
