import { describe, expect, test } from 'vitest'
import { itemSchema } from '@/lib/schemas/item'

describe('itemSchema', () => {
  test('link は url が無いと通らない', () => {
    const result = itemSchema.safeParse({ title: 'A', type: 'link', visible: true })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['url'])
    }
  })

  test('link は url があれば通る', () => {
    const result = itemSchema.safeParse({
      title: 'A',
      type: 'link',
      url: 'https://example.com',
      visible: true,
    })

    expect(result.success).toBe(true)
  })

  test('note は description が無いと通らない', () => {
    const result = itemSchema.safeParse({ title: 'A', type: 'note', visible: true })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['description'])
    }
  })

  test('note は description があれば通る', () => {
    const result = itemSchema.safeParse({
      title: 'A',
      type: 'note',
      description: 'メモ',
      visible: true,
    })

    expect(result.success).toBe(true)
  })

  // 🚨 これは意図した仕様ではない。feed は RSS / API を叩くので url は必須のはず
  //    （要件定義 L125-130・seed.sql の feed 3行はすべて url を持つ）。
  //    v0.5 では feed は器だけなので、url の必須化は工程12（feed 実装）で行う。
  //    ⭐ このテストは「今こうなっている」の記録であって、「こうあるべき」ではない。
  test('【現状】feed は url が無くても通る（工程12で url を必須にする）', () => {
    const result = itemSchema.safeParse({ title: 'A', type: 'feed', visible: true })

    expect(result.success).toBe(true)
  })

  test('title が空だと通らない', () => {
    const result = itemSchema.safeParse({ title: '', type: 'feed', visible: true })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['title'])
    }
  })

  test('title は60文字なら通る', () => {
    const result = itemSchema.safeParse({
      title: 'a'.repeat(60),
      type: 'feed',
      visible: true,
    })

    expect(result.success).toBe(true)
  })

  test('title は61文字だと通らない', () => {
    const result = itemSchema.safeParse({
      title: 'a'.repeat(61),
      type: 'feed',
      visible: true,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['title'])
    }
  })

  test('description は500文字なら通る', () => {
    const result = itemSchema.safeParse({
      title: 'A',
      type: 'feed',
      description: 'a'.repeat(500),
      visible: true,
    })

    expect(result.success).toBe(true)
  })

  test('description は501文字だと通らない', () => {
    const result = itemSchema.safeParse({
      title: 'A',
      type: 'feed',
      description: 'a'.repeat(501),
      visible: true,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['description'])
    }
  })
})
