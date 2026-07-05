import { describe, it, expect } from 'vitest'
import type { RichTextCard } from '../../types'
import { encryptBodyToCard, noteVault, isEncryptedNote } from './noteVault'
import { deriveNoteKey, decrypt } from './crypto'

function makeCard(markdown: string): RichTextCard {
    return {
        id: 'card-1',
        boardId: 'board-1',
        type: 'richtext',
        title: 'My note',
        content: { markdown },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
    }
}

describe('encryptBodyToCard (persisted-shape invariant)', () => {
    it('never persists plaintext: content.markdown is emptied and the body is only in the blob', async () => {
        const card = makeCard('this is the plaintext body')
        const salt = 'AAAAAAAAAAAAAAAAAAAAAA==' // 16 zero bytes, base64
        const key = await deriveNoteKey(salt, 'pw')

        const persisted = await encryptBodyToCard(card, 'this is the plaintext body', key, salt)

        expect(persisted.content.markdown).toBe('')
        expect(persisted.encryption).toBeDefined()
        expect(persisted.encryption?.salt).toBe(salt)
        expect(persisted.encryption?.v).toBe(1)
        // The serialized card must not contain the plaintext anywhere.
        expect(JSON.stringify(persisted)).not.toContain('plaintext body')
        // ...but the blob decrypts back to the original body.
        expect(await decrypt(persisted.encryption!.blob, key)).toBe('this is the plaintext body')
    })

    it('preserves identity fields and title', async () => {
        const card = makeCard('body')
        const salt = 'AAAAAAAAAAAAAAAAAAAAAA=='
        const key = await deriveNoteKey(salt, 'pw')
        const persisted = await encryptBodyToCard(card, 'body', key, salt)
        expect(persisted.id).toBe('card-1')
        expect(persisted.boardId).toBe('board-1')
        expect(persisted.title).toBe('My note')
        expect(persisted.type).toBe('richtext')
    })
})

describe('noteVault', () => {
    it('tracks unlock/lock state and plaintext in memory', async () => {
        const salt = 'AAAAAAAAAAAAAAAAAAAAAA=='
        const key = await deriveNoteKey(salt, 'pw')
        expect(noteVault.isUnlocked('n1')).toBe(false)

        noteVault.set('n1', { key, salt, plaintext: 'secret' })
        expect(noteVault.isUnlocked('n1')).toBe(true)
        expect(noteVault.getPlaintext('n1')).toBe('secret')

        noteVault.updatePlaintextValue('n1', 'secret v2')
        expect(noteVault.getPlaintext('n1')).toBe('secret v2')

        noteVault.delete('n1')
        expect(noteVault.isUnlocked('n1')).toBe(false)
        expect(noteVault.getPlaintext('n1')).toBeUndefined()
    })

    it('notifies subscribers on lock transitions but not on plaintext-only updates', async () => {
        const salt = 'AAAAAAAAAAAAAAAAAAAAAA=='
        const key = await deriveNoteKey(salt, 'pw')
        let notifications = 0
        const unsub = noteVault.subscribe(() => { notifications++ })

        noteVault.set('n2', { key, salt, plaintext: 'a' })
        noteVault.updatePlaintextValue('n2', 'b') // should NOT emit
        noteVault.delete('n2')

        expect(notifications).toBe(2)
        unsub()
    })

    it('clear() relocks everything', async () => {
        const salt = 'AAAAAAAAAAAAAAAAAAAAAA=='
        const key = await deriveNoteKey(salt, 'pw')
        noteVault.set('a', { key, salt, plaintext: 'x' })
        noteVault.set('b', { key, salt, plaintext: 'y' })
        noteVault.clear()
        expect(noteVault.isUnlocked('a')).toBe(false)
        expect(noteVault.isUnlocked('b')).toBe(false)
    })
})

describe('isEncryptedNote', () => {
    it('is true only for richtext cards with encryption', () => {
        const plain = makeCard('hi')
        expect(isEncryptedNote(plain)).toBe(false)
        const enc: RichTextCard = { ...plain, content: { markdown: '' }, encryption: { salt: 's', blob: { ciphertext: 'c', iv: 'i' }, v: 1 } }
        expect(isEncryptedNote(enc)).toBe(true)
    })
})
