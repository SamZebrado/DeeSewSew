import {
  MAX_PIECE_STORAGE_CHARACTERS,
  MAX_STITCHES_PER_PIECE,
  PIECE_STORAGE_KEY,
  deserializePiece,
  isInsideFabric,
  type NormalizedPoint,
  type Piece,
  type Stitch,
  type StitchType,
} from './stitch-model'

export type SurfaceSide = 'front' | 'back'

export interface NeedleStateV3 {
  side: SurfaceSide
  position: NormalizedPoint | null
  lastPunctureId: string | null
}

export interface PunctureEventV3 {
  id: string
  position: NormalizedPoint
  fromSide: SurfaceSide
  toSide: SurfaceSide
  order: number
  seed: number
  type: StitchType
  color: string
}

export interface SurfaceThreadSegmentV3 {
  id: string
  startPunctureId: string
  endPunctureId: string
  start: NormalizedPoint
  end: NormalizedPoint
  side: SurfaceSide
  order: number
  type: StitchType
  color: string
  width: number
  seed: number
}

export interface EmbroideryPieceV3 {
  schemaVersion: 3
  nextOrder: number
  needle: NeedleStateV3
  punctures: PunctureEventV3[]
  segments: SurfaceThreadSegmentV3[]
  /** Node 1/2 had no physical reverse topology. Preserve its exact front appearance only. */
  legacyFrontStitches: Stitch[]
}

export interface PunctureStyleV3 {
  type: StitchType
  color: string
}

export interface PunctureResultV3 {
  piece: EmbroideryPieceV3
  puncture: PunctureEventV3
  segment: SurfaceThreadSegmentV3 | null
  needleBefore: NeedleStateV3
}

export type TopologyOperationV3 =
  | { kind: 'puncture'; puncture: PunctureEventV3; segment: SurfaceThreadSegmentV3 | null; needleBefore: NeedleStateV3 }
  | { kind: 'legacy'; stitch: Stitch }

export interface TopologyHistoryV3 {
  present: EmbroideryPieceV3
  future: TopologyOperationV3[]
}

const oppositeSide = (side: SurfaceSide): SurfaceSide => side === 'front' ? 'back' : 'front'
const clonePoint = (point: NormalizedPoint): NormalizedPoint => ({ x: point.x, y: point.y })
const cloneNeedle = (needle: NeedleStateV3): NeedleStateV3 => ({
  side: needle.side,
  position: needle.position ? clonePoint(needle.position) : null,
  lastPunctureId: needle.lastPunctureId,
})

