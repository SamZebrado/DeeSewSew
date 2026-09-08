import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createPngExportAction, downloadArtworkPng } from './artwork-png-action'

const encoders = vi.hoisted(() => ({ single: vi.fn(), pair: vi.fn() }))
vi.mock('./artwork-png', () => ({ exportArtworkPng: encoders.single, exportArtworkPairPng: encoders.pair }))
let link: { click: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }
const revoke = vi.fn()
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers()
  link = { click: vi.fn(), remove: vi.fn() }
  vi.stubGlobal('document', { createElement: () => link, body: { appendChild: vi.fn() } })
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:owned-png', revokeObjectURL: revoke })
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

it('guards concurrent allocation, snapshots once, dispatches and clears busy state', async () => {
  let finish: (blob: Blob) => void = () => undefined
  encoders.single.mockReturnValueOnce(new Promise<Blob>(resolve => { finish = resolve }))
  const snapshot = vi.fn(() => ({ front: [], back: [] })), busy = vi.fn(), result = vi.fn()
  const action = createPngExportAction({ snapshot, busy, result })
  const pending = action('front'); await action('back')
  expect(snapshot).toHaveBeenCalledTimes(1); expect(encoders.single).toHaveBeenCalledTimes(1)
  finish(new Blob(['png'], { type: 'image/png' })); await pending
  expect(busy.mock.calls).toEqual([[true], [false]])
  expect(result).toHaveBeenCalledWith(true); expect(link.remove).toHaveBeenCalledTimes(1)
  expect(revoke).not.toHaveBeenCalled(); vi.runAllTimers(); expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:owned-png')
})
it('pair path uses captured faces and failures unlock retry', async () => {
  encoders.pair.mockRejectedValueOnce(new Error('encode failed'))
  encoders.pair.mockResolvedValueOnce(new Blob(['png'], { type: 'image/png' }))
  const snapshot = vi.fn(() => ({ front: [], back: [] })), busy = vi.fn(), result = vi.fn()
  const action = createPngExportAction({ snapshot, busy, result })
  await action('pair'); await action('pair')
  expect(encoders.pair).toHaveBeenCalledTimes(2); expect(result.mock.calls).toEqual([[false], [true]])
  expect(busy.mock.calls).toEqual([[true], [false], [true], [false]])
})
it('download click failures still remove link and revoke URL', () => {
  link.click.mockImplementationOnce(() => { throw new Error('download unavailable') })
  expect(() => downloadArtworkPng(new Blob(['png']), 'local.png')).toThrow()
  expect(link.remove).toHaveBeenCalledTimes(1); vi.runAllTimers(); expect(revoke).toHaveBeenCalledTimes(1)
})
