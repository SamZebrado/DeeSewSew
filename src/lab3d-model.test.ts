import { describe,it,expect } from 'vitest'
import { anchor,createImportOwnership,displayPoint,emptyLab,finishRun,parseLab,pick,project,serializeLab,span,startRun,toggleSupport,worldAnchor } from './lab3d-model'
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
    expect(toggleSupport(a).runs).toBe(a.runs)
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
    expect(()=>parseLab(' '.repeat(128*1024+1))).toThrow()
  })
  it('bounds canonical anchor count',()=>{
    let a=emptyLab();for(let i=0;i<32;i++)a=anchor(a,[Math.sin(i*.1),0,Math.cos(i*.1)])
    expect(()=>anchor(a,[0,1,0])).toThrow('32 anchors')
  })
  it('migrates actual v1 null and single-anchor records with support state intact',()=>{
    const old={format:'deesewsew-lab3d',version:1,support:{id:'sphere-1',shape:'sphere',radius:1,transform:[2,-3,4],role:'removable',state:'removed'},run:null,display:'artistic-rest-shape'}
    const empty=parseLab(JSON.stringify(old));expect(empty.version).toBe(2);expect(empty.runs).toEqual([]);expect(empty.support.transform).toEqual([2,-3,4]);expect(empty.support.state).toBe('removed')
    const one=parseLab(JSON.stringify({...old,run:{id:'run-1',color:'#9b4a48',anchors:[[0,0,1]],path:'great-circle-v1'}}))
    expect(one.runs).toEqual([{id:'run-1',color:'#9b4a48',anchors:[[0,0,1]],path:'great-circle-v1',state:'open'}])
    expect(one.activeRunId).toBe('run-1');expect(parseLab(serializeLab(one))).toEqual(one)
    const permanent=parseLab(JSON.stringify({...old,support:{...old.support,role:'permanent',state:'installed'}}));expect(permanent.support.role).toBe('permanent')
  })
  it('tracks ordered runs and keeps completed runs immutable',()=>{
    let a=anchor(emptyLab(),[0,0,1]);a=finishRun(a)
    expect(a.activeRunId).toBeNull();expect(()=>anchor(a,[1,0,0])).toThrow('Start a new run')
    expect(()=>startRun({...a,support:{...a.support,state:'removed'}},'#123456')).toThrow()
    a=startRun(a,'#123456');expect(()=>startRun(a)).toThrow('Finish')
    a=anchor(a,[1,0,0]);a=finishRun(a)
    expect(a.runs.map(r=>r.id)).toEqual(['run-1','run-2'])
    expect(a.runs.map(r=>r.color)).toEqual(['#9b4a48','#123456'])
    expect(a.runs.map(r=>r.state)).toEqual(['completed','completed'])
    expect(parseLab(serializeLab(a))).toEqual(a)
    expect(a.runs[0]!.anchors).toEqual([[0,0,1]])
  })
  it('rejects bad IDs, colors, active ownership, and run bounds',()=>{
    const first=anchor(emptyLab(),[0,0,1])
    for(const bad of [
      {...first,runs:[{...first.runs[0],id:'run-2'}]},
      {...first,runs:[{...first.runs[0],color:'red'}]},
      {...first,activeRunId:null},
      {...first,runs:[{...first.runs[0],state:'completed'}]},
      {...first,runs:[{...first.runs[0],anchors:[[0,0,-1]]}],activeRunId:'run-2'},
    ])expect(()=>parseLab(JSON.stringify(bad))).toThrow()
    expect(()=>startRun(emptyLab(),'#xyzxyz')).toThrow()
    let a=finishRun(first)
    for(let i=2;i<=8;i++)a=finishRun(anchor(startRun(a),[0,0,1]))
    expect(a.runs).toHaveLength(8);expect(()=>startRun(a)).toThrow('8 runs')
    expect(()=>parseLab(JSON.stringify({...a,runs:[...a.runs,a.runs[0]]}))).toThrow()
  })
  it('migrates the captured public v1 multi-anchor geometry without changing coordinates',()=>{
    // Captured in ../DeeSewSew-pressure-release/review/public-playtest-20260928/evidence/lab-v1.json.
    const anchors=[[-0.6060965005420977,0.07587908784249452,0.79176347229385],[-0.28908341742610383,0.4027387804967832,0.8684654584111039],[0.28908341742610383,0.4027387804967832,0.8684654584111039],[0.6060965005420977,0.07587908784249452,0.79176347229385],[0.2915778422601489,-0.1954998095964109,0.9363558011518287],[-0.2915778422601489,-0.1954998095964109,0.9363558011518287],[-0.6060965005420977,0.07587908784249452,0.79176347229385]]
    const legacy={format:'deesewsew-lab3d',version:1,support:{id:'sphere-1',shape:'sphere',radius:1,transform:[2,-3,4],role:'removable',state:'removed'},run:{id:'run-1',color:'#9b4a48',anchors,path:'great-circle-v1'},display:'artistic-rest-shape'}
    const migrated=parseLab(JSON.stringify(legacy))
    expect(migrated.runs[0]!.anchors).toEqual(anchors)
    expect(migrated.support.transform).toEqual([2,-3,4])
    expect(migrated.support.state).toBe('removed')
    expect(parseLab(serializeLab(migrated))).toEqual(migrated)
  })
  it('rejects missing or malformed legacy run and malformed v2 run slots',()=>{
    const legacy={format:'deesewsew-lab3d',version:1,support:emptyLab().support,display:'artistic-rest-shape'}
    expect(()=>parseLab(JSON.stringify(legacy))).toThrow()
    expect(()=>parseLab(JSON.stringify({...legacy,run:undefined}))).toThrow()
    for(const run of [null,undefined])expect(()=>parseLab(JSON.stringify({...emptyLab(),runs:[run]}))).toThrow()
    const open=startRun(emptyLab())
    expect(parseLab(serializeLab(open))).toEqual(open)
    expect(()=>finishRun(open)).toThrow('anchor')
    expect(()=>parseLab(JSON.stringify({...open,runs:[{...open.runs[0],state:'completed'}],activeRunId:null}))).toThrow()
    const closed=finishRun(anchor(open,[0,0,1]))
    expect(()=>parseLab(JSON.stringify({...closed,runs:[closed.runs[0],closed.runs[0]]}))).toThrow()
    expect(()=>parseLab(JSON.stringify({...closed,runs:[{...closed.runs[0],state:'open'}, {...closed.runs[0],id:'run-2',state:'open'}],activeRunId:'run-2'}))).toThrow()
    expect(()=>parseLab(JSON.stringify({...closed,runs:[{...closed.runs[0],state:'open'}, {...closed.runs[0],id:'run-2'}],activeRunId:'run-1'}))).toThrow()
  })
  it('roundtrips all 8 runs with 32 canonical anchors each',()=>{
    let a=emptyLab()
    for(let run=0;run<8;run++){
      a=startRun(a,`#${(run+1).toString(16).padStart(6,'0')}`)
      for(let i=0;i<32;i++)a=anchor(a,[Math.sin(i*.1),0,Math.cos(i*.1)])
      a=finishRun(a)
    }
    expect(a.runs.map(r=>r.id)).toEqual(Array.from({length:8},(_,i)=>`run-${i+1}`))
    expect(a.runs.every(r=>r.anchors.length===32&&r.state==='completed')).toBe(true)
    expect(parseLab(serializeLab(a))).toEqual(a)
  })
})
