/**
 * SUNFORGE – browser-based first-person spaceship game
 * Three.js r158 (global build)
 */
'use strict';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════ */
const C = {
  PLAYER_BASE_SPEED   : 120,      // units/s
  PLAYER_MAX_SPEED    : 600,
  ACCEL               : 200,
  DECEL               : 300,
  WARP_SPEED          : 4000,
  WARP_FUEL_MAX       : 100,
  WARP_DRAIN          : 18,       // /s
  WARP_REGEN          : 5,        // /s
  LOOK_SENSITIVITY    : 0.0018,
  LOOK_RETURN_SPEED   : 3.0,
  COLLECT_RANGE       : 600,
  SCAN_RANGE          : 8000,
  HIGHLIGHT_RANGE     : 12000,
  LABEL_RANGE         : 25000,
  NUM_SYSTEMS         : 28,
  STAR_COUNT          : 6000,
};

/* ═══════════════════════════════════════════════════════════
   PROCEDURAL NAME GENERATOR
═══════════════════════════════════════════════════════════ */
const NameGen = (() => {
  const pre  = ['Al','Ar','Bel','Cor','Dal','El','For','Gal','Hel','Ix',
                'Kel','Lyr','Mir','Nav','Or','Pol','Qua','Rel','Sol','Tar',
                'Ul','Vel','Vor','Xel','Yar','Zel','Cyn','Dra','Eph','Kry'];
  const mid  = ['a','ae','ai','an','ar','el','en','er','ia','ion',
                'is','ix','on','or','us','ax','ez','il','om','ur'];
  const suf  = ['a','ae','an','ar','as','el','en','er','ia','is',
                'ix','on','or','us','ax','ez','il','um','yn','os'];
  const cls  = ['Prime','Major','Minor','Alpha','Beta','Gamma','Proxima',
                'Centara','Magna','Ultima','Nova','Vega','Sigma','Omega'];
  let _seed = 42;
  const rng = () => { _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 0xFFFFFFFF; };
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  return {
    seed(s) { _seed = s >>> 0; },
    planet() {
      const p = pick(pre) + pick(mid);
      return rng() > 0.5 ? p + pick(suf) : p;
    },
    system() {
      return pick(pre) + pick(mid) + ' ' + pick(cls);
    },
  };
})();

/* ═══════════════════════════════════════════════════════════
   RESOURCES / MATERIALS
═══════════════════════════════════════════════════════════ */
const RESOURCES = {
  STONE    : { name:'Stone',         color:'#9e8e7e', tier:1 },
  IRON     : { name:'Iron',          color:'#8a9aaa', tier:1 },
  WOOD     : { name:'Wood',          color:'#7a5c3a', tier:1 },
  ICE      : { name:'Ice',           color:'#b8dff0', tier:1 },
  GOLD     : { name:'Gold',          color:'#ffd060', tier:2 },
  CRYSTAL  : { name:'Crystal',       color:'#88d8ff', tier:2 },
  TITANIUM : { name:'Titanium',      color:'#b0c4de', tier:2 },
  RARE_MIN : { name:'Rare Mineral',  color:'#d090ff', tier:3 },
  PLASMA   : { name:'Plasma Crystal',color:'#ff8aff', tier:3 },
  DARK_MAT : { name:'Dark Matter',   color:'#6060a0', tier:3 },
  SOLAR    : { name:'Solar Energy',  color:'#ffe566', tier:4 },
};

const RES_KEYS = Object.keys(RESOURCES);

/* Planet biomes and their resource pools */
const BIOMES = {
  rocky    : { color:'#7a6550', emissive:'#200c00', resources:['STONE','IRON','GOLD','RARE_MIN'],      atm:'#c08050' },
  ice      : { color:'#90c8d8', emissive:'#001828', resources:['ICE','CRYSTAL','TITANIUM'],            atm:'#a0d8f0' },
  forest   : { color:'#3a6a3a', emissive:'#0a1a05', resources:['WOOD','STONE','GOLD'],                atm:'#60c860' },
  volcanic : { color:'#4a1a10', emissive:'#300800', resources:['IRON','TITANIUM','DARK_MAT','RARE_MIN'],atm:'#ff4400' },
  gas      : { color:'#4a5580', emissive:'#050818', resources:['PLASMA','DARK_MAT','RARE_MIN'],        atm:'#8090d8' },
  ocean    : { color:'#204070', emissive:'#020810', resources:['ICE','CRYSTAL','WOOD'],               atm:'#40a8f0' },
};

const BIOME_KEYS = Object.keys(BIOMES);

/* ═══════════════════════════════════════════════════════════
   MISSION SYSTEM
═══════════════════════════════════════════════════════════ */
const MISSIONS = [
  { name:'Foundation Materials',   desc:'Gather basic building materials for initial reconstruction.',
    req:{ STONE:5 } },
  { name:'Structural Support',     desc:'Iron frames and wooden supports for habitat modules.',
    req:{ IRON:4, WOOD:4 } },
  { name:'Energy Arrays',          desc:'Crystal matrices infused with gold conductor traces.',
    req:{ CRYSTAL:5, GOLD:3 } },
  { name:'Cooling Systems',        desc:'Cryogenic coolant storage from frozen worlds.',
    req:{ ICE:6, TITANIUM:3 } },
  { name:'Rare Ore Extraction',    desc:'Subsurface rare minerals for advanced alloys.',
    req:{ RARE_MIN:5, STONE:3 } },
  { name:'Plasma Conduits',        desc:'High-energy plasma crystals for power routing.',
    req:{ PLASMA:4, TITANIUM:4 } },
  { name:'Dark Matter Core',       desc:'Exotic matter for the planetary core stabilizer.',
    req:{ DARK_MAT:5, RARE_MIN:4 } },
  { name:'Stellar Lattice',        desc:'Combine all advanced materials for the final restoration lattice.',
    req:{ CRYSTAL:6, TITANIUM:5, RARE_MIN:4, DARK_MAT:3 } },
  { name:'Dyson Harvest I',        desc:'Channel stellar energy from a constructed Dyson sphere.',
    req:{ SOLAR:3, PLASMA:5 } },
  { name:'World Restoration',      desc:'The final convergence of stellar and terrestrial energies.',
    req:{ SOLAR:6, DARK_MAT:4, RARE_MIN:4, CRYSTAL:5 } },
];

class MissionSystem {
  constructor(inventory) {
    this.inventory   = inventory;
    this.current     = 0;           // index into MISSIONS
    this.complete    = false;       // all missions done
    this.restoration = 0;           // 0-100 %
  }

  get mission() { return MISSIONS[this.current]; }

  get progress() {
    if (this.complete) return 1;
    const m = this.mission;
    let have = 0, need = 0;
    for (const [key, amt] of Object.entries(m.req)) {
      need += amt;
      have += Math.min(this.inventory[key] || 0, amt);
    }
    return need === 0 ? 1 : have / need;
  }

  canComplete() {
    if (this.complete) return false;
    const m = this.mission;
    for (const [key, amt] of Object.entries(m.req)) {
      if ((this.inventory[key] || 0) < amt) return false;
    }
    return true;
  }

