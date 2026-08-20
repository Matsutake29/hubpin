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

  // 🚨 formState.errors だけを見ない。react-hook-form の errors オプションは
  //    useEffect の中で _setErrors() を呼ぶ実装なので（node_modules の 3578行で確認）、
  //    サーバーが返したエラーが formState に入るのは「1レンダリング後」になる。
  //    そのため送信直後の1回目は何も出ず、2回目でようやく表示されていた（Issue #27）。
  // ⭐ errors オプションは外さない。同じ useEffect が _focusError() も呼んでいて、
  //    エラーのある最初の欄へフォーカスを移すのはこれが担っている。外すと飛ばなくなる。
  // 📌 formState 側は onBlur のクライアント検証を拾う。両方を見て、先に出たほうを表示する。
  const fieldError = (name: keyof ItemInput) =>
    formState.errors[name]?.message ?? state?.errors?.[name]?.message
  const rootError = formState.errors.root?.message ?? state?.errors?.root?.message

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* 🚨 React 19 の <form action={...}> は送信が終わるとフォームをリセットする。
      エラーで戻ってきたときは、Server Action が返した値を useForm の values オプションで書き戻す。
      🚨 成功時は state が変わらず書き戻しが起きないので、action 側で redirect している */}
      {rootError && <p className="form-error">{rootError}</p>}

      {/* 🚨 placeholder はラベルの代わりにならない。入力を始めた瞬間に消えるので、
          「何を入れる欄だったか」を確かめる手段が無くなる。
          id と htmlFor で結ぶと、ラベルを押しても入力欄にフォーカスが移る */}
      <div className="flex flex-col gap-1.5">
        <label className="field-label" htmlFor="title">
          タイトル
        </label>
        <input className="field" id="title" {...register('title')} />
        {fieldError('title') && <p className="form-error">{fieldError('title')}</p>}
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
        {fieldError('url') && <p className="form-error">{fieldError('url')}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="field-label" htmlFor="description">
          説明
        </label>
        <textarea className="field" id="description" rows={4} {...register('description')} />
        {fieldError('description') && <p className="form-error">{fieldError('description')}</p>}
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
