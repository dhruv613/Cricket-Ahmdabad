import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/meshoptimizer/meshopt_decoder.module.js';
import { FACILITIES, CAMPUS_BOUNDS } from './facilities.js';
import { createPlayers } from './players.js';

export async function mountCampus(host,{signal}={}){
  if(signal?.aborted)throw new DOMException("Campus mount cancelled","AbortError");
  const started=performance.now(),reducedQuery=matchMedia('(prefers-reduced-motion:reduce)');
  let contextUnavailable=false;
  let disposed=false,ready=false,visible=true,raf=0,dirty=3,tween=null,selected=null,mode='overview',timeOfDay='day',players=null,model=null,lastTime=0,frameCount=0,slowFrames=0,frameMs=16.7,loadMs=0;
  let animate=!reducedQuery.matches,driftStopped=false,driftTime=0,driftBase=null,noticeUntil=0;
  const hero=host.closest('#top');
  const isHero=()=>mode==='overview'&&!selected&&!hero?.classList.contains('is-exploring');
  const mobile=()=>host.clientWidth<=680;
  const emit=(name,detail={})=>host.dispatchEvent(new CustomEvent('campus:'+name,{detail,bubbles:true,composed:true}));
  const report=text=>{const el=document.getElementById('scene-status');if(el){el.hidden=false;el.textContent=text;}};
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  let pixelRatio=Math.min(devicePixelRatio,mobile()?1:1.35);
  renderer.setPixelRatio(pixelRatio);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
  const canvas=renderer.domElement;canvas.className='campus-canvas';canvas.setAttribute('aria-label','Interactive cricket academy with animated players. Drag to orbit; use the controls to zoom.');canvas.setAttribute('role','img');host.append(canvas);
  const scene=new T.Scene();scene.background=new T.Color(0xc6cfcb);scene.fog=new T.Fog(0xcbc9b8,500,1400);
  const DAY_SKY=new T.Color(0xc6cfcb),NIGHT_SKY=new T.Color(0x101b2a),DAY_HAZE=new T.Color(0xcbc9b8),NIGHT_HAZE=new T.Color(0x16202e);
  let nightMix=0,nightTarget=0,nightFrom=0,nightStart=0;const NIGHT_MS=1900;
  const lampMaterials=new Set(),interiorMaterials=new Set();
  const camera=new T.PerspectiveCamera(40,1,.2,2400);
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.1;controls.enableZoom=false;controls.enablePan=false;controls.minDistance=8;controls.maxDistance=1100;controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI*.475;
  controls.touches.ONE=T.TOUCH.ROTATE;controls.touches.TWO=T.TOUCH.DOLLY_ROTATE;canvas.style.touchAction='pan-y';
  const hemi=new T.HemisphereLight(0xdfe7f2,0xa08a5e,1.95);scene.add(hemi);
  const sun=new T.DirectionalLight(0xffeccd,3.35);sun.position.set(-78,196,58);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.08;sun.shadow.bias=-.0001;Object.assign(sun.shadow.camera,{left:-160,right:160,top:160,bottom:-160,near:1,far:430});scene.add(sun);
  const fill=new T.DirectionalLight(0xcfe0ef,.5);fill.position.set(90,80,-90);scene.add(fill);
  // Every night source is a real light. `delay` is its place in the switch-on sequence, so the
  // ground lights strike first and the buildings follow; there are no glow sprites anywhere.
  const nightLights=[];
  function nightLight(colour,peak,distance,angle,position,target,delay){
    const light=new T.SpotLight(colour,0,distance,angle,.85,2);
    light.position.set(...position);light.target.position.set(...target);
    light.userData={peak,delay};scene.add(light.target);nightLights.push(light);
  }
  [[-53,-45],[53,-45],[-53,45],[53,45]].forEach(([x,z],i)=>nightLight(0xffefd9,12500,190,.92,[x,29,z],[x*.28,0,z*.28],.08+i*.11));
  // Aimed low across the entrance elevation; pointing it into the hall washed out the roof.
  nightLight(0xdbe9ff,2400,70,.8,[-91,9,-54],[-91,3,-66],.58);
  for(const z of [-50,-7,42])nightLight(0xffeccd,2400,72,.92,[-75,12,z],[-91,0,z],.64+(z+50)/460);
  nightLight(0xffe6c4,3200,85,.95,[79,11,-2],[87,0,-2],.84);
  const overlay=document.createElement('div');overlay.className='campus-overlay';host.append(overlay);
  const tags=Object.entries(FACILITIES).map(([key,f])=>{
    const button=document.createElement('button');button.type='button';button.className='campus-hotspot';button.dataset.facility=key;button.setAttribute('aria-label','Explore '+f.label.toLowerCase());button.innerHTML='<span data-l>'+f.label+'</span><i></i>';
    button.addEventListener('pointerenter',()=>{driftStopped=true;});button.addEventListener('focus',()=>{driftStopped=true;});
    button.addEventListener('click',()=>{api.setSport(key);emit('select',{key});});overlay.append(button);return {button,point:new T.Vector3(...f.anchor),key};
  });
  const toolbar=document.createElement('div');toolbar.className='campus-tools';toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','3D view controls');
  toolbar.innerHTML=
    '<span class="tool-group"><span class="tool-label">View</span>'
    +'<button type="button" data-action="aerial">Aerial</button>'
    +'<button type="button" data-action="pitch">Ground</button></span>'
    +'<span class="tool-group"><span class="tool-label">Time</span>'
    +'<button type="button" data-action="day" aria-pressed="true">Day</button>'
    +'<button type="button" data-action="night" aria-pressed="false">Night</button></span>'
    +'<button type="button" class="tool-primary" data-action="tour">Play campus tour</button>'
    +'<span class="tool-icons">'
    +'<button type="button" class="tool-icon" data-action="motion" aria-pressed="'+animate+'" aria-label="'+(animate?'Pause motion':'Play motion')+'">'+(animate?'❚❚':'▶')+'</button>'
    +'<button type="button" class="tool-icon" data-action="in" aria-label="Zoom in">+</button>'
    +'<button type="button" class="tool-icon" data-action="out" aria-label="Zoom out">−</button>'
    +'<button type="button" class="tool-icon" data-action="reset" aria-label="Reset campus view">↺</button></span>';
  host.append(toolbar);
  const notice=document.createElement('p');notice.className='campus-notice';notice.hidden=true;
  notice.textContent='NIGHT TRAINING & MATCH FACILITY';host.append(notice);
  const projected=new T.Vector3();
  function positionTags(){
    camera.updateMatrixWorld();
    for(const {button,point,key} of tags){projected.copy(point).project(camera);const show=ready&&!tween&&mode!=='pitch'&&projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.91&&Math.abs(projected.y)<.79&&(!selected||key===selected);button.hidden=!show;button.style.left=(projected.x*.5+.5)*100+'%';button.style.top=(-projected.y*.5+.5)*100+'%';button.classList.toggle('active',key===selected);}
  }
  function viewport(){
    const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
    // Reserve the panel on desktop. The mobile layout places it above the canvas.
    const panel=document.getElementById('facility-panel'),reserve=selected&&!mobile()?Math.min(w*.43,(panel?.offsetWidth||320)+w*.06):0;
    const top=mobile()?24:105,bottom=mobile()?88:185;
    return {w,h,reserve,usableW:Math.max(150,w-reserve-48),usableH:Math.max(120,h-top-bottom),offsetX:reserve/2,offsetY:(bottom-top)/2};
  }
  function projection(){const v=viewport();camera.aspect=v.w/v.h;camera.setViewOffset(v.w,v.h,v.offsetX,v.offsetY,v.w,v.h);camera.updateProjectionMatrix();return v;}
  function fitted(bounds){
    const v=viewport(),center=new T.Vector3().addVectors(new T.Vector3(...bounds.min),new T.Vector3(...bounds.max)).multiplyScalar(.5),direction=new T.Vector3(...bounds.direction).normalize();
    const right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),direction).normalize(),up=new T.Vector3().crossVectors(direction,right).normalize();
    const tanV=Math.tan(T.MathUtils.degToRad(camera.fov/2)),tanH=tanV*v.w/v.h;let distance=8;
    for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]]){
      const p=new T.Vector3(x,y,z).sub(center),depth=p.dot(direction);distance=Math.max(distance,depth+Math.abs(p.dot(right))/(tanH*v.usableW/v.w),depth+Math.abs(p.dot(up))/(tanV*v.usableH/v.h));
    }
    return {position:center.clone().addScaledVector(direction,distance*1.06),target:center,offset:{x:v.offsetX,y:v.offsetY}};
  }
  function currentBounds(){return mode==='pitch'?{min:[-6,0,-16],max:[6,3,25],direction:[.65,.65,1]}:selected?FACILITIES[selected]:mode==='aerial'?{...CAMPUS_BOUNDS,direction:[.35,1.8,.55]}:CAMPUS_BOUNDS;}
  function currentView(){
    const view=fitted(currentBounds());
    if(isHero()){
      // Hero framing fills the background; facility and aerial views still fit their bounds.
      const scale=mobile()?(host.clientWidth<480?.58:.64):.63;
      view.position.sub(view.target).multiplyScalar(scale).add(view.target);
      view.offset={x:mobile()?0:-host.clientWidth*.07,y:mobile()?host.clientHeight*.12:0};
    }
    return view;
  }
  function drifting(){return isHero()&&ready&&animate&&!reducedQuery.matches&&!driftStopped&&!selected&&mode==='overview'&&!tween&&!!driftBase;}
  function move(view,intro=false){
    if(disposed)return;
    driftBase=null;
    // Flush residual orbit momentum before taking ownership of the camera.
    controls.enableDamping=false;controls.update();controls.enableDamping=true;
    tween={start:performance.now(),duration:reducedQuery.matches?0:1050,from:camera.position.clone(),to:view.position.clone(),oldTarget:controls.target.clone(),target:view.target.clone(),oldOffset:{x:camera.view?.offsetX||0,y:camera.view?.offsetY||0},offset:view.offset||{x:camera.view?.offsetX||0,y:camera.view?.offsetY||0},intro};dirty=3;wake();
  }
  function finishTween(){if(tween&&mode==='overview')driftBase={position:camera.position.clone(),target:controls.target.clone()};if(tween?.intro)emit('introdone');tween=null;}
  function frame(now){
    raf=0;if(disposed||contextUnavailable||!visible||document.hidden)return;
    const dt=lastTime?Math.min((now-lastTime)/1000,.05):0;lastTime=now;
    if(tween){const t=tween.duration?Math.min(1,(now-tween.start)/tween.duration):1,e=t*t*t*(t*(t*6-15)+10);camera.position.lerpVectors(tween.from,tween.to,e);controls.target.lerpVectors(tween.oldTarget,tween.target,e);camera.setViewOffset(host.clientWidth,host.clientHeight,T.MathUtils.lerp(tween.oldOffset.x,tween.offset.x,e),T.MathUtils.lerp(tween.oldOffset.y,tween.offset.y,e),host.clientWidth,host.clientHeight);if(t===1)finishTween();dirty=4;}
    if(drifting()){
      driftTime+=dt;
      const offset=driftBase.position.clone().sub(driftBase.target);
      offset.applyAxisAngle(new T.Vector3(0,1,0),Math.sin(driftTime*.16)*.085);
      offset.y+=Math.sin(driftTime*.12)*offset.length()*.008;
      camera.position.copy(driftBase.target).add(offset);controls.target.copy(driftBase.target);
    }
    if(nightMix!==nightTarget){
      const t=Math.min(1,(now-nightStart)/NIGHT_MS);
      nightMix=nightFrom+(nightTarget-nightFrom)*t;
      applyTimeOfDay();
    }
    if(noticeUntil&&now>noticeUntil){noticeUntil=0;notice.classList.remove('is-on');}
    controls.dampingFactor=1-Math.exp(-14*(dt||1/60));
    const changed=controls.update(dt);
    const distance=camera.position.distanceTo(controls.target);scene.fog.near=distance+180;scene.fog.far=distance+1000;
    const near=Math.max(.25,Math.min(12,distance*.025));if(Math.abs(camera.near-near)>.01){camera.near=near;camera.updateProjectionMatrix();}
    if(animate&&players)players.update(dt);
    positionTags();renderer.render(scene,camera);dirty--;frameCount++;
    // Reduce pixel work on sustained slow frames, without oscillating quality levels.
    if(dt>0&&frameCount>90){frameMs=frameMs*.97+dt*1000*.03;if(frameMs>29)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);if(slowFrames>90&&pixelRatio>.8){pixelRatio=Math.max(.8,pixelRatio-.2);renderer.setPixelRatio(pixelRatio);renderer.setSize(host.clientWidth,host.clientHeight,false);slowFrames=0;}}
    if(tween||dirty>0||changed||(animate&&players))wake();
  }
  function wake(){if(!raf&&!disposed&&!contextUnavailable&&visible&&!document.hidden)raf=requestAnimationFrame(frame);}
  function resize(){if(disposed||!host.clientWidth||!host.clientHeight)return;projection();renderer.setSize(host.clientWidth,host.clientHeight,false);if(ready)move(currentView());dirty=3;wake();}
  const observer=new ResizeObserver(resize);observer.observe(host);
  let wasHero=isHero();
  const heroObserver=new MutationObserver(()=>{const next=isHero();if(next!==wasHero){wasHero=next;if(ready&&mode==='overview'){driftStopped=false;driftTime=0;move(currentView());}}});
  if(hero)heroObserver.observe(hero,{attributes:true,attributeFilter:['class']});
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;lastTime=0;if(visible){dirty=3;wake();}else{cancelAnimationFrame(raf);raf=0;}},{rootMargin:'0px'});intersection.observe(host);
  const visibility=()=>{lastTime=0;if(!document.hidden){dirty=3;wake();}else{cancelAnimationFrame(raf);raf=0;}};document.addEventListener('visibilitychange',visibility);
  const motionChange=()=>setMotion(!reducedQuery.matches);reducedQuery.addEventListener('change',motionChange);
  const pointerStart=()=>{driftStopped=true;finishTween();dirty=4;wake();};canvas.addEventListener('pointerdown',pointerStart);controls.addEventListener('change',()=>{dirty=3;wake();});
  function setMotion(value){animate=value;const b=toolbar.querySelector('[data-action="motion"]');b.setAttribute('aria-pressed',String(animate));b.textContent=animate?'❚❚':'▶';b.setAttribute('aria-label',animate?'Pause motion':'Play motion');lastTime=0;dirty=3;wake();}
  const blend=(a,b,t)=>a+(b-a)*t;
  function applyTimeOfDay(){
    const e=nightMix*nightMix*(3-2*nightMix);
    scene.background.lerpColors(DAY_SKY,NIGHT_SKY,e);scene.fog.color.lerpColors(DAY_HAZE,NIGHT_HAZE,e);
    hemi.intensity=blend(1.95,.82,e);sun.intensity=blend(3.35,.26,e);fill.intensity=blend(.5,.19,e);
    renderer.toneMappingExposure=blend(1.08,1.36,e);
    for(const light of nightLights){
      // Each fitting ramps through its own slice of the transition, so they strike in order.
      const on=T.MathUtils.clamp((nightMix-light.userData.delay)/.26,0,1);
      light.intensity=light.userData.peak*on*on;
      if(on>0&&!light.parent)scene.add(light);else if(on===0&&light.parent)scene.remove(light);
    }
    for(const m of lampMaterials)m.emissiveIntensity=blend(.6,3.2,e);
    for(const m of interiorMaterials)m.emissiveIntensity=blend(.42,1.5,e);
    dirty=3;
  }
  function setTimeOfDay(value){
    timeOfDay=value==='night'?'night':'day';nightTarget=timeOfDay==='night'?1:0;
    nightFrom=nightMix;nightStart=performance.now();
    if(reducedQuery.matches){nightMix=nightTarget;applyTimeOfDay();}
    if(timeOfDay==='night'){notice.hidden=false;notice.classList.add('is-on');noticeUntil=performance.now()+5200;}
    else{notice.classList.remove('is-on');noticeUntil=0;}
    toolbar.querySelector('[data-action="day"]').setAttribute('aria-pressed',String(timeOfDay!=='night'));
    toolbar.querySelector('[data-action="night"]').setAttribute('aria-pressed',String(timeOfDay==='night'));
    dirty=3;wake();
  }
  function focusScreen(){
    const bounds=currentBounds(),points=[];camera.updateMatrixWorld();
    for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]]){const p=new T.Vector3(x,y,z).project(camera);points.push([(p.x*.5+.5)*host.clientWidth,(-p.y*.5+.5)*host.clientHeight]);}
    return {left:Math.min(...points.map(p=>p[0])),right:Math.max(...points.map(p=>p[0])),top:Math.min(...points.map(p=>p[1])),bottom:Math.max(...points.map(p=>p[1])),available:viewport()};
  }
  const api={
    setSport(key){finishTween();selected=FACILITIES[key]?key:null;mode=selected?'facility':'overview';driftStopped=!!selected;driftTime=0;move(currentView());},
    replayIntro(){finishTween();selected=null;mode='overview';driftStopped=false;driftTime=0;emit('select',{key:null});emit('introstart');const view=currentView();camera.position.copy(view.position).multiplyScalar(1.13);move(view,true);},
    setPreset(){resize();},setTimeOfDay,
    getDiagnostics(){return {ready,asset:'academy-campus.glb',moving:!!tween,cameraDrifting:drifting(),heroView:isHero(),selected,mode,timeOfDay,nightMix,nightTarget,sunIntensity:sun.intensity,hemiIntensity:hemi.intensity,floodlights:nightLights.filter(l=>l.intensity>0).length,players:players?.count||0,animationEnabled:animate,playerPose:players?.getPose(),animationTime:players?.elapsed||0,frames:frameCount,visible,trees:model?.userData.treeCount,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,geometryCount:renderer.info.memory.geometries,textureCount:renderer.info.memory.textures,pixelRatio,frameMs,loadMs,camera:camera.position.toArray(),target:controls.target.toArray(),size:[host.clientWidth,host.clientHeight],three:T.REVISION,focusScreen:focusScreen()};},dispose
  };
  toolbar.addEventListener('click',e=>{
    const action=e.target.closest('button')?.dataset.action;if(!action||!ready)return;if(!['motion','day','night','tour'].includes(action))driftStopped=true;
    if(action==='tour'){api.replayIntro();return;}
    if(action==='day'||action==='night')setTimeOfDay(action);
    else if(action==='motion')setMotion(!animate);
    else if(action==='reset'){api.setSport(null);emit('select',{key:null,explore:true});}
    else if(action==='aerial'){finishTween();selected=null;mode='aerial';emit('select',{key:null,explore:true});move(fitted(currentBounds()));}
    else if(action==='pitch'){finishTween();selected='ground';mode='pitch';emit('select',{key:'ground'});move(fitted(currentBounds()));}
    else{const offset=camera.position.clone().sub(controls.target).multiplyScalar(action==='in'?.8:1.25).clampLength(8,1100);move({position:controls.target.clone().add(offset),target:controls.target});}
  });
  function contextLost(event){event.preventDefault();contextUnavailable=true;cancelAnimationFrame(raf);raf=0;report('3D view paused. Waiting for graphics to recover…');}
  function contextRestored(){contextUnavailable=false;renderer.shadowMap.needsUpdate=true;document.getElementById('scene-status')?.setAttribute('hidden','');lastTime=0;dirty=3;wake();}
  canvas.addEventListener('webglcontextlost',contextLost);canvas.addEventListener('webglcontextrestored',contextRestored);
  function dispose(){
    if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();heroObserver.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);signal?.removeEventListener('abort',dispose);reducedQuery.removeEventListener('change',motionChange);controls.dispose();players?.dispose();
    release(scene);sun.shadow.dispose();renderer.dispose();canvas.remove();overlay.remove();toolbar.remove();
  }
  function release(root){
    const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});materials.forEach(m=>{Object.values(m).forEach(v=>{if(v?.isTexture)textures.add(v);});m.dispose();});geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());
  }
  signal?.addEventListener('abort',dispose,{once:true});

  camera.position.set(200,220,290);controls.target.set(0,5,0);controls.update();resize();report('Loading the 3D campus…');
  try{
    const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),asset=name=>new URL('../assets/campus/'+name,import.meta.url).href;
    const [campus,athlete]=await Promise.all([loader.loadAsync(asset('academy-campus.glb'),event=>{if(event.total)report('Loading the 3D campus · '+Math.round(event.loaded/event.total*100)+'%');}),loader.loadAsync(asset('academy-player.glb'))]);
    if(disposed){release(campus.scene);release(athlete.scene);return api;}
    model=campus.scene;model.traverse(o=>{if(o.isMesh){
      const surfaceMaterial=o.material;
      if(surfaceMaterial.name==='lamp')lampMaterials.add(surfaceMaterial);
      if(surfaceMaterial.name==='interior')interiorMaterials.add(surfaceMaterial);o.castShadow=!!o.userData.castShadow;o.receiveShadow=true;const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){m.shadowSide=T.FrontSide;for(const value of Object.values(m))if(value?.isTexture)value.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());}}});scene.add(model);players=createPlayers(scene,athlete);
    report('Preparing the 3D view…');await renderer.compileAsync(scene,camera);if(disposed)return api;
    applyTimeOfDay();renderer.shadowMap.needsUpdate=true;const view=currentView();camera.position.copy(view.position).multiplyScalar(1.08);controls.target.copy(view.target);controls.update();renderer.render(scene,camera);
    ready=true;loadMs=Math.round(performance.now()-started);emit('ready');emit('introstart');move(view,true);return api;
  }catch(error){dispose();throw error;}
}
