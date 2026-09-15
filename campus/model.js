import * as T from 'three';
import { Builder } from './geometry.js';
import { canvasTexture, random, asset } from './materials.js';


const PI=Math.PI;
export { FACILITIES } from './facilities.js';

export async function buildCampus(scene,M,report,{mobile=false}={}){
  const b=new Builder(scene,M),rng=random(1791),lights=[],glows=[];
  // Shared leaf card, used by the campus trees and by the planting beds around the entrance.
  const spray=new T.PlaneGeometry(2.8,2.8);
  const brand=window.ACADEMY?.brand?.full || 'SEVENTEEN SPORTS';
  const C_SUB=window.ACADEMY?.brand?.markSub || 'CRICKET ACADEMY & FACILITY';
  const C_MONOGRAM=window.ACADEMY?.brand?.monogram || '17';
  const surface=(w,d,mat,x,z,y=.02)=>b.plane(w,d,mat,x,y,z,[-PI/2,0,0],mat==='asphalt'?5:3);
  const decal=(w,h,material,x,y,z,rotation=[0,0,0])=>b.mesh(new T.PlaneGeometry(w,h),material,[x,y,z],rotation);
  function sign(text,w,h,x,y,z,rotation=0,bg='#0a253b',fg='#e8e8dc'){
    const texture=canvasTexture(1024,Math.max(128,Math.round(1024*h/w)),(c,cw,ch)=>{
      c.fillStyle=bg;c.fillRect(0,0,cw,ch);c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';c.font=`600 ${Math.min(ch*.62,cw/(text.length*.6))}px Arial`;c.fillText(text,cw/2,ch/2,cw*.93);
    });
    const material=new T.MeshStandardMaterial({map:texture,roughness:.46,metalness:.12,emissiveMap:texture,emissive:0xffffff,emissiveIntensity:.18});
    decal(w,h,material,x,y,z,[0,rotation,0]);return material;
  }
  // A board on posts. A bare decal plane reads as a sticker floating in the air.
  function signBoard(text,w,h,x,y,z,rotation=0){
    const depth=.16,sinR=Math.sin(rotation),cosR=Math.cos(rotation);
    b.box(w+.3,h+.26,depth,'navy',x,y,z,[0,rotation,0]);
    sign(text,w,h,x+sinR*(depth/2+.02),y,z+cosR*(depth/2+.02),rotation);
    for(const side of [-1,1]){
      const px=x+cosR*side*(w/2-.25),pz=z-sinR*side*(w/2-.25);
      b.cylinder(.06,.06,y-h/2-.13,'darkMetal',px,(y-h/2-.13)/2,pz);
    }
  }
  function rail(a,c,height=1.1){
    const start=new T.Vector3(...a),end=new T.Vector3(...c),length=start.distanceTo(end),count=Math.ceil(length/2);
    for(let i=0;i<=count;i++){const p=start.clone().lerp(end,i/count);b.cylinder(.035,.035,height,'metal',p.x,height/2+p.y,p.z);}
    for(const y of [.48,height])b.beam([a[0],a[1]+y,a[2]],[c[0],c[1]+y,c[2]],.032);
  }
  function net(w,h,x,y,z,rotation=[0,0,0]){b.plane(w,h,'net',x,y,z,rotation,.24);}
  function treePlanters(x,z){b.box(3.4,.36,3.4,'concrete',x,.18,z);surface(2.95,2.95,'sand',x,z,.37);}

  // No floating plinth: the campus sits on continuous surrounding terrain.
  surface(1800,1800,'soil',0,0,-.12);
  surface(234,234,'lawn',0,4,0);
  surface(17,232,'asphalt',110,1,.04);
  surface(224,13,'asphalt',0,110,.04);
  surface(13,42,'asphalt',0,130,.04);
  surface(214,7,'concrete',0,-77,.05);
  // Pale raised kerbs, pedestrian routes, drainage and broken centre lines.
  // Kerbs stop at the carriageway they meet instead of crossing it.
  for(const x of [100.9,119.1])b.box(.35,.22,218,'concrete',x,.11,-6);
  for(const z of [102.9,117.1])b.box(212,.22,.35,'concrete',-5.5,.11,z);
  for(let z=-102;z<112;z+=9)b.box(.15,.015,3,'white',110,.061,z,[0,0,0],false);
  for(let x=-106;x<106;x+=9)b.box(3,.015,.15,'white',x,.061,110,[0,0,0],false);
  for(let x=-7;x<=7;x+=2)b.box(1,.025,7,'white',x,.062,111,[0,0,0],false);
  for(let z=-105;z<102;z+=16)b.box(.8,.04,1.8,'darkMetal',101.4,.12,z,[0,0,0],false);
  for(const [x,z,w,d] of [[0,70,147,4],[-72,-5,4,141],[73,7,4,142],[12,-72,131,4],[-12,85,4,30],[54,88,4,24]])surface(w,d,'concrete',x,z,.08);
  // Boundary: concrete footings, masonry piers, slender vertical fencing.
  const fences=[[-121,-112,121,-112],[-121,-112,-121,120],[121,-112,121,120],[-121,120,-10,120],[10,120,121,120]];
  for(const [x1,z1,x2,z2] of fences){
    const length=Math.hypot(x2-x1,z2-z1),dx=(x2-x1)/length,dz=(z2-z1)/length;
    b.beam([x1,.45,z1],[x2,.45,z2],.22,'concrete');
    for(let t=0;t<=length;t+=4){const x=x1+dx*t,z=z1+dz*t;b.box(.38,2.3,.38,'facade',x,1.15,z);}
    for(let t=0;t<length;t+=.45){const x=x1+dx*t,z=z1+dz*t;b.cylinder(.021,.021,1.65,'darkMetal',x,1.32,z,[],6);}
    for(const y of [.74,2.05])b.beam([x1,y,z1],[x2,y,z2],.035,'darkMetal');
  }

  report('Building the full-scale outfield');
  // 132 x 114 m playing area, with one correctly scaled 20.12 m central wicket.
  const fieldGeo=new T.CircleGeometry(57,192);fieldGeo.rotateX(-PI/2);fieldGeo.scale(1.16,1,1);
  const fieldPos=fieldGeo.attributes.position,uv=fieldGeo.attributes.uv;
  // Triangulated regular grid, clipped to the oval, gives mowing stripes clean boundaries.
  const positions=[],colors=[],uvs=[];
  for(let x=-67;x<67;x+=2)for(let z=-57;z<57;z+=2){
    const points=[[x,z],[x+2,z],[x+2,z+2],[x,z+2]];
    if(points.some(p=>(p[0]/66.12)**2+(p[1]/57)**2>1))continue;
    for(const i of [0,2,1,0,3,2]){const [px,pz]=points[i];positions.push(px,.09,pz);uvs.push(px/4,pz/4);const variation=1-.035*Math.sin(px*.19)*Math.cos(pz*.23)-rng()*.025;const tone=(Math.floor((x+70)/7)%2?.95:1)*variation;colors.push(tone,tone,tone*.97);}
  }
  const field=new T.BufferGeometry();field.setAttribute('position',new T.Float32BufferAttribute(positions,3));field.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));field.setAttribute('color',new T.Float32BufferAttribute(colors,3));field.computeVertexNormals();
  const fieldMesh=b.mesh(field,M.turf);fieldMesh.castShadow=false;
  // Underlay fills the curved perimeter continuously beneath the clipped mowing grid.
  const edgeMat=M.turf.clone();edgeMat.vertexColors=false;edgeMat.color.set(0x8c9a79);
  for(let i=0;i<uv.count;i++)uv.setXY(i,fieldPos.getX(i)/4,fieldPos.getZ(i)/4);
  const edge=b.mesh(fieldGeo,edgeMat,[0,.065,0]);edge.castShadow=false;
  function oval(radius,height,mat,thickness=.06){
    const points=[];for(let i=0;i<=192;i++){const a=i/192*PI*2;points.push(new T.Vector3(Math.cos(a)*radius*1.16,height,Math.sin(a)*radius));}
    const geo=new T.TubeGeometry(new T.CatmullRomCurve3(points),192,thickness,5,false);const mesh=b.mesh(geo,mat);mesh.castShadow=false;
  }
  oval(56.1,.15,'white',.085);
  // Infield is a dashed fielding restriction marking, distinct from the boundary rope.
  for(let i=0;i<160;i+=2){const a=i/160*PI*2,a2=(i+.65)/160*PI*2;b.beam([Math.cos(a)*29,.125,Math.sin(a)*35],[Math.cos(a2)*29,.125,Math.sin(a2)*35],.037,'white');}
  surface(15.25,25,'square',0,0,.13);
  for(let i=-2;i<=2;i++)b.plane(2.98,20.12,i===0?'pitch':'square',i*3.05,.145,0,[-PI/2,0,0],30);
  for(const side of [-1,1]){
    for(const z of [10.06,8.84])b.box(2.64,.018,.055,'white',0,.164,z*side,[0,0,0],false);
    for(const x of [-1.32,1.32])b.box(.055,.018,2.7,'white',x,.164,side*9.8,[0,0,0],false);
    for(const x of [-.115,0,.115])b.cylinder(.018,.02,.711,'wood',x,.52,side*10.06,[],10);
    for(const x of [-.058,.058])b.cylinder(.01,.01,.12,'wood',x,.88,side*10.06,[0,0,PI/2],8);
  }
  // Low boundary advertising cushions, placed around the far half of the outfield. Every fourth
  // one carries the academy wordmark, so the brand reads from the aerial and broadcast angles.
  let boardMaterial=null;
  for(let i=0;i<32;i++){
    const a=(i/32)*PI*2,x=Math.cos(a)*67.3,z=Math.sin(a)*58.2;
    if(z>22&&x>-25&&x<25)continue;
    b.box(4.2,.65,.65,i%4?(i%3?'white':'navy'):'navy',x,.35,z,[0,-a+PI/2,0]);
    if(i%4)continue;
    // One wordmark texture, reused across every branded board rather than baked eight times.
    const rot=-a-PI/2,bx=x-Math.cos(a)*.35,bz=z-Math.sin(a)*.35;
    if(boardMaterial)decal(3.6,.4,boardMaterial,bx,.36,bz,[0,rot,0]);
    else boardMaterial=sign(brand,3.6,.4,bx,.36,bz,rot);
  }
  // Sight screens beyond both ends of the wicket.
  for(const z of [-62,62]){
    b.box(13.5,4.2,.28,'white',0,2.65,z);
    for(const x of [-5.8,5.8]){b.box(.16,4.8,.16,'metal',x,2.4,z+.2);b.box(.2,.2,2.4,'metal',x,.28,z);for(const off of [-.9,.9])b.cylinder(.22,.22,.14,'rubber',x,.22,z+off,[PI/2,0,0]);}
    for(let x=-6.4;x<6.6;x+=.4)b.box(.035,4.2,.34,'concrete',x,2.65,z);
  }

  function floodlight(x,z,targetX,targetZ){
    const h=28;
    b.box(2,1,2,'concrete',x,.5,z);b.cylinder(.17,.45,h,'metal',x,h/2+.5,z,[],16);
    // Ladder, service platform, safety cage and twelve separately modelled LED modules.
    for(let y=1;y<27;y+=1.2)b.beam([x-.22,y,z+.37],[x+.22,y,z+.37],.016);
    for(const off of [-.25,.25])b.beam([x+off,1,z+.37],[x+off,27,z+.37],.025);
    b.box(4.5,.16,1.5,'metal',x,27.1,z);
    for(const off of [-2,0,2])b.beam([x,25.5,z],[x+off,27.1,z],.055);
    b.beam([x-2.3,28.2,z+.5],[x+2.3,28.2,z+.5],.05);
    for(let col=0;col<4;col++)for(let row=0;row<3;row++){
      const lx=x+(col-1.5)*1.05,ly=27.5+row*.68;
      b.box(.94,.58,.26,'darkMetal',lx,ly,z,[.2,0,0]);
      b.box(.84,.48,.03,'lamp',lx,ly-.025,z+.15,[.2,0,0],false);
      for(let rib=0;rib<2;rib++)b.box(.9,.025,.13,'metal',lx,ly-.2+rib*.13,z-.19,[.2,0,0]);
    }
    const light=new T.SpotLight(0xfff0d6,0,190,.82,.7,2);light.position.set(x,29,z);light.target.position.set(targetX,0,targetZ);scene.add(light,light.target);lights.push(light);
  }
  for(const [x,z,tx,tz] of [[-53,-45,-15,-14],[53,-45,15,-14],[-53,45,-15,14],[53,45,15,14]])floodlight(x,z,tx,tz);

  // Real structure: footings, curtain wall mullions, vertical fins and roof parapets.
  function building(x,z,w,d,height,{floors=1,label='',canopy=true}={}){
    b.box(w+2,.36,d+2,'concrete',x,.18,z);
    b.box(w,height,d,'facade',x,height/2+.36,z);
    for(let f=0;f<floors;f++){
      const floorHeight=height/floors,y=.36+floorHeight*f;
      b.box(w+.3,.24,d+.3,'concrete',x,y+.2,z);
      // Dark interiors are recessed behind glazing, with exposed perimeter columns.
      b.box(w-1,2.25,.15,'navy',x,y+1.9,z+d/2+.08);
      b.box(w-.8,2.2,.08,'glass',x,y+1.9,z+d/2+.2,[0,0,0],false);
      b.box(.08,2.2,d-.8,'glass',x+w/2+.2,y+1.9,z,[0,0,0],false);
      for(let v=-w/2+.7;v<w/2;v+=2.1)b.box(.065,2.35,.3,'darkMetal',x+v,y+1.9,z+d/2+.23);
      for(let v=-d/2+.7;v<d/2;v+=2.1)b.box(.3,2.35,.065,'darkMetal',x+w/2+.23,y+1.9,z+v);
      for(const offset of [-1.12,1.12])b.box(w-.5,.07,.27,'metal',x,y+1.9+offset,z+d/2+.25);
      // Interior ceiling panels are restrained warm surfaces, not emissive glass walls.
      for(let i=-w/2+3;i<w/2-2;i+=5)b.box(2,.035,.5,'interior',x+i,y+2.85,z+d/2+.1,[0,0,0],false);
    }
    b.box(w+.9,.32,d+.9,'navy',x,height+.45,z);
    for(const side of [-1,1]){b.box(w+.8,.65,.2,'facade',x,height+.8,z+side*(d/2+.3));b.box(.2,.65,d+.8,'facade',x+side*(w/2+.3),height+.8,z);}
    for(let i=-w/2+1;i<w/2;i+=1.6)b.box(.17,height-.6,.34,'facade',x+i,height/2+.4,z+d/2+.42);
    if(canopy){b.box(Math.min(w*.55,20),.22,5,'navy',x,height*.5,z+d/2+2);for(const dx of [-1,1])b.box(.16,height*.5,.16,'metal',x+dx*Math.min(w*.24,8),height*.25,z+d/2+4);}
    // Entry doors and three broad, shallow steps.
    b.box(3.4,2.8,.16,'navy',x,1.76,z+d/2+.65);b.box(3.15,2.55,.06,'glass',x,1.8,z+d/2+.76,[0,0,0],false);
    for(const dx of [-.12,.12])b.box(.04,.65,.05,'metal',x+dx,1.8,z+d/2+.84);
    for(let step=0;step<3;step++)b.box(5+step*.5,.12*(3-step),.8,'concrete',x,.06*(3-step),z+d/2+1.2+step*.8);
    if(label){
      // Fascia lettering reads at human scale; the panel gives it physical depth.
      const sw=Math.min(9,w*.42),sh=.72;
      b.box(sw+.5,sh+.36,.14,'navy',x,height-.5,z+d/2+.63);
      sign(label,sw,sh,x,height-.5,z+d/2+.71);
    }
    for(const side of [-1,1])b.cylinder(.05,.05,height,'metal',x+side*(w/2-.15),height/2,z-d/2-.15);
    // Rooftop mechanical plant and framed photovoltaic panels.
    for(let i=0;i<Math.floor(w/8);i++){
      b.box(3,.12,4.6,'metal',x-w/2+4+i*6,height+.82,z-2,[.16,0,0]);
      b.box(2.85,.06,4.42,'solar',x-w/2+4+i*6,height+.94,z-2,[.16,0,0]);
      for(let cell=0;cell<5;cell++)b.box(2.85,.008,.025,'metal',x-w/2+4+i*6,height+.95+Math.sin(.16)*(-2+cell),z-4+cell,[.16,0,0],false);
    }
    b.box(2.2,1.2,2.2,'roof',x+w*.28,height+1.05,z+d*.18);
    for(let l=0;l<9;l++)b.box(2,.03,.12,'metal',x+w*.28,height+.57+l*.115,z+d*.18+1.12);
  }
  building(0,-96,48,18,8.4,{floors:2,label:brand});
  building(77,-94,23,18,4.5,{label:'PERFORMANCE CENTRE',canopy:false});
  for(const x of [-25,25]){treePlanters(x,-82);}

  report('Constructing the indoor cricket facility');
  // Five-wicket indoor hall: the academy's flagship building. Portal frame, continuous clerestory,
  // a glazed entrance bay and a navy signage fascia turned to face the campus.
  const hx=-91,hz=-86,hw=13,hd=20,hwall=7.6;
  b.box(hw*2+5,.44,hd*2+5,'concrete',hx,.22,hz);
  for(const side of [-1,1]){
    b.box(.42,hwall-2.3,hd*2,'render',hx+side*hw,(hwall-2.3)/2+.44,hz);
    b.box(.48,.8,hd*2,'navy',hx+side*hw,.84,hz);
    b.box(.3,1.6,hd*2-1.4,'glass',hx+side*hw,hwall-1.05,hz,[0,0,0],false);
    for(let z=-hd+2;z<hd;z+=4)b.box(.52,1.8,.2,'metal',hx+side*hw,hwall-1.05,hz+z);
  }
  b.box(hw*2,hwall-2.3,.42,'render',hx,(hwall-2.3)/2+.44,hz-hd);
  b.box(hw*2,.8,.48,'navy',hx,.84,hz-hd);
  b.box(hw*2-1.4,1.6,.3,'glass',hx,hwall-1.05,hz-hd,[0,0,0],false);
  // Twin-pitch standing-seam roof on exposed portal trusses.
  for(const side of [-1,1]){
    const roof=b.mesh(new T.PlaneGeometry(hw+.9,hd*2+1.6),M.roof,[hx+side*(hw/2+.2),hwall+1.5,hz],[-PI/2,side*-.17,0]);roof.material.side=T.DoubleSide;
    for(let r=-hd;r<=hd;r+=2.5)b.beam([hx,hwall+2.5,hz+r],[hx+side*(hw+.4),hwall+.5,hz+r],.036,'metal');
  }
  for(let z=-hd+2;z<=hd-2;z+=4.5){
    for(const x of [-hw+.9,hw-.9])b.box(.2,hwall,.2,'metal',hx+x,hwall/2+.44,hz+z);
    b.beam([hx-hw+.9,hwall,hz+z],[hx,hwall+2.3,hz+z],.08);b.beam([hx,hwall+2.3,hz+z],[hx+hw-.9,hwall,hz+z],.08);
    b.beam([hx-hw+.9,hwall,hz+z],[hx+hw-.9,hwall,hz+z],.06);
    for(let x=-hw+2.4;x<hw-2;x+=3.2)b.beam([hx+x,hwall,hz+z],[hx+x+1.6,hwall+2.3-Math.abs(x)/7,hz+z],.026);
  }
  // The client's facility photograph shows one hall laid wall-to-wall in astro, divided into five
  // lanes by full-height netting, under continuous linear lighting. Modelled to match.
  b.plane(hw*2-1,hd*2-1,'astro',hx,.46,hz,[-PI/2,0,0],26);
  for(let divider=0;divider<6;divider++){
    const x=hx+(divider-2.5)*4.7;
    net(hd*2-1.4,6.8,x,3.4,hz,[0,PI/2,0]);
    for(let z=-hd+2;z<=hd-2;z+=5)b.cylinder(.05,.05,6.8,'darkMetal',x,3.4,hz+z,[],8);
    b.beam([x,6.8,hz-hd+.7],[x,6.8,hz+hd-.7],.04,'darkMetal');
  }
  net(hw*2-1,6.8,hx,3.4,hz-hd+1.2);
  // Each lane: a lighter practice strip, stumps at both ends and a bowling crease.
  for(let lane=0;lane<5;lane++){
    const x=hx+(lane-2)*4.7;
    b.plane(2.9,hd*2-5,'square',x,.475,hz,[-PI/2,0,0],24);
    for(const dz of [-6.5,7]){
      b.box(2.4,.02,.055,'white',x,.49,hz+dz,[0,0,0],false);
      for(const off of [-.115,0,.115])b.cylinder(.018,.02,.711,'wood',x+off,.85,hz+dz,[],8);
    }
    b.box(.055,.02,2.4,'white',x,.49,hz-1,[0,0,0],false);
  }
  // Continuous linear fittings down every bay; these lift to full output on the floodlight cue.
  for(let z=-hd+3;z<=hd-3;z+=4.4)for(const x of [-7.05,0,7.05]){
    b.box(2.9,.14,.36,'interior',hx+x,hwall+.5,hz+z,[0,0,0],false);
    b.box(3.1,.1,.5,'darkMetal',hx+x,hwall+.62,hz+z);
  }
  // Bowling machines on the two outer lanes, matching the client's listed equipment.
  for(const x of [hx-9.4,hx+9.4]){
    b.box(.95,.18,.6,'navy',x,.95,hz+9);b.cylinder(.24,.24,.13,'rubber',x,1.2,hz+8.7,[PI/2,0,0],16);
    for(const dx of [-.3,.3])b.beam([x+dx,.9,hz+9],[x+dx*1.6,.5,hz+9.5],.028);
  }
  // Campus-facing elevation: glazed entrance bay, navy fascia and the academy wordmark.
  const hf=hz+hd;
  b.box(hw*2,1.3,.44,'render',hx,1.09,hf);
  b.box(hw*2-.7,4.2,.22,'glass',hx,3.84,hf+.04,[0,0,0],false);
  for(let v=-hw+1.3;v<hw-1;v+=1.85)b.box(.15,4.2,.32,'metal',hx+v,3.84,hf+.14);
  for(const y of [1.85,5.85])b.box(hw*2,.26,.4,'metal',hx,y,hf+.12);
  b.box(4.2,2.9,.18,'navy',hx,1.9,hf+.28);b.box(3.9,2.6,.07,'glass',hx,1.95,hf+.4,[0,0,0],false);
  for(let step=0;step<3;step++)b.box(11+step*.6,.13*(3-step),.9,'concrete',hx,.065*(3-step),hf+1.1+step*.9);
  b.box(13,.3,4.4,'navy',hx,hwall-1.6,hf+2.4);
  for(const dx of [-5.4,5.4])b.cylinder(.11,.11,hwall-1.9,'metal',hx+dx,(hwall-1.9)/2,hf+4.3);
  b.box(hw*2+1.6,2.1,.6,'navy',hx,hwall+1.1,hf+.1);
  sign(brand,15,1.15,hx,hwall+1.35,hf+.42);
  sign(C_SUB,15,.42,hx,hwall+.42,hf+.42,0,'#0a253b','#7fd4ff');
  // The 17 monogram anchors the corner of the elevation.
  b.box(3.2,3.2,.5,'blue',hx-hw+1.1,hwall+1.1,hf+.16);
  sign(C_MONOGRAM,2.6,2.2,hx-hw+1.1,hwall+1.1,hf+.44,0,'#0e70a8','#ffffff');
  signBoard('5-LANE INDOOR CRICKET FACILITY',9,.55,hx,2.1,hf+8.5);

  // 20 outdoor lanes in two banks, 15 turf and five astro lanes.
  for(let bank=0;bank<2;bank++)for(let lane=0;lane<10;lane++){
    const index=bank*10+lane,isAstro=index>=15;
    const z=-50+bank*46+lane*4.1+(isAstro?5:0),x=-93;
    surface(29,3.85,'concrete',x,z,.14);
    b.plane(27,3.6,isAstro?'astro':'pitch',x,.165,z,[-PI/2,0,0],30);
    for(const side of [-1,1]){
      net(29,4.8,x,2.65,z+side*2);
      b.beam([x-14.5,5.05,z+side*2],[x+14.5,5.05,z+side*2],.032,'metal');
      for(let p=-14.5;p<=14.5;p+=7.25)b.cylinder(.047,.047,5,'metal',x+p,2.55,z+side*2,[],8);
    }
    net(4,4.8,x-14.5,2.65,z,[0,PI/2,0]);net(29,4,x,5.07,z,[-PI/2,0,0]);
    b.box(.055,.025,2.65,'white',x-10.5,.195,z,[0,0,0],false);
    for(const off of [-.115,0,.115])b.cylinder(.018,.018,.711,'wood',x-11.8,.53,z+off,[],8);
    if(lane%3===0){b.box(.9,.15,.55,'navy',x+12,.85,z);b.beam([x+12,.8,z],[x+11.5,.17,z-.45],.025);b.beam([x+12,.8,z],[x+12.5,.17,z+.45],.025);b.cylinder(.22,.22,.12,'rubber',x+11.6,1.08,z,[0,0,PI/2]);}
  }
  signBoard('20 OUTDOOR NETS',8,.7,-93,2.3,53.5);
  // Each surface is labelled where it starts, so the two training surfaces are legible from the air.
  signBoard('15 TURF PITCHES',5.4,.46,-110.5,1.9,-30,PI/2);
  signBoard('5 ASTRO PITCHES',5.4,.46,-110.5,1.9,27,PI/2);
  for(const z of [-50,-7,42]){
    b.cylinder(.12,.21,11,'metal',-75,5.5,z);b.box(2.5,.4,.6,'lamp',-75,11,z);
  }

  // East pavilion with an accessible concourse and four tiers of individual stadium seats.
  const px=87,pz=-2;
  building(px,pz,14,42,4.6,{label:brand,canopy:false});
  for(let row=0;row<4;row++){
    const x=75.5+row*1.25,y=.26+row*.4;b.box(1.4,.4,39,'concrete',x,y,-2);
    for(let col=0;col<45;col++){
      if(col%15===14)continue;const z=-20.5+col*.84;
      b.box(.56,.13,.55,col%15===0?'white':'blue',x,y+.29,z);
      b.box(.12,.58,.56,col%15===0?'white':'blue',x+.29,y+.63,z,[0,0,-.12]);
    }
  }
  // Cantilevered canopy: steel trusses support a thin, folded roof.
  b.box(11,.15,44,'roof',79,7.9,-2,[0,0,.04]);
  for(let z=-22;z<=20;z+=7){
    b.box(.22,7.7,.22,'darkMetal',83.7,3.85,z);
    b.beam([83.7,6.1,z],[74.2,7.75,z],.08,'darkMetal');
    b.beam([83.7,7.9,z],[74.2,7.75,z],.06,'darkMetal');
  }
  rail([72.8,.2,-22],[72.8,.2,20]);
  // Field-side score display, including a physical frame, support posts and ventilation slats.
  for(const x of [40,48])b.box(.32,6,.32,'darkMetal',x,3,-65);
  b.box(12,5,.6,'navy',44,7.7,-65);
  const score=canvasTexture(1024,440,(c,w,h)=>{
    c.fillStyle='#101d20';c.fillRect(0,0,w,h);c.fillStyle='#bacab6';c.font='bold 35px Arial';c.textAlign='center';c.fillText(brand,w/2,58);c.fillStyle='#edf0cb';c.font='110px monospace';c.fillText('000 / 0',w/2,215);c.font='31px monospace';c.fillStyle='#a8b797';c.fillText('OVERS 00.0     READY TO PLAY',w/2,340);
  });
  decal(11.5,4.5,new T.MeshStandardMaterial({map:score,emissiveMap:score,emissive:0xffffff,emissiveIntensity:.45,roughness:.7}),44,7.7,-64.68);

  // Strength and conditioning, placed beside the analysis building so the two read as one
  // Performance & Analysis Centre rather than a separate facility across the campus.
  function strengthZone(ox,oz){
    surface(36,21,'concrete',ox,oz,.1);surface(32,7,'track',ox,oz-6,.12);surface(22,10,'astro',ox-6,oz+5,.12);
    for(let lane=0;lane<4;lane++)b.box(32,.025,.065,'white',ox,.15,oz-8.8+lane*1.85,[0,0,0],false);
    for(let rung=0;rung<12;rung++)b.box(.07,.035,1.2,'yellow',ox-19+rung*.7,.18,oz+4,[0,0,0],false);
    for(let h=0;h<5;h++){
      const x=ox-11+h*4;for(const z of [oz-6.6,oz-5.5])b.beam([x,.18,z],[x,.68,z],.025,'white');b.beam([x,.68,oz-6.6],[x,.68,oz-5.5],.035,'yellow');
    }
    for(const x of [ox+9,ox+13])for(const z of [oz+1,oz+5])b.box(.11,2.7,.11,'darkMetal',x,1.46,z);
    for(const z of [oz+1,oz+5])b.beam([ox+9,2.8,z],[ox+13,2.8,z],.05,'darkMetal');
    for(let x=ox+9;x<=ox+13;x+=.5)b.beam([x,2.8,oz+1],[x,2.8,oz+5],.032,'metal');
    b.box(1.9,.16,.55,'rubber',ox+10.8,.67,oz+3);for(const x of [ox+10.2,ox+11.4])b.box(.12,.6,.5,'metal',x,.36,oz+3);
    b.cylinder(.028,.028,2.2,'metal',ox+11,1.2,oz+1,[0,0,PI/2]);for(const x of [ox+10.15,ox+11.85])b.cylinder(.27,.27,.15,'rubber',x,1.2,oz+1,[0,0,PI/2],20);
    for(let i=0;i<5;i++)b.cylinder(.28,.28,.13,'rubber',ox+8+i*.35,.26,oz+8,[PI/2,0,0],20);
    signBoard('STRENGTH & CONDITIONING',7,.55,ox-1,2,oz+12);
  }
  strengthZone(82,-66);

  // Arrival court: entry sign, guardhouse, landscaping, parking and recognizable vehicles.
  building(15,120,4,4,3,{canopy:false});
  // Masonry piers carry a branded gantry across the access road.
  for(const x of [-9.5,9.5]){
    b.box(2.4,7.4,2.4,'facade',x,3.7,122);
    b.box(2.8,.5,2.8,'navy',x,7.6,122);
    b.box(2.6,1.5,2.6,'navy',x,.75,122);
    b.box(.9,4.4,.12,'blue',x,4.2,123.25,[0,0,0],false);
  }
  b.box(21.8,2.6,.9,'navy',0,8.5,122);
  b.box(22.4,.34,1.2,'blue',0,9.9,122);
  sign(brand,14,1.05,0,8.9,122.48);
  sign(C_SUB,14,.4,0,7.95,122.48,0,'#0a253b','#7fd4ff');
  b.box(2.9,2.9,.5,'blue',-8.2,8.5,122.4);sign(C_MONOGRAM,2.3,2,-8.2,8.5,122.68,0,'#0e70a8','#ffffff');
  // Boom barriers either side of the gatehouse island.
  for(const side of [-1,1]){
    b.cylinder(.16,.16,1.15,'darkMetal',side*5.4,.58,120.6,[],10);
    b.box(4.6,.14,.14,'white',side*7.8,1.12,120.6);
    for(let stripe=0;stripe<5;stripe++)b.box(.42,.16,.16,'yellow',side*(5.9+stripe*.9),1.12,120.6);
  }
  for(let i=0;i<10;i++)b.box(.5,.11,.15,i%2?'white':'yellow',-7+i*.5,1,121);
  // Planting beds frame the approach.
  for(const x of [-15,15]){
    surface(9,3.4,'soil',x,126,.09);
    for(let i=0;i<14;i++)for(let a=0;a<3;a++)b.add(spray,'foliage',[x+(rng()-.5)*8,.42+rng()*.4,126+(rng()-.5)*3],[.4,a*PI/3,0],[.45,.45,.45]);
  }
  surface(66,20,'asphalt',-48,90,.08);
  for(let slot=0;slot<20;slot++){
    const x=-79+slot*3.2;b.box(.09,.02,5.3,'white',x,.105,87,[0,0,0],false);
    b.box(1.6,.13,.24,'concrete',x+1.5,.18,84.7);
  }
  const carMaterials=[0x34434b,0xdbded9,0x486275,0x8c999e].map(color=>new T.MeshPhysicalMaterial({color,roughness:.26,metalness:.65,clearcoat:1}));
  function car(x,z,index){
    const paint=carMaterials[index%4];
    // Swept cross-sections, separate glazing, wheel arches, tyres, rims and lamps.
    const shape=new T.Shape();shape.moveTo(-1,-2.3);shape.lineTo(-1,-.7);shape.lineTo(-.89,1.9);shape.quadraticCurveTo(-.8,2.25,0,2.3);shape.quadraticCurveTo(.8,2.25,.89,1.9);shape.lineTo(1,-.7);shape.lineTo(1,-2.3);shape.closePath();
    const body=new T.ExtrudeGeometry(shape,{depth:.58,bevelEnabled:true,bevelSegments:2,bevelSize:.08,bevelThickness:.08,steps:1});body.rotateX(PI/2);b.add(body,paint,[x,.99,z]);
    b.box(1.66,.66,2.2,paint,x,1.32,z-.12);
    b.box(1.55,.55,.055,'glass',x,1.36,z+1.02,[.25,0,0],false);b.box(1.55,.5,.055,'glass',x,1.36,z-1.26,[-.25,0,0],false);
    for(const side of [-1,1]){b.box(.035,.45,1.85,'glass',x+side*.85,1.35,z-.1,[0,0,0],false);for(const dz of [-1.42,1.4]){b.cylinder(.32,.32,.2,'rubber',x+side*.97,.37,z+dz,[0,0,PI/2],20);b.cylinder(.22,.22,.215,'metal',x+side*.98,.37,z+dz,[0,0,PI/2],16);}}
    for(const side of [-1,1]){b.box(.48,.17,.07,'white',x+side*.62,.75,z+2.3);b.box(.5,.11,.065,'navy',x+side*.62,.75,z-2.38);}
    b.box(.8,.12,.07,'darkMetal',x,.5,z+2.35);
  }
  for(let i=0;i<12;i++)if(i!==3&&i!==8)car(-76+i*4.7,87,i);

  // Benches, bollards and bike stands make the paths read as occupied spaces.
  for(const [x,z] of [[-27,-77],[28,-77],[67,44],[-62,69],[57,89]]){
    for(let slat=0;slat<4;slat++)b.box(2.3,.075,.1,'wood',x,.53,z+slat*.13);
    for(const side of [-1,1])b.box(.11,.5,.55,'darkMetal',x+side*.8,.25,z+.2);
  }
  for(let x=-58;x<=62;x+=12){b.cylinder(.1,.14,.85,'darkMetal',x,.43,70);b.cylinder(.095,.095,.1,'lamp',x,.88,70);}

  // Broadleaf canopies have visible branching and open, irregular silhouettes.
  // Leaf cards are batched into one material; geometry stays lighter than sphere crowns.
  const places=[];
  for(let i=0;i<15;i++)places.push([-113+i*16,-108]);
  for(let i=0;i<12;i++)places.push([116,-92+i*18]);
  for(let i=0;i<9;i++)places.push([-116,-84+i*23]);
  for(const p of [[-26,-83],[28,-83],[-65,63],[57,64],[65,58],[75,93],[-85,120],[-55,120],[33,120],[88,120]])places.push(p);
  places.forEach(([x,z],i)=>{
    const h=7+rng()*3,crownY=h*.76,spread=2.7+rng()*1.1;
    b.cylinder(.13,.29,h*.64,'bark',x,h*.32,z,[],9);
    b.plane(spread*3,spread*3,'contact',x,.025,z,[-PI/2,0,0],spread*3);
    for(let branch=0;branch<8;branch++){
      const a=branch*2.399+i,dx=Math.cos(a)*spread*.78,dz=Math.sin(a)*spread*.78,cy=crownY+(rng()-.5)*2;
      b.beam([x,h*.38,z],[x+dx,cy,z+dz],.075,'bark');
      for(let twig=0;twig<3;twig++)b.beam([x+dx*.55,h*.5,z+dz*.55],[x+dx+(rng()-.5)*1.6,cy+.6,z+dz+(rng()-.5)*1.6],.028,'bark');
    }
    for(let leaf=0;leaf<105;leaf++){
      const a=leaf*2.399,vertical=rng()*2-1,radius=Math.sqrt(1-vertical*vertical)*spread*(.6+rng()*.4);
      const scale=.7+rng()*.55;
      b.add(spray,'foliage',[x+Math.cos(a)*radius,crownY+vertical*spread*.8,z+Math.sin(a)*radius],[(rng()-.5)*PI,a,rng()*PI],[scale,scale,scale]);
    }
  });
  // Low planted beds and shade trees anchor buildings to the site.
  for(const [x,z,w] of [[-28,-85,5],[28,-85,5],[66,-96,3],[56,67,8]]){
    surface(w,2.4,'soil',x,z,.11);
    for(let i=0;i<Math.floor(w*3);i++){
      const sx=x+(rng()-.5)*w,sz=z+(rng()-.5)*2;
      for(let a=0;a<3;a++)b.add(spray,'foliage',[sx,.4+rng()*.35,sz],[.4,a*PI/3,0],[.4,.4,.4]);
    }
  }

  report('Placing the surrounding Vastral context');
  // Beyond the compound the satellite shows the Vastral-Gatrad road, the village packed along its
  // south side, and dry farm plots north and east. Everything here is low-detail massing meant to be
  // read through haze; it gives the campus a horizon instead of an endless empty plane.
  surface(700,14,'asphalt',0,143,.03);
  for(const z of [135.6,150.4])for(const side of [-1,1])b.box(332,.2,.32,'concrete',side*174,.1,z);
  for(let x=-330;x<330;x+=11)if(Math.abs(x)>9)b.box(3.4,.015,.14,'white',x,.055,143,[0,0,0],false);

  // Village: flat-roofed masonry, parapets, roof water tanks and sheet-metal lean-tos.
  const villageWalls=['render','renderWarm','renderPale','slab','renderBlue','render'];
  function house(x,z,w,d,rot,front){
    const storeys=rng()<.2?3:rng()<.55?2:1,h=3.1*storeys,wall=villageWalls[Math.floor(rng()*6)];
    b.box(w,h,d,wall,x,h/2,z,[0,rot,0]);
    // Flat cement roof slab and parapet: the defining silhouette of the village on the imagery.
    const roof=rng()<.35?'renderPale':rng()<.6?'slab':'render';
    b.box(w+.4,.3,d+.4,roof,x,h+.15,z,[0,rot,0]);
    b.box(w+.5,.46,d+.5,roof,x,h+.5,z,[0,rot,0]);
    // Only the road-facing row is close enough for openings to be worth the geometry.
    if(front)for(let i=-1;i<=1;i++)
      if(rng()<.6)b.box(.9,1.1,.1,'darkMetal',x+Math.cos(rot)*i*(w*.3),1.5,z-Math.sin(rot)*i*(w*.3)+Math.cos(rot)*(d/2+.03),[0,rot,0],false);
    if(rng()<.45){const t=.5+rng()*.3;b.cylinder(t,t,t*1.5,rng()<.45?'darkMetal':'blue',x+w*.28,h+.75+t*.75,z+d*.24,[],8);}
    if(rng()<.38)b.box(w*.7,.12,d*.55,rng()<.5?'tinRust':'tin',x-w*.2,h*.42,z+d*.8,[0,rot,.07]);
  }
  // Clustered around irregular lanes rather than a lattice, with depth varying block to block.
  for(let block=0;block<19;block++){
    const bx=-252+block*27+(rng()-.5)*9,rows=3+Math.floor(rng()*5);
    for(let row=0;row<rows;row++){
      const rz=158+row*16.5+(rng()-.5)*5.5,span=2+Math.floor(rng()*3);
      for(let i=0;i<span;i++){
        if(rng()<.18)continue;
        house(bx+i*11+(rng()-.5)*4,rz+(rng()-.5)*3.2,7+rng()*5,6+rng()*4,(rng()-.5)*.5,row===0);
      }
    }
  }
  // Compound walls and a few roadside shopfronts front the village onto the road.
  for(let i=0;i<46;i++){const x=-250+i*11+(rng()-.5)*2;b.box(9+rng()*3,2.3+rng()*.7,.3,'renderWarm',x,1.3,152.5+rng()*.8);}

  // Farm plots: fallow tan and irrigated green rectangles divided by raised earth bunds.
  function plot(x,z,w,d){
    const crop=rng();
    surface(w,d,crop<.34?'astro':crop<.55?'soil':'lawn',x,z,.02);
    for(const side of [-1,1]){b.box(w,.34,.7,'soil',x,.17,z+side*d/2);b.box(.7,.34,d,'soil',x+side*w/2,.17,z);}
  }
  for(let i=0;i<5;i++)for(let j=0;j<7;j++)plot(-330+j*96+(rng()-.5)*22,-175-i*84+(rng()-.5)*20,104+rng()*44,90+rng()*38);
  for(let i=0;i<4;i++)for(let j=0;j<4;j++)plot(192+i*94+(rng()-.5)*22,-235+j*90+(rng()-.5)*20,106+rng()*40,96+rng()*34);
  for(let i=0;i<4;i++)for(let j=0;j<4;j++)plot(-197-i*94+(rng()-.5)*22,-235+j*90+(rng()-.5)*20,106+rng()*40,96+rng()*34);

  b.flush();
  return {lights,glows,builder:b,treeCount:places.length};
}
