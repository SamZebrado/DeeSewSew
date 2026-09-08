import {expect,test} from 'vitest'
import {emptyEmbroideryPiece,punctureFabric,parseArtworkFile,parseCanonicalThreadFragment,serializeEmbroideryPiece} from './embroidery-topology'

const style={type:'running' as const,color:'#9b4a48'}
function fixture(count:number) {
  let p=emptyEmbroideryPiece()
  for(let i=0;i<count;i++)p=punctureFabric(p,{x:i%2?.6:.4,y:.4+(i%5)*.02},style).piece
  return p
}
function outcome(parser:(raw:string)=>unknown,value:unknown) {
  try{return {accepted:true,value:parser(JSON.stringify(value))}}
  catch{return {accepted:false}}
}
test('small fragment optimization matches public canonical normalization at threshold and fallback',()=>{
  for(const count of [0,1,2,63,64,65,1000]){
    const value=fixture(count)
    expect(outcome(parseCanonicalThreadFragment,value)).toEqual(outcome(parseArtworkFile,value))
  }
})
test('malformed fragment boundaries retain exact accepted/rejected outcome',()=>{
  const mutations:((v:any)=>void)[]=[
    v=>v.schemaVersion=9,v=>v.punctures=null,v=>v.segments=null,
    v=>v.punctures[0].id='puncture-999',v=>v.punctures[0].order=1.5,
    v=>v.punctures[0].position={x:0,y:0},v=>v.punctures[0].fromSide='back',
    v=>v.punctures[0].toSide='front',v=>v.punctures[0].color='red',
    v=>v.punctures[0].seed=-1,v=>v.punctures[0].type='invalid',
    v=>v.segments[0].startPunctureId='puncture-3',v=>v.segments[0].endPunctureId='puncture-1',
    v=>v.segments[0].start={x:.5,y:.5},v=>v.segments[0].width=33,
    v=>v.segments[0].side='front',v=>v.segments[0].id='segment-99',
    v=>v.needle.side='front',v=>v.needle.lastPunctureId=null,
    v=>v.nextOrder=1,v=>v.nextOrder=1000000000,v=>v.nextOrder=999999999,
    v=>v.punctures[0].extra='x'.repeat(10000),
    v=>v.legacyFrontStitches=[{id:'old',order:10,type:'running',start:{x:.3,y:.3},end:{x:.4,y:.4},width:2,seed:1,color:'#9b4a48'}],
  ]
  for(const mutate of mutations){const value=fixture(3);mutate(value);expect(outcome(parseCanonicalThreadFragment,value)).toEqual(outcome(parseArtworkFile,value))}
})
test('small normalized and continued compatibility outputs stay far below storage headroom',()=>{
  const p=fixture(64)
  p.nextOrder=999999999
  expect(serializeEmbroideryPiece(p).length).toBeLessThan(800000)
  expect(serializeEmbroideryPiece(punctureFabric(p,{x:.5,y:.5},style).piece).length).toBeLessThan(800000)
  expect(()=>parseCanonicalThreadFragment('x'.repeat(2000001))).toThrow()
})
