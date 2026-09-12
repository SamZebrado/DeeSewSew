import { patternProgress, patternSteps, type GuidePattern } from './guide-pattern'
import { activeThreadRun, type ThreadRunState } from './thread-runs'

/** Optional guidance is derived from canonical operations; it never advances by UI counters. */
export function runGuideAction(state:ThreadRunState,pattern:GuidePattern,startOrder:number) {
  const index=patternProgress(state,pattern,startOrder)
  if(index===null)return null
  const steps=patternSteps(pattern),active=activeThreadRun(state)
  const orders=new Map(state.topology.punctures.map(p=>[p.id,p.order]))
  const relevant=state.runs.filter(run=>(orders.get(run.punctureIds[0]!)??0)>=startOrder)
  for(let i=0;i<relevant.length;i++){
    const run=relevant[i]!,expected=pattern.runs[i]
    if(!expected||expected.boundary!=='new-thread'||!expected.visibleSide||run.startMode!=='visible-side'
      ||run.punctureIds.length>expected.targets.length||(i<relevant.length-1&&run.endOrder===null))return null
  }
  const step=steps[index]
  if(active&&(!step||step.boundary))return {kind:'cut' as const,index}
  if(!step)return {kind:'done' as const,index}
  if(!step.boundary&&!active)return null
  const run=pattern.runs.find(run=>run.id===step.runId)!
  // Explicit support face is content, not an index threshold tied to one motif.
  return {kind:step.boundary?'start' as const:'puncture' as const,index,target:step.target,side:run.visibleSide!,color:step.color,cutAfter:!steps[index+1]||steps[index+1]!.boundary}
}
