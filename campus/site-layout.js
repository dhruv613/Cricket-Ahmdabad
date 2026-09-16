// VASTRAL CRICKET GROUND - single source of site geometry.
// Traced from the architect's CONCEPTUAL LAYOUT, drawing AR_CGV_01 Rev R0,
// STUDIO ERA, dated 09-03-2026, by reading the PDF's vector paths directly
// (tools/extract-plan.py). Nothing here was positioned by eye.
//
// SCALE. The drawing's own note forbids scaling, so the page scale was not
// assumed - it was derived from the written dimensions and then cross-checked:
//   pickleball block  124.80 x 99.96 pt  /  24 x 19.2 m   = 5.200 pt/m
//   volleyball box     78.00 x 124.92 pt /  15 x 24 m     = 5.200 pt/m
//   cricket ground    520.44 pt diameter /  100 M written = 5.204 pt/m
// Three independent objects agree, so 5.2 pt/m is treated as exact.
//
// WRITTEN vs REFERENCE. Only three dimensions are written on the drawing:
// the 100 M ground, the 9000 x 18000 volleyball court and the 12000 x 19200
// pickleball court, plus the 9 M road width. Those are marked `written`.
// Everything else is a faithful trace of the drawn linework for this website
// demo and is marked `referenceApproximation` - it is NOT a construction
// dimension. For engineering values, request the DWG (ground planning.dwg).
//
// ORIGIN. Cricket ground centre = (0,0). Metres. North = +Z.
//
// HANDEDNESS. PLAN below is in drawing space where +X is EAST. Three.js is
// right-handed with +Y up, so with north at +Z the world's +X points WEST.
// The flip is applied once on export, which keeps these numbers directly
// comparable with the PDF while consumers get correct world space.

export const LAYOUT_LOCKED = true;
export const PLAN_SOURCE = Object.freeze({
  drawing: 'AR_CGV_01', revision: 'R0', issued: '2026-03-09',
  consultant: 'STUDIO ERA', scalePtPerMetre: 5.2,
  written: ['cricketGround.diameter=100m', 'volleyballCourt=9x18m',
            'pickleballCourt=12x19.2m', 'road.width=9m'],
  note: 'All other figures are traced reference approximations, not construction dimensions.'
});

