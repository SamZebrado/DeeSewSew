export type Vec3 = [number, number, number]
export const MAX_LAB_RUNS = 8
export const MAX_RUN_ANCHORS = 32
export const MAX_LAB_FILE_BYTES = 128 * 1024
export interface LabRun { id: string; color: string; anchors: Vec3[]; path: 'great-circle-v1'; state: 'open' | 'completed' }
export interface LabArtwork {
  format: 'deesewsew-lab3d'; version: 2
  support: { id: 'sphere-1'; shape: 'sphere'; radius: 1; transform: Vec3; role: 'removable' | 'permanent'; state: 'installed' | 'removed' }
  runs: LabRun[]; activeRunId: string | null
  display: 'artistic-rest-shape'
}
export const dot = (a: Vec3, b: Vec3) => a.reduce((s, v, i) => s + v * b[i]!, 0)
export const scale = (a: Vec3, n: number): Vec3 => a.map(v => v * n) as Vec3
export const add = (a: Vec3, b: Vec3): Vec3 => a.map((v, i) => v + b[i]!) as Vec3
export const unit = (a: Vec3): Vec3 => scale(a, 1 / Math.hypot(...a))
export const emptyLab = (): LabArtwork => ({ format: 'deesewsew-lab3d', version: 2,
  support: { id: 'sphere-1', shape: 'sphere', radius: 1, transform: [0, 0, 0], role: 'removable', state: 'installed' }, runs: [], activeRunId: null, display: 'artistic-rest-shape' })
