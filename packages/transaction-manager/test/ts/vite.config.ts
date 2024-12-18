import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Enables global `describe`, `it`, `expect`
    environment: 'node', // Use Node.js environment
    setupFiles: [], // Optional: add setup files if needed
  }
});