const PLAN = {
  // Seven-sided plot. The east edge steps out at z=-64 to form the arrival
  // wedge, and the south edge sits directly on the road's north kerb line.
  siteBoundary: [[-47.1, 59.9], [52.8, 53.1], [48.1, -64.4], [93.5, -81.3],
                 [85.8, -127.2], [-57.2, -117.3], [-54.3, -74.4]],
  // 9 M WIDE ROAD - width is written; the alignment is traced. It is angled,
  // dropping ~16.5 m from west to east across the frontage.
  road: { north: [[126.4, -130.0], [-112.3, -113.5]], width: 9, widthWritten: true },
  cricketGround: { x: 0, z: 0, radius: 50, diameterWritten: true, apron: 4 },
  // Pitch block at the centre of the ground, as drawn.
  cricketPitch: { x: 0, z: 0, width: 15.2, length: 25 },
  // Yellow CRICKET PRACTICE AREA polygon. The whole polygon is the facility;
  // the nets sit inside it.
  practiceArea: { polygon: [[-53.5, -59.8], [-11.3, -59.8], [-11.3, -97.4], [-55.9, -97.4]],
                  lanes: 5, netsInset: 4 },
  storeArea: { x: -43.4, z: -56.0, width: 4.5, length: 7.5 },
  // Court = written play area; box = the drawn run-off rectangle around it.
  volleyball: { x: -3.8, z: -85.4, width: 9, length: 18, written: true,
                box: { width: 15, length: 24 } },
  // One block of two 12 x 19.2 courts, centres taken from the drawn markings.
  pickleball: { x: 24.8, z: -87.8, width: 12, length: 19.2, written: true,
                courtCentres: [18.8, 30.8], box: { width: 24, length: 19.2 } },
  // Open zone on the pink circulation area, above the office strip.
  foodCourt: { x: 49.4, z: -83.5, width: 17, length: 13 },
  // Office and the service bay beside it form one low horizontal strip.
  office: { x: 42.8, z: -94.3, width: 12, length: 6 },
  serviceBay: { x: 53.8, z: -94.4, width: 10, length: 6 },
  // Access point only - never a building.
  internalEntrance: { x: 65.1, z: -81.7, width: 10, length: 9 },
  // Yellow arrival wedge: vertical west edge, angled east edge on the boundary.
  parkingPolygon: [[59.9, -70.1], [92.2, -82.1], [79.5, -126.8], [57.6, -125.2]],
  // Fourteen angled bays along the far east edge, exactly as drawn.
  parkingBays: [[89.1, -85.4], [89.5, -82.9], [88.2, -90.3], [88.6, -87.8],
                [87.4, -95.2], [87.8, -92.8], [86.6, -100.2], [87.0, -97.7],
                [85.7, -105.1], [86.2, -102.6], [84.9, -110.0], [85.3, -107.6],
                [84.1, -115.0], [84.5, -112.5], [83.2, -119.9], [83.6, -117.4]],
  parkingBaySize: { width: 5.35, length: 3.3 },
  mainEntrance: { x: 68.0, z: -126.5, width: 12 },
  // Light-green landscaped frontage between the facilities and the road. It
  // stops where the arrival wedge begins.
  frontLandscape: [[-55.9, -97.7], [58.7, -97.7], [58.0, -117.3], [-57.2, -117.3]],
  // Circulation/apron trees follow the drawn rows rather than a scatter.
  trees: {
    north: [[-42, 55], [-31, 57], [-19, 57], [-7, 56], [6, 56], [18, 55], [30, 53], [41, 50]],
    west: [[-45, 43], [-46, 30], [-47, 16], [-48, 2], [-49, -12], [-50, -26], [-51, -40], [-52, -54]],
    east: [[45, 45], [46, 31], [47, 17], [48, 3], [48, -11], [48, -25], [48, -39], [49, -53]],
    wedge: [[95, -84], [93, -93], [91, -102], [89, -111], [87, -120], [84, -128]],
    front: [[-46, -107], [-33, -108], [-20, -109], [-7, -110], [6, -111], [19, -112],
            [32, -113], [45, -114], [55, -115]],
    feature: [[-55, -100], [-55, -108], [-55, -115], [57, -100], [57, -108], [57, -115]]
  },
  // Not on the drawing: four masts at the ground's corners for night play.
  masts: [[-46, -56], [46, -56], [-46, 56], [46, 56]]
};

const flipPoint = ([x, z]) => [-x, z];
const flipRing = ring => ring.map(flipPoint).reverse();
const flipPath = path => path.map(flipPoint);
const flipZone = zone => ({ ...zone, x: -zone.x });

export const SITE_LAYOUT = Object.freeze({
  layoutLocked: LAYOUT_LOCKED,
  source: PLAN_SOURCE,
  orientation: { north: '+Z', east: '-X', road: 'south frontage' },
  siteBoundary: flipRing(PLAN.siteBoundary),
  road: { north: flipPath(PLAN.road.north), width: PLAN.road.width },
  cricketGround: flipZone(PLAN.cricketGround),
  cricketPitch: flipZone(PLAN.cricketPitch),
  practiceArea: { ...PLAN.practiceArea, polygon: flipRing(PLAN.practiceArea.polygon) },
  storeArea: flipZone(PLAN.storeArea),
  volleyball: flipZone(PLAN.volleyball),
  pickleball: { ...flipZone(PLAN.pickleball), courtCentres: PLAN.pickleball.courtCentres.map(v => -v) },
  foodCourt: flipZone(PLAN.foodCourt),
  office: flipZone(PLAN.office),
  serviceBay: flipZone(PLAN.serviceBay),
  internalEntrance: flipZone(PLAN.internalEntrance),
  parkingPolygon: flipRing(PLAN.parkingPolygon),
  parkingBays: flipPath(PLAN.parkingBays),
  parkingBaySize: PLAN.parkingBaySize,
  mainEntrance: flipZone(PLAN.mainEntrance),
  frontLandscape: flipRing(PLAN.frontLandscape),
  trees: Object.fromEntries(Object.entries(PLAN.trees).map(([k, v]) => [k, flipPath(v)])),
  masts: flipPath(PLAN.masts)
});