  complete_mission() {
    if (!this.canComplete()) return false;
    const m = this.mission;
    for (const [key, amt] of Object.entries(m.req)) {
      this.inventory[key] = (this.inventory[key] || 0) - amt;
      if (this.inventory[key] <= 0) delete this.inventory[key];
    }
    this.restoration = Math.min(100, this.restoration + 10);
    this.current++;
    if (this.current >= MISSIONS.length) {
      this.complete     = true;
      this.restoration  = 100;
    }
    return true;
  }

  needsResource(resKey) {
    if (this.complete) return false;
    return resKey in this.mission.req;
  }
}

/* ═══════════════════════════════════════════════════════════
   GALAXY GENERATOR
═══════════════════════════════════════════════════════════ */
class Galaxy {
  constructor(scene) {
    this.scene   = scene;
    this.systems = [];
    NameGen.seed(0xDEADBEEF);
    this._generate();
    this._buildStarfield();
  }

  _generate() {
    const spread = 180000;
    for (let i = 0; i < C.NUM_SYSTEMS; i++) {
      const angle  = (i / C.NUM_SYSTEMS) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
      const radius = 8000 + Math.random() * spread;
      const pos    = new THREE.Vector3(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 8000,
        Math.sin(angle) * radius,
      );
      this.systems.push(this._buildSystem(pos, i));
    }
    // Home system at a moderate distance so there's exploration to do
    // but close enough to orient the player.
    const homeSystem = this.systems[0];
    homeSystem.isHome = true;
  }

  _buildSystem(pos, idx) {
    NameGen.seed(idx * 7919 + 13337);
    const starType = idx % 5; // 0=yellow, 1=blue, 2=red, 3=white, 4=orange
    const starColors = [0xffee88, 0x88aaff, 0xff6644, 0xffffff, 0xffcc66];
    const starColor  = starColors[starType];
    const starRadius = 200 + Math.random() * 400;

    // Star mesh
    const starGeo  = new THREE.SphereGeometry(starRadius, 24, 24);
    const starMat  = new THREE.MeshBasicMaterial({ color: starColor });
    const starMesh = new THREE.Mesh(starGeo, starMat);
    starMesh.position.copy(pos);
    this.scene.add(starMesh);

    // Star glow (sprite / additive plane)
    const glowGeo  = new THREE.SphereGeometry(starRadius * 2.5, 16, 16);
    const glowMat  = new THREE.MeshBasicMaterial({
      color: starColor, transparent: true, opacity: 0.06,
      side: THREE.BackSide, depthWrite: false,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.copy(pos);
    this.scene.add(glowMesh);

    // Point light from star
    const light = new THREE.PointLight(starColor, 1.5, starRadius * 80, 1.5);
    light.position.copy(pos);
    this.scene.add(light);

    const numPlanets = 2 + Math.floor(Math.random() * 4);
    const planets = [];
    for (let p = 0; p < numPlanets; p++) {
      planets.push(this._buildPlanet(pos, p, numPlanets, idx));
    }

    return {
      name: NameGen.system(),
      pos,
      starMesh,
      glowMesh,
      light,
      starRadius,
      starColor,
      planets,
      isHome: false,
      dysonBuilt: false,
      dysonMesh: null,
    };
  }

  _buildPlanet(starPos, idx, total, sysIdx) {
    NameGen.seed(sysIdx * 997 + idx * 31 + 54321);
    const biomeKey  = BIOME_KEYS[Math.floor(Math.random() * BIOME_KEYS.length)];
    const biome     = BIOMES[biomeKey];
    const radius    = 60 + Math.random() * 140;
    const orbitR    = 1400 + idx * 1800 + Math.random() * 600;
    const orbitAngle = (idx / total) * Math.PI * 2 + Math.random() * 0.8;
    const pos       = new THREE.Vector3(
      starPos.x + Math.cos(orbitAngle) * orbitR,
      starPos.y + (Math.random() - 0.5) * 300,
      starPos.z + Math.sin(orbitAngle) * orbitR,
    );

    // Procedural texture via OffscreenCanvas / Canvas
    const tex = this._makePlanetTexture(biome, biomeKey, radius);

    const geo    = new THREE.SphereGeometry(radius, 32, 32);
    const mat    = new THREE.MeshPhongMaterial({
      map            : tex,
      emissive       : new THREE.Color(biome.emissive),
      emissiveIntensity: 0.3,
      shininess      : biomeKey === 'ocean' ? 80 : 10,
    });
    const mesh   = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);

    // Atmosphere glow
    const atmGeo = new THREE.SphereGeometry(radius * 1.18, 24, 24);
    const atmMat = new THREE.MeshBasicMaterial({
      color: biome.atm, transparent: true, opacity: 0.12,
      side: THREE.BackSide, depthWrite: false,
    });
    const atmMesh = new THREE.Mesh(atmGeo, atmMat);
    atmMesh.position.copy(pos);
    this.scene.add(atmMesh);

    // Highlight ring (yellow, hidden by default)
    const ringGeo = new THREE.SphereGeometry(radius * 1.35, 24, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffe060, transparent: true, opacity: 0.0,
      side: THREE.FrontSide, depthWrite: false, wireframe: true,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(pos);
    this.scene.add(ringMesh);

    // Resources: pick 2-4 from biome pool
    NameGen.seed(sysIdx * 1337 + idx * 53);
    const pool    = [...biome.resources];
    const rCount  = 2 + Math.floor(Math.random() * 3);
    const resources = [];
    for (let r = 0; r < rCount && pool.length; r++) {
      const ri = Math.floor(Math.random() * pool.length);
      resources.push(pool.splice(ri, 1)[0]);
    }

    return {
      name: NameGen.planet(),
      pos,
      radius,
      biomeKey,
      biome,
      mesh,
      atmMesh,
      ringMesh,
      resources,
      orbitAngle,
      orbitR,
      starPos,
      orbitSpeed: 0.00005 + Math.random() * 0.0001,
      collected: false,
    };
  }

  _makePlanetTexture(biome, biomeKey, radius) {
    const size = 256;
    const cv   = document.createElement('canvas');
    cv.width   = size;
    cv.height  = size;
    const ctx  = cv.getContext('2d');

    const base = new THREE.Color(biome.color);
    // Fill base
    ctx.fillStyle = biome.color;
    ctx.fillRect(0, 0, size, size);

    // Noise-like patches
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 4 + Math.random() * 32;
      const c = new THREE.Color(biome.color);
      const vary = (Math.random() - 0.5) * 0.3;
      c.r = Math.min(1, Math.max(0, c.r + vary));
      c.g = Math.min(1, Math.max(0, c.g + vary * 0.8));
      c.b = Math.min(1, Math.max(0, c.b + vary * 0.6));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#' + c.getHexString();
      ctx.globalAlpha = 0.25 + Math.random() * 0.5;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Special features per biome
    if (biomeKey === 'ice') {
      for (let i = 0; i < 30; i++) {
        ctx.strokeStyle = 'rgba(200,230,255,0.3)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(Math.random() * size, Math.random() * size);
        ctx.lineTo(Math.random() * size, Math.random() * size);
        ctx.stroke();
      }
    }
    if (biomeKey === 'volcanic') {
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = `rgba(255,${60+Math.random()*60|0},0,0.4)`;
        ctx.beginPath();
        ctx.arc(Math.random() * size, Math.random() * size, 3+Math.random()*8, 0, Math.PI*2);
        ctx.fill();
      }
    }

    const tex       = new THREE.CanvasTexture(cv);
    tex.needsUpdate = true;
    return tex;
  }

  _buildStarfield() {
    const positions = new Float32Array(C.STAR_COUNT * 3);
    const colors    = new Float32Array(C.STAR_COUNT * 3);

    for (let i = 0; i < C.STAR_COUNT; i++) {
      const r   = 80000 + Math.random() * 120000;
      const phi = Math.acos(2 * Math.random() - 1);
      const th  = Math.random() * Math.PI * 2;
      positions[i*3]   = r * Math.sin(phi) * Math.cos(th);
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(th);
      positions[i*3+2] = r * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      const hue        = Math.random();
      const col        = new THREE.Color().setHSL(hue, 0.15, brightness);
      colors[i*3]   = col.r;
      colors[i*3+1] = col.g;
      colors[i*3+2] = col.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size:            1.8,
      vertexColors:    true,
      transparent:     true,
      depthWrite:      false,
      sizeAttenuation: false,
    });

    this.starfield = new THREE.Points(geo, mat);
    this.scene.add(this.starfield);

    // Warp streak overlay: line segments radiating outward during timewarp
    this._buildWarpLines(positions);
  }

