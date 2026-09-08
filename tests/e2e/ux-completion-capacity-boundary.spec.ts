import {expect,test,type Page} from '@playwright/test'
import * as domain from '../../src/thread-runs'
import {serializeThreadArtwork} from '../../src/thread-run-storage'
import {capacityBoundaryFixture,namespaceBoundaryFixture} from './fixtures/continuation-boundary'

async function exported(page:Page) {
  const pending=page.waitForEvent('download')
  await page.locator('#export-artwork').click()
  const download=await pending
  const stream=await download.createReadStream()
  if(!stream)throw Error('Missing export stream')
  const chunks:Buffer[]=[]
  for await(const chunk of stream)chunks.push(Buffer.from(chunk))
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
for(const action of ['cut','color'] as const)test(`capacity ${action} rejects before changing canonical memory`,async({page})=>{
  const raw=capacityBoundaryFixture(domain,serializeThreadArtwork)
  await page.addInitScript(raw=>{localStorage.setItem('deesewsew-piece-v1',raw);localStorage.setItem('deesewsew-locale-v1','en')},raw)
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto('./')
  const before=await exported(page)
  const selection=await page.locator('#palette .swatch.selected').getAttribute('data-color')
  const customColor=await page.locator('#custom-color').inputValue()
  const settings=await page.evaluate(()=>localStorage.getItem('deesewsew-settings-v2'))
  if(action==='cut')await page.locator('#end-thread').click()
  else await page.locator('#palette .swatch:not(.selected)').first().click()
  await expect(page.getByText('Fabric full',{exact:true})).toBeVisible()
  expect(await exported(page)).toEqual(before)
  expect(await page.locator('#palette .swatch.selected').getAttribute('data-color')).toBe(selection)
  expect(await page.locator('#custom-color').inputValue()).toBe(customColor)
  expect(await page.evaluate(()=>localStorage.getItem('deesewsew-settings-v2'))).toBe(settings)
  expect(await page.evaluate(()=>localStorage.getItem('deesewsew-piece-v1'))).toBe(raw)
  expect(errors).toEqual([])
})
test('legacy namespace exhaustion is handled without uncaught error or mutation',async({page})=>{
  await page.addInitScript(raw=>{localStorage.setItem('deesewsew-piece-v1',raw);localStorage.setItem('deesewsew-locale-v1','en')},namespaceBoundaryFixture)
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto('./')
  const before=await exported(page)
  const canvas=page.locator('#embroidery');await canvas.scrollIntoViewIfNeeded()
  const b=(await canvas.boundingBox())!
  await page.mouse.click(b.x+b.width*.5,b.y+b.height*.5)
  await expect(page.getByText('Fabric full',{exact:true})).toBeVisible()
  expect(await exported(page)).toEqual(before)
  expect(await page.evaluate(()=>localStorage.getItem('deesewsew-piece-v1'))).toBe(namespaceBoundaryFixture)
  expect(errors).toEqual([])
})
