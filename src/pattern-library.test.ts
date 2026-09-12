import { afterEach, expect, test, vi } from 'vitest'
import { PATTERN_LIBRARY, LEAF_PATTERN, CHERRIES_PATTERN } from './pattern-library'
import { validatePattern } from './pattern-lab'
import { emptyThreadRuns, endThreadRun } from './thread-runs'
import { patternSteps, punctureGuideStep, type GuidePattern } from './guide-pattern'
import { runGuideAction } from './run-guide'
import { loadTulipGuide, startTulipGuide, tulipGuideAction } from './tulip-heart-guide'
import { parseThreadArtwork, serializeThreadArtwork } from './thread-run-storage'

afterEach(()=>vi.unstubAllGlobals())
test('four bounded content entries use real target geometry and ThreadRuns',()=>{
  expect(PATTERN_LIBRARY).toHaveLength(4)
  expect(new Set(PATTERN_LIBRARY.map(p=>p.id)).size).toBe(4)
  for(const pattern of [LEAF_PATTERN,CHERRIES_PATTERN]){
    const {state,summary}=validatePattern(pattern)
    expect(summary.validation).toBe('PASS')
    expect(state.runs.length).toBe(pattern.desiredFrontStrokes.length)
    expect(state.topology.segments.filter(s=>s.side==='back')).toHaveLength(0)
    expect(serializeThreadArtwork(parseThreadArtwork(serializeThreadArtwork(state)))).toBe(serializeThreadArtwork(state))
  }
})
test.each([LEAF_PATTERN,CHERRIES_PATTERN])('$id progresses only after canonical puncture/cut and survives artwork reload',pattern=>{
  let state=emptyThreadRuns();const session=startTulipGuide(state,pattern.id)
  const total=patternSteps(pattern).length
  for(let index=0;index<total;index++){
    const action=tulipGuideAction(state,session)!
    expect(action.index).toBe(index)
    expect(action.kind).toBe(index%2?'puncture':'start')
    state=punctureGuideStep(state,pattern,index,action.target!,'running')
    state=parseThreadArtwork(serializeThreadArtwork(state))
    if(index%2){expect(tulipGuideAction(state,session)!.kind).toBe('cut');state=endThreadRun(state)}
  }
  expect(tulipGuideAction(state,session)!.kind).toBe('done')
})
test('generic executor supports longer runs and derives face from content rather than fixed parity thresholds',()=>{
  const pattern:GuidePattern={id:'long-test',version:1,desiredFrontStrokes:[],desiredBackStrokes:[],presentation:{entry:'Test',completion:'Done'},runs:[
    {id:'back',color:'#55765b',startSide:'front',visibleSide:'back',boundary:'new-thread',targets:[{x:.3,y:.3},{x:.4,y:.4},{x:.5,y:.5}]},
    {id:'front',color:'#9b4a48',startSide:'back',visibleSide:'front',boundary:'new-thread',targets:[{x:.6,y:.6},{x:.7,y:.5}]},
  ]}
  let state=emptyThreadRuns()
  for(let i=0;i<3;i++){
    const a=runGuideAction(state,pattern,1)!
    expect(a.kind).toBe(i===0?'start':'puncture');expect(a.side).toBe('back')
    state=punctureGuideStep(state,pattern,i,a.target!,'running')
    if(i===0)expect(runGuideAction(endThreadRun(state),pattern,1)).toBeNull()
  }
  expect(runGuideAction(state,pattern,1)!.kind).toBe('cut')
  state=endThreadRun(state)
  expect(runGuideAction(state,pattern,1)).toMatchObject({kind:'start',side:'front',index:3})
})
test('guide version rejects changed/unknown content, narrowly accepts old tulip session and never changes artwork',()=>{
  const state=emptyThreadRuns(),before=serializeThreadArtwork(state)
  const load=(source:unknown)=>{vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify(source)});return loadTulipGuide(state)}
  expect(load({version:1,patternId:'tulip-heart-v1',startOrder:1})).toMatchObject({patternVersion:1})
  const session=startTulipGuide(state,LEAF_PATTERN.id)
  expect(load(session)).toEqual(session)
  for(const bad of [{...session,patternVersion:2},{...session,patternVersion:undefined},{...session,patternId:'unknown'},{...session,startOrder:2},{...session,startOrder:-1}])expect(load(bad)).toBeNull()
  expect(serializeThreadArtwork(state)).toBe(before)
})
