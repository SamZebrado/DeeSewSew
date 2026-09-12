import type { Camera } from './lab3d-model'
export interface LabKey { key:string; focused:boolean; repeat?:boolean; ctrlKey?:boolean; metaKey?:boolean; altKey?:boolean }
export function labKey(input:LabKey,camera:Camera):Camera|'anchor'|'cancel'|null {
  if(!input.focused||input.ctrlKey||input.metaKey||input.altKey)return null
  switch(input.key){
    case 'Escape':return 'cancel'
    case 'Enter':return input.repeat?null:'anchor'
    case 'ArrowLeft':return {...camera,yaw:camera.yaw-.12}
    case 'ArrowRight':return {...camera,yaw:camera.yaw+.12}
    case 'ArrowUp':return {...camera,pitch:Math.max(-1.4,camera.pitch-.12)}
    case 'ArrowDown':return {...camera,pitch:Math.min(1.4,camera.pitch+.12)}
    case '+':case '=':return {...camera,distance:Math.max(2,camera.distance*.9)}
    case '-':return {...camera,distance:Math.min(7,camera.distance/ .9)}
    case 'Home':return {...camera,yaw:0,pitch:.15,distance:3.5}
    default:return null
  }
}
