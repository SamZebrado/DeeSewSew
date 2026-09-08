/** Development-only entry: not imported by the application bundle. */
import { emptyThreadRuns, endThreadRun, type ThreadRunState } from './thread-runs'
import { punctureGuideStep, patternSteps, type GuidePattern, type GuideRun, type TargetStroke } from './guide-pattern'
import { isInsideFabric } from './stitch-model'
import { serializeThreadArtwork } from './thread-run-storage'
export { TULIP_HEART_PATTERN } from './tulip-heart-pattern'

const color='#9b4a48'
const point=(x:number,y:number)=>({x,y})
const stroke=(a:{x:number;y:number},b:{x:number;y:number}):TargetStroke=>({start:a,end:b,color})
const key=(s:TargetStroke)=>[`${s.start.x},${s.start.y}`,`${s.end.x},${s.end.y}`].sort().join('|')+'|'+s.color
const a=[point(.25,.35),point(.35,.35),point(.4,.4),point(.35,.45),point(.25,.45)]
const b=[point(.6,.35),point(.7,.35),point(.75,.4),point(.7,.45),point(.6,.45)]
export const SYNTHETIC_PATTERN:GuidePattern={id:'synthetic-disconnected-v1',version:1,
 desiredFrontStrokes:[stroke(a[1],a[2]),stroke(a[3],a[4]),stroke(b[0],b[1]),stroke(b[2],b[3])],
 desiredBackStrokes:[stroke(a[0],a[1]),stroke(a[2],a[3]),stroke(b[1],b[2]),stroke(b[3],b[4])],
 runs:[{id:'left',color,startSide:'front',targets:a,boundary:'new-thread'},{id:'right',color,startSide:'back',targets:b,boundary:'new-thread'}],
 presentation:{entry:'Synthetic fixture only',completion:'Fixture complete'}}

// Exact Captain Sam supplied coordinates and target edges. No alternatives.
const f={TL:point(.43,.34),TT:point(.5,.25),TR:point(.57,.34),RT:point(.66,.43),RR:point(.75,.5),RB:point(.66,.57),BR:point(.57,.66),BB:point(.5,.75),BL:point(.43,.66),LB:point(.34,.57),LL:point(.25,.5),LT:point(.34,.43),CL:point(.45,.5),CR:point(.55,.5),CT:point(.5,.45),CB:point(.5,.55)}
const flower=[['TL','TT'],['TT','TR'],['TR','TL'],['RT','RR'],['RR','RB'],['RB','RT'],['BR','BB'],['BB','BL'],['BL','BR'],['LB','LL'],['LL','LT'],['LT','LB'],['CT','CB'],['CL','CR']] as const
const h={TC:point(.5,.37),UL:point(.42,.32),LS:point(.34,.37),LM:point(.31,.47),LL:point(.35,.59),LB:point(.43,.68),BP:point(.5,.76),RB:point(.57,.68),RL:point(.65,.59),RM:point(.69,.47),RS:point(.66,.37),UR:point(.58,.32)}
const heart=[['TC','UL'],['UL','LS'],['LS','LM'],['LM','LL'],['LL','LB'],['LB','BP'],['BP','RB'],['RB','RL'],['RL','RM'],['RM','RS'],['RS','UR'],['UR','TC']] as const
const front=flower.map(([a,b])=>stroke(f[a],f[b])),back=heart.map(([a,b])=>stroke(h[a],h[b]))
const shortRuns=(strokes:TargetStroke[],startSide:'front'|'back',prefix:string):GuideRun[]=>strokes.map((s,i)=>({id:`${prefix}-${i}`,color,startSide,targets:[s.start,s.end],boundary:'new-thread'}))
export const FLOWER_HEART_PREFLIGHT:GuidePattern={id:'captain-flower-heart-preflight-v1',version:1,
 desiredFrontStrokes:front,desiredBackStrokes:back,
 // Explicit real one-puncture preparations preserve the existing first-puncture
 // parity. These are disclosed preflight mechanics, NOT a frozen public guide.
 runs:[{id:'prepare-front',color,startSide:'front',targets:[f.TL],boundary:'new-thread'},
  ...shortRuns(front,'back','flower'),
  {id:'prepare-back',color,startSide:'back',targets:[h.TC],boundary:'new-thread'},...shortRuns(back,'front','heart')],
 presentation:{entry:'Flower / heart preflight only',completion:'Preflight complete'}}

export function validatePattern(pattern:GuidePattern):{state:ThreadRunState;summary:Record<string,unknown>}{
 if(!pattern.id||!Number.isSafeInteger(pattern.version)||pattern.version<1||!pattern.runs.length||patternSteps(pattern).length>8001)throw new TypeError('Invalid pattern budget')
 const runIds=new Set<string>();let index=0,state=emptyThreadRuns()
 for(const run of pattern.runs){
  if(!run.id||runIds.has(run.id)||!run.targets.length||!/^#[a-f0-9]{6}$/.test(run.color))throw new TypeError('Invalid guide run')
  runIds.add(run.id)
  for(let i=0;i<run.targets.length;i++){
   const p=run.targets[i]!,previous=run.targets[i-1]
   if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||!isInsideFabric(p)||previous&&Math.hypot(p.x-previous.x,p.y-previous.y)<.018)throw new TypeError('Invalid guide point/distance')
   state=punctureGuideStep(state,pattern,index++,p,'running')
  }
  state=endThreadRun(state)
 }
 serializeThreadArtwork(state)
 for(const side of ['front','back'] as const){
  const expected=(side==='front'?pattern.desiredFrontStrokes:pattern.desiredBackStrokes).map(key).sort()
  const actual=state.topology.segments.filter(s=>s.side===side).map(key).sort()
  if(JSON.stringify(expected)!==JSON.stringify(actual))throw new TypeError(`Target stroke mismatch: ${side}`)
 }
 return {state,summary:{pattern:pattern.id,validation:'PASS',punctures:state.topology.punctures.length,segments:state.topology.segments.length,runs:state.runs.length,
  frontTargets:pattern.desiredFrontStrokes.length,backTargets:pattern.desiredBackStrokes.length,anchors:state.runs.reduce((n,r)=>n+Number(!!r.startAnchor)+Number(!!r.endAnchor),0),
  visualAcceptance:'NOT_IMPLIED_BY_VALIDATION',preparatoryRuns:pattern.runs.filter(r=>r.targets.length===1).map(r=>r.id)}}
}
