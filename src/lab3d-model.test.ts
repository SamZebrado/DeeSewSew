import { describe,it,expect } from 'vitest'
import { anchor,createImportOwnership,displayPoint,emptyLab,parseLab,pick,project,serializeLab,span,toggleSupport,worldAnchor } from './lab3d-model'
import { parseThreadArtwork } from './thread-run-storage'
describe('bounded independent sphere lab',()=>{
  it('invalidates delayed imports after newer imports and canonical edits',async()=>{
    const gate=createImportOwnership();let current='original',resolveA!:(s:string)=>void
    const a=new Promise<string>(resolve=>{resolveA=resolve}),tokenA=gate.start()
    const completion=a.then(raw=>{if(gate.owns(tokenA))current=raw})
    const tokenB=gate.start();if(gate.owns(tokenB)){current='newer';gate.invalidate()}
    resolveA('older');await completion;expect(current).toBe('newer')
    const pending=gate.start();gate.invalidate();expect(gate.owns(pending)).toBe(false)
    expect(current).toBe('newer')
  })
  it('artistic relaxation is bounded, endpoint exact and cadence independent',()=>{
    const p:[number,number,number]=[0,0,1]
    expect(displayPoint(p,.5,0)).toBe(p);expect(displayPoint(p,.5,1200)).toBe(p)
    for(const hz of [30,60,120])for(let i=0;i<=hz*1.2;i++){
      const t=i*1000/hz,q=displayPoint(p,.5,t)
      expect(Math.abs(q[2]-1)).toBeLessThanOrEqual(.07)
      expect(displayPoint(p,0,t)).toEqual(p)
    }
    const samples=[30,60,120].map(hz=>Array.from({length:hz+1},(_,i)=>({time:i/hz*1000,value:displayPoint(p,.5,i/hz*1000)})))
    for(const t of [100,300,600,900]){
      const values=samples.map(s=>s.find(v=>Math.abs(v.time-t)<1e-8)!.value)
      expect(values[0]).toEqual(values[1]);expect(values[1]).toEqual(values[2])
    }
    expect(p).toEqual([0,0,1])
  })
  it('exact nonidentity support restoration and save roundtrip',()=>{
    let a=anchor(emptyLab(),[0,0,1]);a={...a,support:{...a.support,transform:[2,-3,4]}}
    expect(worldAnchor(a,[0,0,1])).toEqual([2,-3,5])
    const camera={yaw:.3,pitch:.2,distance:3,target:a.support.transform}
    const picked=pick(.05,.07,camera)!
    expect(Math.hypot(picked[0]-2,picked[1]+3,picked[2]-4)).toBeCloseTo(1,10)
    expect(project(picked,camera)[0]).toBeCloseTo(.05,10)
    expect(project(picked,camera)[1]).toBeCloseTo(.07,10)
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
    expect(()=>parseLab(JSON.stringify({...p,support:{...p.support,state:'removed'}}))).toThrow('Permanent')
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
