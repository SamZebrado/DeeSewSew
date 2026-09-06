export type SettledCacheAction = 'reuse' | 'append' | 'rebuild'
export const MAX_RETIRED_CACHE_KEYS = 1024

export type SettledCacheInvalidationReason =
  | 'initial'
  | 'resize'
  | 'dpr'
  | 'lighting'
  | 'topology'
  | 'history'
  | 'manual'

export interface SettledCachePlan {
  action: SettledCacheAction
  from: number
  to: number
  reason: SettledCacheInvalidationReason | 'prefix-append' | 'unchanged'
}

/**
 * Tracks the immutable prefix represented by one face's settled canvas.
 *
 * The fast path is O(1) when callers keep the same array (preview/motion
 * frames). A new immutable array is checked only until the cached prefix has
 * been proven equal. Drawing remains the caller's responsibility, and
 * `accept` is deliberately separate so failed draws cannot advance state.
 */
export class SettledPrefixCache<T> {
  private readonly keyOf: (value: T) => string
  private cachedRefs: T[] = []
  private cachedKeys: string[] = []
  private lastInput: readonly T[] | null = null
  private retiredKeys = new Set<string>()
  private historyOverflow = false
  private invalidation: SettledCacheInvalidationReason | null = 'initial'

  constructor(keyOf: (value: T) => string) {
    this.keyOf = keyOf
  }

  get length(): number { return this.cachedRefs.length }

  invalidate(reason: Exclude<SettledCacheInvalidationReason, 'initial'> = 'manual'): void {
    this.invalidation = reason
    this.lastInput = null
  }

  plan(input: readonly T[], settledCount = input.length): SettledCachePlan {
    const to = Math.max(0, Math.min(input.length, Math.trunc(settledCount)))
    const from = this.cachedRefs.length

    if (this.invalidation) return { action: 'rebuild', from: 0, to, reason: this.invalidation }
    if (input === this.lastInput && to === from) return { action: 'reuse', from, to, reason: 'unchanged' }

    if (to < from) return { action: 'rebuild', from: 0, to, reason: 'history' }

    for (let index = 0; index < from; index += 1) {
      const candidate = input[index]
      if (candidate === undefined) return { action: 'rebuild', from: 0, to, reason: 'history' }
      if (candidate !== this.cachedRefs[index] && this.keyOf(candidate) !== this.cachedKeys[index]) {
        return { action: 'rebuild', from: 0, to, reason: 'history' }
      }
    }

    if (to === from) return { action: 'reuse', from, to, reason: 'unchanged' }
    // After a very long edit history, conservatively rebuild on additions instead
    // of retaining every historical geometry key. Unchanged dynamic frames stay O(1).
    if (this.historyOverflow) return { action: 'rebuild', from: 0, to, reason: 'history' }
    for (let index = from; index < to; index += 1) {
      const candidate = input[index]
      if (candidate === undefined || this.retiredKeys.has(this.keyOf(candidate))) {
        return { action: 'rebuild', from: 0, to, reason: 'history' }
      }
    }
    return { action: 'append', from, to, reason: 'prefix-append' }
  }

  accept(input: readonly T[], plan: SettledCachePlan): void {
    if (plan.action === 'rebuild') {
      const nextRefs = input.slice(0, plan.to)
      const nextKeys = nextRefs.map(this.keyOf)
      const activeKeys = new Set(nextKeys)
      for (const key of this.cachedKeys) if (!activeKeys.has(key) && !this.historyOverflow) {
        this.retiredKeys.add(key)
        if (this.retiredKeys.size > MAX_RETIRED_CACHE_KEYS) { this.retiredKeys.clear(); this.historyOverflow = true }
      }
      this.cachedRefs = nextRefs
      this.cachedKeys = nextKeys
      this.invalidation = null
    } else if (plan.action === 'append') {
      for (let index = plan.from; index < plan.to; index += 1) {
        const value = input[index]
        if (value === undefined) break
        this.cachedRefs.push(value)
        this.cachedKeys.push(this.keyOf(value))
      }
    }
    this.lastInput = input
  }
}
