'use client'
import { useActionState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { itemSchema, type ItemInput } from '@/lib/schemas/item'
import type { ItemState } from './actions'

export function ItemForm({
  action,
  defaultItem,
}: {
  action: (prevState: ItemState, formData: FormData) => Promise<ItemState>
  defaultItem?: ItemInput
}) {
  const [state, formAction, isPending] = useActionState(action, undefined)
  const { register, formState } = useForm<ItemInput>({
    errors: state?.errors,
    values: (state?.values as ItemInput | undefined) ?? defaultItem,
    mode: 'onBlur',
    resolver: zodResolver(itemSchema),
  })

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* 🚨 React 19 の <form action={...}> は送信が終わるとフォームをリセットする。
      エラーで戻ってきたときは、Server Action が返した値を useForm の values オプションで書き戻す。
      🚨 成功時は state が変わらず書き戻しが起きないので、action 側で redirect している */}
      {formState.errors.root && <p className="form-error">{formState.errors.root.message}</p>}

      {/* 🚨 placeholder はラベルの代わりにならない。入力を始めた瞬間に消えるので、
          「何を入れる欄だったか」を確かめる手段が無くなる。
          id と htmlFor で結ぶと、ラベルを押しても入力欄にフォーカスが移る */}
      <div className="flex flex-col gap-1.5">
        <label className="field-label" htmlFor="title">
          タイトル
        </label>
        <input className="field" id="title" {...register('title')} />
        {formState.errors.title && <p className="form-error">{formState.errors.title.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="field-label" htmlFor="type">
          種類
        </label>
        {/* 🚨 select だけは枠が無くても見えていた（ブラウザ既定の appearance が残るため）。
            .field を当てないと、ここだけ他の入力欄と形が揃わない */}
        <select className="field" id="type" {...register('type')}>
          <option value="link">link</option>
          <option value="note">note</option>
          <option value="feed">feed</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="field-label" htmlFor="url">
          URL
        </label>
        {/* placeholder は「例」なので残す。ラベルと重複する説明にはしない */}
        <input className="field" id="url" {...register('url')} placeholder="https://..." />
        {formState.errors.url && <p className="form-error">{formState.errors.url.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="field-label" htmlFor="description">
          説明
        </label>
        <textarea className="field" id="description" rows={4} {...register('description')} />
        {formState.errors.description && (
          <p className="form-error">{formState.errors.description.message}</p>
        )}
      </div>

      {/* こちらは <label> で囲む暗黙の結び付け。チェックボックスは文とひと続きで読むので、
          htmlFor で切り離すより囲むほうが読み上げの順序が自然になる */}
      <label className="flex w-fit items-center gap-2 text-sm">
        <input type="checkbox" {...register('visible')} />
        公開する
      </label>

      <button className="btn-primary w-fit" type="submit" disabled={isPending}>
        保存
      </button>
    </form>
  )
}
