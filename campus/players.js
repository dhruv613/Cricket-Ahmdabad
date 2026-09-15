import * as T from 'three';

// Animate GLB joints on CPU, then draw all athletes through shared GPU instances.
export function createPlayers(scene,gltf){
  const placements=[[-.7,-8.7,'Batting',0],[1.9,9,'Fielding',Math.PI],[0,23,'Bowling',Math.PI],[0,-13,'Fielding',0],[-12,-16,'Fielding',.5],[13,-20,'Fielding',-.5],[-31,5,'Fielding',1.5],[32,7,'Fielding',-1.5],[-22,34,'Fielding',2.5],[20,36,'Fielding',-2.5],[-42,-29,'Fielding',.7],[44,-28,'Fielding',-.7],[-103,-19,'Batting',Math.PI/2],[-85,-19,'Bowling',-Math.PI/2],[22,79,'Run',Math.PI/2],[36,79,'Run',-Math.PI/2]];
  const actors=[],batches=new Map();let elapsed=0;
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
    const phase=elapsed%7;ball.visible=phase>4&&phase<5.25;const t=T.MathUtils.clamp((phase-4)/1.25,0,1);ball.position.set(0,.25+Math.abs(1-2*t)*1.5,15-24*t);
  }
  update(0);
  return {count:actors.length,update,getPose(){return actors[0].root.getObjectByName('ArmR').quaternion.toArray();},get elapsed(){return elapsed;},dispose(){actors.forEach(a=>{a.mixer.stopAllAction();a.mixer.uncacheRoot(a.root);});}};
}
