export type Vec3 = [number, number, number]
export interface LabArtwork {
  format: 'deesewsew-lab3d'; version: 1
  support: { id: 'sphere-1'; shape: 'sphere'; radius: 1; transform: Vec3; role: 'removable' | 'permanent'; state: 'installed' | 'removed' }
  run: { id: 'run-1'; color: '#9b4a48'; anchors: Vec3[]; path: 'great-circle-v1' } | null
  display: 'artistic-rest-shape'
}
export const dot = (a: Vec3, b: Vec3) => a.reduce((s, v, i) => s + v * b[i]!, 0)
export const scale = (a: Vec3, n: number): Vec3 => a.map(v => v * n) as Vec3
export const add = (a: Vec3, b: Vec3): Vec3 => a.map((v, i) => v + b[i]!) as Vec3
export const unit = (a: Vec3): Vec3 => scale(a, 1 / Math.hypot(...a))
export const emptyLab = (): LabArtwork => ({ format: 'deesewsew-lab3d', version: 1,
  support: { id: 'sphere-1', shape: 'sphere', radius: 1, transform: [0, 0, 0], role: 'removable', state: 'installed' }, run: null, display: 'artistic-rest-shape' })
export function toggleSupport(a: LabArtwork): LabArtwork {
  if (a.support.role === 'permanent') return a
  return { ...a, support: { ...a.support, state: a.support.state === 'installed' ? 'removed' : 'installed' } }
}
export function anchor(a: LabArtwork, position: Vec3): LabArtwork {
  if (a.support.state !== 'installed' || !position.every(Number.isFinite) || Math.abs(Math.hypot(...position) - 1) > 1e-8) throw Error('Pick the installed sphere')
  const anchors = a.run?.anchors ?? []
  if (anchors.length >= 32) throw Error('Experimental limit: 32 anchors')
  const previous = anchors.at(-1)
  if (previous && (dot(previous, position) < -0.98 || dot(previous, position) > 0.99999)) throw Error('Choose a distinct, non-antipodal point')
  return { ...a, run: { id: 'run-1', color: '#9b4a48', anchors: [...anchors, [...position]], path: 'great-circle-v1' } }
}
export function span(a: Vec3, b: Vec3): Vec3[] {
  const angle = Math.acos(Math.max(-1, Math.min(1, dot(a, b))))
  return Array.from({ length: 25 }, (_, i) => {
    const t = i / 24
    return angle < 1e-8 ? [...a] : add(scale(a, Math.sin((1-t)*angle)/Math.sin(angle)), scale(b, Math.sin(t*angle)/Math.sin(angle)))
  })
}
export function parseLab(raw: string): LabArtwork {
  if (raw.length > 16000) throw Error('Lab file too large')
  const a = JSON.parse(raw), s = a?.support
  if (a?.format !== 'deesewsew-lab3d' || a.version !== 1 || a.display !== 'artistic-rest-shape' || s?.id !== 'sphere-1' || s.shape !== 'sphere' || s.radius !== 1 || !['removable','permanent'].includes(s.role) || !['installed','removed'].includes(s.state) || !Array.isArray(s.transform) || s.transform.length !== 3 || s.transform.some((v: unknown) => typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v)>10)) throw Error('Not a supported experimental lab file')
  let validated = emptyLab()
  if (a.run !== null) {
    if (a.run?.id !== 'run-1' || a.run.color !== '#9b4a48' || a.run.path !== 'great-circle-v1' || !Array.isArray(a.run.anchors) || !a.run.anchors.length) throw Error('Invalid lab run')
    for (const p of a.run.anchors) {
      if (!Array.isArray(p) || p.length !== 3 || !p.every((v: unknown) => typeof v === 'number' && Number.isFinite(v))) throw Error('Invalid 3D anchor')
      validated = anchor(validated, p as Vec3)
    }
  }
  return { ...validated, support: { ...validated.support, transform:[...s.transform] as Vec3, role: s.role, state: s.state } }
}
export const serializeLab = (a: LabArtwork) => JSON.stringify(parseLab(JSON.stringify(a)))
export const worldAnchor = (a: LabArtwork, p: Vec3): Vec3 => add(p,a.support.transform)
export interface Camera { yaw: number; pitch: number; distance: number }
export function basis(c: Camera): [Vec3, Vec3, Vec3] {
  const forward: Vec3 = [Math.sin(c.yaw)*Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw)*Math.cos(c.pitch)]
  return [[Math.cos(c.yaw), 0, -Math.sin(c.yaw)], [-Math.sin(c.yaw)*Math.sin(c.pitch), Math.cos(c.pitch), -Math.cos(c.yaw)*Math.sin(c.pitch)], forward]
}
export function project(p: Vec3, c: Camera): Vec3 {
  const [right, up, forward] = basis(c), depth = c.distance-dot(p, forward)
  return [dot(p,right)/depth, -dot(p,up)/depth, depth]
}
export function pick(x: number, y: number, c: Camera): Vec3 | null {
  const [right, up, forward] = basis(c), origin=scale(forward,c.distance)
  const direction=unit(add(add(scale(right,x),scale(up,-y)),scale(forward,-1)))
  const b=dot(origin,direction), discriminant=b*b-dot(origin,origin)+1
  if(discriminant<0)return null
  return unit(add(origin,scale(direction,-b-Math.sqrt(discriminant))))
}
