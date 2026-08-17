import { z } from 'zod'

export const itemSchema = z
  .object({
    title: z
      .string()
      .min(1, { error: 'タイトルを入力してください' })
      .max(60, { error: 'タイトルは60文字以内で入力してください' }),
    type: z.enum(['link', 'note', 'feed']),
    // 🚨 z.url() 単体にしないこと。actions.ts:43,92 が String(formData.get('url') ?? '')
    //    を渡すので、url を入力しない note / feed では '' が来て必ず落ちる。
    //    parsed.data.url || null（actions.ts:65,109）で '' は DB では null になる。
    url: z.union([z.url({ error: 'URLの形式で入力してください' }), z.literal('')]).optional(),
    description: z.string().max(500, { error: '説明は500文字以内で入力してください' }).optional(),
    visible: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.type === 'link') return !!data.url
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
