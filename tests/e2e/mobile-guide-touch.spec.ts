import {test,expect} from '@playwright/test'
import {libraryPattern} from '../../src/pattern-library'
const count=async(page:any)=>page.evaluate(()=>JSON.parse(localStorage.getItem('deesewsew-piece-v1')??'{"punctures":[]}').punctures.length)
for(const width of [320,390])for(const locale of ['en','zh']){
 test(`visible guide touch boundaries, drag-out, cancel and history ${width} ${locale}`,async({page,context})=>{
  await page.setViewportSize({width,height:844});await page.addInitScript(l=>localStorage.setItem('deesewsew-locale-v1',l),locale);await page.goto('./');
  await page.locator('.pattern-options summary').click();await page.locator('#pattern-choice').selectOption('little-leaf-v1');await page.locator('#start-pattern').click();
  const hoop=page.locator('#hoop-shell'),marker=page.locator('#guide-target');await hoop.scrollIntoViewIfNeeded();
  const point=async()=>{const b=(await marker.boundingBox())!;return{x:b.x+b.width/2,y:b.y+b.height/2,id:1}};
  let p=await point();await page.touchscreen.tap(p.x+23,p.y);expect(await count(page)).toBe(0);
  const cdp=await context.newCDPSession(page);p=await point();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,x:p.x+75}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});expect(await count(page)).toBe(0);
  p=await point();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});expect(await count(page)).toBe(0);
  p=await point();await page.touchscreen.tap(p.x+21,p.y);expect(await count(page)).toBe(1);
  const expected=libraryPattern('little-leaf-v1')!.runs[0]!.targets[0]!;
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('deesewsew-piece-v1')!).punctures[0].position)).toEqual(expected);
  await page.locator('#undo').click();expect(await count(page)).toBe(0);await page.locator('#redo').click();expect(await count(page)).toBe(1);
  await page.reload();await hoop.scrollIntoViewIfNeeded();await expect(marker).toBeVisible();p=await point();await page.touchscreen.tap(p.x,p.y);expect(await count(page)).toBe(2);
  await page.locator('#end-thread').click();expect(await count(page)).toBe(2);
  await page.locator('.pattern-options summary').click();await page.locator('#exit-pattern').click();await expect(marker).toBeHidden();
  await cdp.detach();
 });
 for(const second of ['inside','outside'])for(const ending of ['first-lifts','second-lifts','cancel'])test(`mobile contact ownership ${width} ${locale} ${second} ${ending}`,async({page,context})=>{
  await page.setViewportSize({width,height:844});await page.addInitScript(l=>localStorage.setItem('deesewsew-locale-v1',l),locale);await page.goto('./');const hoop=page.locator('#hoop-shell');await hoop.scrollIntoViewIfNeeded();const b=(await hoop.boundingBox())!;
  const a={id:1,x:b.x+b.width*.4,y:b.y+b.height*.5},z=second==='inside'?{id:2,x:b.x+b.width*.6,y:b.y+b.height*.5}:{id:2,x:5,y:5};const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,z]});
  if(second==='inside'){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...a,x:a.x+15},{...z,x:z.x+15}]});
   expect(Math.abs(Number(await hoop.getAttribute('data-yaw')))).toBeGreaterThan(1);
  }
  if(ending==='cancel')await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});else{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[ending==='first-lifts'?z:a]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
  expect(await count(page)).toBe(0);if(await page.locator('#view-front').isEnabled())await page.locator('#view-front').click();await hoop.scrollIntoViewIfNeeded();const fresh=(await hoop.boundingBox())!;await page.touchscreen.tap(fresh.x+fresh.width*.5,fresh.y+fresh.height*.5);expect(await count(page)).toBe(1);await cdp.detach();
 });
}
