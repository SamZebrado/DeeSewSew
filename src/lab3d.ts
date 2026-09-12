import { add, anchor, createImportOwnership, displayPoint, emptyLab, parseLab, pick, project, scale, serializeLab, span, toggleSupport, worldAnchor, type Camera, type LabArtwork, type Vec3 } from './lab3d-model'
import { labKey } from './lab3d-input'
import { localize, locale, setText, switchLocale, t } from './i18n'
import './lab3d.css'

document.querySelector('#lab')!.innerHTML = `<header><div class="lab-links"><a href="${import.meta.env.BASE_URL}">Back to embroidery</a><button id="language" type="button"></button></div><h1>3D Lab — Experimental</h1><p>Desktop-first sphere study. Surface-laid thread, not through-fabric stitching.</p></header>
<nav aria-label="Lab controls"><div role="group" aria-label="View and support"><button id="tool" aria-pressed="false">Thread tool</button><button id="support">Remove support</button></div><div role="group" aria-label="History"><button id="undo">Undo</button><button id="redo">Redo</button></div><div role="group" aria-label="Lab files"><button id="save">Save lab</button><button id="load">Load lab</button><button id="download">Export lab JSON</button><label><span>Import lab</span><input id="import" type="file" accept=".json" aria-label="Import lab"></label></div></nav>
<p id="summary"></p><p id="status" role="status" aria-live="polite"></p><p id="input-help">Drag to orbit; wheel to zoom. In Thread mode, click the sphere to place an anchor. Focus the canvas: arrows orbit, +/- zoom, Home resets view, Enter places the center target, Escape cancels.</p>
<canvas aria-label="Experimental sphere and spatial thread" aria-describedby="input-help lab-limits manual-save" tabindex="0"></canvas>
<p id="manual-save">Manual save: one separate experimental slot on this device. Save before leaving; export JSON for a portable backup. Ordinary artwork is unchanged.</p>
<p id="lab-limits">Artistic rest-shape display, not real silk equilibrium. One sphere, one surface-contact run, at most 32 anchors. Visual desktop experiment; not full nonvisual or mobile 3D authoring.</p>`
localize(document.querySelector('#lab')!)
const canvas=document.querySelector('canvas')!, ctx=canvas.getContext('2d')!
const status=document.querySelector<HTMLElement>('#status')!
const summary=document.querySelector<HTMLElement>('#summary')!
let artwork=emptyLab(), camera:Camera={yaw:0,pitch:.15,distance:3.5}, editing=false
let past:LabArtwork[]=[], future:LabArtwork[]=[]
const importOwnership=createImportOwnership(), key='deesewsew.experimental.sphere.v1'
let width=800,height=550,releaseAt:number|null=null,frame:number|null=null
let gesture:{id:number;x:number;y:number;lastX:number;lastY:number;drag:boolean}|null=null
function feedback(message:string){setText(status,message)}
function refresh(){
  document.documentElement.lang=locale==='zh'?'zh-CN':'en';document.title=t('3D Lab — Experimental')
  document.querySelector('#language')!.textContent=locale==='zh'?'English':'中文'
  document.querySelector('#tool')!.setAttribute('aria-pressed',String(editing))
  setText(document.querySelector('#support')!,artwork.support.state==='installed'?'Remove support':'Reinstall support')
  document.querySelector<HTMLButtonElement>('#support')!.disabled=artwork.support.role==='permanent'
  document.querySelector<HTMLButtonElement>('#undo')!.disabled=!past.length
  document.querySelector<HTMLButtonElement>('#redo')!.disabled=!future.length
  summary.textContent=`${t(editing?'Thread mode':'Camera mode')} · ${artwork.run?.anchors.length??0}/32 ${t('anchors')} · ${t(artwork.support.state==='installed'?'Support installed':'Support removed')}`
}
function stopDisplay(){if(frame!==null)cancelAnimationFrame(frame);frame=null;releaseAt=null}
function animate(now:number){frame=null;if(releaseAt===null)return;if(now-releaseAt>=1200){releaseAt=null;draw();return}draw();frame=requestAnimationFrame(animate)}
function draw(){
  ctx.clearRect(0,0,width,height)
  const f=Math.min(width,height)*1.25
  const screen=(p:Vec3)=>{const v=project(worldAnchor(artwork,p),{...camera,target:artwork.support.transform});return [width/2+v[0]*f,height/2+v[1]*f,v[2]] as Vec3}
  if(artwork.support.state==='installed'){
    const r=f/Math.sqrt(camera.distance**2-1),g=ctx.createRadialGradient(width/2-r*.3,height/2-r*.35,r*.1,width/2,height/2,r)
    g.addColorStop(0,'#faf5e7');g.addColorStop(1,'#b9b7a5');ctx.fillStyle=g;ctx.beginPath();ctx.arc(width/2,height/2,r,0,Math.PI*2);ctx.fill()
  }
  const lines:{a:Vec3;b:Vec3}[]=[],points=artwork.run?.anchors??[],age=releaseAt===null?1200:performance.now()-releaseAt
  for(let i=1;i<points.length;i++){const path=span(points[i-1]!,points[i]!).map((p,j)=>displayPoint(p,j/24,age));for(let j=1;j<path.length;j++)lines.push({a:screen(path[j-1]!),b:screen(path[j]!)})}
  lines.sort((a,b)=>(b.a[2]+b.b[2])-(a.a[2]+a.b[2]))
  for(const line of lines){
    if(artwork.support.state==='installed'&&(line.a[2]+line.b[2])/2>camera.distance-1/camera.distance)continue
    ctx.strokeStyle='#9b4a48';ctx.lineWidth=3.2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(line.a[0],line.a[1]);ctx.lineTo(line.b[0],line.b[1]);ctx.stroke()
  }
  for(const p of points){const v=screen(p);if(artwork.support.state==='installed'&&v[2]>camera.distance-1/camera.distance)continue;ctx.fillStyle='#663633';ctx.beginPath();ctx.arc(v[0],v[1],4,0,Math.PI*2);ctx.fill()}
  const reticle=document.activeElement===canvas&&editing&&artwork.support.state==='installed'
  if(reticle){ctx.strokeStyle='#303330';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(width/2,height/2,8,0,Math.PI*2);ctx.moveTo(width/2-12,height/2);ctx.lineTo(width/2+12,height/2);ctx.moveTo(width/2,height/2-12);ctx.lineTo(width/2,height/2+12);ctx.stroke()}
  canvas.dataset.reticle=String(reticle);canvas.dataset.canonical=serializeLab(artwork);canvas.dataset.camera=JSON.stringify(camera)
}
function commit(next:LabArtwork){if(next===artwork)return;gesture=null;importOwnership.invalidate();stopDisplay();past=[...past.slice(-63),artwork];future=[];artwork=next;refresh();draw()}
function problem(error:unknown,operation:'edit'|'save'|'load'|'import'|'export'){
  const message=error instanceof Error?error.message:''
  if(message.includes('32 anchors'))return feedback('This lab supports at most 32 anchors.')
  if(message.includes('non-antipodal'))return feedback('Choose a distinct point, not the opposite pole.')
  if(message.includes('installed sphere'))return feedback('Reinstall the support before placing an anchor.')
  if(operation==='save')return feedback(error instanceof DOMException&&error.name==='QuotaExceededError'?'Local storage is full. Export a JSON backup.':'Local save is unavailable. Export a JSON backup.')
  if(operation==='import')return feedback(message.includes('too large')?'Lab files must be at most 16 KB.':'Choose a valid experimental Lab JSON file. Your current work is unchanged.')
  if(operation==='load')return feedback('Could not load the experimental slot. Your current work is unchanged.')
  feedback(operation==='export'?'Could not export the lab. Your current work is unchanged.':'Could not place an anchor. Your current work is unchanged.')
}
function place(x:number,y:number){try{const p=pick(x,y,{...camera,target:artwork.support.transform});if(!p){feedback('Choose a point on the sphere.');return}commit(anchor(artwork,add(p,scale(artwork.support.transform,-1))));feedback('Anchor placed.')}catch(e){problem(e,'edit')}}
document.querySelector('#language')!.addEventListener('click',()=>{switchLocale();refresh()})
document.querySelector('#tool')!.addEventListener('click',()=>{gesture=null;editing=!editing;refresh();draw();feedback(editing?'Thread mode: choose the center target or click the sphere.':'Camera mode: view changes never add anchors.')})
document.querySelector('#support')!.addEventListener('click',()=>{commit(toggleSupport(artwork));feedback(artwork.support.state==='removed'?'Support removed; rest shape preserved.':'Support reinstalled.');if(artwork.support.state==='removed'&&artwork.run&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.hidden){releaseAt=performance.now();frame=requestAnimationFrame(animate)}})
document.querySelector('#undo')!.addEventListener('click',()=>{if(!past.length)return;gesture=null;importOwnership.invalidate();stopDisplay();future.push(artwork);artwork=past.pop()!;refresh();draw();feedback('Operation undone')})
document.querySelector('#redo')!.addEventListener('click',()=>{if(!future.length)return;gesture=null;importOwnership.invalidate();stopDisplay();past.push(artwork);artwork=future.pop()!;refresh();draw();feedback('Operation restored')})
document.querySelector('#save')!.addEventListener('click',()=>{try{localStorage.setItem(key,serializeLab(artwork));feedback('Experimental lab saved locally.')}catch(e){problem(e,'save')}})
document.querySelector('#load')!.addEventListener('click',()=>{try{const raw=localStorage.getItem(key);if(raw===null){feedback('No experimental lab save yet.');return}commit(parseLab(raw));feedback('Experimental lab loaded.')}catch(e){problem(e,'load')}})
document.querySelector('#download')!.addEventListener('click',()=>{try{const url=URL.createObjectURL(new Blob([serializeLab(artwork)],{type:'application/json'}));try{const a=document.createElement('a');a.href=url;a.download='sphere.deesewsew-lab3d.json';a.click();feedback('Lab JSON download started.')}finally{setTimeout(()=>URL.revokeObjectURL(url),1000)}}catch(e){problem(e,'export')}})
document.querySelector<HTMLInputElement>('#import')!.addEventListener('change',async e=>{
  const input=e.target as HTMLInputElement,file=input.files?.[0];if(!file)return;const token=importOwnership.start()
  try{if(file.size>16000)throw Error('Lab file too large');const raw=await file.text();if(!importOwnership.owns(token))return;input.value='';commit(parseLab(raw));feedback('Experimental lab imported.')}catch(e){if(importOwnership.owns(token)){input.value='';problem(e,'import')}}
})
canvas.addEventListener('pointerdown',e=>{if(gesture||e.button!==0)return;gesture={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,drag:false};canvas.setPointerCapture(e.pointerId)})
canvas.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;gesture.drag ||= Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>5;if(gesture.drag){camera={...camera,yaw:camera.yaw+(e.clientX-gesture.lastX)*.008,pitch:Math.max(-1.4,Math.min(1.4,camera.pitch+(e.clientY-gesture.lastY)*.008))};draw()}gesture.lastX=e.clientX;gesture.lastY=e.clientY})
canvas.addEventListener('pointerup',e=>{if(!gesture||gesture.id!==e.pointerId)return;const click=!gesture.drag&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<=5;gesture=null;if(!click||!editing)return;const r=canvas.getBoundingClientRect(),f=Math.min(width,height)*1.25;place((e.clientX-r.left-width/2)/f,(e.clientY-r.top-height/2)/f)})
canvas.addEventListener('pointercancel',()=>{gesture=null});canvas.addEventListener('lostpointercapture',()=>{gesture=null})
canvas.addEventListener('focus',draw);canvas.addEventListener('blur',()=>{gesture=null;draw()})
window.addEventListener('blur',()=>{gesture=null})
document.addEventListener('visibilitychange',()=>{if(document.hidden){gesture=null;stopDisplay();draw()}})
window.addEventListener('pagehide',()=>{gesture=null;stopDisplay()})
window.addEventListener('keydown',e=>{
  if(e.key==='Escape')gesture=null
  const action=labKey({key:e.key,focused:document.activeElement===canvas,repeat:e.repeat,ctrlKey:e.ctrlKey,metaKey:e.metaKey,altKey:e.altKey},camera)
  if(action===null)return;e.preventDefault();gesture=null
  if(action==='anchor'){if(!editing)feedback('Choose Thread mode before placing an anchor.');else if(artwork.support.state==='removed')feedback('Reinstall the support before placing an anchor.');else place(0,0)}
  else if(action==='cancel')feedback('Pointer action cancelled.')
  else{camera=action;draw()}
})
canvas.addEventListener('wheel',e=>{e.preventDefault();if(gesture)gesture.drag=true;camera={...camera,distance:Math.max(2,Math.min(7,camera.distance*Math.exp(Math.max(-100,Math.min(100,e.deltaY))*.002)))};draw()},{passive:false})
new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();width=r.width;height=r.height;const d=Math.min(2,devicePixelRatio);canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);draw()}).observe(canvas)
refresh();draw()
if('serviceWorker' in navigator&&import.meta.env.PROD)window.addEventListener('load',()=>{void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL}).catch(()=>feedback('Offline setup unavailable; local editing remains available.'))})
