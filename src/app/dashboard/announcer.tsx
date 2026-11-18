'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'

// 削除の結果を読み上げる（#51-10）。
// 🚨 削除した行はそのまま DOM から消えるので、ボタンの中にメッセージを出しても一緒に消える。
//    一覧の外側に、常に置いたライブリージョンを1つ持ち、そこへ書く。
// 📌 並び替えも結果が通知されないが、Server Action を form に直に渡している（Client を挟まない）ので、
//    ここでは削除だけに絞った。
const AnnounceContext = createContext<(message: string) => void>(() => {})

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  return (
    <AnnounceContext value={setMessage}>
      {children}
      <p aria-live="polite" className="sr-only">
        {message}
      </p>
    </AnnounceContext>
  )
}

export function useAnnounce() {
  return useContext(AnnounceContext)
}
