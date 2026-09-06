import type { EmbroideryPieceV3, SurfaceSide } from './embroidery-topology'
import type { NormalizedPoint } from './stitch-model'
export interface GuidePattern { id: 'leaf'; targets: readonly NormalizedPoint[] }
/** Original alternating centre/edge path: no synthetic first surface stitch. */
export const LEAF: GuidePattern = { id: 'leaf', targets: [
  { x: .5, y: .76 }, { x: .5, y: .69 }, { x: .35, y: .65 }, { x: .5, y: .63 },
  { x: .32, y: .56 }, { x: .5, y: .55 }, { x: .34, y: .45 }, { x: .5, y: .46 },
  { x: .4, y: .34 }, { x: .5, y: .36 }, { x: .5, y: .25 }, { x: .5, y: .36 },
  { x: .6, y: .34 }, { x: .5, y: .46 }, { x: .66, y: .45 }, { x: .5, y: .55 },
  { x: .68, y: .56 }, { x: .5, y: .63 }, { x: .65, y: .65 }, { x: .5, y: .69 },
] }
export interface GuideSession { version: 1; startOrder: number; side: SurfaceSide; color: string }
export const GUIDE_KEY = 'deesewsew-leaf-v1'
export const nearGuideTarget = (a: NormalizedPoint, b: NormalizedPoint): boolean => Math.hypot(a.x - b.x, a.y - b.y) <= .028
export function guideStep(piece: EmbroideryPieceV3, guide: GuideSession): number | null {
  const punctures = piece.punctures.filter(p => p.order >= guide.startOrder)
  if (punctures.length > LEAF.targets.length) return null
  for (let i = 0; i < punctures.length; i++) {
    const p = punctures[i]!
    if (!nearGuideTarget(p.position, LEAF.targets[i]!) || p.color !== guide.color
      || p.fromSide !== (i % 2 === 0 ? guide.side : guide.side === 'front' ? 'back' : 'front')) return null
  }
  return punctures.length
}
export function loadGuide(piece: EmbroideryPieceV3): GuideSession | null {
  try {
    const source = JSON.parse(localStorage.getItem(GUIDE_KEY) ?? 'null') as GuideSession | null
    if (!source || source.version !== 1 || !Number.isSafeInteger(source.startOrder) || source.startOrder < 1
      || source.startOrder > piece.nextOrder || !['front', 'back'].includes(source.side) || !/^#[a-f0-9]{6}$/.test(source.color)) return null
    return guideStep(piece, source) === null ? null : source
  } catch { return null }
}
export function saveGuide(guide: GuideSession | null): void {
  try { if (guide) localStorage.setItem(GUIDE_KEY, JSON.stringify(guide)); else localStorage.removeItem(GUIDE_KEY) } catch { /* Optional guide is usable in memory. */ }
}
