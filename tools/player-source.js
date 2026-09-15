import * as T from 'three';

// A reusable adult-proportioned athlete, exported once. No geometry is built at runtime.
export function createPlayerAsset(){
  const root=new T.Group();root.name='Athlete';
  const M={kit:new T.MeshStandardMaterial({color:0xf1f0df,roughness:1}),skin:new T.MeshStandardMaterial({color:0x986544,roughness:1}),navy:new T.MeshStandardMaterial({color:0x123552,roughness:.8}),shoe:new T.MeshStandardMaterial({color:0xe0e3e3,roughness:.8}),bat:new T.MeshStandardMaterial({color:0xc99e61,roughness:.9})};
  const capsule=new T.CapsuleGeometry(1,1,3,8),sphere=new T.SphereGeometry(1,12,8),box=new T.BoxGeometry(1,1,1);
  function part(parent,name,geo,mat,pos,scale){const o=new T.Mesh(geo,M[mat]);o.name=name;o.position.set(...pos);o.scale.set(...scale);parent.add(o);return o;}
  function pivot(name,pos){const g=new T.Group();g.name=name;g.position.set(...pos);root.add(g);return g;}
  part(root,'Shirt',capsule,'kit',[0,1.25,0],[.23,.21,.14]);
  part(root,'Waist',sphere,'navy',[0,.94,0],[.21,.13,.14]);
  part(root,'Neck',capsule,'skin',[0,1.57,0],[.07,.04,.07]);
  part(root,'Face',sphere,'skin',[0,1.73,.025],[.12,.155,.12]);
  part(root,'Cap',sphere,'navy',[0,1.83,0],[.13,.065,.135]);
  part(root,'Visor',box,'navy',[0,1.8,.13],[.23,.025,.15]);
  for(const side of [-1,1]){
    const suffix=side<0?'L':'R',arm=pivot('Arm'+suffix,[side*.25,1.45,0]);
    part(arm,'Sleeve'+suffix,capsule,'kit',[side*.025,-.12,0],[.085,.085,.085]);
    part(arm,'Forearm'+suffix,capsule,'skin',[side*.04,-.37,.025],[.058,.105,.058]);
    part(arm,'Hand'+suffix,sphere,'skin',[side*.04,-.53,.025],[.06,.085,.045]);
    const leg=pivot('Leg'+suffix,[side*.115,.94,0]);
    part(leg,'Trousers'+suffix,capsule,'kit',[0,-.4,0],[.087,.25,.087]);
    part(leg,'Shoe'+suffix,box,'shoe',[0,-.85,.065],[.17,.12,.31]);
  }
  const bat=pivot('Bat',[.3,.9,.13]);
  part(bat,'Blade',box,'bat',[0,-.34,.02],[.11,.56,.05]);
  part(bat,'Grip',capsule,'navy',[0,.05,0],[.02,.08,.02]);
  const tracks=(values)=>Object.entries(values).map(([joint,angles])=>new T.QuaternionKeyframeTrack(joint+'.quaternion',[0,.25,.5,.75,1],angles.flatMap(a=>[Math.sin(a/2),0,0,Math.cos(a/2)])));
  const run=new T.AnimationClip('Run',1,tracks({ArmL:[.7,0,-.7,0,.7],ArmR:[-.7,0,.7,0,-.7],LegL:[-.55,0,.55,0,-.55],LegR:[.55,0,-.55,0,.55]}));
  const batClip=new T.AnimationClip('Batting',4,tracks({ArmL:[-.3,-.6,-1.2,-.6,-.3],ArmR:[-.3,-.6,-1.2,-.6,-.3],Bat:[-.3,-.7,-1.5,-.7,-.3]}).map(t=>{for(let i=0;i<t.times.length;i++)t.times[i]*=4;return t;}));
  const bowl=new T.AnimationClip('Bowling',1,tracks({ArmR:[0,-1.5,-3.1,-4.7,-Math.PI*2],ArmL:[-.6,0,.6,0,-.6],LegL:[-.4,0,.4,0,-.4],LegR:[.4,0,-.4,0,.4]}));
  const idle=new T.AnimationClip('Fielding',3,tracks({ArmL:[-.15,-.22,-.15,-.08,-.15],ArmR:[-.15,-.08,-.15,-.22,-.15]}).map(t=>{for(let i=0;i<t.times.length;i++)t.times[i]*=3;return t;}));
  return {root,animations:[run,batClip,bowl,idle]};
}