  _buildWarpLines(starPositions) {
    const streakCount = 600;
    const linePts     = new Float32Array(streakCount * 2 * 3);
    for (let i = 0; i < streakCount; i++) {
      const si = Math.floor(Math.random() * C.STAR_COUNT) * 3;
      const x  = starPositions[si], y = starPositions[si+1], z = starPositions[si+2];
      const len = Math.sqrt(x*x + y*y + z*z);
      const nx = x / len, ny = y / len, nz = z / len;
      const d  = 90000;
      linePts[i*6]   = nx * d;
      linePts[i*6+1] = ny * d;
      linePts[i*6+2] = nz * d;
      linePts[i*6+3] = nx * (d - 14000);
      linePts[i*6+4] = ny * (d - 14000);
      linePts[i*6+5] = nz * (d - 14000);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(linePts, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xaaccff, transparent: true, opacity: 0.0, depthWrite: false,
    });
    this.warpLines = new THREE.LineSegments(geo, mat);
    this.scene.add(this.warpLines);
  }

  setWarpFactor(f) {
    this.starfield.material.size = f > 0 ? 2.5 : 1.8;
    if (this.warpLines) {
      this.warpLines.material.opacity = f * 0.55;
    }
  }

  setPlayerDir(_dir) {
    // Direction not used with PointsMaterial approach
  }

  update(dt) {
    // Slowly rotate planets around stars
    for (const sys of this.systems) {
      for (const planet of sys.planets) {
        planet.orbitAngle += planet.orbitSpeed * dt * 1000;
        const nx = planet.starPos.x + Math.cos(planet.orbitAngle) * planet.orbitR;
        const nz = planet.starPos.z + Math.sin(planet.orbitAngle) * planet.orbitR;
        planet.pos.x = nx;
        planet.pos.z = nz;
        planet.mesh.position.set(nx, planet.pos.y, nz);
        planet.atmMesh.position.set(nx, planet.pos.y, nz);
        planet.ringMesh.position.set(nx, planet.pos.y, nz);
        planet.mesh.rotation.y += 0.0001 * dt * 1000;
      }
    }
  }

  allPlanets() {
    return this.systems.flatMap(s => s.planets);
  }

  updateHighlights(missionSys, playerPos) {
    for (const planet of this.allPlanets()) {
      const dist   = playerPos.distanceTo(planet.pos);
      const active = dist < C.HIGHLIGHT_RANGE &&
                     planet.resources.some(r => missionSys.needsResource(r));
      planet.ringMesh.material.opacity = active
        ? 0.12 + 0.06 * Math.sin(Date.now() * 0.003)
        : 0;
    }
  }

  buildDysonSphere(system) {
    if (system.dysonBuilt) return false;
    system.dysonBuilt = true;
    const r = system.starRadius * 3.5;
    const geo = new THREE.SphereGeometry(r, 24, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffe566, transparent: true, opacity: 0.18,
      wireframe: true, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(system.pos);
    this.scene.add(mesh);
    system.dysonMesh = mesh;
    return true;
  }
}

/* ═══════════════════════════════════════════════════════════
   COCKPIT RENDERER
   (rendered in a separate scene on top of space scene)
═══════════════════════════════════════════════════════════ */
class CockpitRenderer {
  constructor(scene) {
    this.scene      = scene;
    this.group      = new THREE.Group();
    scene.add(this.group);

    this.screenMats = {};   // canvas textures for each screen
    this._build();
  }

  _mat(hex, emissiveHex = '#000000', shininess = 40) {
    return new THREE.MeshPhongMaterial({
      color: hex,
      emissive: emissiveHex,
      shininess,
    });
  }

