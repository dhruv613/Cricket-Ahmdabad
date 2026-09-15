// Metres. Bounds describe the complete facility, independent of viewport size, and double as the
// dedicated camera target for that facility. Keys must match `facilities[].key` in academy-config.js.
export const FACILITIES = {
  ground: {label:'CRICKET GROUND', anchor:[0,3,-5], min:[-67,0,-58], max:[67,5,58], direction:[.7,.85,1]},
  indoor: {label:'5 INDOOR LANES', anchor:[-91,11,-65], min:[-105,0,-84], max:[-77,10,-64], direction:[.26,.34,1]},
  nets: {label:'20 OUTDOOR NETS', anchor:[-93,6,-9], min:[-109,0,-51], max:[-77,6,42], direction:[1,1.3,.7]},
  coaching: {label:'COACHING', anchor:[0,11,-94], min:[-25,0,-106], max:[25,10,-81], direction:[.45,.65,1]},
  performance: {label:'PERFORMANCE & ANALYSIS', anchor:[79,8,-92], min:[62,0,-106], max:[100,8,-56], direction:[.6,.7,1]}
};
export const CAMPUS_BOUNDS = {min:[-124,0,-115], max:[124,30,133], direction:[.7,1.05,1]};
