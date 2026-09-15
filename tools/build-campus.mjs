import {chromium} from 'playwright';
import {writeFile,mkdir,copyFile} from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,meshopt} from '@gltf-transform/functions';
import sharp from 'sharp';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
const base=new URL('../',import.meta.url);
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  page.on('pageerror',e=>console.error(e));
  await page.exposeFunction('writeAsset',async(name,data)=>writeFile(new URL('assets/campus/'+name,base),Buffer.from(data,'base64')));
  await page.goto('http://127.0.0.1:4173/tools/bake-campus.html');
  await page.waitForFunction(()=>!!window.bake);
  const stats=await page.evaluate(()=>window.bake());
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
  const doc=await io.read(new URL('assets/campus/academy-campus.raw.glb',base).pathname.replace(/^\/([A-Z]:)/,'$1'));
  await MeshoptEncoder.ready;
  await doc.transform(dedup(),prune());
  // Canvas textures export as PNG, which cannot compress noise. Re-encode the ones whose alpha is
  // fully opaque as JPEG; the cut-out maps (net, foliage, contact shadow) must stay PNG.
  let before=0,after=0,converted=0;
  for(const texture of doc.getRoot().listTextures()){
    const image=texture.getImage();if(!image)continue;before+=image.byteLength;
    const input=Buffer.from(image);
    if(texture.getMimeType()==='image/png'&&(await sharp(input).stats()).isOpaque){
      const jpeg=await sharp(input).jpeg({quality:88,chromaSubsampling:'4:4:4'}).toBuffer();
      if(jpeg.byteLength<image.byteLength){texture.setImage(new Uint8Array(jpeg)).setMimeType('image/jpeg');converted++;after+=jpeg.byteLength;continue;}
    }
    after+=image.byteLength;
  }
  console.log(`textures: ${converted} re-encoded, ${(before/1048576).toFixed(2)} MB -> ${(after/1048576).toFixed(2)} MB`);
  await doc.transform(meshopt({encoder:MeshoptEncoder,level:'medium',quantizePosition:16,quantizeTexcoord:16}));
  const bytes=await io.writeBinary(doc);
  await writeFile(new URL('assets/campus/academy-campus.glb',base),bytes);
  await mkdir(new URL('vendor/meshoptimizer/',base),{recursive:true});
  await copyFile(new URL('node_modules/meshoptimizer/meshopt_decoder.module.js',base),new URL('vendor/meshoptimizer/meshopt_decoder.module.js',base));
  await copyFile(new URL('node_modules/meshoptimizer/LICENSE.md',base),new URL('vendor/meshoptimizer/LICENSE.md',base));
  stats.bytes=bytes.byteLength;await writeFile(new URL('assets/campus/academy-campus.stats.json',base),JSON.stringify(stats,null,2));
  console.log(JSON.stringify(stats));
}finally{await browser.close();}
