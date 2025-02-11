import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, encryptBoardData, decryptBoardData } from './crypto'
import type { Board } from '../../types'

describe('crypto utilities', () => {
    describe('basic encryption/decryption', () => {
        it('should encrypt and decrypt a string correctly', async () => {
            const password = 'test-password'
            const originalText = 'Hello, World!'
            
            const encrypted = await encrypt(originalText, password)
            expect(encrypted.ciphertext).toBeDefined()
            expect(encrypted.iv).toBeDefined()
            
            const decrypted = await decrypt(encrypted, password)
            expect(decrypted).toBe(originalText)
        })

        it('should fail to decrypt with wrong password', async () => {
            const originalText = 'Hello, World!'
            const encrypted = await encrypt(originalText, 'correct-password')
            
            await expect(decrypt(encrypted, 'wrong-password'))
                .rejects
                .toThrow('Decryption failed')
        })

        it('should handle empty strings', async () => {
            const password = 'test-password'
            const originalText = ''
            
            const encrypted = await encrypt(originalText, password)
            const decrypted = await decrypt(encrypted, password)
            expect(decrypted).toBe(originalText)
        })

        it('should handle long strings', async () => {
            const password = 'test-password'
            const originalText = 'x'.repeat(10000) // 10KB string
            
            const encrypted = await encrypt(originalText, password)
            const decrypted = await decrypt(encrypted, password)
            expect(decrypted).toBe(originalText)
        })
    })

    describe('board data encryption/decryption', () => {
        const sampleBoard: Omit<Board, 'id' | 'createdAt' | 'updatedAt'> = {
            title: 'Test Board',
            viewType: 'canvas',
            layoutConfig: {
                canvas: {
                    'card1': {
                        position: { x: 100, y: 200 },
                        size: { width: 300, height: 200 }
                    }
                }
            }
        }

        it('should encrypt and decrypt board data correctly', async () => {
            const password = 'test-password'
            
            const encrypted = await encryptBoardData(sampleBoard, password)
            expect(encrypted.ciphertext).toBeDefined()
            expect(encrypted.iv).toBeDefined()
            
            const decrypted = await decryptBoardData(encrypted, password)
            expect(decrypted).toEqual(sampleBoard)
        })

        it('should fail to decrypt board data with wrong password', async () => {
            const encrypted = await encryptBoardData(sampleBoard, 'correct-password')
            
            await expect(decryptBoardData(encrypted, 'wrong-password'))
                .rejects
                .toThrow('Decryption failed')
        })

        it('should preserve all board data types after encryption/decryption', async () => {
            const password = 'test-password'
            const encrypted = await encryptBoardData(sampleBoard, password)
            const decrypted = await decryptBoardData(encrypted, password)
            
            // Check specific field types
            expect(typeof decrypted.title).toBe('string')
            expect(typeof decrypted.viewType).toBe('string')
            expect(decrypted.viewType).toBe('canvas')
            expect(typeof decrypted.layoutConfig.canvas?.['card1'].position.x).toBe('number')
        })
    })

    describe('encryption security', () => {
        it('should generate different ciphertexts for same input', async () => {
            const password = 'test-password'
            const text = 'Hello, World!'
            
            const encrypted1 = await encrypt(text, password)
            const encrypted2 = await encrypt(text, password)
            
            // Should have different IVs
            expect(encrypted1.iv).not.toBe(encrypted2.iv)
            // Should have different ciphertexts
            expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext)
            
            // But both should decrypt to the same text
            const decrypted1 = await decrypt(encrypted1, password)
            const decrypted2 = await decrypt(encrypted2, password)
            expect(decrypted1).toBe(decrypted2)
            expect(decrypted1).toBe(text)
        })

        it('should handle special characters in passwords', async () => {
            const password = '!@#$%^&*()_+-=[]{}|;:,.<>?'
            const text = 'Hello, World!'
            
            const encrypted = await encrypt(text, password)
            const decrypted = await decrypt(encrypted, password)
            expect(decrypted).toBe(text)
        })

        it('should handle unicode passwords', async () => {
            const password = '🔑🗝️パスワード'
            const text = 'Hello, World!'
            
            const encrypted = await encrypt(text, password)
            const decrypted = await decrypt(encrypted, password)
            expect(decrypted).toBe(text)
        })
    })
}) 