import type { EmbroideryPieceV3, SurfaceSide } from './embroidery-topology'
import type { NormalizedPoint } from './stitch-model'
import { FLOWER } from './flower-pattern'
export interface GuideSession { version: 2; patternId: string; offset: number; startOrder: number; side: SurfaceSide; color: string }
// Preserve the storage slot. Old leaf sessions are ignored, not reinterpreted;
// their canonical stitches are never changed or deleted.
export const GUIDE_KEY = 'deesewsew-leaf-v1'
export const nearGuideTarget = (a: NormalizedPoint, b: NormalizedPoint): boolean => Math.hypot(a.x - b.x, a.y - b.y) <= .028
const targetCache = new WeakMap<GuideSession, { offset: number; targets: readonly NormalizedPoint[] }>()
export function guideTargets(guide: GuideSession): readonly NormalizedPoint[] {
  const cached = targetCache.get(guide)
  if (cached?.offset === guide.offset) return cached.targets
  const cycle = FLOWER.sequence.length - 1
  const indices = Array.from({ length: cycle + 1 }, (_, i) => FLOWER.sequence[(guide.offset + i) % cycle]!)
  // Back-side needles enter at the first FRONT edge's start; front-side needles
  // first make the real BACK lead-in. No synthetic edge or forced camera flip.
  const targets = indices.slice(guide.side === 'back' ? 1 : 0).map(i => FLOWER.points[i]!)
  targetCache.set(guide, { offset: guide.offset, targets })
  return targets
}
export function startGuide(piece: EmbroideryPieceV3, color: string): GuideSession {
  const guide: GuideSession = { version: 2, patternId: FLOWER.id, offset: 0, startOrder: piece.nextOrder, side: piece.needle.side, color }
  // Rotate whole BACK/FRONT pairs if the first target is too close to an existing
  // anchor. This bounded table scan preserves the motif and all existing work.
  for (let offset = 0; offset < FLOWER.sequence.length - 1; offset += 2) {
    guide.offset = offset
    const first = guideTargets(guide)[0]!
    if (!piece.needle.position || Math.hypot(first.x - piece.needle.position.x, first.y - piece.needle.position.y) >= .06) break
  }
  return guide
}
export function guideStep(piece: EmbroideryPieceV3, guide: GuideSession): number | null {
  if (piece.nextOrder < guide.startOrder) return null
  const targets = guideTargets(guide)
  const punctures = piece.punctures.filter(p => p.order >= guide.startOrder)
  if (punctures.length > targets.length) return null
  for (let i = 0; i < punctures.length; i++) {
    const p = punctures[i]!
    if (!nearGuideTarget(p.position, targets[i]!) || p.color !== guide.color
      || p.fromSide !== (i % 2 === 0 ? guide.side : guide.side === 'front' ? 'back' : 'front')) return null
  }
  return punctures.length
}
export function loadGuide(piece: EmbroideryPieceV3): GuideSession | null {
  try {
    const source = JSON.parse(localStorage.getItem(GUIDE_KEY) ?? 'null') as GuideSession | null
    if (!source || source.version !== 2 || source.patternId !== FLOWER.id
      || !Number.isInteger(source.offset) || source.offset < 0 || source.offset >= FLOWER.sequence.length - 1 || source.offset % 2 !== 0
      || !Number.isSafeInteger(source.startOrder) || source.startOrder < 1
      || source.startOrder > piece.nextOrder || !['front', 'back'].includes(source.side) || !/^#[a-f0-9]{6}$/.test(source.color)) return null
    return guideStep(piece, source) === null ? null : source
  } catch { return null }
}
export function saveGuide(guide: GuideSession | null): void {
  try { if (guide) localStorage.setItem(GUIDE_KEY, JSON.stringify(guide)); else localStorage.removeItem(GUIDE_KEY) } catch { /* Optional guide is usable in memory. */ }
}
