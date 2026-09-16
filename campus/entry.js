import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/meshoptimizer/meshopt_decoder.module.js';
import { FACILITIES, CAMPUS_BOUNDS } from './facilities.js';
import { SITE_LAYOUT as L } from './site-layout.js';
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
  const DAY_BOUNCE=new T.Color(0xa08a5e),NIGHT_BOUNCE=new T.Color(0x4a5568);
  const lampMaterials=new Set(),interiorMaterials=new Set();
  let camera=new T.PerspectiveCamera(40,1,.2,2400);
  const perspectiveCamera=camera;
  // The validation camera is intentionally orthographic: it preserves the
  // plan's west-to-east facility order with north at the top of the screen.
  const planCamera=new T.OrthographicCamera(-1,1,1,-1,.2,2400);
  planCamera.up.set(0,0,1);
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
  // Masts stand at the ground's four corners and each washes only its own quadrant, so no two
  // beams converge on the centre and no pool reaches past the boundary. Cone angle, range and
  // penumbra are all sized to the 50 m ground rather than left at viewer defaults.
  const G=L.cricketGround;
  L.masts.forEach(([x,z],i)=>nightLight(0xffefd4,9200,118,.46,[x,28,z],
    [G.x+Math.sign(x)*G.radius*.42,0,G.z+Math.sign(z-G.z)*G.radius*.42],.06+i*.1));
  // Practice nets: two low masts along the lane axis.
  const pa=L.practiceArea.polygon,paX=pa.map(q=>q[0]),paZ=pa.map(q=>q[1]);
  const A={x:(Math.min(...paX)+Math.max(...paX))/2,z:(Math.min(...paZ)+Math.max(...paZ))/2,
           length:Math.max(...paZ)-Math.min(...paZ)};
  for(const [dz,delay] of [[-1,.5],[1,.56]])
    nightLight(0xffeccd,2100,52,.42,[A.x,15,A.z+dz*(A.length/2+5)],[A.x,0,A.z+dz*A.length*.18],delay);
  // Courts, sized to span the volleyball and pickleball blocks together.
  nightLight(0xe6f0ff,2300,54,.46,[(L.volleyball.x+L.pickleball.x)/2,15,L.volleyball.z-13],
    [(L.volleyball.x+L.pickleball.x)/2,0,L.volleyball.z],.62);
  // Arrival wedge: two column lights on the driveway, aimed down onto the paving.
  {
    const poly=L.parkingPolygon,cx=poly.reduce((a,q)=>a+q[0],0)/poly.length,cz=poly.reduce((a,q)=>a+q[1],0)/poly.length;
    for(const [dz,delay] of [[14,.7],[-14,.76]])
      nightLight(0xffe6c4,1500,44,.44,[cx,12,cz+dz],[cx,0,cz+dz*.3],delay);
  }
  // Facility entrances: food court / office frontage and the main entrance threshold.
  nightLight(0xffe6c4,1300,38,.44,[L.foodCourt.x,11,L.foodCourt.z-9],[L.foodCourt.x,0,L.foodCourt.z-2],.82);
  nightLight(0xffe6c4,1200,36,.42,[L.mainEntrance.x,10,L.mainEntrance.z+7],[L.mainEntrance.x,0,L.mainEntrance.z],.88);
  // Soft site-wide fill so nothing in the lower campus drops to black between pools.
  nightLight(0xbcd2e8,26000,360,.62,[G.x,190,G.z-52],[G.x,0,G.z-46],.3);
  const overlay=document.createElement('div');overlay.className='campus-overlay';host.append(overlay);
  const devPlan=/(?:\?|&)plan=1/.test(location.search);
  let planMesh=null,planOpacity=.5;
  function planOverlay(on){
    if(!on){if(planMesh)planMesh.visible=false;dirty=3;wake();return;}
    if(!planMesh){
      // Extent and centre come from tools/extract-plan.py, which rendered the sheet over a known
      // world window; east is -X, so the texture is mirrored to sit the right way round.
      const url=new URL('../assets/campus/plan-reference.png',import.meta.url).href;
      const tex=new T.TextureLoader().load(url,()=>{dirty=3;wake();});
      tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;
      // Image U runs west->east and V runs south->north; the world has east at -X and the
      // rotated plane sends +V to -Z, so both axes are inverted to land the sheet square.
      tex.repeat.set(-1,-1);tex.offset.set(1,1);
      const geo=new T.PlaneGeometry(260,220);geo.rotateX(-Math.PI/2);
      planMesh=new T.Mesh(geo,new T.MeshBasicMaterial({map:tex,transparent:true,opacity:planOpacity,depthWrite:false,depthTest:false}));
      planMesh.position.set(10,6,-35);planMesh.renderOrder=999;planMesh.frustumCulled=false;scene.add(planMesh);
    }
    planMesh.visible=true;planMesh.material.opacity=planOpacity;dirty=3;wake();
  }
  const tagOffsets={ground:[0,0],nets:[-8,-10],courts:[0,15],food:[-76,14],arrival:[72,20]};
  const tags=Object.entries(FACILITIES).map(([key,f])=>{
    const button=document.createElement('button');button.type='button';button.className='campus-hotspot hotspot-'+key;button.dataset.facility=key;button.setAttribute('aria-label','Explore '+f.label.toLowerCase());button.innerHTML='<span data-l>'+f.label+'</span><i></i>';
    button.addEventListener('pointerenter',()=>{driftStopped=true;});button.addEventListener('focus',()=>{driftStopped=true;});
    button.addEventListener('click',()=>{api.setSport(key);emit('select',{key});});overlay.append(button);return {button,point:new T.Vector3(...f.anchor),key};
  });
  const toolbar=document.createElement('div');toolbar.className='campus-tools';toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','3D view controls');
  toolbar.innerHTML=
    '<span class="tool-group"><span class="tool-label">View</span>'
    +'<button type="button" data-action="aerial">Aerial</button>'
    +'<button type="button" data-action="pitch">Ground</button>'
    +'<button type="button" data-action="plan">Plan view</button></span>'
    +'<span class="tool-group"><span class="tool-label">Time</span>'
    +'<button type="button" data-action="day" aria-pressed="true">Day</button>'
    +'<button type="button" data-action="night" aria-pressed="false">Night</button></span>'
    +'<button type="button" class="tool-primary" data-action="tour">Play campus tour</button>'
    +(devPlan?'<span class="tool-group"><span class="tool-label">Dev</span><button type="button" data-action="compare" aria-pressed="false">Compare with plan</button><button type="button" class="tool-icon" data-action="opacity" aria-label="Cycle overlay opacity">%</button></span>':'')
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
    // Two labels landing on the same spot leave the lower one unclickable - the upper one swallows
    // the pointer. Static per-key nudges cannot fix that because the overlap depends on the camera
    // angle, so stack any label that collides with one already placed this frame.
    const placed=[];
    for(const {button,point,key} of tags){
      projected.copy(point).project(camera);
      const show=ready&&!tween&&mode!=='pitch'&&mode!=='aerial'&&mode!=='plan'&&projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.91&&Math.abs(projected.y)<.79&&(!selected||key===selected);
      const left=(projected.x*.5+.5)*100,top=(-projected.y*.5+.5)*100;
      let [ox,oy]=tagOffsets[key]||[0,0];
      if(show){
        const px=left/100*host.clientWidth+ox;let py=top/100*host.clientHeight+oy;
        for(const p of placed)if(Math.abs(px-p.x)<136&&Math.abs(py-p.y)<34)py=p.y+34;
        oy+=py-(top/100*host.clientHeight+oy);
        placed.push({x:px,y:py});
      }
      button.hidden=!show;
      button.style.left=left+'%';button.style.top=top+'%';
      button.style.transform=`translate(calc(-50% + ${ox}px),calc(-50% + ${oy}px))`;
      button.classList.toggle('active',key===selected);
    }
  }
  function viewport(){
    const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
    // Reserve the panel on desktop. The mobile layout places it above the canvas.
    // The detail board docks along the bottom now, so it takes height beneath the subject rather
    // than a column beside it: reserve vertically and leave the full width to the model.
    const panel=document.getElementById('facility-panel'),reserve=0;
    // Only part of the board's height needs clearing: it is semi-transparent and sits in the
    // bottom-left corner, so reserving its full height just pushed the camera back and shrank the
    // subject. Reserve roughly half and let the rest overlap harmlessly.
    const panelH=selected?Math.min(h*.14,(panel?.offsetHeight||0)*.45):0;
    const top=mobile()?24:105,bottom=(mobile()?88:185)+panelH;
    return {w,h,reserve,usableW:Math.max(150,w-reserve-48),usableH:Math.max(120,h-top-bottom),offsetX:reserve/2,offsetY:(bottom-top)/2};
  }
  function projection(){
    const v=viewport();
    if(camera.isOrthographicCamera){
      const planHeight=(CAMPUS_BOUNDS.max[2]-CAMPUS_BOUNDS.min[2])*1.1,planWidth=planHeight*v.w/v.h;
      camera.left=-planWidth/2;camera.right=planWidth/2;camera.top=planHeight/2;camera.bottom=-planHeight/2;camera.updateProjectionMatrix();return v;
    }
    camera.aspect=v.w/v.h;camera.setViewOffset(v.w,v.h,v.offsetX,v.offsetY,v.w,v.h);camera.updateProjectionMatrix();return v;
  }
  function fitted(bounds){
    const v=viewport(),center=new T.Vector3().addVectors(new T.Vector3(...bounds.min),new T.Vector3(...bounds.max)).multiplyScalar(.5),direction=new T.Vector3(...bounds.direction).normalize();
    const right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),direction).normalize(),up=new T.Vector3().crossVectors(direction,right).normalize();
    const tanV=Math.tan(T.MathUtils.degToRad(camera.fov/2)),tanH=tanV*v.w/v.h;let distance=8;
    for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]]){
      const p=new T.Vector3(x,y,z).sub(center),depth=p.dot(direction);distance=Math.max(distance,depth+Math.abs(p.dot(right))/(tanH*v.usableW/v.w),depth+Math.abs(p.dot(up))/(tanV*v.usableH/v.h));
    }
    return {position:center.clone().addScaledVector(direction,distance*1.06),target:center,offset:{x:v.offsetX,y:v.offsetY}};
  }
  // Ground view frames the wicket itself, derived from the layout - the old literal bounds still
  // pointed at z=50, where the square sat before the origin moved to the ground centre.
  const PITCH=L.cricketPitch;
  function currentBounds(){return mode==='pitch'?{min:[PITCH.x-8,0,PITCH.z-16],max:[PITCH.x+8,3,PITCH.z+25],direction:[.65,.65,-1]}:selected?FACILITIES[selected]:mode==='aerial'?{...CAMPUS_BOUNDS,direction:[.18,1.35,-.62]}:CAMPUS_BOUNDS;}
  function currentView(){
    const view=fitted(currentBounds());
    if(isHero()){
      // Hero framing fills the background; facility and aerial views still fit their bounds.
      const scale=mobile()?(host.clientWidth<480?.58:.64):.63;
      view.position.sub(view.target).multiplyScalar(scale).add(view.target);
      view.offset={x:mobile()?0:-host.clientWidth*.07,y:mobile()?host.clientHeight*.12:0};
    }else if(mode==='overview'||mode==='aerial'||mode==='plan'){
      // The dedicated Explore view is deliberately closer than the embedded
      // page preview, but it still keeps the complete site and road visible.
      const immersive=hero?.classList.contains('is-exploring');
      const aerial=mode==='aerial';
      const scale=aerial?(mobile()?.62:.56):immersive?(mobile()?.55:.55):(mobile()?.78:.84);
      view.position.sub(view.target).multiplyScalar(scale).add(view.target);
    }
    return view;
  }
  function switchCamera(next,isPlan=false){
    if(camera===next)return;
    camera=next;controls.object=camera;controls.enableRotate=!isPlan;controls.enableDamping=!isPlan;controls.enablePan=false;controls.enableZoom=false;
    projection();
  }
  function planView(){
    const center=new T.Vector3().addVectors(new T.Vector3(...CAMPUS_BOUNDS.min),new T.Vector3(...CAMPUS_BOUNDS.max)).multiplyScalar(.5);
    const shift=mobile()?6:14;
    camera.position.set(center.x,420,center.z-shift);camera.up.set(0,0,1);controls.target.set(center.x,0,center.z-shift);camera.lookAt(controls.target);camera.updateMatrixWorld();
  }
  function enterPlanView(){
    finishTween();selected=null;mode='plan';driftStopped=true;hero?.classList.add('is-plan-validation');switchCamera(planCamera,true);planView();players?.setVisible(false);markView();dirty=4;wake();
  }
  function leavePlanView(){
    hero?.classList.remove('is-plan-validation');
    if(camera===planCamera){switchCamera(perspectiveCamera,false);players?.setVisible(true);}
  }
  // Stops follow the arrival sequence on the drawing: road, wedge, amenities, courts, practice,
  // ground, then a final overview. Each entry is an existing camera target, never a new transform.
  const TOUR=[
    {key:'arrival',hold:3200},{key:'food',hold:3000},{key:'courts',hold:3000},
    {key:'nets',hold:3200},{key:'ground',hold:3600},{key:null,hold:4200}
  ];
  let tourStep=-1,tourUntil=0;
  function tourStop(){
    if(tourStep<0||tourStep>=TOUR.length){stopTour();return;}
    const stop=TOUR[tourStep];
    selected=stop.key&&FACILITIES[stop.key]?stop.key:null;
    mode=selected?'facility':'overview';
    emit('select',{key:selected});
    move(currentView());
    tourUntil=performance.now()+stop.hold+1100;
    dirty=3;wake();
  }
  function startTour(){
    finishTween();leavePlanView();driftStopped=true;tourStep=0;
    toolbar.querySelector('[data-action="tour"]')?.setAttribute('aria-pressed','true');
    tourStop();
  }
  function stopTour(){
    if(tourStep<0)return;
    tourStep=-1;tourUntil=0;
    toolbar.querySelector('[data-action="tour"]')?.setAttribute('aria-pressed','false');
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
    if(tourStep>=0&&now>tourUntil){tourStep++;tourStep<TOUR.length?tourStop():stopTour();}
    controls.dampingFactor=1-Math.exp(-14*(dt||1/60));
    // The validation view must stay geometrically fixed. OrbitControls retains
    // spherical state from the perspective camera, so never update it here.
    const changed=camera===planCamera?false:controls.update(dt);
    const distance=camera.position.distanceTo(controls.target),haze=nightMix*nightMix*(3-2*nightMix);
    scene.fog.near=distance+blend(180,45,haze);scene.fog.far=distance+blend(1000,360,haze);
    const near=Math.max(.25,Math.min(12,distance*.025));if(Math.abs(camera.near-near)>.01){camera.near=near;camera.updateProjectionMatrix();}
    if(animate&&players)players.update(dt);
    positionTags();renderer.render(scene,camera);dirty--;frameCount++;
    // Reduce pixel work on sustained slow frames, without oscillating quality levels.
    if(dt>0&&frameCount>90){frameMs=frameMs*.97+dt*1000*.03;if(frameMs>29)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);if(slowFrames>90&&pixelRatio>.8){pixelRatio=Math.max(.8,pixelRatio-.2);renderer.setPixelRatio(pixelRatio);renderer.setSize(host.clientWidth,host.clientHeight,false);slowFrames=0;}}
    if(tween||dirty>0||changed||(animate&&players))wake();
  }
  function wake(){if(!raf&&!disposed&&!contextUnavailable&&visible&&!document.hidden)raf=requestAnimationFrame(frame);}
  function resize(){if(disposed||!host.clientWidth||!host.clientHeight)return;projection();renderer.setSize(host.clientWidth,host.clientHeight,false);if(ready){if(mode==='plan')planView();else move(currentView());}dirty=3;wake();}
  const observer=new ResizeObserver(resize);observer.observe(host);
  let wasHero=isHero();
  const heroObserver=new MutationObserver(()=>{const next=isHero();if(next!==wasHero){wasHero=next;if(ready&&mode==='overview'){driftStopped=false;driftTime=0;move(currentView());}}});
  if(hero)heroObserver.observe(hero,{attributes:true,attributeFilter:['class']});
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;lastTime=0;if(visible){dirty=3;wake();}else{cancelAnimationFrame(raf);raf=0;}},{rootMargin:'0px'});intersection.observe(host);
  const visibility=()=>{lastTime=0;if(!document.hidden){dirty=3;wake();}else{cancelAnimationFrame(raf);raf=0;}};document.addEventListener('visibilitychange',visibility);
  const motionChange=()=>setMotion(!reducedQuery.matches);reducedQuery.addEventListener('change',motionChange);
  const pointerStart=()=>{if(mode==='plan')return;stopTour();driftStopped=true;finishTween();dirty=4;wake();};canvas.addEventListener('pointerdown',pointerStart);controls.addEventListener('change',()=>{if(mode==='plan')return;dirty=3;wake();});
  function setMotion(value){animate=value;const b=toolbar.querySelector('[data-action="motion"]');b.setAttribute('aria-pressed',String(animate));b.textContent=animate?'❚❚':'▶';b.setAttribute('aria-label',animate?'Pause motion':'Play motion');lastTime=0;dirty=3;wake();}
  const blend=(a,b,t)=>a+(b-a)*t;
  function applyTimeOfDay(){
    const e=nightMix*nightMix*(3-2*nightMix);
    scene.background.lerpColors(DAY_SKY,NIGHT_SKY,e);scene.fog.color.lerpColors(DAY_HAZE,NIGHT_HAZE,e);
    hemi.intensity=blend(1.95,.86,e);sun.intensity=blend(3.35,.30,e);fill.intensity=blend(.5,.24,e);
    hemi.groundColor.lerpColors(DAY_BOUNCE,NIGHT_BOUNCE,e);
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
  function markView(){
    for(const action of ['aerial','pitch','plan']){
      const on=action==='plan'?mode==='plan':action==='aerial'?mode==='aerial':mode==='pitch';
      toolbar.querySelector('[data-action="'+action+'"]')?.setAttribute('aria-pressed',String(on));
    }
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
    setSport(key){stopTour();finishTween();leavePlanView();selected=FACILITIES[key]?key:null;mode=selected?'facility':'overview';driftStopped=!!selected;driftTime=0;move(currentView());markView();},
    replayIntro(){finishTween();leavePlanView();selected=null;mode='overview';driftStopped=false;driftTime=0;emit('select',{key:null});emit('introstart');const view=currentView();camera.position.copy(view.position).multiplyScalar(1.13);move(view,true);markView();},
    setPreset(){resize();},setTimeOfDay,
    getDiagnostics(){return {ready,asset:'academy-campus.glb',moving:!!tween,cameraType:camera.type,cameraDrifting:drifting(),heroView:isHero(),selected,mode,timeOfDay,nightMix,nightTarget,sunIntensity:sun.intensity,hemiIntensity:hemi.intensity,floodlights:nightLights.filter(l=>l.intensity>0).length,players:players?.count||0,animationEnabled:animate,playerPose:players?.getPose(),animationTime:players?.elapsed||0,frames:frameCount,visible,trees:model?.userData.treeCount,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,geometryCount:renderer.info.memory.geometries,textureCount:renderer.info.memory.textures,pixelRatio,frameMs,loadMs,camera:camera.position.toArray(),target:controls.target.toArray(),size:[host.clientWidth,host.clientHeight],three:T.REVISION,focusScreen:focusScreen()};},dispose
  };
  toolbar.addEventListener('click',e=>{
    // Every branch below can change `mode`, so the pressed state is refreshed after the fact.
    const action=e.target.closest('button')?.dataset.action;if(!action||!ready)return;if(!['motion','day','night','tour'].includes(action)){driftStopped=true;stopTour();}
    if(action==='tour'){tourStep>=0?stopTour():startTour();return;}
    if(action==='compare'){
      const btn=toolbar.querySelector('[data-action="compare"]');
      const on=btn.getAttribute('aria-pressed')!=='true';
      btn.setAttribute('aria-pressed',String(on));
      if(on&&mode!=='plan')enterPlanView();
      planOverlay(on);markView();return;
    }
    if(action==='opacity'){
      planOpacity=planOpacity>=.75?.25:planOpacity+.25;
      if(planMesh){planMesh.material.opacity=planOpacity;dirty=3;wake();}
      return;
    }
    if(action==='day'||action==='night')setTimeOfDay(action);
    else if(action==='motion')setMotion(!animate);
    else if(action==='reset'){api.setSport(null);emit('select',{key:null,explore:true});}
    else if(action==='aerial'){finishTween();leavePlanView();selected=null;mode='aerial';move(currentView());emit('select',{key:null,explore:true});}
    // Plan view is an alignment check, not a cinematic mode: it clears the selection but must not
    // put the page into immersive full-screen, which would pin the hero and block normal scrolling.
    else if(action==='plan'){enterPlanView();emit('select',{key:null});}
    else if(action==='pitch'){finishTween();leavePlanView();selected='ground';mode='pitch';emit('select',{key:'ground'});move(fitted(currentBounds()));}
    else if(camera!==planCamera){const offset=camera.position.clone().sub(controls.target).multiplyScalar(action==='in'?.8:1.25).clampLength(8,1100);move({position:controls.target.clone().add(offset),target:controls.target});}
    markView();
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
