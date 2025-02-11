/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        setupFiles: ['src/test/setup.ts'],
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx']
    }
}) 