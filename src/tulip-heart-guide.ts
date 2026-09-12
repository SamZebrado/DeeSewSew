import type { ThreadRunState } from './thread-runs'
import { libraryPattern } from './pattern-library'
import { runGuideAction } from './run-guide'

export const TULIP_GUIDE_KEY='deesewsew-tulip-heart-v1'
export interface TulipGuideSession { version:1; patternId:string; patternVersion:number; startOrder:number }
export function startTulipGuide(state:ThreadRunState,patternId='tulip-heart-v1'):TulipGuideSession {
  if(!libraryPattern(patternId))throw new TypeError('Unknown pattern')
  return {version:1,patternId,patternVersion:libraryPattern(patternId)!.version,startOrder:state.topology.nextOrder}
}
/** Progress follows real canonical actions, not an independently incremented UI counter. */
export function tulipGuideAction(state:ThreadRunState,session:TulipGuideSession) {
  const pattern=libraryPattern(session.patternId)
  return pattern&&pattern.version===session.patternVersion?runGuideAction(state,pattern,session.startOrder):null
}
export function saveTulipGuide(session:TulipGuideSession|null):void {
  try{if(session)localStorage.setItem(TULIP_GUIDE_KEY,JSON.stringify(session));else localStorage.removeItem(TULIP_GUIDE_KEY)}catch{/* Artwork storage remains separately protected. */}
}
export function loadTulipGuide(state:ThreadRunState):TulipGuideSession|null {
  try{
    const s=JSON.parse(localStorage.getItem(TULIP_GUIDE_KEY)??'null')
    if(!s||s.version!==1||typeof s.patternId!=='string'||!libraryPattern(s.patternId)||!Number.isSafeInteger(s.startOrder)||s.startOrder<1)return null
    // Only the published v1 tulip session predates explicit content versioning.
    const patternVersion=s.patternVersion??(s.patternId==='tulip-heart-v1'?1:null)
    if(patternVersion!==libraryPattern(s.patternId)!.version)return null
    const session:TulipGuideSession={version:1,patternId:s.patternId,patternVersion,startOrder:s.startOrder}
    return tulipGuideAction(state,session)?session:null
  }catch{return null}
}
