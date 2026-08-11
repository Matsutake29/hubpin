'use client'
import { createItem } from '../actions'
import { useActionState } from 'react'

export function ItemForm() {
  const [state, formAction, isPending] = useActionState(createItem, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* 🚨 React 19 の <form action={...}> は送信が終わるとフォームをリセットする。
          エラーで戻ってきたときも消えるので、Server Action が返した値を defaultValue で書き戻す。
          これが無いと、エラーを直そうとするたびに全部打ち直しになる */}
      <input name="title" placeholder="タイトル" defaultValue={state?.values?.title} />
      {state?.errors?.title && <p>{state.errors.title}</p>}
      <select name="type" defaultValue={state?.values?.type}>
        <option value="link">link</option>
        <option value="note">note</option>
        <option value="feed">feed</option>
      </select>

      <input name="url" placeholder="https://..." defaultValue={state?.values?.url} />
      {state?.errors?.url && <p>{state.errors.url}</p>}
      <textarea name="description" placeholder="説明" defaultValue={state?.values?.description} />
      {state?.errors?.description && <p>{state.errors.description}</p>}
      <label>
        {/* チェックボックスだけ defaultChecked（defaultValue ではない） */}
        <input type="checkbox" name="visible" defaultChecked={state?.values?.visible} />
        公開する
      </label>
      <button type="submit" disabled={isPending}>保存</button>
    </form>
  )
}