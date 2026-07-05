import { describe, it, expect } from 'vitest'
import {
    encryptNoteBody,
    decryptNoteBody,
    deriveNoteKey,
    base64FromBytes,
    bytesFromBase64
} from './crypto'

describe('per-note body encryption', () => {
    it('round-trips simple markdown', async () => {
        const enc = await encryptNoteBody('# Secret\n\nhello', 'correct horse')
        const out = await decryptNoteBody(enc, 'correct horse')
        expect(out).toBe('# Secret\n\nhello')
    })

    it('round-trips empty, unicode and long bodies', async () => {
        const bodies = ['', '🔒 café — naïve', 'x'.repeat(20000)]
        for (const body of bodies) {
            const enc = await encryptNoteBody(body, 'pw')
            expect(await decryptNoteBody(enc, 'pw')).toBe(body)
        }
    })

    it('rejects an incorrect password', async () => {
        const enc = await encryptNoteBody('top secret', 'right-password')
        await expect(decryptNoteBody(enc, 'wrong-password')).rejects.toThrow()
    })

    it('uses a fresh random salt and IV each time (same text + password)', async () => {
        const a = await encryptNoteBody('same', 'pw')
        const b = await encryptNoteBody('same', 'pw')
        expect(a.salt).not.toBe(b.salt)
        expect(a.blob.iv).not.toBe(b.blob.iv)
        expect(a.blob.ciphertext).not.toBe(b.blob.ciphertext)
    })

    it('produces a 16-byte base64 salt', async () => {
        const { salt } = await encryptNoteBody('x', 'pw')
        expect(bytesFromBase64(salt).length).toBe(16)
    })

    it('deriveNoteKey + the same salt decrypts what encryptNoteBody produced', async () => {
        const enc = await encryptNoteBody('body', 'pw')
        const key = await deriveNoteKey(enc.salt, 'pw')
        // deriveNoteKey with the stored salt yields the same key material,
        // so it can decrypt the blob directly (used on unlock).
        const { decrypt } = await import('./crypto')
        expect(await decrypt(enc.blob, key)).toBe('body')
    })

    it('base64 helpers round-trip bytes', () => {
        const bytes = new Uint8Array([0, 1, 2, 250, 255])
        expect(Array.from(bytesFromBase64(base64FromBytes(bytes)))).toEqual([0, 1, 2, 250, 255])
    })
})
