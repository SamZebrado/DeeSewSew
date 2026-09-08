import { parseArtworkFile as parseLegacy, type EmbroideryPieceV3, type PunctureEventV3, type SurfaceThreadSegmentV3 } from './embroidery-topology'
import { MAX_PIECE_STORAGE_CHARACTERS, MAX_STITCHES_PER_PIECE } from './stitch-model'
import { adoptThreadRuns, type ThreadRun, type ThreadRunState } from './thread-runs'

const side = (x: unknown): x is 'front' | 'back' => x === 'front' || x === 'back'
const flip = (x: 'front' | 'back') => x === 'front' ? 'back' : 'front'
const integer = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 1 && (x as number) < 1_000_000_000
const samePoint = (a: any, b: any) => a === null || b === null ? a === b : !!a && !!b && a.x === b.x && a.y === b.y

/** Strict v4 boundary. Fragment validation reuses the established canonical v3
 * validator; the wrapper additionally proves ownership and physical boundaries.
 * This runs on load/export/commit validation, never on pointermove or RAF. */
export function parseThreadArtwork(raw: string): ThreadRunState {
  if (!raw || raw.length > MAX_PIECE_STORAGE_CHARACTERS) throw new RangeError('Artwork size limit')
  const source = JSON.parse(raw)
  if (source?.schemaVersion !== 4) return adoptThreadRuns(parseLegacy(raw))
  if (!Array.isArray(source.runs) || !Array.isArray(source.punctures) || !Array.isArray(source.segments)
    || !Array.isArray(source.legacyFrontStitches) || source.runs.length > MAX_STITCHES_PER_PIECE + 1
    || source.punctures.length > MAX_STITCHES_PER_PIECE + 1
    || source.segments.length + source.legacyFrontStitches.length > MAX_STITCHES_PER_PIECE
    || !integer(source.nextOrder)) throw new TypeError('Invalid artwork budget')
  const punctures = source.punctures as PunctureEventV3[], segments = source.segments as SurfaceThreadSegmentV3[]
  const pById = new Map(punctures.map(p => [p?.id, p])), sById = new Map(segments.map(s => [s?.id, s]))
  if (pById.size !== punctures.length || sById.size !== segments.length) throw new TypeError('Duplicate artwork ID')
  const ownedP = new Set<string>(), ownedS = new Set<string>(), runIds = new Set<string>(), orders = new Set<number>()
  let previousOrder = 0, expectedSide: 'front' | 'back' = 'front'
  const runs: ThreadRun[] = []
  const canonicalP: PunctureEventV3[] = [], canonicalS: SurfaceThreadSegmentV3[] = []
  for (const r of source.runs) {
    if (!r || typeof r.id !== 'string' || !/^(run|legacy-run)-[1-9][0-9]*$/.test(r.id) || runIds.has(r.id)
      || !side(r.startSide) || !side(r.endSide)
      || (r.startMode !== undefined && (r.startMode !== 'visible-side' || r.provenance !== 'explicit'))
      || (r.startMode === undefined && r.startSide !== expectedSide)
      || !Array.isArray(r.punctureIds) || !r.punctureIds.length || !Array.isArray(r.segmentIds)
      || r.segmentIds.length !== r.punctureIds.length - 1
      || !['explicit', 'legacy-v3-unverified'].includes(r.provenance)
      || (r.provenance === 'explicit' ? typeof r.color !== 'string' || !/^#[a-f0-9]{6}$/.test(r.color)
        : r.color !== null || runs.length !== 0)
      || !(r.endOrder === null || integer(r.endOrder))) throw new TypeError('Invalid thread run')
    const ps = r.punctureIds.map((id: string) => {
      const p = pById.get(id)
      if (!p || !side(p.fromSide) || !side(p.toSide) || ownedP.has(id) || !integer(p.order) || p.order <= previousOrder || orders.has(p.order)) throw new TypeError('Invalid puncture ownership/order')
      ownedP.add(id); orders.add(p.order); previousOrder = p.order
      return p
    }) as PunctureEventV3[]
    const ss = r.segmentIds.map((id: string) => {
      const s = sById.get(id)
      if (!s || !side(s.side) || ownedS.has(id)) throw new TypeError('Invalid segment ownership')
      ownedS.add(id); return s
    }) as SurfaceThreadSegmentV3[]
    if (r.id !== `${r.provenance === 'explicit' ? 'run' : 'legacy-run'}-${ps[0]!.order}`
      || ps[0]!.fromSide !== r.startSide || ps.at(-1)!.toSide !== r.endSide
      || (r.provenance === 'explicit' && (ps.some(p => p.color !== r.color) || ss.some(s => s.color !== r.color)))) throw new TypeError('Run identity/color/side mismatch')
    const mirror = r.startSide === 'back'
    const normalizedP = ps.map(p => ({ ...p, fromSide: mirror ? flip(p.fromSide) : p.fromSide, toSide: mirror ? flip(p.toSide) : p.toSide }))
    const normalizedS = ss.map(s => ({ ...s, side: mirror ? flip(s.side) : s.side }))
    const last = normalizedP.at(-1)!
    // No alternate renderer: this validates the same puncture/segment semantics.
    const checked = parseLegacy(JSON.stringify({ schemaVersion: 3, nextOrder: source.nextOrder,
      punctures: normalizedP, segments: normalizedS, legacyFrontStitches: [],
      needle: { side: last.toSide, position: last.position, lastPunctureId: last.id } }))
    canonicalP.push(...checked.punctures.map(p => ({...p, fromSide: mirror ? flip(p.fromSide) : p.fromSide, toSide: mirror ? flip(p.toSide) : p.toSide})))
    canonicalS.push(...checked.segments.map(s => ({...s, side: mirror ? flip(s.side) : s.side})))
    if (r.endOrder !== null) {
      if (r.endOrder <= previousOrder || orders.has(r.endOrder)) throw new TypeError('Invalid end-thread order')
      orders.add(r.endOrder); previousOrder = r.endOrder
    } else if (source.activeRunId !== r.id || runs.length !== source.runs.length - 1) throw new TypeError('Unclosed previous run')
    const firstP=ps[0]!,lastP=ps.at(-1)!
    const startAnchor=r.provenance==='explicit'?{id:`${r.id}-start`,kind:'start',punctureId:firstP.id,position:firstP.position,side:firstP.fromSide,color:r.color,order:firstP.order}:null
    const endAnchor=r.endOrder===null?null:{id:`${r.id}-end`,kind:'end',punctureId:lastP.id,position:lastP.position,side:lastP.toSide,color:r.color??lastP.color,order:r.endOrder}
    for(const [actual,expected] of [[r.startAnchor,startAnchor],[r.endAnchor,endAnchor]]){
      if(expected===null?actual!==null:!actual||Object.keys(expected).some(k=>k==='position' ? !samePoint(actual[k],(expected as any)[k]) : actual[k] !== (expected as any)[k]))throw new TypeError('Invalid canonical anchor')
    }
    runIds.add(r.id); expectedSide = r.endSide
    runs.push({ id: r.id, color: r.color, provenance: r.provenance, startSide: r.startSide,
      ...(r.startMode === 'visible-side' ? {startMode: 'visible-side' as const} : {}),
      endSide: r.endSide, punctureIds: [...r.punctureIds], segmentIds: [...r.segmentIds], endOrder: r.endOrder,
      startAnchor:startAnchor ? {...startAnchor,kind:'start',position:{x:firstP.position.x,y:firstP.position.y}} : null,
      endAnchor:endAnchor ? {...endAnchor,kind:'end',position:{x:lastP.position.x,y:lastP.position.y}} : null })
  }
  if (ownedP.size !== punctures.length || ownedS.size !== segments.length
    || source.activeRunId !== (runs.at(-1)?.endOrder === null ? runs.at(-1)!.id : null)
    || source.nextOrder <= previousOrder) throw new TypeError('Unowned artwork or active run mismatch')
  const legacy = parseLegacy(JSON.stringify({ schemaVersion: 3, nextOrder: source.nextOrder, punctures: [], segments: [],
    legacyFrontStitches: source.legacyFrontStitches, needle: { side: 'front', position: null, lastPunctureId: null } }))
  const canonicalIds = new Set([...runIds,...pById.keys(),...sById.keys(),...runs.flatMap(r => [r.startAnchor?.id,r.endAnchor?.id].filter((id):id is string => !!id))])
  for (const s of legacy.legacyFrontStitches) if (orders.has(s.order) || canonicalIds.has(s.id)) throw new TypeError('Colliding legacy order/ID')
  const last = canonicalP.at(-1)
  const needle = last ? { side: last.toSide, position: last.position, lastPunctureId: last.id }
    : { side: 'front' as const, position: null, lastPunctureId: null }
  if (!source.needle || source.needle.side !== needle.side || source.needle.lastPunctureId !== needle.lastPunctureId
    || !samePoint(source.needle.position,needle.position)) throw new TypeError('Needle state mismatch')
  // Require global order rather than accepting a shuffled ownership representation.
  if (punctures.some((p, i) => i > 0 && p.order <= punctures[i - 1]!.order)
    || segments.some((s, i) => i > 0 && s.order <= segments[i - 1]!.order)) throw new TypeError('Unordered artwork')
  const result:ThreadRunState = { topology: { schemaVersion: 3, nextOrder: source.nextOrder, needle,
    punctures:canonicalP, segments:canonicalS, legacyFrontStitches: legacy.legacyFrontStitches }, runs, activeRunId: source.activeRunId }
  if (JSON.stringify({...result.topology,schemaVersion:4,runs,activeRunId:result.activeRunId}).length > MAX_PIECE_STORAGE_CHARACTERS - 4096) throw new RangeError('Artwork needs continuation headroom')
  return result
}

export function serializeThreadArtwork(state: ThreadRunState): string {
  const value = JSON.stringify({ ...state.topology, schemaVersion: 4, runs: state.runs, activeRunId: state.activeRunId })
  const checked = parseThreadArtwork(value)
  return JSON.stringify({ ...checked.topology, schemaVersion: 4, runs: checked.runs, activeRunId: checked.activeRunId })
}

/** Renderer and motion modules continue to consume the unchanged flat geometry. */
export type ThreadArtworkTopology = EmbroideryPieceV3
