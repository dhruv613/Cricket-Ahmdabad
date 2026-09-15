import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const output=new URL('../assets/campus/views/',import.meta.url);await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:process.platform==='win32'?['--use-angle=d3d11']:[]});
try{
  const page=await browser.newPage();page.on('pageerror',e=>{throw e;});
  await page.goto('http://127.0.0.1:4173/tools/render-campus-media.html');await page.waitForFunction(()=>!!window.renderCampusMedia);
  for(const name of ['outdoor-nets','nets-training','ground-day','ground-night','match-ground','fitness']){
    const data=await page.evaluate(name=>window.renderCampusMedia(name),name),bytes=Buffer.from(data,'base64');await writeFile(new URL(name+'.webp',output),bytes);console.log(name,bytes.length);
  }
}finally{await browser.close();}
