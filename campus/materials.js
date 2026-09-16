import * as T from 'three';

export const asset = name => new URL('../assets/campus/' + name, import.meta.url).href;
export function random(seed = 1907) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
}
export function canvasTexture(width, height, paint, data = false) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = data ? T.NoColorSpace : T.SRGBColorSpace;
  return texture;
}

export async function loadMaterials(renderer, report, {compact=false}={}) {
  const loader = new T.TextureLoader();
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const maps = {};
  const jobs = ['grass', 'asphalt', 'concrete', 'bark'].flatMap(name => ['diff', 'normal', 'rough'].map(async kind => {
    const texture = await loader.loadAsync(asset(`${compact?'compact/':''}${name}-${kind}.jpg`));
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.colorSpace = kind === 'diff' ? T.SRGBColorSpace : T.NoColorSpace;
    texture.anisotropy = anisotropy;
    maps[`${name}-${kind}`] = texture;
  }));
  await Promise.all(jobs); report('Preparing turf and architectural materials');
  // Physical texture density comes from metre-space UVs on the geometry, not object size.
  const pbr = (prefix, options) => new T.MeshStandardMaterial({ map:maps[`${prefix}-diff`], normalMap:maps[`${prefix}-normal`], roughnessMap:maps[`${prefix}-rough`], ...options });
  const M = {
    lawn:pbr('grass',{color:0x79875a,roughness:1,normalScale:new T.Vector2(.22,.22)}),
    // The concrete photo averages a dark brown (92,81,69), so tinting it can never reach cement.
    // Village surfaces take a flat tone and borrow only the normal map for relief.
    render:new T.MeshStandardMaterial({color:0xd9d0bd,roughness:.95,normalMap:maps['concrete-normal'],normalScale:new T.Vector2(.16,.16)}),
    renderWarm:new T.MeshStandardMaterial({color:0xc8ab86,roughness:.95,normalMap:maps['concrete-normal'],normalScale:new T.Vector2(.16,.16)}),
    slab:new T.MeshStandardMaterial({color:0xc4c0b4,roughness:.96,normalMap:maps['concrete-normal'],normalScale:new T.Vector2(.12,.12)}),
    renderPale:new T.MeshStandardMaterial({color:0xbfb9a6,roughness:.95,normalMap:maps['concrete-normal'],normalScale:new T.Vector2(.16,.16)}),
    renderBlue:new T.MeshStandardMaterial({color:0xa8b0ad,roughness:.95,normalMap:maps['concrete-normal'],normalScale:new T.Vector2(.16,.16)}),
    tin:new T.MeshStandardMaterial({color:0x8a8477,metalness:.55,roughness:.72}),
    tinRust:new T.MeshStandardMaterial({color:0x8a6046,metalness:.35,roughness:.86}),
    track:new T.MeshStandardMaterial({color:0x8a4230,roughness:.95}),
    // Arrival wedge paving: a made light surface, so the zone never reads as a black slab.
    paving:new T.MeshStandardMaterial({color:0xa9a396,roughness:.94,normalMap:maps['concrete-normal'],normalScale:new T.Vector2(.12,.12)}),
    // Open circulation apron: the drawing's pink zone, kept distinct from lawn and paving.
    apron:new T.MeshStandardMaterial({color:0xb0a396,roughness:1,normalMap:maps['concrete-normal'],normalScale:new T.Vector2(.16,.16)}),
    // Training surface for the practice-area polygon, so the whole facility reads as one zone.
    training:new T.MeshStandardMaterial({color:0x9a8f6d,roughness:1,normalMap:maps['concrete-normal'],normalScale:new T.Vector2(.2,.2)}),
    // Two court colours so the volleyball and pickleball blocks are not read as one surface.
    courtTeal:new T.MeshStandardMaterial({color:0x2e7f8c,roughness:.9}),
    courtBlue:new T.MeshStandardMaterial({color:0x2668a8,roughness:.9}),
    asphalt:pbr('asphalt',{color:0x797b7c,roughness:.88,normalScale:new T.Vector2(.32,.32)}),
    concrete:pbr('concrete',{color:0xbab8ad,roughness:.85,normalScale:new T.Vector2(.18,.18)}),
    facade:pbr('concrete',{color:0xe4ded1,roughness:.78,normalScale:new T.Vector2(.1,.1)}),
    bark:pbr('bark',{color:0x8a8270,roughness:1}),
    navy:new T.MeshStandardMaterial({color:0x102d45,roughness:.45,metalness:.24}),
    metal:new T.MeshStandardMaterial({color:0x617077,metalness:.84,roughness:.37}),
    darkMetal:new T.MeshStandardMaterial({color:0x242b2e,metalness:.8,roughness:.43}),
    roof:new T.MeshStandardMaterial({color:0xa8b1b3,metalness:.68,roughness:.39}),
    white:new T.MeshStandardMaterial({color:0xe5e3d8,roughness:.75}),
    blue:new T.MeshStandardMaterial({color:0x176293,roughness:.49,metalness:.1}),
    yellow:new T.MeshStandardMaterial({color:0xc5a244,roughness:.76}),
    wood:new T.MeshStandardMaterial({color:0x826143,roughness:.76}),
    rubber:new T.MeshStandardMaterial({color:0x182021,roughness:.94}),
    sand:new T.MeshStandardMaterial({color:0xa59470,roughness:1}),
    glass:new T.MeshPhysicalMaterial({color:0x4e6971,roughness:.12,metalness:.22,clearcoat:1,clearcoatRoughness:.08,transparent:true,opacity:.62,depthWrite:false,side:T.DoubleSide}),
    solar:new T.MeshPhysicalMaterial({color:0x152c46,roughness:.24,metalness:.65,clearcoat:1}),
    lamp:new T.MeshStandardMaterial({color:0xf5f0e4,roughness:.25,emissive:0xffeed2,emissiveIntensity:.8}),
    interior:new T.MeshStandardMaterial({color:0xb3aa91,roughness:.65,emissive:0xffc67c,emissiveIntensity:.1}),
    skin:new T.MeshStandardMaterial({color:0x9b7156,roughness:.8}),
    kit:new T.MeshStandardMaterial({color:0xe4e3da,roughness:.94}),
    helmet:new T.MeshStandardMaterial({color:0x10304a,roughness:.4}),
  };

  // Close-cut grass: high-frequency blades, subtle tonal variation, and straight mowing bands.
  // No concentric "target" pattern; the 20.12 m pitch remains an independent surface.
  const rng = random(913), n = compact ? 256 : 1024;
  const turf = canvasTexture(n,n,(ctx,w,h) => {
    ctx.fillStyle='#5b6f3c';ctx.fillRect(0,0,w,h);
    for(let i=0;i<(compact?10000:180000);i++){
      const light=rng();ctx.strokeStyle=light>.52?'rgba(150,163,83,.3)':'rgba(40,58,27,.36)';
      const x=rng()*w,y=rng()*h;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(rng()-.5)*2,y-1-rng()*4);ctx.stroke();
    }
  }); turf.wrapS=turf.wrapT=T.RepeatWrapping;turf.anisotropy=anisotropy;
  M.turf=new T.MeshStandardMaterial({map:turf,color:0xffffff,normalMap:maps['grass-normal'],normalScale:new T.Vector2(.12,.12),roughness:1,vertexColors:true});
  const pitch=canvasTexture(256,128,(ctx,w,h)=>{
    ctx.fillStyle='#b8a781';ctx.fillRect(0,0,w,h);
    for(let i=0;i<4000;i++){ctx.fillStyle=rng()>.5?'rgba(56,49,30,.14)':'rgba(241,225,184,.25)';ctx.fillRect(rng()*w,rng()*h,rng()*3+.3,rng()*2+.3);}
    for(let i=0;i<70;i++){ctx.strokeStyle='rgba(74,61,36,.17)';ctx.lineWidth=.5;const x=rng()*w,y=rng()*h;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+rng()*12,y+rng()*7);ctx.lineTo(x+20*rng(),y+10*rng());ctx.stroke();}
  });
  M.pitch=new T.MeshStandardMaterial({map:pitch,roughness:1,bumpMap:pitch,bumpScale:.018});
  M.astro=new T.MeshStandardMaterial({map:turf,color:0x8d9c6e,roughness:1});
  M.square=new T.MeshStandardMaterial({map:turf,color:0xb5bba1,roughness:1});
  // Broad, world-space variation breaks texture tiling without changing the mowing lines.
  for(const material of [M.lawn,M.turf,M.square]){
    material.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec2 vGroundWorld;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vec4 groundPoint = vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          groundPoint = instanceMatrix * groundPoint;
        #endif
        vGroundWorld = (modelMatrix * groundPoint).xz;
      `);
      shader.fragmentShader=`varying vec2 vGroundWorld;
        float groundHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float groundNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(groundHash(i),groundHash(i+vec2(1,0)),f.x),mix(groundHash(i+vec2(0,1)),groundHash(i+vec2(1,1)),f.x),f.y);}
      `+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float naturalTone = groundNoise(vGroundWorld*.17)*.12 + groundNoise(vGroundWorld*.85)*.05;
        diffuseColor.rgb *= .89 + naturalTone;
      `);
    };
    material.customProgramCacheKey=()=> 'academy-ground-variation-v1';
  }

  // Alpha-tested woven net, so openings are actual transparent holes with stable depth.
  const net=canvasTexture(64,64,ctx=>{ctx.clearRect(0,0,64,64);ctx.strokeStyle='#535e52';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(64,64);ctx.moveTo(64,0);ctx.lineTo(0,64);ctx.stroke();});
  net.wrapS=net.wrapT=T.RepeatWrapping;net.anisotropy=anisotropy;
  M.net=new T.MeshStandardMaterial({map:net,alphaTest:.36,side:T.DoubleSide,roughness:1,metalness:0,transparent:false});
  // Compound ground: hard-baked earth with sparse dry tufts and trodden bare patches.
  const dry=canvasTexture(n,n,(ctx,w,h)=>{
    ctx.fillStyle='#a08a63';ctx.fillRect(0,0,w,h);
    for(let i=0;i<(compact?2600:26000);i++){const v=rng();ctx.fillStyle=v>.7?'rgba(196,175,133,.3)':v>.35?'rgba(126,106,72,.26)':'rgba(151,133,95,.3)';ctx.fillRect(rng()*w,rng()*h,2+rng()*11,2+rng()*9);}
    for(let i=0;i<(compact?1800:16000);i++){
      const v=rng();ctx.strokeStyle=v>.6?'rgba(124,126,74,.5)':v>.3?'rgba(93,99,58,.46)':'rgba(158,148,96,.42)';ctx.lineWidth=.8;
      const x=rng()*w,y=rng()*h;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(rng()-.5)*3,y-1-rng()*5);ctx.stroke();
    }
  });dry.wrapS=dry.wrapT=T.RepeatWrapping;dry.anisotropy=anisotropy;
  M.lawn.map=dry;M.lawn.color.set(0xffffff);M.lawn.normalScale.set(.14,.14);
  const soil=canvasTexture(256,256,(ctx,w,h)=>{
    ctx.fillStyle='#ab9468';ctx.fillRect(0,0,w,h);
    for(let i=0;i<18000;i++){const v=rng();ctx.fillStyle=v>.6?'rgba(96,78,45,.22)':'rgba(223,203,158,.26)';ctx.fillRect(rng()*w,rng()*h,1+rng()*3,1+rng()*2);}
  });soil.wrapS=soil.wrapT=T.RepeatWrapping;
  M.soil=new T.MeshStandardMaterial({map:soil,roughness:1,normalMap:maps['grass-normal'],normalScale:new T.Vector2(.1,.1)});
  // Sparse, irregular compound-leaf sprays replace opaque geometric tree crowns.
  const foliage=canvasTexture(256,256,(ctx,w,h)=>{
    ctx.clearRect(0,0,w,h);
    for(let stem=0;stem<9;stem++){
      const a=stem*2.399,ex=128+Math.cos(a)*(65+rng()*45),ey=128+Math.sin(a)*(65+rng()*45);
      ctx.strokeStyle='#62653b';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(128,139);ctx.lineTo(ex,ey);ctx.stroke();
      for(let leaf=1;leaf<12;leaf++)for(const side of [-1,1]){
        const t=leaf/12,x=128+(ex-128)*t,y=139+(ey-139)*t;
        ctx.save();ctx.translate(x,y);ctx.rotate(a+side*.8);ctx.fillStyle=['#3b5230','#4d6438','#5d7342','#2f4428'][Math.floor(rng()*4)];
        ctx.beginPath();ctx.ellipse(8,0,9+rng()*4,3+rng()*2,0,0,Math.PI*2);ctx.fill();ctx.restore();
      }
    }
  });foliage.anisotropy=anisotropy;
  M.foliage=new T.MeshStandardMaterial({map:foliage,alphaTest:.42,side:T.DoubleSide,roughness:.94,color:0x8a9668});
  const contact=canvasTexture(64,64,(ctx,w,h)=>{const g=ctx.createRadialGradient(32,32,4,32,32,32);g.addColorStop(0,'rgba(20,25,15,.48)');g.addColorStop(.5,'rgba(20,25,15,.2)');g.addColorStop(1,'rgba(20,25,15,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);});
  M.contact=new T.MeshBasicMaterial({map:contact,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  for(const [name, material] of Object.entries(M))material.name=name;
  return M;
}
