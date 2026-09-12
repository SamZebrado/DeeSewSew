import { describe,it,expect } from 'vitest'
import { anchor,emptyLab,parseLab,pick,project,serializeLab,span,toggleSupport,worldAnchor } from './lab3d-model'
import { parseThreadArtwork } from './thread-run-storage'
describe('bounded independent sphere lab',()=>{
  it('exact nonidentity support restoration and save roundtrip',()=>{
    let a=anchor(emptyLab(),[0,0,1]);a={...a,support:{...a.support,transform:[2,-3,4]}}
    expect(worldAnchor(a,[0,0,1])).toEqual([2,-3,5])
    expect(toggleSupport(toggleSupport(a))).toEqual(a)
    expect(serializeLab(parseLab(serializeLab(a)))).toBe(serializeLab(a))
    expect(toggleSupport(a).run).toBe(a.run)
  })
  it('preserves spatial depth and perspective ray intersection across orbit',()=>{
    for(const yaw of [0,.7,2,4]){const c={yaw,pitch:.2,distance:3};const p=pick(.08,-.05,c)!;const projected=project(p,c);expect(projected[0]).toBeCloseTo(.08,10);expect(projected[1]).toBeCloseTo(-.05,10);expect(Math.hypot(...p)).toBeCloseTo(1,10)}
    const path=span([0,0,1],[1,0,0]);expect(path[12]![2]).toBeGreaterThan(.7);expect(path.every(p=>Math.abs(Math.hypot(...p)-1)<1e-10)).toBe(true)
    expect(pick(5,5,{yaw:0,pitch:0,distance:3})).toBeNull()
  })
  it('rejects removed/permanent edits and ambiguous spans',()=>{
    expect(()=>anchor(toggleSupport(emptyLab()),[0,0,1])).toThrow()
    const a=anchor(emptyLab(),[0,0,1]);expect(()=>anchor(a,[0,0,-1])).toThrow()
    const p={...a,support:{...a.support,role:'permanent' as const}};expect(toggleSupport(p)).toBe(p)
  })
  it('rejects public format and malformed values; public parser rejects lab',()=>{
    expect(()=>parseLab('{"schemaVersion":4}')).toThrow()
    expect(()=>parseThreadArtwork(serializeLab(emptyLab()))).toThrow()
    for(const transform of [[null,0,0],[11,0,0],[0,0]])expect(()=>parseLab(JSON.stringify({...emptyLab(),support:{...emptyLab().support,transform}}))).toThrow()
    expect(()=>parseLab(' '.repeat(16001))).toThrow()
  })
  it('bounds canonical anchor count',()=>{
    let a=emptyLab();for(let i=0;i<32;i++)a=anchor(a,[Math.sin(i*.1),0,Math.cos(i*.1)])
    expect(()=>anchor(a,[0,1,0])).toThrow('32 anchors')
  })
})
