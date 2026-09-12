import { anchor, emptyLab, parseLab, pick, project, serializeLab, span, toggleSupport, type Camera, type LabArtwork, type Vec3 } from './lab3d-model'
import './lab3d.css'

document.querySelector('#lab')!.innerHTML = `<header><h1>3D Lab — Experimental / 实验室</h1><p>Desktop-first sphere study. Surface-laid thread, not through-fabric stitching.</p><p>Drag to orbit · Wheel to zoom · Click in Thread tool to place a 3D anchor.</p></header><nav><button id="tool">Thread tool / 放线</button><button id="support">Remove support / 移除支撑</button><button id="undo">Undo</button><button id="redo">Redo</button><button id="save">Save lab</button><button id="load">Load lab</button><button id="download">Export lab JSON</button><label>Import lab <input id="import" type="file" accept=".json"></label></nav><p id="status" role="status"></p><canvas aria-label="Experimental sphere and spatial thread" tabindex="0"></canvas><p>Artistic rest-shape display constraint / 艺术性静止造型：removed support preserves the intentional rest pose. Not a real silk equilibrium simulation. Separate experimental data; normal artwork is never read or written.</p>`
const canvas=document.querySelector('canvas')!, ctx=canvas.getContext('2d')!
const status=document.querySelector<HTMLElement>('#status')!
let artwork=emptyLab(), camera:Camera={yaw:0,pitch:0.15,distance:3.5}, editing=false
let past:LabArtwork[]=[], future:LabArtwork[]=[]
const key='deesewsew.experimental.sphere.v1'
let width=800,height=550
function draw() {
  ctx.clearRect(0,0,width,height)
  const f=Math.min(width,height)*1.25
  const screen=(p:Vec3)=>{ const v=project(p,camera);return [width/2+v[0]*f,height/2+v[1]*f,v[2]] as Vec3 }
  if(artwork.support.state==='installed'){
    const r=f/Math.sqrt(camera.distance**2-1)
    const g=ctx.createRadialGradient(width/2-r*.3,height/2-r*.35,r*.1,width/2,height/2,r)
    g.addColorStop(0,'#faf5e7');g.addColorStop(1,'#b9b7a5');ctx.fillStyle=g;ctx.beginPath();ctx.arc(width/2,height/2,r,0,Math.PI*2);ctx.fill()
  }
  const lines:{a:Vec3;b:Vec3}[]=[]
  const points=artwork.run?.anchors??[]
  for(let i=1;i<points.length;i++){ const path=span(points[i-1]!,points[i]!);for(let j=1;j<path.length;j++)lines.push({a:screen(path[j-1]!),b:screen(path[j]!)}) }
  lines.sort((a,b)=>(b.a[2]+b.b[2])-(a.a[2]+a.b[2]))
  for(const line of lines){
    const hidden=artwork.support.state==='installed'&&(line.a[2]+line.b[2])/2>camera.distance-1/camera.distance
    if(hidden)continue
    ctx.strokeStyle='#9b4a48';ctx.lineWidth=3.2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(line.a[0],line.a[1]);ctx.lineTo(line.b[0],line.b[1]);ctx.stroke()
  }
  for(const p of points){const v=screen(p);if(artwork.support.state==='installed'&&v[2]>camera.distance-1/camera.distance)continue;ctx.fillStyle='#663633';ctx.beginPath();ctx.arc(v[0],v[1],4,0,Math.PI*2);ctx.fill()}
  document.querySelector('#support')!.textContent=artwork.support.state==='installed'?'Remove support / 移除支撑':'Reinstall support / 恢复支撑'
  document.querySelector<HTMLButtonElement>('#undo')!.disabled=!past.length
  document.querySelector<HTMLButtonElement>('#redo')!.disabled=!future.length
  canvas.dataset.canonical=serializeLab(artwork)
  canvas.dataset.camera=JSON.stringify(camera)
}
function commit(next:LabArtwork){past=[...past.slice(-63),artwork];future=[];artwork=next;status.textContent=`${artwork.run?.anchors.length??0}/32 anchors · ${artwork.support.state}`;draw()}
function safe(fn:()=>void){try{fn()}catch(e){status.textContent=e instanceof Error?e.message:'Lab operation failed'}}
document.querySelector('#tool')!.addEventListener('click',()=>{editing=!editing;document.querySelector('#tool')!.textContent=editing?'Camera tool / 查看':'Thread tool / 放线';status.textContent=editing?'Click sphere to start / extend the run. Drag still orbits.':'Camera only: clicks never edit.'})
document.querySelector('#support')!.addEventListener('click',()=>commit(toggleSupport(artwork)))
document.querySelector('#undo')!.addEventListener('click',()=>{if(!past.length)return;future.push(artwork);artwork=past.pop()!;draw()})
document.querySelector('#redo')!.addEventListener('click',()=>{if(!future.length)return;past.push(artwork);artwork=future.pop()!;draw()})
document.querySelector('#save')!.addEventListener('click',()=>safe(()=>{localStorage.setItem(key,serializeLab(artwork));status.textContent='Experimental lab saved locally.'}))
document.querySelector('#load')!.addEventListener('click',()=>safe(()=>commit(parseLab(localStorage.getItem(key)??''))))
document.querySelector('#download')!.addEventListener('click',()=>safe(()=>{const url=URL.createObjectURL(new Blob([serializeLab(artwork)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='sphere.deesewsew-lab3d.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}))
document.querySelector<HTMLInputElement>('#import')!.addEventListener('change',async e=>{const input=e.target as HTMLInputElement,file=input.files?.[0];if(!file)return;try{if(file.size>16000)throw Error('Lab file too large');commit(parseLab(await file.text()))}catch(e){status.textContent=String(e)}finally{input.value=''}})
let gesture:{id:number;x:number;y:number;lastX:number;lastY:number;drag:boolean}|null=null
canvas.addEventListener('pointerdown',e=>{if(gesture||e.button!==0)return;gesture={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,drag:false};canvas.setPointerCapture(e.pointerId)})
canvas.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;gesture.drag ||= Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>5;if(gesture.drag){camera={...camera,yaw:camera.yaw+(e.clientX-gesture.lastX)*.008,pitch:Math.max(-1.4,Math.min(1.4,camera.pitch+(e.clientY-gesture.lastY)*.008))};draw()}gesture.lastX=e.clientX;gesture.lastY=e.clientY})
canvas.addEventListener('pointerup',e=>{if(!gesture||gesture.id!==e.pointerId)return;const click=!gesture.drag&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<=5;gesture=null;if(!click||!editing)return;safe(()=>{const r=canvas.getBoundingClientRect(),f=Math.min(width,height)*1.25,p=pick((e.clientX-r.left-width/2)/f,(e.clientY-r.top-height/2)/f,camera);if(p)commit(anchor(artwork,p))})})
canvas.addEventListener('pointercancel',()=>{gesture=null});canvas.addEventListener('lostpointercapture',()=>{gesture=null});window.addEventListener('blur',()=>{gesture=null})
canvas.addEventListener('wheel',e=>{e.preventDefault();camera={...camera,distance:Math.max(2,Math.min(7,camera.distance*Math.exp(Math.max(-100,Math.min(100,e.deltaY))*.002)))};draw()},{passive:false})
new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();width=r.width;height=r.height;const d=Math.min(2,devicePixelRatio);canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);draw()}).observe(canvas)
draw()
