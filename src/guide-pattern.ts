import type { NormalizedPoint, StitchType } from './stitch-model'
import type { SurfaceSide } from './embroidery-topology'
import { endThreadRun, punctureThreadRun, startThreadAt, type ThreadRunState } from './thread-runs'

export interface TargetStroke { start: NormalizedPoint; end: NormalizedPoint; color: string }
export interface GuideRun {
  id: string
  color: string
  startSide: SurfaceSide
  targets: readonly NormalizedPoint[]
  /** Only the published flower uses continue-current to retain its entry lead. */
  boundary: 'new-thread' | 'continue-current'
  /** Selected exit face for explicit setup; no parity preparation puncture. */
  visibleSide?: SurfaceSide
}
export interface GuidePattern {
  id: string
  version: number
  desiredFrontStrokes: readonly TargetStroke[]
  desiredBackStrokes: readonly TargetStroke[]
  runs: readonly GuideRun[]
  presentation: { entry: string; completion: string }
}
export interface GuideExecutionStep { runId: string; color: string; target: NormalizedPoint; fromSide: SurfaceSide; boundary: boolean }
const cache = new WeakMap<GuidePattern, readonly GuideExecutionStep[]>()
export function patternSteps(pattern: GuidePattern): readonly GuideExecutionStep[] {
  const cached = cache.get(pattern)
  if (cached) return cached
  const steps = pattern.runs.flatMap(run => run.targets.map((target,i) => ({
    runId:run.id,color:run.color,target,
    fromSide:(i%2 ? run.startSide==='front'?'back':'front' : run.startSide) as SurfaceSide,
    boundary:i===0 && run.boundary==='new-thread',
  })))
  cache.set(pattern,steps);return steps
}
export function punctureGuideStep(state: ThreadRunState, pattern: GuidePattern, index: number, point: NormalizedPoint, type: StitchType): ThreadRunState {
  const step=patternSteps(pattern)[index]
  const run=step && pattern.runs.find(r=>r.id===step.runId)
  if(!step || !Number.isInteger(index) || Math.hypot(point.x-step.target.x,point.y-step.target.y)>.028
    || (!(step.boundary && run?.visibleSide) && state.topology.needle.side!==step.fromSide))throw new TypeError('Guide target or physical side mismatch')
  if (step.boundary && run?.visibleSide) return startThreadAt(state,run.visibleSide,point,{type,color:step.color})
  // Validation precedes the boundary: cancelling/missing a target makes no run.
  return punctureThreadRun(step.boundary?endThreadRun(state):state,point,{type,color:step.color})
}

/** Derive progress from committed punctures, including physical ownership. */
export function patternProgress(state: ThreadRunState, pattern: GuidePattern, startOrder: number): number | null {
  const ps=state.topology.punctures.filter(p=>p.order>=startOrder),steps=patternSteps(pattern)
  if(ps.length>steps.length || state.topology.nextOrder<startOrder)return null
  const owners=new Map<string,{id:string;first:string}>()
  for(const run of state.runs)for(const id of run.punctureIds)owners.set(id,{id:run.id,first:run.punctureIds[0]!})
  let previousOwner:string|undefined
  for(let i=0;i<ps.length;i++){
    const p=ps[i]!,step=steps[i]!,owner=owners.get(p.id)
    if(!owner||p.fromSide!==step.fromSide||p.color!==step.color||Math.hypot(p.position.x-step.target.x,p.position.y-step.target.y)>.028)return null
    if(step.boundary ? owner.first!==p.id||owner.id===previousOwner : i>0&&steps[i-1]!.runId===step.runId&&owner.id!==previousOwner)return null
    previousOwner=owner.id
  }
  return ps.length
}