  _build() {
    const g = this.group;
    const dark   = '#1a1f24';
    const darker = '#0e1216';
    const accent = '#1e4060';
    const glow   = '#003344';

    // ── Side panels ──────────────────────────────────────
    // Left panel
    const lpGeo = new THREE.BoxGeometry(0.22, 0.55, 0.7);
    const lpMesh = new THREE.Mesh(lpGeo, this._mat(dark, glow));
    lpMesh.position.set(-0.65, -0.22, -0.55);
    g.add(lpMesh);

    // Left accent strip
    const laGeo  = new THREE.BoxGeometry(0.003, 0.55, 0.7);
    const laMesh = new THREE.Mesh(laGeo, this._mat(accent, '#004466', 80));
    laMesh.position.set(-0.54, -0.22, -0.55);
    g.add(laMesh);

    // Right panel
    const rpGeo  = new THREE.BoxGeometry(0.22, 0.55, 0.7);
    const rpMesh = new THREE.Mesh(rpGeo, this._mat(dark, glow));
    rpMesh.position.set(0.65, -0.22, -0.55);
    g.add(rpMesh);

    // Right accent strip
    const raGeo  = new THREE.BoxGeometry(0.003, 0.55, 0.7);
    const raMesh = new THREE.Mesh(raGeo, this._mat(accent, '#004466', 80));
    raMesh.position.set(0.54, -0.22, -0.55);
    g.add(raMesh);

    // ── Dashboard base ────────────────────────────────────
    const dbGeo  = new THREE.BoxGeometry(1.35, 0.10, 0.55);
    const dbMesh = new THREE.Mesh(dbGeo, this._mat(dark, glow));
    dbMesh.position.set(0, -0.445, -0.62);
    g.add(dbMesh);

    // Dashboard angled riser
    const riseGeo  = new THREE.BoxGeometry(1.35, 0.20, 0.04);
    const riseMesh = new THREE.Mesh(riseGeo, this._mat(darker, glow));
    riseMesh.position.set(0, -0.30, -0.90);
    riseMesh.rotation.x = -0.3;
    g.add(riseMesh);

    // ── Three cockpit screens ────────────────────────────
    // Left screen – Navigation
    this.screenMats.nav   = this._makeScreen('nav', 256, 192);
    const lsGeo  = new THREE.PlaneGeometry(0.28, 0.21);
    const lsMesh = new THREE.Mesh(lsGeo, new THREE.MeshBasicMaterial({ map: this.screenMats.nav.tex, transparent:false }));
    lsMesh.position.set(-0.36, -0.26, -0.883);
    lsMesh.rotation.x = -0.3;
    g.add(lsMesh);
    this._addScreenFrame(lsMesh.position, 0.30, 0.23);

    // Center screen – Mission terminal
    this.screenMats.mission = this._makeScreen('mission', 384, 256);
    const csGeo  = new THREE.PlaneGeometry(0.38, 0.255);
    const csMesh = new THREE.Mesh(csGeo, new THREE.MeshBasicMaterial({ map: this.screenMats.mission.tex, transparent:false }));
    csMesh.position.set(0, -0.255, -0.882);
    csMesh.rotation.x = -0.3;
    g.add(csMesh);
    this._addScreenFrame(csMesh.position, 0.40, 0.275);

    // Right screen – Systems status
    this.screenMats.status  = this._makeScreen('status', 256, 192);
    const rsGeo  = new THREE.PlaneGeometry(0.28, 0.21);
    const rsMesh = new THREE.Mesh(rsGeo, new THREE.MeshBasicMaterial({ map: this.screenMats.status.tex, transparent:false }));
    rsMesh.position.set(0.36, -0.26, -0.883);
    rsMesh.rotation.x = -0.3;
    g.add(rsMesh);
    this._addScreenFrame(rsMesh.position, 0.30, 0.23);

    // ── Top frame bar ────────────────────────────────────
    const tfGeo  = new THREE.BoxGeometry(1.35, 0.05, 0.15);
    const tfMesh = new THREE.Mesh(tfGeo, this._mat(dark, glow));
    tfMesh.position.set(0, 0.22, -0.55);
    g.add(tfMesh);

    // Center top accent
    const tcGeo  = new THREE.BoxGeometry(1.35, 0.003, 0.15);
    const tcMesh = new THREE.Mesh(tcGeo, this._mat(accent, '#004466', 80));
    tcMesh.position.set(0, 0.195, -0.55);
    g.add(tcMesh);

    // ── Bottom floor ─────────────────────────────────────
    const bfGeo  = new THREE.BoxGeometry(1.35, 0.05, 0.55);
    const bfMesh = new THREE.Mesh(bfGeo, this._mat(dark, glow));
    bfMesh.position.set(0, -0.475, -0.42);
    g.add(bfMesh);

    // ── Cockpit ambient light ────────────────────────────
    const ambLight = new THREE.AmbientLight(0x103040, 0.8);
    g.add(ambLight);

    const screenGlow = new THREE.PointLight(0x0af0ff, 0.4, 1.2);
    screenGlow.position.set(0, -0.25, -0.7);
    g.add(screenGlow);
  }

  _addScreenFrame(pos, w, h) {
    const geo  = new THREE.BoxGeometry(w, h, 0.004);
    const mat  = new THREE.MeshPhongMaterial({ color:'#0a1e2a', emissive:'#003355', shininess:60 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, pos.y, pos.z - 0.002);
    mesh.rotation.x = -0.3;
    this.group.add(mesh);
  }

  _makeScreen(id, w, h) {
    const cv  = document.createElement('canvas');
    cv.width  = w;
    cv.height = h;
    const ctx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv);
    return { cv, ctx, tex };
  }

  updateMissionScreen(missionSys) {
    const { cv, ctx, tex } = this.screenMats.mission;
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#020d15';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,200,255,0.25)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(2, 2, W-4, H-4);

    // Header
    ctx.fillStyle   = 'rgba(0,180,220,0.15)';
    ctx.fillRect(0, 0, W, 30);
    ctx.fillStyle   = '#7ef4ff';
    ctx.font        = '9px "Courier New"';
    ctx.fillText('MISSION TERMINAL', 12, 19);

    const t   = Date.now() * 0.001;
    const dot = t % 1 > 0.5 ? '◆' : '◇';
    ctx.fillStyle = '#4eff9f';
    ctx.fillText(dot, W - 22, 19);

    if (missionSys.complete) {
      ctx.fillStyle = '#4eff9f';
      ctx.font      = 'bold 14px "Courier New"';
      ctx.fillText('ALL MISSIONS', W/2 - 60, H/2 - 10);
      ctx.fillText('COMPLETE', W/2 - 40, H/2 + 10);
      ctx.fillStyle = '#7ef4ff';
      ctx.font      = '9px "Courier New"';
      ctx.fillText('HOME PLANET: 100% RESTORED', 18, H/2 + 40);
      tex.needsUpdate = true;
      return;
    }

    const m   = missionSys.mission;
    const idx = missionSys.current;

    // Mission number
    ctx.fillStyle = 'rgba(126,244,255,0.4)';
    ctx.font      = '8px "Courier New"';
    ctx.fillText(`MISSION ${idx+1} / ${MISSIONS.length}`, 12, 48);

    // Mission name
    ctx.fillStyle = '#ffffff';
    ctx.font      = 'bold 11px "Courier New"';
    ctx.fillText(m.name.toUpperCase(), 12, 65);

    // Desc
    ctx.fillStyle = 'rgba(200,245,255,0.65)';
    ctx.font      = '8px "Courier New"';
    this._wrapText(ctx, m.desc, 12, 80, W - 24, 12);

    // Requirements
    ctx.fillStyle = 'rgba(126,244,255,0.4)';
    ctx.font      = '8px "Courier New"';
    ctx.fillText('REQUIRED MATERIALS:', 12, 116);

    let y = 130;
    for (const [key, amt] of Object.entries(m.req)) {
      const have    = missionSys.inventory[key] || 0;
      const done    = have >= amt;
      const rInfo   = RESOURCES[key];
      ctx.fillStyle = done ? '#4eff9f' : rInfo.color;
      ctx.font      = '9px "Courier New"';
      const checkMark = done ? '✓ ' : '  ';
      ctx.fillText(`${checkMark}${rInfo.name}`, 16, y);
      ctx.fillStyle = done ? '#4eff9f' : 'rgba(126,244,255,0.6)';
      ctx.fillText(`${Math.min(have, amt)} / ${amt}`, W - 60, y);
      y += 15;
    }

    // Progress bar
    const prog   = missionSys.progress;
    const barY   = H - 36;
    const barW   = W - 24;
    ctx.fillStyle = 'rgba(126,244,255,0.1)';
    ctx.fillRect(12, barY, barW, 5);
    const grad    = ctx.createLinearGradient(12, 0, 12 + barW, 0);
    grad.addColorStop(0, '#7ef4ff');
    grad.addColorStop(1, '#4eff9f');
    ctx.fillStyle = grad;
    ctx.fillRect(12, barY, barW * prog, 5);

    ctx.fillStyle = 'rgba(126,244,255,0.35)';
    ctx.font      = '8px "Courier New"';
    ctx.fillText(`PROGRESS: ${Math.round(prog * 100)}%`, 12, H - 12);

    if (missionSys.canComplete()) {
      ctx.fillStyle = '#4eff9f';
      ctx.font      = 'bold 9px "Courier New"';
      ctx.fillText('[ F — DELIVER MATERIALS ]', W/2 - 70, H - 12);
    }

    tex.needsUpdate = true;
  }

