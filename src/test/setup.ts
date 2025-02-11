import { webcrypto } from 'node:crypto'

// Setup Web Crypto API for Node.js environment
// @ts-expect-error - crypto is actually compatible but types don't match exactly
global.crypto = webcrypto 