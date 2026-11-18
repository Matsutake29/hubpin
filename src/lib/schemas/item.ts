import { z } from 'zod'

export const itemTypeSchema = z.enum(['link', 'note', 'feed'])

export const itemSchema = z
  .object({
    title: z
      .string()
      .min(1, { error: 'タイトルを入力してください' })
      .max(60, { error: 'タイトルは60文字以内で入力してください' }),
    type: itemTypeSchema,
    // 🚨 z.url() 単体にしないこと。フォームは url を入力しない note でも '' を送ってくるので必ず落ちる。
    //    '' を DB の null に変えるのは actions.ts の prepareItem（1箇所だけ）。
    url: z.union([z.url({ error: 'URLの形式で入力してください' }), z.literal('')]).optional(),
    description: z.string().max(500, { error: '説明は500文字以内で入力してください' }).optional(),
    visible: z.boolean(),
  })
  .refine(
    (data) => {
      // 🚨 feed も URL 必須（#53-3）。公開ページは feed カードを url があるときだけ feed として描くので、
      //    URL 無しで保存できると、取得も保存も成功しているのに記事一覧だけ画面から消える。
      if (data.type === 'link' || data.type === 'feed') return !!data.url
      return true
    },
    { error: 'URLを入力してください', path: ['url'] },
  )
  .refine(
    (data) => {
      if (data.type === 'note') return !!data.description
      return true
    },
    { error: '説明を入力してください', path: ['description'] },
  )

export type ItemInput = z.infer<typeof itemSchema>
