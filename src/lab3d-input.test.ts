import { expect,it } from 'vitest'
import { labKey } from './lab3d-input'
it('lab keyboard ignores other controls, modifiers and repeated Enter',()=>{
  const c={yaw:0,pitch:0,distance:3}
  for(const extra of [{focused:false},{ctrlKey:true},{metaKey:true},{altKey:true}])expect(labKey({key:'Enter',focused:true,...extra},c)).toBeNull()
  expect(labKey({key:'Enter',focused:true,repeat:true},c)).toBeNull()
  expect(labKey({key:'Enter',focused:true},c)).toBe('anchor')
  expect(labKey({key:'Escape',focused:true},c)).toBe('cancel')
  expect(c).toEqual({yaw:0,pitch:0,distance:3})
})
it('camera commands are bounded and leave input untouched',()=>{
  const c={yaw:0,pitch:1.4,distance:7}
  expect(labKey({key:'ArrowDown',focused:true},c)).toEqual(c)
  expect(labKey({key:'-',focused:true},c)).toEqual(c)
  expect(labKey({key:'+',focused:true},{...c,distance:2})).toEqual({...c,distance:2})
  expect(labKey({key:'Home',focused:true},c)).toEqual({yaw:0,pitch:.15,distance:3.5})
})
