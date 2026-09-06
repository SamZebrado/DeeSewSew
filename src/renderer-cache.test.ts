import { describe, expect, it } from 'vitest'
import { MAX_RETIRED_CACHE_KEYS, SettledPrefixCache } from './renderer-cache'

interface Item { id: string; value: number }
const keyOf = (item: Item): string => `${item.id}:${item.value}`

describe('SettledPrefixCache', () => {
  it('bounds historical keys under long replacement sessions without weakening redraw safety', () => {
    const cache = new SettledPrefixCache<Item>(keyOf)
    let input: Item[] = []
    for (let i = 0; i < 10000; i++) {
      input = [{ id: String(i), value: i }]; cache.accept(input, cache.plan(input))
    }
    expect((cache as unknown as { retiredKeys: Set<string> }).retiredKeys.size).toBeLessThanOrEqual(MAX_RETIRED_CACHE_KEYS)
    expect(cache.plan(input).action).toBe('reuse')
    expect(cache.plan([...input, { id: 'next', value: 1 }]).action).toBe('rebuild')
  })
  it('builds once, then reuses the same static prefix for dynamic frames', () => {
    const cache = new SettledPrefixCache<Item>(keyOf)
    const input = [{ id: 'a', value: 1 }]
    const initial = cache.plan(input)
    expect(initial).toMatchObject({ action: 'rebuild', reason: 'initial', to: 1 })
    cache.accept(input, initial)

    const frame = cache.plan(input)
    expect(frame).toMatchObject({ action: 'reuse', reason: 'unchanged', from: 1, to: 1 })
    cache.accept(input, frame)
    expect(cache.plan(input).action).toBe('reuse')
  })

  it('keeps a newly committed motion stitch dynamic, then appends it once settled', () => {
    const cache = new SettledPrefixCache<Item>(keyOf)
    const first = [{ id: 'a', value: 1 }]
    const initial = cache.plan(first)
    cache.accept(first, initial)

    const withMotion = [...first, { id: 'b', value: 2 }]
    const dynamic = cache.plan(withMotion, 1)
    expect(dynamic.action).toBe('reuse')
    cache.accept(withMotion, dynamic)
    expect(cache.plan(withMotion, 1).action).toBe('reuse')

    const settled = cache.plan(withMotion, 2)
    expect(settled).toMatchObject({ action: 'append', from: 1, to: 2 })
    cache.accept(withMotion, settled)
    expect(cache.length).toBe(2)
  })

  it('rebuilds for undo and does not misclassify redo as a fresh append', () => {
    const cache = new SettledPrefixCache<Item>(keyOf)
    const a = { id: 'a', value: 1 }
    const b = { id: 'b', value: 2 }
    const both = [a, b]
    const initial = cache.plan(both)
    cache.accept(both, initial)

    const undone = [a]
    const undoPlan = cache.plan(undone)
    expect(undoPlan).toMatchObject({ action: 'rebuild', reason: 'history' })
    cache.accept(undone, undoPlan)

    const redone = [a, b]
    expect(cache.plan(redone)).toMatchObject({ action: 'rebuild', reason: 'history' })
  })

  it('rebuilds on replacement, reorder, and explicit invalidation', () => {
    const cache = new SettledPrefixCache<Item>(keyOf)
    const input = [{ id: 'a', value: 1 }, { id: 'b', value: 2 }]
    const initial = cache.plan(input)
    cache.accept(input, initial)

    expect(cache.plan([{ id: 'a', value: 9 }, input[1]!]).action).toBe('rebuild')
    expect(cache.plan([input[1]!, input[0]!]).action).toBe('rebuild')
    cache.invalidate('lighting')
    expect(cache.plan(input)).toMatchObject({ action: 'rebuild', reason: 'lighting' })
  })

  it('recognizes an equivalent immutable prefix without retaining the input array', () => {
    const cache = new SettledPrefixCache<Item>(keyOf)
    const initialInput = [{ id: 'a', value: 1 }]
    const initial = cache.plan(initialInput)
    cache.accept(initialInput, initial)

    const equivalent = [{ id: 'a', value: 1 }]
    const plan = cache.plan(equivalent)
    expect(plan.action).toBe('reuse')
    cache.accept(equivalent, plan)
    expect(cache.plan(equivalent).action).toBe('reuse')
  })
})
