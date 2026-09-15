import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:process.platform==='win32'?['--use-angle=d3d11']:[]});
const report={};
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let unblock,started=false,first=true;
  const gate=new Promise(resolve=>unblock=resolve);
  await page.route('**/academy-campus.glb',async route=>{if(first){first=false;started=true;await gate;}await route.continue();});
  await page.goto('http://127.0.0.1:4173',{waitUntil:'domcontentloaded'});
  while(!started)await page.waitForTimeout(50);
  await page.evaluate(()=>{const host=document.getElementById('campus'),parent=host.parentNode,next=host.nextSibling;host.remove();parent.insertBefore(host,next);});
  unblock();
  await page.waitForFunction(()=>document.getElementById('campus')._api?.getDiagnostics().ready);
  await page.waitForTimeout(1500);
  assert.equal(await page.locator('#campus canvas').count(),1);assert.deepEqual(errors,[]);report.remountDuringLoad='passed';
  await page.locator('[data-action="pitch"]').click();await page.waitForFunction(()=>!document.getElementById('campus')._api.getDiagnostics().moving);
  const before=await page.evaluate(()=>document.getElementById('campus')._api.getDiagnostics().frames);
  const samples=await page.evaluate(async()=>{
    const samples=[];let last=performance.now();
    await new Promise(resolve=>{function step(now){samples.push(now-last);last=now;if(samples.length<120)requestAnimationFrame(step);else resolve();}requestAnimationFrame(step);});
    return samples.slice(1).sort((a,b)=>a-b);
  });
  const d=await page.evaluate(()=>document.getElementById('campus')._api.getDiagnostics());assert.ok(d.frames>before);
  report.performance={medianFrameMs:samples[Math.floor(samples.length*.5)],p95FrameMs:samples[Math.floor(samples.length*.95)],loadMs:d.loadMs,drawCalls:d.drawCalls,triangles:d.triangles,pixelRatio:d.pixelRatio};
  await page.evaluate(()=>{const gl=document.querySelector('#campus canvas').getContext('webgl2');window.recoveryExtension=gl.getExtension('WEBGL_lose_context');window.recoveryExtension.loseContext();});
  await page.waitForTimeout(300);assert.equal(await page.locator('#scene-status').isVisible(),true);
  const lostFrames=await page.evaluate(()=>document.getElementById('campus')._api.getDiagnostics().frames);
  await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>document.getElementById('campus')._api.getDiagnostics().frames),lostFrames);
  await page.evaluate(()=>window.recoveryExtension.restoreContext());
  await page.waitForFunction(f=>document.getElementById('campus')._api.getDiagnostics().frames>f,lostFrames);report.contextRecovery='passed';
  await page.close();
  const failed=await browser.newPage();await failed.route('**/academy-campus.glb',r=>r.abort());await failed.goto('http://127.0.0.1:4173');
  await failed.waitForFunction(()=>document.getElementById('scene-status').textContent.includes('could not load'));
  assert.equal(await failed.locator('#scene-status a').getAttribute('href'),'#facilities');assert.equal(await failed.locator('#campus canvas').count(),0);report.loadFailure='passed';await failed.close();
  await writeFile('artifacts/campus-resilience.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();}
