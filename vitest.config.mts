import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // 🚨 これが無いと `@/` を解決できない。Vitest は tsconfig の paths を自動では
    //    読まない（外して実測したら3ファイルとも Failed to resolve import で落ちた）。
    //    以前は vite-tsconfig-paths プラグインで教えていたが、Vite が同じことを
    //    自分でできるようになったので依存を1つ減らした
    tsconfigPaths: true,
  },
  test: {
    // DOM をテストするので node ではなく jsdom
    environment: 'jsdom',
    setupFiles: ['./vitest-setup.ts'],
    // 🚨 モジュールの先頭で作った vi.fn() は、テストを跨いで呼び出し履歴が残る。
    //    「呼ばれた」を確かめるテストが、前のテストの呼び出しで緑になるのを防ぐ。
    clearMocks: true,
  },
})