export function toggleSupport(a: LabArtwork): LabArtwork {
  if (a.support.role === 'permanent') return a
  return { ...a, support: { ...a.support, state: a.support.state === 'installed' ? 'removed' : 'installed' } }
}
export function anchor(a: LabArtwork, position: Vec3): LabArtwork {
  if (a.support.state !== 'installed' || !position.every(Number.isFinite) || Math.abs(Math.hypot(...position) - 1) > 1e-8) throw Error('Pick the installed sphere')
  if (a.activeRunId === null && a.runs.length) throw Error('Start a new run')
  const current = a.activeRunId === null ? startRun(a) : a
  const index = current.runs.findIndex(run => run.id === current.activeRunId)
  if (index < 0 || current.runs[index]!.state !== 'open') throw Error('No active run')
  const run = current.runs[index]!, anchors = run.anchors
  if (anchors.length >= MAX_RUN_ANCHORS) throw Error('Experimental limit: 32 anchors')
  const previous = anchors.at(-1)
  if (previous && (dot(previous, position) < -0.98 || dot(previous, position) > 0.99999)) throw Error('Choose a distinct, non-antipodal point')
  return { ...current, runs: current.runs.map((item, i) => i === index ? { ...run, anchors: [...anchors, [...position] as Vec3] } : item) }
}
export function startRun(a: LabArtwork, color = '#9b4a48'): LabArtwork {
  if (a.support.state !== 'installed') throw Error('Install the support before starting a run')
  if (a.activeRunId !== null) throw Error('Finish the active run first')
  if (a.runs.length >= MAX_LAB_RUNS) throw Error('Experimental limit: 8 runs')
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw Error('Invalid run color')
  const id = `run-${a.runs.length + 1}`
  return { ...a, runs: [...a.runs, { id, color, anchors: [], path: 'great-circle-v1', state: 'open' }], activeRunId: id }
}
export function finishRun(a: LabArtwork): LabArtwork {
  const index = a.runs.findIndex(run => run.id === a.activeRunId)
  if (index < 0 || !a.runs[index]!.anchors.length) throw Error('Add an anchor before finishing the run')
  return { ...a, runs: a.runs.map((run, i) => i === index ? { ...run, state: 'completed' } : run), activeRunId: null }
}
export function span(a: Vec3, b: Vec3): Vec3[] {
  const angle = Math.acos(Math.max(-1, Math.min(1, dot(a, b))))
  return Array.from({ length: 25 }, (_, i) => {
    const t = i / 24
    return angle < 1e-8 ? [...a] : add(scale(a, Math.sin((1-t)*angle)/Math.sin(angle)), scale(b, Math.sin(t*angle)/Math.sin(angle)))
  })
}
export function parseLab(raw: string): LabArtwork {
  if (new TextEncoder().encode(raw).length > MAX_LAB_FILE_BYTES) throw Error('Lab file too large')
  const a = JSON.parse(raw), s = a?.support
  if (a?.format !== 'deesewsew-lab3d' || ![1,2].includes(a.version) || a.display !== 'artistic-rest-shape' || s?.id !== 'sphere-1' || s.shape !== 'sphere' || s.radius !== 1 || !['removable','permanent'].includes(s.role) || !['installed','removed'].includes(s.state) || !Array.isArray(s.transform) || s.transform.length !== 3 || s.transform.some((v: unknown) => typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v)>10)) throw Error('Not a supported experimental lab file')
  if(s.role==='permanent'&&s.state==='removed')throw Error('Permanent support cannot be removed')
  const runs: LabRun[] = a.version === 1 ? (a.run === null ? [] : [{ ...a.run, state: 'open' }]) : a.runs
  if (!Array.isArray(runs) || runs.length > MAX_LAB_RUNS) throw Error('Invalid lab runs or 8 runs limit')
  let openId: string | null = null
  for (const [i, run] of runs.entries()) {
    if (run?.id !== `run-${i+1}` || (a.version === 1 && (run.color !== '#9b4a48' || i !== 0)) || typeof run.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(run.color) || run.path !== 'great-circle-v1' || !['open','completed'].includes(run.state) || !Array.isArray(run.anchors) || run.anchors.length > MAX_RUN_ANCHORS || (!run.anchors.length && run.state === 'completed')) throw Error('Invalid lab run')
    if (run.state === 'open') {
      if (openId !== null) throw Error('Multiple open runs')
      openId = run.id
    }
    for (const [j, p] of run.anchors.entries()) {
      if (!Array.isArray(p) || p.length !== 3 || !p.every((v: unknown) => typeof v === 'number' && Number.isFinite(v)) || Math.abs(Math.hypot(...p)-1)>1e-8) throw Error('Invalid 3D anchor')
      if (j && (dot(run.anchors[j-1], p) < -0.98 || dot(run.anchors[j-1], p) > 0.99999)) throw Error('Invalid 3D anchor span')
    }
  }
  if (a.version === 1 && a.run !== null && !runs[0]!.anchors.length) throw Error('Invalid lab run')
  const activeRunId = a.version === 1 ? openId : a.activeRunId
  if (activeRunId !== openId || (openId !== null && runs.at(-1)!.id !== openId)) throw Error('Invalid active run')
  return { format: 'deesewsew-lab3d', version: 2, support: { id: 'sphere-1', shape: 'sphere', radius: 1, transform:[...s.transform] as Vec3, role: s.role, state: s.state }, runs: runs.map(run => ({ id: run.id, color: run.color, anchors: run.anchors.map((p: Vec3) => [...p] as Vec3), path: 'great-circle-v1', state: run.state })), activeRunId, display: 'artistic-rest-shape' }
}
export const serializeLab = (a: LabArtwork) => JSON.stringify(parseLab(JSON.stringify(a)))
export const worldAnchor = (a: LabArtwork, p: Vec3): Vec3 => add(p,a.support.transform)
export function createImportOwnership() {
  let revision=0
  return { start:()=>++revision, invalidate:()=>{revision++}, owns:(token:number)=>token===revision }
}
/** Artistic, bounded radial release response; not a material/force solver. */
export function displayPoint(rest: Vec3, material: number, elapsedMs: number): Vec3 {
  if(elapsedMs<=0 || elapsedMs>=1200)return rest
  const t=elapsedMs/1200
  return scale(rest,1+.07*Math.sin(Math.PI*material)*Math.sin(2*Math.PI*t)*Math.exp(-4*t)*(1-t)**2)
}
/** Lab camera targets the canonical support origin. Inputs/outputs are world-space. */
export interface Camera { yaw: number; pitch: number; distance: number; target?: Vec3 }
export function basis(c: Camera): [Vec3, Vec3, Vec3] {
  const forward: Vec3 = [Math.sin(c.yaw)*Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw)*Math.cos(c.pitch)]
  return [[Math.cos(c.yaw), 0, -Math.sin(c.yaw)], [-Math.sin(c.yaw)*Math.sin(c.pitch), Math.cos(c.pitch), -Math.cos(c.yaw)*Math.sin(c.pitch)], forward]
}
export function project(p: Vec3, c: Camera): Vec3 {
  const relative=add(p,scale(c.target??[0,0,0],-1))
  const [right, up, forward] = basis(c), depth = c.distance-dot(relative, forward)
  return [dot(relative,right)/depth, -dot(relative,up)/depth, depth]
}
export function pick(x: number, y: number, c: Camera): Vec3 | null {
  const [right, up, forward] = basis(c), origin=scale(forward,c.distance)
  const direction=unit(add(add(scale(right,x),scale(up,-y)),scale(forward,-1)))
  const b=dot(origin,direction), discriminant=b*b-dot(origin,origin)+1
  if(discriminant<0)return null
  return add(unit(add(origin,scale(direction,-b-Math.sqrt(discriminant)))),c.target??[0,0,0])
}
