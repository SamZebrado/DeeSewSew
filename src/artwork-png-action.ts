import { exportArtworkPairPng, exportArtworkPng } from './artwork-png'
import type { Stitch } from './stitch-model'

export type PngExportChoice = 'front' | 'back' | 'pair'

/** Browser download dispatch only; completion on disk cannot be observed here. */
export function downloadArtworkPng(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  let link: HTMLAnchorElement | undefined
  try {
    link = document.createElement('a')
    link.href = url; link.download = filename; link.hidden = true
    document.body.appendChild(link)
    link.click()
  } finally {
    link?.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export function createPngExportAction(options: {
  snapshot: () => { front: readonly Stitch[]; back: readonly Stitch[] }
  busy: (value: boolean) => void
  result: (ok: boolean) => void
}) {
  let pending = false
  return async (choice: PngExportChoice): Promise<void> => {
    if (pending) return
    pending = true
    try {
      options.busy(true)
      const { front, back } = options.snapshot()
      const blob = choice === 'pair' ? await exportArtworkPairPng(front, back)
        : await exportArtworkPng({ side: choice, items: choice === 'front' ? front : back })
      downloadArtworkPng(blob, `deesewsew-${choice}.png`)
      options.result(true)
    } catch { options.result(false) }
    finally { pending = false; options.busy(false) }
  }
}
