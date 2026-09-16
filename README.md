# Seventeen Sports academy website

The rebuilt Three.js campus is the opening `ThreeDHero`. The page below it follows the supplied official client brief. This is a static website; no build step, backend, or form service is required.

## Preview

From this directory:

```powershell
npm run dev
```

Open `http://127.0.0.1:4173`. Use an HTTP server instead of opening the HTML directly. Three.js 0.184.0, its required addons, and all campus assets are served locally. Only the Google Fonts stylesheets need internet access.

## Files

- `index.html`: existing hero shell and its UI controller, plus the main content mount.
- `academy.css`: client palette, section styling, responsive layouts, and motion preferences.
- `academy-content.js`: `FacilityStats`, `AboutSection`, `OutdoorNets`, `GroundSection`, `CoachingSection`, `ScheduleSection`, `FacilitiesGrid`, `Gallery`, `AdmissionSection`, `ContactSection`, and `Footer`.
- `Rajkot Multi-Sport Academy 3D/academy-config.js`: academy identity, contact details, schedules, copy, gallery categories, and approved-media paths. Edit client information here.
- `Rajkot Multi-Sport Academy 3D/image-slot.js`: reusable image/video component with intentional placeholders and loading-error fallback.
- `Rajkot Multi-Sport Academy 3D/Rajkot Multi-Sport Academy.dc.html`: retained Claude Design hero source with refreshed copy styling and palette.
- `Rajkot Multi-Sport Academy 3D/campus-scene.js`: shared custom-element bootstrap for both HTML entry points.
- `campus/entry.js`, `players.js`, `facilities.js`, `scene.css`: lightweight GLB loader, animation, camera framing, and controls.
- `campus/model.js`, `materials.js`, `geometry.js`: offline source geometry used when rebuilding the campus asset. These modules are not loaded by the website.
- `assets/campus/academy-campus.glb`: optimized campus with embedded textures and Meshopt compression.
- `assets/campus/academy-player.glb`: reusable athlete with Run, Batting, Bowling, and Fielding animation clips.
- `Rajkot Multi-Sport Academy 3D/campus-scene.legacy.js`: preserved original model. Original SHA-256: `2A4E074B68191F7B29F66A9248C1F0F16C6A54AD39FCF58F8FC26CEB5A2D36FC`.
- `Rajkot Multi-Sport Academy 3D/support.js`: original Design Component runtime, unchanged.

## Media and contact details

The outdoor nets, ground, and gallery use six labelled 3D campus renders in `assets/campus/views/`. These lazy-loaded WebP images do not create additional WebGL canvases. Gallery previews and the two facility images link to their corresponding area in the interactive campus. There is no indoor category or indoor cricket content.

Run `node tools/render-campus-media.mjs` while the preview server is running to regenerate these images after rebuilding the GLB. Camera positions are in `tools/render-campus-media.html`.

Approved photos and videos can be placed in the existing uploads folder. Set each relevant `media.src` or `content.gallery.items[].src` in the config to its URL relative to `index.html`. Use `type: 'image'` or `type: 'video'`. Remove the gallery item's `facility` field when replacing a model render with photography so it no longer carries the model attribution. See `MEDIA-NEEDED.md` for the requested real coaching, training, and match photos. Empty sources show designed placeholders. The map is also a placeholder; Get Directions opens a Google Maps address search.

The WhatsApp number uses the supplied contact number. Opening hours are displayed as the provided training sessions; no unconfirmed daily operating hours are added.

## Site orientation (important)

The plan drawing reads with +X east. Three.js is right-handed with +Y up, so once north is pinned
to +Z the world's +X points **west**. `campus/site-layout.js` therefore authors every coordinate
exactly as it appears on the drawing and mirrors once on export; `orientation.east` records the
resulting convention. Consumers - the builder, the camera bounds in `campus/facilities.js` and the
floodlight rig in `campus/entry.js` - all read the mirrored values, so the perspective views, the
facility cameras and Plan view agree with each other and with the drawing.

Do not "fix" a mirrored-looking scene with a canvas transform. An earlier pass did that
(`transform: scaleX(-1)` in plan view) which corrected Plan view alone, left every perspective view
reversed, and rendered signage text backwards.

## Site geometry is locked

All site geometry lives in `campus/site-layout.js` and is traced from the architect's vector
drawing (AR_CGV_01 Rev R0, STUDIO ERA, 09-03-2026) by reading the PDF's paths directly with
`tools/extract-plan.py`. Nothing is positioned by eye, and no transform is hard-coded in the
builder - `campus/model.js`, `campus/facilities.js` and the night rig in `campus/entry.js` all read
from the layout file.