function stableHash(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function isPoint(value: unknown): value is NormalizedPoint {
  if (!value || typeof value !== 'object') return false
  const point = value as Partial<NormalizedPoint>
  return typeof point.x === 'number' && Number.isFinite(point.x) && point.x >= 0 && point.x <= 1
    && typeof point.y === 'number' && Number.isFinite(point.y) && point.y >= 0 && point.y <= 1
}

function isSide(value: unknown): value is SurfaceSide { return value === 'front' || value === 'back' }
function samePoint(left: NormalizedPoint, right: NormalizedPoint): boolean { return left.x === right.x && left.y === right.y }

export function emptyEmbroideryPiece(): EmbroideryPieceV3 {
  return {
    schemaVersion: 3,
    nextOrder: 1,
    needle: { side: 'front', position: null, lastPunctureId: null },
    punctures: [],
    segments: [],
    legacyFrontStitches: [],
  }
}

export function migrateLegacyPiece(piece: Piece): EmbroideryPieceV3 {
  const highestOrder = piece.stitches.reduce((highest, stitch) => Math.max(highest, stitch.order), 0)
  return {
    ...emptyEmbroideryPiece(),
    nextOrder: Math.max(1, highestOrder + 1),
    legacyFrontStitches: piece.stitches.map((stitch) => ({ ...stitch, start: clonePoint(stitch.start), end: clonePoint(stitch.end) })),
  }
}

export function canPuncture(piece: EmbroideryPieceV3): boolean {
  return piece.punctures.length < MAX_STITCHES_PER_PIECE + 1 && piece.segments.length < MAX_STITCHES_PER_PIECE
}

export function punctureFabric(piece: EmbroideryPieceV3, position: NormalizedPoint, style: PunctureStyleV3): PunctureResultV3 {
  if (!isPoint(position) || !isInsideFabric(position)) throw new RangeError('A puncture must be inside the fabric.')
  if (!canPuncture(piece)) throw new RangeError(`A piece can contain at most ${MAX_STITCHES_PER_PIECE} surface segments.`)
  if (style.type !== 'running' && style.type !== 'back') throw new TypeError('Unknown stitch routing mode.')
  if (typeof style.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(style.color)) throw new TypeError('Invalid thread color.')

  const order = piece.nextOrder
  const punctureId = `puncture-${order}`
  const needleBefore = cloneNeedle(piece.needle)
  const puncture: PunctureEventV3 = {
    id: punctureId,
    position: clonePoint(position),
    fromSide: piece.needle.side,
    toSide: oppositeSide(piece.needle.side),
    order,
    seed: stableHash(punctureId),
    type: style.type,
    color: style.color.toLowerCase(),
  }
  const segment = piece.needle.position && piece.needle.lastPunctureId
    ? {
        id: `segment-${order}`,
        startPunctureId: piece.needle.lastPunctureId,
        endPunctureId: punctureId,
        start: clonePoint(piece.needle.position),
        end: clonePoint(position),
        side: piece.needle.side,
        order,
        type: style.type,
        color: style.color.toLowerCase(),
        width: style.type === 'back' ? 4.2 : 3.8,
        seed: stableHash(`segment-${order}`),
      } satisfies SurfaceThreadSegmentV3
    : null
  return {
    piece: {
      ...piece,
      nextOrder: order + 1,
      needle: { side: puncture.toSide, position: clonePoint(position), lastPunctureId: puncture.id },
      punctures: [...piece.punctures, puncture],
      segments: segment ? [...piece.segments, segment] : piece.segments,
    },
    puncture,
    segment,
    needleBefore,
  }
}

export function createTopologyHistory(piece = emptyEmbroideryPiece()): TopologyHistoryV3 {
  return { present: piece, future: [] }
}

export function commitPuncture(_history: TopologyHistoryV3, result: PunctureResultV3): TopologyHistoryV3 {
  return { present: result.piece, future: [] }
}

export function undoTopology(history: TopologyHistoryV3): TopologyHistoryV3 {
  const piece = history.present
  const puncture = piece.punctures.at(-1)
  if (puncture) {
    const segment = piece.segments.at(-1)?.endPunctureId === puncture.id ? piece.segments.at(-1)! : null
    const previousPuncture = piece.punctures.at(-2)
    const needleBefore: NeedleStateV3 = previousPuncture
      ? { side: puncture.fromSide, position: clonePoint(previousPuncture.position), lastPunctureId: previousPuncture.id }
      : { side: puncture.fromSide, position: null, lastPunctureId: null }
    return {
      present: {
        ...piece,
        needle: needleBefore,
        punctures: piece.punctures.slice(0, -1),
        segments: segment ? piece.segments.slice(0, -1) : piece.segments,
      },
      future: [...history.future, { kind: 'puncture', puncture, segment, needleBefore }],
    }
  }
  const stitch = piece.legacyFrontStitches.at(-1)
  if (!stitch) return history
  return {
    present: { ...piece, legacyFrontStitches: piece.legacyFrontStitches.slice(0, -1) },
    future: [...history.future, { kind: 'legacy', stitch }],
  }
}

export function redoTopology(history: TopologyHistoryV3): TopologyHistoryV3 {
  const operation = history.future.at(-1)
  if (!operation) return history
  if (operation.kind === 'legacy') {
    return {
      present: { ...history.present, legacyFrontStitches: [...history.present.legacyFrontStitches, operation.stitch] },
      future: history.future.slice(0, -1),
    }
  }
  return {
    present: {
      ...history.present,
      nextOrder: Math.max(history.present.nextOrder, operation.puncture.order + 1),
      needle: {
        side: operation.puncture.toSide,
        position: clonePoint(operation.puncture.position),
        lastPunctureId: operation.puncture.id,
      },
      punctures: [...history.present.punctures, operation.puncture],
      segments: operation.segment ? [...history.present.segments, operation.segment] : history.present.segments,
    },
    future: history.future.slice(0, -1),
  }
}

export function clearTopology(_history: TopologyHistoryV3): TopologyHistoryV3 {
  return { present: emptyEmbroideryPiece(), future: [] }
}

export function topologyRenderStitches(piece: EmbroideryPieceV3, side: SurfaceSide): Stitch[] {
  const legacy = side === 'front' ? piece.legacyFrontStitches : []
  const topology = piece.segments
    .filter((segment) => segment.side === side)
    .map((segment): Stitch => ({
      id: segment.id,
      type: segment.type,
      start: clonePoint(segment.start),
      end: clonePoint(segment.end),
      needleStart: clonePoint(segment.start),
      needleEnd: clonePoint(segment.end),
      color: segment.color,
      width: segment.width,
      order: segment.order,
      seed: segment.seed,
    }))
  return [...legacy, ...topology].sort((left, right) => left.order - right.order)
}

export function topologyRenderItems(piece: EmbroideryPieceV3, side: SurfaceSide): Stitch[] {
  const legacyIds = new Set(piece.legacyFrontStitches.map((stitch) => stitch.id))
  const threads = topologyRenderStitches(piece, side).map((stitch): Stitch => ({
    ...stitch,
    order: stitch.order * 2 + 1,
    renderKind: legacyIds.has(stitch.id) ? undefined : 'thread',
  }))
  const punctures = piece.punctures.map((puncture): Stitch => ({
    id: `${puncture.id}-${side}-hole`,
    type: puncture.type,
    start: clonePoint(puncture.position),
    end: clonePoint(puncture.position),
    needleStart: clonePoint(puncture.position),
    needleEnd: clonePoint(puncture.position),
    color: puncture.color,
    width: puncture.type === 'back' ? 4.2 : 3.8,
    order: puncture.order * 2,
    seed: puncture.seed,
    renderKind: 'puncture',
  }))
  return [...threads, ...punctures].sort((left, right) => left.order - right.order)
}

function parsePuncture(value: unknown): PunctureEventV3 | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Partial<PunctureEventV3>
  if (typeof source.id !== 'string' || !isPoint(source.position) || !isSide(source.fromSide) || !isSide(source.toSide)
    || source.toSide !== oppositeSide(source.fromSide) || !Number.isSafeInteger(source.order) || (source.order ?? 0) < 1
    || typeof source.seed !== 'number' || !Number.isFinite(source.seed)
    || (source.type !== 'running' && source.type !== 'back') || typeof source.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(source.color)) return null
  return {
    id: source.id,
    position: clonePoint(source.position),
    fromSide: source.fromSide,
    toSide: source.toSide,
    order: source.order,
    seed: source.seed,
    type: source.type,
    color: source.color.toLowerCase(),
  } as PunctureEventV3
}

