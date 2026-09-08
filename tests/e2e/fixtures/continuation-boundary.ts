/** Generated fixture: no large JSON artifact and no user's artwork. Domain is
 * injected so the isolated audit branch can validate against release modules. */
export function capacityBoundaryFixture(domain:any,serialize:(state:any)=>string) {
  const style={type:'running',color:'#9b4a48'}
  let state=domain.emptyThreadRuns()
  for(let i=0;i<1750;i++) {
    state=domain.startThreadAt(state,i%2?'back':'front',{x:.4,y:.4},style)
    state=domain.punctureThreadRun(state,{x:.6,y:.6},style)
    state=domain.endThreadRun(state)
  }
  state=domain.startThreadAt(state,'front',{x:.4,y:.4},style)
  const wire=()=>JSON.stringify({...state.topology,schemaVersion:4,runs:state.runs,activeRunId:state.activeRunId})
  let length=wire().length
  // Count serialized references, not object identity; several may share a point.
  const positions=new Map<string,any[]>()
  for(const p of state.topology.punctures)positions.set(p.id,[p.position])
  for(const s of state.topology.segments){positions.get(s.startPunctureId)!.push(s.start);positions.get(s.endPunctureId)!.push(s.end)}
  for(const r of state.runs)for(const a of[r.startAnchor,r.endAnchor])if(a)positions.get(a.punctureId)!.push(a.position)
  positions.get(state.topology.needle.lastPunctureId)!.push(state.topology.needle.position)
  for(const refs of positions.values()) {
    const oldLength=JSON.stringify(refs[0].x).length
    const room=Math.floor((1995880-length)/refs.length)
    if(room<1)continue
    const value=Number('0.'+'4'.repeat(Math.min(16,room+oldLength-2)))
    const growth=(JSON.stringify(value).length-oldLength)*refs.length
    if(growth<=0||length+growth>1995880)continue
    for(const p of refs)p.x=value
    length+=growth
  }
  const raw=serialize(state)
  if(raw.length<1995800||raw.length>1995904)throw Error(`Fixture capacity mismatch ${raw.length}`)
  return raw
}

export const namespaceBoundaryFixture=JSON.stringify({schemaVersion:1,nextOrder:999999998,stitches:[{
  id:'run-999999998',order:1,type:'running',start:{x:.3,y:.3},end:{x:.4,y:.4},width:2,seed:1,color:'#9b4a48',
}]})
