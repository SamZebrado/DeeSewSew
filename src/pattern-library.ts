import { FLOWER } from './flower-pattern'
import { TULIP_HEART_PATTERN } from './tulip-heart-pattern'
import type { GuidePattern, TargetStroke } from './guide-pattern'
import type { NormalizedPoint } from './stitch-model'

type Point = readonly [number, number]
const point = ([x,y]:Point):NormalizedPoint => ({x,y})
/** Every visible edge is one real, explicitly cut ThreadRun. No hidden connectors. */
function outline(id:string, title:string, paths:readonly {color:string; points:readonly Point[]}[]):GuidePattern {
  const strokes:TargetStroke[] = paths.flatMap(path => path.points.slice(1).map((end,i) => ({start:point(path.points[i]!),end:point(end),color:path.color})))
  return {id,version:1,desiredFrontStrokes:strokes,desiredBackStrokes:[],
    runs:strokes.map((s,i)=>({id:`${id}-${i}`,color:s.color,startSide:'back',visibleSide:'front',targets:[s.start,s.end],boundary:'new-thread'})),
    presentation:{entry:title,completion:'Pattern complete. Your stitches are yours to keep.'}}
}
export const LEAF_PATTERN = outline('little-leaf-v1','Little leaf',[
  {color:'#55765b',points:[[.32,.70],[.29,.52],[.38,.35],[.64,.28],[.70,.46],[.61,.63],[.32,.70]]},
  {color:'#55765b',points:[[.28,.76],[.64,.28]]},
  {color:'#55765b',points:[[.44,.55],[.32,.46]]},
  {color:'#55765b',points:[[.50,.47],[.66,.47]]},
])
export const CHERRIES_PATTERN = outline('two-cherries-v1','Two cherries',[
  {color:'#9b4a48',points:[[.34,.52],[.25,.57],[.26,.69],[.35,.75],[.44,.69],[.45,.57],[.34,.52]]},
  {color:'#9b4a48',points:[[.65,.53],[.55,.59],[.57,.71],[.66,.77],[.75,.70],[.75,.59],[.65,.53]]},
  {color:'#55765b',points:[[.34,.52],[.46,.35],[.57,.26],[.65,.53]]},
])
export type PatternContent = {
  id:string; version:number; title:string; difficulty:'Easy'; palette:readonly string[]
} & ({kind:'flower'} | {kind:'runs'; pattern:GuidePattern})
export const PATTERN_LIBRARY:readonly PatternContent[] = [
  {id:FLOWER.id,version:1,title:FLOWER.entry,difficulty:'Easy',palette:[],kind:'flower'},
  ...[TULIP_HEART_PATTERN,LEAF_PATTERN,CHERRIES_PATTERN].map(pattern=>({id:pattern.id,version:pattern.version,title:pattern.presentation.entry,difficulty:'Easy' as const,palette:[...new Set(pattern.runs.map(run=>run.color))],kind:'runs' as const,pattern})),
]
export function libraryPattern(id:string):GuidePattern|undefined {
  const content=PATTERN_LIBRARY.find(entry=>entry.id===id)
  return content?.kind==='runs'?content.pattern:undefined
}
