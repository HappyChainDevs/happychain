import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

// shim for bun
declare module 'bun:test' {
    interface Matchers<R = void> extends TestingLibraryMatchers<typeof expect.stringContaining, R> {}
    interface AsymmetricMatchers extends TestingLibraryMatchers {}
}

// shim for vitest
declare global {
    // biome-ignore lint/style/noNamespace: <explanation>
    namespace jest {
        interface Matchers<R = void> extends TestingLibraryMatchers<typeof expect.stringContaining, R> {}
    }
}
