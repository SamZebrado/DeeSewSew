import { expect, test } from 'vitest'
import { emptyThreadRuns, endThreadRun, punctureThreadRun, adoptThreadRuns } from './thread-runs'
import { parseThreadArtwork, serializeThreadArtwork } from './thread-run-storage'
import { emptyEmbroideryPiece, punctureFabric, serializeEmbroideryPiece } from './embroidery-topology'

const red = { type: 'running' as const, color: '#9b4a48' }
test('normalized v4 strips extras and accepts equivalent coordinate key order',()=>{
  const raw=JSON.parse(serializeThreadArtwork(sample()))
  raw.punctures[0].extra='x'.repeat(100000)
  raw.punctures[0].position={y:raw.punctures[0].position.y,x:raw.punctures[0].position.x}
  raw.runs[0].startAnchor.extra='ignored'
  const checked=parseThreadArtwork(JSON.stringify(raw))
  expect(checked).toEqual(sample())
})
test.each(['run-2','run-2-start','run-2-end'])('legacy %s identity survives a new run without collision',id=>{
  const source={schemaVersion:1,nextOrder:2,stitches:[{id,order:1,type:'running',start:{x:.3,y:.3},end:{x:.4,y:.4},color:'#9b4a48',width:2.4,seed:1}]}
  const loaded=parseThreadArtwork(JSON.stringify(source))
  const next=punctureThreadRun(loaded,{x:.5,y:.5},red)
  expect(next.topology.legacyFrontStitches[0]!.id).toBe(id)
  expect(next.runs[0]!.id).toBe('run-3')
  expect(parseThreadArtwork(serializeThreadArtwork(next))).toEqual(next)
})
test('order exhaustion rejects cut and puncture before producing unsaveable state',()=>{
  const s=sample();s.topology={...s.topology,nextOrder:999999999}
  const loaded=parseThreadArtwork(serializeThreadArtwork(s))
  expect(()=>endThreadRun(loaded)).toThrow(/order limit/)
  expect(()=>punctureThreadRun(loaded,{x:.5,y:.5},red)).toThrow(/order limit/)
  expect(parseThreadArtwork(serializeThreadArtwork(loaded))).toEqual(loaded)
})
function sample() {
  let s = emptyThreadRuns()
  for (const [x, y] of [[.3,.3],[.4,.4],[.5,.3]]) s = punctureThreadRun(s, { x, y }, red)
  s = endThreadRun(s)
  for (const [x,y] of [[.6,.5],[.7,.6]]) s = punctureThreadRun(s, {x,y}, red)
  return s
}
test('v4 deterministic roundtrip preserves active and ended runs and back-side starts', () => {
  for (const s of [emptyThreadRuns(), sample(), endThreadRun(sample())]) {
    const raw = serializeThreadArtwork(s)
    expect(JSON.parse(raw).schemaVersion).toBe(4)
    expect(parseThreadArtwork(raw)).toEqual(s)
    expect(serializeThreadArtwork(parseThreadArtwork(raw))).toBe(raw)
  }
})
test('legacy v3 mixed colors remain visually and historically intact', () => {
  let p = punctureFabric(emptyEmbroideryPiece(), { x:.3,y:.3 }, red).piece
  p = punctureFabric(p,{x:.4,y:.4},{...red,color:'#55765b'}).piece
  const raw = serializeEmbroideryPiece(p), s = parseThreadArtwork(raw)
  expect(s.topology).toEqual(p)
  expect(s.runs[0]!.color).toBeNull()
  expect(parseThreadArtwork(serializeThreadArtwork(adoptThreadRuns(p)))).toEqual(s)
})
test('invalid v4 ownership, boundaries, sides, colors, order and future schema fail closed', () => {
  const raw = serializeThreadArtwork(sample())
  const mutations: ((x:any)=>void)[] = [
    x=>x.schemaVersion=5,
    x=>x.runs[1].id=x.runs[0].id,
    x=>x.runs[1].punctureIds[0]=x.runs[0].punctureIds[0],
    x=>x.runs[1].segmentIds[0]=x.runs[0].segmentIds[0],
    x=>x.activeRunId=x.runs[0].id,
    x=>x.runs[0].endOrder=null,
    x=>x.runs[0].endOrder=x.punctures[0].order,
    x=>x.runs[1].color='#55765b',
    x=>x.runs[1].startSide='front',
    x=>x.punctures[3].fromSide='sideways',
    x=>x.punctures[0].position.x=2,
    x=>x.segments[1].startPunctureId=x.punctures[0].id,
    x=>x.punctures.reverse(),
    x=>x.needle.side='front',
    x=>x.runs.push({...x.runs[0],id:'run-999',punctureIds:[],segmentIds:[]}),
  ]
  for(const change of mutations){const value=JSON.parse(raw);change(value);expect(()=>parseThreadArtwork(JSON.stringify(value))).toThrow()}
})
