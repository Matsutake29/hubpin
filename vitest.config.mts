import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  // 🚨 tsconfigPaths が無いと `@/` を解決できない。Vitest は tsconfig の
  //    paths を自動では読まないので、プラグインで教える必要がある
  plugins: [tsconfigPaths(), react()],
  test: {
    // DOM をテストするので node ではなく jsdom
    environment: 'jsdom',
    setupFiles: ['./vitest-setup.ts'],
  },
})
