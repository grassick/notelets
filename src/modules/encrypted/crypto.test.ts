import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, encryptBoardData, decryptBoardData, deriveMasterKey } from './crypto'
import type { Board } from '../../types'

/** A fixed salt so "wrong password" derives a different key under the same salt. */
const SALT = new Uint8Array(16)

/** Derives an AES-GCM key from a password (helper for these tests). */
function keyFor(password: string): Promise<CryptoKey> {
    return deriveMasterKey(password, SALT)
}

describe('crypto utilities', () => {
    describe('basic encryption/decryption', () => {
        it('should encrypt and decrypt a string correctly', async () => {
            const key = await keyFor('test-password')
            const originalText = 'Hello, World!'

            const encrypted = await encrypt(originalText, key)
            expect(encrypted.ciphertext).toBeDefined()
            expect(encrypted.iv).toBeDefined()

            const decrypted = await decrypt(encrypted, key)
            expect(decrypted).toBe(originalText)
        })

        it('should fail to decrypt with wrong password', async () => {
            const originalText = 'Hello, World!'
            const encrypted = await encrypt(originalText, await keyFor('correct-password'))

            await expect(decrypt(encrypted, await keyFor('wrong-password')))
                .rejects
                .toThrow('Decryption failed')
        })

        it('should handle empty strings', async () => {
            const key = await keyFor('test-password')
            const originalText = ''

            const encrypted = await encrypt(originalText, key)
            const decrypted = await decrypt(encrypted, key)
            expect(decrypted).toBe(originalText)
        })

        it('should handle long strings', async () => {
            const key = await keyFor('test-password')
            const originalText = 'x'.repeat(10000) // 10KB string

            const encrypted = await encrypt(originalText, key)
            const decrypted = await decrypt(encrypted, key)
            expect(decrypted).toBe(originalText)
        })
    })

    describe('board data encryption/decryption', () => {
        const sampleBoard: Omit<Board, 'id' | 'createdAt' | 'updatedAt'> = {
            title: 'Test Board',
            viewType: 'vertical',
            layoutConfig: {}
        }

        it('should encrypt and decrypt board data correctly', async () => {
            const key = await keyFor('test-password')

            const encrypted = await encryptBoardData(sampleBoard, key)
            expect(encrypted.ciphertext).toBeDefined()
            expect(encrypted.iv).toBeDefined()

            const decrypted = await decryptBoardData(encrypted, key)
            expect(decrypted).toEqual(sampleBoard)
        })

        it('should fail to decrypt board data with wrong password', async () => {
            const encrypted = await encryptBoardData(sampleBoard, await keyFor('correct-password'))

            await expect(decryptBoardData(encrypted, await keyFor('wrong-password')))
                .rejects
                .toThrow('Decryption failed')
        })

        it('should preserve all board data types after encryption/decryption', async () => {
            const key = await keyFor('test-password')
            const encrypted = await encryptBoardData(sampleBoard, key)
            const decrypted = await decryptBoardData(encrypted, key)

            // Check specific field types
            expect(typeof decrypted.title).toBe('string')
            expect(typeof decrypted.viewType).toBe('string')
            expect(decrypted.viewType).toBe('vertical')
        })
    })

    describe('encryption security', () => {
        it('should generate different ciphertexts for same input', async () => {
            const key = await keyFor('test-password')
            const text = 'Hello, World!'

            const encrypted1 = await encrypt(text, key)
            const encrypted2 = await encrypt(text, key)

            // Should have different IVs
            expect(encrypted1.iv).not.toBe(encrypted2.iv)
            // Should have different ciphertexts
            expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext)

            // But both should decrypt to the same text
            const decrypted1 = await decrypt(encrypted1, key)
            const decrypted2 = await decrypt(encrypted2, key)
            expect(decrypted1).toBe(decrypted2)
            expect(decrypted1).toBe(text)
        })

        it('should handle special characters in passwords', async () => {
            const key = await keyFor('!@#$%^&*()_+-=[]{}|;:,.<>?')
            const text = 'Hello, World!'

            const encrypted = await encrypt(text, key)
            const decrypted = await decrypt(encrypted, key)
            expect(decrypted).toBe(text)
        })

        it('should handle unicode passwords', async () => {
            const key = await keyFor('🔑🗝️パスワード')
            const text = 'Hello, World!'

            const encrypted = await encrypt(text, key)
            const decrypted = await decrypt(encrypted, key)
            expect(decrypted).toBe(text)
        })

        it('derives distinct keys for distinct passwords under the same salt', async () => {
            // Sanity check backing the wrong-password tests above.
            const text = 'secret'
            const encrypted = await encrypt(text, await keyFor('password-a'))
            await expect(decrypt(encrypted, await keyFor('password-b'))).rejects.toThrow()
        })
    })
})
