import { PIECE_STORAGE_KEY } from './stitch-model'
import { emptyThreadRuns, type ThreadRunState } from './thread-runs'
import { parseThreadArtwork, serializeThreadArtwork } from './thread-run-storage'

export function createThreadPieceStorage() {
  let raw: string | null = null, state = emptyThreadRuns()
  let status: 'loaded' | 'missing' | 'invalid' | 'unavailable' = 'missing'
  try {
    raw = localStorage.getItem(PIECE_STORAGE_KEY)
    if (raw !== null) {
      try { state = parseThreadArtwork(raw); status = 'loaded' }
      catch { status = 'invalid' }
    }
  } catch { status = 'unavailable' }
  const protectedSource = status === 'invalid' || status === 'unavailable'
  return {
    initial: { state, piece: state.topology, status, raw },
    save(value: ThreadRunState, validatedRaw?: string): boolean {
      if (protectedSource) return false
      try { localStorage.setItem(PIECE_STORAGE_KEY, validatedRaw ?? serializeThreadArtwork(value)); return true }
      catch { return false }
    },
    recovery: serializeThreadArtwork,
  }
}
