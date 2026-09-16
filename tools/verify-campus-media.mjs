import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:process.platform==='win32'?['--use-angle=d3d11']:[]});
await mkdir('artifacts',{recursive:true});
try{
  for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4173/');
    await page.waitForFunction(()=>document.getElementById('campus')._api?.getDiagnostics().ready);
    assert.equal(await page.locator('[data-filter="Indoor"]').count(),0);
    assert.equal(await page.locator('#indoor').count(),0);
    for(const section of ['outdoor','ground','gallery']){
      const el=page.locator('#'+section);await el.scrollIntoViewIfNeeded();
      await el.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode();})));
      assert.ok(await el.locator('img').evaluateAll(imgs=>imgs.length>0&&imgs.every(i=>i.naturalWidth>0)));
      await page.waitForTimeout(400);await el.screenshot({path:`artifacts/media-${section}-${width}.png`});
    }
    for(const [filter,count] of [['Outdoor',2],['Ground',2],['Coaching',1],['Matches',1],['All',6]]){
      await page.locator(`[data-filter="${filter}"]`).click();
      assert.equal(await page.locator('.gallery-item:not([hidden])').count(),count);
    }
    for(let i=0;i<6;i++){
      await page.locator(`[data-gallery="${i}"]`).click();
      await page.locator('#gallery-preview img').evaluate(img=>img.decode());
      assert.equal(await page.locator('#gallery-dialog').evaluate(el=>el.open),true);
      assert.match(await page.locator('#gallery-dialog > p').textContent(),/3D campus model/);
      await page.keyboard.press('Escape');
    }
    for(const [selector,key] of [['#outdoor .model-launch','nets'],['#ground .model-launch','ground']]){
      await page.locator(selector).click();
      await page.waitForFunction(key=>{const d=document.getElementById('campus')._api.getDiagnostics();return d.selected===key&&!d.moving;},key);
    }
    await page.locator('[data-gallery="5"]').click();await page.locator('#gallery-preview .model-launch').click();
    await page.waitForFunction(()=>{const d=document.getElementById('campus')._api.getDiagnostics();return d.selected==='courts'&&!d.moving;});
    assert.equal(await page.locator('#gallery-dialog').evaluate(el=>el.open),false);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);console.log('PASS images, filters, modal, 3D links and layout',width);
    await page.close();
  }
}finally{await browser.close();}
