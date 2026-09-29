import {test,expect} from '@playwright/test'

for(const width of [320,390])for(const locale of ['en','zh'])test(`mobile action placement and restored desktop focus ${width} ${locale}`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.addInitScript(l=>localStorage.setItem('deesewsew-locale-v1',l),locale);await page.goto('./');
 const panel=page.locator('#mobile-actions');await expect(panel).toBeVisible();
 for(const id of ['undo','redo','end-thread','view-front','view-back']){
  await expect(page.locator('#'+id)).toHaveCount(1);await expect(panel.locator('#'+id)).toHaveCount(1);
  const bounds=await page.locator('#'+id).boundingBox(),hoop=await page.locator('#hoop-shell').boundingBox();expect(bounds!.y).toBeGreaterThanOrEqual(hoop!.y+hoop!.height);expect(bounds!.width).toBeGreaterThanOrEqual(44);expect(bounds!.height).toBeGreaterThanOrEqual(44);expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#hoop-shell').scrollIntoViewIfNeeded();const h=(await page.locator('#hoop-shell').boundingBox())!;await page.touchscreen.tap(h.x+h.width*.45,h.y+h.height*.5);await expect(page.locator('#undo')).toBeEnabled();
 await page.keyboard.press('Control+z');await expect(page.locator('#redo')).toBeEnabled();await page.keyboard.press('Control+Shift+z');await expect(page.locator('#redo')).toBeDisabled();
 const saved=await page.evaluate(()=>localStorage.getItem('deesewsew-piece-v1'));
 await page.locator('#undo').focus();await page.setViewportSize({width:768,height:900});await expect(panel).toBeHidden();await expect(page.locator('.history-group .edit-row #undo')).toBeFocused();await expect(page.locator('.view-actions #view-back')).toHaveCount(1);
 await page.setViewportSize({width:1280,height:900});await expect(panel).toBeHidden();await expect(page.locator('.history-group #end-thread')).toHaveCount(1);
 await page.setViewportSize({width,height:844});await expect(panel.locator('#undo')).toBeFocused();expect(await page.evaluate(()=>localStorage.getItem('deesewsew-piece-v1'))).toBe(saved);
 for(let i=0;i<3;i++){
  await page.setViewportSize({width:768,height:900});await expect(panel).toBeHidden();
  await page.setViewportSize({width,height:844});await expect(panel.locator('#undo')).toBeFocused();
 }
 expect(await page.evaluate(()=>{
  const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);
  return new Set(ids).size===ids.length && [...document.querySelectorAll('[aria-describedby],[aria-labelledby],label[for]')].every(e=>
   ['aria-describedby','aria-labelledby','for'].every(a=>(e.getAttribute(a)??'').split(/\s+/).filter(Boolean).every(id=>!!document.getElementById(id))));
 })).toBe(true);
 await page.locator('#undo').click();await expect(page.locator('#undo')).toBeDisabled();
 await page.locator('#redo').click();await expect(page.locator('#undo')).toBeEnabled();await expect(page.locator('#redo')).toBeDisabled();
 expect(await page.evaluate(()=>localStorage.getItem('deesewsew-piece-v1'))).toBe(saved);
 await page.locator('#undo').focus();
 await page.keyboard.press('Tab');await expect(page.locator('#end-thread')).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('#end-thread')).toBeDisabled();
});
