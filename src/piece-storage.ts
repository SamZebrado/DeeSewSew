import { readEmbroideryPiece, saveEmbroideryPiece, serializeEmbroideryPiece, type EmbroideryPieceV3 } from './embroidery-topology'

/** A damaged or inaccessible source is never replaced by a blank fallback. */
export function createPieceStorage() {
  const initial = readEmbroideryPiece()
  const protectedSource = initial.status === 'invalid' || initial.status === 'unavailable'
  return {
    initial,
    save(piece: EmbroideryPieceV3): boolean {
      return !protectedSource && saveEmbroideryPiece(piece)
    },
    recovery(piece: EmbroideryPieceV3): string {
      return serializeEmbroideryPiece(piece)
    },
  }
}

export function downloadRecovery(contents: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
