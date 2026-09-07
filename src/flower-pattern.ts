import type { NormalizedPoint } from './stitch-model'

export interface GuidePattern {
  id: string
  points: readonly NormalizedPoint[]
  /** Design intent, not a second rendering source. */
  frontEdges: readonly (readonly [number, number])[]
  backMotif: 'routing'
  /** Closed route: first segment is BACK for a fresh front-side needle. */
  sequence: readonly number[]
  entry: string
  completion: string
}

/** Frozen after the bounded A–F canonical-renderer design pass. Only this fixed
 * table ships; the offline search and rejected dual-face motifs do not. */
export const FLOWER: GuidePattern = {
  id: 'soft-flower-v1',
  points: [
    { x: .5, y: .5 },
    { x: .52121, y: .35151 }, { x: .59899, y: .30201 },
    { x: .69799, y: .40101 }, { x: .64849, y: .47879 },
    { x: .64849, y: .52121 }, { x: .69799, y: .59899 },
    { x: .59899, y: .69799 }, { x: .52121, y: .64849 },
    { x: .47879, y: .64849 }, { x: .40101, y: .69799 },
    { x: .30201, y: .59899 }, { x: .35151, y: .52121 },
    { x: .35151, y: .47879 }, { x: .30201, y: .40101 },
    { x: .40101, y: .30201 }, { x: .47879, y: .35151 },
  ],
  frontEdges: [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 0],
    [0, 5], [5, 6], [6, 7], [7, 8], [8, 0],
    [0, 9], [9, 10], [10, 11], [11, 12], [12, 0],
    [0, 13], [13, 14], [14, 15], [15, 16], [16, 0],
  ],
  backMotif: 'routing',
  sequence: [2, 3, 4, 0, 5, 0, 12, 13, 14, 13, 0, 12, 11, 10, 11, 10, 9, 0, 1, 2, 1, 0, 9, 8, 0, 16, 15, 14, 15, 16, 0, 8, 7, 6, 7, 6, 5, 0, 4, 3, 2],
  entry: 'Stitch a flower',
  completion: 'Finished. Take a look at the back?',
}
