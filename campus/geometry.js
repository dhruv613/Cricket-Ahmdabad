import * as T from 'three';

// Static objects are instanced by geometry/material. Fine details do not each add a draw call.
export class Builder {
  constructor(scene, materials) {this.scene=scene;this.M=materials;this.cache=new Map();this.batches=new Map();this.dynamic=[];}
  geo(key,create){if(!this.cache.has(key))this.cache.set(key,create());return this.cache.get(key);}
  add(geo,mat,position,rotation=[0,0,0],scale=[1,1,1],cast=true){
    mat=typeof mat==='string'?this.M[mat]:mat;
    const key=geo.uuid+mat.uuid+cast;let batch=this.batches.get(key);
    if(!batch){batch={geo,mat,cast,matrices:[]};this.batches.set(key,batch);}
    const matrix=new T.Matrix4().compose(new T.Vector3(...position),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(...scale));
    batch.matrices.push(matrix);return matrix;
  }
  box(w,h,d,mat,x,y,z,rotation=[0,0,0],cast=true){
    const g=this.geo(`b${w},${h},${d}`,()=>{
      const g=new T.BoxGeometry(w,h,d);const uv=g.attributes.uv,normal=g.attributes.normal;
      for(let i=0;i<uv.count;i++){const nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i));uv.setXY(i,uv.getX(i)*(nx>.5?d:w)/3,uv.getY(i)*(ny>.5?d:h)/3);}
      return g;
    });return this.add(g,mat,[x,y,z],rotation,[1,1,1],cast);
  }
  cylinder(rTop,rBottom,h,mat,x,y,z,rotation=[0,0,0],segments=12){return this.add(this.geo(`c${rTop},${rBottom},${h},${segments}`,()=>new T.CylinderGeometry(rTop,rBottom,h,segments)),mat,[x,y,z],rotation);}
  sphere(r,mat,x,y,z,scale=[1,1,1]){return this.add(this.geo(`s${r}`,()=>new T.SphereGeometry(r,16,12)),mat,[x,y,z],[0,0,0],scale);}
  beam(from,to,r,mat='metal'){
    const a=new T.Vector3(...from),b=new T.Vector3(...to),mid=a.clone().add(b).multiplyScalar(.5);
    const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());
    const e=new T.Euler().setFromQuaternion(q);
    return this.cylinder(r,r,a.distanceTo(b),mat,...mid.toArray(),[e.x,e.y,e.z],8);
  }
  plane(w,h,mat,x,y,z,rotation=[-Math.PI/2,0,0],tile=1){
    const geo=this.geo(`p${w},${h},${tile}`,()=>{const g=new T.PlaneGeometry(w,h);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/tile,uv.getY(i)*h/tile);return g;});
    return this.add(geo,mat,[x,y,z],rotation,[1,1,1],false);
  }
  mesh(geometry,material,position=[0,0,0],rotation=[0,0,0]){
    const m=new T.Mesh(geometry,typeof material==='string'?this.M[material]:material);m.position.set(...position);m.rotation.set(...rotation);m.castShadow=true;m.receiveShadow=true;this.scene.add(m);this.dynamic.push(m);return m;
  }
  flush(){
    for(const {geo,mat,cast,matrices} of this.batches.values()){
      const mesh=new T.InstancedMesh(geo,mat,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=cast;mesh.receiveShadow=true;mesh.computeBoundingSphere();this.scene.add(mesh);
    }
    this.batches.clear();
  }
}
