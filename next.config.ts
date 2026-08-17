import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // blog.mt-tk.com（静的サイト）には nosniff があるのに hub には無い、という逆転を直す。
  // 🚨 next.config.ts に書いても Vercel 側の設定と衝突して付かないことがあるので、
  //    デプロイ後に curl -sI で実際に付いていることを確認する（Issue #24）。
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // /login を iframe に埋め込めなくする
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // ブラウザ既定値と同じなので実質お守り。明示しておくと既定値の変更に影響されない
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
