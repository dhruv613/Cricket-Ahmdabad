/* <campus-scene> — isometric 3D cricket academy campus, three.js.
   Plan (north at top):            [ ACADEMY BUILDING / COACHING ]
     [INDOOR HALL]                                        [VIDEO ANALYSIS]
                        [ C R I C K E T   G R O U N D ]
     [OUTDOOR NETS x20]        [FITNESS]
                        [ ENTRANCE / PARKING ]
   API:  el.setSport(key|null) · el.replayIntro() · el.setPreset('auto'|'desktop'|'mobile')
   Events (window + host): campus:select {key} · campus:introdone · campus:ready */
(function () {
  var THREE_URL = 'https://unpkg.com/three@0.184.0/build/three.module.js';
  var loading = null;
  function loadThree() { return loading || (loading = import(THREE_URL)); }

  var SPORTS = {
    ground:   { label: 'CRICKET GROUND',  anchor: [0, 17, -2],    ext: [40, 31] },
    nets:     { label: 'PRACTICE NETS',   anchor: [-44, 8, 12],   ext: [18, 38] },
    coaching: { label: 'COACHING',        anchor: [2, 8, -52],    ext: [18, 10] },
    analysis: { label: 'VIDEO ANALYSIS',  anchor: [48, 8, -49],   ext: [14, 12] },
    fitness:  { label: 'FITNESS',         anchor: [2, 11, 40],    ext: [16, 11] }
  };

  customElements.define('campus-scene', class extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      this._booted = true;
      this.style.display = 'block';
      this.style.position = 'absolute';
      this.style.inset = '0';
      this.style.overflow = 'hidden';
      var self = this;
      loadThree().then(function (T) { self.boot(T); }).catch(function (e) { console.error('three load failed', e); });
    }
    setSport(k) { if (this._api) this._api.setSport(k); else this._pending = k; }
    replayIntro() { if (this._api) this._api.replayIntro(); }
    setPreset(name) { if (this._api) this._api.setPreset(name); else this._preset = name; }

    boot(THREE) {
      var host = this;
      var W = this.clientWidth || 1440, H = this.clientHeight || 900;

      var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(W, H);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
      this.appendChild(renderer.domElement);

      var scene = new THREE.Scene();
      var SKY_TEX = (function () {
        var cv = document.createElement('canvas'); cv.width = 8; cv.height = 256;
        var cx = cv.getContext('2d');
        var g = cx.createLinearGradient(0, 0, 0, 256);
        g.addColorStop(0, '#040810'); g.addColorStop(0.42, '#081428');
        g.addColorStop(0.74, '#0d1f3c'); g.addColorStop(0.92, '#122a4a'); g.addColorStop(1, '#1a3558');
        cx.fillStyle = g; cx.fillRect(0, 0, 8, 256);
        var tx = new THREE.CanvasTexture(cv);
        tx.colorSpace = THREE.SRGBColorSpace;
        tx.mapping = THREE.EquirectangularReflectionMapping;
        return tx;
      })();
      scene.background = SKY_TEX;
      (function () {
        var pm = new THREE.PMREMGenerator(renderer);
        pm.compileEquirectangularShader();
        scene.environment = pm.fromEquirectangular(SKY_TEX).texture;
        scene.environmentIntensity = 0.55;
        pm.dispose();
      })();
      /* fine surface noise — breaks up the flat fills so grass/asphalt read as material */
      var NOISE_TEX = (function () {
        var n = 256, cv = document.createElement('canvas'); cv.width = cv.height = n;
        var cx = cv.getContext('2d'), img = cx.createImageData(n, n), d = img.data;
        for (var i = 0; i < n * n; i++) {
          var v = 118 + Math.random() * 74 + (Math.random() < 0.06 ? 40 : 0);
          d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
        }
        cx.putImageData(img, 0, 0);
        var tx = new THREE.CanvasTexture(cv);
        tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
        tx.repeat.set(64, 64);
        tx.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        return tx;
      })();
      scene.fog = new THREE.Fog(0x0d1f3c, 185, 425);
      var camera = new THREE.PerspectiveCamera(30, W / H, 0.5, 1600);
      var fitCam = new THREE.PerspectiveCamera(30, 1, 1, 2000);

      /* ---------- lighting ---------- */
      var hemi = new THREE.HemisphereLight(0xa8c0d2, 0x152018, 0.66);
      scene.add(hemi);
      var sun = new THREE.DirectionalLight(0xffd6a6, 2.45);
      sun.position.set(-105, 85, 95);
      sun.castShadow = true;
      sun.shadow.mapSize.set(4096, 4096);
      sun.shadow.camera.left = -92; sun.shadow.camera.right = 92;
      sun.shadow.camera.top = 92; sun.shadow.camera.bottom = -92;
      sun.shadow.camera.near = 40; sun.shadow.camera.far = 290;
      sun.shadow.bias = -0.00016;
      sun.shadow.normalBias = 0.016;
      scene.add(sun);
      var fill = new THREE.DirectionalLight(0x8fb4d2, 0.5);
      fill.position.set(80, 40, -90);
      scene.add(fill);
      var nightLift = new THREE.AmbientLight(0xc6dcef, 0);
      scene.add(nightLift);

      function makeTex(w, h, fn) {
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        var cx = cv.getContext('2d');
        fn(cx, w, h);
        var tx = new THREE.CanvasTexture(cv);
        tx.colorSpace = THREE.SRGBColorSpace;
        tx.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
        return tx;
      }
      function speckle(cx, w, h, n, a) {
        cx.save();
        for (var i = 0; i < n; i++) {
          cx.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '255,255,255,' : '0,0,0,') + (Math.random() * a).toFixed(3) + ')';
          cx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
        }
        cx.restore();
      }

      var R = 27, SX = 1.24;
      var CRICKET_TEX = makeTex(2048, 2048, function (cx, w) {
        var c = w / 2, s = w / (2 * R);
        cx.fillStyle = '#2e6637'; cx.fillRect(0, 0, w, w);
        for (var r = R; r > 0; r -= 2.6) {
          cx.beginPath(); cx.arc(c, c, r * s, 0, 6.2832);
          cx.fillStyle = (Math.round(r / 2.6) % 2) ? '#3f8a49' : '#367a40';
          cx.fill();
        }
        speckle(cx, w, w, 90000, 0.16);
        cx.strokeStyle = 'rgba(238,243,236,.92)'; cx.lineWidth = 0.22 * s;
        cx.beginPath(); cx.arc(c, c, 15 * s, 0, 6.2832); cx.stroke();
        cx.strokeStyle = '#eef3ec'; cx.lineWidth = 0.34 * s;
        cx.beginPath(); cx.arc(c, c, (R - 0.9) * s, 0, 6.2832); cx.stroke();
        var pw = (20.1 / SX) * s, ph = 3.4 * s;
        var grd = cx.createLinearGradient(0, c - ph / 2, 0, c + ph / 2);
        grd.addColorStop(0, '#c2a87c'); grd.addColorStop(0.5, '#d3bc92'); grd.addColorStop(1, '#c2a87c');
        cx.fillStyle = grd; cx.fillRect(c - pw / 2, c - ph / 2, pw, ph);
        speckle(cx, w, w, 0, 0);
        cx.save(); cx.beginPath(); cx.rect(c - pw / 2, c - ph / 2, pw, ph); cx.clip();
        speckle(cx, w, w, 24000, 0.1); cx.restore();
        cx.strokeStyle = 'rgba(250,250,245,.95)'; cx.lineWidth = 0.11 * s;
        [-8.8, -6.5, 6.5, 8.8].forEach(function (o) {
          var x = c + (o / SX) * s;
          cx.beginPath(); cx.moveTo(x, c - ph / 2); cx.lineTo(x, c + ph / 2); cx.stroke();
        });
        [-9, 9].forEach(function (o) {
          var x = c + (o / SX) * s;
          cx.beginPath(); cx.moveTo(x - 1.3 * s / SX, c - ph / 2); cx.lineTo(x + 1.3 * s / SX, c - ph / 2); cx.stroke();
          cx.beginPath(); cx.moveTo(x - 1.3 * s / SX, c + ph / 2); cx.lineTo(x + 1.3 * s / SX, c + ph / 2); cx.stroke();
        });
      });

      function hardCourt(bg, cw, ch, lines) {
        return makeTex(768, Math.round(768 * ch / cw), function (cx, w, h) {
          var s = w / cw;
          cx.fillStyle = bg; cx.fillRect(0, 0, w, h);
          for (var i = 0; i < 700; i++) {
            cx.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.05).toFixed(3) + ')';
            cx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
          }
          speckle(cx, w, h, 26000, 0.085);
          cx.strokeStyle = '#f2f6f0'; cx.lineJoin = 'miter';
          lines.forEach(function (L) {
            cx.lineWidth = L[4] * s;
            cx.beginPath();
            cx.moveTo(w / 2 + L[0] * s, h / 2 + L[1] * s);
            cx.lineTo(w / 2 + L[2] * s, h / 2 + L[3] * s);
            cx.stroke();
          });
        });
      }
      function rectLines(hw, hh, t) {
        return [[-hw, -hh, hw, -hh, t], [-hw, hh, hw, hh, t], [-hw, -hh, -hw, hh, t], [hw, -hh, hw, hh, t]];
      }
      /* Court textures removed — cricket-only campus */

      /* ---------- palette ---------- */
      var PAL = {
        grass:      { color: 0x3d8347, roughness: 0.98 },
        grassDark:  { color: 0x2e6637, roughness: 0.98 },
        grassLight: { color: 0x4a9a53, roughness: 0.98 },
        turf:       { color: 0x3e8b53, roughness: 0.92 },
        pitch:      { color: 0xcdb489, roughness: 0.95 },
        courtTeal:  { color: 0x1a4a6e, roughness: 0.85 },
        line:       { color: 0xeef3ec, roughness: 0.7 },
        concrete:   { color: 0x585f68, roughness: 0.94 },
        concreteLt: { color: 0x7c828b, roughness: 0.9 },
        asphalt:    { color: 0x2a2f34, roughness: 0.98 },
        metal:      { color: 0x181c20, roughness: 0.45, metalness: 0.7 },
        metalLt:    { color: 0x3a4147, roughness: 0.4, metalness: 0.6 },
        wall:       { color: 0x9aa0a3, roughness: 0.85 },
        wallDark:   { color: 0x0d1a2e, roughness: 0.8 },
        glassLit:   { color: 0x15242b, roughness: 0.14, metalness: 0.7, emissive: 0x7ab8ff, emissiveIntensity: 0 },
        lamp:       { color: 0x2a3036, roughness: 0.4, metalness: 0.5, emissive: 0xfff3d6, emissiveIntensity: 0 },
        accent:     { color: 0x0a1628, roughness: 0.5, emissive: 0x4da8da, emissiveIntensity: 0.55 },
        accentDim:  { color: 0x4da8da, roughness: 0.6 },
        net:        { color: 0xc9d4cd, roughness: 1, transparent: true, opacity: 0.16, side: 2 },
        netTop:     { color: 0xeef3ec, roughness: 0.8 },
        foliage:    { color: 0x2a6338, roughness: 1 },
        foliage2:   { color: 0x357342, roughness: 1 },
        trunk:      { color: 0x33281f, roughness: 1 },
        person:     { color: 0x161c20, roughness: 0.85 },
        carA:       { color: 0x2b3136, roughness: 0.35, metalness: 0.5 },
        carB:       { color: 0x6d7378, roughness: 0.35, metalness: 0.5 },
        carC:       { color: 0x1a3c6e, roughness: 0.35, metalness: 0.5 },
        screen:     { color: 0x07100a, roughness: 0.5, emissive: 0x4da8da, emissiveIntensity: 0 },
        fieldTex:   { color: 0xffffff, roughness: 0.97, map: CRICKET_TEX },
        roofMetal:  { color: 0x3a4550, roughness: 0.5, metalness: 0.6 }
      };

      var DIM = new THREE.Color(0x0a1014);
      var zones = {};
      function zone(key) {
        var g = new THREE.Group(); g.name = key; scene.add(g);
        var z = { key: key, group: g, mats: {}, dim: 0, dimTarget: 0, lit: [] };
        zones[key] = z; return z;
      }
      function zmat(z, key) {
        if (z.mats[key]) return z.mats[key];
        var p = PAL[key], o = {};
        for (var k in p) o[k] = p[k];
        if (o.side === 2) o.side = THREE.DoubleSide;
        var m = new THREE.MeshStandardMaterial(o);
        if (/^(grass|grassDark|grassLight|turf|pitch|concrete|concreteLt|asphalt|court)/.test(key)) {
          m.roughnessMap = NOISE_TEX;
          m.bumpMap = NOISE_TEX;
          m.bumpScale = /grass|turf/.test(key) ? 0.05 : 0.02;
        }
        if (/^(wall|metal|glass|car)/.test(key)) m.envMapIntensity = 1.15;
        m.name = z.key + ':' + key;
        m.userData.base = m.color.clone();
        m.userData.baseOpacity = m.opacity;
        m.userData.baseEmissive = m.emissiveIntensity;
        m.userData.night = /lamp|glassLit|screen/.test(key);
        z.mats[key] = m; return m;
      }
      function part(z, geo, key, x, y, zz, o) {
        o = o || {};
        var m = new THREE.Mesh(geo, zmat(z, key));
        m.position.set(x, y, zz);
        if (o.ry) m.rotation.y = o.ry;
        if (o.rx) m.rotation.x = o.rx;
        if (o.rz) m.rotation.z = o.rz;
        m.castShadow = o.cast !== false;
        m.receiveShadow = o.recv !== false;
        (o.parent || z.group).add(m);
        return m;
      }
      var BOX_CACHE = {};
      var B = function (w, h, d) {
        var b = Math.min(0.055, w / 7, h / 7, d / 7);
        if (b < 0.014) return new THREE.BoxGeometry(w, h, d);
        var k = w.toFixed(3) + '_' + h.toFixed(3) + '_' + d.toFixed(3);
        if (BOX_CACHE[k]) return BOX_CACHE[k];
        var iw = w / 2 - b, ih = h / 2 - b, dep = Math.max(d - 2 * b, 0.001);
        var sh = new THREE.Shape();
        sh.moveTo(-iw, -ih); sh.lineTo(iw, -ih); sh.lineTo(iw, ih); sh.lineTo(-iw, ih); sh.closePath();
        var geo = new THREE.ExtrudeGeometry(sh, {
          depth: dep, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelOffset: 0, bevelSegments: 2, curveSegments: 1
        });
        geo.translate(0, 0, -dep / 2);
        geo.computeVertexNormals();
        BOX_CACHE[k] = geo;
        return geo;
      };
      var CY_CACHE = {};
      var CY = function (r1, r2, h, s) {
        s = s || 16;
        var k = r1 + '|' + r2 + '|' + h + '|' + s;
        return CY_CACHE[k] || (CY_CACHE[k] = new THREE.CylinderGeometry(r1, r2, h, s));
      };

      function lineRect(z, w, d, x, y, zz, t) {
        t = t || 0.14;
        var g = new THREE.Group(); g.position.set(x, y, zz); z.group.add(g);
        part(z, B(w, 0.04, t), 'line', 0, 0, -d / 2, { parent: g, cast: false });
        part(z, B(w, 0.04, t), 'line', 0, 0, d / 2, { parent: g, cast: false });
        part(z, B(t, 0.04, d), 'line', -w / 2, 0, 0, { parent: g, cast: false });
        part(z, B(t, 0.04, d), 'line', w / 2, 0, 0, { parent: g, cast: false });
        return g;
      }
      /* People and trees are recorded, then merged into InstancedMeshes per zone
         (buildInstances) — ~280 draw calls collapse to ~14. */
      function person(z, x, zz, ry, s) {
        (z.ppl || (z.ppl = [])).push([x, zz, ry || 0, s || 1]);
      }
      function tree(z, x, zz, s) {
        (z.trees || (z.trees = [])).push([x, zz, Math.random() * 3.14, s || 1, Math.random() > 0.5 ? 0 : 1]);
      }
      var PPL_GEO = null, TREE_GEO = null;
      function instSet(z, geo, matKey, list, local, lscale) {
        var im = new THREE.InstancedMesh(geo, zmat(z, matKey), list.length);
        im.castShadow = true; im.receiveShadow = false;
        var m = new THREE.Matrix4(), lm = new THREE.Matrix4(), q = new THREE.Quaternion();
        var pos = new THREE.Vector3(), scl = new THREE.Vector3();
        lm.compose(local, new THREE.Quaternion(), lscale || new THREE.Vector3(1, 1, 1));
        for (var i = 0; i < list.length; i++) {
          var e = list[i];
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), e[2]);
          pos.set(e[0], 0, e[1]); scl.setScalar(e[3]);
          m.compose(pos, q, scl).multiply(lm);
          im.setMatrixAt(i, m);
        }
        im.instanceMatrix.needsUpdate = true;
        im.frustumCulled = false;
        z.group.add(im);
        return im;
      }
      function buildInstances(z) {
        if (z.ppl && z.ppl.length) {
          if (!PPL_GEO) PPL_GEO = [
            new THREE.CapsuleGeometry(0.2, 0.72, 3, 9),
            new THREE.SphereGeometry(0.16, 10, 8),
            B(0.46, 0.62, 0.22)
          ];
          instSet(z, PPL_GEO[0], 'person', z.ppl, new THREE.Vector3(0, 0.78, 0));
          instSet(z, PPL_GEO[1], 'person', z.ppl, new THREE.Vector3(0, 1.42, 0));
          instSet(z, PPL_GEO[2], 'person', z.ppl, new THREE.Vector3(0, 0.32, 0));
        }
        if (z.trees && z.trees.length) {
          if (!TREE_GEO) TREE_GEO = [
            CY(0.16, 0.24, 1.9, 7),
            new THREE.IcosahedronGeometry(1.55, 0),
            new THREE.IcosahedronGeometry(1.05, 0)
          ];
          var a = z.trees.filter(function (t) { return t[4] === 0; });
          var b = z.trees.filter(function (t) { return t[4] === 1; });
          instSet(z, TREE_GEO[0], 'trunk', z.trees, new THREE.Vector3(0, 0.95, 0));
          if (a.length) instSet(z, TREE_GEO[1], 'foliage', a, new THREE.Vector3(0, 2.9, 0), new THREE.Vector3(1, 0.85, 1));
          if (b.length) instSet(z, TREE_GEO[1], 'foliage2', b, new THREE.Vector3(0, 2.9, 0), new THREE.Vector3(1, 0.85, 1));
          instSet(z, TREE_GEO[2], 'foliage2', z.trees, new THREE.Vector3(0.5, 3.9, -0.3));
        }
      }
      function personMesh(z, x, zz, ry, s) {
        s = s || 1;
        var g = new THREE.Group(); g.position.set(x, 0, zz); g.rotation.y = ry || 0; g.scale.setScalar(s); z.group.add(g);
        part(z, new THREE.CapsuleGeometry(0.2, 0.72, 4, 10), 'person', 0, 0.78, 0, { parent: g, recv: false });
        part(z, new THREE.SphereGeometry(0.16, 12, 10), 'person', 0, 1.42, 0, { parent: g, recv: false });
        part(z, B(0.46, 0.62, 0.22), 'person', 0, 0.32, 0, { parent: g, recv: false });
        return g;
      }
      function treeMesh(z, x, zz, s) {
        s = s || 1;
        var g = new THREE.Group(); g.position.set(x, 0, zz); g.scale.setScalar(s);
        g.rotation.y = Math.random() * 3.14; z.group.add(g);
        part(z, CY(0.16, 0.24, 1.9, 8), 'trunk', 0, 0.95, 0, { parent: g });
        var f = part(z, new THREE.IcosahedronGeometry(1.55, 0), Math.random() > 0.5 ? 'foliage' : 'foliage2', 0, 2.9, 0, { parent: g });
        f.scale.set(1, 0.85, 1);
        part(z, new THREE.IcosahedronGeometry(1.05, 0), 'foliage2', 0.5, 3.9, -0.3, { parent: g });
        return g;
      }
      var POOL_TEX = (function () {
        var cv = document.createElement('canvas'); cv.width = cv.height = 128;
        var cx2 = cv.getContext('2d');
        var rg = cx2.createRadialGradient(64, 64, 0, 64, 64, 64);
        rg.addColorStop(0, 'rgba(255,241,210,1)');
        rg.addColorStop(0.45, 'rgba(255,237,198,0.5)');
        rg.addColorStop(0.78, 'rgba(255,233,190,0.14)');
        rg.addColorStop(1, 'rgba(255,233,190,0)');
        cx2.fillStyle = rg; cx2.fillRect(0, 0, 128, 128);
        var t2 = new THREE.CanvasTexture(cv);
        t2.colorSpace = THREE.SRGBColorSpace;
        return t2;
      })();
      /* Chamfered box — real buildings have a bevel that catches light; a raw
         BoxGeometry edge is what made the massing read as flat and toy-like. */
      var rbCache = {};
      function RB(w, h, d, r) {
        r = Math.min(r === undefined ? 0.22 : r, w / 2 - 0.02, d / 2 - 0.02);
        var key = w + '|' + h + '|' + d + '|' + r;
        if (rbCache[key]) return rbCache[key];
        var bev = Math.min(0.11, h / 4, r * 0.75);
        var sw = w - bev * 2, sd = d - bev * 2, sr = Math.max(0.02, r - bev);
        var s = new THREE.Shape(), x0 = -sw / 2, y0 = -sd / 2;
        s.moveTo(x0 + sr, y0);
        s.lineTo(x0 + sw - sr, y0);
        s.quadraticCurveTo(x0 + sw, y0, x0 + sw, y0 + sr);
        s.lineTo(x0 + sw, y0 + sd - sr);
        s.quadraticCurveTo(x0 + sw, y0 + sd, x0 + sw - sr, y0 + sd);
        s.lineTo(x0 + sr, y0 + sd);
        s.quadraticCurveTo(x0, y0 + sd, x0, y0 + sd - sr);
        s.lineTo(x0, y0 + sr);
        s.quadraticCurveTo(x0, y0, x0 + sr, y0);
        var g = new THREE.ExtrudeGeometry(s, {
          depth: h - bev * 2, bevelEnabled: true, bevelSize: bev,
          bevelThickness: bev, bevelSegments: 2, curveSegments: 5, steps: 1
        });
        g.rotateX(-Math.PI / 2);
        g.translate(0, bev - h / 2, 0);
        g.computeVertexNormals();
        rbCache[key] = g;
        return g;
      }

      /* Mast aimed at (tx,tz), carrying a REAL spotlight. The old version faked the
         throw with a stack of additive discs, which is what shimmered and blotched. */
      function floodlight(z, x, zz, tx, tz, h, poolR) {
        h = h || 17;
        if (!z.spots) z.spots = [];
        var dx = tx - x, dz = tz - zz;
        var ry = Math.atan2(dx, dz) + Math.PI;   // mast local -Z points at the target
        var flat = Math.sqrt(dx * dx + dz * dz);
        var pitch = Math.atan2(h - 1.5, flat);
        var g = new THREE.Group(); g.position.set(x, 0, zz); g.rotation.y = ry; z.group.add(g);
        part(z, RB(1.7, 0.45, 1.7, 0.14), 'concrete', 0, 0.22, 0, { parent: g });
        part(z, CY(0.24, 0.42, h, 14), 'metal', 0, h / 2, 0, { parent: g });
        part(z, B(0.18, 0.18, 1.4), 'metal', 0, h - 0.9, -0.65, { parent: g });
        var head = new THREE.Group();
        head.position.set(0, h + 0.5, -0.55);
        head.rotation.x = -(Math.PI / 2 - pitch);
        g.add(head);
        part(z, RB(4.4, 1.6, 0.6, 0.16), 'metal', 0, 0, 0, { parent: head });
        z.lit.push(part(z, B(4.05, 1.25, 0.14), 'lamp', 0, 0, -0.34, { parent: head, cast: false }));

        var glare = new THREE.Sprite(new THREE.SpriteMaterial({
          map: POOL_TEX, color: 0xffe9c0, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false, fog: false
        }));
        glare.scale.set(7, 7, 1);
        glare.position.set(x - Math.sin(ry) * 0.55, h + 0.5, zz - Math.cos(ry) * 0.55);
        glare.renderOrder = 4;
        z.group.add(glare); z.lit.push(glare);

        var thrown = Math.sqrt(flat * flat + h * h);
        var reach = poolR || Math.max(13, flat * 0.7);
        var sp = new THREE.SpotLight(0xffe4b8, 0, thrown * 1.75, 0.4, 0.88, 2);
        sp.position.set(x, h + 0.4, zz);
        sp.target.position.set(tx, 0, tz);
        sp.angle = Math.min(0.6, Math.atan(reach / thrown) + 0.08);
        sp.userData.base = 1.75 * thrown * thrown;
        z.group.add(sp); z.group.add(sp.target); z.spots.push(sp);
        return g;
      }

      /* ================= GROUND · WALL · ROADS ================= */
      var site = zone('site');
      part(site, new THREE.BoxGeometry(430, 1.2, 400), 'grassDark', 0, -0.62, 0, { cast: false });
      part(site, new THREE.BoxGeometry(162, 0.2, 152), 'grass', 1, -0.02, 6, { cast: false });

      (function () {
        var w = 158, d = 148, cx = 1, cz = 6;
        [[cx, cz - d / 2, w, 0], [cx - w / 2, cz, d, Math.PI / 2], [cx + w / 2, cz, d, Math.PI / 2]].forEach(function (s) {
          part(site, B(s[2], 2, 0.5), 'wallDark', s[0], 1, s[1], { ry: s[3] });
          part(site, B(s[2], 0.14, 0.62), 'metalLt', s[0], 2.05, s[1], { ry: s[3], cast: false });
        });
        [[-44.5, 67], [46.5, 67]].forEach(function (s) { // south wall, split for the gate
          part(site, B(s[1], 2, 0.5), 'wallDark', s[0], 1, cz + d / 2);
          part(site, B(s[1], 0.14, 0.62), 'metalLt', s[0], 2.05, cz + d / 2, { cast: false });
        });
        [[cx - w / 2, cz - d / 2], [cx + w / 2, cz - d / 2], [cx - w / 2, cz + d / 2], [cx + w / 2, cz + d / 2]].forEach(function (c3) {
          part(site, RB(1.3, 2.6, 1.3, 0.22), 'wallDark', c3[0], 1.3, c3[1]);
        });
      })();

      // drive: gate → cross road → east perimeter → building forecourt
      part(site, B(12, 0.12, 34), 'asphalt', 0, 0.05, 63, { cast: false });
      part(site, B(132, 0.12, 10), 'asphalt', 2, 0.05, 56, { cast: false });
      part(site, B(10, 0.12, 112), 'asphalt', 66, 0.05, 1, { cast: false });
      part(site, B(70, 0.12, 9), 'asphalt', 34, 0.05, -40, { cast: false });
      for (var i = 0; i < 7; i++) part(site, B(0.3, 0.04, 2.4), 'line', 0, 0.12, 50 + i * 4.8, { cast: false });
      for (var i2 = 0; i2 < 11; i2++) part(site, B(0.3, 0.04, 2.4), 'line', 66, 0.12, -34 + i2 * 8, { cast: false });
      // plaza in front of the building + connecting walks
      part(site, B(46, 0.1, 9), 'concreteLt', 2, 0.08, -38, { cast: false });
      part(site, B(3.4, 0.1, 26), 'concreteLt', -30, 0.08, -42, { cast: false });
      part(site, B(3.4, 0.1, 22), 'concreteLt', -30, 0.08, 45, { cast: false });
      part(site, B(3.4, 0.1, 22), 'concreteLt', 24, 0.08, 45, { cast: false });
      part(site, B(3.4, 0.1, 20), 'concreteLt', -13, 0.08, 46, { cast: false });
      part(site, B(56, 0.1, 3.4), 'concreteLt', -28, 0.08, 34, { cast: false });
      part(site, B(48, 0.1, 3.4), 'concreteLt', 32, 0.08, 34, { cast: false });

      [[-72, 62], [-72, 44], [-73, 22], [-73, 0], [-72, -22], [-72, -44], [-70, -60], [-56, -63], [-38, -64],
       [-20, -63], [24, -64], [40, -63], [58, -62], [74, -44], [75, -20], [74, 4], [74, 28], [73, 48],
       [60, 70], [40, 72], [18, 71], [-16, 71], [-38, 70], [-58, 68], [-60, 12], [62, 14], [-60, -22], [60, -24],
       [-64, -6], [66, 40], [-52, 60], [52, -70]].forEach(function (p, i) {
        tree(site, p[0], p[1], 0.78 + (i % 4) * 0.14);
      });

      /* ================= ENTRANCE · PARKING ================= */
      var ent = zone('entrance');
      var gz = 80;
      part(ent, RB(2.6, 7, 2.6, 0.34), 'wallDark', -8, 3.5, gz);
      part(ent, RB(2.6, 7, 2.6, 0.34), 'wallDark', 8, 3.5, gz);
      part(ent, B(19, 1.6, 1.6), 'metal', 0, 7.4, gz);
      ent.lit.push(part(ent, B(12, 1, 0.26), 'accent', 0, 7.4, gz - 0.9, { cast: false }));
      part(ent, RB(4.4, 3.2, 3.6, 0.36), 'wall', 13, 1.6, gz - 1);
      part(ent, B(4.8, 0.26, 4), 'metalLt', 13, 3.3, gz - 1);
      ent.lit.push(part(ent, B(0.1, 1.5, 2.8), 'glassLit', 10.75, 1.9, gz - 1, { cast: false }));
      part(ent, B(32, 0.14, 15), 'asphalt', 38, 0.06, 66, { cast: false });
      for (var p = 0; p < 10; p++) {
        part(ent, B(0.16, 0.04, 5.6), 'line', 24 + p * 3.1, 0.14, 62.6, { cast: false });
        part(ent, B(0.16, 0.04, 5.6), 'line', 24 + p * 3.1, 0.14, 69.6, { cast: false });
      }
      var carKeys = ['carA', 'carB', 'carA', 'carC', 'carB', 'carA', 'carB', 'carA'];
      [[25.5, 62.8], [28.6, 62.8], [34.8, 62.8], [41, 62.8], [47.2, 62.8], [28.6, 69.4], [37.9, 69.4], [44.1, 69.4]].forEach(function (c, i) {
        part(ent, RB(2.0, 0.78, 4.5, 0.44), carKeys[i], c[0], 0.5, c[1]);
        part(ent, RB(1.8, 0.62, 2.4, 0.4), carKeys[i], c[0], 1.16, c[1] + 0.1);
      });
      [6, 10, 14].forEach(function (x, i) {
        part(ent, CY(0.1, 0.12, 9.5, 8), 'metalLt', x, 4.75, gz - 9);
        part(ent, B(0.1, 1.6, 2.5), i === 1 ? 'accentDim' : 'line', x + 0.05, 8.6, gz - 7.8, { recv: false });
      });
      person(ent, 3, gz - 5, 0.3); person(ent, 5.4, gz - 6.4, 2.6); person(ent, 20, 60, 1.2);

      /* ================= ACADEMY BUILDING ================= */
      var bld = zone('coaching');
      var bx = 2, bz = -52;
      part(bld, B(34, 0.4, 20), 'concreteLt', bx, 0.2, bz, { cast: false });
      part(bld, RB(28, 4.3, 14, 0.55), 'wall', bx, 2.35, bz);
      part(bld, B(28.4, 0.36, 14.4), 'wallDark', bx, 4.66, bz);
      part(bld, RB(22, 3.9, 13, 0.5), 'wallDark', bx + 1.8, 6.8, bz - 0.3);
      part(bld, B(22.4, 0.4, 13.4), 'concreteLt', bx + 1.8, 8.9, bz - 0.3, { cast: false });
      bld.lit.push(part(bld, B(27.4, 2.3, 14.4), 'glassLit', bx, 2.65, bz, { cast: false }));
      bld.lit.push(part(bld, B(21.4, 2.2, 13.4), 'glassLit', bx + 1.8, 6.9, bz - 0.3, { cast: false }));
      for (var m = -6; m <= 6; m++) part(bld, B(0.22, 2.5, 14.6), 'metal', bx + m * 2.2, 2.65, bz, { cast: false });
      for (var m2 = -4; m2 <= 4; m2++) part(bld, B(0.22, 2.4, 13.6), 'metal', bx + 1.8 + m2 * 2.4, 6.9, bz - 0.3, { cast: false });
      part(bld, B(13, 0.32, 5), 'metalLt', bx - 3, 4.2, bz + 9.4);
      part(bld, CY(0.14, 0.14, 4, 8), 'metal', bx - 8.9, 2.05, bz + 11.5);
      part(bld, CY(0.14, 0.14, 4, 8), 'metal', bx + 2.9, 2.05, bz + 11.5);
      part(bld, B(10, 0.22, 3.6), 'concreteLt', bx - 3, 0.11, bz + 9.8, { cast: false });
      bld.lit.push(part(bld, B(10.5, 1.2, 0.3), 'accent', bx + 1.8, 7, bz + 6.4, { cast: false }));
      part(bld, RB(4.8, 1.3, 3.4, 0.22), 'metalLt', bx + 8, 9.65, bz - 3);
      part(bld, RB(2.4, 0.95, 2.4, 0.2), 'metal', bx - 9, 9.48, bz + 2);
      person(bld, bx - 4, bz + 12, 3.0); person(bld, bx - 1.5, bz + 12.8, 0.2); person(bld, bx + 6, bz + 11, 2.4);

      /* ================= CRICKET (ground + nets) ================= */
      var ck = zone('ground');
      var cX = 0, cZ = -2, R = 27, SX = 1.24;
      var outfield = new THREE.Mesh(new THREE.CircleGeometry(R, 96), zmat(ck, 'fieldTex'));
      outfield.rotation.x = -Math.PI / 2; outfield.position.set(cX, 0.14, cZ);
      outfield.scale.set(SX, 1, 1); outfield.receiveShadow = true; ck.group.add(outfield);
      [[-9, 9]].forEach(function () {});
      [-9, 9].forEach(function (o) {
        for (var s = -1; s <= 1; s++) part(ck, CY(0.04, 0.04, 0.72, 6), 'line', cX + o, 0.45, cZ + s * 0.13, { recv: false });
        part(ck, B(0.32, 0.05, 0.06), 'line', cX + o, 0.83, cZ, { recv: false });
      });
      [[-11.5, 0.6, 1.5], [10.5, -0.8, -1.5], [9, 2.4, 1.2], [-2, 11, 3], [7, -13, 0.5], [-15, -9, 2],
       [17, 10, 4], [-7, -17, 1], [22, -4, 1.8], [-24, 6, 4.4]].forEach(function (q) {
        person(ck, cX + q[0], cZ + q[1], q[2]);
      });
      // pavilion (west side, facing the pitch)
      var pv = new THREE.Group(); pv.position.set(cX - 42, 0, cZ); pv.rotation.y = Math.PI / 2; ck.group.add(pv);
      part(ck, B(26, 0.35, 9), 'concreteLt', 0, 0.17, 0, { parent: pv, cast: false });
      part(ck, RB(23, 3.4, 6, 0.42), 'wall', 0, 1.85, 1.4, { parent: pv });
      ck.lit.push(part(ck, B(22.4, 1.6, 6.2), 'glassLit', 0, 2.25, 1.4, { parent: pv, cast: false }));
      part(ck, B(25, 0.32, 9.4), 'metalLt', 0, 3.7, 0.6, { parent: pv });
      part(ck, CY(0.12, 0.12, 3.5, 8), 'metal', -11, 1.9, -3.6, { parent: pv });
      part(ck, CY(0.12, 0.12, 3.5, 8), 'metal', 11, 1.9, -3.6, { parent: pv });
      for (var t = 0; t < 3; t++) part(ck, B(23, 0.45, 1.6), 'concrete', 0, 0.35 + t * 0.45, -2.6 - t * 1.6, { parent: pv, cast: false });
      for (var pp = 0; pp < 8; pp++) person(ck, cX - 45.5 - (pp % 3) * 1.6, cZ - 9 + pp * 2.7, 1.57, 0.95);
      // scoreboard (north-east of the ground)
      var sb = new THREE.Group(); sb.position.set(cX + 26, 0, cZ - 31); sb.rotation.y = -0.5; ck.group.add(sb);
      part(ck, CY(0.3, 0.3, 4.8, 8), 'metal', -3.2, 2.4, 0, { parent: sb });
      part(ck, CY(0.3, 0.3, 4.8, 8), 'metal', 3.2, 2.4, 0, { parent: sb });
      part(ck, RB(9.4, 4.6, 0.55, 0.2), 'wallDark', 0, 7, 0, { parent: sb });
      ck.lit.push(part(ck, B(8.4, 3.7, 0.24), 'screen', 0, 7, 0.35, { parent: sb, cast: false }));
      floodlight(ck, cX - 32, cZ - 30, cX - 9, cZ - 8, 19, 23);
      floodlight(ck, cX + 32, cZ - 30, cX + 9, cZ - 8, 19, 23);
      floodlight(ck, cX - 32, cZ + 26, cX - 9, cZ + 7, 19, 23);
      floodlight(ck, cX + 32, cZ + 26, cX + 9, cZ + 7, 19, 23);
      

      

      /* ================= PRACTICE NETS — left side ================= */
      var nt = zone('nets');
      var ntX = -44;

      /* Indoor Hall — 5 wicket indoor cricket facility */
      var ihZ = -38;
      part(nt, B(30, 0.35, 16), 'concreteLt', ntX, 0.17, ihZ, { cast: false });
      part(nt, RB(28, 7, 14, 0.5), 'wallDark', ntX, 3.7, ihZ);
      part(nt, B(28.8, 0.5, 14.8), 'roofMetal', ntX, 7.4, ihZ);
      nt.lit.push(part(nt, B(26, 4, 0.24), 'glassLit', ntX, 3.8, ihZ + 7.2, { cast: false }));
      for (var wk = 0; wk < 4; wk++) {
        part(nt, B(0.08, 4.5, 12), 'net', ntX - 10 + wk * 5.75, 2.5, ihZ, { cast: false, recv: false }).renderOrder = 1;
      }
      nt.lit.push(part(nt, B(27, 0.8, 0.24), 'accent', ntX, 7.1, ihZ + 7.3, { cast: false }));
      person(nt, ntX - 6, ihZ + 9, 0.2, 0.95);
      person(nt, ntX + 4, ihZ + 9, 0.4, 0.95);

      /* 20 outdoor nets — Block A (10 lanes) */
      var nStartA = -18;
      part(nt, B(31, 0.16, 38), 'grassDark', ntX, 0.07, nStartA + 17, { cast: false });
      for (var ln = 0; ln < 10; ln++) {
        var z0 = nStartA + ln * 3.6;
        part(nt, B(22, 0.06, 3.2), 'pitch', ntX, 0.13, z0, { cast: false });
        [-1.6, 1.6].forEach(function (off) {
          part(nt, B(22, 3.4, 0.06), 'net', ntX, 1.8, z0 + off, { cast: false, recv: false }).renderOrder = 1;
        });
        part(nt, B(0.06, 3.4, 3.2), 'net', ntX - 11, 1.8, z0, { cast: false, recv: false }).renderOrder = 1;
        part(nt, B(22, 0.06, 3.2), 'net', ntX, 3.5, z0, { cast: false, recv: false }).renderOrder = 1;
        for (var po = -11; po <= 11.1; po += 5.5) {
          part(nt, CY(0.07, 0.07, 3.6, 6), 'metalLt', ntX + po, 1.8, z0 - 1.6, { recv: false });
          part(nt, CY(0.07, 0.07, 3.6, 6), 'metalLt', ntX + po, 1.8, z0 + 1.6, { recv: false });
        }
        for (var s2 = -1; s2 <= 1; s2++) part(nt, CY(0.04, 0.04, 0.72, 6), 'line', ntX - 9, 0.5, z0 + s2 * 0.13, { recv: false });
        if (ln % 3 === 0) { person(nt, ntX - 8, z0, 1.57, 0.95); person(nt, ntX + 7, z0, -1.57, 0.95); }
      }

      /* 20 outdoor nets — Block B (10 lanes) */
      var nStartB = 22;
      part(nt, B(31, 0.16, 38), 'grassDark', ntX, 0.07, nStartB + 17, { cast: false });
      for (var ln2 = 0; ln2 < 10; ln2++) {
        var z1 = nStartB + ln2 * 3.6;
        part(nt, B(22, 0.06, 3.2), 'pitch', ntX, 0.13, z1, { cast: false });
        [-1.6, 1.6].forEach(function (off) {
          part(nt, B(22, 3.4, 0.06), 'net', ntX, 1.8, z1 + off, { cast: false, recv: false }).renderOrder = 1;
        });
        part(nt, B(0.06, 3.4, 3.2), 'net', ntX - 11, 1.8, z1, { cast: false, recv: false }).renderOrder = 1;
        part(nt, B(22, 0.06, 3.2), 'net', ntX, 3.5, z1, { cast: false, recv: false }).renderOrder = 1;
        for (var po2 = -11; po2 <= 11.1; po2 += 5.5) {
          part(nt, CY(0.07, 0.07, 3.6, 6), 'metalLt', ntX + po2, 1.8, z1 - 1.6, { recv: false });
          part(nt, CY(0.07, 0.07, 3.6, 6), 'metalLt', ntX + po2, 1.8, z1 + 1.6, { recv: false });
        }
        for (var s3 = -1; s3 <= 1; s3++) part(nt, CY(0.04, 0.04, 0.72, 6), 'line', ntX - 9, 0.5, z1 + s3 * 0.13, { recv: false });
        if (ln2 % 3 === 0) { person(nt, ntX - 8, z1, 1.57, 0.95); person(nt, ntX + 7, z1, -1.57, 0.95); }
      }

      /* Bowling machine area between blocks */
      part(nt, B(3.2, 0.5, 1.1), 'metalLt', ntX + 2, 0.4, 20);
      part(nt, B(0.9, 0.85, 1.3), 'metalLt', ntX + 10.5, 0.55, 20);

      floodlight(nt, ntX + 16.5, -15, ntX, 0, 15, 18);
      floodlight(nt, ntX - 16.5, -15, ntX, 0, 15, 18);
      floodlight(nt, ntX + 16.5, 42, ntX, 28, 15, 18);
      floodlight(nt, ntX - 16.5, 42, ntX, 28, 15, 18);
      

      /* ================= VIDEO ANALYSIS — top-right ================= */
      var va = zone('analysis');
      var aX = 48, aZ = -49;
      part(va, B(18, 0.35, 14), 'concreteLt', aX, 0.17, aZ, { cast: false });
      part(va, RB(16, 5, 12, 0.42), 'wallDark', aX, 2.7, aZ);
      part(va, B(16.4, 0.36, 12.4), 'metalLt', aX, 5.36, aZ);
      va.lit.push(part(va, B(15.4, 3.2, 0.24), 'glassLit', aX, 2.8, aZ + 6.2, { cast: false }));
      for (var mon = -2; mon <= 2; mon++) {
        va.lit.push(part(va, B(2.2, 1.6, 0.14), 'screen', aX + mon * 3, 3.2, aZ + 6, { cast: false }));
      }
      va.lit.push(part(va, B(15, 0.6, 0.2), 'accent', aX, 5, aZ + 6.3, { cast: false }));
      person(va, aX - 3, aZ + 8, 0.3, 0.95);
      person(va, aX + 2, aZ + 8, 0.1, 0.95);
      person(va, aX + 6, aZ + 7, 2.1, 0.95);
      

      /* ================= open field — bottom-right ================= */
      [[48, 28], [52, 35], [44, 42], [56, 42], [38, 48], [50, 50], [42, 55], [56, 55], [48, 60]].forEach(function (p, i) {
        tree(site, p[0], p[1], 0.78 + (i % 4) * 0.14);
      });

      /* ================= FITNESS — bottom-centre ================= */
      var ft = zone('fitness');
      var fX = 2, fZ = 40;
      part(ft, B(27, 0.16, 17), 'concrete', fX, 0.07, fZ, { cast: false });
      part(ft, B(23, 0.06, 5.4), 'courtTeal', fX, 0.16, fZ - 4.4, { cast: false });
      for (var sl = -1; sl <= 1; sl++) part(ft, B(23, 0.04, 0.1), 'line', fX, 0.21, fZ - 4.4 + sl * 1.8, { cast: false });
      part(ft, B(0.14, 0.04, 5.4), 'line', fX - 11, 0.21, fZ - 4.4, { cast: false });
      part(ft, B(0.14, 0.04, 5.4), 'line', fX + 11, 0.21, fZ - 4.4, { cast: false });
      part(ft, B(13, 0.08, 7.4), 'turf', fX - 4.5, 0.16, fZ + 3.6, { cast: false });
      var rig = new THREE.Group(); rig.position.set(fX + 7, 0, fZ + 3.4); ft.group.add(rig);
      [[-3, -1.6], [3, -1.6], [-3, 1.6], [3, 1.6]].forEach(function (c2) {
        part(ft, B(0.22, 3.2, 0.22), 'metalLt', c2[0], 1.6, c2[1], { parent: rig });
      });
      part(ft, B(6.4, 0.18, 0.18), 'metalLt', 0, 3.1, -1.6, { parent: rig });
      part(ft, B(6.4, 0.18, 0.18), 'metalLt', 0, 3.1, 1.6, { parent: rig });
      part(ft, B(0.14, 0.14, 3.4), 'metalLt', -1.2, 3.1, 0, { parent: rig });
      part(ft, B(0.14, 0.14, 3.4), 'metalLt', 1.2, 3.1, 0, { parent: rig });
      part(ft, B(2.4, 0.35, 1.2), 'metal', 0, 0.2, 0, { parent: rig, cast: false });
      [[-9.5, -4.4, 1.57], [-6, -6, 1.57], [-6.5, 3.2, 0.4], [5, 4.6, 2.4], [8.5, 1, 0.9]].forEach(function (q) {
        person(ft, fX + q[0], fZ + q[1], q[2]);
      });
      part(ft, B(1.6, 0.6, 1.6), 'metal', fX - 9.5, 0.3, fZ + 5.6, { recv: false });
      part(ft, B(1.2, 0.45, 1.2), 'metal', fX - 7.4, 0.22, fZ + 6.5, { recv: false });
      floodlight(ft, fX + 13, fZ + 8, fX, fZ - 1, 11, 11);
      floodlight(ft, fX - 13, fZ + 8, fX, fZ - 1, 11, 11);
      

      for (var zkey in zones) buildInstances(zones[zkey]);

      /* ---------- invisible hover volumes ---------- */
      var pickMat = new THREE.MeshBasicMaterial({ visible: false });
      var picks = [];
      function pick(key, w, h, d, x, y, z2) {
        var m = new THREE.Mesh(B(w, h, d), pickMat);
        m.position.set(x, y, z2); m.userData.key = key; scene.add(m); picks.push(m);
      }
      pick('ground', 68, 12, 56, cX, 6, cZ);
      pick('nets', 31, 8, 72, ntX, 4, 12);
      pick('coaching', 30, 10, 18, 2, 5, -52);
      pick('analysis', 18, 8, 14, aX, 4, aZ);
      pick('fitness', 27, 8, 17, fX, 4, fZ);

      /* ================= HOTSPOT DOM ================= */
      var hot = document.createElement('div');
      hot.style.cssText = 'position:absolute;inset:0;pointer-events:none';
      this.appendChild(hot);
      var st = document.createElement('style');
      st.textContent = '@keyframes cs-pulse{0%{box-shadow:0 0 0 0 rgba(77,168,218,.5)}70%{box-shadow:0 0 0 15px rgba(77,168,218,0)}100%{box-shadow:0 0 0 0 rgba(77,168,218,0)}}';
      hot.appendChild(st);
      var hotspots = {};
      Object.keys(SPORTS).forEach(function (k) {
        var el = document.createElement('button');
        el.type = 'button';
        el.style.cssText = 'position:absolute;transform:translate(-50%,-100%);pointer-events:auto;background:none;border:0;padding:0;cursor:pointer;opacity:0;transition:opacity .45s ease;display:flex;flex-direction:column;align-items:center';
        el.innerHTML =
          '<span data-l style="display:block;font:600 12px/1 \'Barlow Condensed\',system-ui,sans-serif;letter-spacing:.18em;color:#eef3ec;background:rgba(10,18,32,.84);border:1px solid rgba(77,168,218,.38);padding:7px 11px 6px;white-space:nowrap">' + SPORTS[k].label + '</span>' +
          '<span style="display:block;width:1px;height:24px;background:linear-gradient(180deg,rgba(77,168,218,.9),rgba(77,168,218,0))"></span>' +
          '<span style="display:block;width:9px;height:9px;margin-top:-5px;border-radius:50%;background:#4da8da;animation:cs-pulse 2.4s ease-out infinite"></span>';
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          api.setSport(state.sport === k ? null : k);
          emit('campus:select', { key: state.sport });
        });
        el.addEventListener('mouseenter', function () { state.hover = k; });
        el.addEventListener('mouseleave', function () { state.hover = null; });
        hot.appendChild(el);
        hotspots[k] = el;
      });

      /* ================= STATE / CAMERA ================= */
      var SITE = new THREE.Vector3(1, 2, 6);
      var AZ = 17 * Math.PI / 180, EL = 33 * Math.PI / 180;
      var DIR = new THREE.Vector3();
      var RIGHT = new THREE.Vector3();
      var HERO = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() };
      var GATE = { pos: new THREE.Vector3(16, 6, 116), tgt: new THREE.Vector3(0, 5.5, 82) };
      /* Camera presets — desktop is the demo target; the mobile entry exists so a
         phone composition can be tuned later without touching scene code. */
      var PRESETS = {
        desktop: { az: 17, el: 33, shift: 0.07, mx: 0.995, my: 0.965, fov: 30 },
        mobile:  { az: 8,  el: 41, shift: 0.0,  mx: 1.0,   my: 0.86,  fov: 34 }
      };
      var presetName = 'auto';
      function preset() {
        var n = presetName === 'auto' ? (camera.aspect < 0.95 ? 'mobile' : 'desktop') : presetName;
        return PRESETS[n] || PRESETS.desktop;
      }
      function applyPreset() {
        var p = preset();
        AZ = p.az * Math.PI / 180; EL = p.el * Math.PI / 180;
        DIR.set(Math.sin(AZ) * Math.cos(EL), Math.sin(EL), Math.cos(AZ) * Math.cos(EL));
        RIGHT.set(Math.cos(AZ), 0, -Math.sin(AZ));
        if (camera.fov !== p.fov) { camera.fov = p.fov; camera.updateProjectionMatrix(); }
      }
      function tanH() { return Math.tan(camera.fov * Math.PI / 360) * camera.aspect; }
      var FIT = [];
      [-79, 0.5, 80].forEach(function (x) { [-68, 7, 82].forEach(function (z2) { FIT.push(new THREE.Vector3(x, 0, z2)); }); });
      FIT.push(new THREE.Vector3(-30, 21, -32), new THREE.Vector3(30, 21, -32), new THREE.Vector3(2, 11, -52));
      var fq = new THREE.Vector3();
      function computeHero() {
        applyPreset();
        var pr = preset(), d = 280;
        for (var it = 0; it < 9; it++) {
          HERO.tgt.copy(SITE).addScaledVector(RIGHT, -pr.shift * d * tanH());
          HERO.pos.copy(HERO.tgt).addScaledVector(DIR, d);
          fitCam.fov = camera.fov; fitCam.aspect = camera.aspect;
          fitCam.position.copy(HERO.pos); fitCam.updateProjectionMatrix();
          fitCam.lookAt(HERO.tgt); fitCam.updateMatrixWorld(true);
          var mx = 0;
          for (var i3 = 0; i3 < FIT.length; i3++) {
            fq.copy(FIT[i3]).project(fitCam);
            mx = Math.max(mx, Math.abs(fq.x) / pr.mx, Math.abs(fq.y) / pr.my);
          }
          if (Math.abs(mx - 1) < 0.012) break;
          d = Math.min(Math.max(d * mx, 150), 900);
        }
      }
      var state = { sport: null, hover: null, lights: 0, intro: 0, t0: performance.now() };
      var cam = { pos: GATE.pos.clone(), tgt: GATE.tgt.clone() };
      var tween = null;

      function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
      function moveTo(pos, tgt, dur) {
        tween = { fp: cam.pos.clone(), ft: cam.tgt.clone(), tp: pos.clone(), tt: tgt.clone(), t: 0, dur: dur };
      }
      function sportView(k) {
        var s = SPORTS[k], c = new THREE.Vector3(s.anchor[0], 1.2, s.anchor[2]);
        var pts = [new THREE.Vector3(c.x, 11, c.z)];
        [-1, 1].forEach(function (sx) {
          [-1, 1].forEach(function (sz) { pts.push(new THREE.Vector3(c.x + sx * s.ext[0], 0, c.z + sz * s.ext[1])); });
        });
        var d = 80, tgt = new THREE.Vector3(), pos = new THREE.Vector3();
        for (var i4 = 0; i4 < 9; i4++) {
          tgt.copy(c).addScaledVector(RIGHT, 0.1 * d * tanH());
          pos.copy(tgt).addScaledVector(DIR, d);
          fitCam.fov = camera.fov; fitCam.aspect = camera.aspect;
          fitCam.position.copy(pos); fitCam.updateProjectionMatrix();
          fitCam.lookAt(tgt); fitCam.updateMatrixWorld(true);
          var mx = 0;
          for (var j4 = 0; j4 < pts.length; j4++) {
            fq.copy(pts[j4]).project(fitCam);
            mx = Math.max(mx, Math.abs(fq.x) / 0.9, Math.abs(fq.y) / 0.86);
          }
          if (Math.abs(mx - 1) < 0.015) break;
          d = Math.min(Math.max(d * mx, 40), 460);
        }
        return { pos: pos.clone(), tgt: tgt.clone() };
      }
      function emit(name, detail) {
        window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
        host.dispatchEvent(new CustomEvent(name, { detail: detail || {}, bubbles: true, composed: true }));
      }
      var api = {
        setPreset: function (name) {
          presetName = name || 'auto';
          computeHero();
          if (!state.sport) moveTo(HERO.pos, HERO.tgt, 900);
        },
        setSport: function (k) {
          state.sport = k || null;
          qi = Math.max(0, QUEUE.indexOf(k || null));
          if (k) { var v = sportView(k); moveTo(v.pos, v.tgt, 1600); }
          else moveTo(HERO.pos, HERO.tgt, 1700);
        },
        replayIntro: function () {
          state.intro = 0; state.sport = null; state.t0 = performance.now(); state.lights = 0; qi = 0;
          cam.pos.copy(GATE.pos); cam.tgt.copy(GATE.tgt); tween = null;
          emit('campus:introstart');
          setTimeout(function () { moveTo(HERO.pos, HERO.tgt, 4600); }, 50);
          setTimeout(function () { state.intro = 1; emit('campus:introdone'); }, 4700);
        }
      };
      this._api = api;

      var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
      renderer.domElement.addEventListener('pointermove', function (e) {
        var r = renderer.domElement.getBoundingClientRect();
        ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
        ray.setFromCamera(ndc, camera);
        var hit = ray.intersectObjects(picks, false)[0];
        state.hover = hit ? hit.object.userData.key : null;
        renderer.domElement.style.cursor = hit ? 'pointer' : 'default';
      });
      renderer.domElement.addEventListener('click', function () {
        if (state.hover) { api.setSport(state.hover === state.sport ? null : state.hover); emit('campus:select', { key: state.sport }); }
      });

      /* scroll steps through the sport queue, one facility per gesture */
      var QUEUE = [null, 'ground', 'nets', 'coaching', 'analysis', 'fitness'];
      var qi = 0, wheelLock = 0, wheelAcc = 0;
      host.addEventListener('wheel', function (e) {
        var now = performance.now();
        e.preventDefault();
        if (now < wheelLock) return;
        wheelAcc += e.deltaY;
        if (Math.abs(wheelAcc) < 40) return;
        var dir = wheelAcc > 0 ? 1 : -1;
        wheelAcc = 0;
        var next = Math.min(Math.max(qi + dir, 0), QUEUE.length - 1);
        if (next === qi) return;
        qi = next;
        wheelLock = now + 900;
        state.sport = QUEUE[qi];
        if (state.sport) { var vv = sportView(state.sport); moveTo(vv.pos, vv.tgt, 1500); }
        else moveTo(HERO.pos, HERO.tgt, 1600);
        emit('campus:select', { key: state.sport });
      }, { passive: false });

      /* ================= LOOP ================= */
      var v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), clock = new THREE.Clock();
      function frame() {
        var dt = Math.min(clock.getDelta(), 0.05);
        var el = (performance.now() - state.t0) / 1000;

        if (tween) {
          tween.t += dt * 1000;
          var k = Math.min(tween.t / tween.dur, 1), e = ease(k);
          cam.pos.lerpVectors(tween.fp, tween.tp, e);
          cam.tgt.lerpVectors(tween.ft, tween.tt, e);
          if (k >= 1) tween = null;
        }
        // once the visitor picks a facility, the camera stops drifting on its own
        var ang = (tween || state.sport) ? 0 : Math.sin(el * 0.13) * 0.016;
        v.copy(cam.pos).sub(cam.tgt).applyAxisAngle(up, ang * dt * 8);
        camera.position.copy(cam.tgt).add(v);
        cam.pos.copy(camera.position);
        camera.lookAt(cam.tgt);

        var target = Math.min(1, Math.max(0, (el - 2.2) / 2.6));
        state.lights += (target - state.lights) * Math.min(1, dt * 2.2);
        var L = state.lights;
        hemi.intensity = 0.66 - 0.06 * L;
        sun.intensity = 2.45 - 0.72 * L;
        nightLift.intensity = 0.34 * L;
        renderer.toneMappingExposure = 1.15 + 0.12 * L;

        var focus = state.sport || state.hover;
        for (var zk in zones) {
          var z = zones[zk];
          var soft = (zk === 'site' || zk === 'entrance' || zk === 'coaching') ? 0.45 : 1;
          z.dimTarget = focus ? (zk === focus ? 0 : 0.7 * soft) : 0;
          z.dim += (z.dimTarget - z.dim) * Math.min(1, dt * 5);
          var boost = (focus && zk === focus) ? 1.35 : 1;
          for (var mk in z.mats) {
            var mm = z.mats[mk];
            mm.color.copy(mm.userData.base).lerp(DIM, z.dim);
            if (mm.userData.night) {
              var bse = mm.userData.baseEmissive || 1.2;
              mm.emissiveIntensity = bse * L * (1 - z.dim * 0.85) * boost;
            } else if (mm.userData.baseEmissive) {
              mm.emissiveIntensity = mm.userData.baseEmissive * (1 - z.dim * 0.85) * boost;
            }
            if (mm.transparent && mm.userData.baseOpacity) mm.opacity = mm.userData.baseOpacity * (1 - z.dim * 0.55);
          }
          for (var li = 0; li < z.lit.length; li++) {
            var lo = z.lit[li];
            if (lo.isSprite) lo.material.opacity = 0.5 * L * (1 - z.dim * 0.9) * boost;
            else if (lo.material && lo.material.isMeshBasicMaterial) lo.material.opacity = 0.24 * L * (1 - z.dim * 0.9) * boost;
          }
          if (z.spots) for (var si = 0; si < z.spots.length; si++) {
            z.spots[si].intensity = z.spots[si].userData.base * L * (1 - z.dim * 0.9) * boost;
          }
        }

        var showHot = state.intro >= 1;
        Object.keys(SPORTS).forEach(function (k) {
          var a = SPORTS[k].anchor, el2 = hotspots[k];
          v.set(a[0], a[1], a[2]).project(camera);
          var vis = showHot && v.z < 1 && (!state.sport || state.sport === k);
          el2.style.left = ((v.x * 0.5 + 0.5) * 100) + '%';
          el2.style.top = ((-v.y * 0.5 + 0.5) * 100) + '%';
          el2.style.opacity = vis ? (state.sport === k || state.hover === k ? 1 : 0.8) : 0;
          el2.style.pointerEvents = vis ? 'auto' : 'none';
          var on = state.sport === k || state.hover === k;
          var lab = el2.querySelector('[data-l]');
          lab.style.background = on ? '#4da8da' : 'rgba(10,18,32,.84)';
          lab.style.color = on ? '#ffffff' : '#e0ecf4';
          lab.style.borderColor = on ? '#4da8da' : 'rgba(77,168,218,.38)';
        });

        renderer.render(scene, camera);
        requestAnimationFrame(frame);
      }

      new ResizeObserver(function () {
        var w = host.clientWidth || 1, h = host.clientHeight || 1;
        camera.aspect = w / h; camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        computeHero();
        if (!state.sport) {
          if (tween) { tween.tp.copy(HERO.pos); tween.tt.copy(HERO.tgt); }
          else moveTo(HERO.pos, HERO.tgt, 420);
        }
      }).observe(this);

      if (this._preset) { presetName = this._preset; this._preset = null; }
      computeHero();
      camera.position.copy(cam.pos); camera.lookAt(cam.tgt);
      frame();
      emit('campus:ready');
      moveTo(HERO.pos, HERO.tgt, 4600);
      setTimeout(function () { state.intro = 1; emit('campus:introdone'); }, 4700);
      if (this._pending) { var pnd = this._pending; this._pending = null; setTimeout(function () { api.setSport(pnd); }, 4900); }
    }
  });
})();
