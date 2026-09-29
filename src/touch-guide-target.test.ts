import {describe,it,expect} from 'vitest'
import {touchesGuideTarget} from './touch-guide-target'
describe('touch guide target screen-space affordance',()=>{
 it('uses a bounded 44px diameter around the projected marker',()=>{
  const target={clientX:100,clientY:200};expect(touchesGuideTarget(100,200,target)).toBe(true);expect(touchesGuideTarget(122,200,target)).toBe(true);expect(touchesGuideTarget(122.01,200,target)).toBe(false);expect(touchesGuideTarget(100,234,target)).toBe(false);expect(target).toEqual({clientX:100,clientY:200});
 });
 it('rejects missing, hidden-by-caller and nonfinite projections',()=>{
  expect(touchesGuideTarget(0,0,null)).toBe(false);expect(touchesGuideTarget(NaN,0,{clientX:0,clientY:0})).toBe(false);expect(touchesGuideTarget(0,0,{clientX:Infinity,clientY:0})).toBe(false);
 });
});
