import { topologyRenderItems, type SurfaceSide } from './embroidery-topology'
import type { Stitch } from './stitch-model'
import type { ThreadRunState } from './thread-runs'

/** Commit-time adapter only. Renderer receives canonical anchors, not guide art. */
export function threadRunRenderItems(state:ThreadRunState,side:SurfaceSide):Stitch[]{
 const items=topologyRenderItems(state.topology,side)
 for(const run of state.runs)for(const anchor of [run.startAnchor,run.endAnchor]){
  if(!anchor||anchor.side!==side)continue
  items.push({id:anchor.id,type:'running',start:anchor.position,end:anchor.position,color:anchor.color,width:2.4,order:anchor.order*2+1,seed:anchor.order,renderKind:'anchor'})
 }
 return items.sort((a,b)=>a.order-b.order)
}
