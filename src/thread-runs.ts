import {
  emptyEmbroideryPiece, punctureFabric, type EmbroideryPieceV3,
  type PunctureStyleV3, type SurfaceSide,
} from './embroidery-topology'
import type { NormalizedPoint } from './stitch-model'

/** Explicit physical identity, distinct from color. Legacy provenance deliberately
 * does not assert that historical per-stitch colors were one physical filament. */
export interface ThreadRun {
  id: string
  color: string | null
  provenance: 'explicit' | 'legacy-v3-unverified'
  /** Explicit setup selects the exit face; ordinary starts retain needle side. */
  startMode?: 'visible-side'
  startSide: SurfaceSide
  endSide: SurfaceSide
  punctureIds: readonly string[]
  segmentIds: readonly string[]
  endOrder: number | null
  startAnchor: ThreadAnchor | null
  endAnchor: ThreadAnchor | null
}
export interface ThreadAnchor {
  id: string
  kind: 'start' | 'end'
  punctureId: string
  position: NormalizedPoint
  side: SurfaceSide
  color: string
  order: number
}

export interface ThreadRunState {
  topology: EmbroideryPieceV3
  runs: readonly ThreadRun[]
  activeRunId: string | null
}

/** Read-only adoption: no geometry, color, IDs, seeds, order or storage rewrite. */
export function adoptThreadRuns(topology: EmbroideryPieceV3): ThreadRunState {
  const first = topology.punctures[0], last = topology.punctures.at(-1)
  if (!first || !last) return { topology, runs: [], activeRunId: null }
  const run: ThreadRun = {
    id: `legacy-run-${first.order}`, color: null, provenance: 'legacy-v3-unverified',
    startSide: first.fromSide, endSide: last.toSide,
    punctureIds: topology.punctures.map(p => p.id),
    segmentIds: topology.segments.map(s => s.id), endOrder: null, startAnchor:null,endAnchor:null,
  }
  return { topology, runs: [run], activeRunId: run.id }
}

export function emptyThreadRuns(): ThreadRunState { return adoptThreadRuns(emptyEmbroideryPiece()) }

/** Active runs are always the last run; pointer paths need no artwork scan. */
export function activeThreadRun(state: ThreadRunState): ThreadRun | null {
  const last = state.runs.at(-1)
  return last?.id === state.activeRunId ? last : null
}

export function endThreadRun(state: ThreadRunState): ThreadRunState {
  const run = activeThreadRun(state)
  if (!run) return state
  if (state.topology.nextOrder >= 999_999_999) throw new RangeError('Artwork order limit')
  const last=state.topology.punctures.at(-1)!
  const endAnchor:ThreadAnchor={id:`${run.id}-end`,kind:'end',punctureId:last.id,position:{...last.position},side:last.toSide,color:run.color??last.color,order:state.topology.nextOrder}
  return {
    topology: { ...state.topology, nextOrder: state.topology.nextOrder + 1 },
    runs: [...state.runs.slice(0, -1), { ...run, endOrder: state.topology.nextOrder, endAnchor }],
    activeRunId: null,
  }
}

/** A new filament enters from the opposite face. This is a deliberate setup
 * operation, never a camera flip or an ordinary puncture parity workaround. */
export function startThreadAt(state: ThreadRunState, visibleSide: SurfaceSide, point: NormalizedPoint, style: PunctureStyleV3): ThreadRunState {
  if (activeThreadRun(state)) throw new TypeError('Cut the active thread before starting another')
  const input = { ...state, topology: { ...state.topology, needle: {
    ...state.topology.needle, side: visibleSide === 'front' ? 'back' as const : 'front' as const,
    lastPunctureId: null,
  } } }
  const started = punctureThreadRun(input, point, style)
  const run = started.runs.at(-1)!
  return { ...started, runs: [...started.runs.slice(0, -1), { ...run, startMode: 'visible-side' }] }
}

export function punctureThreadRun(state: ThreadRunState, point: NormalizedPoint, style: PunctureStyleV3): ThreadRunState {
  if (state.topology.nextOrder >= 999_999_999) throw new RangeError('Artwork order limit')
  const color = style.color.toLowerCase()
  const previous = activeThreadRun(state)
  // New explicit runs cannot change color. Legacy source keeps its uncertainty;
  // a new color still establishes a boundary instead of rewriting that history.
  const activeColor = previous?.color ?? state.topology.punctures.at(-1)?.color
  const prepared = previous && activeColor !== color ? endThreadRun(state) : state
  const active = activeThreadRun(prepared)
  let topology = prepared.topology
  if (topology.nextOrder >= 999_999_999) throw new RangeError('Artwork order limit')
  // Legacy v1 IDs were user supplied. Preserve them and reserve an unused
  // operation namespace rather than renaming old visible stitches on adoption.
  if (topology.legacyFrontStitches.length) {
    const reserved = new Set(topology.legacyFrontStitches.map(s => s.id))
    let order = topology.nextOrder
    while ([`run-${order}`, `run-${order}-start`, `run-${order}-end`, `puncture-${order}`, `segment-${order}`].some(id => reserved.has(id))) order++
    if (order >= 999_999_999) throw new RangeError('Artwork order limit')
    if (order !== topology.nextOrder) topology = {...topology, nextOrder: order}
  }
  // Preserve physical needle pose/side in canonical state. Only the temporary
  // input anchor is absent when starting a separate physical filament.
  const input = active ? topology : { ...topology, needle: { ...topology.needle, lastPunctureId: null } }
  const result = punctureFabric(input, point, style)
  const run: ThreadRun = active ? {
    ...active, endSide: result.puncture.toSide,
    punctureIds: [...active.punctureIds, result.puncture.id],
    segmentIds: result.segment ? [...active.segmentIds, result.segment.id] : active.segmentIds,
  } : {
    id: `run-${result.puncture.order}`, color, provenance: 'explicit',
    startSide: result.puncture.fromSide, endSide: result.puncture.toSide,
    punctureIds: [result.puncture.id], segmentIds: [], endOrder: null, endAnchor:null,
    startAnchor:{id:`run-${result.puncture.order}-start`,kind:'start',punctureId:result.puncture.id,position:{...point},side:result.puncture.fromSide,color,order:result.puncture.order},
  }
  return {
    topology: result.piece,
    runs: [...(active ? prepared.runs.slice(0, -1) : prepared.runs), run],
    activeRunId: run.id,
  }
}