function parseSegment(value: unknown, punctureIds: ReadonlySet<string>): SurfaceThreadSegmentV3 | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Partial<SurfaceThreadSegmentV3>
  if (typeof source.id !== 'string' || typeof source.startPunctureId !== 'string' || typeof source.endPunctureId !== 'string'
    || !punctureIds.has(source.startPunctureId) || !punctureIds.has(source.endPunctureId)
    || !isPoint(source.start) || !isPoint(source.end) || !isSide(source.side)
    || !Number.isSafeInteger(source.order) || (source.order ?? 0) < 1
    || (source.type !== 'running' && source.type !== 'back') || typeof source.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(source.color)
    || typeof source.width !== 'number' || !Number.isFinite(source.width) || source.width <= 0
    || typeof source.seed !== 'number' || !Number.isFinite(source.seed)) return null
  return {
    id: source.id,
    startPunctureId: source.startPunctureId,
    endPunctureId: source.endPunctureId,
    start: clonePoint(source.start),
    end: clonePoint(source.end),
    side: source.side,
    order: source.order,
    type: source.type,
    color: source.color.toLowerCase(),
    width: source.width,
    seed: source.seed,
  } as SurfaceThreadSegmentV3
}

function parseV3(raw: string): EmbroideryPieceV3 | null {
  const source = JSON.parse(raw) as Partial<EmbroideryPieceV3>
  if (source.schemaVersion !== 3 || !Array.isArray(source.punctures) || !Array.isArray(source.segments)
    || !Array.isArray(source.legacyFrontStitches) || source.punctures.length > MAX_STITCHES_PER_PIECE + 1
    || source.segments.length > MAX_STITCHES_PER_PIECE) return null
  const punctures = source.punctures.map(parsePuncture)
  if (punctures.some((puncture) => !puncture)) return null
  const typedPunctures = punctures as PunctureEventV3[]
  typedPunctures.sort((left, right) => left.order - right.order)
  const punctureIds = new Set(typedPunctures.map((puncture) => puncture.id))
  const punctureOrders = new Set(typedPunctures.map((puncture) => puncture.order))
  if (punctureIds.size !== typedPunctures.length || punctureOrders.size !== typedPunctures.length) return null
  for (let index = 0; index < typedPunctures.length; index += 1) {
    const puncture = typedPunctures[index]!
    const expectedFromSide = index === 0 ? 'front' : typedPunctures[index - 1]!.toSide
    if (puncture.fromSide !== expectedFromSide) return null
  }
  const segments = source.segments.map((segment) => parseSegment(segment, punctureIds))
  if (segments.some((segment) => !segment)) return null
  const typedSegments = (segments as SurfaceThreadSegmentV3[]).sort((left, right) => left.order - right.order)
  if (typedSegments.length !== Math.max(0, typedPunctures.length - 1)) return null
  for (let index = 1; index < typedPunctures.length; index += 1) {
    const previous = typedPunctures[index - 1]!
    const puncture = typedPunctures[index]!
    const segment = typedSegments[index - 1]!
    if (segment.startPunctureId !== previous.id || segment.endPunctureId !== puncture.id
      || segment.side !== puncture.fromSide || segment.order !== puncture.order
      || !samePoint(segment.start, previous.position) || !samePoint(segment.end, puncture.position)) return null
  }
  if (!source.needle || !isSide(source.needle.side)
    || !(source.needle.position === null || isPoint(source.needle.position))
    || !(source.needle.lastPunctureId === null || (typeof source.needle.lastPunctureId === 'string' && punctureIds.has(source.needle.lastPunctureId)))) return null
  const lastPuncture = typedPunctures.at(-1)
  if (lastPuncture) {
    if (source.needle.side !== lastPuncture.toSide || source.needle.lastPunctureId !== lastPuncture.id
      || !source.needle.position || !samePoint(source.needle.position, lastPuncture.position)) return null
  } else if (source.needle.side !== 'front' || source.needle.position !== null || source.needle.lastPunctureId !== null) return null
  const legacyRaw = JSON.stringify({ schemaVersion: 1, nextOrder: source.nextOrder, stitches: source.legacyFrontStitches })
  const legacy = deserializePiece(legacyRaw)
  if (source.legacyFrontStitches.length > 0 && legacy.stitches.length !== source.legacyFrontStitches.length) return null
  const highestOrder = Math.max(0, ...typedPunctures.map((puncture) => puncture.order), ...legacy.stitches.map((stitch) => stitch.order))
  return {
    schemaVersion: 3,
    nextOrder: Number.isSafeInteger(source.nextOrder) && (source.nextOrder ?? 0) > highestOrder ? source.nextOrder! : highestOrder + 1,
    needle: cloneNeedle(source.needle as NeedleStateV3),
    punctures: typedPunctures,
    segments: typedSegments,
    legacyFrontStitches: legacy.stitches,
  }
}

