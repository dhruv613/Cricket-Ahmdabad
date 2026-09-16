import { SITE_LAYOUT as L } from './site-layout.js';
const extent=r=>({minX:Math.min(...r.map(p=>p[0])),maxX:Math.max(...r.map(p=>p[0])),minZ:Math.min(...r.map(p=>p[1])),maxZ:Math.max(...r.map(p=>p[1]))});

// Camera bounds are derived from the same plan coordinates used by the builder, so a change to
// site-layout.js moves the cameras with the geometry. Directions are expressed in world space:
// east is -X (see the handedness note in site-layout.js), so a viewpoint "from the east" has a
// negative X component.
const zone=(z,pad=2,height=8)=>({
  min:[z.x-z.width/2-pad,0,z.z-z.length/2-pad],
  max:[z.x+z.width/2+pad,height,z.z+z.length/2+pad]
});
// The arrival wedge is an irregular polygon, so its frame comes from the polygon extent.
const ex=extent(L.practiceArea.polygon);
const PA={x:(ex.minX+ex.maxX)/2,z:(ex.minZ+ex.maxZ)/2,width:ex.maxX-ex.minX,length:ex.maxZ-ex.minZ};
const px=L.parkingPolygon.map(p=>p[0]),pz=L.parkingPolygon.map(p=>p[1]);

export const FACILITIES={
  ground:{label:'100 M CRICKET GROUND',anchor:[L.cricketGround.x,3,L.cricketGround.z],
    min:[L.cricketGround.x-L.cricketGround.radius-4,0,L.cricketGround.z-L.cricketGround.radius-4],
    max:[L.cricketGround.x+L.cricketGround.radius+4,28,L.cricketGround.z+L.cricketGround.radius+4],direction:[-.7,.85,1]},
  nets:{label:'CRICKET PRACTICE AREA',anchor:[PA.x,5,PA.z],
    ...zone(PA,2,8),direction:[-1,1.15,.75]},
  courts:{label:'VOLLEYBALL & PICKLEBALL',anchor:[(L.volleyball.x+L.pickleball.x)/2,3,L.volleyball.z],
    min:[Math.min(L.volleyball.x-L.volleyball.width/2,L.pickleball.x-L.pickleball.width/2)-2,0,L.volleyball.z-L.volleyball.length/2-2],
    max:[Math.max(L.volleyball.x+L.volleyball.width/2,L.pickleball.x+L.pickleball.width/2)+2,7,L.pickleball.z+L.pickleball.length/2+2],
    direction:[-.45,.72,1]},
  food:{label:'FOOD COURT & OFFICE',anchor:[L.foodCourt.x,4,L.foodCourt.z],
    min:[L.foodCourt.x-L.foodCourt.width/2-2,0,L.office.z-L.office.length/2-2],
    max:[L.foodCourt.x+L.foodCourt.width/2+2,8,L.foodCourt.z+L.foodCourt.length/2+2],direction:[-.65,.75,1]},
  arrival:{label:'ENTRANCE & PARKING',anchor:[L.internalEntrance.x,4,L.internalEntrance.z],
    min:[Math.min(...px)-3,0,Math.min(...pz)-6],max:[Math.max(...px)+3,10,Math.max(...pz)+3],
    direction:[-.55,.7,1]}
};

// Framed from the plan itself so the whole irregular plot, its road and its entrance stay in shot.
// Camera sits south of the plot looking north: the 9 m road and entrance are foreground, the ground
// reads at the rear exactly as on the architect's drawing.
const roadPts=[...L.road.north,...L.road.north.map(([x,z])=>[x,z-L.road.width])];
const bx=[...L.siteBoundary.map(p=>p[0]),...roadPts.map(p=>p[0])];
const bz=[...L.siteBoundary.map(p=>p[1]),...roadPts.map(p=>p[1])];
export const CAMPUS_BOUNDS={
  min:[Math.min(...bx)-6,0,Math.min(...bz)-6],
  max:[Math.max(...bx)+6,30,Math.max(...bz)+6],
  direction:[-.45,1.08,-.78]
};