**Scale.** The drawing forbids scaling, so the page scale was derived from the written dimensions
and cross-checked three ways: the pickleball block (124.80 x 99.96 pt / 24 x 19.2 m), the
volleyball run-off box (78.00 x 124.92 pt / 15 x 24 m) and the 100 M ground circle (520.44 pt).
All three give 5.2 pt/m.

**Written vs reference.** Only the 100 M ground, the 9000 x 18000 volleyball court, the
12000 x 19200 pickleball court and the 9 M road width are written on the drawing; those are marked
`written` in the layout. Every other figure is a traced reference approximation for this web demo
and is **not** a construction dimension. For engineering values, request `ground planning.dwg`.

`LAYOUT_LOCKED = true`. Treat the transforms as immutable: later visual-polish work should not move
site geometry. Change the plan file, not the builder.

**Checking alignment.** Load the site with `?plan=1` to get a Dev group in the campus controls.
*Compare with plan* drops into orthographic plan view and lays the architect's sheet over the
geometry at a known world scale; the `%` button cycles overlay opacity. The overlay image is
`assets/campus/plan-reference.png`, rendered by `tools/extract-plan.py` over a fixed 260 x 220 m
world window, so it is georeferenced rather than fitted by hand.

## Interactions

- Explore 3D Campus clears the hero overlay. Click a hotspot or one of the five facility selectors - 01 Ground, 02 Indoor, 03 Outdoor Nets, 04 Coaching, 05 Analysis - to move the camera to that facility's dedicated target. Selecting a facility stops the ambient camera drift. Campus Overview restores the opening view.
- The campus controls are grouped: View (Aerial / Ground), Time (Day / Night), Play Campus Tour, then small icon controls for pause, zoom and reset.
- Night is a timed cinematic rather than a switch. Over 1.9 s the sky and sun fade down while nine real spot lights strike in sequence - the four ground floodlights corner by corner, then the indoor hall, the net complex and the pavilion - and the NIGHT TRAINING & MATCH FACILITY cue appears. There are no glow sprites; the only emissive surfaces are the light fittings themselves. The transition is wall-clock driven, so it takes the same time whatever the frame rate, and resolves instantly under prefers-reduced-motion.
- Wheel scrolling and vertical touch scrolling reach the website sections. Camera zoom uses explicit buttons.
- Facilities expand with native accessible disclosure controls.
- Gallery filters show matching media slots. Previews open in a modal with Escape and close-button support.
- View The Nets In 3D, in the 20 Outdoor Nets section, scrolls to the hero and frames the campus model on the practice nets; the facility panel's View Program link returns to that section. The control is a plain `#top` anchor, so it still reaches the scene without the enhancement, and it is hidden entirely when the campus reports a load failure.
- The contact map links out twice: View On Google Maps opens the academy's own listing, and Get Directions starts routing to the address. The panel behind them is a stylised graphic, not a live map embed.
- Session enquiry links preselect the corresponding training session; Ground Enquiry prefills a message.
- The trial form validates required fields and prepares an on-device summary with a text-file download. It never submits a request, claims a confirmed booking, or stores player information in local storage. Call the academy to arrange a trial.

## Design connection

This implementation uses the local project export. The `claude_design` MCP was unavailable in this session, so the local export could not be compared to the live Claude Design project. Spline/Figma project links and approved brand media are not present in the workspace.

## Verification

The current scene regression suite is `npm run test:campus`: 54 interaction checks plus interrupted-load remounting, graphics-context recovery, and asset-error fallback. `verify-page.js` and `verify-campus.js` remain available as the earlier browser-evaluated page checks.


## Campus model and assets

The scene is an architectural concept based on the supplied facility brief. Its layout, building designs, and landscaping are not a surveyed replica of the real academy. Matching the actual site requires site photographs, an architectural plan, and dimensions.

**Site reference.** The academy is *17 Sports Academy / Seventeen Sports*, Vastral, Ahmedabad (Plus Code `XMVH+4HF`, about 22.9928 N, 72.6790 E). The Airbus/Maxar imagery on Google Maps predates construction and shows the plot still bare, so it cannot supply a building layout. What it does establish is the setting, and the scene now follows it: semi-arid ground rather than temperate lawn, the Vastral-Gatrad road along the south edge with the village packed against its far side, dry farm plots north, east and west, and the high hazy light of 23 N. The surrounding massing is deliberately low-detail; it exists to give the campus a horizon, not to describe real buildings.

