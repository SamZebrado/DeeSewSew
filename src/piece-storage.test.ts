import { afterEach, expect, test, vi } from 'vitest'
import { createPieceStorage } from './piece-storage'
import { emptyEmbroideryPiece, serializeEmbroideryPiece } from './embroidery-topology'

afterEach(() => vi.unstubAllGlobals())
for (const raw of ['{broken', '{"schemaVersion":99}', '', 'null', '{"schemaVersion":3}']) {
  test(`protects invalid original bytes: ${raw}`, () => {
    const write = vi.fn()
    vi.stubGlobal('localStorage', { getItem: () => raw, setItem: write })
    const store = createPieceStorage()
    expect(store.initial.status).toBe('invalid')
    expect(store.initial.raw).toBe(raw)
    expect(store.save(emptyEmbroideryPiece())).toBe(false)
    expect(write).not.toHaveBeenCalled()
    expect(JSON.parse(store.recovery(emptyEmbroideryPiece())).schemaVersion).toBe(3)
  })
}
test('missing storage stays usable and cannot claim save', () => {
  vi.stubGlobal('localStorage', undefined)
  const store = createPieceStorage()
  expect(store.initial.status).toBe('unavailable')
  expect(store.save(emptyEmbroideryPiece())).toBe(false)
})
test('successful write is required, failed write retains last good bytes', () => {
  let raw: string | null = null
  let fail = false
  vi.stubGlobal('localStorage', { getItem: () => raw, setItem: (_key: string, value: string) => {
    if (fail) throw new DOMException('Full', 'QuotaExceededError')
    raw = value
  } })
  const store = createPieceStorage()
  expect(store.initial.status).toBe('missing')
  expect(store.save(emptyEmbroideryPiece())).toBe(true)
  expect(raw).toBe(serializeEmbroideryPiece(emptyEmbroideryPiece()))
  const previous = raw
  fail = true
  expect(store.save(emptyEmbroideryPiece())).toBe(false)
  expect(raw).toBe(previous)
})
