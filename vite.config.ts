import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Native Vite 8 tsconfig paths resolution (replaces vite-tsconfig-paths plugin)
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    exclude: ['@capacitor-community/sqlite', 'sql.js', 'jeep-sqlite'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
