import bpy, numpy as np, json
from pathlib import Path
root=Path('D:/ahm-cricket')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root/'assets/campus/tree-source/tree.gltf'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
stats=[]
for obj in list(bpy.context.scene.objects):
 if obj.type!='MESH':continue
 mesh=obj.data;before=sum(len(p.vertices)-2 for p in mesh.polygons);name=' '.join(m.name.lower() for m in mesh.materials if m)
 bpy.context.view_layer.objects.active=obj
 if 'leaves' in name:
  n=len(mesh.vertices);parent=list(range(n))
  def find(i):
   while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
   return i
  edges=np.empty(len(mesh.edges)*2,dtype=np.int32);mesh.edges.foreach_get('vertices',edges)
  for a,b in edges.reshape(-1,2):
   ra,rb=find(int(a)),find(int(b))
   if ra!=rb:parent[rb]=ra
  groups={}
  for i in range(n):groups.setdefault(find(i),[]).append(i)
  coords=np.empty(n*3,dtype=np.float32);mesh.vertices.foreach_get('co',coords);coords=coords.reshape(-1,3)
  loopverts=np.empty(len(mesh.loops),dtype=np.int32);mesh.loops.foreach_get('vertex_index',loopverts)
  sourceuv=np.empty(len(mesh.loops)*2,dtype=np.float32);mesh.uv_layers.active.data.foreach_get('uv',sourceuv);vertexuv=np.zeros((n,2));vertexuv[loopverts]=sourceuv.reshape(-1,2)
  verts=[];faces=[];uvs=[]
  for indices in groups.values():
   pts=coords[indices];center=pts.mean(axis=0);local=pts-center
   if len(indices)<3:continue
   values,axes=np.linalg.eigh(local.T@local);long=axes[:,-1];wide=axes[:,-2];normal=axes[:,0]
   projected=local@np.stack([long,wide],axis=1);lo=projected.min(axis=0);hi=projected.max(axis=0)
   center=center+long*(hi[0]+lo[0])/2+wide*(hi[1]+lo[1])/2
   length=(hi[0]-lo[0])*.52;width=(hi[1]-lo[1])*.58
   if length<.001 or width<.001:continue
   points=[center-long*length,center-wide*width,center+long*length,center+wide*width,center+normal*width*.15]
   base=len(verts);verts.extend([p.tolist() for p in points])
   for p in points:
    nearest=int(np.argmin(np.sum((pts-p)**2,axis=1)));uvs.append(vertexuv[indices[nearest]].tolist())
   for k in range(4):faces.append((base+k,base+(k+1)%4,base+4))
  out=bpy.data.meshes.new('Preserved leaf silhouettes');out.from_pydata(verts,[],faces);out.materials.append(mesh.materials[0]);out.uv_layers.new(name='UVMap')
  for loop in out.loops:out.uv_layers.active.data[loop.index].uv=uvs[loop.vertex_index]
  obj.data=out
  print('LEAF COMPONENTS',len(groups),'OUTPUT',len(faces),'triangles',flush=True)
 else:
  mod=obj.modifiers.new('Web bark detail','DECIMATE');mod.ratio=min(1,8000/before);bpy.ops.object.modifier_apply(modifier=mod.name)
 for poly in obj.data.polygons:poly.use_smooth=True
 stats.append({'material':name,'before':before,'after':sum(len(p.vertices)-2 for p in obj.data.polygons)})
for img in bpy.data.images:
 if img.size[0]>512:img.scale(512,512);img.pack()
bpy.ops.export_scene.gltf(filepath=str(root/'assets/campus/tree.glb'),export_format='GLB',export_image_format='JPEG',export_jpeg_quality=82,export_animations=False)
(root/'assets/campus/tree-optimization.json').write_text(json.dumps(stats,indent=2));print(stats)