  updateNavScreen(playerPos, systems, nearestSystem) {
    const { cv, ctx, tex } = this.screenMats.nav;
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#020d15';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,200,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(2, 2, W-4, H-4);

    ctx.fillStyle = 'rgba(0,180,220,0.15)';
    ctx.fillRect(0, 0, W, 24);
    ctx.fillStyle = '#7ef4ff';
    ctx.font = '8px "Courier New"';
    ctx.fillText('GALACTIC NAVIGATION', 10, 16);

    // Mini-map: top-down view of systems
    const mapCx = W / 2, mapCy = H / 2 + 14;
    const mapR  = Math.min(W, H) * 0.38;
    ctx.strokeStyle = 'rgba(126,244,255,0.08)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(mapCx, mapCy, mapR, 0, Math.PI * 2);
    ctx.stroke();

    const spread = 180000;
    for (const sys of systems) {
      const nx = (sys.pos.x / spread) * mapR + mapCx;
      const ny = (sys.pos.z / spread) * mapR + mapCy;
      const isNearest = nearestSystem && sys === nearestSystem;
      ctx.beginPath();
      ctx.arc(nx, ny, isNearest ? 4 : 2, 0, Math.PI * 2);
      ctx.fillStyle = isNearest ? '#ffe060' : 'rgba(126,244,255,0.5)';
      ctx.fill();
    }

    // Player dot
    const px = (playerPos.x / spread) * mapR + mapCx;
    const py = (playerPos.z / spread) * mapR + mapCy;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#4eff9f';
    ctx.fill();

    if (nearestSystem) {
      ctx.fillStyle = 'rgba(126,244,255,0.4)';
      ctx.font      = '7px "Courier New"';
      ctx.fillText('NEAREST:', 10, H - 28);
      ctx.fillStyle = '#fff';
      ctx.font      = '8px "Courier New"';
      ctx.fillText(nearestSystem.name, 10, H - 16);
    }

    tex.needsUpdate = true;
  }

  updateStatusScreen(statusData) {
    const { cv, ctx, tex } = this.screenMats.status;
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#020d15';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,200,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(2, 2, W-4, H-4);

    ctx.fillStyle = 'rgba(0,180,220,0.15)';
    ctx.fillRect(0, 0, W, 24);
    ctx.fillStyle = '#7ef4ff';
    ctx.font = '8px "Courier New"';
    ctx.fillText('SHIP SYSTEMS', 10, 16);

    const rows = [
      ['HULL',       '100%',     '#4eff9f'],
      ['SHIELD',     '100%',     '#4eff9f'],
      ['ENGINES',    statusData.timewarpActive ? 'WARP' : 'NOMINAL', statusData.timewarpActive ? '#a67eff' : '#4eff9f'],
      ['WARP FUEL',  `${Math.round(statusData.warpFuel)}%`,  statusData.warpFuel > 30 ? '#4eff9f' : '#ff8040'],
      ['CARGO',      `${statusData.cargoCount} ITEMS`, '#7ef4ff'],
      ['MISSIONS',   `${statusData.missionsLeft} LEFT`, '#7ef4ff'],
      ['RESTORATION',`${statusData.restoration}%`, '#4eff9f'],
    ];

    let y = 38;
    ctx.font = '8px "Courier New"';
    for (const [label, val, col] of rows) {
      ctx.fillStyle = 'rgba(126,244,255,0.4)';
      ctx.fillText(label, 10, y);
      ctx.fillStyle = col;
      ctx.fillText(val, W - 10 - ctx.measureText(val).width, y);
      ctx.strokeStyle = 'rgba(126,244,255,0.06)';
      ctx.beginPath();
      ctx.moveTo(10, y + 4);
      ctx.lineTo(W - 10, y + 4);
      ctx.stroke();
      y += 18;
    }

    // Dyson sphere indicator
    if (statusData.dysonBuilt > 0) {
      ctx.fillStyle = '#ffe566';
      ctx.font = '8px "Courier New"';
      ctx.fillText(`DYSON SPHERES: ${statusData.dysonBuilt}`, 10, H - 15);
    }

    tex.needsUpdate = true;
  }

  _wrapText(ctx, text, x, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxW && line !== '') {
        ctx.fillText(line, x, y);
        line = word + ' ';
        y += lineH;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, y);
  }

  updatePosition(camera) {
    // Cockpit is in a separate scene rendered after space, so it stays
    // relative to the camera. We use a cockpit-camera that doesn't move.
  }
}