export function deserializeEmbroideryPiece(raw: string | null): EmbroideryPieceV3 {
  try {
    if (!raw || raw.length > MAX_PIECE_STORAGE_CHARACTERS) return emptyEmbroideryPiece()
    const schemaVersion = (JSON.parse(raw) as { schemaVersion?: unknown }).schemaVersion
    if (schemaVersion === 1) return migrateLegacyPiece(deserializePiece(raw))
    if (schemaVersion === 3) return parseV3(raw) ?? emptyEmbroideryPiece()
    return emptyEmbroideryPiece()
  } catch { return emptyEmbroideryPiece() }
}

export function serializeEmbroideryPiece(piece: EmbroideryPieceV3): string {
  const canonical = parseV3(JSON.stringify(piece))
  if (!canonical) throw new TypeError('The embroidery piece contains invalid topology.')
  const stitches = [...topologyRenderStitches(canonical, 'front'), ...topologyRenderStitches(canonical, 'back')]
  const serialized = JSON.stringify({ ...canonical, stitches })
  if (serialized.length > MAX_PIECE_STORAGE_CHARACTERS) throw new RangeError('The piece is too large for local storage.')
  return serialized
}

export function loadEmbroideryPiece(): EmbroideryPieceV3 {
  return deserializeEmbroideryPiece(localStorage.getItem(PIECE_STORAGE_KEY))
}

export function saveEmbroideryPiece(piece: EmbroideryPieceV3): boolean {
  try {
    localStorage.setItem(PIECE_STORAGE_KEY, serializeEmbroideryPiece(piece))
    return true
  } catch { return false }
}
