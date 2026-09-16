import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:process.platform==='win32'?['--use-angle=d3d11']:[]});
await mkdir('artifacts',{recursive:true});
try{
  for(const width of [390,680,1440]){
    const page=await browser.newPage({viewport:{width,height:width===1440?900:844}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4173');
    await page.waitForFunction(()=>{const d=document.getElementById('campus')._api?.getDiagnostics();return d?.ready&&!d.moving;});
    await page.waitForTimeout(600);
    const before=await page.evaluate(()=>document.getElementById('campus')._api.getDiagnostics());
    assert.ok(before.heroView&&before.cameraDrifting,'Opening camera drifts');
    if(width<=680){
      const fit=await page.evaluate(()=>{const a=document.getElementById('top').getBoundingClientRect(),b=document.getElementById('campus').getBoundingClientRect();return {top:b.top-a.top,height:b.height/a.height,overflow:document.documentElement.scrollWidth>innerWidth};});
      assert.equal(fit.top,0);assert.equal(fit.height,1);assert.equal(fit.overflow,false);
    }
    const camera=before.camera;await page.waitForTimeout(450);
    const after=await page.evaluate(()=>document.getElementById('campus')._api.getDiagnostics());
    assert.ok(Math.hypot(...after.camera.map((v,i)=>v-camera[i]))>.05,'Visible camera motion');
    await page.screenshot({path:`artifacts/hero-background-${width}.png`,scale:'css'});
    await page.locator('[data-action="motion"]').click();await page.waitForTimeout(150);
    const paused=await page.evaluate(()=>document.getElementById('campus')._api.getDiagnostics());
    await page.waitForTimeout(250);
    const still=await page.evaluate(()=>document.getElementById('campus')._api.getDiagnostics());
    assert.equal(still.cameraDrifting,false);assert.deepEqual(still.camera,paused.camera);
    await page.locator('[data-action="motion"]').click();
    await page.locator('#explore-campus').click();await page.waitForFunction(()=>!document.getElementById('campus')._api.getDiagnostics().moving);
    const immersive=await page.evaluate(()=>{const top=document.getElementById('top').getBoundingClientRect(),back=document.getElementById('back-btn');return {active:document.body.classList.contains('campus-fullscreen')&&document.getElementById('top').classList.contains('is-exploring'),height:top.height,viewport:innerHeight,backVisible:getComputedStyle(back).opacity==='1',label:back.textContent};});
    assert.ok(immersive.active&&Math.abs(immersive.height-immersive.viewport)<2&&immersive.backVisible&&/BACK TO HOME/.test(immersive.label),'Explore opens full-screen campus with exit control');
    await page.screenshot({path:`artifacts/campus-fullscreen-${width}.png`,scale:'css'});
    const overview=await page.evaluate(()=>document.getElementById('campus')._api.getDiagnostics());
    assert.equal(overview.heroView,false);
    if(width===1440){const distance=d=>Math.hypot(...d.camera.map((v,i)=>v-d.target[i]));assert.ok(distance(overview)<distance(before),'Immersive campus uses a closer full-screen scale');}
    await page.locator('.campus-hotspot[data-facility="courts"]').click();await page.waitForFunction(()=>!document.getElementById('campus')._api.getDiagnostics().moving);
    assert.equal(await page.locator('#top').evaluate(el=>el.classList.contains('is-exploring')),true,'Facility selection keeps the campus full-screen');
    assert.equal(await page.evaluate(()=>document.getElementById('campus')._api.getDiagnostics().cameraDrifting),false);
    await page.locator('#back-btn').click();
    assert.equal(await page.locator('#top').evaluate(el=>el.classList.contains('is-exploring')),false,'Back exits the campus view');
    assert.deepEqual(errors,[]);
    console.log('PASS hero background, zoom, motion and pause',width);
    await page.close();
  }
  const page=await browser.newPage({reducedMotion:'reduce',viewport:{width:390,height:844}});await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>document.getElementById('campus')._api?.getDiagnostics().ready);assert.equal(await page.evaluate(()=>document.getElementById('campus')._api.getDiagnostics().cameraDrifting),false);await page.close();console.log('PASS reduced motion');
}finally{await browser.close();}
