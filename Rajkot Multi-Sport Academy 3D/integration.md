# Integration notes — V1

## Structure

```
<App>
  <ThreeDHero />       ← this project: Rajkot Multi-Sport Academy.dc.html + campus-scene.js
  <AcademyContent />   ← built separately; owns #sports #programs #facilities #coaches #gallery #trial #contact
</App>
```

The hero owns nothing below the fold. Nav links and both CTAs already point at the
anchor ids above, so they start working the moment `AcademyContent` renders them.

## Files

| File | Role |
| --- | --- |
| `academy-config.js` | All copy: brand name, kicker, nav + hrefs, five facility programs. Only place any of it is written. |
| `campus-scene.js` | `<campus-scene>` custom element — three.js campus, lighting, hotspots, camera. No copy, no layout. |
| `Rajkot Multi-Sport Academy.dc.html` | The hero shell: nav, headline, reusable facility panel, sport selector. |

Rebranding for a real client = editing `academy-config.js` only.

## Scene API

```js
const scene = document.querySelector('campus-scene');
scene.setSport('tennis');     // or null → campus overview
scene.setSport(null);
scene.replayIntro();
scene.setPreset('mobile');    // 'auto' (default) | 'desktop' | 'mobile'
```

Events (on `window` and the element): `campus:ready`, `campus:introdone`,
`campus:introstart`, `campus:select` → `{ key }`.

Facility keys: `cricket` · `pickleball` · `tennis` · `turf` · `fitness`.
A key must exist in both `SPORTS` (campus-scene.js) and `facilities` (academy-config.js).

## Camera

`auto` picks `desktop` or `mobile` from the viewport aspect; the mobile preset is a
stub (higher elevation, wider fov, no left-shift) ready to be tuned for phones —
it does not try to reproduce the desktop composition. Framing is solved per
resize by projecting the campus bounds, so the academy fills the frame at any
aspect without hand-tuned numbers.

Idle drift stops as soon as a facility is selected; `← CAMPUS OVERVIEW` returns
to the hero framing and restores the headline.

## Performance

- Trees and athletes are `InstancedMesh` sets per zone (~280 draw calls → ~14).
- Box and cylinder geometry is cached and shared by dimensions.
- Materials are per-zone and reused; highlight/dim is a material tint, not new lights.
- Lights: one sun, one fill, hemisphere, ambient lift, plus one spotlight per mast.
  Mast spotlights are the only per-facility lights — do not add more.
- No GLB models loaded. Shadow map is a single 4096 cascade fitted to the site.
