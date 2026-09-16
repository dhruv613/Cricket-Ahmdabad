import * as T from 'three';
import { SITE_LAYOUT as L } from './site-layout.js';

// Animate GLB joints on CPU, then draw all athletes through shared GPU instances.
export function createPlayers(scene,gltf){
  // Positions are relative to the wicket and then offset onto the ground from SITE_LAYOUT, so the
  // match always sits on the square wherever the plan puts it. Hard-coding them is what stranded
  // the whole side 50 m north when the layout origin moved to the ground centre.
  const G=L.cricketGround,P=L.cricketPitch;
  // Everyone stays inside 44 m, comfortably within the 50 m rope.
  const nearWicket=[
    [0,-10.0,'Batting',0],[.9,10.2,'Fielding',Math.PI],[0,15,'Bowling',Math.PI],[0,-14.2,'Fielding',0]
  ];
  const fielders=[
    [-4.5,-15,.5],[5.5,-16,-.5],[-20,-6,1.5],[-26,10,-1.5],[-12,17,2.5],[12,18,-2.5],
    [22,-5,.7],[27,12,-.7],[-34,-24,.35],[34,-26,-.35]
  ].map(([x,z,yaw])=>[x,z,'Fielding',yaw]);
  // Two outfielders work the deep, using the running clip.
  const chasing=[[-30,31,'Run',Math.PI/2],[31,33,'Run',-Math.PI/2]];
  const placements=[...nearWicket,...fielders,...chasing]
    .map(([x,z,clip,yaw])=>[P.x+x,(clip==='Bowling'?G.z:P.z)+z,clip,yaw]);
  const actors=[],batches=new Map();let elapsed=0,shown=true;
  for(const [x,z,clip,yaw] of placements){
    const root=gltf.scene.clone(true);root.position.set(x,.17,z);root.rotation.y=yaw;
    root.getObjectByName('Bat').visible=clip==='Batting';
    const mixer=new T.AnimationMixer(root),action=mixer.clipAction(T.AnimationClip.findByName(gltf.animations,clip));action.play();mixer.setTime(actors.length*.23);
    actors.push({root,mixer,action,clip,x,z,phase:actors.length*.7});
    root.traverse(o=>{
      if(!o.isMesh)return;let p=o;while(p){if(!p.visible)return;p=p.parent;}
      const key=o.geometry.uuid+o.material.uuid;let batch=batches.get(key);
      if(!batch){batch={geometry:o.geometry,material:o.material,parts:[]};batches.set(key,batch);}batch.parts.push(o);
    });
  }
  const group=new T.Group();group.name='Animated athletes';scene.add(group);
  for(const batch of batches.values()){
    const inst=new T.InstancedMesh(batch.geometry,batch.material,batch.parts.length);inst.instanceMatrix.setUsage(T.DynamicDrawUsage);
    inst.frustumCulled=false;inst.castShadow=false;inst.receiveShadow=true;batch.mesh=inst;group.add(inst);
  }
  const ball=new T.Mesh(new T.SphereGeometry(.085,8,6),new T.MeshStandardMaterial({color:0xac2538,roughness:.65}));ball.name='Cricket ball';scene.add(ball);
  // Contact shadows avoid redrawing the campus shadow map for moving athletes.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=32;
  const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(16,16,2,16,16,16);gradient.addColorStop(0,'#0007');gradient.addColorStop(1,'#0000');ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);
  const shadows=new T.InstancedMesh(new T.PlaneGeometry(1.1,1.1),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),actors.length);shadows.frustumCulled=false;scene.add(shadows);
  const matrix=new T.Matrix4(),rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2),one=new T.Vector3(1,1,1),point=new T.Vector3();
  function update(dt){
    elapsed+=dt;
    actors.forEach((a,i)=>{
      a.mixer.update(dt);
      if(a.clip==='Run'){const phase=elapsed*.65+a.phase;a.root.position.x=a.x+Math.sin(phase)*5;a.root.rotation.y=Math.cos(phase)>0?Math.PI/2:-Math.PI/2;}
      if(a.clip==='Bowling'){const phase=(elapsed+a.phase)%7;a.root.position.z=a.z-(a.x===0?(phase<4?phase*1.9:phase<5?7.6:7.6*(1-(phase-5)/2)):0);a.action.timeScale=phase<4?.6:1;}
      a.root.updateMatrixWorld(true);shadows.setMatrixAt(i,matrix.compose(point.set(a.root.position.x,.205,a.root.position.z),rotation,one));
    });
    for(const b of batches.values()){b.parts.forEach((part,i)=>b.mesh.setMatrixAt(i,part.matrixWorld));b.mesh.instanceMatrix.needsUpdate=true;}
    shadows.instanceMatrix.needsUpdate=true;
    const phase=elapsed%7;ball.visible=shown&&phase>4&&phase<5.25;const t=T.MathUtils.clamp((phase-4)/1.25,0,1);ball.position.set(0,.25+Math.abs(1-2*t)*1.5,62-24*t);
  }
  update(0);
  function setVisible(value){shown=!!value;group.visible=shown;shadows.visible=shown;ball.visible=shown&&ball.visible;}
  return {count:actors.length,update,setVisible,getPose(){return actors[0].root.getObjectByName('ArmR').quaternion.toArray();},get elapsed(){return elapsed;},dispose(){actors.forEach(a=>{a.mixer.stopAllAction();a.mixer.uncacheRoot(a.root);});}};
}