The campus covers the client's stated facilities: the full-size oval and wicket, the 5-lane indoor cricket hall, twenty outdoor lanes split 15 turf / 5 astro with a visible break between the two surfaces, the coaching building, the Performance & Analysis Centre with its strength and conditioning ground alongside, pavilion seating, floodlights, the branded entrance gate, parking and paths.

The indoor hall is modelled from the client's own facility photograph: one span laid wall-to-wall in astro, divided into five lanes by full-height netting, under continuous linear fittings, with bowling machines on the outer lanes. Its campus elevation is glazed above a low base so the lanes and their lighting read from outside, which is what the facility camera target looks at. Vegetation uses rounded crowns instead of thousands of individual leaf cards. Sixteen adult-proportioned athletes animate on the ground, at the nets, and on the sprint track.

The static campus is built offline, merged by material, and compressed into a **1.02 MB GLB** containing **61,783 triangles in 38 batches**. The reusable athlete GLB is 21 KB and contains four animation clips. All athletes share GPU instances. Canvas-generated maps are re-encoded to JPEG at build time wherever their alpha is fully opaque, which cuts the baked texture payload from 1.49 MB to 0.31 MB; cut-out maps (net, foliage, contact shadow) stay PNG. The runtime uses one rendering pass, a cached 2048px sun shadow, contact shadows for moving athletes, and adaptive pixel resolution. The previous large tree, scanned source textures, and HDR are retained as source assets but are not requested by the website.

Camera framing uses the facility's world-space bounds and the space available beside the information panel. Hotspots and bottom selectors both move the camera. Camera transitions can be interrupted by dragging or another selection. Depth precision adapts to camera distance to prevent turf and pavement flicker. Animation stops offscreen and in background tabs; reduced-motion users start with still players.

Poly Haven source textures are CC0; source URLs are in `assets/campus/sources.json`. Three.js and Meshoptimizer licenses are retained under `vendor/`. The campus is a facility concept, not a surveyed site replica.

### Rebuild the assets

The exported GLBs are committed deliverables; rebuilding is unnecessary to preview the website. To change geometry or materials:

1. Install developer tools with `npm ci`, `npx playwright install chromium`, and `python -m pip install Pillow`.
2. Run `npm run dev` in one terminal.
3. Edit `campus/model.js`, `campus/materials.js`, or `tools/player-source.js`.
4. In another terminal, run `npm run build:campus`.

`tools/build-campus.mjs` exports with the pinned Three.js exporter, merges static meshes, and applies Meshopt compression. It also retains `academy-campus.raw.glb` locally for editing in tools that do not support Meshopt. The export process does not use or modify an open Blender document.

### React / Three.js handoff

Load the optimized campus with `GLTFLoader` and `MeshoptDecoder` (both are already wired in `campus/entry.js`). Keep the athlete as a separate reusable asset. The GLB format alone does not guarantee frame rate; shared geometry, fewer render calls, compact textures, and controlled lighting are the performance changes here. Edit branding in `academy-config.js`; rebuild the campus to update signs embedded in its textures.

### Regression checks

With the preview server running, execute `npm run test:campus`. The Playwright checks exercise both 1440px desktop and 390px mobile layouts: all five selectors, all five floating labels, camera fit beside panels, pitch view, zoom, pause/resume, lighting, rapid selection, orbit damping, offscreen pause, reduced motion, reconnect, and the standalone design HTML. Screenshots and results are written to `artifacts/`.

Browser viewport emulation is not a physical-phone performance measurement. Desktop hardware tests use the local Intel UHD graphics through D3D11; exact performance also depends on screen resolution and device load.

Latest isolated desktop sample at 1440 ? 900 on the local Intel UHD GPU: median frame interval 16.7 ms (~60 FPS), 95th percentile 33.4 ms, and 275 ms scene-ready time from the local server. This is a short local measurement, not a network or phone benchmark. During daylight, inactive floodlights are removed from the render list; both lighting shader variants are warmed before the tour opens.

### Hero background and camera motion

On phones the opening canvas fills the entire hero behind the copy. Its closer framing is deliberately allowed to crop the perimeter, matching the desktop hero composition. Explore and facility selections retain their own camera framing. A slow, bounded camera drift runs after the opening transition; dragging, zooming, or choosing a facility stops it. Pause Motion controls both the players and camera motion. Reduced-motion preferences disable automatic camera drift.

Run `node tools/verify-hero-framing.mjs` to check the background, opening zoom, camera motion, pause, selection, and reduced motion at 390px, 680px, and 1440px widths.
#   C r i c k e t - A h m d a b a d 
 
 