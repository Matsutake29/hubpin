'use client'
import { updateItem } from '../actions'
import { useActionState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { itemSchema, type ItemInput } from '@/lib/schemas/item'

export function EditItemForm({ id, item }: { id: string; item: ItemInput }) {
  const updateItemWithId = updateItem.bind(null, id)
  const [state, formAction, isPending] = useActionState(updateItemWithId, undefined)
  const { register, formState } = useForm<ItemInput>({
    errors: state?.errors,
    values: (state?.values as ItemInput | undefined) ?? item,
    mode: 'onBlur',
    resolver: zodResolver(itemSchema),
  })

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* 🚨 React 19 の <form action={...}> は送信が終わるとフォームをリセットする。
      エラーで戻ってきたときも消えるので、Server Action が返した値をuseForm の values オプションで書き戻す */}
      <input {...register('title')} placeholder="タイトル" />
      {formState.errors.title && <p>{formState.errors.title.message}</p>}

      <select {...register('type')}>
        <option value="link">link</option>
        <option value="note">note</option>
        <option value="feed">feed</option>
      </select>

      <input {...register('url')} placeholder="https://..." />
      {formState.errors.url && <p>{formState.errors.url.message}</p>}

      <textarea {...register('description')} placeholder="説明" />
      {formState.errors.description && <p>{formState.errors.description.message}</p>}

      <label>
        <input type="checkbox" {...register('visible')} />
        公開する
      </label>

      <button type="submit" disabled={isPending}>保存</button>
    </form>
  )
}