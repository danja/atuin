import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'jsdom',
        setupFiles: './vitest.setup.js',
        include: ['test/**/*.spec.js'],
        globals: true
    }
})
