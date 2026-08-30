export type StitchType = 'running' | 'back'

export interface NormalizedPoint { x: number; y: number }

export interface Stitch {
  id: string
  type: StitchType
  start: NormalizedPoint
  end: NormalizedPoint
  color: string
  width: number
  order: number
  seed: number
}

export interface Piece { schemaVersion: 1; nextOrder: number; stitches: Stitch[] }

const STORAGE_KEY = 'deesewsew-piece-v1'
export const FABRIC_RADIUS = 0.435
export const emptyPiece = (): Piece => ({ schemaVersion: 1, nextOrder: 1, stitches: [] })

function hash(seed: string): number {
  let value = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

export function createStitch(piece: Piece, type: StitchType, start: NormalizedPoint, end: NormalizedPoint, color: string): Stitch {
  const order = piece.nextOrder
  const id = `stitch-${order}`
  piece.nextOrder += 1
  const visibleStart = type === 'running' ? interpolate(start, end, .06) : start
  const visibleEnd = type === 'running' ? interpolate(start, end, .82) : end
  return { id, type, start: visibleStart, end: visibleEnd, color, width: type === 'back' ? 4.2 : 3.8, order, seed: hash(id) }
}

export function interpolate(start: NormalizedPoint, end: NormalizedPoint, amount: number): NormalizedPoint {
  return { x: start.x + (end.x - start.x) * amount, y: start.y + (end.y - start.y) * amount }
}

export function isInsideFabric(point: NormalizedPoint): boolean {
  return Math.hypot(point.x - .5, point.y - .5) <= FABRIC_RADIUS
}

export function canvasToNormalized(x: number, y: number, size: number): NormalizedPoint {
  return { x: x / size, y: y / size }
}

export function normalizedToCanvas(point: NormalizedPoint, size: number): NormalizedPoint {
  return { x: point.x * size, y: point.y * size }
}

function isPoint(value: unknown): value is NormalizedPoint {
  if (!value || typeof value !== 'object') return false
  const point = value as Record<string, unknown>
  return typeof point.x === 'number' && typeof point.y === 'number' && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1
}

function isStitch(value: unknown): value is Stitch {
  if (!value || typeof value !== 'object') return false
  const stitch = value as Partial<Stitch>
  return typeof stitch.id === 'string' && (stitch.type === 'running' || stitch.type === 'back')
    && isPoint(stitch.start) && isPoint(stitch.end) && typeof stitch.color === 'string'
    && typeof stitch.width === 'number' && typeof stitch.order === 'number' && typeof stitch.seed === 'number'
}

export function deserializePiece(raw: string | null): Piece {
  try {
    if (!raw) return emptyPiece()
    const value = JSON.parse(raw) as Partial<Piece>
    if (value.schemaVersion !== 1 || !Array.isArray(value.stitches) || !value.stitches.every(isStitch)) return emptyPiece()
    const nextOrder = Math.max(1, ...value.stitches.map((stitch) => stitch.order + 1))
    return { schemaVersion: 1, nextOrder, stitches: [...value.stitches].sort((a, b) => a.order - b.order) }
  } catch { return emptyPiece() }
}

export function loadPiece(): Piece { return deserializePiece(localStorage.getItem(STORAGE_KEY)) }

export function serializePiece(piece: Piece): string { return JSON.stringify(piece) }

export function savePiece(piece: Piece): void {
  localStorage.setItem(STORAGE_KEY, serializePiece(piece))
}