/* ═══════════════════════════════════════════════════════════
   INPUT CONTROLLER
═══════════════════════════════════════════════════════════ */
class InputController {
  constructor(canvas) {
    this.keys    = {};
    this.rmb     = false;
    this.mouseDx = 0;
    this.mouseDy = 0;
    this._raw    = { dx: 0, dy: 0 };

    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      e.preventDefault && ['Space','Tab'].includes(e.code) && e.preventDefault();
    });
    window.addEventListener('keyup',   e => { this.keys[e.code] = false; });

    canvas.addEventListener('mousedown', e => {
      if (e.button === 2) { this.rmb = true; canvas.requestPointerLock && canvas.requestPointerLock(); }
    });
    window.addEventListener('mouseup',  e => { if (e.button === 2) this.rmb = false; });
    window.addEventListener('mousemove', e => {
      if (this.rmb) {
        this._raw.dx += e.movementX || 0;
        this._raw.dy += e.movementY || 0;
      }
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  consume() {
    this.mouseDx = this._raw.dx;
    this.mouseDy = this._raw.dy;
    this._raw.dx = 0;
    this._raw.dy = 0;
  }
}

/* ═══════════════════════════════════════════════════════════
   HUD CONTROLLER
═══════════════════════════════════════════════════════════ */
class HUD {
  constructor() {
    this.$mission    = document.getElementById('mission-title');
    this.$objective  = document.getElementById('mission-objective');
    this.$materials  = document.getElementById('mission-materials');
    this.$mProgFill  = document.getElementById('mission-progress-fill');
    this.$restFill   = document.getElementById('restoration-fill');
    this.$restPct    = document.getElementById('restoration-pct');
    this.$scanTarget = document.getElementById('scanner-target');
    this.$scanDist   = document.getElementById('scanner-distance');
    this.$scanRes    = document.getElementById('scanner-resources');
    this.$speedFill  = document.getElementById('speed-fill');
    this.$warpFill   = document.getElementById('timewarp-fill');
    this.$speedVal   = document.getElementById('speed-val');
    this.$warpVal    = document.getElementById('warp-val');
    this.$bearing    = document.getElementById('bearing-value');
    this.$speedText  = document.getElementById('speed-text');
    this.$invList    = document.getElementById('inventory-list');
    this.$hint       = document.getElementById('interaction-hint');
    this.$notif      = document.getElementById('notification');
    this.$notifTitle = document.getElementById('notification-title');
    this.$notifSub   = document.getElementById('notification-sub');
    this.$twOverlay  = document.getElementById('timewarp-overlay');
    this.$twLabel    = document.getElementById('timewarp-label');
    this.$dysonHint  = document.getElementById('dyson-hint');
    this.$planetLabel= document.getElementById('planet-label');
    this.$plName     = document.getElementById('planet-label-name');
    this.$plDist     = document.getElementById('planet-label-dist');
    this.$mcPanel    = document.getElementById('mission-complete');
    this.$mcText     = document.getElementById('mc-text');
    this.$mcBtn      = document.getElementById('mc-continue');

    this._notifTimer = 0;
    this._notifActive= false;

    this.$mcBtn.addEventListener('click', () => {
      this.$mcPanel.classList.remove('visible');
    });
  }

  updateMission(missionSys) {
    if (missionSys.complete) {
      this.$mission.textContent   = 'ALL COMPLETE';
      this.$objective.textContent = 'Home planet fully restored.';
      this.$materials.innerHTML   = '';
      this.$mProgFill.style.width = '100%';
    } else {
      const m = missionSys.mission;
      this.$mission.textContent   = `${missionSys.current + 1}. ${m.name.toUpperCase()}`;
      this.$objective.textContent = m.desc;

      let html = '';
      for (const [key, amt] of Object.entries(m.req)) {
        const have = missionSys.inventory[key] || 0;
        const done = have >= amt;
        const cls  = done ? 'mat-done' : 'mat-required';
        html += `<div class="${cls}">${done ? '✓' : '○'} ${RESOURCES[key].name}: ${Math.min(have,amt)}/${amt}</div>`;
      }
      this.$materials.innerHTML   = html;
      this.$mProgFill.style.width = `${missionSys.progress * 100}%`;
    }

    this.$restFill.style.width = `${missionSys.restoration}%`;
    this.$restPct.textContent  = `${missionSys.restoration}%`;
  }

  updateScanner(nearPlanet, missionSys) {
    if (!nearPlanet) {
      this.$scanTarget.textContent = '—';
      this.$scanDist.textContent   = '';
      this.$scanRes.innerHTML      = '';
      return;
    }
    const dist = nearPlanet.dist;
    this.$scanTarget.textContent = nearPlanet.planet.name.toUpperCase();
    this.$scanDist.textContent   = `${Math.round(dist).toLocaleString()} UNITS`;
    let html = '';
    for (const r of nearPlanet.planet.resources) {
      const match = missionSys.needsResource(r);
      html += `<div class="scan-resource${match ? ' match' : ''}">${match ? '◆' : '○'} ${RESOURCES[r].name}</div>`;
    }
    this.$scanRes.innerHTML = html;
  }

  updateStatus(speed, maxSpeed, warpFuel, timewarpActive, bearing) {
    const spPct = Math.min(100, (speed / maxSpeed) * 100);
    this.$speedFill.style.width = `${spPct}%`;
    this.$warpFill.style.width  = `${warpFuel}%`;
    this.$speedVal.textContent  = `${Math.round(speed)}`;
    this.$warpVal.textContent   = `${Math.round(warpFuel)}%`;
    this.$bearing.textContent   = `${bearing.toString().padStart(3, '0')}°`;
    this.$speedText.textContent = timewarpActive ? 'TIMEWARP' : `${Math.round(speed)} u/s`;

    if (timewarpActive) {
      this.$twOverlay.classList.add('active');
      this.$twLabel.classList.add('active');
    } else {
      this.$twOverlay.classList.remove('active');
      this.$twLabel.classList.remove('active');
    }
  }

  updateInventory(inventory) {
    const entries = Object.entries(inventory).filter(([, v]) => v > 0);
    if (entries.length === 0) {
      this.$invList.innerHTML = '<div style="color:rgba(126,244,255,0.3);font-size:10px">EMPTY</div>';
      return;
    }
    let html = '';
    for (const [key, cnt] of entries) {
      html += `<div class="inv-item"><span class="inv-name">${RESOURCES[key].name}</span><span class="inv-count">${cnt}</span></div>`;
    }
    this.$invList.innerHTML = html;
  }

  setHint(text) {
    if (text) {
      this.$hint.textContent = text;
      this.$hint.classList.add('visible');
    } else {
      this.$hint.classList.remove('visible');
    }
  }

  notify(title, sub, duration = 3000) {
    this.$notifTitle.textContent = title;
    this.$notifSub.textContent   = sub;
    this.$notif.classList.add('visible');
    clearTimeout(this._notifTimer);
    this._notifTimer = setTimeout(() => {
      this.$notif.classList.remove('visible');
    }, duration);
  }

  showMissionComplete(nextName) {
    this.$mcText.textContent = nextName
      ? `Materials delivered. Next mission: ${nextName}`
      : 'All missions complete. Home planet fully restored!';
    this.$mcPanel.classList.add('visible');
  }

  setPlanetLabel(planet, screenPos, visible) {
    if (!visible || !planet) {
      this.$planetLabel.style.display = 'none';
      return;
    }
    this.$planetLabel.style.display = 'block';
    this.$planetLabel.style.left    = `${screenPos.x}px`;
    this.$planetLabel.style.top     = `${screenPos.y - 40}px`;
    this.$plName.textContent = planet.name.toUpperCase();
    this.$plDist.textContent = `${Math.round(screenPos.dist).toLocaleString()} u`;
  }

  setDysonHint(text) {
    this.$dysonHint.textContent = text || '';
    this.$dysonHint.style.display = text ? 'block' : 'none';
  }
}

/* ═══════════════════════════════════════════════════════════
   MAIN GAME
═══════════════════════════════════════════════════════════ */
class SunforgeGame {
  constructor() {
    this.canvas    = document.getElementById('gameCanvas');

    // ── Renderer ──────────────────────────────────────────
    this.renderer  = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.autoClear = false;

    // ── Scenes ────────────────────────────────────────────
    this.spaceScene   = new THREE.Scene();
    this.cockpitScene = new THREE.Scene();
    this.spaceScene.background = new THREE.Color(0x000205);
    // Slight fog in space for depth
    this.spaceScene.fog = new THREE.FogExp2(0x000205, 0.0000018);

    // ── Cameras ───────────────────────────────────────────
    const aspect = window.innerWidth / window.innerHeight;
    // Space camera (main, moves through the world)
    this.camera    = new THREE.PerspectiveCamera(72, aspect, 1, 500000);
    // Cockpit camera (stationary at origin, always rendered last)
    this.ckCamera  = new THREE.PerspectiveCamera(72, aspect, 0.01, 10);

    // ── State ─────────────────────────────────────────────
    this.yaw           = 0;
    this.pitch         = 0;
    this.lookYaw       = 0;   // free-look offset (RMB)
    this.lookPitch     = 0;
    this.velocity      = new THREE.Vector3();
    this.speed         = 0;
    this.warpFuel      = C.WARP_FUEL_MAX;
    this.timewarpActive= false;
    this.inventory     = {};
    this.dysonBuilt    = 0;
    this.dysonUnlocked = false;

    // ── Sub-systems ───────────────────────────────────────
    this.missionSys = new MissionSystem(this.inventory);
    this.input      = new InputController(this.canvas);
    this.hud        = new HUD();

    // ── Ambient light in space scene ─────────────────────
    const ambient = new THREE.AmbientLight(0x101520, 0.5);
    this.spaceScene.add(ambient);

    // ── Cockpit scene lighting ────────────────────────────
    const ckAmb = new THREE.AmbientLight(0x102030, 1.0);
    this.cockpitScene.add(ckAmb);

    // ── Galaxy ────────────────────────────────────────────
    this.galaxy  = new Galaxy(this.spaceScene);

    // Start near the first system
    const startSys = this.galaxy.systems[0];
    this.camera.position.copy(startSys.pos).add(new THREE.Vector3(0, 200, 3000));

    // ── Cockpit ───────────────────────────────────────────
    this.cockpit = new CockpitRenderer(this.cockpitScene);

    // ── Window resize ─────────────────────────────────────
    window.addEventListener('resize', () => this._onResize());

    // ── Clock ─────────────────────────────────────────────
    this.clock = new THREE.Clock();

    // ── Nearest planet tracking ───────────────────────────
    this.nearestPlanet  = null;   // { planet, dist }
    this.nearestSystem  = null;

    // ── Screen-space planet label tracking ───────────────
    this._labelPlanet   = null;
    this._labelScreenPos= { x:0, y:0, dist:0 };

    // Load and then start
    this._load();
  }

  _load() {
    const steps = [
      'GENERATING STAR SYSTEMS',
      'PLOTTING ORBITAL PATHS',
      'LOADING STELLAR CATALOG',
      'CALIBRATING NAVIGATION',
      'PRIMING WARP DRIVES',
      'READY',
    ];
    const $status   = document.getElementById('loading-status');
    const $progress = document.getElementById('loading-progress');
    const $screen   = document.getElementById('loading-screen');
    let i = 0;
    const tick = () => {
      if (i < steps.length) {
        $status.textContent  = steps[i] + '…';
        $progress.style.width = `${((i + 1) / steps.length) * 100}%`;
        i++;
        setTimeout(tick, 320);
      } else {
        $screen.classList.add('hidden');
        setTimeout(() => {
          $screen.style.display = 'none';
          document.getElementById('controls-help').style.display = 'block';
          setTimeout(() => {
            document.getElementById('controls-help').style.display = 'none';
          }, 6000);
        }, 1100);
        this._animate();
      }
    };
    tick();
  }

  _onResize() {
    const W = window.innerWidth, H = window.innerHeight;
    this.camera.aspect    = W / H;
    this.camera.updateProjectionMatrix();
    this.ckCamera.aspect  = W / H;
    this.ckCamera.updateProjectionMatrix();
    this.renderer.setSize(W, H);
  }

  /* ── Main loop ───────────────────────────────────────── */
  _animate() {
    requestAnimationFrame(() => this._animate());
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this._update(dt);
    this._render();
  }

  _update(dt) {
    this.input.consume();

    // ── Timewarp ────────────────────────────────────────
    const wantWarp = this.input.keys['KeyT'] && this.warpFuel > 0;
    if (wantWarp && !this.timewarpActive) this.timewarpActive = true;
    if (!wantWarp)                        this.timewarpActive = false;
    if (this.warpFuel <= 0)               this.timewarpActive = false;

    if (this.timewarpActive) {
      this.warpFuel = Math.max(0, this.warpFuel - C.WARP_DRAIN * dt);
    } else {
      this.warpFuel = Math.min(C.WARP_FUEL_MAX, this.warpFuel + C.WARP_REGEN * dt);
    }

    // ── Mouse look (free-look with RMB) ─────────────────
    if (this.input.rmb) {
      this.lookYaw   -= this.input.mouseDx * C.LOOK_SENSITIVITY;
      this.lookPitch -= this.input.mouseDy * C.LOOK_SENSITIVITY;
      this.lookPitch  = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.lookPitch));
      this.lookYaw    = Math.max(-Math.PI / 1.5, Math.min(Math.PI / 1.5, this.lookYaw));
    } else {
      // Smooth return to forward
      this.lookYaw   *= Math.exp(-C.LOOK_RETURN_SPEED * dt);
      this.lookPitch *= Math.exp(-C.LOOK_RETURN_SPEED * dt);
    }

    // Ship rotation from mouse when NOT holding RMB
    if (!this.input.rmb) {
      this.yaw   -= this.input.mouseDx * C.LOOK_SENSITIVITY * 0.5;
      this.pitch -= this.input.mouseDy * C.LOOK_SENSITIVITY * 0.5;
      this.pitch  = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, this.pitch));
    }

    // Build ship quaternion
    const qYaw   = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), this.yaw);
    const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), this.pitch);
    const shipQuat = qYaw.multiply(qPitch);

    // Add free-look on top
    const qlY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), this.lookYaw);
    const qlP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), this.lookPitch);
    this.camera.quaternion.copy(shipQuat).multiply(qlY).multiply(qlP);

    // ── Movement ────────────────────────────────────────
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(shipQuat);
    const right   = new THREE.Vector3(1, 0,  0).applyQuaternion(shipQuat);
    const up      = new THREE.Vector3(0, 1,  0).applyQuaternion(shipQuat);

    let accel = new THREE.Vector3();
    if (this.input.keys['KeyW'] || this.input.keys['ArrowUp'])    accel.addScaledVector(forward,  1);
    if (this.input.keys['KeyS'] || this.input.keys['ArrowDown'])  accel.addScaledVector(forward, -1);
    if (this.input.keys['KeyA'] || this.input.keys['ArrowLeft'])  accel.addScaledVector(right,   -1);
    if (this.input.keys['KeyD'] || this.input.keys['ArrowRight']) accel.addScaledVector(right,    1);
    if (this.input.keys['Space'])                                  accel.addScaledVector(up,       1);
    if (this.input.keys['ShiftLeft'])                              accel.addScaledVector(up,      -1);

    const maxSpd = this.timewarpActive ? C.WARP_SPEED : C.PLAYER_MAX_SPEED;
    if (accel.lengthSq() > 0) {
      accel.normalize().multiplyScalar(C.ACCEL * dt);
      this.velocity.add(accel);
      if (this.velocity.length() > maxSpd) this.velocity.setLength(maxSpd);
    } else {
      const decel = C.DECEL * dt;
      if (this.velocity.length() < decel) {
        this.velocity.set(0, 0, 0);
      } else {
        this.velocity.addScaledVector(this.velocity.clone().normalize(), -decel);
      }
    }

    this.speed = this.velocity.length();
    this.camera.position.addScaledVector(this.velocity, dt);

    // ── Galaxy & highlights ──────────────────────────────
    this.galaxy.update(dt);
    this.galaxy.updateHighlights(this.missionSys, this.camera.position);
    this.galaxy.setWarpFactor(this.timewarpActive ? 1.0 : 0.0);
    this.galaxy.setPlayerDir(forward);

    // ── Find nearest planet ──────────────────────────────
    this._updateNearest();

    // ── Collect interaction ──────────────────────────────
    this._updateInteraction();

    // ── Mission delivery (F key) ─────────────────────────
    if (this.input.keys['KeyF'] && this.missionSys.canComplete()) {
      this._deliverMission();
    }

    // ── Dyson sphere ─────────────────────────────────────
    this._updateDyson();

    // ── HUD ──────────────────────────────────────────────
    const bearing = Math.round((((-this.yaw / (Math.PI * 2)) % 1) + 1) % 1 * 360);
    this.hud.updateStatus(this.speed, maxSpd, this.warpFuel, this.timewarpActive, bearing);
    this.hud.updateMission(this.missionSys);
    this.hud.updateInventory(this.inventory);
    this.hud.updateScanner(this.nearestPlanet, this.missionSys);

    // ── Update cockpit screens ───────────────────────────
    this.cockpit.updateMissionScreen(this.missionSys);
    this.cockpit.updateNavScreen(this.camera.position, this.galaxy.systems, this.nearestSystem);
    this.cockpit.updateStatusScreen({
      timewarpActive: this.timewarpActive,
      warpFuel:       this.warpFuel,
      cargoCount:     Object.values(this.inventory).reduce((a, b) => a + b, 0),
      missionsLeft:   Math.max(0, MISSIONS.length - this.missionSys.current),
      restoration:    this.missionSys.restoration,
      dysonBuilt:     this.dysonBuilt,
    });

    // ── Planet label ─────────────────────────────────────
    this._updatePlanetLabel();
  }

  _updateNearest() {
    let bestPlanet = null, bestDist = Infinity;
    let bestSystem = null, bestSysDist = Infinity;

    for (const sys of this.galaxy.systems) {
      const sd = this.camera.position.distanceTo(sys.pos);
      if (sd < bestSysDist) { bestSysDist = sd; bestSystem = sys; }

      for (const planet of sys.planets) {
        const d = this.camera.position.distanceTo(planet.pos);
        if (d < bestDist) { bestDist = d; bestPlanet = planet; }
      }
    }

    this.nearestSystem = bestSystem;
    this.nearestPlanet = bestDist < C.SCAN_RANGE ? { planet: bestPlanet, dist: bestDist } : null;
  }

  _updateInteraction() {
    if (!this.nearestPlanet) {
      this.hud.setHint(null);
      return;
    }
    const { planet, dist } = this.nearestPlanet;
    if (dist < C.COLLECT_RANGE + planet.radius) {
      const resNames = planet.resources.map(r => RESOURCES[r].name).join(', ');
      this.hud.setHint(`[ E ] COLLECT  —  ${planet.name.toUpperCase()}  (${resNames})`);

      if (this.input.keys['KeyE']) {
        // Debounce
        if (!this._lastCollect || Date.now() - this._lastCollect > 1200) {
          this._lastCollect = Date.now();
          this._collectPlanet(planet);
        }
      }
    } else if (dist < C.SCAN_RANGE) {
      this.hud.setHint(null);
    } else {
      this.hud.setHint(null);
    }
  }

  _collectPlanet(planet) {
    for (const resKey of planet.resources) {
      const amt = 2 + Math.floor(Math.random() * 3);
      this.inventory[resKey] = (this.inventory[resKey] || 0) + amt;
    }
    const names = planet.resources.map(r => RESOURCES[r].name).join(', ');
    this.hud.notify('MATERIALS COLLECTED', names, 2500);

    // Flash atmosphere
    planet.atmMesh.material.opacity = 0.5;
    setTimeout(() => { planet.atmMesh.material.opacity = 0.12; }, 400);
  }

  _deliverMission() {
    if (!this._lastDeliver || Date.now() - this._lastDeliver > 500) {
      this._lastDeliver = Date.now();
      const prevIdx     = this.missionSys.current;
      const ok          = this.missionSys.complete_mission();
      if (ok) {
        const nextMission = this.missionSys.complete ? null : this.missionSys.mission.name;
        this.hud.showMissionComplete(nextMission);
        this.hud.notify('MISSION COMPLETE', `+10% HOME PLANET RESTORED`, 2000);

        // Unlock Dyson spheres after completing the 7th mission (current index becomes 7)
        if (this.missionSys.current >= 7) this.dysonUnlocked = true;
      }
    }
  }

  _updateDyson() {
    if (!this.dysonUnlocked) {
      this.hud.setDysonHint(null);
      return;
    }

    // Find nearest star system
    if (!this.nearestSystem) return;
    const distToStar = this.camera.position.distanceTo(this.nearestSystem.pos);
    const inRange    = distToStar < this.nearestSystem.starRadius * 12;

    if (inRange && !this.nearestSystem.dysonBuilt) {
      this.hud.setDysonHint(`[ B ] BUILD DYSON SPHERE  —  ${this.nearestSystem.name.toUpperCase()}`);
      if (this.input.keys['KeyB']) {
        if (!this._lastDyson || Date.now() - this._lastDyson > 2000) {
          this._lastDyson = Date.now();
          if (this.galaxy.buildDysonSphere(this.nearestSystem)) {
            this.dysonBuilt++;
            // Add solar energy to inventory
            this.inventory['SOLAR'] = (this.inventory['SOLAR'] || 0) + 5;
            this.hud.notify('DYSON SPHERE CONSTRUCTED',
              `${this.nearestSystem.name} — +5 Solar Energy`, 3500);
            this.hud.setDysonHint(null);
          }
        }
      }
    } else if (inRange && this.nearestSystem.dysonBuilt) {
      this.hud.setDysonHint(`DYSON SPHERE ACTIVE — ${this.nearestSystem.name.toUpperCase()}`);
    } else {
      this.hud.setDysonHint(null);
    }
  }

  _updatePlanetLabel() {
    if (!this.nearestPlanet) {
      this.hud.setPlanetLabel(null, null, false);
      return;
    }
    const { planet, dist } = this.nearestPlanet;
    if (dist > C.LABEL_RANGE) {
      this.hud.setPlanetLabel(null, null, false);
      return;
    }

    // Project planet position to screen
    const pv    = planet.pos.clone().project(this.camera);
    const W     = window.innerWidth;
    const H     = window.innerHeight;
    const sx    = (pv.x  *  0.5 + 0.5) * W;
    const sy    = (-pv.y * 0.5 + 0.5) * H;

    // Only show if in front
    if (pv.z < 1) {
      this.hud.setPlanetLabel(planet, { x: sx, y: sy, dist }, true);
    } else {
      this.hud.setPlanetLabel(null, null, false);
    }
  }

  /* ── Render ─────────────────────────────────────────── */
  _render() {
    this.renderer.clear();

    // 1. Space scene
    this.renderer.render(this.spaceScene, this.camera);

    // 2. Cockpit on top (clear depth only)
    this.renderer.clearDepth();
    this.renderer.render(this.cockpitScene, this.ckCamera);
  }
}

/* ═══════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  window._game = new SunforgeGame();
});
