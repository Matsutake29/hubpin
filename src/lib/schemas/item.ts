import { z } from 'zod'

export const itemSchema = z
.object({
  title: z.string()
    .min(1, { error: 'タイトルを入力してください' })
    .max(60, { error: 'タイトルは60文字以内で入力してください' }),
  type: z.enum(['link', 'note', 'feed']),
  url: z.string().optional(),
  description: z.string()
    .max(500, { error: '説明は500文字以内で入力してください' })
    .optional(),
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