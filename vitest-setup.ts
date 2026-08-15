import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// 🚨 Testing Library の自動クリーンアップは、afterEach がグローバルにあるとき
//    （globals: true）にしか自分を登録しない。明示 import の書き方を保ちたいので、
//    掃除役をここで手で登録する。これが無いと前のテストの DOM が残り、
//    getByText が「同じ要素が2つある」と言って落ちる
afterEach(() => {
  cleanup()
})
