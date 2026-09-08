import { patternProgress, patternSteps } from './guide-pattern'
import { TULIP_HEART_PATTERN } from './tulip-heart-pattern'
import { activeThreadRun, type ThreadRunState } from './thread-runs'

export const TULIP_GUIDE_KEY='deesewsew-tulip-heart-v1'
export interface TulipGuideSession { version:1; patternId:'tulip-heart-v1'; startOrder:number }
export function startTulipGuide(state:ThreadRunState):TulipGuideSession {
  return {version:1,patternId:'tulip-heart-v1',startOrder:state.topology.nextOrder}
}
/** Progress follows real canonical actions, not an independently incremented UI counter. */
export function tulipGuideAction(state:ThreadRunState,session:TulipGuideSession) {
  const index=patternProgress(state,TULIP_HEART_PATTERN,session.startOrder)
  if(index===null)return null
  const active=activeThreadRun(state)
  const steps=patternSteps(TULIP_HEART_PATTERN)
  const orders=new Map(state.topology.punctures.map(p=>[p.id,p.order]))
  const relevant=state.runs.filter(r=>(orders.get(r.punctureIds[0]!)??0)>=session.startOrder)
  for(let i=0;i<relevant.length;i++){
    const run=relevant[i]!
    if(run.startMode!=='visible-side'||run.punctureIds.length>2||(i<relevant.length-1&&run.endOrder===null))return null
  }
  if(active && (index===0 || index%2===0))return {kind:'cut' as const,index}
  if(index%2===1&&!active)return null
  if(index===steps.length)return {kind:'done' as const,index}
  return {kind:index%2===0?'start' as const:'puncture' as const,index,target:steps[index]!.target,side:index<24?'front' as const:'back' as const}
}
export function saveTulipGuide(session:TulipGuideSession|null):void {
  try{if(session)localStorage.setItem(TULIP_GUIDE_KEY,JSON.stringify(session));else localStorage.removeItem(TULIP_GUIDE_KEY)}catch{/* Artwork storage remains separately protected. */}
}
export function loadTulipGuide(state:ThreadRunState):TulipGuideSession|null {
  try{
    const s=JSON.parse(localStorage.getItem(TULIP_GUIDE_KEY)??'null')
    if(!s||s.version!==1||s.patternId!=='tulip-heart-v1'||!Number.isSafeInteger(s.startOrder)||s.startOrder<1)return null
    const session:TulipGuideSession={version:1,patternId:'tulip-heart-v1',startOrder:s.startOrder}
    return tulipGuideAction(state,session)?session:null
  }catch{return null}
}
