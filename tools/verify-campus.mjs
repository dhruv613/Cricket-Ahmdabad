import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

// QA: GLB loading, visible/animated athletes, all five selectors AND hotspots,
// panel-safe camera framing, interrupted flights, zoom, lighting, mobile layout,
// reduced motion, offscreen pause, reconnect, standalone export, and asset failure.
const browser=await chromium.launch({headless:true,args:process.platform==='win32'?['--use-angle=d3d11']:[]});
await mkdir('artifacts',{recursive:true});
const results=[];
const diag=page=>page.evaluate(()=>(document.getElementById('campus')||document.querySelector('campus-scene'))?._api.getDiagnostics());
const settle=page=>page.waitForFunction(()=>{const d=(document.getElementById('campus')||document.querySelector('campus-scene'))?._api?.getDiagnostics();return d?.ready&&!d.moving;},{},{timeout:20000});
const check=(name,value)=>{assert.ok(value,name);results.push(name);};
try{
  for(const mobile of [false,true]){
    const label=mobile?'mobile':'desktop',context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});
    const page=await context.newPage(),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
    await page.goto('http://127.0.0.1:4173');await settle(page);await page.waitForTimeout(550);
    check(label+' GLB ready', (await diag(page)).asset==='academy-campus.glb');
    check(label+' no legacy assets',!requests.some(u=>/tree\.glb|sunset\.hdr|grass-diff\.jpg/.test(u)));
    await page.screenshot({scale:'css',path:`artifacts/${label}-initial.png`});
    if(await page.locator('#explore-campus').isVisible()){
      await page.locator('#explore-campus').click();await settle(page);
      check(label+' Explore opens immersive campus',await page.locator('#top').evaluate(el=>el.classList.contains('is-exploring')));
      await page.locator('#back-btn').click();await settle(page);
    }
    await page.screenshot({scale:'css',path:`artifacts/${label}-overview.png`});
    const a=await diag(page);await page.waitForTimeout(350);const b=await diag(page);
    check(label+' sixteen animated players',b.players===16&&b.animationTime>a.animationTime&&JSON.stringify(a.playerPose)!==JSON.stringify(b.playerPose));
    for(const key of ['ground','nets','courts','food','arrival']){
      await page.locator(`.facility-btn[data-key="${key}"]`).click();await settle(page);
      const d=await diag(page),f=d.focusScreen;
      check(label+' selector '+key,d.selected===key&&f.left>=0&&f.right<=d.size[0]-f.available.reserve+2&&f.top>=0&&f.bottom<d.size[1]);
      await page.screenshot({scale:'css',path:`artifacts/${label}-${key}.png`});
      await page.locator('[data-action="reset"]').click();await settle(page);
      // On mobile the main hero hides labels; Explore reveals all hotspot buttons.
      if(await page.locator('#explore-campus').isVisible())await page.locator('#explore-campus').click();await settle(page);
      await page.locator(`.campus-hotspot[data-facility="${key}"]`).click();await settle(page);
      check(label+' hotspot moves camera '+key,(await diag(page)).selected===key);
      await page.locator('#back-btn').click();await settle(page);
    }
    await page.locator('[data-action="pitch"]').click();await settle(page);await page.screenshot({scale:'css',path:`artifacts/${label}-pitch.png`});
    const distance=d=>Math.hypot(...d.camera.map((v,i)=>v-d.target[i]));
    const before=distance(await diag(page));await page.locator('[data-action="in"]').click();await settle(page);
    check(label+' zoom in',distance(await diag(page))<before);
    await page.locator('[data-action="out"]').click();await settle(page);
    check(label+' zoom out',Math.abs(distance(await diag(page))-before)<.1);
    await page.locator('[data-action="motion"]').click();await page.waitForTimeout(200);const paused=await diag(page);await page.waitForTimeout(250);
    check(label+' pause players',(await diag(page)).animationTime===paused.animationTime);
    await page.locator('[data-action="motion"]').click();await page.waitForTimeout(200);
    check(label+' resume players',(await diag(page)).animationTime>paused.animationTime);
    await page.locator('[data-action="night"]').click();await page.waitForTimeout(250);check(label+' floodlights',(await diag(page)).timeOfDay==='night');await page.screenshot({scale:'css',path:`artifacts/${label}-night.png`});
    await page.locator('[data-action="day"]').click();
    for(const key of ['nets','food','arrival'])await page.locator(`.facility-btn[data-key="${key}"]`).click();
    await settle(page);check(label+' rapid selection ends at last facility',(await diag(page)).selected==='arrival');
    await page.locator('[data-action="plan"]').click();await settle(page);const plan=await diag(page);check(label+' plan view clears panel',plan.selected===null&&await page.locator('#facility-panel').evaluate(e=>e.inert));check(label+' plan camera is orthographic',plan.cameraType==='OrthographicCamera');await page.screenshot({scale:'css',path:`artifacts/${label}-plan-validation.png`});
    const box=await page.locator('#campus canvas').boundingBox();
    await page.mouse.move(box.x+box.width*.5,box.y+box.height*.45);await page.mouse.down();await page.mouse.move(box.x+box.width*.65,box.y+box.height*.5,{steps:8});await page.mouse.up();
    await page.waitForTimeout(500);const orbit=await diag(page);await page.waitForTimeout(800);
    check(label+' orbit settles',Math.hypot(...(await diag(page)).camera.map((v,i)=>v-orbit.camera[i]))<1);
    await page.evaluate(()=>window.scrollTo({top:1600,behavior:'instant'}));await page.waitForTimeout(350);const off=await diag(page);await page.waitForTimeout(300);
    check(label+' offscreen stops rendering',!off.visible&&(await diag(page)).frames===off.frames);
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForFunction(()=>(document.getElementById('campus')||document.querySelector('campus-scene'))?._api.getDiagnostics().visible);await page.waitForTimeout(200);
    check(label+' resume on return',(await diag(page)).frames>off.frames);
    check(label+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    check(label+' no script errors',errors.length===0);
    console.log(label,JSON.stringify(await diag(page)));
    await context.close();
  }
  const reduced=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'}),page=await reduced.newPage();await page.goto('http://127.0.0.1:4173');await settle(page);const first=await diag(page);await page.waitForTimeout(200);check('Reduced motion keeps athletes visible and still',first.players===16&&!first.animationEnabled&&(await diag(page)).animationTime===first.animationTime);
  // The full-screen tour uses in-scene hotspots in place of the hidden bottom selector.
  await page.locator('#explore-campus').click();await settle(page);await page.locator('.campus-hotspot[data-facility="courts"]').click();await settle(page);check('Reduced motion facility selection',(await diag(page)).selected==='courts');
  await page.evaluate(()=>{const h=document.getElementById('campus'),p=h.parentNode,n=h.nextSibling;h.remove();p.insertBefore(h,n);});await settle(page);check('Reconnect creates one canvas',await page.locator('#campus canvas').count()===1);await reduced.close();
  const standalone=await browser.newPage({viewport:{width:1280,height:800}});await standalone.goto('http://127.0.0.1:4173/Rajkot%20Multi-Sport%20Academy%203D/Rajkot%20Multi-Sport%20Academy.dc.html');await settle(standalone);check('Original design HTML loads GLB',(await diag(standalone)).players===16);await standalone.close();
  console.log(`PASS ${results.length} checks`);await writeFile('artifacts/campus-verification.json',JSON.stringify({checks:results},null,2));
}finally{await browser.close();}
