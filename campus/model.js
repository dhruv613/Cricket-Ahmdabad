import * as T from 'three';
import { Builder } from './geometry.js';
import { canvasTexture, random } from './materials.js';
import { SITE_LAYOUT as L } from './site-layout.js';

const PI=Math.PI;
export { FACILITIES } from './facilities.js';

// Every transform below reads from site-layout.js, which is traced from the architect's vector
// drawing. Nothing in this file positions a site element by hand: adjust the plan, not the builder.
export async function buildCampus(scene,M,report){
  const b=new Builder(scene,M),rng=random(20260309),lights=[];
  const brand=window.ACADEMY?.brand?.full||'SEVENTEEN SPORTS';
  const surface=(w,d,mat,x,z,y=.02)=>b.plane(w,d,mat,x,y,z,[-PI/2,0,0],mat==='asphalt'?5:3);
  function polygon(points,mat,y=.02){
    const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
    const mesh=b.mesh(new T.ShapeGeometry(shape),mat,[0,y,0],[-PI/2,0,0]);mesh.castShadow=false;return mesh;
  }
  const decal=(w,h,material,x,y,z,rotation=0)=>b.mesh(new T.PlaneGeometry(w,h),material,[x,y,z],[0,rotation,0]);
  function sign(text,w,h,x,y,z,rotation=0,bg='#0b2941',fg='#f5f4eb'){
    const tex=canvasTexture(1024,Math.max(160,Math.round(1024*h/w)),(ctx,cw,ch)=>{
      ctx.fillStyle=bg;ctx.fillRect(0,0,cw,ch);ctx.strokeStyle='#45c8ed';ctx.lineWidth=12;ctx.strokeRect(6,6,cw-12,ch-12);
      ctx.fillStyle=fg;ctx.font=`700 ${Math.min(ch*.5,cw/(text.length*.64))}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,cw/2,ch/2,cw*.9);
    });
    const mat=new T.MeshStandardMaterial({map:tex,roughness:.5,emissiveMap:tex,emissive:0xffffff,emissiveIntensity:.08});
    b.box(w+.3,h+.24,.14,'navy',x,y,z,[0,rotation,0]);decal(w,h,mat,x,y,z+.09,rotation);
    for(const side of [-1,1])b.cylinder(.055,.055,y-h/2-.1,'darkMetal',x+side*(w/2-.25),Math.max(.1,(y-h/2-.1)/2),z,[],8);
  }
  function beam(a,c,r,mat='metal'){b.beam(a,c,r,mat);}
  const centroid=ring=>ring.reduce((a,p)=>[a[0]+p[0]/ring.length,a[1]+p[1]/ring.length],[0,0]);
  const extent=ring=>({
    minX:Math.min(...ring.map(p=>p[0])),maxX:Math.max(...ring.map(p=>p[0])),
    minZ:Math.min(...ring.map(p=>p[1])),maxZ:Math.max(...ring.map(p=>p[1]))
  });
  function tree(x,z,scale=1){
    const h=(5.8+rng()*3)*scale,spread=(2.2+rng()*1.1)*scale,leaf=new T.PlaneGeometry(2.7,2.7);
    b.cylinder(.13*scale,.28*scale,h*.65,'bark',x,h*.325,z,[],9);
    for(let i=0;i<6;i++){const a=i*2.399+rng(),dx=Math.cos(a)*spread,dz=Math.sin(a)*spread,cy=h*.66+(rng()-.5)*spread*.3;beam([x,h*.36,z],[x+dx,cy,z+dz],.06*scale,'bark');}
    for(let i=0;i<68;i++){const a=i*2.399,vy=rng()*2-1,r=Math.sqrt(1-vy*vy)*spread*(.55+rng()*.45),s=(.62+rng()*.4)*scale;b.add(leaf,'foliage',[x+Math.cos(a)*r,h*.69+vy*spread*.78,z+Math.sin(a)*r],[(rng()-.5)*PI,a,rng()*PI],[s,s,s]);}
  }
  function fence(x1,z1,x2,z2){
    const a=new T.Vector3(x1,0,z1),c=new T.Vector3(x2,0,z2),len=a.distanceTo(c),count=Math.ceil(len/4);
    beam([x1,.42,z1],[x2,.42,z2],.12,'concrete');
    for(let i=0;i<=count;i++){const p=a.clone().lerp(c,i/count);b.box(.25,2.45,.25,'facade',p.x,1.22,p.z);}
    for(let i=0;i<len;i+=.45){const p=a.clone().lerp(c,i/len);b.cylinder(.018,.018,1.72,'darkMetal',p.x,1.34,p.z,[],6);}
    for(const y of [.76,2.12])beam([x1,y,z1],[x2,y,z2],.028,'darkMetal');
  }
  function strip(a,c,width,mat,y=.09,tile=5){
    const [x1,z1]=a,[x2,z2]=c,len=Math.hypot(x2-x1,z2-z1),angle=Math.atan2(x2-x1,z2-z1);
    b.plane(width,len,mat,(x1+x2)/2,y,(z1+z2)/2,[-PI/2,angle,0],tile);return {len,angle};
  }
  function light(x,z,targetX,targetZ){
    const h=27;b.box(1.8,.6,1.8,'concrete',x,.3,z);b.cylinder(.16,.38,h,'metal',x,h/2+.6,z,[],14);
    b.box(4.2,.2,1.35,'darkMetal',x,h+.15,z);for(let col=0;col<4;col++)for(let row=0;row<3;row++){const lx=x+(col-1.5)*.98,ly=h-.25+row*.5;b.box(.85,.42,.1,'lamp',lx,ly,z+.66,[.17,0,0],false);}
    const l=new T.SpotLight(0xffefd4,0,175,.76,.78,2);l.position.set(x,h+1,z);l.target.position.set(targetX,0,targetZ);scene.add(l,l.target);lights.push(l);
  }
  function ring(radius,y,mat,r=.07){const g=L.cricketGround,pts=[];for(let i=0;i<=160;i++){const a=i/160*PI*2;pts.push(new T.Vector3(g.x+Math.cos(a)*radius,y,g.z+Math.sin(a)*radius));}return b.mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),160,r,5,true),mat);}
  function wicket(){
    const {x,z}=L.cricketPitch;surface(L.cricketPitch.width,L.cricketPitch.length,'square',x,z,.13);
    for(let lane=-2;lane<=2;lane++)b.plane(2.95,20.12,lane===0?'pitch':'square',x+lane*3.03,.15,z,[-PI/2,0,0],24);
    for(const side of [-1,1]){for(const dx of [-.12,0,.12])b.cylinder(.018,.018,.71,'wood',x+dx,.52,z+side*10.05,[],8);for(const dz of [10.06,8.84])b.box(2.65,.02,.055,'white',x,.17,z+side*dz,[0,0,0],false);}
  }
  function court(x,z,w,d,label,kind){
    surface(w+1.4,d+1.4,'concrete',x,z,.1);surface(w,d,kind==='pickleball'?'courtBlue':'courtTeal',x,z,.12);
    for(const dz of [-1,1])b.box(w,.024,.06,'white',x,.15,z+dz*d/2,[0,0,0],false);
    for(const dx of [-1,1])b.box(.06,.024,d,'white',x+dx*w/2,.15,z,[0,0,0],false);
    b.box(w,.026,.05,'white',x,.152,z,[0,0,0],false);
    if(kind==='volleyball')for(const dz of [-3,3])b.box(w,.026,.05,'white',x,.152,z+dz,[0,0,0],false);
    else{
      for(const dz of [-2.13,2.13])b.box(w,.026,.05,'white',x,.152,z+dz,[0,0,0],false);
      for(const dz of [-1,1])b.box(.05,.026,d/2-2.13,'white',x,.152,z+dz*(d/4+1.065),[0,0,0],false);
    }
    for(const dx of [-1,1])b.cylinder(.04,.04,1.15,'metal',x+dx*(w/2+.2),.68,z,[],8);
    b.plane(w+.4,.95,'net',x,.78,z,[0,0,0],.3);
    beam([x-w/2-.2,1.24,z],[x+w/2+.2,1.24,z],.03,'metal');
    if(label)sign(label,Math.min(w,8),.55,x,1.5,z+d/2+1.2);
  }
  function pavilion(x,z,w,d,h,label,roof='navy'){
    b.box(w+1,.35,d+1,'concrete',x,.18,z);b.box(w,h,d,'facade',x,h/2+.36,z);b.box(w+.8,.28,d+.8,roof,x,h+.5,z);
    b.box(w-1.1,2.1,.1,'glass',x,1.9,z+d/2+.07,[0,0,0],false);for(let px=-w/2+1;px<w/2;px+=2)b.box(.08,2.3,.18,'darkMetal',x+px,1.9,z+d/2+.13);
    for(let step=0;step<2;step++)b.box(Math.min(w,4)+step*.45,.12*(2-step),.6,'concrete',x,.06*(2-step),z+d/2+.9+step*.6);
    if(label)sign(label,Math.min(w*.8,14),.6,x,h-.05,z+d/2+.5);
  }
  function practiceArea(){
    const a=L.practiceArea,e=extent(a.polygon),c=centroid(a.polygon);
    polygon(a.polygon,'paving',.05);
    const w=e.maxX-e.minX,d=e.maxZ-e.minZ,inset=a.netsInset;
    const laneW=(w-inset*2)/a.lanes,laneD=d-inset*2;
    for(let lane=0;lane<a.lanes;lane++){
      const x=e.minX+inset+laneW*(lane+.5);
      surface(laneW-.3,laneD,'concrete',x,c[1],.12);
      b.plane(laneW-.6,laneD-.7,lane===a.lanes-1?'astro':'pitch',x,.145,c[1],[-PI/2,0,0],24);
      for(const side of [-1,1]){
        b.plane(laneD,4.5,'net',x+side*(laneW/2-.15),2.45,c[1],[0,side*PI/2,0],.24);
        beam([x+side*(laneW/2-.15),4.8,c[1]-laneD/2],[x+side*(laneW/2-.15),4.8,c[1]+laneD/2],.03);
        for(let t=-.5;t<=.5;t+=.25)b.cylinder(.055,.055,5,'darkMetal',x+side*(laneW/2-.15),2.5,c[1]+t*laneD,[],7);
      }
      for(const dz of [-1,1])b.plane(laneW,4.5,'net',x,2.45,c[1]+dz*laneD/2,[0,0,0],.24);
      for(const dx of [-.12,0,.12])b.cylinder(.018,.018,.71,'wood',x+dx,.53,c[1]-laneD*.3,[],8);
    }
    for(let i=0;i<a.polygon.length;i++){
      const p=a.polygon[i],q=a.polygon[(i+1)%a.polygon.length];
      beam([p[0],.14,p[1]],[q[0],.14,q[1]],.1,'concrete');
    }
    sign('CRICKET PRACTICE AREA',16,.7,c[0],1.3,e.minZ-1.6);
  }

  report('Tracing the Vastral site boundary and frontage');
  surface(460,460,'soil',0,-30,-.15);
  // Pink circulation zone = the whole plot; green frontage and yellow zones overlay it.
  polygon(L.siteBoundary,'apron',0);
  polygon(L.frontLandscape,'lawn',.03);
  // 9 M WIDE ROAD - written width, traced alignment, sitting on the south frontage.
  const [rw,re]=L.road.north,rd=L.road.width;
  const roadRing=[[rw[0],rw[1]],[re[0],re[1]],[re[0],re[1]-rd],[rw[0],rw[1]-rd]];
  polygon(roadRing,'asphalt',.02);
  {
    const {len,angle}=strip(rw,re,0,'asphalt',.02,5);
    for(const off of [0,-rd])beam([rw[0],.05,rw[1]+off],[re[0],.05,re[1]+off],.08,'white');
    for(let t=6;t<len-6;t+=9){
      const f=t/len;b.box(.2,.02,3.4,'white',rw[0]+(re[0]-rw[0])*f,.05,rw[1]+(re[1]-rw[1])*f-rd/2,[0,angle,0],false);
    }
  }
  // Boundary fence, broken only at the main entrance on the south-east frontage.
  const main=L.mainEntrance;
  for(let i=0;i<L.siteBoundary.length;i++){
    const a=L.siteBoundary[i],c=L.siteBoundary[(i+1)%L.siteBoundary.length];
    const south=a[1]<-110&&c[1]<-110;
    if(south){
      // Leave a clear opening the width of the entrance so the road connects.
      const dir=Math.sign(c[0]-a[0]);
      fence(a[0],a[1],main.x-dir*main.width/2,main.z);fence(main.x+dir*main.width/2,main.z,c[0],c[1]);
    }else fence(a[0],a[1],c[0],c[1]);
  }

  report('Building the 100 metre cricket ground');
  const g=L.cricketGround,fieldGeo=new T.CircleGeometry(g.radius,160);fieldGeo.rotateX(-PI/2);
  const field=b.mesh(fieldGeo,M.turf,[g.x,.11,g.z]);field.castShadow=false;
  const outfieldMat=M.turf.clone();outfieldMat.color.set(0xc0c6a6);
  const apron=b.mesh(new T.RingGeometry(g.radius+.4,g.radius+g.apron,160).rotateX(-PI/2),outfieldMat,[g.x,.1,g.z]);apron.castShadow=false;
  ring(g.radius+.3,.17,'white',.08);wicket();
  for(let i=0;i<32;i++){const a=i/32*PI*2,x=g.x+Math.cos(a)*(g.radius-2),z=g.z+Math.sin(a)*(g.radius-2);b.box(2.8,.38,.45,i%3?'white':'navy',x,.3,z,[0,-a+PI/2,0]);}
  for(const [x,z] of L.masts)light(x,z,g.x+Math.sign(x)*g.radius*.42,g.z+Math.sign(z)*g.radius*.42);

  report('Placing courts, practice area and frontage buildings');
  practiceArea();
  const store=L.storeArea;pavilion(store.x,store.z,store.width,store.length,2.6,'STORE AREA');
  // Volleyball: written 9 x 18 court inside its drawn run-off box.
  const v=L.volleyball;surface(v.box.width,v.box.length,'paving',v.x,v.z,.08);
  court(v.x,v.z,v.width,v.length,'VOLLEYBALL','volleyball');
  // Pickleball: one block of two written 12 x 19.2 courts, centres as drawn.
  const p=L.pickleball;surface(p.box.width+1,p.box.length+1,'paving',p.x,p.z,.08);
  p.courtCentres.forEach((cx,i)=>court(cx,p.z,p.width-.6,p.length,i?'':'PICKLEBALL','pickleball'));
  // Food court is an open zone on the circulation area; office and service bay sit below it.
  const food=L.foodCourt;surface(food.width,food.length,'paving',food.x,food.z,.07);
  for(const dx of [-1,0,1])for(const dz of [-1,1]){
    b.box(2,.1,.8,'wood',food.x+dx*4.6,.72,food.z+dz*3);
    for(const s of [-1,1])b.box(.1,.68,.64,'darkMetal',food.x+dx*4.6+s*.8,.35,food.z+dz*3);
  }
  b.box(food.width-1,.18,5,'blue',food.x,3,food.z);
  for(const dx of [-1,1])for(const dz of [-1,1])b.cylinder(.09,.09,2.9,'metal',food.x+dx*(food.width/2-1.4),1.45,food.z+dz*2.2,[],8);
  sign('FOOD COURT',9,.6,food.x,1.5,food.z-food.length/2-1);
  const office=L.office,bay=L.serviceBay;
  pavilion(office.x,office.z,office.width,office.length,3,'OFFICE','navy');
  pavilion(bay.x,bay.z,bay.width,bay.length,3,'','slab');

  report('Forming the arrival wedge and main entrance');
  // Yellow arrival wedge, traced as one polygon. Open circulation in the middle.
  polygon(L.parkingPolygon,'paving',.06);
  for(let i=0;i<L.parkingPolygon.length;i++){
    const a=L.parkingPolygon[i],c=L.parkingPolygon[(i+1)%L.parkingPolygon.length];
    beam([a[0],.15,a[1]],[c[0],.15,c[1]],.13,'concrete');
  }
  // Fourteen angled bays along the east edge, at the drawn positions and size.
  const bays=L.parkingBays,bs=L.parkingBaySize;
  for(const [bx,bz] of bays){
    b.box(bs.width,.024,.1,'white',bx,.11,bz-bs.length/2,[0,-.24,0],false);
    b.box(bs.width,.024,.1,'white',bx,.11,bz+bs.length/2,[0,-.24,0],false);
    b.box(.1,.024,bs.length,'white',bx-bs.width/2,.11,bz,[0,-.24,0],false);
  }
  // Driveway from the road opening, through the wedge, up to the internal entrance.
  const entry=L.internalEntrance;
  strip([main.x,main.z],[entry.x,entry.z],7.5,'asphalt',.1);
  {
    const {len,angle}=strip([main.x,main.z],[entry.x,entry.z],0,'asphalt',.1);
    for(let t=4;t<len-4;t+=5){
      const f=t/len;b.box(.16,.02,2.2,'white',main.x+(entry.x-main.x)*f,.12,main.z+(entry.z-main.z)*f,[0,angle,0],false);
    }
  }
  surface(entry.width,entry.length,'concrete',entry.x,entry.z,.09);
  sign('ENTRANCE',7,.55,entry.x,1.4,entry.z-entry.length/2-.8);
  sign('PARKING',10,.6,centroid(L.parkingPolygon)[0]-4,1.2,centroid(L.parkingPolygon)[1]);
  // MAIN ENTRANCE: a threshold on the road, not a building.
  for(const side of [-1,1]){
    const px=main.x+side*(main.width/2+1.2);
    b.box(1.4,4.4,1.4,'facade',px,2.2,main.z);b.box(1.7,.4,1.7,'navy',px,4.55,main.z);
    b.box(.5,2.5,.08,'blue',px,2.5,main.z-.72,[0,0,0],false);
  }
  b.box(main.width+3.4,1.4,.5,'navy',main.x,5.3,main.z);
  sign(brand,main.width,.68,main.x,5.35,main.z-.32);
  // Apron and kerb returns carrying the drive across the frontage onto the carriageway.
  strip([main.x,main.z],[main.x+1,main.z-9],main.width+2,'asphalt',.07);
  for(const side of [-1,1])beam([main.x+side*(main.width/2+.8),.12,main.z],[main.x+side*(main.width/2+3.6),.12,main.z-9],.12,'concrete');

  report('Placing the drawn tree rows');
  for(const [group,scale] of [['north',.85],['west',.78],['east',.78],['wedge',.72],['front',.8],['feature',.9]])
    for(const [x,z] of L.trees[group])tree(x,z,scale);
  b.flush();return {lights,glows:[],builder:b,treeCount:Object.values(L.trees).reduce((n,t)=>n+t.length,0)};
}
