import type { Metadata } from 'next'
import { Zen_Kaku_Gothic_New, JetBrains_Mono } from 'next/font/google'
import './globals.css'

// 見出し・本文（日英とも）。角の立った幾何学的なゴシックで、ピンと格子の直線に揃える
const zenKakuGothicNew = Zen_Kaku_Gothic_New({
  variable: '--f-jp',
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  preload: false,
})

// ラベル・データなど「機械が扱う文字列」だけに使う
const jetBrainsMono = JetBrains_Mono({
  variable: '--f-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Hubpin',
    template: '%s | Hubpin',
  },
  description: '分散した発信を1つに集約するハブサイト',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="ja"
      className={`${zenKakuGothicNew.variable} ${jetBrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="board min-h-full flex flex-col">{children}</body>
    </html>
  )
}
