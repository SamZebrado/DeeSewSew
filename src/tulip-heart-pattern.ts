import type { GuidePattern, GuideRun, TargetStroke } from './guide-pattern'
import type { NormalizedPoint } from './stitch-model'

// Exact Captain Sam accepted High revision. Changes require the visual STOP gate.
export const FRONT_TULIP_POINTS = {
  BL:{x:.41,y:.46},L1:{x:.38,y:.40},LT:{x:.39,y:.31},LV:{x:.46,y:.36},
  CT:{x:.50,y:.28},RV:{x:.54,y:.36},RT:{x:.61,y:.31},R1:{x:.62,y:.40},
  BR:{x:.59,y:.46},M:{x:.50,y:.47},SM:{x:.50,y:.60},SB:{x:.50,y:.74},
} as const
export const FRONT_TULIP_SEGMENTS = [
  ['BL','L1'],['L1','LT'],['LT','LV'],['LV','CT'],['CT','RV'],['RV','RT'],
  ['RT','R1'],['R1','BR'],['BR','M'],['M','BL'],['M','SM'],['SM','SB'],
] as const
export const BACK_HEART_POINTS = {
  TC:{x:.50,y:.39},UL:{x:.43,y:.32},LS:{x:.35,y:.34},LM:{x:.30,y:.46},
  LL:{x:.34,y:.59},LB:{x:.42,y:.69},BP:{x:.50,y:.77},RB:{x:.58,y:.69},
  RL:{x:.66,y:.59},RM:{x:.70,y:.46},RS:{x:.65,y:.34},UR:{x:.57,y:.32},
} as const
export const BACK_HEART_SEGMENTS = [
  ['TC','UL'],['UL','LS'],['LS','LM'],['LM','LL'],['LL','LB'],['LB','BP'],
  ['BP','RB'],['RB','RL'],['RL','RM'],['RM','RS'],['RS','UR'],['UR','TC'],
] as const
const color='#9b4a48'
const stroke=(start:NormalizedPoint,end:NormalizedPoint):TargetStroke=>({start,end,color})
const front=FRONT_TULIP_SEGMENTS.map(([a,b])=>stroke(FRONT_TULIP_POINTS[a],FRONT_TULIP_POINTS[b]))
const back=BACK_HEART_SEGMENTS.map(([a,b])=>stroke(BACK_HEART_POINTS[a],BACK_HEART_POINTS[b]))
const runs=(strokes:readonly TargetStroke[],visibleSide:'front'|'back'):GuideRun[] => strokes.map((s,i)=>({
  id:`${visibleSide}-${i}`,color,visibleSide,startSide:visibleSide==='front'?'back':'front',
  targets:[s.start,s.end],boundary:'new-thread',
}))
export const TULIP_HEART_PATTERN:GuidePattern={
  id:'tulip-heart-v1',version:1,desiredFrontStrokes:front,desiredBackStrokes:back,
  runs:[...runs(front,'front'),...runs(back,'back')],
  presentation:{entry:'Tulip & heart',completion:'Tulip and heart complete'},
}
