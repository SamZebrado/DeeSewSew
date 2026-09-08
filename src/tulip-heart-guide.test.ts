import {expect,test} from 'vitest'
import {TULIP_HEART_PATTERN} from './tulip-heart-pattern'
import {validatePattern,SYNTHETIC_PATTERN} from './pattern-lab'
import {emptyThreadRuns,endThreadRun} from './thread-runs'
import {startTulipGuide,tulipGuideAction} from './tulip-heart-guide'
import {punctureGuideStep} from './guide-pattern'
test('accepted pattern and synthetic fixture match independent front/back target edge sets',()=>{
  expect(validatePattern(SYNTHETIC_PATTERN).summary.validation).toBe('PASS')
  const result=validatePattern(TULIP_HEART_PATTERN)
  expect(result.summary).toMatchObject({punctures:48,segments:24,runs:24,anchors:48,preparatoryRuns:[]})
})
test('guide requires each real cut, then derives exact progress without preparation runs',()=>{
  let state=emptyThreadRuns();const session=startTulipGuide(state)
  for(let index=0;index<48;index++){
    const action=tulipGuideAction(state,session)!
    expect(action.kind).toBe(index%2?'puncture':'start')
    if(!action.target)throw Error('target required')
    state=punctureGuideStep(state,TULIP_HEART_PATTERN,index,action.target,'running')
    if(index%2){expect(tulipGuideAction(state,session)!.kind).toBe('cut');state=endThreadRun(state)}
  }
  expect(tulipGuideAction(state,session)!.kind).toBe('done')
})
