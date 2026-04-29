import { webcrypto } from 'node:crypto'

// Setup Web Crypto API for Node.js environment
Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true
})