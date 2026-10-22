import * as THREE from "three";

// ============================================================
// APEX RACING 3D — RACING ENGINE
// ============================================================

const $ = id => document.getElementById(id);
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;

const renderer = new THREE.WebGLRenderer({
  canvas: $("world"),
  antialias: true,
  powerPreference: "high-performance"
});
// ============================================================
// APEX RACING 3D — ADAPTIVE PERFORMANCE SYSTEM
// ============================================================

const APEX_PERFORMANCE = {
  minPixelRatio: 0.65,
  maxPixelRatio: Math.min(window.devicePixelRatio || 1, 1.1),
  currentPixelRatio: Math.min(window.devicePixelRatio || 1, 1.1),

  lastCheck: 0,
  lastAdjustment: 0,

  frameCount: 0,
  averageFrameTime: 16.67,

  slowFrames: 0,
  smoothFrames: 0,

  enabled: true
};

function apexAdaptivePerformance(timestamp) {
  if (!Number.isFinite(timestamp)) return;

  APEX_PERFORMANCE.frameCount++;

  if (!APEX_PERFORMANCE.lastCheck) {
    APEX_PERFORMANCE.lastCheck = timestamp;
    return;
  }

  const elapsed = timestamp - APEX_PERFORMANCE.lastCheck;

  // Evaluate performance approximately once per second.
  if (elapsed < 1000) return;

  const fps =
    APEX_PERFORMANCE.frameCount * 1000 / elapsed;

  APEX_PERFORMANCE.averageFrameTime =
    1000 / Math.max(1, fps);

  APEX_PERFORMANCE.frameCount = 0;
  APEX_PERFORMANCE.lastCheck = timestamp;

  if (fps < 43) {
    APEX_PERFORMANCE.slowFrames++;
    APEX_PERFORMANCE.smoothFrames = 0;
  } else if (fps > 57) {
    APEX_PERFORMANCE.smoothFrames++;
    APEX_PERFORMANCE.slowFrames = 0;
  } else {
    APEX_PERFORMANCE.slowFrames = 0;
    APEX_PERFORMANCE.smoothFrames = 0;
  }

  // Avoid changing rendering resolution too frequently.
  if (timestamp - APEX_PERFORMANCE.lastAdjustment < 2500) {
    return;
  }

  let nextRatio = APEX_PERFORMANCE.currentPixelRatio;

  if (APEX_PERFORMANCE.slowFrames >= 2) {
    nextRatio = Math.max(
      APEX_PERFORMANCE.minPixelRatio,
      nextRatio - 0.15
    );

    APEX_PERFORMANCE.slowFrames = 0;
  } else if (APEX_PERFORMANCE.smoothFrames >= 4) {
    nextRatio = Math.min(
      APEX_PERFORMANCE.maxPixelRatio,
      nextRatio + 0.15
    );

    APEX_PERFORMANCE.smoothFrames = 0;
  }

  if (nextRatio !== APEX_PERFORMANCE.currentPixelRatio) {
    APEX_PERFORMANCE.currentPixelRatio = nextRatio;

    renderer.setPixelRatio(nextRatio);

    APEX_PERFORMANCE.lastAdjustment = timestamp;

    console.info(
      "[Apex Performance]",
      Math.round(fps) + " FPS",
      "Pixel ratio:",
      nextRatio.toFixed(2)
    );
  }
}
function apexCreatePerformanceMonitor() {
  let monitor = document.getElementById(
    "apex-performance-monitor"
  );

  if (monitor) return monitor;

  monitor = document.createElement("div");
  monitor.id = "apex-performance-monitor";

  monitor.innerHTML = `
    <span>
      <span class="apex-perf-label">FPS </span>
      <span class="apex-perf-value" id="apex-fps">--</span>
    </span>

    <span>
      <span class="apex-perf-label">QUALITY </span>
      <span class="apex-perf-value" id="apex-quality">--</span>
    </span>
  `;

  document.body.appendChild(monitor);

  return monitor;
}

const apexPerformanceMonitor =
  apexCreatePerformanceMonitor();

let apexMonitorFrames = 0;
let apexMonitorStart = 0;

function apexUpdatePerformanceMonitor(timestamp) {
  if (!Number.isFinite(timestamp)) return;

  apexMonitorFrames++;

  if (!apexMonitorStart) {
    apexMonitorStart = timestamp;
    return;
  }

  const elapsed = timestamp - apexMonitorStart;

  if (elapsed < 500) return;

  const fps = Math.round(
    apexMonitorFrames * 1000 / elapsed
  );

  const fpsElement = document.getElementById("apex-fps");
  const qualityElement =
    document.getElementById("apex-quality");

  if (fpsElement) {
    fpsElement.textContent = String(fps);
  }

  if (qualityElement) {
    qualityElement.textContent =
      Math.round(
        APEX_PERFORMANCE.currentPixelRatio * 100
      ) + "%";
  }

  apexPerformanceMonitor.classList.toggle(
    "apex-perf-warning",
    fps < 43
  );

  apexMonitorFrames = 0;
  apexMonitorStart = timestamp;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.1));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x91b7c7);
scene.fog = new THREE.Fog(0x91b7c7, 420, 1900);

const camera = new THREE.PerspectiveCamera(
  68, innerWidth / innerHeight, 0.1, 6000
);
scene.add(camera);

scene.add(new THREE.HemisphereLight(0xeaf7ff, 0x66715a, 2.65));
scene.add(new THREE.AmbientLight(0xffffff, 0.28));

const sun = new THREE.DirectionalLight(0xfff5df, 3.35);
sun.position.set(-55, 100, -35);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -650;
sun.shadow.camera.right = 650;
sun.shadow.camera.top = 650;
sun.shadow.camera.bottom = -650;
sun.shadow.bias = -0.0005;
scene.add(sun);

const mat = (color, roughness = 0.75, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

function createAsphaltTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  const image = context.createImageData(canvas.width, canvas.height);
  let seed = 713;
  for (let i = 0; i < image.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const grain = 195 + seed % 48;
    image.data[i] = grain;
    image.data[i + 1] = grain;
    image.data[i + 2] = grain;
    image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

const M = {
  grass: mat(0x47734a),
  road: mat(0x303538, 0.95),
  white: mat(0xf1f0e7),
  red: mat(0xe4483c),
  black: mat(0x111718, 0.35, 0.2),
  glass: mat(0x83c4d7, 0.22, 0.25),
  lime: mat(0xd8ff3e, 0.3, 0.12),
  trunk: mat(0x604630),
  curbRed: mat(0xe6483d),
  curbWhite: mat(0xf1eee2),
  barrier: mat(0x9ba9a7, 0.45, 0.12),
  tire: mat(0x17191a, 0.95),
  metal: mat(0x8e9c9b, 0.3, 0.8)
};
M.road.map = createAsphaltTexture();

// Camera-attached cockpit interior. It stays hidden in chase/hood/TV views.
const cockpit = new THREE.Group();
cockpit.name = "driver-cockpit-interior";
cockpit.visible = false;
const cockpitMat = new THREE.MeshStandardMaterial({ color: 0x151b1d, roughness: 0.42, metalness: 0.42, side: THREE.DoubleSide });
const cockpitCarbon = new THREE.MeshStandardMaterial({ color: 0x252d30, roughness: 0.34, metalness: 0.25 });
const cockpitGlass = new THREE.MeshBasicMaterial({ color: 0x8ed9ee, transparent: true, opacity: 0.055, side: THREE.DoubleSide, depthWrite: false });
function cockpitPart(geometry, material, position, rotation = null) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  cockpit.add(mesh);
  return mesh;
}
// More visible driver cockpit: dashboard, broad tinted windshield, pillars,
// roof edge, lower sill, vents, rear-view mirror, wipers and instrument binnacle.
cockpitPart(new THREE.BoxGeometry(1.9, 0.19, 0.58), cockpitCarbon, [0, -0.49, -0.96], [-0.12, 0, 0]);
cockpitPart(new THREE.PlaneGeometry(1.78, 0.68), cockpitGlass, [0, -0.005, -1.47], [0, 0, 0]);
cockpitPart(new THREE.BoxGeometry(0.075, 0.72, 0.1), cockpitMat, [-0.88, -0.005, -1.39], [0, 0, -0.16]);
cockpitPart(new THREE.BoxGeometry(0.075, 0.72, 0.1), cockpitMat, [0.88, -0.005, -1.39], [0, 0, 0.16]);
// No roof crossbar: keep the upper windshield completely open for visibility.
cockpitPart(new THREE.BoxGeometry(1.98, 0.12, 0.62), cockpitMat, [0, -0.91, -0.95], [0.06, 0, 0]);
// A slim painted nose/hood edge sits at the bottom of the view; no exterior roof/body is rendered in cockpit mode.
cockpitPart(new THREE.BoxGeometry(1.46, 0.075, 0.7), cockpitCarbon, [0, -0.67, -2.05], [-0.04, 0, 0]);
cockpitPart(new THREE.BoxGeometry(0.07, 0.025, 0.5), cockpitMat, [0, -0.625, -2.07]);
// Dashboard top lip and center infotainment/telemetry screen.
cockpitPart(new THREE.BoxGeometry(1.72, 0.055, 0.12), cockpitMat, [0, -0.42, -1.24], [-0.1, 0, 0]);
cockpitPart(new THREE.BoxGeometry(0.54, 0.24, 0.035), new THREE.MeshBasicMaterial({ color: 0x061619 }), [0, -0.39, -0.78]);
cockpitPart(new THREE.BoxGeometry(0.43, 0.025, 0.014), new THREE.MeshBasicMaterial({ color: 0xd8ff3e }), [0, -0.34, -0.756]);
cockpitPart(new THREE.BoxGeometry(0.38, 0.16, 0.12), cockpitCarbon, [0, -0.59, -0.45]);
cockpitPart(new THREE.BoxGeometry(0.055, 0.19, 0.035), cockpitMat, [-0.37, -0.36, -0.7], [0, 0, -0.16]);
cockpitPart(new THREE.BoxGeometry(0.055, 0.19, 0.035), cockpitMat, [0.37, -0.36, -0.7], [0, 0, 0.16]);
for (const side of [-1, 1]) {
  cockpitPart(new THREE.BoxGeometry(0.14, 0.42, 0.52), cockpitCarbon, [side * 0.78, -0.46, -0.24], [0.06, 0, side * -0.08]);
}
for (let i = 0; i < 3; i++) {
  const vent = cockpitPart(new THREE.BoxGeometry(0.16, 0.025, 0.018), cockpitMat, [-0.62 + i * 0.19, -0.48, -0.77]);
  vent.rotation.z = -0.08;
}
// Rear-view mirror mounted high on the windshield.
cockpitPart(new THREE.BoxGeometry(0.34, 0.085, 0.055), cockpitMat, [0, 0.57, -1.29]);
cockpitPart(new THREE.BoxGeometry(0.28, 0.045, 0.018), new THREE.MeshBasicMaterial({ color: 0x5b777e }), [0, 0.57, -1.32]);
// Twin windshield wipers sit low across the glass.
for (const side of [-1, 1]) {
  const wiper = cockpitPart(new THREE.BoxGeometry(0.72, 0.018, 0.025), cockpitMat, [side * 0.31, -0.35, -1.48]);
  wiper.rotation.z = side * -0.12;
}
const cockpitWheel = new THREE.Group();
cockpitWheel.position.set(0, -0.39, -0.72);
cockpit.add(cockpitWheel);
const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.043, 8, 36), cockpitMat);
cockpitWheel.add(wheelRim);
const wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.065, 16), cockpitCarbon);
wheelHub.rotation.x = Math.PI / 2;
cockpitWheel.add(wheelHub);
const wheelSpokeMat = new THREE.MeshStandardMaterial({ color: 0x78878a, metalness: 0.72, roughness: 0.3 });
for (const [x, y, w, h, rz] of [[0, 0.1, 0.035, 0.22, 0], [-0.09, -0.045, 0.16, 0.035, -0.48], [0.09, -0.045, 0.16, 0.035, 0.48]]) {
  const spoke = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.045), wheelSpokeMat);
  spoke.position.set(x, y, 0.005); spoke.rotation.z = rz; cockpitWheel.add(spoke);
}
for (let i = 0; i < 5; i++) {
  const button = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.025, 0.02), new THREE.MeshBasicMaterial({ color: [0xe4483c, 0xd8ff3e, 0x4db9ff][i % 3] }));
  button.position.set((i - 2) * 0.06, 0.02, 0.04); cockpitWheel.add(button);
}
camera.add(cockpit);

// ============================================================
// TRACK CONFIGURATION
// ============================================================

const MAPS = {
  coast: {
    name: "Coastal GP — Oceanfront Beach Circuit",
    rx: 58,
    rz: 35,
    width: 14,
    grass: 0xcbb887,
    sky: 0x77bce5,
    scenery: "coast",
    difficulty: 1,

    // Beach and ocean scenery settings
    ocean: true,
    beach: true,
    oceanColor: 0x087fbd,
    shallowWaterColor: 0x42c5d9,
    sandColor: 0xe6d09a,
    shorelineWaves: true,
    palmTrees: true,
    coastalRoad: true,

    // Race-grid settings
    gridStart: true,
    gridRows: 6,
    gridSpacing: 8,
    gridSideOffset: 3.2
  },

  // KEEP ALL YOUR OTHER MAPS HERE.

  desert: {
    name: "Desert Canyon",
    rx: 63, rz: 31, width: 13,
    grass: 0xb99a65, sky: 0xe8bd86,
    scenery: "desert", difficulty: 1.1
  },
  forest: {
    name: "Forest Run",
    rx: 49, rz: 42, width: 12,
    grass: 0x294e37, sky: 0x8ba9b0,
    scenery: "forest", difficulty: 1.08
  },
  city: {
    name: "City Circuit",
    rx: 54, rz: 34, width: 15,
    grass: 0x596465, sky: 0x9aabb6,
    scenery: "city", difficulty: 1.05
  },
  stony: {
    name: "Rocky Highlands",
    rx: 76, rz: 49, width: 13,
    grass: 0x777966, sky: 0xa9c1cc,
    scenery: "rocky", difficulty: 1.2
  },
  volcano: {
    name: "Volcano Run",
    rx: 82, rz: 54, width: 12,
    grass: 0x4d4038, sky: 0x9c7772,
    scenery: "volcano", difficulty: 1.3
  },
  snow: {
    name: "Snowfall Summit",
    rx: 72, rz: 57, width: 14,
    grass: 0xdce8ed, sky: 0x9bc7e8,
    scenery: "snow", difficulty: 1.22
  },
  megacircuit: {
    name: "Giant Alpine Circuit",
    rx: 150, rz: 112, width: 16,
    grass: 0x65784f, sky: 0x91b8d9,
    scenery: "mountain", difficulty: 1.35
  },
  stadium: {
    name: "Grandstand Speedway",
    rx: 72, rz: 47, width: 16,
    grass: 0x47734a, sky: 0x9ab9c8,
    scenery: "city", trackShape: "stadium", difficulty: 1.02
  },
  figure8: {
    name: "Forest Grand Loop",
    rx: 83, rz: 62, width: 13,
    grass: 0x294e37, sky: 0x8ba9b0,
    scenery: "forest", trackShape: "forestloop", difficulty: 1.18
  },
  grandprix: {
    name: "Grand Prix Technical",
    rx: 91, rz: 57, width: 14,
    grass: 0x596465, sky: 0x9aabb6,
    scenery: "city", trackShape: "grandprix", difficulty: 1.28
  },
  street: {
    name: "Downtown Street GP",
    rx: 76, rz: 48, width: 13,
    grass: 0x596465, sky: 0x9aabb6,
    scenery: "city", trackShape: "street", difficulty: 1.18
  },
  mountainpass: {
    name: "Alpine Mountain Pass",
    rx: 112, rz: 72, width: 11,
    grass: 0x526b4f, sky: 0x9ab9cf,
    scenery: "mountain", trackShape: "mountainpass", difficulty: 1.42
  },
  highway: {
    name: "Interstate Highway Run",
    rx: 175, rz: 48, width: 16,
    grass: 0x526b4f, sky: 0x9ab9cf,
    scenery: "highway", trackShape: "highway", difficulty: 1.24
  }
};


// A curated collection of highly distinctive extra circuits. They are data-driven to keep the map system
// maintainable and light: one shared road builder, deterministic theme layouts,
// and a small set of reusable scenery families instead of 80 separate engines.
const EXTRA_MAPS = {
  waterpark: { name: 'Splashdown Water Park', rx: 121, rz: 49, width: 13, grass: 0x39a7a0, sky: 0x79c8e8, scenery: 'waterpark', trackShape: "themed", themeCategory: 'waterpark', roadColor: 0x285d68, difficulty: 1.12 },
  underwater: { name: 'Deep Blue Underwater Run', rx: 63, rz: 60, width: 13, grass: 0x0b6b79, sky: 0x073b62, scenery: 'underwater', trackShape: "themed", themeCategory: 'underwater', roadColor: 0x103a50, difficulty: 1.2 },
  mineshaft: { name: 'Abandoned Mineshaft', rx: 121, rz: 49, width: 13, grass: 0x373a3c, sky: 0x272b30, scenery: 'mineshaft', trackShape: "themed", themeCategory: 'mine', roadColor: 0x202326, difficulty: 1.32 },
  wizardland: { name: 'Wizardland Grand Prix', rx: 63, rz: 60, width: 13, grass: 0x4e674a, sky: 0x44336d, scenery: 'wizard', trackShape: "themed", themeCategory: 'wizard', roadColor: 0x312c46, difficulty: 1.24 },
  neoncity: { name: 'Neon Night City', rx: 114, rz: 38, width: 13, grass: 0x252544, sky: 0x090e2c, scenery: 'neon', trackShape: "themed", themeCategory: 'city', roadColor: 0x14182d, difficulty: 1.22 },
  spaceport: { name: 'Orbital Spaceport', rx: 121, rz: 49, width: 13, grass: 0x202938, sky: 0x090d22, scenery: 'space', trackShape: "themed", themeCategory: 'space', roadColor: 0x343943, difficulty: 1.28 },
  jungle: { name: 'Lost Jungle Run', rx: 100, rz: 58, width: 13, grass: 0x275b36, sky: 0x254a30, scenery: 'jungle', trackShape: "themed", themeCategory: 'jungle', roadColor: 0x303b32, difficulty: 1.2 },
  dino: { name: 'Dinosaur Valley', rx: 86, rz: 36, width: 13, grass: 0x52753e, sky: 0x5e8d50, scenery: 'dinosaur', trackShape: "themed", themeCategory: 'jungle', roadColor: 0x484a3c, difficulty: 1.18 },
  icecave: { name: 'Ice Cave Sprint', rx: 107, rz: 69, width: 13, grass: 0xb9e2ed, sky: 0x19394d, scenery: 'icecave', trackShape: "themed", themeCategory: 'ice', roadColor: 0x526d7b, difficulty: 1.3 },
  lavaforge: { name: 'Lava Forge Raceway', rx: 121, rz: 49, width: 13, grass: 0x4b3030, sky: 0x351f26, scenery: 'lava', trackShape: "themed", trackFamily: "forestloop", themeCategory: 'volcano', roadColor: 0x242126, difficulty: 1.38 },
  crystal: { name: 'Crystal Caverns', rx: 107, rz: 69, width: 13, grass: 0x394a60, sky: 0x253b56, scenery: 'crystal', trackShape: "themed", themeCategory: 'crystal', roadColor: 0x292f3d, difficulty: 1.24 },
  pirate: { name: 'Pirate Cove Run', rx: 100, rz: 58, width: 13, grass: 0x4d806b, sky: 0x4f9aa2, scenery: 'pirate', trackShape: "themed", themeCategory: 'coast', roadColor: 0x3a4646, difficulty: 1.19 },
  aquarium: { name: 'Giant Aquarium Loop', rx: 114, rz: 38, width: 13, grass: 0x1c6a70, sky: 0x12566c, scenery: 'aquarium', trackShape: "themed", themeCategory: 'underwater', roadColor: 0x24434e, difficulty: 1.1 },
  toybox: { name: 'Toybox Raceway', rx: 100, rz: 58, width: 13, grass: 0x77b87a, sky: 0xb6d9e8, scenery: 'toybox', trackShape: "themed", themeCategory: 'toy', roadColor: 0x777f83, difficulty: 1.05 },
  bobsled: { name: 'Bobsled Ice Track', rx: 107, rz: 69, width: 13, grass: 0xe2f5f9, sky: 0x8bbdd3, scenery: 'bobsled', trackShape: "themed", themeCategory: 'ice', roadColor: 0x53758b, difficulty: 1.3 },
  canyonbridge: { name: 'Canyon Bridge Run', rx: 77, rz: 40, width: 13, grass: 0x997354, sky: 0xd79b76, scenery: 'canyonbridge', trackShape: "themed", themeCategory: 'desert', roadColor: 0x45403b, difficulty: 1.25 },
  redwoods: { name: 'Redwood Forest', rx: 114, rz: 38, width: 13, grass: 0x2e6545, sky: 0x4e8370, scenery: 'redwoods', trackShape: "themed", themeCategory: 'forest', roadColor: 0x303a36, difficulty: 1.16 },
  dragon: { name: "Dragon's Ember Valley", rx: 100, rz: 58, width: 13, grass: 0x4b4a3a, sky: 0x6d3c36, scenery: 'dragon', trackShape: "themed", themeCategory: 'wizard', roadColor: 0x29282b, difficulty: 1.28 },
}
Object.assign(MAPS, EXTRA_MAPS);

// Large-circuit scale: track footprints are five times wider/longer while cars,
// road width, barriers, and driving physics stay at believable vehicle scale.
const TRACK_SCALE = 5;
for (const config of Object.values(MAPS)) {
  config.rx *= TRACK_SCALE;
  config.rz *= TRACK_SCALE;
}

const CAR_TYPES = {
  formula: {
    name: "Formula Racer", color: 0xd8ff3e,
    acceleration: 29, topSpeed: 69,
    handling: 1.18, grip: 1.15, braking: 36,
    width: 1.9, length: 4.1, price: 0
  },
  gt: {
    name: "GT Sport", color: 0xe4483c,
    acceleration: 25, topSpeed: 63,
    handling: 0.98, grip: 1.05, braking: 34,
    width: 2.0, length: 4.5, price: 0
  },
  rally: {
    name: "Rally Racer", color: 0x36a6ed,
    acceleration: 27, topSpeed: 59,
    handling: 1.3, grip: 1.24, braking: 32,
    width: 2.0, length: 4.0, price: 0
  },
  hyper: {
    name: "Hypercar", color: 0xf1f0e7,
    acceleration: 34, topSpeed: 78,
    handling: 0.94, grip: 0.97, braking: 39,
    width: 2.05, length: 4.7, price: 0
  },
  street: {
    name: "Street RS", color: 0x9cff66,
    acceleration: 23, topSpeed: 58,
    handling: 1.10, grip: 1.10, braking: 31,
    width: 1.88, length: 4.25, price: 900
  },
  endurance: {
    name: "Endurance GT", color: 0x46d7be,
    acceleration: 28, topSpeed: 73,
    handling: 1.08, grip: 1.14, braking: 38,
    width: 2.02, length: 4.75, price: 1400
  },
  muscle: {
    name: "Muscle V8", color: 0xffa329,
    acceleration: 31, topSpeed: 71,
    handling: 0.88, grip: 0.93, braking: 33,
    width: 2.10, length: 4.80, price: 1700
  },
  drift: {
    name: "Drift Spec", color: 0xff4f96,
    acceleration: 28, topSpeed: 65,
    handling: 1.38, grip: 1.00, braking: 34,
    width: 1.98, length: 4.35, price: 1900
  },
  electric: {
    name: "Electric GT", color: 0x8d79ff,
    acceleration: 37, topSpeed: 74,
    handling: 1.02, grip: 1.08, braking: 40,
    width: 2.00, length: 4.55, price: 2200
  },
  prototype: {
    name: "Prototype X", color: 0x5cd4ff,
    acceleration: 36, topSpeed: 82,
    handling: 1.10, grip: 1.12, braking: 42,
    width: 2.08, length: 4.85, price: 3600
  }
};

const AI_LEVELS = {
  easy:   { speed: 24, skill: 0.78, wobble: 0.55 },
  medium: { speed: 31, skill: 0.94, wobble: 0.25 },
  hard:   { speed: 38, skill: 1.04, wobble: 0.10 },
  expert: { speed: 44, skill: 1.12, wobble: 0.025 }
};
const AI_PRESET_LEVELS = { easy: 25, medium: 60, hard: 80, expert: 100 };
let selectedAICount = 3;
let selectedAILevel = 60;

let mapId = "coast";
let mapConfig = MAPS[mapId];
let selectedCarId = "formula";
let player2CarId = "gt";
let selectedCar = CAR_TYPES[selectedCarId];
let selectedTrackId = mapId;
let selectedDifficulty = "medium";

let credits = 1500;
let bestTime = null;
let upgrades = {};
let paintColors = {};
let unlockedCars = ["formula", "gt", "rally", "hyper"];

try {
  credits = Number(localStorage.getItem("apexCredits")) || 1500;
  bestTime = Number(localStorage.getItem("apexBestTime")) || null;
  const saved = JSON.parse(localStorage.getItem("apexGarage") || "{}");
  selectedCarId = CAR_TYPES[saved.car] ? saved.car : "formula";
  player2CarId = CAR_TYPES[saved.player2Car] ? saved.player2Car : "gt";
  paintColors = saved.paintColors && typeof saved.paintColors === "object" ? saved.paintColors : {};
  selectedCar = { ...CAR_TYPES[selectedCarId], color: Number(paintColors[selectedCarId]) || CAR_TYPES[selectedCarId].color };
  mapId = MAPS[saved.track] ? saved.track : "coast";
  mapConfig = MAPS[mapId];
  selectedTrackId = mapId;
  selectedDifficulty = AI_LEVELS[saved.difficulty] ? saved.difficulty : "medium";
  selectedAILevel = clamp(Number(saved.aiLevel) || AI_PRESET_LEVELS[selectedDifficulty], 1, 100);
  selectedDifficulty = selectedAILevel <= 30 ? "easy" : selectedAILevel <= 60 ? "medium" : selectedAILevel <= 80 ? "hard" : "expert";
  upgrades = saved.upgrades || {};
  unlockedCars = Array.isArray(saved.unlockedCars)
    ? [...new Set(["formula", ...saved.unlockedCars.filter(id => CAR_TYPES[id])])]
    : ["formula", "gt", "rally", "hyper"];
} catch (error) {
  console.warn("Garage save could not be loaded.", error);
}

const upgradeDefinitions = {
  engine: { name: "ENGINE POWER", description: "Faster acceleration", base: 450 },
  brakes: { name: "RACING BRAKES", description: "Shorter braking distance", base: 400 },
  grip: { name: "TIRE & GRIP", description: "Improved cornering traction", base: 500 },
  aero: { name: "AERODYNAMICS", description: "Higher potential top speed", base: 600 }
};

function getUpgradeLevel(id) {
  return clamp(Number(upgrades[selectedCarId]?.[id]) || 0, 0, 5);
}

function getStats() {
  const level = id => getUpgradeLevel(id);
  return {
    acceleration: selectedCar.acceleration * (1 + level("engine") * 0.09),
    topSpeed: selectedCar.topSpeed * (1 + level("aero") * 0.045),
    handling: selectedCar.handling * (1 + level("grip") * 0.07),
    grip: selectedCar.grip * (1 + level("grip") * 0.09),
    braking: selectedCar.braking * (1 + level("brakes") * 0.1)
  };
}

function saveGarage() {
  try {
    localStorage.setItem("apexCredits", String(credits));
    localStorage.setItem("apexBestTime", String(bestTime || ""));
    localStorage.setItem("apexGarage", JSON.stringify({
      car: selectedCarId,
      player2Car: player2CarId,
      track: mapId,
      difficulty: selectedDifficulty,
      aiLevel: selectedAILevel,
      upgrades,
      paintColors,
      unlockedCars
    }));
  } catch (error) {
    console.warn("Garage saving unavailable.", error);
  }
}

function updateCredits() {
  $("credits").textContent = Math.floor(credits).toLocaleString();
  saveGarage();
}

// ============================================================
// WORLD GENERATION
// ============================================================

const world = new THREE.Group();
scene.add(world);

// A dedicated showroom scene lives around the player's current display position.
// The track world is hidden while browsing the garage, giving the selected car
// a clean, enclosed motorsport workshop rather than a car floating on the circuit.
const showroom = new THREE.Group();
showroom.visible = false;
scene.add(showroom);
function buildShowroom() {
  while (showroom.children.length) {
    const child = showroom.children[0];
    showroom.remove(child);
    child.traverse?.(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material && !Array.isArray(obj.material)) obj.material.dispose();
      else if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
    });
  }
  const add = (geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z); mesh.receiveShadow = true; mesh.castShadow = true;
    showroom.add(mesh); return mesh;
  };
  const concrete = new THREE.MeshStandardMaterial({color:0x252e31, roughness:0.82});
  const wall = new THREE.MeshStandardMaterial({color:0x11191c, roughness:0.7, metalness:0.12, side:THREE.DoubleSide});
  const glass = new THREE.MeshStandardMaterial({color:0x46717b, roughness:0.18, metalness:0.2, transparent:true, opacity:0.42, side:THREE.DoubleSide});
  const lime = new THREE.MeshStandardMaterial({color:0xd8ff3e, emissive:0x354d08, emissiveIntensity:0.6, roughness:0.4});
  const steel = new THREE.MeshStandardMaterial({color:0x67767a, metalness:0.7, roughness:0.3});
  add(new THREE.BoxGeometry(58,0.18,46), concrete, 0,-0.12,0);
  add(new THREE.BoxGeometry(58,11,0.8), wall, 0,5.4,-22.5);
  add(new THREE.BoxGeometry(0.8,11,45), wall, -28.5,5.4,0);
  add(new THREE.BoxGeometry(0.8,11,45), wall, 28.5,5.4,0);
  // Rear glass panels and architectural steel uprights.
  for (let x=-22; x<=22; x+=11) {
    add(new THREE.BoxGeometry(0.22,8.2,0.24), steel, x,4.1,-21.95);
    add(new THREE.BoxGeometry(10.5,7.6,0.08), glass, x+5.3,4.25,-21.92);
    add(new THREE.BoxGeometry(0.18,9,0.24), steel, x,4.5,21.95);
  }
  add(new THREE.BoxGeometry(56,0.22,0.28), lime, 0,9.55,-21.95);
  // Illuminated display platform, perimeter strips and a rear feature wall.
  add(new THREE.CylinderGeometry(7.4,7.4,0.12,64), steel, 0,-0.08,0);
  add(new THREE.CylinderGeometry(7.15,7.15,0.06,64), concrete, 0,0.01,0);
  const ring = add(new THREE.TorusGeometry(7.18,0.055,8,80), lime, 0,0.045,0); ring.rotation.x=Math.PI/2;
  add(new THREE.BoxGeometry(18,2.4,0.4), wall, 0,6.6,-21.4);
  add(new THREE.BoxGeometry(12,0.08,0.08), lime, 0,7.5,-21.15);
  // Ceiling light rails frame the car but leave the camera's view open.
  for (const x of [-18,-6,6,18]) {
    add(new THREE.BoxGeometry(0.22,0.18,30), steel, x,10.2,0);
    add(new THREE.BoxGeometry(0.48,0.1,24), new THREE.MeshBasicMaterial({color:0xe8f6ed}), x,10.08,0);
  }
  // Low pit cabinets and tool benches on both sides of the display area.
  for (const side of [-1,1]) {
    add(new THREE.BoxGeometry(8,1.25,1.2), wall, side*20,0.62,-9);
    add(new THREE.BoxGeometry(8.1,0.08,1.3), steel, side*20,1.29,-9);
    for (let i=0;i<4;i++) add(new THREE.BoxGeometry(0.12,0.6,0.04), lime, side*(16.8+i*2.1),0.67,-8.37);
  }
  showroom.userData.floorMaterial = concrete;
}

let trackCurve;
let trackSampleCache = [];
const TRACK_SAMPLE_COUNT = 480;
let barriers = [];
let checkpointObjects = [];
let roadMesh = null;

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children[0];
    group.remove(child);
    child.traverse?.(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material && obj.material !== M.road &&
          obj.material !== M.white && obj.material !== M.red &&
          obj.material !== M.black && obj.material !== M.lime &&
          obj.material !== M.tire && obj.material !== M.metal &&
          obj.material !== M.barrier && obj.material !== M.grass &&
          obj.material !== M.trunk && obj.material !== M.curbRed &&
          obj.material !== M.curbWhite) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}

function addWorld(mesh) {
  world.add(mesh);
  return mesh;
}

function trackElevation(progress, config = mapConfig) {
  // Only the alpine pass and highway use elevation, keeping every existing
  // flat circuit and its established physics unchanged.
  const t = config.routeMode === "point-to-point"
    ? clamp(progress, 0, 1)
    : ((progress % 1) + 1) % 1;
  if (mapId === "mountainpass") {
    return 11 + 2.8 * Math.cos(t * Math.PI * 2) + 0.7 * Math.sin(t * Math.PI * 4 + 0.45);
  }
  if (mapId === "highway") {
    // Gentle highway rollers and one longer climb/descent, not a roller coaster.
    return 1.9 + Math.sin(t * Math.PI * 2 - 0.8) * 1.65 + Math.sin(t * Math.PI * 4 + 0.2) * 0.32;
  }
  if (mapId === "desert") {
    return 2.2 + Math.sin(t * Math.PI * 2 - 0.35) * 1.7 + Math.sin(t * Math.PI * 4) * 0.35;
  }
  return 0;
}

function smoothTrackCurve(curve, passes = 1, sampleCount = 900) {
  const closed = curve.closed;
  const pointCount = sampleCount + (closed ? 0 : 1);
  const sampleSpacing = Math.max(0.01, curve.getLength() / sampleCount);
  const radius = clamp(Math.round(240 / sampleSpacing), 24, 128);
  const centerWeight = radius * 4;
  let points = Array.from({ length: pointCount }, (_, index) => curve.getPoint(index / sampleCount));

  for (let pass = 0; pass < passes; pass++) {
    const source = points;
    points = source.map((point, index) => {
      if (!closed && (index === 0 || index === source.length - 1)) return point;
      const smoothed = point.clone().multiplyScalar(centerWeight);
      let totalWeight = centerWeight;
      for (let offset = 1; offset <= radius; offset++) {
        const weight = radius + 1 - offset;
        const beforeIndex = closed
          ? (index - offset + source.length) % source.length
          : Math.max(0, index - offset);
        const afterIndex = closed
          ? (index + offset) % source.length
          : Math.min(source.length - 1, index + offset);
        smoothed.addScaledVector(source[beforeIndex], weight);
        smoothed.addScaledVector(source[afterIndex], weight);
        totalWeight += weight * 2;
      }
      return smoothed.multiplyScalar(1 / totalWeight);
    });
  }

  return new THREE.CatmullRomCurve3(points, closed, "centripetal", 0.04);
}

function mountainPassGroundHeight(x, z) {
  const angle = Math.atan2(z, x);
  const normalizedRadius = Math.hypot(x / 380, z / 273);
  const rise = clamp(1 - normalizedRadius, 0, 1);
  const roundedSlope = rise * rise * (3 - 2 * rise);
  const toeBlend = clamp((1.055 - normalizedRadius) / 0.055, 0, 1);
  const toe = 11 * toeBlend * toeBlend * (3 - 2 * toeBlend);
  const roughnessFade = clamp(normalizedRadius * 5, 0, 1);
  const ridgeNoise = (
    Math.sin(angle * 7 + normalizedRadius * 11) +
    Math.sin(angle * 13 - normalizedRadius * 17) * 0.45
  ) * 3.2 * roughnessFade * roundedSlope;
  const summit = 180 * Math.pow(roundedSlope, 1.08) + 24 * Math.exp(-normalizedRadius * 18);
  const innerBench = clamp((normalizedRadius - 0.43) / 0.08, 0, 1);
  const outerBench = 1 - clamp((normalizedRadius - 0.59) / 0.10, 0, 1);
  const innerBlend = innerBench * innerBench * (3 - 2 * innerBench);
  const outerBlend = outerBench * outerBench * (3 - 2 * outerBench);
  const benchBlend = innerBlend * outerBlend;
  const hillside = -0.2 + toe + summit + ridgeNoise * (1 - benchBlend * 0.82);
  return THREE.MathUtils.lerp(hillside, 78, benchBlend);
}

function createTrackCurve(config) {
  // Coast and Desert keep their classic oval-style layouts.
  if (config.scenery === "coast" || config.scenery === "desert") {
    const points = [];
    for (let i = 0; i < 320; i++) {
      const a = i / 320 * Math.PI * 2;
      let x = config.rx * Math.cos(a);
      let z = config.rz * Math.sin(a);
      if (config.scenery === "desert") {
        x += 1.2 * Math.cos(a * 2);
        z += 0.9 * Math.sin(a * 2);
      } else {
        x += 2.2 * Math.sin(a * 3);
        z += 1.6 * Math.sin(a * 5);
      }
      points.push(new THREE.Vector3(x, trackElevation(i / 320, config), z));
    }
    return smoothTrackCurve(new THREE.CatmullRomCurve3(points, true, "centripetal"));
  }

  // Normalized racing-line points make each remaining map a distinct,
  // asymmetric GP-style circuit with hairpins, chicanes, and long straights.
  const layouts = {
    forest: [
      [-.95,-.12],[-.88,-.48],[-.63,-.65],[-.32,-.63],
      [-.15,-.42],[.12,-.42],[.30,-.68],[.62,-.65],
      [.88,-.43],[.91,-.18],[.70,-.04],[.46,-.08],
      [.35,.12],[.68,.25],[.82,.48],[.60,.66],
      [.27,.62],[.08,.39],[-.22,.42],[-.40,.68],
      [-.72,.60],[-.91,.35],[-.77,.13],[-.54,.08]
    ],
    city: [
      [-.95,-.20],[-.91,-.55],[-.65,-.65],[-.35,-.65],
      [-.22,-.43],[.08,-.43],[.20,-.66],[.58,-.66],
      [.88,-.47],[.91,-.20],[.67,-.10],[.43,-.10],
      [.38,.10],[.78,.18],[.88,.43],[.68,.64],
      [.34,.64],[.12,.45],[-.15,.45],[-.30,.66],
      [-.67,.62],[-.89,.40],[-.89,.12],[-.65,.02]
    ],
    rocky: [
      [-.96,-.18],[-.90,-.52],[-.65,-.70],[-.42,-.55],
      [-.24,-.33],[.02,-.38],[.18,-.66],[.50,-.68],
      [.79,-.52],[.92,-.28],[.76,-.10],[.51,-.02],
      [.43,.20],[.70,.32],[.81,.55],[.56,.69],
      [.24,.60],[.04,.39],[-.25,.43],[-.43,.68],
      [-.73,.59],[-.92,.34],[-.78,.15],[-.55,.08]
    ],
    volcano: [
      [-.96,-.22],[-.86,-.56],[-.58,-.66],[-.31,-.57],
      [-.18,-.33],[.08,-.37],[.31,-.67],[.63,-.61],
      [.89,-.38],[.82,-.12],[.59,-.02],[.47,.17],
      [.79,.27],[.87,.53],[.60,.66],[.30,.58],
      [.12,.37],[-.18,.42],[-.39,.68],[-.70,.61],
      [-.90,.38],[-.79,.12],[-.56,.02]
    ],
    snow: [
      [-.96,-.15],[-.90,-.48],[-.68,-.65],[-.38,-.64],
      [-.16,-.46],[.10,-.48],[.27,-.68],[.59,-.64],
      [.87,-.42],[.91,-.15],[.72,.02],[.48,-.03],
      [.34,.17],[.62,.29],[.81,.52],[.57,.67],
      [.26,.62],[.06,.41],[-.23,.43],[-.42,.67],
      [-.72,.57],[-.90,.32],[-.76,.10],[-.53,.05]
    ],
    mountain: [
      [-.97,-.17],[-.91,-.53],[-.68,-.67],[-.40,-.60],
      [-.19,-.39],[.09,-.43],[.25,-.68],[.57,-.66],
      [.87,-.44],[.91,-.18],[.73,-.03],[.48,-.09],
      [.40,.14],[.72,.25],[.84,.49],[.60,.67],
      [.30,.63],[.10,.42],[-.19,.42],[-.40,.68],
      [-.72,.60],[-.92,.36],[-.80,.13],[-.56,.04]
    ],
    megacircuit: [
      [-.98,-.18],[-.92,-.48],[-.75,-.66],[-.47,-.68],
      [-.27,-.48],[-.03,-.45],[.15,-.67],[.45,-.69],
      [.74,-.57],[.94,-.34],[.89,-.10],[.68,.00],
      [.43,-.04],[.31,.15],[.55,.28],[.78,.28],
      [.91,.47],[.76,.66],[.46,.68],[.23,.52],
      [.03,.35],[-.24,.39],[-.39,.65],[-.69,.64],
      [-.91,.43],[-.87,.19],[-.67,.07],[-.48,.08]
    ],
    // Wide-radius stadium loop with a flowing infield chicane.
    stadium: [
      [-.86,-.05],[-.84,-.43],[-.68,-.66],[-.35,-.72],[.20,-.72],[.62,-.63],
      [.83,-.39],[.85,-.12],[.69,.02],[.42,.00],[.22,.12],[.34,.30],
      [.65,.34],[.82,.50],[.68,.70],[.22,.73],[-.35,.73],[-.72,.62],[-.87,.36]
    ],
    // Non-crossing forest GP loop. This replaces the old figure-eight crossover:
    // a single continuous ribbon means the road, curbs, and fence never need to
    // pass through one another at a same-level X intersection.
    forestloop: [
      // Wide, flowing perimeter circuit. No inward-pointing hairpin or near-touching
      // return section, so the outside fence cannot fold across the racing surface.
      [-.96,-.20],[-.92,-.48],[-.76,-.66],[-.48,-.72],[-.18,-.70],
      [.14,-.70],[.48,-.66],[.76,-.51],[.92,-.28],[.95,.02],
      [.88,.31],[.70,.54],[.43,.68],[.12,.72],[-.20,.70],
      [-.50,.66],[-.76,.52],[-.91,.30],[-.96,.02]
    ],
    grandprix: [
      [-.92,-.20],[-.88,-.54],[-.62,-.69],[-.25,-.68],[.05,-.54],[.30,-.68],
      [.66,-.62],[.88,-.40],[.91,-.12],[.72,.02],[.48,-.02],[.36,.15],
      [.61,.27],[.83,.48],[.66,.68],[.30,.67],[.08,.48],[-.17,.46],[-.36,.68],
      [-.70,.62],[-.90,.38],[-.88,.12],[-.62,.02],[-.40,.10],[-.25,.02]
    ],
    street: [
      [-.90,-.24],[-.88,-.56],[-.62,-.66],[-.32,-.66],[-.18,-.48],[-.18,-.18],
      [.08,-.12],[.34,-.18],[.34,-.53],[.62,-.58],[.86,-.38],[.87,-.08],
      [.62,.02],[.42,.02],[.38,.28],[.70,.36],[.82,.58],[.58,.68],[.25,.62],
      [.04,.42],[-.28,.42],[-.44,.66],[-.72,.58],[-.88,.34],[-.68,.15],[-.44,.12]
    ],
    // Rocky Alpine circuit: a single non-crossing ribbon around the mountain.
    // The course forms a broad, flowing ring around the central summit.
    mountainpass: Array.from({ length: 36 }, (_, index) => {
      const angle = index / 36 * Math.PI * 2;
      const radiusX = 0.38 + Math.cos(angle * 3) * 0.012;
      const radiusZ = 0.43 + Math.sin(angle * 2) * 0.015;
      return [Math.cos(angle) * radiusX, Math.sin(angle) * radiusZ];
    }),
    // A very long, broad highway-style loop with long straights and sweeping bends.
    highway: [
      [-.98,-.12],[-.96,-.30],[-.86,-.43],[-.64,-.49],[-.35,-.50],[.02,-.50],
      [.38,-.49],[.68,-.44],[.88,-.31],[.96,-.12],[.96,.10],[.87,.30],
      [.68,.42],[.40,.46],[.05,.47],[-.30,.47],[-.62,.45],[-.84,.36],[-.96,.20]
    ]
  };

  let layout = layouts[config.trackShape || config.scenery];
  if (config.themeCategory) {
    // The themed tracks no longer all share one perimeter. Pick from several
    // non-crossing, authored racing-line families so each map has a different
    // silhouette: flowing oval, long sweeper, stadium/infield, GP bends, or
    // mountain-style perimeter. Each family is smoothed below before mesh build.
    const seed = [...config.name].reduce((sum,ch)=>sum+ch.charCodeAt(0),0);
    const families = [layouts.forestloop, layouts.stadium, layouts.highway,
      layouts.grandprix, layouts.street, layouts.megacircuit,
      layouts.rocky];
    const family = layouts[config.trackFamily] || families[seed % families.length];
    layout = family.map(([x,z],i)=>{
      const variation = (((seed + i * 11) % 5) - 2) * 0.008;
      return [x * (1 + variation), z * (1 - variation * 0.65)];
    });
    // Add subtle map-specific variation without introducing crossing segments.
    const wobble = (seed % 7) * 0.006;
    layout = layout.map(([x,z],i)=>[
      x + Math.sin((i + seed % 9) * 1.17) * wobble,
      z + Math.cos((i + seed % 7) * 0.91) * wobble
    ]);
  }
  if (layout) {
    // Round every authored layout before building the road. Two Chaikin corner-
    // cutting passes remove sudden direction changes while retaining each map's
    // overall character. More evenly spaced control points also stop barrier
    // offsets from folding inward at tight corners.
    let smoothLayout = layout.map(point => [point[0], point[1]]);
    const isClosedRoute = config.routeMode !== "point-to-point";
    const smoothingPasses = config.scenery === "lava" ? 6 : 5;
    for (let pass = 0; pass < smoothingPasses; pass++) {
      const rounded = [];
      const segmentCount = isClosedRoute ? smoothLayout.length : smoothLayout.length - 1;
      if (!isClosedRoute) rounded.push(smoothLayout[0]);
      for (let i = 0; i < segmentCount; i++) {
        const a = smoothLayout[i];
        const b = smoothLayout[(i + 1) % smoothLayout.length];
        rounded.push(
          [a[0] * 0.72 + b[0] * 0.28, a[1] * 0.72 + b[1] * 0.28],
          [a[0] * 0.28 + b[0] * 0.72, a[1] * 0.28 + b[1] * 0.72]
        );
      }
      if (!isClosedRoute) rounded.push(smoothLayout[smoothLayout.length - 1]);
      smoothLayout = rounded;
    }
    const points = smoothLayout.map(([x, z], index) => {
      const progress = index / (isClosedRoute ? smoothLayout.length : smoothLayout.length - 1);
      const worldX = x * config.rx;
      const worldZ = z * config.rz;
      const height = mapId === "mountainpass"
        ? mountainPassGroundHeight(worldX, worldZ) + 0.18
        : trackElevation(progress, config);
      return new THREE.Vector3(worldX, height, worldZ);
    });
    return smoothTrackCurve(new THREE.CatmullRomCurve3(points, isClosedRoute, "centripetal", 0.04));
  }

  const points = [];
  for (let i = 0; i < 320; i++) {
    const a = i / 320 * Math.PI * 2;
    points.push(new THREE.Vector3(
      config.rx * Math.cos(a), 0, config.rz * Math.sin(a)
    ));
  }
  return smoothTrackCurve(new THREE.CatmullRomCurve3(points, true, "centripetal"));
}

function poseAt(progress, lane = 0) {
  const t = mapConfig.routeMode === "point-to-point"
    ? clamp(progress, 0, 1)
    : ((progress % 1) + 1) % 1;
  const position = trackCurve.getPointAt(t);
  const tangent = trackCurve.getTangentAt(t);
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

  position.addScaledVector(normal, lane);
  if (mapId === "mountainpass") {
    position.y = mountainPassGroundHeight(position.x, position.z) + 0.18;
  }

  return {
    position, tangent, normal,
    yaw: Math.atan2(tangent.x, tangent.z)
  };
}

function trackCurvatureAt(progress) {
  const length = Math.max(1, trackCurve.getLength());
  const delta = Math.min(0.003, 7 / length);
  const closed = mapConfig.routeMode !== "point-to-point";
  const beforeT = closed ? ((progress - delta + 1) % 1) : clamp(progress - delta, 0, 1);
  const afterT = closed ? ((progress + delta) % 1) : clamp(progress + delta, 0, 1);
  const before = trackCurve.getTangentAt(beforeT);
  const after = trackCurve.getTangentAt(afterT);
  const angle = Math.acos(clamp(before.dot(after), -1, 1));
  return angle / Math.max(0.01, 2 * delta * length);
}

function rebuildTrackSampleCache() {
  if (!trackCurve) { trackSampleCache = []; return; }
  const closed = mapConfig.routeMode !== "point-to-point";
  const count = TRACK_SAMPLE_COUNT;
  trackSampleCache = Array.from(
    { length: count + (closed ? 0 : 1) },
    (_, i) => ({ t: i / count, point: trackCurve.getPointAt(i / count) })
  );
}

function nearestTrackPoint(position) {
  // Compare against precomputed centerline points. This is much cheaper than
  // repeatedly evaluating Three.js arc-length interpolation for every prop.
  let bestT = 0;
  let bestD = Infinity;
  for (let i = 0; i < trackSampleCache.length; i++) {
    const sample = trackSampleCache[i];
    const dx = sample.point.x - position.x;
    const dz = sample.point.z - position.z;
    const d = dx * dx + dz * dz;
    if (d < bestD) { bestD = d; bestT = sample.t; }
  }
  const pose = poseAt(bestT);
  const dx = position.x - pose.position.x;
  const dz = position.z - pose.position.z;
  return {
    progress: bestT,
    distance: Math.sqrt(bestD),
    lateral: dx * pose.normal.x + dz * pose.normal.z,
    pose
  };
}

function sceneryPositionIsClear(position, extraClearance = 0) {
  // Measure against the closest point on the entire track spline, not only the local offset.
  const nearest = nearestTrackPoint(position);
  return nearest.distance >= mapConfig.width / 2 + 8 + extraClearance;
}

function safeSceneryPose(progress, side, requestedOffset, extraClearance = 0) {
  // If another part of a tight circuit comes close, push scenery farther into the surrounding land.
  for (let attempt = 0; attempt < 10; attempt++) {
    const pose = poseAt(progress, side * (requestedOffset + attempt * 24));
    if (sceneryPositionIsClear(pose.position, extraClearance)) return pose;
  }
  return null;
}

function buildRoad() {
  const vertices = [];
  const uvs = [];
  const indices = [];
  // Sample densely enough that tight bends stay smooth instead of forming
  // long straight facets that can look like a broken or folded road.
  const trackLength = trackCurve.getLength();
  const steps = Math.max(1800, Math.min(12000, Math.ceil(trackLength / 1.15)));
  const half = mapConfig.width / 2;

  for (let i = 0; i <= steps; i++) {
    const p = trackCurve.getPointAt(i / steps);
    const tangent = trackCurve.getTangentAt(i / steps);
    const n = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const leftX = p.x + n.x * half;
    const leftZ = p.z + n.z * half;
    const rightX = p.x - n.x * half;
    const rightZ = p.z - n.z * half;
    const leftY = mapId === "mountainpass" ? mountainPassGroundHeight(leftX, leftZ) + 0.26 : p.y + 0.04;
    const rightY = mapId === "mountainpass" ? mountainPassGroundHeight(rightX, rightZ) + 0.26 : p.y + 0.04;
    vertices.push(leftX, leftY, leftZ, rightX, rightY, rightZ);
    const distanceU = i / steps * trackLength / 9;
    uvs.push(0, distanceU, 1, distanceU);

    if (i < steps) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = M.road.clone();
  if (mapConfig.roadColor) material.color.setHex(mapConfig.roadColor);
  if (mapConfig.themeCategory === "neon" || mapConfig.themeCategory === "space" || mapConfig.themeCategory === "wizard") {
    material.roughness = 0.55;
    material.metalness = 0.12;
  }
  material.side = THREE.DoubleSide;
  roadMesh = addWorld(new THREE.Mesh(geometry, material));
  roadMesh.receiveShadow = true;

  // Continuous bright edge lines help judge the road in every lighting condition.
  // They follow the actual circuit curve rather than forming a generic oval.
  for (const side of [-1, 1]) {
    const edgePoints = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = trackCurve.getPointAt(t);
      const tangent = trackCurve.getTangentAt(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const x = p.x + normal.x * side * (half - 0.78);
      const z = p.z + normal.z * side * (half - 0.78);
      const y = mapId === "mountainpass" ? mountainPassGroundHeight(x, z) + 0.34 : p.y + 0.105;
      edgePoints.push(new THREE.Vector3(x, y, z));
    }
    const edgeGeometry = new THREE.BufferGeometry().setFromPoints(edgePoints);
    const edgeLine = new THREE.Line(
      edgeGeometry,
      new THREE.LineBasicMaterial({ color: 0xf2f4ed, transparent: true, opacity: 0.92 })
    );
    addWorld(edgeLine);
  }

  // Subtle racing-line distance boards at regular braking zones.
  for (let i = 0; i < 12; i++) {
    const progress = (i + 1) / 13;
    const pose = safeSceneryPose(progress, 1, mapConfig.width / 2 + 9, 2.2) || safeSceneryPose(progress, -1, mapConfig.width / 2 + 9, 2.2);
    if (!pose) continue;
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 1.0, 1.25),
      mat(i % 2 ? 0xf0f1eb : 0xd8ff3e, 0.72)
    );
    board.position.copy(pose.position);
    board.position.y = 0.52;
    board.rotation.y = pose.yaw;
    board.castShadow = true;
    addWorld(board);
  }
}

function buildHighwayDetails() {
  // Shared modern road-marking system for every paved street-style circuit.
  // It uses the exact racing spline, so the markings follow bends and elevation
  // instead of cutting across corners or drifting away from the asphalt.
  const streetMaps = new Set(["coast", "desert", "city", "stadium", "grandprix", "street", "highway"]);
  if (!streetMaps.has(mapId) && !mapConfig.themeCategory) return;

  const half = mapConfig.width / 2;
  const isHighway = mapId === "highway" || mapConfig.themeCategory === "highway";
  const isUrban = ["city", "stadium", "grandprix", "street"].includes(mapId);
  const white = mapConfig.themeCategory === "neon" || mapConfig.themeCategory === "space" ? 0x80f4ff : 0xf5f5ef;
  const yellow = mapConfig.themeCategory === "wizard" ? 0xffd66b : mapConfig.themeCategory === "underwater" ? 0x44f0dd : 0xffc928;

  function makeCurveLine(offset, color, yLift = 0.145, opacity = 0.98) {
    const pts = [];
    const samples = Math.max(1400, Math.min(7200, Math.ceil(trackCurve.getLength() / 1.2)));
    for (let i = 0; i <= samples; i++) {
      const pose = poseAt(i / samples);
      pose.position.addScaledVector(pose.normal, offset);
      pose.position.y += yLift;
      pts.push(pose.position);
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity })
    );
    line.frustumCulled = false;
    addWorld(line);
  }

  function makeDashedLine(offset, color, dashLength = 5.2, gapLength = 4.6, yLift = 0.155) {
    // Build all dashes into one LineSegments object to keep draw calls low.
    const length = trackCurve.getLength();
    const dashCount = Math.max(45, Math.min(600, Math.floor(length / (dashLength + gapLength))));
    const pts = [];
    for (let i = 0; i < dashCount; i++) {
      const d0 = i * (length / dashCount);
      const d1 = Math.min(length, d0 + Math.min(dashLength, length / dashCount * 0.74));
      const t0 = d0 / length, t1 = d1 / length;
      const a = poseAt(t0), b = poseAt(t1);
      a.position.addScaledVector(a.normal, offset); b.position.addScaledVector(b.normal, offset);
      a.position.y += yLift; b.position.y += yLift;
      pts.push(a.position.x, a.position.y, a.position.z, b.position.x, b.position.y, b.position.z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const line = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color }));
    line.frustumCulled = false;
    addWorld(line);
  }

  // Bright outer edge lines and an inner shoulder boundary make the usable
  // road width legible at speed. The highway gets broader shoulder markings.
  makeCurveLine(-half + (isHighway ? 1.05 : 0.62), white, 0.16);
  makeCurveLine( half - (isHighway ? 1.05 : 0.62), white, 0.16);

  if (isHighway) {
    // Interstate-style four-lane layout: broken white lane dividers and a
    // double-yellow median. Every line follows the same curved road surface.
    makeDashedLine(-half * 0.5, white, 5.8, 5.2, 0.17);
    makeDashedLine( half * 0.5, white, 5.8, 5.2, 0.17);
    makeCurveLine(-0.22, yellow, 0.18);
    makeCurveLine( 0.22, yellow, 0.18);
  } else if (isUrban) {
    // City and downtown courses use a double-yellow centreline plus broken
    // white lane guides, giving them the same polished asphalt language.
    makeCurveLine(-0.16, yellow, 0.17);
    makeCurveLine( 0.16, yellow, 0.17);
    makeDashedLine(-half * 0.31, white, 3.8, 5.4, 0.16);
    makeDashedLine( half * 0.31, white, 3.8, 5.4, 0.16);
  } else if (mapConfig.themeCategory) {
    makeDashedLine(-half * 0.33, white, 4.6, 6.2, 0.16);
    makeDashedLine( half * 0.33, white, 4.6, 6.2, 0.16);
    makeCurveLine(-half + 0.7, yellow, 0.16, 0.9);
    makeCurveLine( half - 0.7, yellow, 0.16, 0.9);
  } else {
    // Coastal/desert paved circuits get subtle dashed racing-lane guides while
    // retaining their existing curb colors and biome-specific scenery.
    makeDashedLine(0, white, 4.8, 7.0, 0.15);
  }

  // Reflective shoulder studs: sparse enough to avoid visual clutter, dense
  // enough to communicate road edges at night or in fog. Reuse one instanced
  // mesh rather than creating hundreds of individual meshes.
  const studCount = isHighway ? 320 : isUrban ? 220 : 150;
  const studGeo = new THREE.BoxGeometry(0.20, 0.055, 0.28);
  const studMat = mat(isHighway ? 0xf4d58a : 0xe8e8df, 0.42);
  const studs = new THREE.InstancedMesh(studGeo, studMat, studCount * 2);
  const dummy = new THREE.Object3D();
  let index = 0;
  for (let i = 0; i < studCount; i++) {
    const t = i / studCount;
    for (const side of [-1, 1]) {
      const pose = poseAt(t, side * (half - 0.38));
      dummy.position.set(pose.position.x, pose.position.y + 0.19, pose.position.z);
      dummy.rotation.set(0, pose.yaw, 0);
      dummy.updateMatrix();
      studs.setMatrixAt(index++, dummy.matrix);
    }
  }
  studs.instanceMatrix.needsUpdate = true;
  addWorld(studs);

  if (isHighway) {
    // Larger green interstate signs, positioned well outside the barrier zone.
    for (const t of [0.13, 0.38, 0.63, 0.86]) {
      const pose = safeSceneryPose(t, t < 0.5 ? 1 : -1, half + 24, 5);
      if (!pose) continue;
      const sign = new THREE.Group();
      const postMat = M.metal;
      const boardMat = mat(0x17623b, 0.55);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 5.5, 0.22), postMat);
      post.position.y = 2.75; sign.add(post);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(5.8, 2.25, 0.22), boardMat);
      panel.position.set(0, 5.0, 0); sign.add(panel);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.25, 0.08, 0.25), mat(0xf3f3df));
      stripe.position.set(0, 4.25, 0); sign.add(stripe);
      sign.position.copy(pose.position);
      sign.rotation.y = pose.yaw;
      sign.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      addWorld(sign);
    }
  }

  if (isUrban) {
    // Four compact zebra-crossing bars per lap add scale and recognizable city
    // street detail. They stay entirely on the asphalt and track its tangent.
    const stripeMaterial = mat(0xe8e9e5, 0.58);
    const stripeGeo = new THREE.BoxGeometry(Math.max(0.18, half * 1.55), 0.035, 0.36);
    for (const t of [0.12, 0.37, 0.62, 0.87]) {
      const pose = poseAt(t);
      const crossing = new THREE.Group();
      for (let j = -3; j <= 3; j++) {
        const stripe = new THREE.Mesh(stripeGeo, stripeMaterial);
        stripe.position.set(0, 0.19, j * 0.68);
        crossing.add(stripe);
      }
      // Group local X spans across the road; local Z aligns with the road.
      crossing.position.copy(pose.position);
      crossing.rotation.y = pose.yaw;
      addWorld(crossing);
    }
  }
}

function buildCurbsAndBarriers() {
  barriers = [];

  // Keep the original road and driving line, but sample its edge by distance
  // rather than using a fixed count. This prevents large gaps on long tracks
  // and reduces overlapping barrier blocks on tight turns.
  const length = trackCurve.getLength();
  const count = Math.max(320, Math.min(2400, Math.ceil(length / 2.0)));
  const postSpacing = Math.max(1, Math.min(3.2, length / count));
  const postCount = Math.max(2, Math.ceil(length / postSpacing));
  const baseFenceOffset = mapConfig.width / 2 + (mapId === "stadium" ? 8.0 : 7.0);
  const postHeight = 2.55;
  const fenceClearance = mapConfig.width / 2 + 5.0;
  const fencePoseCache = new Map();
  const isClosedRoute = mapConfig.routeMode !== "point-to-point";
  const pitLaneEnabled = !mapConfig.themeCategory && isClosedRoute;

  function pitFenceGap(progress) {
    const t = ((progress % 1) + 1) % 1;
    return (t >= 0.89 && t <= 0.96) || (t >= 0.04 && t <= 0.11);
  }

  function requiredFenceOffset(t, side) {
    const sampleDelta = Math.min(0.0025, 2.5 / length);
    const before = trackCurve.getTangentAt((t - sampleDelta + 1) % 1);
    const after = trackCurve.getTangentAt((t + sampleDelta) % 1);
    const turn = Math.atan2(
      before.x * after.z - before.z * after.x,
      before.dot(after)
    );
    const curvature = turn / (2 * sampleDelta * length);
    let offset = baseFenceOffset;

    if (curvature * side > 0) {
      const radius = 1 / Math.abs(curvature);
      offset = Math.min(baseFenceOffset, Math.max(fenceClearance, radius - 1.5));
    }

    return offset;
  }

  const fenceOffsets = new Map();
  for (const side of [-1, 1]) {
    const offsetCount = count + (isClosedRoute ? 0 : 1);
    const offsets = new Float32Array(offsetCount);
    for (let i = 0; i < offsetCount; i++) {
      offsets[i] = requiredFenceOffset(i / count, side);
    }

    // Propagate outward adjustments gradually around the loop so rails never
    // bridge from a pushed-out point straight back onto the racing surface.
    const maxChangePerSample = Math.max(0.06, length / count * 0.2);
    // A few forward/backward relaxation passes smooth the offset without the
    // old worst-case O(n²) loop on long circuits.
    for (let pass = 0; pass < 5; pass++) {
      for (let i = 1; i < count; i++) {
        offsets[i] = clamp(offsets[i], offsets[i - 1] - maxChangePerSample, offsets[i - 1] + maxChangePerSample);
      }
      for (let i = count - 2; i >= 0; i--) {
        offsets[i] = clamp(offsets[i], offsets[i + 1] - maxChangePerSample, offsets[i + 1] + maxChangePerSample);
      }
      if (isClosedRoute) {
        const seamAverage = (offsets[0] + offsets[count - 1]) * 0.5;
        offsets[0] = seamAverage;
        offsets[count - 1] = seamAverage;
      }
    }
    fenceOffsets.set(side, offsets);
  }

  function safeFencePose(t, side) {
    const progress = isClosedRoute
      ? ((t % 1) + 1) % 1
      : clamp(t, 0, 1);
    const cacheKey = `${side}:${progress}`;
    if (fencePoseCache.has(cacheKey)) return fencePoseCache.get(cacheKey);
    const offsets = fenceOffsets.get(side);
    const samplePosition = progress * count;
    const rawIndex = Math.floor(samplePosition);
    const index = isClosedRoute ? rawIndex % count : Math.min(rawIndex, count - 1);
    const next = isClosedRoute ? (index + 1) % count : index + 1;
    const offset = THREE.MathUtils.lerp(offsets[index], offsets[next], samplePosition - rawIndex);
    const pose = poseAt(progress, side * offset);
    fencePoseCache.set(cacheKey, pose);
    return pose;
  }
  const railHeights = [0.28, 1.35, 2.42];

  const postGeometry = new THREE.BoxGeometry(0.12, postHeight, 0.12);
  const postMaterial = M.metal;
  const posts = new THREE.InstancedMesh(postGeometry, postMaterial, postCount * 2);
  posts.castShadow = true;
  posts.receiveShadow = true;
  const dummy = new THREE.Object3D();
  let postIndex = 0;

  const railPositions = [];
  const wirePositions = [];
  const colliderCount = count;
  const curbGeometry = new THREE.BoxGeometry(0.78, 0.075, Math.max(0.42, length / count * 0.96));
  const curbRedInstances = new THREE.InstancedMesh(curbGeometry, M.curbRed, count * 2);
  const curbWhiteInstances = new THREE.InstancedMesh(curbGeometry, M.curbWhite, count * 2);
  const fenceReflectors = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.42, 0.2, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x252525, roughness: 0.3, metalness: 0.12 }),
    postCount * 2
  );
  curbRedInstances.receiveShadow = true;
  curbWhiteInstances.receiveShadow = true;
  let redCurbIndex = 0;
  let whiteCurbIndex = 0;

  for (const side of [-1, 1]) {
    // The curb follows the inner edge and remains completely on the asphalt.
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const p = poseAt(t);
      dummy.position.copy(p.position);
      dummy.position.addScaledVector(p.normal, side * (mapConfig.width / 2 - 0.39));
      dummy.position.y = mapId === "mountainpass"
        ? mountainPassGroundHeight(dummy.position.x, dummy.position.z) + 0.12
        : p.position.y + 0.085;
      dummy.rotation.set(0, p.yaw, 0);
      dummy.updateMatrix();
      if (i % 2) curbRedInstances.setMatrixAt(redCurbIndex++, dummy.matrix);
      else curbWhiteInstances.setMatrixAt(whiteCurbIndex++, dummy.matrix);
    }

    // Build a continuous chain-link fence: metal posts, three rails and a
    // diamond mesh pattern. All geometry is generated along the exact curve.
    const fencePoints = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      if (pitLaneEnabled && side === 1 && pitFenceGap(t)) continue;
      const pose = safeFencePose(t, side);
      fencePoints.push(pose.position.clone());
      if (i < count) {
        const next = safeFencePose((i + 1) / count, side);
        const a = pose.position;
        const b = next.position;
        for (const h of railHeights) {
          railPositions.push(a.x, a.y + h, a.z, b.x, b.y + h, b.z);
        }

        // Diamond wire strands in each panel, clipped to the panel boundaries.
        const panelLength = a.distanceTo(b);
        const diagonals = Math.max(1, Math.ceil(panelLength / 0.7));
        for (let d = 0; d < diagonals; d++) {
          const u0 = d / diagonals;
          const u1 = Math.min(1, (d + 1) / diagonals);
          const x0 = THREE.MathUtils.lerp(a.x, b.x, u0);
          const z0 = THREE.MathUtils.lerp(a.z, b.z, u0);
          const x1 = THREE.MathUtils.lerp(a.x, b.x, u1);
          const z1 = THREE.MathUtils.lerp(a.z, b.z, u1);
          const y0 = THREE.MathUtils.lerp(a.y, b.y, u0) + 0.34 + (d % 2) * 0.18;
          const y1 = THREE.MathUtils.lerp(a.y, b.y, u1) + 2.28 - (d % 2) * 0.18;
          wirePositions.push(x0, y0, z0, x1, y1, z1);
          wirePositions.push(x0, y1, z0, x1, y0, z1);
        }
      }
    }

    // Evenly spaced posts are instanced to keep the new fences inexpensive.
    for (let i = 0; i < postCount; i++) {
      const progress = i / postCount;
      if (pitLaneEnabled && side === 1 && pitFenceGap(progress)) continue;
      const pose = safeFencePose(progress, side);
      dummy.position.set(pose.position.x, pose.position.y + postHeight / 2, pose.position.z);
      dummy.rotation.set(0, pose.yaw, 0);
      dummy.updateMatrix();
      posts.setMatrixAt(postIndex++, dummy.matrix);
      dummy.position.addScaledVector(pose.normal, side * 0.08);
      dummy.position.y = pose.position.y + 1.82;
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      fenceReflectors.setMatrixAt(postIndex - 1, dummy.matrix);
      fenceReflectors.setColorAt(postIndex - 1, new THREE.Color(i % 2 ? 0xff4b38 : 0xf4f2dd));
    }

    // Dense, short collider sections prevent a car slipping through a turn.
    for (let i = 0; i < colliderCount; i++) {
      const t = i / colliderCount;
      if (pitLaneEnabled && side === 1 && pitFenceGap(t)) continue;
      const bp = safeFencePose(t, side);
      const next = safeFencePose((i + 1) / colliderCount, side);
      const segmentLength = bp.position.distanceTo(next.position);
      barriers.push({
        position: bp.position.clone(),
        start: bp.position.clone(),
        end: next.position.clone(),
        tangent: bp.tangent.clone(),
        normal: bp.normal.clone(),
        yaw: bp.yaw,
        halfLength: segmentLength * 0.5,
        halfWidth: 0.22,
        side
      });
    }
  }

  curbRedInstances.count = redCurbIndex;
  curbWhiteInstances.count = whiteCurbIndex;
  addWorld(curbRedInstances);
  addWorld(curbWhiteInstances);
  addWorld(posts);
  fenceReflectors.instanceMatrix.needsUpdate = true;
  if (fenceReflectors.instanceColor) fenceReflectors.instanceColor.needsUpdate = true;
  fenceReflectors.castShadow = false;
  addWorld(fenceReflectors);
  const railGeometry = new THREE.BufferGeometry();
  railGeometry.setAttribute('position', new THREE.Float32BufferAttribute(railPositions, 3));
  const rails = new THREE.LineSegments(railGeometry, new THREE.LineBasicMaterial({
    color: 0x9eaaa8, transparent: true, opacity: 0.98
  }));
  addWorld(rails);

  const wireGeometry = new THREE.BufferGeometry();
  wireGeometry.setAttribute('position', new THREE.Float32BufferAttribute(wirePositions, 3));
  const wire = new THREE.LineSegments(wireGeometry, new THREE.LineBasicMaterial({
    color: 0x667574, transparent: true, opacity: 0.88
  }));
  addWorld(wire);
}

function buildF1PitLane() {
  if (mapConfig.themeCategory || mapConfig.routeMode === "point-to-point") return;

  const laneWidth = Math.min(6.2, mapConfig.width * 0.46);
  const half = mapConfig.width / 2;
  const fenceOffset = half + (mapConfig.scenery === "city" ? 4.2 : 4.6);
  const pitOffset = fenceOffset + laneWidth / 2 + 0.65;
  const roadEdgeOffset = half - 1.4;
  const entry = 0.90;
  const span = 0.20;
  const samples = 160;
  const vertices = [];
  const indices = [];
  const leftEdge = [];
  const rightEdge = [];
  const centerLine = [];
  const ease = value => {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  };
  const pitPose = sample => {
    const t = (entry + sample * span) % 1;
    const ramp = Math.min(ease(sample / 0.24), ease((1 - sample) / 0.24));
    const offset = THREE.MathUtils.lerp(roadEdgeOffset, pitOffset, ramp);
    return { t, offset, pose: poseAt(t, offset) };
  };

  for (let i = 0; i <= samples; i++) {
    const sample = i / samples;
    const { t, offset } = pitPose(sample);
    const inner = poseAt(t, offset - laneWidth / 2);
    const outer = poseAt(t, offset + laneWidth / 2);
    inner.position.y += 0.12;
    outer.position.y += 0.12;
    vertices.push(
      inner.position.x, inner.position.y, inner.position.z,
      outer.position.x, outer.position.y, outer.position.z
    );
    leftEdge.push(inner.position.clone().addScaledVector(inner.normal, 0.25));
    rightEdge.push(outer.position.clone().addScaledVector(outer.normal, -0.25));
    if (i < samples) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      const center = pitPose(sample + 0.5 / samples).pose;
      center.position.addScaledVector(center.normal, 0.2);
      centerLine.push(center.position);
    }
  }

  const laneGeometry = new THREE.BufferGeometry();
  laneGeometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  laneGeometry.setIndex(indices);
  laneGeometry.computeVertexNormals();
  const lane = new THREE.Mesh(laneGeometry, new THREE.MeshStandardMaterial({
    color: 0x34393b,
    roughness: 0.86,
    side: THREE.DoubleSide
  }));
  lane.receiveShadow = true;
  addWorld(lane);

  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xf3f0db });
  for (const points of [leftEdge, rightEdge]) {
    addWorld(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), edgeMaterial));
  }
  const centerMaterial = new THREE.LineBasicMaterial({ color: 0xffcf38 });
  for (let i = 0; i < centerLine.length; i += 2) {
    const end = Math.min(i + 1, centerLine.length - 1);
    const dash = new THREE.BufferGeometry().setFromPoints([centerLine[i], centerLine[end]]);
    addWorld(new THREE.Line(dash, centerMaterial));
  }

  for (let i = 0; i < 8; i++) {
    const sample = 0.32 + i * 0.05;
    const { t } = pitPose(sample);
    const pose = poseAt(t, pitOffset);
    const stall = new THREE.Mesh(
      new THREE.BoxGeometry(laneWidth * 0.78, 0.035, 5.2),
      mat(i % 2 ? 0xd8ff3e : 0xe9e8df, 0.72)
    );
    stall.position.copy(pose.position);
    stall.position.y += 0.16;
    stall.rotation.y = pose.yaw;
    addWorld(stall);

    const garagePose = poseAt(t, pitOffset + laneWidth / 2 + 5.2);
    const garage = new THREE.Group();
    const structure = mat(0x343c40, 0.76, 0.24);
    const support = mat(0x9ba4a2, 0.62, 0.34);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.5, 8.5), structure);
    roof.position.y = 4.3;
    garage.add(roof);
    for (const x of [-4.8, 4.8]) for (const z of [-3.8, 3.8]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.2, 0.28), support);
      post.position.set(x, 2.1, z);
      garage.add(post);
    }
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.6, 7.6), structure);
    backWall.position.set(-4.85, 2.0, 0);
    garage.add(backWall);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 7.8), mat(0x20282b, 0.6, 0.2));
    sign.position.set(-4.62, 3.55, 0);
    garage.add(sign);
    garage.position.copy(garagePose.position);
    garage.rotation.y = garagePose.yaw;
    garage.traverse(object => { if (object.isMesh) object.castShadow = true; });
    addWorld(garage);
  }
}

function buildStartFinish() {
  const p = poseAt(0);
  const group = new THREE.Group();

  for (let i = 0; i < 20; i++) {
    const tile = new THREE.Mesh(
      new THREE.BoxGeometry(mapConfig.width / 20, 0.06, 1.15),
      i % 2 ? M.black : M.white
    );
    tile.position.x = (i - 9.5) * mapConfig.width / 20;
    group.add(tile);
  }

  group.position.copy(p.position);
  group.position.y = p.position.y + 0.1;
  group.rotation.y = p.yaw;
  addWorld(group);

  // Grand prix start gantry.
  const gantry = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(mapConfig.width + 4, 0.35, 0.5),
    M.black
  );
  beam.position.y = 5;
  gantry.add(beam);

  const timingPanel = new THREE.Mesh(
    new THREE.BoxGeometry(9.5, 1.15, 0.3),
    mat(0x202a2a, 0.52, 0.28)
  );
  timingPanel.position.set(0, 6.05, 0);
  gantry.add(timingPanel);
  const timingAccent = new THREE.Mesh(
    new THREE.BoxGeometry(8.9, 0.1, 0.34),
    mat(0xd8ff3e, 0.4, 0.05)
  );
  timingAccent.position.set(0, 5.48, 0);
  gantry.add(timingAccent);

  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 5, 0.4), M.black
    );
    post.position.set(side * (mapConfig.width / 2 + 1.5), 2.5, 0);
    gantry.add(post);
  }

  for (let i = 0; i < 12; i++) {
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 10, 8),
      new THREE.MeshStandardMaterial({
        color: 0xff2525,
        emissive: 0xff1515,
        emissiveIntensity: 2
      })
    );
    light.position.set((i - 5.5) * 0.6, 5.3, 0);
    gantry.add(light);
  }

  gantry.position.copy(p.position);
  gantry.rotation.y = p.yaw;
  addWorld(gantry);

  if (mapConfig.routeMode === "point-to-point") {
    const finishPose = poseAt(1);
    const finishStripe = new THREE.Group();
    for (let i = 0; i < 20; i++) {
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(mapConfig.width / 20, 0.08, 1.2),
        i % 2 ? M.black : M.white
      );
      tile.position.x = (i - 9.5) * mapConfig.width / 20;
      finishStripe.add(tile);
    }
    finishStripe.position.copy(finishPose.position);
    finishStripe.position.y += 0.12;
    finishStripe.rotation.y = finishPose.yaw;
    addWorld(finishStripe);

    const finishGate = new THREE.Group();
    const finishBeam = new THREE.Mesh(new THREE.BoxGeometry(mapConfig.width + 4, 0.3, 0.48), M.black);
    finishBeam.position.y = 4.6;
    finishGate.add(finishBeam);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.34, 4.6, 0.34), M.black);
      post.position.set(side * (mapConfig.width / 2 + 1.8), 2.3, 0);
      finishGate.add(post);
    }
    finishGate.position.copy(finishPose.position);
    finishGate.rotation.y = finishPose.yaw;
    addWorld(finishGate);
  }
}

function addTree(x, z, scale = 1) {
  const forest = mapConfig.scenery === "forest" || mapConfig.scenery === "coast";
  const trunkHeight = (forest ? 2.8 : 2.1) * scale;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16 * scale, 0.32 * scale, trunkHeight, 7), M.trunk
  );
  trunk.position.set(x, trunkHeight / 2, z);
  trunk.castShadow = true;
  addWorld(trunk);

  if (forest || mapConfig.scenery === "city") {
    const palette = mapConfig.scenery === "city" ? [0x2d6a43, 0x3c8050, 0x477a48] : [0x214d32, 0x2d653c, 0x397947, 0x1a402b];
    // Layered broadleaf canopy makes forests read as a thick woodland instead of sparse cones.
    for (let layer = 0; layer < 3; layer++) {
      const crown = new THREE.Mesh(
        new THREE.IcosahedronGeometry((1.15 - layer * 0.13) * scale, 1),
        mat(palette[(Math.random() * palette.length) | 0], 0.92)
      );
      crown.position.set(x + (Math.random() - 0.5) * 0.3 * scale, (2.0 + layer * 0.72) * scale, z);
      crown.scale.set(1, 0.85 + Math.random() * 0.35, 1);
      crown.castShadow = true;
      addWorld(crown);
    }
    return;
  }

  const colors = mapConfig.scenery === "desert" ? [0x7b8952, 0xa1a06a, 0x667746] :
    mapConfig.scenery === "snow" ? [0x42624d, 0x5e806a, 0x789586] : [0x28543a, 0x38734a, 0x1e4933];
  for (let i = 0; i < 3; i++) {
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry((1.8 - i * 0.42) * scale, 3.1 * scale, 8),
      mat(colors[(Math.random() * colors.length) | 0])
    );
    crown.position.set(x, (2.2 + i * 0.85) * scale, z);
    crown.castShadow = true;
    addWorld(crown);
  }
}

function addBuilding(x, z, scale = 1) {
  const height = (8 + Math.random() * 28) * scale;
  const width = (5 + Math.random() * 6) * scale;
  const depth = (5 + Math.random() * 7) * scale;
  const colors = [0x56616a, 0x777c80, 0x464e58, 0x8b8b83, 0x3e5660, 0x6b747b];
  const buildingMat = mat(colors[(Math.random() * colors.length) | 0], 0.8, 0.08);
  const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), buildingMat);
  building.position.set(x, height / 2, z);
  building.castShadow = true;
  building.receiveShadow = true;
  addWorld(building);

  // Roof plant, parapet, and small rooftop structures give the skyline depth.
  const roof = new THREE.Mesh(new THREE.BoxGeometry(width * 0.78, 0.5 * scale, depth * 0.78), M.barrier);
  roof.position.set(x, height + 0.22 * scale, z);
  addWorld(roof);
  if (Math.random() > 0.42) {
    const unit = new THREE.Mesh(new THREE.BoxGeometry(width * 0.25, 1.4 * scale, depth * 0.22), M.black);
    unit.position.set(x + width * 0.15, height + 1 * scale, z - depth * 0.1);
    addWorld(unit);
  }

  const windowMaterial = mat(Math.random() > 0.55 ? 0xb6e5ef : 0xe6d9a6, 0.25, 0.1);
  const floors = Math.min(5, Math.floor(height / (4.2 * scale)));
  // Thin floor bands and a brighter street-level storefront give standalone
  // blocks depth instead of reading as plain cubes.
  for (let band = 1; band <= floors; band++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(width * 1.015, 0.10 * scale, depth * 1.015), M.black);
    strip.position.set(x, band * height / (floors + 1) - 0.52 * scale, z);
    addWorld(strip);
  }
  const storefront = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, Math.min(2.2, height * 0.16), 0.08), mat(0x26343a, 0.25, 0.18));
  storefront.position.set(x, Math.min(1.45, height * 0.08), z + depth / 2 + 0.065);
  addWorld(storefront);
  if (Math.random() > 0.35) {
    const awning = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.18 * scale, 1.05 * scale), mat([0xd8ff3e, 0xe4483c, 0xe8e8df][Math.floor(Math.random() * 3)], 0.72));
    awning.position.set(x, Math.min(2.5, height * 0.14), z + depth / 2 + 0.48 * scale);
    addWorld(awning);
  }
  for (let floor = 1; floor <= floors; floor++) {
    for (let col = -1; col <= 1; col++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.72 * scale, 0.68 * scale, 0.055), windowMaterial);
      win.position.set(x + col * width * 0.27, floor * height / (floors + 1), z + depth / 2 + 0.03);
      addWorld(win);
      const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.68 * scale, 0.72 * scale), windowMaterial);
      sideWin.position.set(x + width / 2 + 0.03, floor * height / (floors + 1), z + col * depth * 0.27);
      addWorld(sideWin);
    }
  }
}

function buildDenseForest() {
  // A thick forest belt follows the actual circuit instead of sitting far away.
  // Instancing keeps the larger tree count affordable; a wide safety verge stays clear.
  const treeCount = 3200;
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 3.5, 6);
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, M.trunk, treeCount);
  const canopyMat = mat(0x214d32, 0.94);
  const canopyMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.35, 1), canopyMat, treeCount);
  const canopyColors = [new THREE.Color(0x173b27), new THREE.Color(0x214d32), new THREE.Color(0x2d653c), new THREE.Color(0x397947)];
  const dummy = new THREE.Object3D();
  let placedTrees = 0;
  let attempts = 0;
  while (placedTrees < treeCount && attempts < treeCount * 8) {
    attempts++;
    const t = Math.random();
    const side = Math.random() < 0.5 ? -1 : 1;
    const offset = mapConfig.width / 2 + 48 + Math.random() * 360;
    const scale = 0.65 + Math.random() * 1.25;
    const pose = safeSceneryPose(t, side, offset, 3.2 * scale);
    if (!pose || !sceneryPositionIsClear(pose.position, 3.2 * scale + 0.5)) continue;
    const i = placedTrees;
    dummy.position.set(pose.position.x, 1.75 * scale, pose.position.z);
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 3.2 * scale;
    dummy.scale.set(1.35 * scale, 1.5 * scale, 1.35 * scale);
    dummy.updateMatrix();
    canopyMesh.setMatrixAt(i, dummy.matrix);
    canopyMesh.setColorAt(i, canopyColors[Math.floor(Math.random() * canopyColors.length)]);
    placedTrees++;
  }
  trunkMesh.count = placedTrees;
  canopyMesh.count = placedTrees;
  trunkMesh.castShadow = true;
  canopyMesh.castShadow = true;
  canopyMesh.receiveShadow = true;
  addWorld(trunkMesh);
  addWorld(canopyMesh);
}

function buildForestFloorDetails() {
  // Forest understory adds a believable transition from the racing verge to
  // the distant tree wall: shrubs, ferns, mossy rocks and fallen timber.
  // All placements use the whole-track clearance helper so nothing intrudes
  // into the circuit, even around tight bends.
  const shrubMats = [0x254c31, 0x315d38, 0x426b3e, 0x1e422b].map(c => mat(c, 0.98));
  const rockMats = [0x59615b, 0x6c7168, 0x464f49].map(c => mat(c, 0.98));
  const logMat = mat(0x59432f, 0.98);
  const mossMat = mat(0x526c3d, 1);
  const shrubGeo = new THREE.IcosahedronGeometry(1, 1);
  const shrubBatches = shrubMats.map(m => new THREE.InstancedMesh(shrubGeo, m, 420));
  const rockBatches = rockMats.map(m => new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), m, 180));
  const logGeo = new THREE.CylinderGeometry(0.22, 0.28, 1, 7);
  const logs = new THREE.InstancedMesh(logGeo, logMat, 84);
  const mossPatches = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), mossMat, 160);
  const dummy = new THREE.Object3D();
  let shrubN = 0, rockN = 0, logN = 0, mossN = 0;

  for (let i = 0; i < 420; i++) {
    const t = (i + Math.random() * 0.8) / 420;
    const side = i % 2 ? 1 : -1;
    const size = 0.55 + Math.random() * 1.35;
    const pose = safeSceneryPose(t, side, mapConfig.width / 2 + 18 + Math.random() * 62, size + 3);
    if (!pose) continue;
    dummy.position.set(pose.position.x, size * 0.65, pose.position.z);
    dummy.scale.set(size * (0.8 + Math.random() * 0.5), size * (0.45 + Math.random() * 0.4), size * (0.8 + Math.random() * 0.5));
    dummy.rotation.set(Math.random() * 0.15, Math.random() * Math.PI, Math.random() * 0.15);
    dummy.updateMatrix();
    shrubBatches[shrubN % shrubBatches.length].setMatrixAt(Math.floor(shrubN / shrubBatches.length), dummy.matrix);
    shrubN++;
  }
  for (let i = 0; i < 180; i++) {
    const t = (i + Math.random() * 0.8) / 180;
    const side = i % 2 ? 1 : -1;
    const size = 0.7 + Math.random() * 2.2;
    const pose = safeSceneryPose(t, side, mapConfig.width / 2 + 24 + Math.random() * 88, size + 3);
    if (!pose) continue;
    dummy.position.set(pose.position.x, size * 0.35, pose.position.z);
    dummy.scale.set(size * (0.8 + Math.random() * 0.7), size * (0.4 + Math.random() * 0.45), size * (0.75 + Math.random() * 0.65));
    dummy.rotation.set(Math.random() * 0.25, Math.random() * Math.PI, Math.random() * 0.2);
    dummy.updateMatrix();
    rockBatches[rockN % rockBatches.length].setMatrixAt(Math.floor(rockN / rockBatches.length), dummy.matrix);
    rockN++;
  }
  for (let i = 0; i < 84; i++) {
    const t = (i + Math.random() * 0.8) / 84;
    const side = i % 2 ? 1 : -1;
    const pose = safeSceneryPose(t, side, mapConfig.width / 2 + 28 + Math.random() * 95, 5.5);
    if (!pose) continue;
    const length = 2.8 + Math.random() * 4.5;
    dummy.position.set(pose.position.x, 0.42, pose.position.z);
    dummy.scale.set(0.8 + Math.random() * 0.35, 0.8 + Math.random() * 0.3, length);
    dummy.rotation.set(0, pose.yaw + Math.random() * 1.8, Math.PI / 2 + (Math.random() - 0.5) * 0.18);
    dummy.updateMatrix(); logs.setMatrixAt(logN++, dummy.matrix);
  }
  for (let i = 0; i < 160; i++) {
    const t = (i + Math.random() * 0.8) / 160;
    const side = i % 2 ? 1 : -1;
    const pose = safeSceneryPose(t, side, mapConfig.width / 2 + 17 + Math.random() * 72, 2.5);
    if (!pose) continue;
    const r = 0.7 + Math.random() * 1.9;
    dummy.position.set(pose.position.x, 0.13, pose.position.z);
    dummy.scale.set(r * 1.6, 0.18, r);
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.updateMatrix(); mossPatches.setMatrixAt(mossN++, dummy.matrix);
  }
  shrubBatches.forEach((mesh, i) => { mesh.count = Math.ceil(Math.max(0, shrubN - i) / shrubBatches.length); mesh.castShadow = false; mesh.receiveShadow = true; addWorld(mesh); });
  rockBatches.forEach((mesh, i) => { mesh.count = Math.ceil(Math.max(0, rockN - i) / rockBatches.length); mesh.castShadow = false; mesh.receiveShadow = true; addWorld(mesh); });
  logs.count = logN; logs.castShadow = false; addWorld(logs);
  mossPatches.count = mossN; mossPatches.castShadow = false; addWorld(mossPatches);
}

function buildCitySideRoadsAndLights() {
  // Neighborhood streets run beside the circuit, never across the racing surface.
  // Each short road segment is individually checked against the entire spline so
  // close parallel sections, hairpins and figure-eight-like layouts cannot intrude.
  const asphalt = mat(0x303438, 0.94, 0.02);
  const curbMat = mat(0xb8b8ad, 0.9);
  const laneMat = mat(0xd9d2a4, 0.8);
  const poleMat = mat(0x333a40, 0.7, 0.2);
  const housingMat = mat(0x20262b, 0.55, 0.35);
  const signalRed = mat(0xff2828, 0.25, 0.15);
  const signalYellow = mat(0xffc52d, 0.25, 0.1);
  const signalGreen = mat(0x36e879, 0.25, 0.1);
  const roadWidth = 10.5;
  const stepCount = 520;
  const sides = [-1, 1];
  const offsets = sides.map(side => ({ side, offset: mapConfig.width / 2 + 31 }));
  const roadGeo = new THREE.BoxGeometry(1, 0.12, roadWidth);
  const curbGeo = new THREE.BoxGeometry(1, 0.2, 0.65);
  const sidewalkGeo = new THREE.BoxGeometry(1, 0.18, 2.4);
  const crosswalkGeo = new THREE.BoxGeometry(0.72, 0.04, 5.8);
  const sidewalkMat = mat(0x9b9d98, 0.92);
  const crosswalkMat = mat(0xe6e4d8, 0.85);
  const dashGeo = new THREE.BoxGeometry(2.2, 0.035, 0.16);
  const dummy = new THREE.Object3D();

  for (const { side, offset } of offsets) {
    for (let i = 0; i < stepCount; i++) {
      const t0 = i / stepCount;
      const t1 = (i + 1) / stepCount;
      const a = poseAt(t0, side * offset).position;
      const b = poseAt(t1, side * offset).position;
      const mid = a.clone().add(b).multiplyScalar(0.5);
      // Full segment clearance includes half the road width plus a generous verge.
      if (!sceneryPositionIsClear(a, roadWidth / 2 + 15) ||
          !sceneryPositionIsClear(b, roadWidth / 2 + 15) ||
          !sceneryPositionIsClear(mid, roadWidth / 2 + 15)) continue;
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.15 || len > 12) continue;
      const yaw = Math.atan2(-dz, dx);
      dummy.position.set(mid.x, -0.025, mid.z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(len + 0.25, 1, 1);
      dummy.updateMatrix();
      const road = new THREE.Mesh(roadGeo, asphalt);
      road.position.copy(dummy.position); road.rotation.y = yaw;
      road.scale.set(len + 0.25, 1, 1); road.receiveShadow = true; addWorld(road);

      // Side curbs and broken centre-line dashes are small individual pieces.
      for (const curbSide of [-1, 1]) {
        const curb = new THREE.Mesh(curbGeo, curbMat);
        curb.position.set(mid.x, 0.035, mid.z);
        curb.rotation.y = yaw;
        curb.position.x += Math.cos(yaw) * curbSide * roadWidth * 0.5;
        curb.position.z -= Math.sin(yaw) * curbSide * roadWidth * 0.5;
        curb.scale.x = len + 0.25;
        addWorld(curb);
      }
      // Raised sidewalk slabs along both edges make the neighborhood roads
      // read like built streets rather than a single dark ribbon.
      for (const pavementSide of [-1, 1]) {
        const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
        sidewalk.position.set(mid.x, 0.07, mid.z);
        sidewalk.rotation.y = yaw;
        sidewalk.position.x += Math.cos(yaw) * pavementSide * (roadWidth * 0.5 + 1.45);
        sidewalk.position.z -= Math.sin(yaw) * pavementSide * (roadWidth * 0.5 + 1.45);
        sidewalk.scale.x = len + 0.25;
        sidewalk.receiveShadow = true;
        addWorld(sidewalk);
      }
      if (i % 7 === 0) {
        const dash = new THREE.Mesh(dashGeo, laneMat);
        dash.position.set(mid.x, 0.045, mid.z); dash.rotation.y = yaw;
        addWorld(dash);
      }
      if (i % 43 === 0) {
        for (let stripe = -3; stripe <= 3; stripe++) {
          const cross = new THREE.Mesh(crosswalkGeo, crosswalkMat);
          cross.position.set(mid.x, 0.052, mid.z);
          cross.rotation.y = yaw;
          cross.position.x += Math.cos(yaw) * stripe * 1.05;
          cross.position.z -= Math.sin(yaw) * stripe * 1.05;
          addWorld(cross);
        }
      }
    }
  }

  // Traffic signals on neighborhood street approaches, safely outside the circuit.
  const poleGeo = new THREE.CylinderGeometry(0.13, 0.17, 5.4, 8);
  const housingGeo = new THREE.BoxGeometry(0.68, 1.75, 0.48);
  const lampGeo = new THREE.SphereGeometry(0.17, 10, 8);
  for (let k = 0; k < 18; k++) {
    const t = (k + 0.5) / 18;
    for (const side of [-1, 1]) {
      const pose = safeSceneryPose(t, side, mapConfig.width / 2 + 39, 18);
      if (!pose || !sceneryPositionIsClear(pose.position, 18)) continue;
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(pose.position.x, 2.7, pose.position.z); addWorld(pole);
      const inward = pose.normal.clone().multiplyScalar(-side);
      const housing = new THREE.Mesh(housingGeo, housingMat);
      housing.position.set(pose.position.x + inward.x * 0.4, 5.0, pose.position.z + inward.z * 0.4);
      housing.rotation.y = Math.atan2(inward.x, inward.z); addWorld(housing);
      [signalRed, signalYellow, signalGreen].forEach((lampMat, j) => {
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.position.set(housing.position.x + inward.x * 0.27, 5.55 - j * 0.55, housing.position.z + inward.z * 0.27);
        addWorld(lamp);
      });
    }
  }
}

function buildDenseCity() {
  // Hundreds of varied building silhouettes in a handful of instanced batches.
  const buildingCount = mapId === "stadium" ? 112 : 220;
  const colors = [0x56616a, 0x777c80, 0x464e58, 0x8b8b83, 0x3e5660, 0x6b747b];
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const batches = colors.map(color => new THREE.InstancedMesh(geo, mat(color, 0.82, 0.08), buildingCount));
  const dummy = new THREE.Object3D();
  const windowGeo = new THREE.BoxGeometry(0.9, 0.72, 0.08);
  const windowMat = new THREE.MeshStandardMaterial({ color: 0xc5e2e5, emissive: 0x26424a, emissiveIntensity: 0.28, roughness: 0.32, metalness: 0.16 });
  const windowMesh = new THREE.InstancedMesh(windowGeo, windowMat, buildingCount * 40);
  const floorBandMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.075, 0.09), mat(0x343f43, 0.68, 0.18), buildingCount * 12);
  const podiumMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat(0x39454a, 0.86, 0.08), buildingCount);
  const setbackMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat(0x717c80, 0.8, 0.08), buildingCount);
  let windowIndex = 0;
  let floorBandIndex = 0;
  let setbackIndex = 0;
  let placedBuildings = 0;
  let attempts = 0;
  while (placedBuildings < buildingCount && attempts < buildingCount * 12) {
    attempts++;
    const i = placedBuildings;
    const side = i % 2 ? 1 : -1;
    const t = ((i + 0.5) / buildingCount + Math.floor(i / 24) * 0.006) % 1;
    const w = 9 + (i * 7) % 15;
    const d = 10 + (i * 11) % 14;
    const h = 16 + (i * 29) % 58;
    // Keep the entire footprint clear, including where the circuit folds back on itself.
    const footprintRadius = Math.hypot(w, d) / 2;
    const districtOffset = mapConfig.width / 2 + 52 + Math.floor(i / 24) * 18 + (i % 4) * 3;
    const pose = safeSceneryPose(t, side, districtOffset, footprintRadius + 12);
    if (!pose || !sceneryPositionIsClear(pose.position, footprintRadius + 12)) continue;
    const x = pose.position.x;
    const z = pose.position.z;
    dummy.position.set(x, h / 2, z);
    dummy.scale.set(w, h, d);
    dummy.rotation.y = 0;
    dummy.updateMatrix();
    batches[i % batches.length].setMatrixAt(Math.floor(i / batches.length), dummy.matrix);
    dummy.position.set(x, 1.15, z);
    dummy.scale.set(w + 2.2, 2.3, d + 2.2);
    dummy.updateMatrix();
    podiumMesh.setMatrixAt(i, dummy.matrix);
    if (i % 3 === 0) {
      dummy.position.set(x, h + 0.8, z);
      dummy.scale.set(w * 0.72, 1.6, d * 0.72);
      dummy.updateMatrix();
      setbackMesh.setMatrixAt(setbackIndex++, dummy.matrix);
    }
    // Repeated window grids on the front and side facades create a more
    // believable downtown skyline while keeping the city performant via instancing.
    for (let floor = 1; floor <= 5; floor++) {
      for (let col = -1; col <= 1; col++) {
        dummy.position.set(x + col * w * 0.29, floor * h / 6, z + d / 2 + 0.045);
        dummy.scale.set(Math.max(0.5, w * 0.12), 0.72, 0.05);
        dummy.rotation.y = 0;
        dummy.updateMatrix();
        windowMesh.setMatrixAt(windowIndex++, dummy.matrix);
        dummy.position.set(x + w / 2 + 0.045, floor * h / 6, z + col * d * 0.29);
        dummy.rotation.y = Math.PI / 2;
        dummy.updateMatrix();
        windowMesh.setMatrixAt(windowIndex++, dummy.matrix);
      }
      // A central lit panel breaks up the repetitive office-block facades.
      dummy.position.set(x, floor * h / 6, z + d / 2 + 0.048);
      dummy.scale.set(Math.max(0.6, w * 0.10), 0.72, 0.05);
      dummy.rotation.y = 0;
      dummy.updateMatrix();
      windowMesh.setMatrixAt(windowIndex++, dummy.matrix);
      if (floor < 5) {
        dummy.position.set(x, floor * h / 6 + 0.55, z + d / 2 + 0.05);
        dummy.scale.set(w * 0.9, 1, 1);
        dummy.rotation.y = 0;
        dummy.updateMatrix();
        floorBandMesh.setMatrixAt(floorBandIndex++, dummy.matrix);
        dummy.position.set(x + w / 2 + 0.05, floor * h / 6 + 0.55, z);
        dummy.scale.set(d * 0.9, 1, 1);
        dummy.rotation.y = Math.PI / 2;
        dummy.updateMatrix();
        floorBandMesh.setMatrixAt(floorBandIndex++, dummy.matrix);
      }
    }
    // A compact rooftop HVAC unit gives selected buildings a finished roofline.
    if (i % 3 === 0) {
      const rooftop = new THREE.Mesh(new THREE.BoxGeometry(w * 0.22, 1.1, d * 0.18), M.black);
      rooftop.position.set(x - w * 0.22, h + 0.55, z - d * 0.18);
      addWorld(rooftop);
    }
    placedBuildings++;
  }
  podiumMesh.count = placedBuildings;
  setbackMesh.count = setbackIndex;
  podiumMesh.receiveShadow = true;
  setbackMesh.receiveShadow = true;
  addWorld(podiumMesh);
  addWorld(setbackMesh);
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    batch.count = Math.max(0, Math.ceil((placedBuildings - batchIndex) / batches.length));
    batch.castShadow = true;
    batch.receiveShadow = true;
    addWorld(batch);
  }
  windowMesh.count = windowIndex;
  addWorld(windowMesh);
  floorBandMesh.count = floorBandIndex;
  floorBandMesh.receiveShadow = true;
  addWorld(floorBandMesh);

  // Curving neighborhood roads and traffic lights beside city blocks. These replace
  // the old long straight strips that could cross the circuit on some map shapes.
  buildCitySideRoadsAndLights();
}

function buildCityStreetLife() {
  // Street-level details help the city read as a lived-in place, not a skyline
  // of boxes: parked compact cars, street trees, benches, bins and bus shelters.
  // Every prop is positioned beyond the track safety corridor.
  const poleMat = mat(0x343c40, 0.72, 0.28);
  const seatMat = mat(0x72513a, 0.86);
  const concreteMat = mat(0x8b918e, 0.95);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x83c5d7, roughness: 0.25, metalness: 0.12, transparent: true, opacity: 0.48 });
  const carPaints = [0xc94135, 0x315d88, 0xd7d9d5, 0xd8b94e, 0x2b333a, 0x2f7754].map(c => mat(c, 0.34, 0.24));
  const wheelMat = M.tire;
  const carBodyGeo = new THREE.BoxGeometry(3.5, 0.72, 1.7);
  const carRoofGeo = new THREE.BoxGeometry(1.9, 0.62, 1.42);
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.2, 10);
  const bodyMeshes = carPaints.map(m => new THREE.InstancedMesh(carBodyGeo, m, 86));
  const roofMesh = new THREE.InstancedMesh(carRoofGeo, glassMat, 86);
  const wheelMeshes = Array.from({length: 4}, () => new THREE.InstancedMesh(wheelGeo, wheelMat, 86));
  const dummy = new THREE.Object3D();
  let cars = 0;
  for (let i = 0; i < 86; i++) {
    const t = (i + 0.5) / 86;
    const side = i % 2 ? 1 : -1;
    // The outer edge of the side road / parking bay; never place parked cars on the race surface.
    const pose = safeSceneryPose(t, side, mapConfig.width / 2 + 43 + (i % 3) * 5, 5.2);
    if (!pose) continue;
    const x = pose.position.x, z = pose.position.z, yaw = pose.yaw;
    dummy.position.set(x, 0.63, z); dummy.rotation.set(0, yaw, 0); dummy.scale.set(0.9, 0.9, 0.9); dummy.updateMatrix();
    bodyMeshes[cars % bodyMeshes.length].setMatrixAt(Math.floor(cars / bodyMeshes.length), dummy.matrix);
    dummy.position.set(x, 1.25, z - Math.sin(yaw) * 0.04); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); roofMesh.setMatrixAt(cars, dummy.matrix);
    const wheelOffsets = [[-1.12, 0.34, -0.72], [1.12, 0.34, -0.72], [-1.12, 0.34, 0.72], [1.12, 0.34, 0.72]];
    wheelOffsets.forEach((off, wi) => {
      dummy.position.set(x + Math.cos(yaw) * off[0] - Math.sin(yaw) * off[2], off[1], z + Math.sin(yaw) * off[0] + Math.cos(yaw) * off[2]);
      dummy.rotation.set(0, yaw, Math.PI / 2); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); wheelMeshes[wi].setMatrixAt(cars, dummy.matrix);
    });
    cars++;
  }
  bodyMeshes.forEach((mesh, i) => { mesh.count = Math.ceil(Math.max(0, cars - i) / bodyMeshes.length); mesh.castShadow = false; addWorld(mesh); });
  roofMesh.count = cars; addWorld(roofMesh);
  wheelMeshes.forEach(mesh => { mesh.count = cars; addWorld(mesh); });

  // Small street trees planted in regular, non-blocking sidewalk pockets.
  const cityTreeCount = mapId === "stadium" ? 16 : 42;
  for (let i = 0; i < cityTreeCount; i++) {
    const t = (i + 0.35) / cityTreeCount, side = i % 2 ? 1 : -1;
    const pose = safeSceneryPose(t, side, mapConfig.width / 2 + 48 + (i % 3) * 4, 4.2);
    if (!pose) continue;
    const x = pose.position.x, z = pose.position.z, scale = 0.75 + (i % 4) * 0.13;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.23, 2.7 * scale, 7), M.trunk);
    trunk.position.set(x, 1.35 * scale, z); addWorld(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.4 * scale, 9, 7), mat([0x39764a,0x4b8754,0x5b9157][i%3],0.96));
    crown.position.set(x, 3.0 * scale, z); crown.scale.set(1.1, 0.9, 1.0); addWorld(crown);
    if (i % 3 === 0) {
      const bench = new THREE.Group();
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.48), seatMat); plank.position.y = 0.55; bench.add(plank);
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.48, 0.1), seatMat); back.position.set(0,0.83,-0.18); bench.add(back);
      const legs = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.48,0.12), poleMat); legs.position.y=0.25; bench.add(legs);
      bench.position.set(x + pose.normal.x * side * 3.0, 0, z + pose.normal.z * side * 3.0); bench.rotation.y = pose.yaw; addWorld(bench);
    }
    if (i % 5 === 0) {
      const bin = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.85,0.55), poleMat); bin.position.set(x + pose.normal.x * side * 2.3,0.43,z + pose.normal.z * side * 2.3); addWorld(bin);
    }
  }
  // Bus shelters with a roof and translucent side panels give scale to the sidewalks.
  const shelterCount = mapId === "stadium" ? 3 : 8;
  for (let i = 0; i < shelterCount; i++) {
    const t = (i + 0.5) / shelterCount, side = i % 2 ? 1 : -1;
    const pose = safeSceneryPose(t, side, mapConfig.width / 2 + 50, 6);
    if (!pose) continue;
    const shelter = new THREE.Group();
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.8,0.16,1.8),poleMat); roof.position.y=2.8; shelter.add(roof);
    for (const x of [-2.15,2.15]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12,2.7,0.12),poleMat); post.position.set(x,1.35,0); shelter.add(post);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.035,2.2,1.45),glassMat); panel.position.set(x*0.96,1.35,-0.05); shelter.add(panel);
    }
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4,0.12,0.42),seatMat); seat.position.set(0,0.75,0.38); shelter.add(seat);
    shelter.position.set(pose.position.x,0,pose.position.z); shelter.rotation.y=pose.yaw; addWorld(shelter);
  }
}

function buildCityArchitectureDetails() {
  // Low-cost architectural layers: glass curtain walls, balcony rails, shopfronts,
  // rooftop plant, lit signs and streetlights. Every anchor is checked against the
  // whole racing spline with a footprint buffer so props stay outside the barriers.
  const glassMats = [0x6ca5b5, 0x9bcbd3, 0x456d7c, 0x263e4b].map(c =>
    new THREE.MeshStandardMaterial({ color:c, metalness:0.35, roughness:0.22, transparent:true, opacity:0.82 })
  );
  const concreteMats = [0x8a8e8c, 0x666f75, 0xb0aaa0, 0x3e5059].map(c => mat(c,0.86,0.12));
  const ledgeMat = mat(0x252e32,0.6,0.35);
  const signMats = [mat(0xd8ff3e,0.3,0.1),mat(0x38c9f5,0.3,0.1),mat(0xffb34a,0.3,0.1)];
  const poleMat = mat(0x30383c,0.55,0.4);
  const lampMat = new THREE.MeshStandardMaterial({color:0xffefb5,emissive:0xffd36b,emissiveIntensity:1.1});
  const box = (w,h,d,material,x,y,z,rot=0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z); mesh.rotation.y=rot; mesh.castShadow=true; mesh.receiveShadow=true; addWorld(mesh); return mesh;
  };
  // Architectural feature buildings are sparse enough to preserve frame rate.
  const featureBuildingCount = mapId === "stadium" ? 24 : 58;
  for (let i=0;i<featureBuildingCount;i++) {
    const t=(i+0.31)/featureBuildingCount, side=i%2?1:-1;
    const width=11+(i%5)*2.3, depth=10+(i%4)*2.1, height=10+(i%7)*7.5;
    const radius=Math.hypot(width,depth)*0.5;
    const pose=safeSceneryPose(t,side,mapConfig.width/2+67+(i%9)*13,radius+15);
    if(!pose || !sceneryPositionIsClear(pose.position,radius+13)) continue;
    const x=pose.position.x,z=pose.position.z,rot=pose.yaw;
    const baseMat=concreteMats[i%concreteMats.length];
    // A main mass plus alternating glass facade gives each block its own silhouette.
    box(width,height,depth,baseMat,x,height/2,z,rot);
    const frontZ=depth/2+0.075;
    const floors=Math.max(2,Math.floor(height/3.1));
    for(let floor=0;floor<floors;floor++){
      const y=1.5+floor*height/floors;
      for(let col=0;col<4;col++){
        const localX=-width*0.39+col*width*0.26;
        box(width*0.17,Math.max(0.8,height/floors*0.55),0.08,glassMats[(i+col+floor)%glassMats.length],x+Math.cos(rot)*localX-Math.sin(rot)*frontZ,y,z+Math.sin(rot)*localX+Math.cos(rot)*frontZ,rot);
      }
      if(i%3===0){
        box(width+0.45,0.16,depth+0.45,ledgeMat,x,y+height/floors*0.37,z,rot);
      }
    }
    // Shopfronts and a colored fascia on shorter city blocks.
    if(height<29){
      box(width*0.82,2.25,0.16,glassMats[1],x,1.5,z+Math.cos(rot)*(depth/2+0.12),rot);
      box(width*0.94,0.48,0.22,signMats[i%signMats.length],x,3.05,z+Math.cos(rot)*(depth/2+0.2),rot);
    }
    // Rooftop machinery, vents and water tanks.
    box(width*0.24,1.1,depth*0.22,poleMat,x-width*0.2, height+0.55,z-depth*0.16,rot);
    if(i%2===0){
      const tank=new THREE.Mesh(new THREE.CylinderGeometry(0.65,0.65,1.7,10),poleMat);
      tank.position.set(x+Math.cos(rot)*width*0.2,height+0.85,z+Math.sin(rot)*width*0.2); addWorld(tank);
    }
    // Balcony stacks on selected apartment blocks.
    if(i%4===0 && height>20){
      for(let floor=1;floor<Math.min(6,floors);floor++){
        const y=floor*height/floors+0.55;
        box(width*0.74,0.12,1.05,ledgeMat,x,y,z+Math.cos(rot)*(depth/2+0.62),rot);
        for(let post=-2;post<=2;post++) box(0.07,0.65,0.07,poleMat,x+Math.cos(rot)*post*width*0.14,y+0.32,z+Math.cos(rot)*(depth/2+0.98),rot);
      }
    }
    // Small rooftop sign blades on selected towers.
    if(i%7===0){
      box(0.22,3.6,0.22,poleMat,x+width*0.25,height+1.8,z,rot);
      box(Math.min(7,width*0.5),1.35,0.3,signMats[i%signMats.length],x+width*0.25,height+3.1,z,rot);
    }
  }
  // Continuous-feeling street lighting, kept beyond the racing barrier and verge.
  const cityLightCount = mapId === "stadium" ? 24 : 52;
  for(let i=0;i<cityLightCount;i++){
    const t=(i+0.5)/cityLightCount,side=i%2?1:-1;
    const pose=safeSceneryPose(t,side,mapConfig.width/2+37,7);
    if(!pose || !sceneryPositionIsClear(pose.position,7)) continue;
    const x=pose.position.x,z=pose.position.z;
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.17,6.8,7),poleMat);
    pole.position.set(x,3.4,z); addWorld(pole);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.12,0.12),poleMat);
    arm.position.set(x+pose.normal.x*side*0.9,6.65,z+pose.normal.z*side*0.9); arm.rotation.y=pose.yaw; addWorld(arm);
    const lamp=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.18,0.42),lampMat);
    lamp.position.set(x+pose.normal.x*side*1.8,6.55,z+pose.normal.z*side*1.8); lamp.rotation.y=pose.yaw; addWorld(lamp);
  }
}

function buildRockyMountainScenery() {
  // Alpine rock field and conifer forest. Every prop is placed from the track
  // spline and checked against the nearest point on the whole circuit, so tight
  // bends never get buried under rocks, trees, or cabins.
  const rockMats = [
    mat(0x555b5e, 0.98), mat(0x707477, 0.96), mat(0x41484c, 1),
    mat(0x817f78, 0.98), mat(0x62676b, 0.98)
  ];
  const pineMats = [0x183b2b, 0x214c34, 0x2d5c3c, 0x345c40].map(c => mat(c, 0.96));
  const woodMat = mat(0x67452d, 0.94);
  const darkWood = mat(0x382c25, 0.95);
  const roofMat = mat(0x3d454a, 0.9);
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffdca0, emissive: 0xffb54c, emissiveIntensity: 0.22,
    roughness: 0.45
  });
  const stoneBase = mat(0x8d8a80, 0.98);

  // Large boulders, smaller broken stone and occasional cliff-like rock stacks.
  for (let i = 0; i < 190; i++) {
    const t = (i + Math.random() * 0.85) / 190;
    const side = i % 2 ? 1 : -1;
    const size = 1.1 + Math.random() * (i % 9 === 0 ? 6.5 : 2.8);
    const offset = mapConfig.width / 2 + 42 + Math.random() * 220;
    const pose = safeSceneryPose(t, side, offset, size * 1.35 + 3);
    if (!pose || !sceneryPositionIsClear(pose.position, size * 1.25 + 2)) continue;
    const groundY = mapId === "mountainpass"
      ? mountainPassGroundHeight(pose.position.x, pose.position.z)
      : 0;
    const geo = new THREE.DodecahedronGeometry(size, Math.random() > 0.65 ? 1 : 0);
    const rock = new THREE.Mesh(geo, rockMats[(Math.random() * rockMats.length) | 0]);
    rock.position.set(pose.position.x, groundY + size * (0.34 + Math.random() * 0.12), pose.position.z);
    rock.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.3);
    rock.scale.set(0.75 + Math.random() * 0.9, 0.55 + Math.random() * 0.65, 0.7 + Math.random() * 0.9);
    rock.castShadow = true;
    rock.receiveShadow = true;
    addWorld(rock);
    if (i % 5 === 0) {
      const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(size * 0.32, 0), rockMats[(i + 2) % rockMats.length]);
      rubble.position.set(pose.position.x + (Math.random() - 0.5) * size * 1.5, groundY + size * 0.18, pose.position.z + (Math.random() - 0.5) * size * 1.5);
      rubble.rotation.set(Math.random(), Math.random() * 3, Math.random());
      rubble.castShadow = true;
      addWorld(rubble);
    }
  }

  // Thick alpine pines in several rows, with clear gaps around the road edge.
  for (let i = 0; i < 150; i++) {
    const t = (i + Math.random() * 0.9) / 150;
    const side = i % 2 ? 1 : -1;
    const scale = 1.0 + Math.random() * 2.15;
    const offset = mapConfig.width / 2 + 58 + Math.random() * 240;
    const pose = safeSceneryPose(t, side, offset, 4.2 * scale);
    if (!pose || !sceneryPositionIsClear(pose.position, 4.2 * scale)) continue;
    const groundY = mapId === "mountainpass"
      ? mountainPassGroundHeight(pose.position.x, pose.position.z)
      : 0;
    const trunkH = 2.4 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * scale, 0.31 * scale, trunkH, 7), M.trunk);
    trunk.position.set(pose.position.x, groundY + trunkH / 2, pose.position.z);
    trunk.castShadow = true;
    addWorld(trunk);
    for (let layer = 0; layer < 4; layer++) {
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry((1.65 - layer * 0.28) * scale, (2.8 - layer * 0.12) * scale, 7),
        pineMats[(i + layer) % pineMats.length]
      );
      crown.position.set(pose.position.x, groundY + (1.8 + layer * 0.8) * scale, pose.position.z);
      crown.rotation.y = (i % 7) * 0.19;
      crown.castShadow = true;
      addWorld(crown);
    }
  }

  // Small mountain cabins with pitched roofs, porch beams, stone foundations,
  // chimney stacks and warm windows make the pass feel inhabited.
  for (let i = 0; i < 8; i++) {
    const t = (i + 0.5) / 8;
    const side = i % 2 ? 1 : -1;
    const w = 7 + (i % 3) * 1.8;
    const d = 6 + (i % 4) * 1.2;
    const offset = mapConfig.width / 2 + 125 + (i % 4) * 28;
    const pose = safeSceneryPose(t, side, offset, Math.hypot(w, d) + 9);
    if (!pose || !sceneryPositionIsClear(pose.position, Math.hypot(w, d) + 7)) continue;
    const groundY = mapId === "mountainpass"
      ? mountainPassGroundHeight(pose.position.x, pose.position.z)
      : 0;
    const x = pose.position.x, z = pose.position.z, yaw = pose.yaw;
    const cabin = new THREE.Group();
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.9, d + 0.7), stoneBase);
    foundation.position.y = 0.45; cabin.add(foundation);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, 3.2, d), woodMat);
    body.position.y = 2.35; body.castShadow = true; body.receiveShadow = true; cabin.add(body);
    // Dark timber corner posts and horizontal log bands.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.4, 0.22), darkWood);
      post.position.set(sx * (w / 2 - 0.14), 2.3, sz * (d / 2 - 0.14)); cabin.add(post);
    }
    for (let band = 0; band < 4; band++) {
      const log = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, 0.12, d + 0.15), darkWood);
      log.position.y = 1.25 + band * 0.7; cabin.add(log);
    }
    // Two sloped roof panels create a clear triangular cabin silhouette.
    for (const sideRoof of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(w + 1.1, 0.22, d * 0.72), roofMat);
      panel.position.set(0, 4.35, sideRoof * d * 0.18);
      panel.rotation.x = sideRoof * -0.43;
      panel.castShadow = true; cabin.add(panel);
    }
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.0, 0.7), stoneBase);
    chimney.position.set(w * 0.27, 5.0, -d * 0.16); cabin.add(chimney);
    for (const wx of [-w * 0.27, w * 0.27]) {
      const window = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.09), windowMat);
      window.position.set(wx, 2.65, d / 2 + 0.055); cabin.add(window);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.13), darkWood);
      frame.position.set(wx, 3.2, d / 2 + 0.09); cabin.add(frame);
    }
    const porch = new THREE.Mesh(new THREE.BoxGeometry(w * 0.75, 0.18, 1.65), darkWood);
    porch.position.set(0, 1.0, d / 2 + 0.75); cabin.add(porch);
    for (const px of [-w * 0.31, w * 0.31]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.2, 0.16), darkWood);
      beam.position.set(px, 1.9, d / 2 + 1.35); cabin.add(beam);
    }
    cabin.position.set(x, groundY, z);
    cabin.rotation.y = yaw;
    cabin.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    addWorld(cabin);
  }

  // Rugged mountain ridges on the distant horizon; these are broad low-poly
  // silhouettes rather than obstacles close to the racing line.
  for (let i = 0; mapId !== "mountainpass" && i < 28; i++) {
    const t = (i + 0.5) / 28;
    const side = i % 2 ? 1 : -1;
    const pose = safeSceneryPose(t, side, mapConfig.width / 2 + 650 + Math.random() * 320, 45);
    if (!pose) continue;
    const height = 45 + Math.random() * 110;
    const ridge = new THREE.Mesh(
      new THREE.ConeGeometry(28 + Math.random() * 42, height, 5 + (i % 3)),
      rockMats[i % rockMats.length]
    );
    ridge.position.set(pose.position.x, height * 0.42, pose.position.z);
    ridge.rotation.y = Math.random() * Math.PI;
    ridge.scale.z = 0.65 + Math.random() * 0.7;
    ridge.castShadow = true;
    addWorld(ridge);
  }
}

function buildThemedScenery() {
  const category = mapConfig.themeCategory;
  if (!category) return;
  const palette = {
    waterpark:[0x26c6da,0x56e0d0,0xf4f8ff], underwater:[0x20c8d8,0x2f89c7,0x8df5ff],
    mine:[0x8d8172,0x54575c,0xf3cb63], wizard:[0x8f68e8,0x55d8c7,0xf4d77c],
    candy:[0xff72ba,0x8cf0d0,0xffe38a], neon:[0xff42d0,0x41eaff,0xd8ff3e],
    space:[0x5b67ff,0x9f6cff,0x7be6ff], jungle:[0x438d50,0x88bc4b,0xc59c65],
    haunted:[0x7662a8,0x96d36b,0x5d4b70], dinosaur:[0x6d9c47,0xc7a65e,0x4b6b42],
    ice:[0xa8e8ff,0x68b9d5,0xf5fcff], arctic:[0xccefff,0x84b8d1,0xf6fcff],
    savanna:[0xc8a35d,0x8b9a4c,0x65503b], desert:[0xd5a064,0xb9674e,0x7c5a48],
    cloud:[0xe5f7ff,0x94d7ff,0xfafcff], volcano:[0xff572b,0xffa13a,0x4a3434],
    crystal:[0x68e6ff,0x9d78ff,0xe4f7ff], fairytale:[0xff8bd7,0x7cf2c6,0xffdf8a],
    castle:[0x8d9ba8,0xc8b89a,0x59656e], coast:[0x39c4e8,0xe9d4a2,0x3d8b85],
    shipyard:[0x6ca6b9,0x83969c,0xe2c27a], boardwalk:[0x70d4e6,0xf0d49a,0xffffff],
    tropical:[0x37d2c6,0xffcc70,0x5acb77], coral:[0xff8fb9,0x52e5df,0xf7e8c7],
    swamp:[0x8ba34c,0x667e45,0x4d5d43], mushroom:[0xff8fc4,0xa68cff,0x80e0b0],
    giantgarden:[0x73d98b,0xffa9d1,0xffdc6b], robot:[0x48d9ff,0xb3c1ce,0xf2a63b],
    industrial:[0xf0b64b,0x83969c,0x434b50], powerplant:[0x6dd4c8,0x99a9ae,0xffd166],
    junkyard:[0xc9a16c,0x8b8d80,0x6e746f], construction:[0xffb52e,0xf1d86c,0x59636a],
    airport:[0xffffff,0x7ad4ff,0xd8ff3e], forest:[0x70b879,0x8fbe67,0x72543d],
    stadium:[0xd8ff3e,0xffffff,0x4ecbff], toy:[0xff5c8a,0x4bc9ff,0xffd84f],
    retro:[0xff6dcf,0x65e9ff,0xffd866], storm:[0x91a6ff,0xc4e6ff,0xffffff],
    floodedcity:[0x5dd9e8,0x9aa9b5,0x3f8dba], frostforest:[0xd8f4ff,0x8ccbdc,0x638f9d],
    minecart:[0xf0b84e,0x7d8588,0x34383b], carnival:[0xff4d91,0xffd04e,0x4fd5ff],
    highland:[0x829c75,0xaebca1,0x5c6561],
  };
  const colors = palette[category] || [0x54c9e8,0xffc857,0xf1f3f4];
  const mats = colors.map((c,i)=>new THREE.MeshStandardMaterial({color:c, roughness:i===2?0.38:0.72, metalness:category==='neon'||category==='space'?0.22:0.02, emissive:category==='neon'||category==='wizard'?c:0x000000, emissiveIntensity:0.16}));
  const addProp = (geometry, material, x,y,z, sx=1,sy=1,sz=1, rotation=0) => {
    const mesh=new THREE.Mesh(geometry,material); mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz); mesh.rotation.y=rotation; mesh.castShadow=false; mesh.receiveShadow=false; addWorld(mesh); return mesh;
  };
  buildMapSignatureLandmarks(addProp, mats, category);
}

// Distinctive low-poly landmarks give each track a recognizable visual identity.
// The objects are placed well outside the track using the same clearance checks
// as the roadside props, and deliberately avoid expensive real-time shadows.
function buildMapSignatureLandmarks(addProp, mats, category) {
  const id = mapId;
  const add = addProp;
  const signature = {
    waterpark: 'slides', underwater: 'underwater', mines: 'mine', mineshaft: 'mine', wizardland: 'wizard',
    candy: 'candy', neoncity: 'neon', spaceport: 'space', moon: 'moon', jungle: 'jungle', haunted: 'haunted',
    dino: 'dino', icecave: 'icecave', arctic: 'ice', savanna: 'savanna', rainforest: 'jungle', desertnight: 'desert',
    mars: 'mars', asteroid: 'space', cloudcity: 'cloud', skyisland: 'cloud', volcanicash: 'volcano', lavaforge: 'volcano',
    crystal: 'crystal', fairytale: 'wizard', medieval: 'castle', castle: 'castle', pirate: 'pirate', shipyard: 'shipyard',
    boardwalk: 'coast', tropical: 'coast', coral: 'underwater', submarine: 'underwater', aquarium: 'underwater', river: 'water',
    waterfall: 'water', swamp: 'swamp', mushroom: 'mushroom', giantgarden: 'garden', robotfactory: 'robot', industrial: 'industrial',
    powerplant: 'industrial', junkyard: 'junkyard', construction: 'construction', airport: 'airport', hangar: 'airport', trainyard: 'train',
    cyberpunk: 'neon', hologram: 'neon', retroarcade: 'retro', pixel: 'retro', toybox: 'toy', lego: 'toy', dollhouse: 'toy',
    sportspark: 'stadium', skiresort: 'ski', bobsled: 'ski', sandcastle: 'coast', canyonbridge: 'bridge', redwoods: 'forest',
    bamboo: 'jungle', orchard: 'orchard', flowerfield: 'garden', lightning: 'storm', thunder: 'storm', raincity: 'neon',
    floodedcity: 'water', frostforest: 'ice', glacier: 'ice', quarry: 'mine', gemmine: 'crystal', underground: 'mine',
    cavern: 'mine', wizardtower: 'wizard', dragon: 'dragon', enchanted: 'wizard', fairground: 'carnival', circus: 'carnival',
    museum: 'city', oldtown: 'castle'
  }[id] || category;

  const pillar = (x,z,height,color=mats[1]) => {
    add(new THREE.CylinderGeometry(0.55,0.85,height,7), color, x,height/2,z);
  };
  const tower = (x,z,height=18,color=mats[1],roof=mats[0]) => {
    add(new THREE.CylinderGeometry(2.0,2.8,height,8),color,x,height/2,z);
    add(new THREE.ConeGeometry(3.4,4.8,8),roof,x,height+2.0,z);
  };
  const crystal = (x,z,h=8) => add(new THREE.OctahedronGeometry(2.1,0),mats[0],x,h/2,z,0.8,h/3,0.8);
  const count = 6;
  for(let i=0;i<count;i++){
    const t=(i+0.23)/count, side=i%2?1:-1;
    const pose=safeSceneryPose(t,side,mapConfig.width/2+52+(i%3)*14,24);
    if(!pose) continue;
    const x=pose.position.x,z=pose.position.z,h=11+(i%3)*4;
    // Each family has a bold silhouette that can be identified at racing speed.
    switch(signature){
      case 'slides': {
        const pts=[]; for(let j=0;j<12;j++){const u=j/11;pts.push(new THREE.Vector3(x-7+u*14, 10+Math.sin(u*Math.PI*2)*3-u*4, z+Math.sin(u*Math.PI*3)*3));}
        const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),36,0.75,7,false),mats[i%3]); addWorld(tube);
        add(new THREE.TorusGeometry(3.3,0.4,6,16),mats[2],x,2.2,z+7,1,1,1,pose.yaw);
        const pool = add(new THREE.BoxGeometry(20,0.55,8),mats[0],x,0.22,z+11,1,1,1,pose.yaw);
        pool.material = new THREE.MeshStandardMaterial({color:0x22bfe0,roughness:0.22,metalness:0.08,transparent:true,opacity:0.88,emissive:0x073a50,emissiveIntensity:0.18});
        add(new THREE.BoxGeometry(21.2,0.35,0.55),mats[2],x,0.42,z+6.8,1,1,1,pose.yaw);
        add(new THREE.BoxGeometry(21.2,0.35,0.55),mats[2],x,0.42,z+15.2,1,1,1,pose.yaw);
        break;
      }
      case 'underwater': case 'water': {
        add(new THREE.TorusGeometry(5,0.55,7,22),mats[0],x,8,z,1.2,1,1,pose.yaw);
        for(let b=0;b<4;b++) add(new THREE.SphereGeometry(0.45+(b%2)*0.3,7,5),mats[2],x-3+b*2,3+b*1.8,z+2,1,1,1);
        add(new THREE.ConeGeometry(2.2,6,6),mats[1],x+5,3,z-3,1,1,1,Math.PI); break;
      }
      case 'mine': {
        for(const dz of [-1.2,1.2]) add(new THREE.BoxGeometry(0.18,0.12,13),mats[2],x,0.18,z+dz,1,1,1,pose.yaw);
        for(let r=0;r<5;r++) add(new THREE.BoxGeometry(0.16,0.1,2.8),mats[1],x,0.2,z-5.5+r*2.7,1,1,1,pose.yaw);
        for(const dz of [-5,5]) {add(new THREE.BoxGeometry(0.5,5,0.5),mats[1],x,2.5,z+dz,1,1,1,pose.yaw);}
        add(new THREE.BoxGeometry(6,0.5,0.5),mats[1],x,5,z,1,1,1,pose.yaw); crystal(x+4,z+3,5); break;
      }
      case 'wizard': case 'castle': {
        tower(x,z,h+8,mats[1],mats[0]); tower(x+7,z+3,h*0.72,mats[0],mats[2]);
        add(new THREE.TorusGeometry(3.6,0.3,6,20),mats[2],x, h+10,z,1,1,1,pose.yaw); break;
      }
      case 'candy': case 'mushroom': case 'garden': {
        pillar(x,z,5,mats[1]); add(new THREE.SphereGeometry(signature==='candy'?2.7:3.1,10,7),mats[0],x,7,z,1.1,0.5,1.1);
        add(new THREE.SphereGeometry(1.0,8,6),mats[2],x+3,2,z+2,1,1,1); break;
      }
      case 'neon': case 'retro': {
        add(new THREE.BoxGeometry(9,h,4),mats[1],x,h/2,z,1,1,1,pose.yaw);
        add(new THREE.BoxGeometry(7,1.0,0.35),mats[0],x,h*0.7,z+2.15,1,1,1,pose.yaw);
        add(new THREE.TorusGeometry(3.5,0.25,5,18),mats[2],x,h+3,z,1,1,1,pose.yaw); break;
      }
      case 'space': case 'moon': case 'mars': {
        add(new THREE.TorusGeometry(5,0.38,6,22),mats[0],x,12,z,1,1,1,pose.yaw);
        pillar(x,z,15,mats[1]); add(new THREE.SphereGeometry(2.5,9,7),mats[2],x+5,10,z,1,1,1); break;
      }
      case 'jungle': case 'forest': case 'orchard': {
        pillar(x,z,10,mats[1]); add(new THREE.ConeGeometry(5,7,7),mats[0],x,11,z,1.2,1,1.2);
        add(new THREE.ConeGeometry(4,6,7),mats[0],x,15,z,1.1,1,1.1); break;
      }
      case 'haunted': case 'swamp': {
        pillar(x,z,8,mats[1]);
        for(let b=0;b<4;b++) add(new THREE.CylinderGeometry(0.12,0.25,5,5),mats[1],x+(b-1.5)*1.1,8+b%2,z,1,1,1,(b-1.5)*0.4);
        add(new THREE.SphereGeometry(1.0,7,5),mats[2],x,5,z+1); break;
      }
      case 'dino': case 'dragon': {
        // Low-poly creature silhouette: body, head, tail, and four legs.
        add(new THREE.SphereGeometry(2.6,8,6),mats[1],x,4,z,1.6,0.9,0.8);
        add(new THREE.SphereGeometry(1.35,8,6),mats[0],x+3.1,5,z,1.2,0.9,1.0);
        add(new THREE.ConeGeometry(1.1,4,6),mats[1],x-3.2,4,z,1,1,1,-Math.PI/2);
        for(const dx of [-1.5,1.5]) for(const dz of [-0.6,0.6]) pillar(x+dx,z+dz,2.5,mats[1]); break;
      }
      case 'icecave': case 'ice': case 'ski': {
        add(new THREE.TorusGeometry(5,1.0,5,16,Math.PI),mats[0],x,5,z,1,1,1,pose.yaw);
        add(new THREE.ConeGeometry(2.2,8,6),mats[2],x+4,4,z+2,1,1,1,Math.PI); break;
      }
      case 'savanna': case 'desert': {
        add(new THREE.ConeGeometry(5,h+4,6),mats[1],x,(h+4)/2,z,1.8,1,1.1,pose.yaw);
        pillar(x+6,z+3,4,mats[2]); add(new THREE.SphereGeometry(1.3,7,5),mats[0],x+6,4,z+3); break;
      }
      case 'volcano': {
        add(new THREE.ConeGeometry(11,25,7),mats[1],x,12.5,z,1.1,1,1.1,pose.yaw);
        add(new THREE.CylinderGeometry(3.3,3.3,0.5,10),mats[0],x,22,z);
        add(new THREE.TorusGeometry(4,0.35,5,18),mats[2],x,20.5,z); break;
      }
      case 'crystal': {
        for(let c=0;c<5;c++) crystal(x+(c-2)*2.2,z+(c%2)*2,7+(c%3)*3); break;
      }
      case 'pirate': case 'shipyard': case 'coast': case 'bridge': {
        add(new THREE.BoxGeometry(11,0.55,4),mats[1],x,4,z,1,1,1,pose.yaw);
        for(const dx of [-4,4]) add(new THREE.BoxGeometry(0.35,7,0.35),mats[2],x+dx,7.5,z,1,1,1,pose.yaw);
        add(new THREE.ConeGeometry(2.6,5,5),mats[0],x,10,z,1,1,1,pose.yaw); break;
      }
      case 'robot': case 'industrial': case 'construction': case 'junkyard': case 'train': case 'city': {
        add(new THREE.BoxGeometry(10,h,8),mats[1],x,h/2,z,1,1,1,pose.yaw);
        add(new THREE.BoxGeometry(8,1.0,0.35),mats[0],x,h*0.65,z+4.1,1,1,1,pose.yaw);
        if(signature==='train') add(new THREE.BoxGeometry(15,2.8,4),mats[2],x,1.7,z+7,1,1,1,pose.yaw);
        break;
      }
      case 'airport': {
        add(new THREE.BoxGeometry(15,5,9),mats[1],x,2.5,z,1,1,1,pose.yaw);
        add(new THREE.BoxGeometry(22,0.3,3),mats[2],x,5.2,z,1,1,1,pose.yaw); break;
      }
      case 'toy': {
        add(new THREE.BoxGeometry(7,7,7),mats[0],x,3.5,z,1,1,1,pose.yaw);
        add(new THREE.BoxGeometry(8,1.2,8),mats[2],x,7.7,z,1,1,1,pose.yaw);
        for(let k=0;k<4;k++) add(new THREE.CylinderGeometry(0.5,0.5,0.45,8),mats[1],x+(k%2?2:-2),7.9,z+(k<2?2:-2)); break;
      }
      case 'stadium': case 'carnival': {
        add(new THREE.TorusGeometry(7,0.65,6,20),mats[0],x,7,z,1,0.75,1,pose.yaw);
        pillar(x,z,8,mats[1]); add(new THREE.SphereGeometry(1.6,8,6),mats[2],x+7,6,z); break;
      }
      case 'waterfall': {
        add(new THREE.ConeGeometry(9,20,7),mats[1],x,10,z,1.1,1,1.1,pose.yaw);
        add(new THREE.BoxGeometry(3,15,0.6),mats[0],x+3,7.5,z+3,1,1,1,pose.yaw);
        add(new THREE.TorusGeometry(4,0.35,6,18),mats[2],x+3,1.2,z+3); break;
      }
      default: {
        add(new THREE.BoxGeometry(7,h,7),mats[1],x,h/2,z,1,1,1,pose.yaw);
        add(new THREE.ConeGeometry(4,5,7),mats[0],x,h+2,z,1,1,1,pose.yaw);
      }
    }
  }
}


// High-density world dressing pass. Instancing allows each circuit to have many
// more recognizable details without creating thousands of separate draw calls.
function buildUniversalMapDetail() {
  const id = String(mapId || '').toLowerCase();
  const category = String(mapConfig.themeCategory || mapConfig.scenery || '').toLowerCase();
  const isForest = /forest|jungle|rainforest|redwood|bamboo|orchard|haunted|swamp|dino|frostforest/.test(id + ' ' + category);
  const isCity = /city|neon|cyberpunk|retro|industrial|airport|trainyard|robot|powerplant|museum|oldtown|highway|stadium/.test(id + ' ' + category) || mapConfig.scenery === 'city';
  const isCave = /mine|cave|cavern|glacier|icecave|lavaforge|volcanicash|underground|gemmine|crystal/.test(id + ' ' + category);
  const isIce = /ice|glacier|arctic|frost|snow/.test(id + ' ' + category);
  const isLava = /lava|volcan|mars/.test(id + ' ' + category);
  const isWater = /underwater|aquarium|coral|submarine|waterfall|waterpark|river|flooded|dam|coast|tropical/.test(id + ' ' + category);
  const isDesert = /desert|savanna|canyon|quarry|sandcastle/.test(id + ' ' + category) || mapConfig.scenery === 'desert';
  const isFantasy = /wizard|castle|fairytale|enchanted|dragon|candy|mushroom|garden|cloud|skyisland|carnival/.test(id + ' ' + category);

  const dummy = new THREE.Object3D();
  const setTransform = (mesh, x, y, z, sx, sy, sz, yaw=0, pitch=0, roll=0) => {
    dummy.position.set(x,y,z); dummy.scale.set(sx,sy,sz); dummy.rotation.set(pitch,yaw,roll); dummy.updateMatrix();
    const index = mesh.count; if (index >= mesh.instanceMatrix.count) return;
    mesh.setMatrixAt(index, dummy.matrix); mesh.count = index + 1;
  };
  const count = (n, geometry, material) => { const mesh = new THREE.InstancedMesh(geometry, material, n); mesh.count = 0; return mesh; };
  const finish = mesh => { mesh.count = Math.max(0, Math.min(mesh.count, mesh.instanceMatrix.count)); mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = false; mesh.receiveShadow = true; addWorld(mesh); };
  const routeLength = Math.max(1, trackCurve.getLength());
  const half = mapConfig.width / 2;

  // Forests gain a layered outer tree wall plus shrubs, ferns and fallen timber.
  // The original Forest map already has its own very dense instanced woodland;
  // this smaller pass enriches every other forest-like biome and fills gaps.
  if (isForest) {
    const n = mapConfig.scenery === 'forest' ? 170 : 320;
    const trunks = count(n, new THREE.CylinderGeometry(0.22,0.38,4.4,6), mat(isIce ? 0x6d8790 : 0x59432f,0.96));
    const crowns = [0x153c28,0x205331,0x2d6a3c,0x467c42].map(c=>count(n,new THREE.IcosahedronGeometry(1.35,1),mat(c,0.98)));
    const understory = [0x214a2d,0x315d37,0x496c3c].map(c=>count(90,new THREE.IcosahedronGeometry(1,1),mat(c,0.98)));
    const rocks = count(60,new THREE.DodecahedronGeometry(1,0),mat(isIce?0xa8d5e6:0x586253,0.98));
    const logs = count(24,new THREE.CylinderGeometry(0.18,0.26,1,6),mat(0x55402d,0.99));
    let ti=0, ui=0, ri=0, li=0;
    for(let i=0;i<n;i++){
      const t=((i+Math.random()*0.7)/n)%1, side=i%2?1:-1;
      const offset=half+38+Math.random()*240;
      const scale=0.75+Math.random()*1.45;
      const pose=safeSceneryPose(t,side,offset,Math.max(5.5,scale*2.3));
      if(!pose) continue;
      setTransform(trunks,pose.position.x,2.2*scale,pose.position.z,scale,scale,scale,Math.random()*Math.PI);
      const crown= crowns[i%crowns.length];
      setTransform(crown,pose.position.x,4.1*scale,pose.position.z,1.45*scale,1.7*scale,1.45*scale,Math.random()*Math.PI);
      ti++;
    }
    trunks.count=ti; finish(trunks); crowns.forEach(m=>finish(m));
    for(let i=0;i<90;i++){
      const t=Math.random(),side=i%2?1:-1;
      const r=0.45+Math.random()*1.5;
      const pose=safeSceneryPose(t,side,half+22+Math.random()*115,Math.max(2.5,r*1.8));
      if(!pose) continue;
      setTransform(understory[i%understory.length],pose.position.x,r*0.65,pose.position.z,r*1.2,r*0.8,r*1.2,Math.random()*Math.PI);
      if(i<55){const rr=0.6+Math.random()*2.2;const rp=safeSceneryPose(t,side,half+27+Math.random()*115,rr*1.6+2);if(rp){setTransform(rocks,rp.position.x,rr*0.3,rp.position.z,rr*1.2,rr*0.55,rr,Math.random()*Math.PI);ri++;}}
      if(i<18){const len=2+Math.random()*4;const lp=safeSceneryPose(t,side,half+32+Math.random()*115,len*0.7+2);if(lp){setTransform(logs,lp.position.x,0.28,lp.position.z,0.8,0.8,len,lp.yaw+Math.random(),Math.PI/2);li++;}}
      ui++;
    }
    understory.forEach(m=>finish(m)); rocks.count=ri;finish(rocks);logs.count=li;finish(logs);
  }

  // City-like maps get varied low-rise blocks between their larger landmarks,
  // roof units, loading bays and window bands; all are instanced for performance.
  if (isCity && mapConfig.scenery !== 'city') {
    const n = 105;
    const buildingMats=[0x424e59,0x687780,0x8c9699,0x5a626a,0x374d58].map(c=>mat(c,0.86,0.08));
    const blocks=buildingMats.map(m=>count(n,new THREE.BoxGeometry(1,1,1),m));
    const windows=count(n*7,new THREE.BoxGeometry(0.8,0.55,0.045),mat(isCity?0x9dd9e6:0xd6e4ea,0.32,0.12));
    const roofUnits=count(n,new THREE.BoxGeometry(1,1,1),mat(0x30383d,0.72,0.18));
    let wi=0, bi=0, ri=0;
    for(let i=0;i<n;i++){
      const t=((i+Math.random()*0.55)/n)%1,side=i%2?1:-1;
      const w=5+Math.random()*12,d=5+Math.random()*13,h=6+Math.random()*32;
      const pose=safeSceneryPose(t,side,half+42+Math.random()*130,Math.hypot(w,d)*0.55+5);
      if(!pose) continue;
      setTransform(blocks[i%blocks.length],pose.position.x,h/2,pose.position.z,w,h,d,pose.yaw);bi++;
      for(let j=0;j<3;j++){
        setTransform(windows,pose.position.x+(j-1)*w*0.25,h*(0.28+j*0.19),pose.position.z+d/2+0.04,Math.max(0.5,w*0.12),0.45,0.06,pose.yaw);wi++;
        setTransform(windows,pose.position.x+w/2+0.04,h*(0.28+j*0.19),pose.position.z+(j-1)*d*0.25,0.06,0.45,Math.max(0.5,d*0.12),pose.yaw+Math.PI/2);wi++;
      }
      setTransform(roofUnits,pose.position.x-w*0.2,h+0.55,pose.position.z-d*0.15,w*0.25,1.1,d*0.22,pose.yaw);ri++;
    }
    blocks.forEach((m,i)=>{m.count=Math.ceil(Math.max(0,bi-i)/blocks.length);finish(m);});
    windows.count=wi;finish(windows);roofUnits.count=ri;finish(roofUnits);
  }

  // Enclosed cave systems: continuous wall and ceiling panels follow the spline,
  // with ribs and lamps repeated along the full route rather than isolated props.
  if (isCave && !mapConfig.themeCategory) {
    const segments=Math.max(64,Math.min(190,Math.ceil(routeLength/13)));
    const segLen=routeLength/segments;
    const rockColor=isIce?0x6e9eaf:isLava?0x352c2b:0x484b4c;
    const wallMat=mat(rockColor,0.98,0.02), roofMat=mat(isIce?0x9ed6e9:isLava?0x45312d:0x3a3d3e,0.96,0.02);
    const ribMat=mat(isIce?0xc9f1ff:isLava?0x55413a:0x806d59,0.92,0.03);
    const woodMat=mat(0x795b3a,0.96), lampMat=new THREE.MeshStandardMaterial({color:isIce?0x8be9ff:isLava?0xff6a24:0xffd78a,emissive:isIce?0x2a9dc8:isLava?0xd92b0a:0xb87928,emissiveIntensity:1.25,roughness:0.35});
    const walls=count(segments*2,new THREE.BoxGeometry(2,11,segLen+1.3),wallMat);
    const roof=count(segments,new THREE.BoxGeometry(mapConfig.width+22,1.8,segLen+1.3),roofMat);
    const posts=count(segments*2,new THREE.BoxGeometry(0.72,11.6,0.72),isIce?ribMat:woodMat);
    const crossbeams=count(segments,new THREE.BoxGeometry(mapConfig.width+21,0.72,0.72),isIce?ribMat:woodMat);
    const lamps=count(Math.ceil(segments/3),new THREE.BoxGeometry(1.2,0.25,0.42),lampMat);
    const crystalMat=mat(isIce?0xd6f8ff:isLava?0xff4b20:0x55dff5,0.3,0.12); crystalMat.emissive=new THREE.Color(isIce?0x3b9dbd:isLava?0xc52a10:0x1684a4);crystalMat.emissiveIntensity=0.55;
    const crystals=count(segments*2,new THREE.OctahedronGeometry(1,0),crystalMat);
    let wi=0,ri=0,li=0,ci=0;
    for(let i=0;i<segments;i++){
      const t=i/segments,pose=poseAt(t),baseY=pose.position.y;
      for(const side of [-1,1]){
        const sidePose=poseAt(t,side*(half+7));
        setTransform(walls,sidePose.position.x,baseY+5.1,sidePose.position.z,1,1,1,pose.yaw);wi++;
        if(i%2===0){setTransform(posts,sidePose.position.x,baseY+5.8,sidePose.position.z,1,1,1,pose.yaw);ri++;}
        const cp=poseAt(t,side*(half+5.2+Math.random()*3));
        const height=1.2+Math.random()*3.6;
        setTransform(crystals,cp.position.x,baseY+height/2,cp.position.z,0.65+Math.random()*0.8,height,0.65+Math.random()*0.8,Math.random()*Math.PI);ci++;
      }
      setTransform(roof,pose.position.x,baseY+11.3,pose.position.z,1,1,1,pose.yaw);
      if(i%2===0){setTransform(crossbeams,pose.position.x,baseY+10.6,pose.position.z,1,1,1,pose.yaw);}
      if(i%3===0){setTransform(lamps,pose.position.x,baseY+10.0,pose.position.z,1,1,1,pose.yaw);li++;}
    }
    walls.count=wi;finish(walls);roof.count=segments;finish(roof);posts.count=ri;finish(posts);crossbeams.count=Math.ceil(segments/2);finish(crossbeams);lamps.count=li;finish(lamps);crystals.count=ci;finish(crystals);
  }

  // Every non-cave biome gets a denser thematic prop layer: rocks, coral,
  // crystals, cacti, flowers, industrial markers, or fantasy silhouettes.
  if (!isCave && !isCity) {
    const n=isForest?36:isCity?48:isWater?28:34;
    const rockColor=isIce?0xb7e2f0:isWater?0x287f9c:isLava?0x44302a:isDesert?0x9a7957:isForest?0x526348:0x62666b;
    const rockMat=mat(rockColor,0.96,0.02);
    const rocks=count(n,new THREE.DodecahedronGeometry(1,0),rockMat);
    const accentColors=isWater?[0x26c8dd,0x59b9ed,0xff9dbb]:isIce?[0x9eeaff,0xd9f8ff,0x75b9d3]:isLava?[0xff4c20,0xffa02b,0x55352d]:isForest?[0x438b45,0x7cad4a,0x2d6a3b]:isFantasy?[0xc86de8,0x70e0cb,0xffd06a]:isCity?[0x6bcde2,0xd6e3e8,0xf1bc4e]:[0x8da2a8,0xd5b16c,0x71b8c7];
    const accents=accentColors.map(c=>count(n,new THREE.OctahedronGeometry(1,0),mat(c,0.6,0.08)));
    const groundDetails=count(n,new THREE.IcosahedronGeometry(1,0),mat(isForest?0x355a36:isWater?0x1e7c9b:isDesert?0xb59a69:isIce?0xb7dce5:0x6d756b,0.98));
    let r=0,a=0,g=0;
    for(let i=0;i<n;i++){
      const t=((i+Math.random()*0.85)/n)%1,side=i%2?1:-1;
      const size=0.6+Math.random()*2.5;
      const pose=safeSceneryPose(t,side,half+23+Math.random()*125,size*1.4+3);
      if(!pose) continue;
      setTransform(rocks,pose.position.x,size*0.34,pose.position.z,size*1.4,size*0.7,size,Math.random()*Math.PI);r++;
      const ap=safeSceneryPose(t,side,half+34+Math.random()*138,size*1.4+3);
      if(!ap) continue;
      if(isWater){setTransform(accents[i%accents.length],ap.position.x,1.1+Math.random()*2.2,ap.position.z,size*0.9,size*1.2,size*0.9,Math.random()*Math.PI);}
      else if(isFantasy){setTransform(accents[i%accents.length],ap.position.x,1.8+Math.random()*3,ap.position.z,size*1.1,size*1.6,size*1.1,Math.random()*Math.PI);}
      else if(isCity){setTransform(accents[i%accents.length],ap.position.x,2+Math.random()*5,ap.position.z,size*1.5,0.35,size*0.35,Math.random()*Math.PI);}
      else if(isDesert){setTransform(accents[i%accents.length],ap.position.x,1.5+Math.random()*2,ap.position.z,size*0.5,size*2.5,size*0.5,Math.random()*Math.PI);}
      else {setTransform(accents[i%accents.length],ap.position.x,1.0+Math.random()*2.2,ap.position.z,size,size*1.5,size,Math.random()*Math.PI);}
      a++;
      const gp=safeSceneryPose(t,side,half+22+Math.random()*100,size*1.5+2.5);
      if(gp){setTransform(groundDetails,gp.position.x,0.25,gp.position.z,size*1.5,0.25,size*1.2,Math.random()*Math.PI);g++;}
    }
    rocks.count=r;finish(rocks);accents.forEach(m=>finish(m));groundDetails.count=g;finish(groundDetails);
  }
}

function buildEnvironment() {
  if (mapId === "mountainpass") {
    buildMountainPassTerrain();
  } else {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(7000, 7000),
      mat(mapConfig.grass)
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    addWorld(ground);
  }

  // Keep map generation responsive: the original scenery systems below already
  // provide biome-specific details. Avoid a second large batch of nearest-track
  // clearance scans here, which could stall the main thread before the menu responds.

  if (mapConfig.scenery === "highway") {
    // Rural interstate shoulders with trees and low rocky cuttings set well
    // beyond the fence, never on the asphalt or its shoulders.
    for (let i = 0; i < 190; i++) {
      const t = (i + Math.random() * 0.85) / 190;
      const side = i % 2 ? 1 : -1;
      const pose = safeSceneryPose(t, side, mapConfig.width / 2 + 42 + Math.random() * 125, 5.5);
      if (!pose) continue;
      if (i % 4 !== 0) addTree(pose.position.x, pose.position.z, 0.8 + Math.random() * 1.25);
      else {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(2 + Math.random() * 3, 0), M.rock || M.metal);
        rock.position.set(pose.position.x, 1.0, pose.position.z);
        rock.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
        rock.scale.set(1.3, 0.75, 1.0);
        rock.castShadow = true; rock.receiveShadow = true; addWorld(rock);
      }
    }
  }

  if (mapConfig.scenery === "forest") { buildDenseForest(); buildForestFloorDetails(); }
  if (mapConfig.scenery === "mountain") buildRockyMountainScenery();
  if (mapConfig.scenery === "city") {
    buildDenseCity();
    buildCityArchitectureDetails();
    buildCityStreetLife();
  }
  if (mapConfig.themeCategory) buildThemedScenery();
  buildUniversalMapDetail();

  // Dense, varied, map-specific scenery. A clear safety margin is kept beside the road.
  const sceneryCount = mapConfig.themeCategory ? 0 :
    mapConfig.scenery === "mountain" ? 42 :
    mapConfig.scenery === "coast" ? 24 :
    mapConfig.scenery === "desert" ? 30 :
    mapConfig.scenery === "snow" ? 28 :
    mapConfig.scenery === "volcano" ? 18 : 0;
  for (let i = 0; i < sceneryCount; i++) {
    const t = (i + Math.random() * 0.9) / sceneryCount;
    const side = i % 2 ? 1 : -1;
    const isCity = mapConfig.scenery === "city";
    const approxSize = 1.0 + Math.random() * 1.2;
    const pose = safeSceneryPose(t, side,
      mapConfig.width / 2 + (isCity ? 54 : 46) + Math.random() * (isCity ? 125 : 165),
      isCity ? 24 * approxSize : 4 * approxSize);
    if (!pose) continue;
    const x = pose.position.x;
    const z = pose.position.z;
    const size = 0.65 + Math.random() * 1.0;

    if (mapConfig.scenery === "city") {
      // A deeper skyline with varied building heights and occasional low blocks.
      addBuilding(x, z, size * (i % 5 === 0 ? 1.65 : 0.9));
      if (i % 4 === 0) {
        const extra = safeSceneryPose(t, -side, mapConfig.width / 2 + 58 + Math.random() * 22, 5);
        if (extra) addTree(extra.position.x, extra.position.z, 0.75);
      }
    } else if (mapConfig.scenery === "forest") {
      // Dense forest backdrop with a few layered rows of trees.
      addTree(x, z, 1.0 + Math.random() * 0.8);
      if (i % 3 === 0) {
        const extra = safeSceneryPose(t, -side, mapConfig.width / 2 + 58 + Math.random() * 30, 5);
        if (extra) addTree(extra.position.x, extra.position.z, 0.8 + Math.random() * 0.6);
      }
    } else if (mapConfig.scenery === "coast") {
      if (Math.abs(z) > mapConfig.rz + 22) addTree(x, z, size);
    } else if (mapConfig.scenery === "snow") {
      if (i % 2 === 0) addTree(x, z, size);
    } else if (mapConfig.scenery === "volcano") {
      if (i % 5 === 0) addTree(x, z, 0.35 + Math.random() * 0.4);
    } else if (mapConfig.scenery === "rocky" || mapConfig.scenery === "mountain") {
      if (i % 3 === 0) addTree(x, z, 0.5 + Math.random() * 0.75);
    } else {
      addTree(x, z, size);
    }
  }

  // Trackside details on every circuit: marshal posts, sponsor boards, and spectator clusters.
  // These stay outside the safety barrier so they add scale without obstructing driving.
  const tracksideCount = mapConfig.scenery === "city" ? 68 : mapConfig.scenery === "forest" ? 54 : 44;
  for (let i = 0; i < tracksideCount; i++) {
    const t = (i + 0.18) / tracksideCount;
    const side = i % 2 ? 1 : -1;
    const pose = safeSceneryPose(t, side, mapConfig.width / 2 + 10 + (i % 3) * 2, 3.5);
    if (!pose) continue;
    if (i % 3 === 0) {
      const board = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.15, 0.16), mat(i % 2 ? 0xd8ff3e : 0xf1f3e9, 0.7));
      board.position.copy(pose.position); board.position.y = 1.35; board.rotation.y = pose.yaw; addWorld(board);
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.25, 0.12), M.metal);
      legs.position.copy(pose.position); legs.position.y = 0.62; legs.rotation.y = pose.yaw; addWorld(legs);
    } else if (i % 4 === 0) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.4, 0.22), M.white);
      post.position.copy(pose.position); post.position.y = 1.7; addWorld(post);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 0.55), mat(0xe4483c));
      cap.position.copy(pose.position); cap.position.y = 3.35; addWorld(cap);
    }
  }

  // Landmark props give the larger biomes memorable silhouettes. Their anchors
  // are validated against the whole track spline and kept well outside barriers.
  if (mapConfig.scenery === "city") {
    const bridgePose = safeSceneryPose(0.16, 1, mapConfig.width / 2 + 150, 24);
    if (bridgePose) {
      const bridge = new THREE.Group();
      const deckMat = mat(0x555e63, 0.82, 0.12);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(76, 1.1, 12), deckMat);
      deck.position.y = 10.5; deck.castShadow = true; deck.receiveShadow = true; bridge.add(deck);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(70, 0.045, 0.22), M.white);
      stripe.position.set(0, 11.08, 0); bridge.add(stripe);
      for (const x of [-29, -10, 10, 29]) {
        const pier = new THREE.Mesh(new THREE.BoxGeometry(2.4, 10, 2.4), mat(0x747d80, 0.9, 0.08));
        pier.position.set(x, 5, 0); pier.castShadow = true; bridge.add(pier);
      }
      for (const z of [-5.3, 5.3]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(76, 0.8, 0.22), M.barrier);
        rail.position.set(0, 11.35, z); bridge.add(rail);
      }
      bridge.position.copy(bridgePose.position); bridge.position.y = 0; bridge.rotation.y = bridgePose.yaw;
      addWorld(bridge);
      // Nearby lamps make the overpass read as part of a city road network.
      for (const x of [-34, 34]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 8), M.metal);
        pole.position.set(bridgePose.position.x + x, 3.5, bridgePose.position.z - 8);
        addWorld(pole);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
        lamp.position.set(bridgePose.position.x + x, 7, bridgePose.position.z - 8); addWorld(lamp);
      }
    }
  }
  if (mapConfig.scenery === "forest") {
    const cabinPose = safeSceneryPose(0.37, -1, mapConfig.width / 2 + 105, 15);
    if (cabinPose) {
      const cabin = new THREE.Group();
      const logs = mat(0x785033, 0.93);
      const cabinBody = new THREE.Mesh(new THREE.BoxGeometry(12, 5.5, 9), logs);
      cabinBody.position.y = 2.75; cabinBody.castShadow = true; cabinBody.receiveShadow = true; cabin.add(cabinBody);
      const roofMat = mat(0x3a302b, 0.9);
      const roofLeft = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.45, 10.2), roofMat);
      roofLeft.position.set(-2.15, 6.0, 0); roofLeft.rotation.z = -0.45; roofLeft.castShadow = true; cabin.add(roofLeft);
      const roofRight = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.45, 10.2), roofMat);
      roofRight.position.set(2.15, 6.0, 0); roofRight.rotation.z = 0.45; roofRight.castShadow = true; cabin.add(roofRight);
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.2, 0.12), mat(0x33251b));
      door.position.set(0, 1.6, 4.57); cabin.add(door);
      const windowMat = new THREE.MeshStandardMaterial({ color: 0xffd99a, emissive: 0x9a6025, emissiveIntensity: 0.25 });
      for (const x of [-3.7, 3.7]) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.3, 0.14), windowMat);
        win.position.set(x, 3.2, 4.58); cabin.add(win);
      }
      // Layered horizontal log courses along the visible front wall.
      for (let y = 0.65; y < 5.4; y += 0.62) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 12.2, 7), mat(y % 1.2 < 0.6 ? 0x865b37 : 0x69472d));
        log.rotation.z = Math.PI / 2; log.position.set(0, y, 4.62); cabin.add(log);
      }
      cabin.position.copy(cabinPose.position); cabin.rotation.y = cabinPose.yaw; addWorld(cabin);
      for (const offset of [-11, 11]) addTree(cabinPose.position.x + offset, cabinPose.position.z + 8, 1.25);
    }
  }

if (mapConfig.scenery === "coast") {
  // Deep ocean alongside the Coastal GP circuit.
  const oceanMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x087eae,
    roughness: 0.24,
    metalness: 0.14,
    clearcoat: 0.72,
    clearcoatRoughness: 0.18
  });

  const oceanGeometry = new THREE.PlaneGeometry(1600, 1200, 80, 60);
  const oceanVertices = oceanGeometry.attributes.position;
  for (let i = 0; i < oceanVertices.count; i++) {
    const x = oceanVertices.getX(i);
    const z = oceanVertices.getY(i);
    oceanVertices.setZ(i,
      Math.sin(x * 0.027 + z * 0.012) * 0.16 +
      Math.sin(z * 0.041 - x * 0.009) * 0.09
    );
  }
  oceanGeometry.computeVertexNormals();
  const ocean = new THREE.Mesh(
    oceanGeometry,
    oceanMaterial
  );

  ocean.rotation.x = -Math.PI / 2;

  // Keep the ocean beside the circuit, not beneath the track.
  ocean.position.set(0, -0.32, 750);
  ocean.receiveShadow = true;
  addWorld(ocean);

  // Wide sandy shoreline beside the coastal circuit.
  const beachMaterial = new THREE.MeshStandardMaterial({
    color: 0xe4cc91,
    roughness: 1
  });

  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(360, 82),
    beachMaterial
  );

  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, -0.18, 109);
  beach.receiveShadow = true;
  addWorld(beach);

  // Turquoise shallow-water strip along the beach.
  const shallowWater = new THREE.Mesh(
    new THREE.PlaneGeometry(360, 18),
    new THREE.MeshStandardMaterial({
      color: 0x39b9c8,
      roughness: 0.4,
      metalness: 0.08
    })
  );

  shallowWater.rotation.x = -Math.PI / 2;
  shallowWater.position.set(0, -0.25, 58);
  addWorld(shallowWater);

  // Small shoreline wave crests.
  const waveMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8fbff,
    transparent: true,
    opacity: 0.7,
    roughness: 0.3
  });

  for (let i = 0; i < 48; i++) {
    const wave = new THREE.Mesh(
      new THREE.BoxGeometry(
        2 + Math.random() * 5,
        0.035,
        0.18
      ),
      waveMaterial
    );

    wave.position.set(
      -180 + Math.random() * 360,
      -0.12,
      49 + Math.random() * 16
    );

    wave.rotation.y = (Math.random() - 0.5) * 0.35;
    addWorld(wave);
  }
}

  if (mapConfig.scenery === "desert") {
    // Put canyon boulders beside the circuit, not at arbitrary world positions
    // where a random roll could land one on the racing surface.
    for (let i = 0; i < 55; i++) {
      const progress = (i + Math.random() * 0.8) / 55;
      const side = i % 2 ? 1 : -1;
      const size = 1.2 + Math.random() * 3.5;
      const pose = safeSceneryPose(
        progress, side,
        mapConfig.width / 2 + 32 + Math.random() * 190,
        size * 1.8 + 2
      );
      if (!pose) continue;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(size, 0),
        mat(i % 2 ? 0x9d7951 : 0xc3a16f)
      );
      rock.position.set(pose.position.x, size * 0.35, pose.position.z);
      rock.rotation.y = pose.yaw + (Math.random() - 0.5) * 0.7;
      rock.scale.y = 0.75;
      rock.castShadow = false;
      addWorld(rock);
    }
  }

  if (mapConfig.scenery === "forest") {
    // Forest boulders and low roadside shrubs.
    for (let i = 0; i < 40; i++) {
      const shrubProgress = Math.random();
      const shrubSide = Math.random() < 0.5 ? -1 : 1;
      // Shrubs have broad, low footprints; reserve clearance for their full
      // radius, not merely the center point, so none can spill onto the asphalt.
      const shrubRadius = 1.0 + Math.random() * 1.2;
      const shrub = new THREE.Mesh(
        new THREE.IcosahedronGeometry(shrubRadius, 1),
        mat(0x1e432d)
      );
      const shrubPose = safeSceneryPose(
        shrubProgress, shrubSide,
        mapConfig.width / 2 + 36 + Math.random() * 170,
        shrubRadius + 8
      );
      if (!shrubPose) continue;
      shrub.position.set(shrubPose.position.x, 0.7, shrubPose.position.z);
      shrub.scale.y = 0.65;
      addWorld(shrub);
    }
  }

  if (mapConfig.scenery === "city") {
    // Simple city street lamps.
    for (let i = 0; i < 40; i++) {
      const p = safeSceneryPose(i / 40, i % 2 ? 1 : -1, mapConfig.width / 2 + 10, 2.5);
      if (!p) continue;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.1, 5, 7),
        M.black
      );
      pole.position.copy(p.position);
      pole.position.y = 2.5;
      addWorld(pole);

      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.09, 0.09),
        M.black
      );
      arm.position.copy(p.position);
      arm.position.y = 4.8;
      arm.rotation.y = p.yaw;
      addWorld(arm);
    }
  }

  // Rocky Highlands: angular boulders and layered cliffs.
  if (mapConfig.scenery === "rocky") {
    for (let i = 0; i < 105; i++) {
      const a = Math.random() * Math.PI * 2;
      const radius = 90 + Math.random() * 475;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.2 + Math.random() * 4.2, 0),
        mat([0x777a76, 0x5c625f, 0x96958c, 0x6d655c][i % 4], 0.96)
      );
      rock.position.set(Math.cos(a) * (mapConfig.rx + radius), 0.8 + Math.random() * 2.2, Math.sin(a) * (mapConfig.rz + radius));
      rock.scale.set(0.8 + Math.random() * 1.7, 0.6 + Math.random() * 1.5, 0.8 + Math.random() * 1.8);
      rock.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
      rock.castShadow = true;
      addWorld(rock);
    }
  }

  // Volcano Run: dark volcanic rock, distant volcanic cones and glowing lava seams.
  if (mapConfig.scenery === "volcano") {
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2;
      const radius = 140 + Math.random() * 500;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.5 + Math.random() * 3.6, 0),
        mat(i % 2 ? 0x332f30 : 0x62504b, 0.98)
      );
      rock.position.set(Math.cos(a) * (mapConfig.rx + radius), 0.7 + Math.random() * 2.2, Math.sin(a) * (mapConfig.rz + radius));
      rock.scale.y = 0.55 + Math.random() * 1.2;
      addWorld(rock);
    }
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      const radius = 575 + (i % 3) * 85;
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(13 + (i % 3) * 4, 30 + (i % 2) * 15, 7),
        mat(0x493b38, 1)
      );
      cone.position.set(Math.cos(a) * radius, 12, Math.sin(a) * radius);
      cone.castShadow = true;
      addWorld(cone);
    }
    const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff4b18, emissive: 0xc92705, emissiveIntensity: 1.2, roughness: 0.8 });
    for (let i = 0; i < 18; i++) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 4 + Math.random() * 8), lavaMat);
      const seamPose = safeSceneryPose(Math.random(), Math.random() < 0.5 ? -1 : 1,
        mapConfig.width / 2 + 28 + Math.random() * 220, 3.5);
      if (!seamPose) continue;
      seam.position.set(seamPose.position.x, 0.03, seamPose.position.z);
      seam.rotation.y = Math.random() * Math.PI;
      addWorld(seam);
    }
  }

  // Snowfall Summit and Giant Alpine Circuit: distant mountain ranges and snow-covered peaks.
  if ((mapConfig.scenery === "snow" || mapConfig.scenery === "mountain") && mapId !== "mountainpass") {
    const snowCap = mat(0xf0f5f7, 0.9);
    for (let i = 0; i < (mapConfig.scenery === "mountain" ? 48 : 32); i++) {
      const a = i / (mapConfig.scenery === "mountain" ? 48 : 32) * Math.PI * 2;
      const radius = (mapConfig.scenery === "mountain" ? 900 : 625) + Math.random() * 325;
      const height = 24 + Math.random() * (mapConfig.scenery === "mountain" ? 65 : 42);
      const base = 18 + Math.random() * 24;
      const mountain = new THREE.Mesh(new THREE.ConeGeometry(base, height, 7), mat(mapConfig.scenery === "snow" ? 0x81939b : 0x526858, 1));
      mountain.position.set(Math.cos(a) * radius, height / 2 - 1, Math.sin(a) * radius);
      mountain.rotation.y = Math.random() * Math.PI;
      mountain.castShadow = true;
      addWorld(mountain);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(base * 0.52, height * 0.42, 7), snowCap);
      cap.position.set(mountain.position.x, height * 0.79, mountain.position.z);
      cap.rotation.y = mountain.rotation.y;
      addWorld(cap);
    }
  }

  // Low-profile biome details fill the distant verges so the land outside the
  // circuit feels authored, while every object is validated against the whole
  // spline with clearance for its full footprint.
  const detailCount = mapConfig.scenery === "city" ? 48 : mapConfig.scenery === "forest" ? 76 : 72;
  const detailPalette = mapConfig.scenery === "snow" || mapConfig.scenery === "mountain"
    ? [0xcbd9df, 0xe7eef0, 0x82959b]
    : mapConfig.scenery === "desert" || mapConfig.scenery === "volcano"
      ? [0x8c765c, 0xb39a74, 0x62544a]
      : mapConfig.scenery === "coast"
        ? [0xc9b98d, 0x6f9d9b, 0x477f87]
        : mapConfig.scenery === "city"
          ? [0x4c5858, 0x697878, 0x343f40]
          : [0x365d40, 0x58764a, 0x7b8062];
  for (let i = 0; i < detailCount; i++) {
    const progress = (i + Math.random() * 0.75) / detailCount;
    const side = i % 2 ? 1 : -1;
    const radius = 1.1 + Math.random() * 2.8;
    const detailPose = safeSceneryPose(
      progress, side,
      mapConfig.width / 2 + 48 + Math.random() * 220,
      radius + 10
    );
    if (!detailPose) continue;
    const detail = new THREE.Mesh(
      new THREE.DodecahedronGeometry(radius, 0),
      mat(detailPalette[i % detailPalette.length], 0.96)
    );
    detail.position.copy(detailPose.position);
    detail.position.y = radius * 0.36;
    detail.scale.set(1.2 + Math.random() * 1.5, 0.35 + Math.random() * 0.45, 0.8 + Math.random() * 1.3);
    detail.rotation.set(Math.random() * 0.25, Math.random() * Math.PI, Math.random() * 0.2);
    detail.castShadow = true;
    addWorld(detail);
  }
}

function buildCheckpoints() {
  checkpointObjects = [];

  [0.25, 0.5, 0.75].forEach(progress => {
    const p = poseAt(progress);
    const gate = new THREE.Group();

    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 2.8, 0.16), M.lime
      );
      post.position.set(side * (mapConfig.width / 2 + 0.65), 1.4, 0);
      gate.add(post);
    }

    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(mapConfig.width + 1.3, 0.16, 0.16), M.lime
    );
    beam.position.y = 2.8;
    gate.add(beam);
    gate.position.copy(p.position);
    gate.rotation.y = p.yaw;
    addWorld(gate);

    checkpointObjects.push({ progress, position: p.position.clone() });
  });
  buildSignatureLandmarks();

}

// Each circuit gets a recognizable landmark plus a tucked-away visual Easter egg.
// Props use spline-checked positions so the track and barriers remain unobstructed.
function buildSignatureLandmarks() {
  const anchor = (progress, side, offset, clearance = 10) =>
    safeSceneryPose(progress, side, mapConfig.width / 2 + offset, clearance);
  const addAt = (group, pose, y = 0) => {
    if (!pose) return false;
    group.position.copy(pose.position);
    group.position.y = y;
    group.rotation.y = pose.yaw;
    addWorld(group);
    return true;
  };
  const makePole = (x, z, height, color = 0xe7e9e8) => {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, height, 8), mat(color, 0.8, 0.12));
    pole.position.y = height / 2; pole.castShadow = true; g.add(pole);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), mat(0xd8ff3e, 0.35, 0.1));
    cap.position.set(0, height + 0.15, 0); g.add(cap);
    g.position.set(x, 0, z); return g;
  };
  const makeSign = (label, color = 0xd8ff3e) => {
    const g = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(7.5, 2.5, 0.28), mat(0x172126, 0.6, 0.2));
    panel.position.y = 4.1; panel.castShadow = true; g.add(panel);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.13, 0.06), mat(color, 0.45, 0.15));
    stripe.position.set(0, 3.35, 0.17); g.add(stripe);
    const postMat = mat(0x778286, 0.65, 0.3);
    for (const x of [-2.8, 2.8]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.8, 0.18), postMat); post.position.set(x, 1.9, 0); g.add(post); }
    // Tiny raised block-letter-like bars make the sign legible without loading textures.
    const bars = label.length;
    for (let i = 0; i < Math.min(bars, 10); i++) {
      const glyph = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.85, 0.055), mat(0xf3f4ed));
      glyph.position.set((i - (Math.min(bars, 10) - 1) / 2) * 0.48, 4.35, 0.17); g.add(glyph);
    }
    return g;
  };

  // The landmark is chosen by the actual selected circuit, not only its biome.
  if (mapId === "coast") {
    const p = anchor(0.28, 1, 95, 12);
    if (p) {
      const lighthouse = new THREE.Group();
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 3.6, 18, 12), mat(0xf0e8d7)); tower.position.y = 9; tower.castShadow = true; lighthouse.add(tower);
      for (let y of [5, 10, 15]) { const band = new THREE.Mesh(new THREE.CylinderGeometry(2.7 - y * 0.035, 2.8 - y * 0.035, 0.75, 12), mat(y === 10 ? 0xe4483c : 0xf5f0df)); band.position.y = y; lighthouse.add(band); }
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 2.1, 10), new THREE.MeshStandardMaterial({ color: 0xffe5a0, emissive: 0xffb53b, emissiveIntensity: 0.7 })); lamp.position.y = 19; lighthouse.add(lamp);
      addAt(lighthouse, p);
    }
  } else if (mapId === "desert") {
    const p = anchor(0.58, -1, 110, 15);
    if (p) {
      const arch = new THREE.Group();
      const stone = mat(0xc5a174, 0.98);
      for (const x of [-7, 7]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(3, 15, 3), stone); leg.position.set(x, 7.5, 0); leg.castShadow = true; arch.add(leg); }
      const top = new THREE.Mesh(new THREE.BoxGeometry(19, 3, 4), stone); top.position.y = 15; arch.add(top);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(3, 0), mat(0x97714e)); rock.position.set(10, 2, -7); rock.scale.set(1.8, 0.7, 1); arch.add(rock);
      addAt(arch, p);
    }
  } else if (mapId === "forest" || mapId === "figure8") {
    const p = anchor(mapId === "figure8" ? 0.72 : 0.64, 1, 88, 14);
    if (p) {
      const tower = new THREE.Group();
      const wood = mat(0x68472e, 0.95);
      for (const x of [-3, 3]) for (const z of [-3, 3]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.48, 10, 0.48), wood); leg.position.set(x, 5, z); tower.add(leg); }
      const platform = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 8), wood); platform.position.y = 8.4; tower.add(platform);
      const hut = new THREE.Mesh(new THREE.BoxGeometry(5, 3.2, 5), mat(0x98704a)); hut.position.y = 10.3; tower.add(hut);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.5, 4), mat(0x3a302b)); roof.position.y = 13.1; roof.rotation.y = Math.PI / 4; tower.add(roof);
      addAt(tower, p);
    }
  } else if (mapId === "city" || mapId === "street" || mapId === "grandprix") {
    const p = anchor(0.43, -1, 118, 22);
    if (p) {
      const station = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(24, 12, 12), mat(0x64747b, 0.75, 0.15)); body.position.y = 6; station.add(body);
      for (let x = -8; x <= 8; x += 4) { const window = new THREE.Mesh(new THREE.BoxGeometry(2.1, 4.5, 0.12), mat(0x9fd4e2, 0.25, 0.1)); window.position.set(x, 7, 6.08); station.add(window); }
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(30, 0.8, 17), mat(0x222c31, 0.55, 0.25)); canopy.position.y = 12.3; station.add(canopy);
      for (const x of [-11, 11]) { const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 12, 0.8), M.metal); pillar.position.set(x, 6, 0); station.add(pillar); }
      addAt(station, p);
    }
  } else if (mapId === "stony") {
    const p = anchor(0.33, 1, 130, 16);
    if (p) {
      const fossil = new THREE.Group();
      const bone = mat(0xd7c8a4, 0.98);
      for (let i = 0; i < 5; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(2.5 + i * 0.25, 0.22, 6, 12, Math.PI), bone); rib.rotation.z = Math.PI / 2; rib.position.set(i * 1.4 - 2.8, 3 + Math.sin(i) * 0.4, 0); fossil.add(rib); }
      const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 11, 7), bone); spine.rotation.z = Math.PI / 2; spine.position.set(0, 3.5, 0); fossil.add(spine);
      const skull = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5, 0), bone); skull.position.set(6.2, 3.5, 0); fossil.add(skull);
      addAt(fossil, p);
    }
  } else if (mapId === "volcano") {
    const p = anchor(0.61, -1, 125, 16);
    if (p) {
      const observatory = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.5, 8, 10), mat(0x514b4a, 0.85, 0.2)); base.position.y = 4; observatory.add(base);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(5.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x8a9495, 0.65, 0.3)); dome.position.y = 8; observatory.add(dome);
      const slit = new THREE.Mesh(new THREE.BoxGeometry(5, 0.25, 0.18), new THREE.MeshBasicMaterial({ color: 0xff6a2b, emissive: 0xff4a13 })); slit.position.set(0, 9.5, 5); observatory.add(slit);
      addAt(observatory, p);
    }
  } else if (mapId === "snow") {
    const p = anchor(0.48, 1, 115, 14);
    if (p) {
      const lodge = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(15, 6.5, 11), mat(0x77553b)); body.position.y = 3.25; lodge.add(body);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(10.5, 5.5, 4), mat(0x34434b)); roof.position.y = 8.7; roof.rotation.y = Math.PI / 4; lodge.add(roof);
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.3, 4, 1.3), mat(0x9a9b96)); chimney.position.set(4, 9, -2); lodge.add(chimney);
      for (const x of [-4, 4]) { const window = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.7, 0.15), new THREE.MeshStandardMaterial({ color: 0xffd58a, emissive: 0x9c672d, emissiveIntensity: 0.45 })); window.position.set(x, 3.8, 5.58); lodge.add(window); }
      addAt(lodge, p);
    }
  } else if (mapId === "megacircuit") {
    const p = anchor(0.22, -1, 180, 24);
    if (p) {
      const cable = new THREE.Group();
      const cableMat = mat(0x6b7779, 0.6, 0.4);
      for (const x of [-22, 22]) { const tower = new THREE.Mesh(new THREE.BoxGeometry(1.8, 48, 1.8), cableMat); tower.position.set(x, 24, 0); cable.add(tower); const arm = new THREE.Mesh(new THREE.BoxGeometry(50, 1.2, 1.2), cableMat); arm.position.set(0, 45, 0); cable.add(arm); }
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 48, 6), mat(0x3e4c50)); line.rotation.z = Math.PI / 2; line.position.y = 44; cable.add(line);
      const car = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 4), mat(0xd8ff3e, 0.4, 0.15)); car.position.set(2, 40, 0); cable.add(car);
      addAt(cable, p);
    }
  } else if (mapId === "stadium") {
    const p = anchor(0.53, 1, 115, 20);
    if (p) {
      const trophy = new THREE.Group();
      const gold = new THREE.MeshStandardMaterial({ color: 0xffd15c, metalness: 0.82, roughness: 0.22 });
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.5, 4.5, 12), gold); cup.position.y = 7; trophy.add(cup);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 2.5, 10), gold); stem.position.y = 3.5; trophy.add(stem);
      const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.2, 3.4), mat(0x20272a)); base.position.y = 1.8; trophy.add(base);
      for (const side of [-1, 1]) { const handle = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.25, 7, 16, Math.PI), gold); handle.position.set(side * 1.8, 7.2, 0); handle.rotation.z = side * Math.PI / 2; trophy.add(handle); }
      addAt(trophy, p);
    }
  }

  // Easter eggs are deliberately away from the racing line: findable on replays,
  // never collision hazards. A small glowing gold trophy is the universal secret.
  const eggPose = anchor(0.83, mapId.length % 2 ? -1 : 1, mapConfig.scenery === "city" ? 155 : 132, 9);
  if (eggPose) {
    const egg = new THREE.Group();
    const gold = new THREE.MeshStandardMaterial({ color: 0xffd45e, metalness: 0.82, roughness: 0.18, emissive: 0x6b4200, emissiveIntensity: 0.45 });
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.48, 1.45, 10), gold); cup.position.y = 2.7; egg.add(cup);
    for (const side of [-1, 1]) { const handle = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.11, 6, 12, Math.PI), gold); handle.position.set(side * 0.7, 2.9, 0); handle.rotation.z = side * Math.PI / 2; egg.add(handle); }
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.7, 8), gold); stem.position.y = 1.6; egg.add(stem);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.3, 0.9), mat(0x242a2d)); base.position.y = 1.15; egg.add(base);
    const glow = new THREE.PointLight(0xffd45e, 3.5, 16); glow.position.y = 3.2; egg.add(glow);
    addAt(egg, eggPose);
  }

  // A cheeky little UFO hides in the desert; tiny mascot totems appear on snow/volcano.
  if (mapId === "desert") {
    const p = anchor(0.91, 1, 175, 12);
    if (p) {
      const ufo = new THREE.Group();
      const saucer = new THREE.Mesh(new THREE.SphereGeometry(3.5, 16, 8), new THREE.MeshStandardMaterial({ color: 0x9baeb7, metalness: 0.85, roughness: 0.2 })); saucer.scale.y = 0.22; saucer.position.y = 5; ufo.add(saucer);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x53d8e8, 0.2, 0.2)); dome.position.y = 5.1; ufo.add(dome);
      const light = new THREE.PointLight(0x53d8e8, 2.2, 18); light.position.y = 4.4; ufo.add(light);
      addAt(ufo, p);
    }
  } else if (mapId === "snow" || mapId === "volcano") {
    const p = anchor(0.91, -1, 168, 12);
    if (p) {
      const mascot = new THREE.Group();
      const color = mapId === "snow" ? 0xf6fbff : 0x7d4b39;
      const body = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 9), mat(color)); body.position.y = 1.5; mascot.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 9), mat(color)); head.position.y = 3.2; mascot.add(head);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x182126 });
      for (const x of [-0.32, 0.32]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), eyeMat); eye.position.set(x, 3.35, 0.83); mascot.add(eye); }
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.2, 7), mat(mapId === "snow" ? 0xd8ff3e : 0xff6b28)); hat.position.y = 4.25; mascot.add(hat);
      addAt(mascot, p);
    }
  }
}

function buildTracksideInfrastructure() {
  // Small grandstands, marshal posts and sponsor boards make the circuits feel
  // like purpose-built venues instead of a road floating in an empty field.
  const seatColors = [0x315c78, 0xc5d2d5, 0xd84b40, 0xd8ff3e];
  for (const [progress, side, rows] of [[0.13, -1, 5], [0.57, 1, 4]]) {
    const basePose = safeSceneryPose(progress, side, mapConfig.width / 2 + 21, 10);
    if (!basePose) continue;
    const stand = new THREE.Group();
    for (let row = 0; row < rows; row++) {
      const tier = new THREE.Mesh(
        new THREE.BoxGeometry(15 + row * 1.8, 0.45, 1.15),
        mat(row % 2 ? 0x747d7c : 0x454d4d, 0.9)
      );
      tier.position.set(0, 0.55 + row * 0.72, row * 0.72);
      tier.castShadow = true;
      stand.add(tier);
      for (let seat = 0; seat < 18; seat++) {
        const block = new THREE.Mesh(
          new THREE.BoxGeometry(0.48, 0.26, 0.42),
          mat(seatColors[(seat + row) % seatColors.length], 0.82)
        );
        block.position.set(-7.0 + seat * 0.82, 0.88 + row * 0.72, row * 0.72 - 0.08);
        stand.add(block);
      }
    }
    // The stand's open/front side points inward at the racing surface, not along the road.
    stand.position.copy(basePose.position);
    stand.position.y = basePose.position.y + 0.05;
    const inward = basePose.normal.clone().multiplyScalar(-side);
    stand.rotation.y = Math.atan2(inward.x, inward.z);
    addWorld(stand);
  }

  for (let i = 0; i < 8; i++) {
    const progress = (i + 0.5) / 8;
    const pose = safeSceneryPose(progress, 1, mapConfig.width / 2 + 11, 2.5);
    if (!pose) continue;
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 3.2, 0.18), M.metal
    );
    post.position.copy(pose.position);
    post.position.y = 1.6;
    addWorld(post);
    const lamp = new THREE.MeshStandardMaterial({
      color: 0xfff1c7, emissive: 0xffd887, emissiveIntensity: 0.65,
      roughness: 0.3
    });
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.25), lamp);
    light.position.copy(post.position);
    light.position.y = 3.15;
    light.rotation.y = pose.yaw;
    addWorld(light);
  }
}

function buildGrandstandsAndAnnouncers() {
  const seatMat = mat(0x315a78, 0.72, 0.08);
  const supportMat = mat(0x606a70, 0.65, 0.25);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fd8e8, roughness: 0.18, metalness: 0.15, transparent: true, opacity: 0.78 });
  const crowdMaterials = [0xd84b40, 0xd8ff3e, 0x315a78, 0xe4e0d5, 0x282e33].map(color => mat(color, 0.9));
  const ledMaterials = [0xd8ff3e, 0xe4483c, 0xf2b632, 0x44c8dc].map(color => mat(color, 0.48, 0.12));
  const isMainStadium = mapId === "stadium";
  const standSlots = isMainStadium ? [0.10, 0.29, 0.52, 0.77] : [0.18, 0.68];
  const tierCount = isMainStadium ? 5 : 3;
  const seatsPerTier = isMainStadium ? 16 : 9;
  standSlots.forEach((t, index) => {
    const side = index % 2 ? -1 : 1;
    const pose = safeSceneryPose(t, side, mapConfig.width / 2 + 24, 12);
    if (!pose) return;
    const stand = new THREE.Group();
    // Tiered concrete seating, steel supports, and repeated seat rows.
    for (let tier = 0; tier < tierCount; tier++) {
      const row = new THREE.Mesh(new THREE.BoxGeometry(25 + tier * 0.35, 0.62, 1.25), tier % 2 ? seatMat : supportMat);
      row.position.set(0, 0.58 + tier * 0.66, -tier * 1.1);
      row.castShadow = true;
      row.receiveShadow = true;
      stand.add(row);
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.15 + tier * 0.6, 0.42), supportMat);
      support.position.set(-11.7, (1.15 + tier * 0.6) / 2, -tier * 1.1);
      stand.add(support);
      const support2 = support.clone(); support2.position.x = 11.7; stand.add(support2);
      // Seat-back/aisle accents add a more believable stadium structure.
      for (const x of [-8.5, 0, 8.5]) {
        const aisle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 1.36), mat(0xb7b8ae, 0.8));
        aisle.position.set(x, 0.9 + tier * 0.66, -tier * 1.1);
        stand.add(aisle);
      }
      for (let seat = 0; seat < seatsPerTier; seat++) {
        const person = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.48, 0.28), crowdMaterials[(seat + tier * 3 + index) % crowdMaterials.length]);
        person.position.set(-((seatsPerTier - 1) * 0.82) / 2 + seat * 0.82, 0.95 + tier * 0.66, -tier * 1.1 + 0.1);
        person.rotation.y = ((seat + index) % 3 - 1) * 0.12;
        stand.add(person);
      }
    }
    for (const side of [-1, 1]) {
      for (let step = 0; step < (isMainStadium ? 6 : 3); step++) {
        const tread = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 0.92), supportMat);
        tread.position.set(side * 12.9, 0.32 + step * 0.55, 1.4 - step * 1.05);
        stand.add(tread);
      }
      const stairRail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.8, 8.8), M.metal);
      stairRail.position.set(side * 14.05, 2.6, -2.25);
      stand.add(stairRail);
    }
    // Front safety rail and end railings.
    const frontRail = new THREE.Mesh(new THREE.BoxGeometry(18.5, 0.16, 0.16), M.metal);
    frontRail.position.set(0, 1.15, 0.72); stand.add(frontRail);
    for (const x of [-9.0, 9.0]) {
      const endRail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.2, 8.0), M.metal);
      endRail.position.set(x, 1.5, -3.5); stand.add(endRail);
    }
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(27, 0.85, 0.42), M.black);
    fascia.position.set(0, 3.8, 1.36);
    stand.add(fascia);
    for (let panel = 0; panel < 4; panel++) {
      const screen = new THREE.Mesh(new THREE.BoxGeometry(6.35, 0.42, 0.1), ledMaterials[(panel + index) % ledMaterials.length]);
      screen.position.set(-9.55 + panel * 6.35, 3.8, 1.6);
      stand.add(screen);
    }
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(29, 0.52, 11.8), M.black);
    canopy.position.set(0, 7.0, -3.9); stand.add(canopy);
    for (const x of [-13, -6.5, 0, 6.5, 13]) {
      const truss = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 11.2), supportMat);
      truss.position.set(x, 6.65, -3.9);
      stand.add(truss);
    }
    stand.position.copy(pose.position);
    stand.position.y = pose.position.y + 0.05;
    const inward = pose.normal.clone().multiplyScalar(-side);
    stand.rotation.y = Math.atan2(inward.x, inward.z);
    addWorld(stand);

    // Elevated broadcast booth attached to the upper edge of each main stand.
    if (isMainStadium && (index === 0 || index === 2)) {
      const booth = new THREE.Group();
      const platform = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 5), supportMat);
      platform.position.y = 7.2; booth.add(platform);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(7.4, 3.2, 4.4), glassMat);
      cabin.position.y = 9.0; booth.add(cabin);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.45, 5.2), M.black);
      roof.position.y = 10.8; booth.add(roof);
      for (const x of [-3.5, 3.5]) for (const z of [-2, 2]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 7.2, 0.35), supportMat);
        leg.position.set(x, 3.6, z); booth.add(leg);
      }
      booth.position.copy(pose.position);
      booth.position.addScaledVector(pose.normal, side * 7);
      const inward = pose.normal.clone().multiplyScalar(-side);
      booth.rotation.y = Math.atan2(inward.x, inward.z);
      addWorld(booth);
    }
  });
}

function buildEnclosedThemedRoute() {
  const mineMaps = new Set(["mineshaft", "cavern", "underground", "gemmine", "quarry"]);
  const waterMaps = new Set(["underwater", "aquarium", "coral", "submarine"]);
  const iceMaps = new Set(["icecave", "glacier", "frostforest", "bobsled"]);
  const lavaMaps = new Set(["lavaforge", "volcanicash"]);
  const crystalMaps = new Set(["crystal", "gemmine"]);
  const isMine = mineMaps.has(mapId);
  const isWater = waterMaps.has(mapId);
  const isIce = iceMaps.has(mapId);
  const isLava = lavaMaps.has(mapId);
  const isCrystal = crystalMaps.has(mapId);
  const isCave = isMine || isIce || isLava || isCrystal || mapId === "dragon";
  if (!isCave && !isWater) return;
  const length = trackCurve.getLength();
  const steps = Math.max(180, Math.min(760, Math.ceil(length / 4.2)));
  const pathPoints = [];
  for (let i = 0; i <= steps; i++) {
    const point = trackCurve.getPointAt(i / steps).clone();
    point.y += isWater ? 7.3 : 7.8;
    pathPoints.push(point);
  }
  const centerline = new THREE.CatmullRomCurve3(pathPoints, false, "centripetal");
  if (isWater) {
    const glass = new THREE.MeshPhysicalMaterial({color:0x56dff2,roughness:0.16,metalness:0.12,transparent:true,opacity:0.16,transmission:0.18,side:THREE.DoubleSide,depthWrite:false});
    const tube = new THREE.Mesh(new THREE.TubeGeometry(centerline,steps,10.1,12,false),glass);
    tube.renderOrder=2; tube.castShadow=false; tube.receiveShadow=false; addWorld(tube);
    const ribMat=new THREE.MeshStandardMaterial({color:0x48d8ee,metalness:0.52,roughness:0.25,emissive:0x073f58,emissiveIntensity:0.55});
    const lightMat=new THREE.MeshBasicMaterial({color:0x8cffff});
    const ribCount=Math.max(24,Math.min(150,Math.floor(length/8)));
    for(let i=0;i<ribCount;i++){
      const pose=poseAt(i/ribCount);
      const rib=new THREE.Mesh(new THREE.TorusGeometry(9.85,0.18,6,24),ribMat);
      rib.position.set(pose.position.x,pose.position.y+7.3,pose.position.z); rib.rotation.y=pose.yaw; addWorld(rib);
      if(i%3===0){const strip=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.16,12.5),lightMat);strip.position.set(pose.position.x,pose.position.y+13.8,pose.position.z);strip.rotation.y=pose.yaw;addWorld(strip);}
    }
    for(const side of [-1,1]){
      const points=[];
      for(let i=0;i<=steps;i++){const pose=poseAt(i/steps);points.push(new THREE.Vector3(pose.position.x+pose.normal.x*side*6.4,pose.position.y+0.2,pose.position.z+pose.normal.z*side*6.4));}
      addWorld(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x39dff5,transparent:true,opacity:0.9})));
    }
  } else {
    const rockColor = isIce ? 0x80b9d1 : isLava ? 0x302629 : isCrystal ? 0x28354b : mapId === "dragon" ? 0x352927 : 0x282b2e;
    // Procedural rock relief: mottled mineral strata and fine cracks on the
    // continuous shell, with a subtle bump map so the cavern isn't a smooth tube.
    const textureCanvas=document.createElement('canvas');textureCanvas.width=256;textureCanvas.height=256;
    const texCtx=textureCanvas.getContext('2d');
    texCtx.fillStyle=isIce?'#7899a8':isLava?'#292124':isCrystal?'#29384b':'#303234';texCtx.fillRect(0,0,256,256);
    for(let n=0;n<950;n++){
      const x=(n*73.37)%256,y=(n*131.71)%256,r=1+(n%11)*0.65;
      const light=(n%2===0)?24:10;
      texCtx.fillStyle=`rgba(${light+18},${light+20},${light+22},${0.12+(n%5)*0.025})`;
      texCtx.beginPath();texCtx.ellipse(x,y,r*1.8,r*0.72,(n%7)*0.35,0,Math.PI*2);texCtx.fill();
      if(n%9===0){texCtx.strokeStyle='rgba(5,8,12,0.35)';texCtx.lineWidth=1;texCtx.beginPath();texCtx.moveTo(x,y);texCtx.lineTo(x+(n%17)-8,y+5+(n%13));texCtx.stroke();}
    }
    const rockTexture=new THREE.CanvasTexture(textureCanvas);rockTexture.wrapS=THREE.RepeatWrapping;rockTexture.wrapT=THREE.RepeatWrapping;rockTexture.repeat.set(5,2);rockTexture.colorSpace=THREE.SRGBColorSpace;
    const bumpTexture=new THREE.CanvasTexture(textureCanvas);bumpTexture.wrapS=THREE.RepeatWrapping;bumpTexture.wrapT=THREE.RepeatWrapping;bumpTexture.repeat.set(5,2);
    const rockMat=new THREE.MeshStandardMaterial({color:rockColor,map:rockTexture,bumpMap:bumpTexture,bumpScale:isIce?0.22:0.42,roughness:0.96,flatShading:true,side:THREE.DoubleSide});
    const timberMat=new THREE.MeshStandardMaterial({color:isIce?0x8cdcf4:isLava?0x514047:isCrystal?0x3b5972:0x735039,roughness:0.9,metalness:isIce||isCrystal?0.22:0.02});
    const glowColor=isLava?0xff5a1f:isIce?0x7ceaff:isCrystal?0x8a74ff:0x68e8ff;
    const glowMat=new THREE.MeshStandardMaterial({color:glowColor,emissive:glowColor,emissiveIntensity:isLava?1.7:1.15,roughness:0.35});
    const shellRadialSegments = isWater ? 12 : 10;
    const shellGeometry = new THREE.TubeGeometry(
      centerline, steps, isWater ? 10.1 : 10.8, shellRadialSegments, false
    );
    if (isCave) {
      // Break the perfect tube silhouette into uneven rock instead of a smooth
      // cylinder. The tunnel still follows the track, but its radius varies by
      // ring and angle like a carved natural mineshaft.
      const shellPositions = shellGeometry.attributes.position;
      for (let ring = 0; ring <= steps; ring++) {
        const center = centerline.getPointAt(ring / steps);
        for (let segment = 0; segment <= shellRadialSegments; segment++) {
          const vertexIndex = ring * (shellRadialSegments + 1) + segment;
          const vertex = new THREE.Vector3().fromBufferAttribute(shellPositions, vertexIndex);
          const radial = vertex.sub(center);
          const roughness = 1
            + 0.055 * Math.sin(segment * 2.7 + ring * 0.17)
            + 0.035 * Math.sin(segment * 5.1 - ring * 0.09)
            + 0.018 * Math.sin(ring * 0.63 + segment);
          radial.multiplyScalar(roughness).add(center);
          shellPositions.setXYZ(vertexIndex, radial.x, radial.y, radial.z);
        }
      }
      shellPositions.needsUpdate = true;
      shellGeometry.computeVertexNormals();
    }
    const shell = new THREE.Mesh(shellGeometry, rockMat);
    shell.castShadow = false;
    shell.receiveShadow = true;
    addWorld(shell);
    const ribCount=Math.max(32,Math.min(210,Math.floor(length/5.8)));
    const stalactiteMat=new THREE.MeshStandardMaterial({color:isIce?0xcaf5ff:isLava?0x44353a:isCrystal?0x526b9b:0x383b3d,roughness:0.98,flatShading:true,metalness:isIce||isCrystal?0.15:0});
    const gemPalette=[0x42e7ff,0x5b8cff,0xa66bff,0xff55dc,0x6bffd2,0xf0fbff,0xffc5f4];
    const gemMaterials=gemPalette.map(color=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0.52,metalness:0.18,roughness:0.24,flatShading:true}));
    const gemGeometries=[new THREE.OctahedronGeometry(1,0),new THREE.ConeGeometry(1,1,5,1),new THREE.ConeGeometry(1,1,6,1)];
    const wallBoulderGeometry=new THREE.DodecahedronGeometry(1,0);
    for(let i=0;i<ribCount;i++){
      const t=i/ribCount, pose=poseAt(t);
      // The rock shell is continuous overhead; timber frames and lamps provide depth cues inside the cavern.
      const archRadius = isIce ? 10.0 : isLava ? 10.15 : 10.05;
      const arch=new THREE.Mesh(new THREE.TorusGeometry(archRadius,isIce?0.3:0.42,5,18),timberMat);
      arch.position.set(pose.position.x,pose.position.y+7.8,pose.position.z);arch.rotation.y=pose.yaw;addWorld(arch);
      if(i%2===0 && isMine)for(const side of [-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(0.46,7.1,0.46),timberMat);post.position.set(pose.position.x+pose.normal.x*side*7.7,pose.position.y+3.55,pose.position.z+pose.normal.z*side*7.7);post.rotation.y=pose.yaw;addWorld(post);}
      if(i%3===0){const lamp=new THREE.Mesh(new THREE.BoxGeometry(isLava?1.7:1.35,0.2,0.5),glowMat);lamp.position.set(pose.position.x,pose.position.y+14.15,pose.position.z);lamp.rotation.y=pose.yaw;addWorld(lamp);}
      if(i%4===1){
        const dripHeight=isIce?2.8+(i%3)*0.85:isLava?1.3+(i%3)*0.3:1.8+(i%4)*0.42;
        const drip=new THREE.Mesh(new THREE.ConeGeometry(isIce?0.38:0.45+(i%3)*0.16,dripHeight,isIce?5:6),stalactiteMat);
        drip.position.set(pose.position.x+pose.normal.x*((i%2)?-2.6:2.6),pose.position.y+14.7,pose.position.z+pose.normal.z*((i%2)?-2.6:2.6));
        drip.rotation.x=Math.PI;addWorld(drip);
      }
      // Irregular wall outcrops break up the tube silhouette into a rough,
      // layered cavern. Their positions stay near the side walls, away from cars.
      if(i%3===1){
        for(const side of [-1,1]){
          const outcrop=new THREE.Mesh(wallBoulderGeometry,rockMat);
          const size=0.9+(i%4)*0.23;
          outcrop.position.set(pose.position.x+pose.normal.x*side*(9.25+(i%3)*0.18),pose.position.y+2.4+(i%5)*0.7,pose.position.z+pose.normal.z*side*(9.25+(i%3)*0.18));
          outcrop.scale.set(size*1.25,size*(isIce?0.8:1.1),size*0.82);
          outcrop.rotation.set((i%5)*0.13,pose.yaw+(i%7)*0.31,(i%4-1.5)*0.12);
          outcrop.castShadow=false;outcrop.receiveShadow=true;addWorld(outcrop);
        }
      }
      if(i%5===2 && (isIce||isCrystal)){
        const floorShard=new THREE.Mesh(new THREE.ConeGeometry(isIce?0.65:0.82,1.8+(i%4)*0.45,5),stalactiteMat);
        const side=i%2?1:-1;
        floorShard.position.set(pose.position.x+pose.normal.x*side*8.4,pose.position.y+0.85,pose.position.z+pose.normal.z*side*8.4);
        floorShard.rotation.z=(i%3-1)*0.12;floorShard.rotation.y=pose.yaw+(i%6)*0.28;addWorld(floorShard);
      }
      if(isCrystal && i%2===0){
        for(const side of [-1,1]){
          const seed=i*17+(side>0?5:0);
          const clusterX=pose.position.x+pose.normal.x*side*(7.8+(i%3)*0.42);
          const clusterZ=pose.position.z+pose.normal.z*side*(7.8+(i%3)*0.42);
          const clusterY=pose.position.y+1.5+(i%4)*0.55;
          for(let g=0;g<4+(i%3);g++){
            const paletteIndex=(seed+g*3)%gemPalette.length;
            const height=1.15+((seed+g*7)%7)*0.48;
            const radius=0.42+((seed+g*11)%5)*0.19;
            const shard=new THREE.Mesh(gemGeometries[g%3],gemMaterials[paletteIndex]);
            const angle=(g/5)*Math.PI*2+(seed%9)*0.18;
            shard.position.set(clusterX+Math.cos(angle)*(0.45+(g%2)*0.42),clusterY+height*0.34,clusterZ+Math.sin(angle)*(0.45+(g%2)*0.42));
            shard.scale.set(radius*(0.72+(seed%4)*0.17),height*(0.75+(seed%3)*0.12),radius*(0.72+(g%3)*0.2));
            shard.rotation.set((g%4)*0.16,(seed+g)*0.63,(g%5-2)*0.11);
            addWorld(shard);
          }
        }
      }
      if(isLava && i%2===0){
        for(const side of [-1,1]){const seam=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.16,5.2),new THREE.MeshBasicMaterial({color:0xff4c1d}));seam.position.set(pose.position.x+pose.normal.x*side*6.9,pose.position.y+0.24,pose.position.z+pose.normal.z*side*6.9);seam.rotation.y=pose.yaw;addWorld(seam);}
      }
    }
    // Two unmistakable cave portals make the transition into the enclosed route readable.
    for(const t of [0.012,0.512]){
      const pose=poseAt(t);
      const portalMat=new THREE.MeshStandardMaterial({color:0x191d20,roughness:1,flatShading:true});
      const portal=new THREE.Mesh(new THREE.TorusGeometry(10.25,1.35,6,18,Math.PI),portalMat);
      portal.position.set(pose.position.x,pose.position.y+7.6,pose.position.z);portal.rotation.y=pose.yaw;addWorld(portal);
      for(const side of [-1,1]){
        const cliff=new THREE.Mesh(new THREE.DodecahedronGeometry(5.8,1),rockMat);
        cliff.position.set(pose.position.x+pose.normal.x*side*12.2,pose.position.y+4.2,pose.position.z+pose.normal.z*side*12.2);
        cliff.scale.set(1.35,1.65,1.2);cliff.rotation.y=pose.yaw+side*0.3;addWorld(cliff);
      }
    }
    const railMaterial=new THREE.MeshStandardMaterial({color:0x92999a,metalness:0.72,roughness:0.32});
    for(const side of [-1,1]){const points=[];for(let i=0;i<=steps;i++){const pose=poseAt(i/steps);points.push(new THREE.Vector3(pose.position.x+pose.normal.x*side*1.65,pose.position.y+0.12,pose.position.z+pose.normal.z*side*1.65));}addWorld(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),steps,0.095,5,false),railMaterial));}
  }
}

function buildMountainPassTunnels() {
  if (mapId !== "mountainpass") return;
  const rock = mat(0x5b625c, 0.96, 0.02);
  const innerRock = mat(0x30383a, 0.98, 0.02);
  const marker = new THREE.MeshStandardMaterial({ color: 0xd8e7d0, emissive: 0x51664c, emissiveIntensity: 0.5 });
  const segmentCount = 8;
  const tunnelLength = 0.065;
  const sideOffset = mapConfig.width / 2 + 7.3;

  for (const center of [0.30, 0.69]) {
    for (let i = 0; i < segmentCount; i++) {
      const progress = center - tunnelLength / 2 + (i + 0.5) / segmentCount * tunnelLength;
      const pose = poseAt(progress);
      const segmentLength = trackCurve.getLength() * tunnelLength / segmentCount + 0.8;
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(mapConfig.width + 16, 1.8, segmentLength),
        i === 0 || i === segmentCount - 1 ? rock : innerRock
      );
      roof.position.set(pose.position.x, pose.position.y + 9.1, pose.position.z);
      roof.rotation.y = pose.yaw;
      roof.castShadow = false;
      roof.receiveShadow = true;
      addWorld(roof);

      for (const side of [-1, 1]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(2.1, 8.5, segmentLength), rock);
        wall.position.set(
          pose.position.x + pose.normal.x * side * sideOffset,
          pose.position.y + 4.25,
          pose.position.z + pose.normal.z * side * sideOffset
        );
        wall.rotation.y = pose.yaw;
        wall.receiveShadow = true;
        addWorld(wall);
      }
    }

    for (const entrance of [center - tunnelLength / 2, center + tunnelLength / 2]) {
      const pose = poseAt(entrance);
      for (const side of [-1, 1]) {
        const light = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.3), marker);
        light.position.set(
          pose.position.x + pose.normal.x * side * sideOffset,
          pose.position.y + 7.8,
          pose.position.z + pose.normal.z * side * sideOffset
        );
        addWorld(light);
      }
    }
  }
}

function buildMountainPassTerrain() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), mat(mapConfig.grass));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.25;
  ground.receiveShadow = true;
  addWorld(ground);

  const angularSteps = 144;
  const radialSteps = 48;
  const vertices = [];
  const colors = [];
  const indices = [];

  for (let ring = 0; ring <= radialSteps; ring++) {
    const radius = ring / radialSteps * 1.07;
    for (let segment = 0; segment < angularSteps; segment++) {
      const angle = segment / angularSteps * Math.PI * 2;
      const x = Math.cos(angle) * radius * 380;
      const z = Math.sin(angle) * radius * 273;
      const height = mountainPassGroundHeight(x, z);
      const color = new THREE.Color(height > 158 ? 0xe2ecec : height > 72 ? 0x747c7a : height > 22 ? 0x65715f : 0x526a4e);
      const variation = 1 + Math.sin(angle * 13 + ring * 0.42) * 0.025;
      color.multiplyScalar(variation);
      vertices.push(
        x,
        height,
        z
      );
      colors.push(color.r, color.g, color.b);
    }
  }

  for (let ring = 0; ring < radialSteps; ring++) {
    for (let segment = 0; segment < angularSteps; segment++) {
      const nextSegment = (segment + 1) % angularSteps;
      const a = ring * angularSteps + segment;
      const b = ring * angularSteps + nextSegment;
      const c = (ring + 1) * angularSteps + segment;
      const d = (ring + 1) * angularSteps + nextSegment;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const terrain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.98,
    flatShading: true,
    vertexColors: true,
    side: THREE.DoubleSide
  }));
  terrain.receiveShadow = true;
  addWorld(terrain);
}

function buildMap() {
  clearGroup(world);
  mapConfig = MAPS[mapId];
  trackCurve = createTrackCurve(mapConfig);
  rebuildTrackSampleCache();
  const stadiumQualityMode = mapId === "stadium";
  renderer.shadowMap.enabled = !stadiumQualityMode;
  sun.castShadow = !stadiumQualityMode;

  scene.background = new THREE.Color(mapConfig.sky);
  scene.fog = new THREE.Fog(mapConfig.sky, 420, 1900);

  buildEnvironment();
  buildRoad();
  buildHighwayDetails();
  buildCurbsAndBarriers();
  buildF1PitLane();
  buildMountainPassTunnels();
  buildEnclosedThemedRoute();
  buildTracksideInfrastructure();
  buildGrandstandsAndAnnouncers();
  buildStartFinish();
  buildCheckpoints();

  placeCarsOnTrack();
  if (player2) {
    const p2Start = poseAt(currentGridProgress, -currentGridLane);
    player2.position.copy(p2Start.position);
    player2.position.y = p2Start.position.y + 0.03;
    player2Yaw = p2Start.yaw;
    player2Speed = 0;
    player2LateralVelocity = 0;
  }
  drawMinimap();
}

// ============================================================
// CAR CONSTRUCTION
// ============================================================

function createCar(type, isAI = false) {
  const car = new THREE.Group();
  const isFormula = type.name === "Formula Racer";
  const isRally = type.name === "Rally Racer";
  const isHypercar = type.name === "Hypercar";
  const isMuscle = type.name === "Muscle V8";
  const carUpgrades = isAI ? {} : upgrades[selectedCarId] || {};
  const paint = new THREE.MeshPhysicalMaterial({
    color: type.color,
    roughness: 0.27,
    metalness: 0.32,
    clearcoat: 0.82,
    clearcoatRoughness: 0.18
  });

  function piece(geometry, material, x, y, z) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = !isAI;
    mesh.receiveShadow = true;
    car.add(mesh);
    return mesh;
  }

  const bodyPlan = new THREE.Shape();
  bodyPlan.moveTo(-type.width * 0.34, -type.length * 0.5);
  bodyPlan.lineTo(type.width * 0.34, -type.length * 0.5);
  bodyPlan.quadraticCurveTo(type.width * 0.49, -type.length * 0.48, type.width * 0.49, -type.length * 0.31);
  bodyPlan.lineTo(type.width * 0.47, type.length * 0.22);
  bodyPlan.quadraticCurveTo(type.width * 0.43, type.length * 0.43, type.width * 0.25, type.length * 0.49);
  bodyPlan.quadraticCurveTo(0, type.length * 0.53, -type.width * 0.25, type.length * 0.49);
  bodyPlan.quadraticCurveTo(-type.width * 0.43, type.length * 0.43, -type.width * 0.47, type.length * 0.22);
  bodyPlan.lineTo(-type.width * 0.49, -type.length * 0.31);
  bodyPlan.quadraticCurveTo(-type.width * 0.49, -type.length * 0.48, -type.width * 0.34, -type.length * 0.5);
  const bodyGeometry = new THREE.ExtrudeGeometry(bodyPlan, {
    depth: 0.38,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.045,
    bevelThickness: 0.035
  });
  bodyGeometry.rotateX(Math.PI / 2);
  piece(bodyGeometry, paint, 0, 0.84, 0);

  if (isFormula) {
    piece(new THREE.BoxGeometry(type.width * 0.48, 0.28, type.length * 0.32), M.black, 0, 0.96, -0.08);
    piece(new THREE.BoxGeometry(type.width * 0.46, 0.28, type.length * 0.42), paint, 0, 0.7, -0.05);
    for (const side of [-1, 1]) {
      piece(new THREE.BoxGeometry(0.46, 0.3, 1.22), paint, side * type.width * 0.37, 0.67, -0.08);
      piece(new THREE.BoxGeometry(0.055, 0.24, 0.055), M.black, side * type.width * 0.2, 1.13, 0.08);
    }
    piece(new THREE.TorusGeometry(0.31, 0.045, 7, 24, Math.PI), M.black, 0, 1.36, 0.08);
    piece(new THREE.BoxGeometry(type.width + 1.0, 0.09, 0.52), M.black, 0, 0.43, type.length * 0.49);
    piece(new THREE.BoxGeometry(0.07, 0.28, 0.52), M.black, -type.width * 0.48, 0.55, type.length * 0.49);
    piece(new THREE.BoxGeometry(0.07, 0.28, 0.52), M.black, type.width * 0.48, 0.55, type.length * 0.49);
    piece(new THREE.BoxGeometry(0.11, 0.52, 0.13), M.black, -0.42, 1.08, -type.length * 0.39);
    piece(new THREE.BoxGeometry(0.11, 0.52, 0.13), M.black, 0.42, 1.08, -type.length * 0.39);
    piece(new THREE.BoxGeometry(type.width + 0.65, 0.12, 0.22), paint, 0, 1.36, -type.length * 0.42);
  } else {
    piece(new THREE.BoxGeometry(type.width * 0.84, 0.2, type.length * 0.35),
      paint, 0, 0.78, type.length * 0.3);
    const cabin = isRally
      ? { width: 0.7, height: 0.58, length: 0.39, y: 1.06, z: -0.16 }
      : isHypercar
        ? { width: 0.64, height: 0.28, length: 0.31, y: 0.91, z: -0.1 }
        : isMuscle
          ? { width: 0.58, height: 0.36, length: 0.27, y: 0.94, z: -0.2 }
          : { width: 0.63, height: 0.43, length: 0.35, y: 0.98, z: -0.05 };
    piece(new THREE.BoxGeometry(type.width * cabin.width, cabin.height, type.length * cabin.length),
      M.black, 0, cabin.y, cabin.z);
    piece(new THREE.BoxGeometry(type.width * cabin.width * 0.77, cabin.height * 0.68, type.length * cabin.length * 0.61),
      M.glass, 0, cabin.y + cabin.height * 0.24, cabin.z + 0.025);
    piece(new THREE.BoxGeometry(type.width + 0.45, 0.1, 0.32),
      M.black, 0, 0.42, type.length * 0.49);
    piece(new THREE.BoxGeometry(type.width + 0.3, 0.13, 0.38),
      M.black, 0, 0.93, -type.length * 0.43);
    if (isRally) {
      for (const side of [-1, 1]) {
        piece(new THREE.BoxGeometry(0.16, 0.2, type.length * 0.72), M.black, side * type.width * 0.48, 0.63, 0);
      }
      piece(new THREE.BoxGeometry(type.width * 0.85, 0.1, type.length * 0.52), M.black, 0, 1.4, -0.08);
    }
    if (isHypercar) {
      piece(new THREE.BoxGeometry(type.width * 0.82, 0.1, type.length * 0.3), paint, 0, 0.62, -0.06);
      piece(new THREE.BoxGeometry(type.width + 0.56, 0.12, 0.28), paint, 0, 0.91, -type.length * 0.46);
      for (const side of [-1, 1]) {
        piece(new THREE.BoxGeometry(0.18, 0.15, type.length * 0.35), M.black, side * type.width * 0.43, 0.58, -0.15);
      }
    }
    if (isMuscle) {
      piece(new THREE.BoxGeometry(type.width * 0.78, 0.12, type.length * 0.38), paint, 0, 0.88, type.length * 0.27);
      piece(new THREE.BoxGeometry(type.width * 0.24, 0.18, type.length * 0.12), M.black, 0, 1.02, type.length * 0.28);
      piece(new THREE.BoxGeometry(type.width * 0.85, 0.08, 0.18), M.black, 0, 0.53, -type.length * 0.49);
    }
  }

  const wheels = [];
  const wheelRadius = isFormula ? 0.43 : isRally ? 0.42 : isHypercar ? 0.35 : 0.37;

  for (const x of [-1, 1]) {
    for (const z of [-type.length * 0.32, type.length * 0.32]) {
      const wheel = piece(
        new THREE.CylinderGeometry(wheelRadius, wheelRadius, isFormula ? 0.34 : 0.28, 20),
        M.tire, x * type.width * (isFormula ? 0.56 : 0.48), 0.39, z
      );
      wheel.rotation.z = Math.PI / 2;
      wheels.push(wheel);

      const rim = piece(
        new THREE.CylinderGeometry(0.19, 0.19, 0.3, 12),
        M.metal, x * type.width * (isFormula ? 0.56 : 0.48), 0.39, z
      );
      rim.rotation.z = Math.PI / 2;

      const rimLip = piece(
        new THREE.TorusGeometry(0.19, 0.035, 8, 18),
        M.white,
        x * type.width * (isFormula ? 0.56 : 0.48) + Math.sign(x) * 0.16,
        0.39,
        z
      );
      rimLip.rotation.y = Math.PI / 2;
    }
  }

  const headlight = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xc9f4ff, emissiveIntensity: 1.1
  });

  for (const x of [-0.55, 0.55]) {
    piece(new THREE.BoxGeometry(0.34, 0.1, 0.06),
      headlight, x, 0.69, type.length / 2);

    piece(new THREE.BoxGeometry(0.32, 0.1, 0.06),
      new THREE.MeshStandardMaterial({
        color: 0xff2828, emissive: 0x800000, emissiveIntensity: 0.7
      }),
      x, 0.69, -type.length / 2);
  }

  // Rally roof lights and extra bodywork.
  if (type.name === "Rally Racer") {
    piece(new THREE.BoxGeometry(1.25, 0.1, 0.24), M.black, 0, 1.3, -0.4);
    for (let i = -2; i <= 2; i++) {
      piece(new THREE.SphereGeometry(0.08, 8, 8), headlight, i * 0.22, 1.35, -0.4);
    }
  }

  if (type.name === "Hypercar") {
    piece(new THREE.BoxGeometry(1.25, 0.08, 1.15), paint, 0, 0.83, 0.15);
  }

  // Added vehicle-specific details apply only to the new cars. The four original
  // car meshes above remain unchanged, so their familiar silhouettes are preserved.
  if (type.name === "Street RS") {
    piece(new THREE.BoxGeometry(type.width * 0.16, 0.035, type.length * 0.42), M.lime, 0, 0.81, -0.02);
  }

  if (type.name === "Endurance GT") {
    piece(new THREE.BoxGeometry(type.width * 0.88, 0.09, 0.22), paint, 0, 1.13, -type.length * 0.42);
    piece(new THREE.BoxGeometry(type.width * 0.08, 0.025, type.length * 0.5), M.white, 0, 0.805, 0);
  }

  if (type.name === "Muscle V8") {
    piece(new THREE.BoxGeometry(type.width * 0.28, 0.13, type.length * 0.2), M.black, 0, 0.86, type.length * 0.22);
  }

  if (type.name === "Drift Spec") {
    piece(new THREE.BoxGeometry(type.width + 0.7, 0.1, 0.3), paint, 0, 1.12, -type.length * 0.43);
    for (const side of [-1, 1]) {
      piece(new THREE.BoxGeometry(0.12, 0.16, type.length * 0.52), M.black, side * type.width * 0.48, 0.43, 0);
    }
  }

  if (type.name === "Electric GT") {
    const electricTrim = new THREE.MeshStandardMaterial({ color: 0x9b8aff, emissive: 0x4e39ff, emissiveIntensity: 0.75, roughness: 0.32, metalness: 0.25 });
    for (const side of [-1, 1]) {
      piece(new THREE.BoxGeometry(0.045, 0.055, type.length * 0.56), electricTrim, side * type.width * 0.48, 0.57, 0);
    }
  }

  if (type.name === "Prototype X") {
    piece(new THREE.BoxGeometry(type.width + 0.75, 0.08, 0.32), paint, 0, 0.4, type.length * 0.5);
    piece(new THREE.BoxGeometry(0.12, 0.25, type.length * 0.24), M.black, -type.width * 0.36, 0.92, -type.length * 0.34);
    piece(new THREE.BoxGeometry(0.12, 0.25, type.length * 0.24), M.black, type.width * 0.36, 0.92, -type.length * 0.34);
  }

  if (isAI) {
    // A small visible roof stripe distinguishes computer-controlled racers.
    piece(new THREE.BoxGeometry(0.12, 0.03, type.length * 0.65),
      M.white, 0, 0.84, 0);
  }

  const engineLevel = clamp(Number(carUpgrades.engine) || 0, 0, 5);
  const aeroLevel = clamp(Number(carUpgrades.aero) || 0, 0, 5);
  const gripLevel = clamp(Number(carUpgrades.grip) || 0, 0, 5);
  const brakeLevel = clamp(Number(carUpgrades.brakes) || 0, 0, 5);
  if (engineLevel > 0) {
    piece(new THREE.BoxGeometry(type.width * (0.18 + engineLevel * 0.012), 0.13, type.length * 0.16), M.black, 0, 1.03, type.length * 0.12);
    for (const side of [-1, 1]) {
      piece(new THREE.BoxGeometry(0.1, 0.07, 0.32 + engineLevel * 0.025), M.metal, side * type.width * 0.29, 0.91, -type.length * 0.18);
    }
  }
  if (aeroLevel > 0) {
    const wingWidth = type.width + 0.35 + aeroLevel * 0.08;
    piece(new THREE.BoxGeometry(wingWidth, 0.12, 0.2), M.black, 0, 1.13 + aeroLevel * 0.025, -type.length * 0.45);
    for (const side of [-1, 1]) {
      piece(new THREE.BoxGeometry(0.12, 0.3 + aeroLevel * 0.035, 0.16), M.black, side * type.width * 0.34, 0.98, -type.length * 0.43);
    }
    if (aeroLevel >= 3) piece(new THREE.BoxGeometry(type.width + 0.3, 0.1, 0.4), M.black, 0, 0.48, type.length * 0.48);
  }
  if (gripLevel > 0) {
    wheels.forEach(wheel => wheel.scale.set(1 + gripLevel * 0.035, 1, 1));
  }
  if (brakeLevel > 0) {
    const caliper = mat(brakeLevel >= 3 ? 0xff5536 : 0xd8a238, 0.5, 0.2);
    for (const side of [-1, 1]) for (const z of [-type.length * 0.32, type.length * 0.32]) {
      piece(new THREE.BoxGeometry(0.16, 0.28, 0.22), caliper, side * type.width * 0.5, 0.43, z + 0.08);
    }
  }

  car.userData.wheels = wheels;
  car.userData.type = type;
  car.userData.velocity = new THREE.Vector3();
  car.userData.damage = 0;

  return car;
}

let player = createCar(selectedCar);
scene.add(player);

let speed = 0;
let yaw = 0;
let steering = 0;
let lateralVelocity = 0;
let verticalVelocity = 0;
let handbrakeSlip = 0;

const opponents = [];
let currentGridProgress = 0;
let currentGridLane = -2.25;

function createOpponents() {
  opponents.forEach(r => scene.remove(r.car));
  opponents.length = 0;

  const colors = [0xe4483c, 0x329bd7, 0xf1f0e7, 0xf2b632, 0x9c59df, 0x36c78b, 0xf078b8, 0x8b9aa6, 0xff7a35, 0xb8d94a];
  const names = ['A. Vega', 'M. Chen', 'J. Carter', 'S. Patel', 'L. Brooks', 'N. Kim', 'R. Diaz', 'T. Morgan', 'K. Wilson', 'D. Reed'];
  const carStyles = ['gt', 'rally', 'hyper', 'muscle', 'street', 'endurance', 'drift', 'electric', 'prototype', 'formula'];
  const paceProfiles = [0.94, 1.04, 0.98, 1.08, 0.91, 1.01, 1.06, 0.93, 1.03, 0.97];
  const cornerProfiles = [1.12, 0.91, 1.04, 0.96, 1.16, 0.94, 1.08, 0.99, 0.89, 1.1];
  for (let i = 0; i < selectedAICount; i++) {
    const type = { ...CAR_TYPES[carStyles[i % carStyles.length]], color: colors[i % colors.length] };
    const car = createCar(type, true);
    const isPointToPoint = mapConfig.routeMode === "point-to-point";
    const row = Math.floor(i / (isPointToPoint ? 4 : 2));
    const gridLanes = [-4.25, -1.4, 1.4, 4.25].filter(lane => Math.abs(lane - currentGridLane) > 0.2);
    const lane = isPointToPoint
      ? gridLanes[i % gridLanes.length]
      : i % 2 === 0 ? 2.25 : -2.25;
    const circuitLength = Math.max(1, trackCurve.getLength());
    const rowGap = 8.2 / circuitLength;
    const progress = isPointToPoint
      ? Math.min(1, row * rowGap)
      : ((currentGridProgress - rowGap * (row + 1)) % 1 + 1) % 1;
    const racer = {
      car, progress, lane, speed: 24 - i * 0.25,
      skill: 0.94, wobble: 0.25,
      reaction: 1, aggression: 0.45,
      paceFactor: paceProfiles[i] * (0.97 + Math.random() * 0.06),
      skillFactor: 0.90 + Math.random() * 0.20,
      aggressionFactor: 0.88 + Math.random() * 0.24,
      corneringFactor: cornerProfiles[i],
      steerRate: 1.8 + (i % 4) * 0.45,
      lanePreference: ((i % 3) - 1) * 0.45,
      steering: 0,
      currentSpeed: 0, baseLane: lane, targetLane: lane, lateralVelocity: 0,
      heading: poseAt(progress, lane).yaw,
      previousPosition: new THREE.Vector3(),
      lastProgress: progress, stallTime: 0,
      driverName: names[i % names.length]
    };
    opponents.push(racer);
    scene.add(car);
  }
  setAIDifficulty(selectedDifficulty, false);
}

function setAIDifficulty(level, resetLevel = true) {
  selectedDifficulty = AI_LEVELS[level] ? level : "medium";
  selectedAILevel = resetLevel
    ? AI_PRESET_LEVELS[selectedDifficulty]
    : clamp(selectedAILevel, 1, 100);
  const levelSlider = document.getElementById("ai-level-slider");
  const levelValue = document.getElementById("ai-level-value");
  if (levelSlider) levelSlider.value = String(selectedAILevel);
  if (levelValue) levelValue.textContent = String(selectedAILevel);
  const cfg = AI_LEVELS[selectedDifficulty];
  // AI speed scales with the player's current car/upgrades and selected difficulty.
  // AI can never exceed the player's current top speed, even on Expert.
  const baseSpeedMultiplier = Math.min(1.15, (selectedAILevel / 70) * 1.15);
  const playerTopSpeed = getStats().topSpeed * 0.72 * (window.apexWeatherMode === "rain" ? 0.91 : 1);
  opponents.forEach((racer, i) => {
    const speedMultiplier = clamp(baseSpeedMultiplier * racer.paceFactor, 0.25, 1.15);
    racer.speedMultiplier = speedMultiplier;
    racer.speed = playerTopSpeed * speedMultiplier;
    racer.skill = cfg.skill * racer.skillFactor * 1.08;
    racer.wobble = Math.max(0.008, cfg.wobble * 0.90 / racer.skillFactor);
    racer.reaction = (1.04 + selectedAILevel * 0.002) * racer.skillFactor;
    racer.aggression = (0.52 + selectedAILevel * 0.003) * racer.aggressionFactor;
  });
  saveGarage();
}

function placeCarsOnTrack() {
  if (!trackCurve) return;
  const isPointToPoint = mapConfig.routeMode === "point-to-point";
  const gridStart = 0;
  const gridLanes = isPointToPoint ? [-4.25, -1.4, 1.4, 4.25] : [-2.25, 2.25];
  currentGridLane = gridLanes[Math.floor(Math.random() * gridLanes.length)];
  currentGridProgress = gridStart;
  const start = poseAt(gridStart, currentGridLane);
  player.position.copy(start.position);
  player.position.y = start.position.y + 0.03;
  yaw = start.yaw;
  player.rotation.set(0, yaw, 0);
  player.userData.trackHeading = yaw;

  previousProgress = gridStart;
  const circuitLength = Math.max(1, trackCurve.getLength());
  const rowGap = 8.2 / circuitLength;
  const aiGridLanes = isPointToPoint
    ? gridLanes.filter(lane => lane !== currentGridLane)
    : null;
  opponents.forEach((racer, i) => {
    racer.currentSpeed = 0;
    racer.speed = 0.001;
    const row = Math.floor(i / (isPointToPoint ? aiGridLanes.length : 2));
    const lane = isPointToPoint
      ? aiGridLanes[i % aiGridLanes.length]
      : i % 2 === 0 ? 2.25 : -2.25;
    // Grid rows are separated by real track distance, not a fixed spline fraction.
    racer.progress = isPointToPoint
      ? Math.min(1, row * rowGap)
      : ((gridStart - rowGap * (row + 1)) % 1 + 1) % 1;
    racer.lane = lane;
    racer.baseLane = lane;
    racer.targetLane = lane;
    racer.currentSpeed = 0;
    racer.stallTime = 0;
    racer.lastProgress = racer.progress;
    const p = poseAt(racer.progress, lane);
    racer.car.position.copy(p.position);
    racer.car.position.y = p.position.y + 0.03;
    let heading = p.yaw;
    const modelForward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    if (modelForward.dot(p.tangent) < 0) heading += Math.PI;
    racer.heading = heading;
    racer.car.rotation.set(0, heading, 0);
    racer.car.userData.trackHeading = heading;
  });
}


// ============================================================
// SCREENS AND GARAGE
// ============================================================

const screenIds = [
  "home-screen", "garage-screen", "tracks-screen",
  "upgrades-screen", "controls-screen",
  "pause-screen", "finish-screen"
];

let currentScreen = "home";
let raceStarted = false;
let countdownActive = false;
let countdown = 3;
let countdownClock = 0;
let paused = false;
let finished = false;
let tutorialMode = false;
let raceTime = 0;
let raceLaps = 3;
let lap = 1;
let checkpointStage = 0;
let previousProgress = 0;
let cameraMode = 0;
let garageOrbitYaw = 0;
let garageOrbitDistance = 10.5;
let garageDragActive = false;
let garageDragX = 0;
let toastClock = 0;
let lastTimestamp = 0;
let minimapClock = 0;
let collisionFlash = 0;
let crashRespawnEnabled = false;
try { crashRespawnEnabled = localStorage.getItem("apexCrashExplosionRespawn") === "true"; } catch (_) {}
let crashEffects = [];
let crashSequence = null;
let lastCrashTrigger = 0;
let raceReward = 0;
let audioEnabled = true;

function showScreen(name) {
  currentScreen = name;
  document.body.dataset.screen = name;

  screenIds.forEach(id => $(id).classList.add("hidden"));
  if (name !== "race") $(name + "-screen").classList.remove("hidden");

  const inRace = name === "race";
  if (typeof world !== "undefined" && world) world.visible = name !== "garage";
  if (typeof showroom !== "undefined" && showroom) {
    showroom.visible = name === "garage";
    if (name === "garage" && player) {
      garageOrbitYaw = yaw + Math.PI;
      garageOrbitDistance = 10.5;
      showroom.position.set(player.position.x, 0, player.position.z);
      if (!showroom.userData.built) { buildShowroom(); showroom.userData.built = true; }
    }
  }
  if (typeof opponents !== "undefined") opponents.forEach(r => { r.car.visible = name !== "garage"; });
  if (player && name !== "race") player.visible = true;

  $("race-hud").classList.toggle("hidden", !inRace);
  $("speed-panel").classList.toggle("hidden", !inRace);
  $("minimap-wrap").classList.toggle("hidden", !inRace);
  $("bottom-hud").classList.toggle("hidden", !inRace);

  $("session-label").textContent = {
    home: "APEX MOTORSPORT",
    garage: "GARAGE",
    tracks: "CIRCUIT SELECT",
    upgrades: "ENGINEERING",
    controls: "DRIVER TRAINING",
    race: tutorialMode ? "DRIVING TUTORIAL" : "RACE SESSION",
    pause: "SESSION PAUSED",
    finish: "SESSION COMPLETE"
  }[name] || "APEX RACING";

  if (name === "home") updateHome();
  const p2Panel = document.getElementById("player2-garage-panel");
  if (p2Panel && typeof splitScreenEnabled !== "undefined") {
    const showP2Garage = splitScreenEnabled && name === "garage";
    p2Panel.classList.toggle("is-visible", showP2Garage);
    document.body.classList.toggle("two-player-garage", showP2Garage);
  }
}

window.addEventListener("pointerdown", event => {
  if (currentScreen !== "garage" || event.target.closest("button, input, select, textarea")) return;
  garageDragActive = true;
  garageDragX = event.clientX;
  document.body.classList.add("garage-orbiting");
});
window.addEventListener("pointermove", event => {
  if (!garageDragActive || currentScreen !== "garage") return;
  garageOrbitYaw += (garageDragX - event.clientX) * 0.009;
  garageDragX = event.clientX;
});
window.addEventListener("pointerup", () => {
  garageDragActive = false;
  document.body.classList.remove("garage-orbiting");
});
window.addEventListener("pointercancel", () => {
  garageDragActive = false;
  document.body.classList.remove("garage-orbiting");
});
window.addEventListener("wheel", event => {
  if (currentScreen !== "garage" || !event.target.closest("#garage-screen")) return;
  event.preventDefault();
  garageOrbitDistance = clamp(garageOrbitDistance + event.deltaY * 0.012, 7, 18);
}, { passive: false });

function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  toastClock = 2.2;
}

function formatTime(time) {
  const mins = Math.floor(time / 60).toString().padStart(2, "0");
  const secs = Math.floor(time % 60).toString().padStart(2, "0");
  const ms = Math.floor((time % 1) * 1000).toString().padStart(3, "0");
  return `${mins}:${secs}.${ms}`;
}

function updateHome() {
  $("home-car").textContent = selectedCar.name.toUpperCase();
  $("home-track").textContent = mapConfig.name.toUpperCase();
  $("best-result").textContent = bestTime ? formatTime(bestTime) : "NO RECORD";
  $("credits").textContent = Math.floor(credits).toLocaleString();
}

function renderGarage() {
  const list = $("car-list");
  list.innerHTML = "";

  Object.entries(CAR_TYPES).forEach(([id, car]) => {
    const unlocked = unlockedCars.includes(id);
    const button = document.createElement("button");
    button.className = "choice-card" + (selectedCarId === id ? " selected" : "");
    button.innerHTML = `
      <span class="car-swatch" style="background:#${car.color.toString(16).padStart(6, "0")}"></span>
      <span class="choice-info">
        <strong>${car.name}</strong>
        <small>${unlocked ? `${Math.round(car.topSpeed * 3.6)} KM/H MAX · ${car.handling.toFixed(2)} HANDLING` : "LOCKED VEHICLE"}</small>
      </span>
      <span class="choice-value">${unlocked ? (selectedCarId === id ? "✓" : "SELECT") : `${car.price.toLocaleString()} CR`}</span>
    `;

    button.addEventListener("click", () => {
      if (!unlocked) {
        if (credits < car.price) {
          showToast(`NEED ${(car.price - credits).toLocaleString()} MORE CREDITS`);
          return;
        }
        credits -= car.price;
        unlockedCars.push(id);
        selectedCarId = id;
        selectedCar = { ...CAR_TYPES[id], color: Number(paintColors[id]) || CAR_TYPES[id].color };
        const displayPosition = player.position.clone();
        scene.remove(player); player = createCar(selectedCar); scene.add(player);
        player.position.copy(displayPosition); player.rotation.y = yaw;
        updateCredits();
        renderGarage();
        renderUpgrades();
        updateCarDetails();
        showToast(`${car.name.toUpperCase()} UNLOCKED`);
        return;
      }

      selectedCarId = id;
      selectedCar = { ...CAR_TYPES[id], color: Number(paintColors[id]) || CAR_TYPES[id].color };
      const displayPosition = player.position.clone();
      scene.remove(player); player = createCar(selectedCar); scene.add(player);
      player.position.copy(displayPosition); player.rotation.y = yaw;
      renderGarage();
      renderUpgrades();
      updateCarDetails();
      saveGarage();
    });

    list.appendChild(button);
  });

  updateCarDetails();
  renderGarageUpgrades();
}

function updateCarDetails() {
  const stats = getStats();
  const rows = [
    ["TOP SPEED", stats.topSpeed / 80 * 100, `${Math.round(stats.topSpeed * 3.6)} KM/H`],
    ["ACCELERATION", stats.acceleration / 42 * 100, stats.acceleration.toFixed(1)],
    ["CORNERING", stats.handling / 1.6 * 100, stats.handling.toFixed(2)],
    ["BRAKING", stats.braking / 48 * 100, stats.braking.toFixed(1)]
  ];

  $("car-details").innerHTML = rows.map(([name, value, label]) => `
    <div class="detail-row">
      <div class="detail-head"><span>${name}</span><span>${label}</span></div>
      <div class="stat-track"><i style="width:${clamp(value, 0, 100)}%"></i></div>
    </div>
  `).join("");

  $("select-car-btn").textContent = "DRIVE " + selectedCar.name.toUpperCase() + "  ↗";
}

let trackSearchQuery = "";

function drawTrackPreview(trackId) {
  const canvas = $("track-preview-canvas");
  const context = canvas.getContext("2d");
  const config = MAPS[trackId];
  if (!config) return;
  const curve = trackId === mapId ? trackCurve : createTrackCurve(config);
  const width = canvas.width;
  const height = canvas.height;
  const samples = Array.from({ length: 121 }, (_, index) => curve.getPointAt(index / 120));
  const minX = Math.min(...samples.map(point => point.x));
  const maxX = Math.max(...samples.map(point => point.x));
  const minZ = Math.min(...samples.map(point => point.z));
  const maxZ = Math.max(...samples.map(point => point.z));
  const scale = Math.min((width - 100) / Math.max(1, maxX - minX), (height - 52) / Math.max(1, maxZ - minZ));
  const left = (width - (maxX - minX) * scale) / 2;
  const top = (height - (maxZ - minZ) * scale) / 2;
  const screenPoint = point => ({ x: left + (point.x - minX) * scale, y: top + (point.z - minZ) * scale });

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#101918";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(226,239,231,.07)";
  context.lineWidth = 1;
  for (let x = 24; x < width; x += 48) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  for (let y = 24; y < height; y += 48) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }

  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  samples.forEach((point, index) => {
    const screen = screenPoint(point);
    if (index === 0) context.moveTo(screen.x, screen.y);
    else context.lineTo(screen.x, screen.y);
  });
  if (config.routeMode !== "point-to-point") context.closePath();
  context.strokeStyle = "#475854";
  context.lineWidth = 18;
  context.stroke();
  context.strokeStyle = "#d8ff3e";
  context.lineWidth = 2.5;
  context.stroke();

  const start = screenPoint(samples[0]);
  const finish = screenPoint(samples[samples.length - 1]);
  for (const [point, color] of [[start, "#d8ff3e"], [finish, config.routeMode === "point-to-point" ? "#f27655" : "#d8ff3e"]]) {
    context.beginPath();
    context.arc(point.x, point.y, 5, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
  }
}

function renderTracks() {
  const list = $("track-list");
  list.innerHTML = "";
  // The curated track roster is easy to browse with an in-panel search.
  let search = $("track-search");
  if (!search) {
    search = document.createElement("input");
    search.id = "track-search";
    search.type = "search";
    search.placeholder = "SEARCH TRACKS — e.g. WATER, MINE, WIZARD";
    search.setAttribute("aria-label", "Search racing tracks");
    search.style.cssText = "display:block;width:min(1050px,100%);margin:0 0 14px;padding:14px 16px;background:rgba(24,32,31,.96);border:1px solid rgba(216,255,62,.28);border-radius:3px;color:#f3f5ef;font:11px 'DM Mono',monospace;outline:none;";
    search.value = trackSearchQuery;
    search.addEventListener("input", () => { trackSearchQuery = search.value; renderTracks(); });
    list.parentElement.insertBefore(search, list);
  }
  const normalizedQuery = trackSearchQuery.trim().toLowerCase();

  const descriptions = {
    coast: "Ocean views · fast sweeping turns",
    desert: "Red canyon walls · technical bends",
    forest: "Dense woodland · tight corners",
    city: "Urban streets · narrow racing line",
    stony: "Jagged rocks · twisting highland roads",
    volcano: "Lava fields · volcanic peaks",
    snow: "Snowy peaks · icy-looking mountain scenery",
    megacircuit: "Huge alpine landscape · long sweeping route",
    mountainpass: "Full-lap route around a central alpine summit · two tunnels",
    highway: "Interstate lanes · shoulders · sweeping highway bends",
    stadium: "Wide stadium loop · grandstands and pit complex",
    figure8: "Forest Grand Loop · flowing non-crossing GP circuit",
    grandprix: "Technical GP layout · chicanes and hairpins",
    street: "Downtown street course · narrow city blocks"
  };

  const themeDescriptions = {
    waterpark:"Giant twisting slides · splash pools · bright park towers", underwater:"Deep ocean palette · coral arches · bubble trails",
    mines:"Ore rails · minecart props · timber tunnel supports", mineshaft:"Underground beams · rail lines · glowing ore crystals",
    wizardland:"Purple wizard towers · enchanted rings · magical forest", candy:"Giant candy shapes · pastel hills · sweet-colored landmarks",
    neoncity:"Glowing skyline · neon signboards · night-race lighting", spaceport:"Orbital rings · launch towers · spaceport structures",
    moon:"Lunar base · satellite dish · crater-colored terrain", jungle:"Layered jungle canopy · oversized tropical plants",
    haunted:"Crooked dead trees · eerie lanterns · haunted silhouettes", dino:"Low-poly dinosaurs · prehistoric plants · jungle ridges",
    icecave:"Ice arches · hanging icicles · frozen blue rock formations", arctic:"Snowfield structures · frosted pines · icy landmarks",
    savanna:"Golden grassland · acacia-like trees · sandstone formations", rainforest:"Dense emerald canopy · broad leaves · vine-like forms",
    desertnight:"Night desert palette · sandstone rocks · sparse cactus props", mars:"Red planet outpost · orbital hardware · rust-colored terrain",
    asteroid:"Space rings · floating-rock silhouettes · deep-space colors", cloudcity:"Cloud towers · airy sky palette · floating-city shapes",
    skyisland:"Floating-island silhouettes · high-altitude greenery · sky bridges", volcanicash:"Dark volcanic cones · ash terrain · glowing crater rims",
    lavaforge:"Lava forge landmarks · volcanic spires · hot orange accents", crystal:"Oversized crystal clusters · faceted glowing formations",
    fairytale:"Fairytale towers · pastel forest · enchanted landmarks", medieval:"Castle turrets · stone towers · medieval banners",
    castle:"Kingdom towers · castle roofs · stone fortifications", pirate:"Ship silhouettes · mast-like towers · coastal props",
    shipyard:"Industrial harbor props · cranes · stacked cargo shapes", boardwalk:"Seaside boardwalk props · coastal colors · ocean rings",
    tropical:"Tropical shoreline · palms and island-colored structures", coral:"Coral arches · reef colors · underwater silhouettes",
    submarine:"Submarine station shapes · porthole rings · ocean-blue structures", aquarium:"Aquarium arches · bubbles · aquatic silhouettes",
    river:"River-rapids props · water rings · rocky banks", waterfall:"Tall waterfall cliffs · falling-water ribbons · rock towers",
    swamp:"Murky wetlands · twisted trees · marshy silhouettes", mushroom:"Oversized mushroom caps · colorful fantasy garden",
    giantgarden:"Giant flowers · oversized garden props · bright greenery", robotfactory:"Factory blocks · mechanical towers · warning-color panels",
    industrial:"Industrial buildings · metal structures · utility props", powerplant:"Power plant towers · pipes · industrial equipment",
    junkyard:"Stacked scrap silhouettes · salvage blocks · weathered metal colors", construction:"Construction machinery shapes · caution colors · site structures",
    airport:"Runway-side terminal · hangar blocks · aviation-style props", hangar:"Large hangars · terminal structures · runway-side equipment",
    trainyard:"Rail-yard train shapes · industrial sheds · trackside hardware", cyberpunk:"Neon megacity blocks · glowing panels · futuristic rings",
    hologram:"Hologram rings · luminous panels · futuristic skyline", retroarcade:"Arcade colors · retro signs · geometric neon landmarks",
    pixel:"Blocky toy-like landmarks · retro colors · pixel-world silhouettes", toybox:"Oversized toy blocks · bright plastic colors · playful shapes",
    lego:"Stacked brick-like structures · studs · primary colors", dollhouse:"Pastel dollhouse buildings · miniature roof shapes · garden props",
    sportspark:"Stadium rings · sports grounds · spectator structures", skiresort:"Snowy resort towers · ice arches · alpine structures",
    bobsled:"Icy arches · frozen barriers · steep winter-race setting", sandcastle:"Sandcastle towers · seaside palette · beach shapes",
    canyonbridge:"Canyon bridge structures · sandstone cliffs · high spans", redwoods:"Tall redwood-like trees · deep forest layers",
    bamboo:"Bamboo grove silhouettes · dense green stalks · jungle canopy", orchard:"Orchard rows · rounded tree canopies · farm colors",
    flowerfield:"Giant flowers · colorful meadow · fantasy garden landmarks", lightning:"Storm-dark palette · electric-blue towers · dramatic silhouettes",
    thunder:"Storm ridge props · dark pines · rugged weathered forms", raincity:"Wet-night city palette · neon panels · dense urban shapes",
    floodedcity:"Flooded urban props · water rings · blue-green structures", frostforest:"Frosted trees · ice-blue accents · winter forest layers",
    glacier:"Glacier peaks · ice arches · frozen formations", quarry:"Stone quarry walls · ore rocks · mining equipment",
    gemmine:"Large gem clusters · faceted ore · mine-colored terrain", underground:"Tunnel supports · rail props · underground station shapes",
    cavern:"Cavern rocks · crystal details · underground silhouettes", wizardtower:"Tall wizard towers · magical rings · purple rooftops",
    dragon:"Dragon-shaped landmark · ember colors · volcanic valley props", enchanted:"Enchanted towers · forest magic · colorful fantasy silhouettes",
    fairground:"Ferris-wheel-like rings · carnival props · bright fairground colors", circus:"Circus rings · colorful tent-like shapes · night carnival palette",
    museum:"Monumental city buildings · exhibit-like blocks · urban boulevard", oldtown:"Old-town stone towers · historic roofs · cobblestone colors"
  };
  const allTracks = Object.entries(MAPS);
  const visibleTracks = allTracks.filter(([id, map]) => !normalizedQuery || `${id} ${map.name} ${map.themeCategory || map.scenery}`.toLowerCase().includes(normalizedQuery));
  search.placeholder = `SEARCH ${allTracks.length} TRACKS — e.g. WATER, MINE, WIZARD`;
  const countLabelId = "track-count-label";
  let countLabel = $(countLabelId);
  if (!countLabel) {
    countLabel = document.createElement("div"); countLabel.id = countLabelId;
    countLabel.style.cssText = "font:10px 'DM Mono',monospace;color:#a0aaa5;letter-spacing:1px;margin:0 0 12px;";
    list.parentElement.insertBefore(countLabel, list);
  }
  countLabel.textContent = `${visibleTracks.length} OF ${allTracks.length} TRACKS SHOWN`;
  visibleTracks.forEach(([id, map]) => {
    const button = document.createElement("button");
    button.className = "choice-card" + (selectedTrackId === id ? " selected" : "");
    button.innerHTML = `
      <span class="car-swatch" style="background:#${map.grass.toString(16).padStart(6, "0")}"></span>
      <span class="choice-info"><strong>${map.name}</strong><small>${descriptions[id] || themeDescriptions[id] || `${map.themeCategory ? map.themeCategory.toUpperCase() + " world" : "Race circuit"} · unique scenery and road theme`}</small></span>
      <span class="choice-value">${selectedTrackId === id ? "✓" : "SELECT"}</span>
    `;

    button.addEventListener("click", () => {
      selectedTrackId = id;
      renderTracks();
    });

    list.appendChild(button);
  });
  const previewMap = MAPS[selectedTrackId];
  $("track-preview-name").textContent = previewMap.name.toUpperCase();
  $("track-preview-detail").textContent = descriptions[selectedTrackId] || themeDescriptions[selectedTrackId] || `${previewMap.themeCategory || previewMap.scenery} route · ${previewMap.routeMode === "point-to-point" ? "point-to-point" : "circuit"}`;
  drawTrackPreview(selectedTrackId);
}

function rebuildSelectedCarModel() {
  const oldPosition = player.position.clone();
  const oldRotation = player.rotation.clone();
  scene.remove(player);
  player = createCar(selectedCar);
  scene.add(player);
  player.position.copy(oldPosition);
  player.rotation.copy(oldRotation);
}

function purchaseUpgrade(id) {
  const upgrade = upgradeDefinitions[id];
  const level = getUpgradeLevel(id);
  const cost = Math.round(upgrade.base * (1 + level * 0.8));
  if (level >= 5 || credits < cost) {
    showToast(level >= 5 ? "UPGRADE MAXED" : "NOT ENOUGH CREDITS");
    return;
  }
  credits -= cost;
  if (!upgrades[selectedCarId]) upgrades[selectedCarId] = {};
  upgrades[selectedCarId][id] = level + 1;
  updateCredits();
  rebuildSelectedCarModel();
  updateCarDetails();
  renderGarageUpgrades();
  renderUpgrades();
  renderGarage();
  showToast(upgrade.name + " UPGRADED · LEVEL " + (level + 1));
}

function renderGarageUpgrades() {
  const list = $("garage-upgrade-list");
  if (!list) return;
  list.innerHTML = "";
  Object.entries(upgradeDefinitions).forEach(([id, upgrade]) => {
    const level = getUpgradeLevel(id);
    const cost = Math.round(upgrade.base * (1 + level * 0.8));
    const row = document.createElement("div");
    row.className = "garage-upgrade-row";
    row.innerHTML = `<span>${upgrade.name}<small>LEVEL ${level} / 5 · ${upgrade.description}</small></span><button type="button" ${level >= 5 || credits < cost ? "disabled" : ""}>${level >= 5 ? "MAX" : `${cost.toLocaleString()} CR`}</button>`;
    row.querySelector("button").addEventListener("click", () => purchaseUpgrade(id));
    list.appendChild(row);
  });
}

function renderUpgrades() {
  const list = $("upgrade-list");
  list.innerHTML = "";

  Object.entries(upgradeDefinitions).forEach(([id, upgrade]) => {
    const level = getUpgradeLevel(id);
    const cost = Math.round(upgrade.base * (1 + level * 0.8));
    const row = document.createElement("div");
    row.className = "choice-card";
    row.style.display = "block";

    row.innerHTML = `
      <div class="upgrade-heading">
        <div><strong>${upgrade.name}</strong><br><small>${upgrade.description}</small></div>
        <button class="upgrade-buy" ${level >= 5 || credits < cost ? "disabled" : ""}>
          ${level >= 5 ? "MAX LEVEL" : `${cost.toLocaleString()} CR`}
        </button>
      </div>
      <div class="upgrade-track"><i style="width:${level / 5 * 100}%"></i></div>
      <small style="color:var(--muted);font-size:9px">LEVEL ${level} / 5</small>
    `;

    row.querySelector("button").addEventListener("click", () => purchaseUpgrade(id));

    list.appendChild(row);
  });
}

document.querySelectorAll("[data-screen]").forEach(button => {
  button.addEventListener("click", () => {
    const name = button.dataset.screen;

    if (name === "home") {
      raceSetupPending = false;
      $("select-track-btn").textContent = "LOAD SELECTED CIRCUIT ↗";
      window.apexSessionMode = "race";
      if (window.apexStory?.activeRun) {
        window.apexStory.activeRun = false;
        try { localStorage.setItem("apexStory", JSON.stringify(window.apexStory)); } catch (_) {}
      }
      paused = false;
      raceStarted = false;
      countdownActive = false;
      finished = false;
      $("center-message").textContent = "";
      showScreen("home");
      return;
    }

    if (name === "garage") renderGarage();
    if (name === "tracks") renderTracks();
    if (name === "upgrades") renderUpgrades();

    showScreen(name);
    syncMobileMode();
  });
});

$("career-menu-btn").addEventListener("click", apexShowCareer);
$("story-menu-btn").addEventListener("click", apexShowStory);
$("story-menu-btn").addEventListener("click", apexShowStory);

$("select-car-btn").addEventListener("click", () => {
  scene.remove(player);
  player = createCar(selectedCar);
  scene.add(player);
  placeCarsOnTrack();
  resetRaceState();
  showScreen("home");
  showToast(selectedCar.name.toUpperCase() + " SELECTED");
});

$("select-track-btn").addEventListener("click", () => {
  mapId = selectedTrackId;
  buildMap();
  createOpponents();
  if (typeof apexSetWeather === "function") apexSetWeather(window.apexWeatherMode || "clear");
  resetRaceState();
  saveGarage();
  if (raceSetupPending) {
    raceSetupPending = false;
    startRace(false);
    return;
  }
  showScreen("home");
  showToast(mapConfig.name.toUpperCase() + " LOADED");
});

// ============================================================
// RACE STATE
// ============================================================

function resetRaceState() {
  speed = 0;
  yaw = poseAt(currentGridProgress, currentGridLane).yaw;
  steering = 0;
  lateralVelocity = 0;
  verticalVelocity = 0;
  handbrakeSlip = 0;
  raceStarted = false;
  countdownActive = false;
  paused = false;
  finished = false;
  raceTime = 0;
  lap = 1;
  countdown = 3;
  countdownClock = 0;
  checkpointStage = 0;
  previousProgress = currentGridProgress;

  placeCarsOnTrack();
  if (player2) {
    const p2Start = poseAt(currentGridProgress, -currentGridLane);
    player2.position.copy(p2Start.position);
    player2.position.y = p2Start.position.y + 0.03;
    player2Yaw = p2Start.yaw;
    player2Speed = 0;
    player2LateralVelocity = 0;
  }

  $("lap").textContent = "1";
  $("lap").nextElementSibling.textContent = ` / ${raceLaps}`;
  $("speed").textContent = "000";
  $("race-time").textContent = "00:00.000";
  $("lap-progress").style.width = "0%";
  $("position").textContent = "11";
  $("center-message").textContent = "";
  $("center-message").style.display = "none";
}

function startRace(tutorial = false) {
  showCrashChoice(false);
  crashSequence = null;
  if (window.apexSessionMode === "story" && !window.apexStory?.activeRun) {
    window.apexSessionMode = "race";
  }
  if (MAPS[selectedTrackId] && (mapId !== selectedTrackId || mapConfig !== MAPS[selectedTrackId])) {
    mapId = selectedTrackId;
    buildMap();
    createOpponents();
  }
  if (typeof apexRaceRecord !== "undefined") apexRaceRecord = [];
  if (typeof apexPitUsed !== "undefined") apexPitUsed = false;
  if (typeof apexDamage !== "undefined") apexDamage = 0;
  if (typeof apexTireWear !== "undefined") apexTireWear = 0;
  tutorialMode = tutorial;
  careerFinishMessage = "";
  storyFinishMessage = "";
  const lapSelect = $("apex-laps");
  if (mapConfig.routeMode === "point-to-point") {
    raceLaps = 1;
    if (lapSelect) {
      lapSelect.value = "1";
      lapSelect.disabled = true;
    }
  } else if (lapSelect) {
    raceLaps = Number(lapSelect.value) || 3;
    lapSelect.disabled = false;
  }
  resetRaceState();
  finished = false;
  countdownActive = true;
  countdown = 3;
  countdownClock = 0;

  $("footer-track").textContent = mapConfig.name.toUpperCase();
  showScreen("race");
  syncMobileMode();
  $("center-message").style.display = "block";
  $("center-message").textContent = "3";
  showToast(tutorial ? "TUTORIAL STARTING" : "GET READY");
}

function pauseRace() {
  if (!raceStarted && !countdownActive) return;
  paused = true;
  showScreen("pause");
  syncMobileMode();
}

function resumeRace() {
  paused = false;
  showScreen("race");
  syncMobileMode();
}

function finishRace() {
  if (finished) return;

  finished = true;
  raceStarted = false;
  countdownActive = false;
  paused = false;

  $("center-message").style.display = "none";

  const position = Number($("position").textContent || 11);
  if (window.apexSessionMode === "story" && window.apexStory?.activeRun) {
    const chapterIndex = window.apexStory.activeChapter;
    const chapter = APEX_STORY_CAMPAIGN[chapterIndex];
    if (chapter) {
      const chapterWon = position <= chapter.goalPosition;
      window.apexStory.results = Array.isArray(window.apexStory.results) ? window.apexStory.results : [];
      window.apexStory.results.push({ chapter: chapterIndex + 1, title: chapter.title, position, won: chapterWon });
      window.apexStory.activeRun = false;
      if (chapterWon) {
        window.apexStory.chapter = Math.max(window.apexStory.chapter || 0, chapterIndex + 1);
        credits += chapter.reward;
        window.apexCareer.xp = (window.apexCareer.xp || 0) + 150;
        window.apexCareer.level = 1 + Math.floor(window.apexCareer.xp / 500);
        updateCredits();
        storyFinishMessage = `${chapter.title} complete: P${position}, target P${chapter.goalPosition} beaten. +${chapter.reward} CR and 150 XP. ${chapter.outro}`;
        showToast(`STORY CHAPTER ${chapterIndex + 1} COMPLETE · +${chapter.reward.toLocaleString()} CR`);
      } else {
        storyFinishMessage = `${chapter.title}: P${position}. ${chapter.rival} held you to P${chapter.goalPosition}; the chapter is ready to retry.`;
        showToast("STORY CHAPTER NOT CLEARED · RETRY WHEN READY");
      }
      try {
        localStorage.setItem("apexStory", JSON.stringify(window.apexStory));
        localStorage.setItem("apexCareer", JSON.stringify(window.apexCareer));
      } catch (_) {}
    }
  }
  if (!tutorialMode && window.apexSessionMode === "race" && window.apexCareer) {
    const earnedPoints = [25,18,15,12,10,8,6,4,2,1,0][Math.min(10, Math.max(0, position - 1))];
    window.apexCareer.races += 1;
    if (position === 1) window.apexCareer.wins += 1;
    window.apexCareer.points += earnedPoints;
    window.apexCareer.lastPosition = position;
    window.apexCareer.contractProgress = window.apexCareer.contractProgress && typeof window.apexCareer.contractProgress === "object"
      ? window.apexCareer.contractProgress
      : {};
    window.apexCareer.completedContracts = Array.isArray(window.apexCareer.completedContracts)
      ? window.apexCareer.completedContracts
      : [];
    window.apexCareer.contractProgress.podiums = (Number(window.apexCareer.contractProgress.podiums) || 0) + (position <= 3 ? 1 : 0);
    window.apexCareer.contractProgress.points = (Number(window.apexCareer.contractProgress.points) || 0) + earnedPoints;
    window.apexCareer.contractProgress.wins = (Number(window.apexCareer.contractProgress.wins) || 0) + (position === 1 ? 1 : 0);
    const completedContracts = APEX_CAREER_CONTRACTS.filter(contract =>
      (Number(window.apexCareer.contractProgress[contract.progress]) || 0) >= contract.target &&
      !window.apexCareer.completedContracts.includes(contract.id)
    );
    let contractReward = 0;
    for (const contract of completedContracts) {
      window.apexCareer.completedContracts.push(contract.id);
      contractReward += contract.reward;
    }
    if (contractReward) {
      credits += contractReward;
      updateCredits();
      showToast(`SPONSOR CONTRACT COMPLETE · +${contractReward.toLocaleString()} CR`);
    }
    if (window.apexCareer.active) {
      window.apexCareer.seasonPoints += earnedPoints;
      window.apexCareer.xp = (window.apexCareer.xp || 0) + 80 + Math.max(0, 11-position) * 18;
      window.apexCareer.level = 1 + Math.floor(window.apexCareer.xp / 500);
      if (position === 1) window.apexCareer.seasonWins += 1;
      const event = APEX_CAREER_SCHEDULE[Math.min(window.apexCareer.round, APEX_CAREER_SCHEDULE.length - 1)];
      window.apexCareer.results = Array.isArray(window.apexCareer.results) ? window.apexCareer.results : [];
      const objectiveComplete = position <= event.goalPosition;
      const objectiveBonus = objectiveComplete ? event.bonus : 0;
      window.apexCareer.results.push({ round: window.apexCareer.round + 1, event: event.name, track: mapConfig.name, position, points: earnedPoints, objectiveComplete, objectiveBonus });
      const completedRound = window.apexCareer.round + 1;
      window.apexCareer.round = Math.min(APEX_CAREER_SCHEDULE.length, window.apexCareer.round + 1);
      if (window.apexCareer.round >= APEX_CAREER_SCHEDULE.length) window.apexCareer.active = false;
      const sponsorBonus = completedRound % 2 === 0 ? 450 : 0;
      const seasonComplete = completedRound === APEX_CAREER_SCHEDULE.length;
      const seasonPrize = seasonComplete
        ? window.apexCareer.seasonPoints >= 120 ? 5000 : window.apexCareer.seasonPoints >= 75 ? 2500 : 1000
        : 0;
      const seasonTitle = window.apexCareer.seasonPoints >= 120 ? "APEX CHAMPION" : window.apexCareer.seasonPoints >= 75 ? "PODIUM CONTENDER" : "SEASON FINISHER";
      if (seasonComplete && window.apexCareer.seasonPoints >= 120) {
        window.apexCareer.championships = (window.apexCareer.championships || 0) + 1;
      }
      if (sponsorBonus || objectiveBonus || seasonPrize) {
        credits += sponsorBonus + objectiveBonus + seasonPrize;
        updateCredits();
      }
      careerFinishMessage = `Career round ${completedRound}/${APEX_CAREER_SCHEDULE.length} complete: P${position}, +${earnedPoints} championship points, +${80 + Math.max(0, 11-position) * 18} XP${objectiveComplete ? `, objective secured (+${objectiveBonus} CR)` : `, objective missed (P${event.goalPosition} target)`}${sponsorBonus ? `, +${sponsorBonus} sponsor credits` : ""}${seasonPrize ? `, +${seasonPrize} CR · ${seasonTitle}` : ""}. ${window.apexCareer.active ? "The next event is tougher — improve your setup in the garage." : "Season complete! Open Career to review your championship."}`;
    }
    try { localStorage.setItem("apexCareer", JSON.stringify(window.apexCareer)); } catch (_) {}
  }
  raceReward = tutorialMode || window.apexSessionMode === "practice" || window.apexSessionMode === "qualifying" ? 0 : Math.max(100, 700 - (position - 1) * 150);

  if (position === 1 && window.apexSessionMode === "race") raceReward += 300;

  credits += raceReward;
  updateCredits();

  if (!bestTime || raceTime < bestTime) {
    bestTime = raceTime;
    saveGarage();
  }
  const recordKey = `${mapId}:${selectedCarId}`;
  if (!apexTrackRecord[recordKey] || raceTime < apexTrackRecord[recordKey]) { apexTrackRecord[recordKey] = raceTime; try { localStorage.setItem("apexTrackRecords", JSON.stringify(apexTrackRecord)); } catch (_) {} }

  $("finish-title").innerHTML = position === 1
    ? 'PODIUM <em>FINISH.</em>'
    : 'RACE <em>COMPLETE.</em>';

  $("finish-copy").textContent = tutorialMode
    ? "Training complete. You are ready for the grid."
    : storyFinishMessage
      ? storyFinishMessage
    : careerFinishMessage
      ? careerFinishMessage
      : window.apexSessionMode === "practice"
      ? "Practice complete. Use telemetry to refine your racing line."
      : window.apexSessionMode === "qualifying"
        ? "Qualifying complete. Your lap has been recorded for this session."
    : position === 1
      ? "Outstanding driving. You took the win."
      : "Good racing. Tune your car and chase the podium.";

  $("final-time").textContent = formatTime(raceTime);
  $("race-reward").textContent = "+" + raceReward.toLocaleString() + " CR";

  showScreen("finish");
  syncMobileMode();
  updateHome();
}

let raceSetupPending = false;
$("start-btn").addEventListener("click", () => {
  raceSetupPending = true;
  $("select-track-btn").textContent = "START RACE ↗";
  renderTracks();
  showScreen("tracks");
});
$("tutorial-btn").addEventListener("click", () => startRace(true));
$("resume-btn").addEventListener("click", resumeRace);
$("restart-btn").addEventListener("click", () => startRace(tutorialMode));
$("again-btn").addEventListener("click", () => startRace(false));

// ============================================================
// KEYBOARD INPUT
// ============================================================

const keys = {};

window.addEventListener("keydown", event => {
  keys[event.code] = true;

  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }

  if (event.repeat) return;

  if (event.code === "Escape") {
    if (currentScreen === "pause") resumeRace();
    else if (currentScreen === "race") pauseRace();
  }

  if (event.code === "KeyC" && currentScreen === "race") cycleCamera();
  if (event.code === "KeyR" && currentScreen === "race") recoverCar();
});

window.addEventListener("keyup", event => {
  keys[event.code] = false;
});

window.addEventListener("blur", () => {
  Object.keys(keys).forEach(key => keys[key] = false);
  if (currentScreen === "race" && (raceStarted || countdownActive)) pauseRace();
});

const gasPressed = () => keys.KeyW;
const brakePressed = () => keys.KeyS;
const leftPressed = () => keys.KeyA;
const rightPressed = () => keys.KeyD;

// ============================================================
// CAR PHYSICS AND COLLISIONS
// ============================================================

function getSlipstreamStrength() {
  if (speed < 8 || !opponents.length) return 0;
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  let strength = 0;

  for (const racer of opponents) {
    if (racer.currentSpeed <= speed * 0.78) continue;
    const relative = racer.car.position.clone().sub(player.position);
    const distanceAhead = relative.dot(forward);
    if (distanceAhead < 3 || distanceAhead > 52) continue;
    const lateralGap = Math.abs(relative.dot(right));
    if (lateralGap > 8.5) continue;
    const distanceFactor = 1 - (distanceAhead - 3) / 49;
    const alignmentFactor = 1 - Math.pow(lateralGap / 8.5, 1.35);
    strength = Math.max(strength, distanceFactor * alignmentFactor * 0.96);
  }

  return clamp(strength, 0, 1);
}

function updatePlayer(dt) {
  if (!raceStarted || paused || finished) return;

  const stats = getStats();
  const weatherGrip = (window.apexWeatherMode === "rain" ? 0.72 : window.apexWeatherMode === "fog" ? 0.88 : 1) * (window.apexTireCompound === "soft" ? 1.12 : window.apexTireCompound === "hard" ? 0.92 : window.apexTireCompound === "wet" ? (window.apexWeatherMode === "rain" ? 1.08 : 0.86) : 1) * (1 - Math.min(0.3, apexTireWear * 0.003));
  const gas = gasPressed();
  const braking = brakePressed();
  const handbrake = keys.Space;
  const slipstream = getSlipstreamStrength();
  player.userData.slipstream = slipstream;
  const weatherCap = window.apexWeatherMode === "rain" ? 0.91 : 1;

  // Engine, drag, and brakes.
  if (gas) speed += stats.acceleration * (1 + slipstream * 0.42) * dt;
  else speed -= (2.6 + Math.abs(speed) * 0.075) * dt;

  if (braking) {
    speed -= stats.braking * dt;
  }

  speed = clamp(speed, -5, stats.topSpeed * 0.72 * weatherCap * (1 + slipstream * 0.25));

  // Steering authority changes with speed.
  const steerInput = (leftPressed() ? 1 : 0) - (rightPressed() ? 1 : 0);
  steering = THREE.MathUtils.damp(steering, steerInput, 6, dt);

  // Handbrake pulls rear grip away progressively; speed and steering load
  // determine how much the car rotates, then grip returns after release.
  const slipTarget = handbrake && Math.abs(speed) > 7
    ? clamp((Math.abs(speed) - 5) / 28, 0, 1) * (0.28 + Math.abs(steering) * 0.72)
    : 0;
  handbrakeSlip = THREE.MathUtils.damp(handbrakeSlip, slipTarget, handbrake ? 4.2 : 2.1, dt);
  if (handbrake && Math.abs(speed) > 10) speed -= (1.0 + Math.abs(speed) * 0.055) * dt;

  const speedFactor = clamp(Math.abs(speed) / 12, 0.12, 1);
  const driftFactor = 1 + handbrakeSlip * 1.45;

  yaw += steering * speedFactor * stats.handling *
    driftFactor * dt * (speed < -0.5 ? -1 : 1);

  // Lateral velocity simulates tire slip.
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);

  lateralVelocity += steering * Math.abs(speed) * (0.19 + handbrakeSlip * 0.92) * dt;
  lateralVelocity *= Math.exp(-(1.2 + (1 - handbrakeSlip) * 4.6 * stats.grip * weatherGrip) * dt);
  lateralVelocity = clamp(lateralVelocity, -14, 14);

  const oldPosition = player.position.clone();

  player.position.addScaledVector(forward, speed * dt);
  player.position.addScaledVector(right, lateralVelocity * dt);
  player.rotation.y = yaw;

  // Slight body roll under steering.
  player.rotation.z = -steering * Math.min(Math.abs(speed) / 50, 0.18);
  player.rotation.x = lerp(player.rotation.x, braking ? -0.025 : 0, dt * 3);

  player.userData.wheels.forEach(wheel => {
    wheel.rotation.x -= speed * dt * 0.8;
  });

  resolveTrackCollisions(oldPosition);
  resolveBarrierCollisions();
  resolveCarCollisions();

  const track = nearestTrackPoint(player.position);
  // Keep the chassis riding the mountain/highway road profile while retaining
  // the existing x/z handling and off-road detection.
  player.position.y = (mapId === "mountainpass" && track.distance > mapConfig.width / 2
    ? Math.max(track.pose.position.y, mountainPassGroundHeight(player.position.x, player.position.z))
    : track.pose.position.y) + 0.03;
  player.rotation.x = -Math.atan2(track.pose.tangent.y, Math.hypot(track.pose.tangent.x, track.pose.tangent.z));

  // Off-road terrain has much lower traction and speed.
  const offRoad = track.distance > mapConfig.width * 0.47;

  if (offRoad) {
    speed *= Math.exp(-1.6 * dt);
    lateralVelocity *= Math.exp(-2.5 * dt);
  }

  // Reset if the car gets far away from the circuit.
  if (track.distance > 70 || player.position.y < -5) {
    recoverCar();
  }

  updateLapCheckpoints(track.progress, dt);
  updateHUD(dt);
}

function resolveTrackCollisions(oldPosition) {
  // The painted road edge is visual only. Cars can leave the asphalt shoulder;
  // the physical metal-fence colliders in resolveBarrierCollisions() stop them.
  // Keep this function in the update pipeline for compatibility with recovery logic.
}

function createCrashExplosion(position) {
  const origin = position.clone();
  origin.y += 0.85;
  const particleGeometry = new THREE.SphereGeometry(0.15, 8, 8);
  const particleMaterials = [
    new THREE.MeshBasicMaterial({ color: 0xff3b18 }),
    new THREE.MeshBasicMaterial({ color: 0xffa21a }),
    new THREE.MeshBasicMaterial({ color: 0xffed9a })
  ];
  const particles = [];
  for (let i = 0; i < 24; i++) {
    const material = particleMaterials[i % particleMaterials.length];
    const particle = new THREE.Mesh(particleGeometry, material);
    particle.position.copy(origin);
    const direction = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 1.4 + 0.15, Math.random() * 2 - 1).normalize();
    const velocity = direction.multiplyScalar(5 + Math.random() * 10);
    particle.scale.setScalar(0.65 + Math.random() * 1.2);
    scene.add(particle);
    particles.push({ mesh: particle, velocity, life: 0.7 + Math.random() * 0.45, maxLife: 1.15 });
  }
  const flashMaterial = new THREE.MeshBasicMaterial({ color: 0xff6a18, transparent: true, opacity: 0.78, depthWrite: false });
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 12), flashMaterial);
  flash.position.copy(origin);
  scene.add(flash);
  crashEffects.push({ particles, flash, flashMaterial, life: 0.55, maxLife: 0.55, materials: particleMaterials, geometry: particleGeometry });
}

function updateCrashEffects(dt) {
  for (let i = crashEffects.length - 1; i >= 0; i--) {
    const effect = crashEffects[i];
    effect.life -= dt;
    const elapsed = 1 - Math.max(0, effect.life) / effect.maxLife;
    effect.flash.scale.setScalar(1 + elapsed * 7.5);
    effect.flashMaterial.opacity = Math.max(0, 0.78 * (1 - elapsed));
    for (const particle of effect.particles) {
      particle.life -= dt;
      particle.velocity.y -= 12 * dt;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.mesh.scale.multiplyScalar(Math.max(0.1, 1 - dt * 1.8));
    }
    if (effect.life <= 0) {
      scene.remove(effect.flash);
      effect.flash.geometry.dispose();
      effect.flashMaterial.dispose();
      for (const particle of effect.particles) scene.remove(particle.mesh);
      effect.geometry.dispose();
      effect.materials.forEach(material => material.dispose());
      crashEffects.splice(i, 1);
    }
  }
}

function triggerCrashRespawn(playerNumber = 1) {
  if (!crashRespawnEnabled || currentScreen !== "race" || !raceStarted || countdownActive || paused || finished || crashSequence) return false;
  const now = performance.now();
  if (now - lastCrashTrigger < 1200) return false;
  lastCrashTrigger = now;

  const isP2 = playerNumber === 2 && !!player2;
  const car = isP2 ? player2 : player;
  const crashYaw = isP2 ? player2Yaw : yaw;
  const crashPosition = car.position.clone();
  // Capture the player's progress along the circuit before the cutscene. The
  // physical crash point may be outside the asphalt, so Continue will restore
  // the car to the same track progress and a safe on-road lane position.
  const crashTrackPoint = nearestTrackPoint(crashPosition);
  createCrashExplosion(crashPosition);

  crashSequence = {
    playerNumber: isP2 ? 2 : 1,
    position: crashPosition,
    yaw: crashYaw,
    trackProgress: crashTrackPoint.progress,
    trackLateral: crashTrackPoint.lateral,
    timer: 0,
    choiceShown: false
  };
  paused = true;
  showCrashChoice(false);
  showToast(`PLAYER ${isP2 ? 2 : 1} CRASHED`);
  return true;
}

function showCrashChoice(visible) {
  let panel = document.getElementById("apex-crash-choice");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "apex-crash-choice";
    panel.innerHTML = `
      <div class="apex-crash-card">
        <div class="apex-crash-kicker">CRASH SEQUENCE COMPLETE</div>
        <h2>YOUR CAR CRASHED</h2>
        <p>Restart the full race or continue from the crash point.</p>
        <div class="apex-crash-actions">
          <button id="apex-crash-restart">START FROM BEGINNING</button>
          <button id="apex-crash-continue">CONTINUE FROM CRASH</button>
        </div>
        <small>Continuing resets your speed so you can safely get moving again.</small>
      </div>`;
    Object.assign(panel.style, {
      position: "fixed", inset: "0", zIndex: "100000", display: "none",
      alignItems: "center", justifyContent: "center", padding: "20px",
      background: "radial-gradient(circle at center, rgba(255,80,20,.20), rgba(3,5,12,.92) 68%)",
      backdropFilter: "blur(7px)", fontFamily: "Arial, sans-serif", color: "#fff"
    });
    const card = panel.querySelector(".apex-crash-card");
    Object.assign(card.style, {
      width: "min(560px, 94vw)", boxSizing: "border-box", padding: "30px",
      border: "1px solid rgba(255,125,55,.8)", borderRadius: "18px",
      background: "linear-gradient(145deg, rgba(28,31,42,.98), rgba(8,10,17,.98))",
      boxShadow: "0 20px 80px rgba(0,0,0,.6), 0 0 35px rgba(255,75,20,.16)", textAlign: "center"
    });
    Object.assign(panel.querySelector(".apex-crash-kicker").style, { color: "#ff9a54", fontSize: "12px", fontWeight: "900", letterSpacing: "3px" });
    Object.assign(panel.querySelector("h2").style, { margin: "10px 0", fontSize: "clamp(26px,5vw,40px)", fontWeight: "950", letterSpacing: "1px" });
    Object.assign(panel.querySelector("p").style, { color: "#c8ceda", margin: "0 0 22px" });
    Object.assign(panel.querySelector(".apex-crash-actions").style, { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "12px" });
    for (const button of panel.querySelectorAll("button")) Object.assign(button.style, {
      border: "0", borderRadius: "10px", padding: "15px 12px", cursor: "pointer",
      color: "#fff", fontWeight: "900", letterSpacing: ".5px", background: "#b83a22",
      boxShadow: "0 5px 0 rgba(0,0,0,.25)"
    });
    panel.querySelector("#apex-crash-continue").style.background = "#197c60";
    Object.assign(panel.querySelector("small").style, { display: "block", marginTop: "18px", color: "#929bad", lineHeight: "1.5" });
    panel.querySelector("#apex-crash-restart").addEventListener("click", restartAfterCrash);
    panel.querySelector("#apex-crash-continue").addEventListener("click", continueAfterCrash);
    document.body.appendChild(panel);
  }
  panel.style.display = visible ? "flex" : "none";
}

function resetCrashedCarAt(position, carYaw, playerNumber) {
  if (playerNumber === 2 && player2) {
    player2.position.copy(position);
    player2.position.y = position.y + 0.03;
    player2Yaw = carYaw;
    player2.rotation.set(0, player2Yaw, 0);
    player2Speed = 0;
    player2Steering = 0;
    player2LateralVelocity = 0;
  } else {
    player.position.copy(position);
    player.position.y = position.y + 0.03;
    yaw = carYaw;
    player.rotation.set(0, yaw, 0);
    speed = 0;
    steering = 0;
    lateralVelocity = 0;
    verticalVelocity = 0;
    handbrakeSlip = 0;
    previousProgress = currentGridProgress;
  }
}

function restartAfterCrash() {
  if (!crashSequence) return;
  const n = crashSequence.playerNumber;
  startRace(tutorialMode);
  showToast(`PLAYER ${n} RESTARTED THE RACE`);
}

function continueAfterCrash() {
  if (!crashSequence) return;

  // Put the car back ON the circuit at the same progress point where it
  // crashed, rather than restoring the potentially off-road/barrier position.
  const halfRoad = Math.max(2, (mapConfig.width || 14) * 0.34);
  const safeLane = Math.max(-halfRoad, Math.min(halfRoad, crashSequence.trackLateral || 0));
  const onTrackPose = poseAt(crashSequence.trackProgress, safeLane);
  resetCrashedCarAt(onTrackPose.position, onTrackPose.yaw, crashSequence.playerNumber);
  finishCrashChoice(`PLAYER ${crashSequence.playerNumber} RESUMED AT THE SAME TRACK POINT`);
}

function finishCrashChoice(message) {
  showCrashChoice(false);
  crashSequence = null;
  paused = false;
  if (currentScreen !== "race") showScreen("race");
  showToast(message);
}

function updateCrashSequence(dt) {
  if (!crashSequence || currentScreen !== "race") return;
  crashSequence.timer += dt;
  const target = crashSequence.position.clone();
  target.y += 0.8;
  // A brief cinematic camera push-in keeps the explosion visible before the choice screen.
  const angle = crashSequence.yaw + 0.8;
  const distance = Math.max(5.5, 9 - crashSequence.timer * 1.8);
  const cameraTarget = new THREE.Vector3(
    crashSequence.position.x + Math.sin(angle) * distance,
    crashSequence.position.y + 3.2 + crashSequence.timer * 0.2,
    crashSequence.position.z + Math.cos(angle) * distance
  );
  camera.position.lerp(cameraTarget, Math.min(1, dt * 3.5));
  camera.lookAt(target);
  if (crashSequence.timer >= 1.65 && !crashSequence.choiceShown) {
    crashSequence.choiceShown = true;
    showCrashChoice(true);
  }
}

function resolveBarrierCollisions() {
  // Treat each fence section as a capsule along its actual endpoints. This
  // avoids overlapping corner boxes forming a triangular obstruction.
  const halfLength = selectedCar.length * 0.48;
  const halfWidth = selectedCar.width * 0.48;
  const carForward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const carRight = new THREE.Vector3(carForward.z, 0, -carForward.x);

  for (const barrier of barriers) {
    const segmentX = barrier.end.x - barrier.start.x;
    const segmentZ = barrier.end.z - barrier.start.z;
    const segmentLengthSq = segmentX * segmentX + segmentZ * segmentZ;
    const fromStartX = player.position.x - barrier.start.x;
    const fromStartZ = player.position.z - barrier.start.z;
    const along = clamp((fromStartX * segmentX + fromStartZ * segmentZ) / Math.max(0.001, segmentLengthSq), 0, 1);
    const closestX = barrier.start.x + segmentX * along;
    const closestZ = barrier.start.z + segmentZ * along;
    const dx = player.position.x - closestX;
    const dz = player.position.z - closestZ;
    const distanceSq = dx * dx + dz * dz;
    const contactRadius = Math.hypot(halfLength, halfWidth) + barrier.halfWidth;
    if (distanceSq > contactRadius * contactRadius) continue;

    const distance = Math.sqrt(distanceSq);
    const pushDirection = distance > 0.001
      ? new THREE.Vector3(dx / distance, 0, dz / distance)
      : barrier.normal.clone().multiplyScalar(-barrier.side);
    const tangent = barrier.tangent;
    const normal = barrier.normal;
    const localForward = dx * tangent.x + dz * tangent.z;
    const localSide = dx * normal.x + dz * normal.z;
    const forwardSupport = Math.abs(carForward.dot(tangent)) * halfLength + Math.abs(carRight.dot(tangent)) * halfWidth;
    const sideSupport = Math.abs(carForward.dot(normal)) * halfLength + Math.abs(carRight.dot(normal)) * halfWidth;
    if (Math.abs(localForward) > forwardSupport + 0.12 || Math.abs(localSide) > sideSupport + barrier.halfWidth) continue;

    const impact = Math.abs(speed);
    if (impact > 22 && triggerCrashRespawn(1)) return;

    const overlap = sideSupport + barrier.halfWidth - Math.abs(localSide);
    player.position.addScaledVector(pushDirection, Math.max(0.08, overlap + 0.08));
    const impactLoss = clamp(0.35 + impact / 95, 0.35, 0.88);
    speed *= 1 - impactLoss;
    lateralVelocity *= -0.38;
    yaw += Math.sign(localSide || -barrier.side) * clamp(impact / 120, 0.04, 0.32);
    collisionFlash = 0.45;

    if (impact > 16) showToast("BARRIER IMPACT");
    break;
  }
}

function resolveCarCollisions() {
  for (const racer of opponents) {
    const other = racer.car;
    const dx = player.position.x - other.position.x;
    const dz = player.position.z - other.position.z;
    const distance = Math.hypot(dx, dz);
    const minDistance = (selectedCar.width + racer.car.userData.type.width) * 0.48;

    if (distance < minDistance && distance > 0.001) {
      if (Math.abs(speed) > 24 && triggerCrashRespawn(1)) return;
      const nx = dx / distance;
      const nz = dz / distance;
      const overlap = minDistance - distance;

      player.position.x += nx * overlap * 0.55;
      player.position.z += nz * overlap * 0.55;
      other.position.x -= nx * overlap * 0.45;
      other.position.z -= nz * overlap * 0.45;

      // Keep the AI's avoidance after updateAI repositions it from track progress.
      // The existing player steering and handling equations are intentionally untouched.
      const aiPose = poseAt(racer.progress, racer.lane);
      const playerSide = dx * aiPose.normal.x + dz * aiPose.normal.z;
      const lanePush = Math.min(1.25, overlap * 0.7);
      racer.lane = clamp(
        racer.lane - (Math.sign(playerSide) || 1) * lanePush,
        -mapConfig.width * 0.34,
        mapConfig.width * 0.34
      );

      speed *= 0.76;
      racer.speed *= 0.92;
      lateralVelocity += nx * 2.2;
      collisionFlash = 0.35;
    }
  }
}

function recoverCar() {
  const track = nearestTrackPoint(player.position);
  const pose = poseAt(track.progress, -1.5);

  player.position.copy(pose.position);
  player.position.y = pose.position.y + 0.03;
  yaw = pose.yaw;
  player.rotation.set(0, yaw, 0);
  speed = 0;
  lateralVelocity = 0;
  verticalVelocity = 0;

  showToast("VEHICLE RECOVERED");
}

// ============================================================
// LAP VALIDATION
// ============================================================

function updateLapCheckpoints(progress, dt) {
  if (mapConfig.routeMode === "point-to-point") {
    if (previousProgress < 0.995 && progress >= 0.995 && speed > 5) {
      checkpointStage = 3;
      finishRace();
    }
    previousProgress = progress;
    return;
  }

  const delta = (progress - previousProgress + 1) % 1;

  // Must move forward through the gates in order.
  if (delta > 0 && delta < 0.045 && speed > 5) {
    const gates = [0.25, 0.5, 0.75];
    const nextGate = gates[checkpointStage];

    if (
      checkpointStage < 3 &&
      previousProgress < nextGate &&
      progress >= nextGate
    ) {
      checkpointStage++;
      showToast(`CHECKPOINT ${checkpointStage}/3`);
    }

    if (
      checkpointStage === 3 &&
      previousProgress > 0.94 &&
      progress < 0.06
    ) {
      checkpointStage = 0;
      lap++;

      if (tutorialMode) {
        finishRace();
      } else if (lap > raceLaps) {
        finishRace();
      } else {
        showToast(`LAP ${lap}/${raceLaps}`);
      }
    }
  }

  previousProgress = progress;
}

// ============================================================
// AI DRIVERS
// ============================================================

function updateAI(dt) {
  const circuitLength = Math.max(1, trackCurve.getLength());
  const playerTrack = nearestTrackPoint(player.position);
  const playerTopSpeed = getStats().topSpeed * 0.72 * (window.apexWeatherMode === "rain" ? 0.91 : 1);

  opponents.forEach((racer, index) => {
    if (raceStarted && !paused && !finished) {
      const lookAheadDistance = clamp(racer.currentSpeed * 0.42, 6, 18);
      const lookAheadProgress = mapConfig.routeMode === "point-to-point"
        ? clamp(racer.progress + lookAheadDistance / circuitLength, 0, 1)
        : (racer.progress + lookAheadDistance / circuitLength) % 1;
      const lookAhead = poseAt(lookAheadProgress, racer.targetLane);
      const aimX = lookAhead.position.x - racer.car.position.x;
      const aimZ = lookAhead.position.z - racer.car.position.z;
      const desiredHeading = Math.atan2(aimX, aimZ);
      const headingError = Math.atan2(
        Math.sin(desiredHeading - racer.heading),
        Math.cos(desiredHeading - racer.heading)
      );
      const turnSeverity = Math.abs(headingError);
      const cornerPenalty = 0.32 * racer.corneringFactor;
      const turnSpeedFactor = clamp(1 - Math.max(0, turnSeverity - 0.12) * cornerPenalty, 0.72, 1);
      const curveSpeed = Math.sqrt(34 * racer.corneringFactor / Math.max(0.0001, trackCurvatureAt(racer.progress)));
      const curveSpeedFactor = clamp(curveSpeed / Math.max(1, racer.speed), 0.58, 1);
      const cornerSpeedFactor = Math.min(turnSpeedFactor, curveSpeedFactor);
      // Keep each AI's difficulty multiplier synced with the player's current car/upgrades.
      const speedMultiplier = Number.isFinite(racer.speedMultiplier) ? Math.min(1.15, racer.speedMultiplier) : 0.82;
      racer.speed = Math.min(playerTopSpeed * 1.15, playerTopSpeed * speedMultiplier);
      const targetSpeed = Math.min(playerTopSpeed * 1.15, racer.speed * cornerSpeedFactor);
      if (!Number.isFinite(racer.currentSpeed) || racer.currentSpeed < 0) racer.currentSpeed = 0;
      // Launch with the same engine acceleration as the player's current car.
      // This prevents the AI from jumping ahead during the first seconds.
      const playerAcceleration = getStats().acceleration;
      const rate = targetSpeed < racer.currentSpeed ? Math.max(playerAcceleration, 10.5) : playerAcceleration;
      racer.currentSpeed += clamp(targetSpeed - racer.currentSpeed, -rate * dt, rate * dt);
      racer.currentSpeed = clamp(racer.currentSpeed, 0, racer.speed);
      const advance = Math.max(0.000001, racer.currentSpeed / circuitLength) * dt;
      racer.progress = mapConfig.routeMode === "point-to-point"
        ? clamp(racer.progress + advance, 0, 1)
        : ((racer.progress + advance) % 1 + 1) % 1;
      const gapToPlayer = mapConfig.routeMode === "point-to-point"
        ? playerTrack.progress - racer.progress
        : (playerTrack.progress - racer.progress + 1) % 1;
      const preferredLane = clamp(racer.baseLane + racer.lanePreference, -mapConfig.width * 0.28, mapConfig.width * 0.28);
      racer.targetLane = THREE.MathUtils.damp(racer.targetLane, preferredLane, 1.35, dt);
      if (gapToPlayer < 0.024 && gapToPlayer > 0.002) {
        const passSide = index % 2 === 0 ? 1 : -1;
        const passStrength = clamp((0.024 - gapToPlayer) / 0.022, 0.25, 1);
        racer.targetLane = clamp(
          preferredLane + passSide * (1.8 + racer.aggression * 1.5) * passStrength,
          -mapConfig.width * 0.3,
          mapConfig.width * 0.3
        );
      }
      racer.lane = THREE.MathUtils.damp(racer.lane, racer.targetLane, racer.steerRate * (0.72 + racer.reaction * 0.16), dt);
      racer.lane = clamp(racer.lane, -mapConfig.width * 0.30, mapConfig.width * 0.30);

      const target = lookAhead;
      const targetX = target.position.x - racer.car.position.x;
      const targetZ = target.position.z - racer.car.position.z;
      const targetYaw = Math.atan2(targetX, targetZ);
      const targetError = Math.atan2(Math.sin(targetYaw - racer.heading), Math.cos(targetYaw - racer.heading));
      const driftNoise = Math.sin(raceTime * 0.9 + index * 1.7) * racer.wobble * 0.16;
      const steeringTarget = clamp(targetError * 1.7 + driftNoise, -1, 1);
      racer.steering = THREE.MathUtils.damp(racer.steering, steeringTarget, racer.steerRate, dt);
      racer.heading += racer.steering * clamp(racer.currentSpeed / 12, 0.12, 1) * 1.2 * dt;

      const forward = new THREE.Vector3(Math.sin(racer.heading), 0, Math.cos(racer.heading));
      const right = new THREE.Vector3(forward.z, 0, -forward.x);
      racer.lateralVelocity += racer.steering * racer.currentSpeed * 0.1 * dt;
      racer.lateralVelocity += driftNoise * racer.currentSpeed * 0.05 * dt;
      racer.lateralVelocity *= Math.exp(-(2.8 + racer.skill * 1.4) * dt);
      racer.lateralVelocity = clamp(racer.lateralVelocity, -5, 5);
      racer.car.position.addScaledVector(forward, racer.currentSpeed * dt);
      racer.car.position.addScaledVector(right, racer.lateralVelocity * dt);
      const groundPose = poseAt(racer.progress, racer.lane);
      racer.car.position.y = groundPose.position.y + 0.03;
      racer.car.rotation.set(0, racer.heading, -racer.steering * Math.min(racer.currentSpeed / 50, 0.13));
      racer.car.userData.trackHeading = racer.heading;
      racer.car.userData.wheels?.forEach((wheel, wheelIndex) => {
        wheel.rotation.x -= racer.currentSpeed * dt * 0.8;
        wheel.rotation.y = wheelIndex % 2 ? racer.steering * 0.24 : 0;
      });
    }

    if (!raceStarted || paused || finished) {
      const pose = poseAt(racer.progress, racer.lane);
      racer.car.position.copy(pose.position);
      racer.car.position.y = pose.position.y + 0.03;
      racer.car.rotation.set(0, racer.heading, 0);
    }
  });

  const playerProgress = playerTrack.progress;
  const place = 1 + opponents.filter(racer => {
    if (mapConfig.routeMode === "point-to-point") return racer.progress < playerProgress;
    const gap = (racer.progress - playerProgress + 1) % 1;
    return gap > 0.5;
  }).length;
  $("position").textContent = String(clamp(place, 1, opponents.length + 1));
}

// ============================================================
// HUD AND MINIMAP
// ============================================================

function updateHUD(dt) {
  raceTime += dt;

  $("lap").textContent = Math.min(lap, raceLaps);
  $("race-time").textContent = formatTime(raceTime);

  const kmh = Math.round(Math.abs(speed) * 3.6);
  $("speed").textContent = String(kmh).padStart(3, "0");

  const gear = speed < -1 ? "R" : Math.max(1, Math.min(7, Math.floor(kmh / 30) + 1));
  $("gear").textContent = gear;

  const rpm = Math.round(1200 + (kmh / 280) * 6500);
  $("rpm").textContent = rpm.toLocaleString();
  $("rpm-bar").style.width = `${clamp((rpm - 1000) / 7000 * 100, 5, 100)}%`;

  const progress = nearestTrackPoint(player.position).progress;
  $("lap-progress").style.width = `${progress * 100}%`;
  $("drive-mode").textContent = handbrakeSlip > 0.18 ? "DRIFT" : player.userData.slipstream > 0.18 ? "DRAFT" : "SPORT";
  $("abs").style.opacity = brakePressed() ? "1" : ".5";

  $("footer-track").textContent = mapConfig.name.toUpperCase();
}

const mini = $("minimap");
const miniCtx = mini.getContext("2d");

function drawMinimap() {
  const w = mini.width;
  const h = mini.height;

  miniCtx.clearRect(0, 0, w, h);
  miniCtx.fillStyle = "#091011";
  miniCtx.fillRect(0, 0, w, h);

  if (!trackCurve) return;

  const scale = Math.min(
    (w - 24) / (mapConfig.rx * 2 + 22),
    (h - 24) / (mapConfig.rz * 2 + 22)
  );

  miniCtx.save();
  miniCtx.translate(w / 2, h / 2);
  miniCtx.scale(scale, scale);

  miniCtx.beginPath();
  for (let i = 0; i <= 300; i++) {
    const p = trackCurve.getPointAt(i / 300);
    if (i === 0) miniCtx.moveTo(p.x, p.z);
    else miniCtx.lineTo(p.x, p.z);
  }

  if (mapConfig.routeMode !== "point-to-point") miniCtx.closePath();
  miniCtx.strokeStyle = "#68736c";
  miniCtx.lineWidth = 11 / scale;
  miniCtx.stroke();

  miniCtx.strokeStyle = "#d8ff3e";
  miniCtx.lineWidth = 1.5 / scale;
  miniCtx.stroke();

  opponents.forEach(racer => {
    const p = poseAt(racer.progress, racer.lane).position;
    miniCtx.fillStyle = "#f04d43";
    miniCtx.beginPath();
    miniCtx.arc(p.x, p.z, 2.4 / scale, 0, Math.PI * 2);
    miniCtx.fill();
  });

  miniCtx.fillStyle = "#d8ff3e";
  miniCtx.beginPath();
  miniCtx.arc(player.position.x, player.position.z, 3 / scale, 0, Math.PI * 2);
  miniCtx.fill();

  miniCtx.restore();
}

// ============================================================
// CAMERA SYSTEM
// ============================================================

function cycleCamera() {
  cameraMode = (cameraMode + 1) % 4;
  const names = ["CHASE CAM", "COCKPIT CAM", "HOOD CAM", "TV CAM"];
  $("camera-name").textContent = names[cameraMode];
  showToast(names[cameraMode]);
}

function updateCamera(dt) {
  const cockpitActive = cameraMode === 1 && currentScreen === "race";
  cockpit.visible = cockpitActive;
  // Hide the exterior car mesh only in cockpit view, otherwise its roof and body can cover the road.
  if (player) player.visible = !cockpitActive;
  // A slightly wider driver-eye lens helps the dashboard, wheel and windshield
  // frame read clearly instead of looking like the previous exterior camera.
  const desiredFov = cockpitActive ? 76 : 68;
  if (camera.fov !== desiredFov) {
    camera.fov = desiredFov;
    camera.updateProjectionMatrix();
  }
  if (currentScreen === "garage") {
    const focus = player.position.clone().add(new THREE.Vector3(0, 0.82, 0));
    const orbit = new THREE.Vector3(
      Math.sin(garageOrbitYaw) * garageOrbitDistance,
      garageOrbitDistance * 0.24,
      Math.cos(garageOrbitYaw) * garageOrbitDistance
    );
    const cameraRight = new THREE.Vector3(-Math.cos(garageOrbitYaw), 0, Math.sin(garageOrbitYaw));
    camera.position.lerp(focus.clone().add(orbit), 1 - Math.exp(-5 * dt));
    camera.lookAt(focus.clone().addScaledVector(cameraRight, -3.1));
    return;
  }
  cockpitWheel.rotation.z = THREE.MathUtils.damp(cockpitWheel.rotation.z, -steering * 0.92, 9, dt);
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  let target;
  let look;

  if (cameraMode === 0) {
    target = player.position.clone()
      .addScaledVector(forward, -12.5)
      .add(new THREE.Vector3(0, 6.4, 0));

    look = player.position.clone()
      .addScaledVector(forward, 7.5)
      .add(new THREE.Vector3(0, 1.15, 0));
  } else if (cameraMode === 1) {
    // Low driver eye line. The exterior car is hidden in this mode so its roof
    // cannot occlude the road; only a narrow hood edge and dashboard remain.
    const eye = player.position.clone()
      .addScaledVector(forward, 0.12)
      .add(new THREE.Vector3(0, 1.52, 0));
    const viewDirection = new THREE.Vector3(Math.sin(yaw), -0.015, Math.cos(yaw));
    camera.position.copy(eye);
    camera.up.set(0, 1, 0);
    camera.lookAt(eye.clone().addScaledVector(viewDirection, 65));
    return;
  } else if (cameraMode === 2) {
    target = player.position.clone()
      .addScaledVector(forward, 1.1)
      .add(new THREE.Vector3(0, 1.5, 0));

    look = player.position.clone()
      .addScaledVector(forward, 25)
      .add(new THREE.Vector3(0, 1, 0));
  } else {
    const pose = poseAt(nearestTrackPoint(player.position).progress, 25);
    target = pose.position.clone().add(new THREE.Vector3(0, 13, 0));
    look = player.position.clone();
  }

  camera.position.lerp(target, 1 - Math.exp(-4.5 * dt));
  camera.lookAt(look);
}

// ============================================================
// COUNTDOWN AND GAME LOOP
// ============================================================

function updateCountdown(dt) {
  if (!countdownActive || paused) return;

  countdownClock += dt;

  if (countdownClock >= 1) {
    countdownClock -= 1;
    countdown--;

    if (countdown > 0) {
      $("center-message").textContent = String(countdown);
    } else {
      countdownActive = false;
      raceStarted = true;
      $("center-message").textContent = "GO!";
      showToast("GREEN FLAG");
    }
  }
}

function animate(timestamp) {
  requestAnimationFrame(animate);

  const dt = Math.min(
    0.033,
    Math.max(0, (timestamp - (lastTimestamp || timestamp)) / 1000)
  );
  lastTimestamp = timestamp;
  apexAdaptivePerformance(timestamp);
  apexUpdatePerformanceMonitor(timestamp);

  if (toastClock > 0) {
    toastClock -= dt;
    if (toastClock <= 0) $("toast").classList.remove("show");
  }

  if (collisionFlash > 0) collisionFlash -= dt;
  updateCrashEffects(dt);

  updateCountdown(dt);
  updatePlayer(dt);
  updatePlayerTwo(dt);
  updateAI(dt);

  if (currentScreen === "race") {
    updateCamera(dt);
    updateCrashSequence(dt);
    minimapClock += dt;
    if (minimapClock >= 1 / 15) {
      drawMinimap();
      minimapClock %= 1 / 15;
    }

    if (!countdownActive && raceStarted && !paused && !finished) {
      $("center-message").style.display = "none";
    }
  } else {
    // A slower showroom orbit gives the selected car a dealership-style reveal.
    const orbit = timestamp * (currentScreen === "garage" ? 0.000075 : 0.00012);
    const target = player.position.clone();
    if (currentScreen === "garage") showroom.position.set(target.x, 0, target.z);
    const radius = currentScreen === "garage" ? 17 : 18;
    camera.position.lerp(
      target.clone().add(new THREE.Vector3(
        Math.sin(orbit) * radius, currentScreen === "garage" ? 6.2 : 8, Math.cos(orbit) * radius
      )),
      1 - Math.exp(-(currentScreen === "garage" ? 1.35 : 2) * dt)
    );
    camera.lookAt(target.x, target.y + (currentScreen === "garage" ? 0.85 : 0.6), target.z);
  }

  if (typeof apexUpdateSystems === "function") apexUpdateSystems(dt);

  if (splitScreenEnabled && player2 && currentScreen === "race") {
    const width = innerWidth;
    const height = innerHeight;
    renderer.setScissorTest(true);
    renderer.setScissor(0, 0, Math.floor(width / 2), height);
    renderer.setViewport(0, 0, Math.floor(width / 2), height);
    // Camera projection matrices are updated on resize/toggle, not every frame.
    renderer.render(scene, camera);

    updatePlayerTwoCamera(dt);
    renderer.setScissor(Math.floor(width / 2), 0, Math.ceil(width / 2), height);
    renderer.setViewport(Math.floor(width / 2), 0, Math.ceil(width / 2), height);
    renderer.render(scene, player2Camera);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, width, height);
  } else {
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, innerWidth, innerHeight);
    renderer.render(scene, camera);
  }
}

// ============================================================
// RACE OPTIONS: AI DIFFICULTY + LOCAL SPLIT SCREEN
// ============================================================

let splitScreenEnabled = false;
let player2 = null;
let player2Speed = 0;
let player2Yaw = 0;
let player2Steering = 0;
let player2LateralVelocity = 0;
const player2Camera = new THREE.PerspectiveCamera(68, 0.5, 0.1, 1000);
const player2Keys = {};

function setPlayerTwoCar(id) {
  if (!CAR_TYPES[id]) return;
  player2CarId = id;
  if (player2) {
    const oldPosition = player2.position.clone();
    scene.remove(player2);
    player2 = createCar(CAR_TYPES[player2CarId]);
    scene.add(player2);
    player2.position.copy(oldPosition);
    player2.position.y = 0.03;
    player2.rotation.y = player2Yaw;
  }
  saveGarage();
  showToast("PLAYER 2 CAR: " + CAR_TYPES[id].name.toUpperCase());
}

// Add controls to the existing top bar without replacing the original menu.
const optionsBar = document.querySelector('.topbar-right');
if (optionsBar) {
  const optionStyle = `
    background:#111819;color:#d8ff3e;border:1px solid rgba(216,255,62,.35);
    border-radius:4px;padding:9px 10px;font:700 10px/1.2 Arial,sans-serif;
    letter-spacing:1px;cursor:pointer;max-width:150px;
  `;
  const difficultySelect = document.createElement('select');
  difficultySelect.id = 'ai-difficulty-select';
  difficultySelect.setAttribute('aria-label', 'AI difficulty');
  difficultySelect.style.cssText = optionStyle;
  difficultySelect.innerHTML = `
    <option value="easy">AI: EASY</option>
    <option value="medium">AI: MEDIUM</option>
    <option value="hard">AI: HARD</option>
    <option value="expert">AI: EXPERT</option>`;
  difficultySelect.value = selectedDifficulty;
  difficultySelect.addEventListener('change', () => {
    setAIDifficulty(difficultySelect.value);
    showToast('AI DIFFICULTY: ' + difficultySelect.value.toUpperCase());
  });

  const aiCountSelect = document.createElement('select');
  aiCountSelect.id = 'ai-count-select';
  aiCountSelect.setAttribute('aria-label', 'Number of AI racers');
  aiCountSelect.style.cssText = optionStyle;
  aiCountSelect.innerHTML = Array.from({length: 10}, (_, i) => `<option value="${i + 1}">AI RACERS: ${i + 1}</option>`).join('');
  aiCountSelect.value = String(selectedAICount);
  aiCountSelect.addEventListener('change', () => {
    selectedAICount = clamp(parseInt(aiCountSelect.value, 10) || 3, 1, 10);
    createOpponents();
    placeCarsOnTrack();
    showToast(`AI RACERS: ${selectedAICount}`);
  });

  const aiLevelWrap = document.createElement('label');
  aiLevelWrap.id = 'ai-level-wrap';
  aiLevelWrap.style.cssText = 'display:flex;align-items:center;gap:7px;color:#d8ff3e;font:700 10px Arial,sans-serif;letter-spacing:1px;white-space:nowrap;padding:0 5px;';
  aiLevelWrap.innerHTML = '<span>AI LEVEL</span><input id="ai-level-slider" type="range" min="1" max="100" step="1" value="60" aria-label="AI level" style="width:90px;accent-color:#d8ff3e;cursor:pointer"><output id="ai-level-value" style="min-width:24px;text-align:center">60</output>';
  const aiLevelSlider = aiLevelWrap.querySelector('#ai-level-slider');
  aiLevelSlider.addEventListener('input', () => {
    selectedAILevel = Number(aiLevelSlider.value);
    aiLevelWrap.querySelector('#ai-level-value').textContent = String(selectedAILevel);
    const difficultyByLevel = selectedAILevel <= 30 ? 'easy' : selectedAILevel <= 60 ? 'medium' : selectedAILevel <= 80 ? 'hard' : 'expert';
    selectedDifficulty = difficultyByLevel;
    if (difficultySelect.value !== difficultyByLevel) difficultySelect.value = difficultyByLevel;
    const speedMultiplier = Math.min(1.15, (selectedAILevel / 70) * 1.15);
    const cfg = AI_LEVELS[difficultyByLevel];
    const playerTopSpeed = getStats().topSpeed * 0.72 * (window.apexWeatherMode === 'rain' ? 0.91 : 1);
    opponents.forEach(racer => {
      racer.speedMultiplier = Math.min(1.15, speedMultiplier * racer.paceFactor);
      racer.speed = playerTopSpeed * racer.speedMultiplier;
      racer.skill = cfg.skill * (0.85 + selectedAILevel * 0.0025) * racer.skillFactor * 1.08;
      racer.wobble = Math.max(0.008, cfg.wobble * (1.08 - selectedAILevel * 0.0045) * 0.90 / racer.skillFactor);
      racer.reaction = (1.04 + selectedAILevel * 0.002) * racer.skillFactor;
      racer.aggression = (0.52 + selectedAILevel * 0.003) * racer.aggressionFactor;
    });
    saveGarage();
  });

  const player2CarSelect = document.createElement('select');
  player2CarSelect.id = 'player2-car-select';
  player2CarSelect.setAttribute('aria-label', 'Player 2 car');
  player2CarSelect.style.cssText = optionStyle;
  player2CarSelect.innerHTML = Object.entries(CAR_TYPES)
    .map(([id, car]) => `<option value="${id}">${car.name.toUpperCase()}</option>`)
    .join('');
  player2CarSelect.value = player2CarId;
  player2CarSelect.addEventListener('change', () => {
    setPlayerTwoCar(player2CarSelect.value);
    refreshPlayerTwoGaragePanel();
  });

  // A dedicated second-half garage lets Player 2 choose a car independently.
  const player2GaragePanel = document.createElement('aside');
  player2GaragePanel.id = 'player2-garage-panel';
  player2GaragePanel.innerHTML = '<div class="p2-garage-eyebrow">LOCAL MULTIPLAYER · DRIVER 02</div><h2>CHOOSE YOUR <em>MACHINE.</em></h2><p>Player 2 can choose a different car from Player 1.</p><div id="player2-garage-cars" class="p2-garage-cars"></div><div class="p2-garage-selected">SELECTED CAR <strong id="player2-garage-selected">GT PERFORMANCE</strong></div>';
  document.body.appendChild(player2GaragePanel);
  const p2GarageCars = player2GaragePanel.querySelector('#player2-garage-cars');
  Object.entries(CAR_TYPES).forEach(([id, car]) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'p2-car-card';
    card.dataset.carId = id;
    card.innerHTML = `<span class="p2-car-swatch" style="--car-color:#${car.color.toString(16).padStart(6,'0')}"></span><span class="p2-car-name">${car.name}</span><small>TOP SPEED ${car.topSpeed}</small>`;
    card.addEventListener('click', () => {
      player2CarSelect.value = id;
      setPlayerTwoCar(id);
      refreshPlayerTwoGaragePanel();
    });
    p2GarageCars.appendChild(card);
  });
  function refreshPlayerTwoGaragePanel() {
    player2GaragePanel.classList.toggle('is-visible', splitScreenEnabled && currentScreen === 'garage');
    document.body.classList.toggle('two-player-garage', splitScreenEnabled && currentScreen === 'garage');
    player2GaragePanel.querySelectorAll('.p2-car-card').forEach(card => card.classList.toggle('is-selected', card.dataset.carId === player2CarId));
    const selected = CAR_TYPES[player2CarId];
    player2GaragePanel.querySelector('#player2-garage-selected').textContent = selected ? selected.name.toUpperCase() : 'SELECT A CAR';
  }

  const splitButton = document.createElement('button');
  splitButton.id = 'split-screen-toggle';
  splitButton.className = 'icon-button';
  splitButton.textContent = '2 PLAYER: OFF';
  splitButton.style.cssText = optionStyle;
  splitButton.addEventListener('click', () => {
    splitScreenEnabled = !splitScreenEnabled;
    if (splitScreenEnabled && !player2) {
      player2 = createCar(CAR_TYPES[player2CarId]);
      scene.add(player2);
      const p = poseAt(0.002, 1.6);
      player2.position.copy(p.position);
      player2.position.y = p.position.y + 0.03;
      player2Yaw = p.yaw;
    }
    splitButton.textContent = splitScreenEnabled ? '2 PLAYER: ON' : '2 PLAYER: OFF';
    splitButton.style.borderColor = splitScreenEnabled ? '#d8ff3e' : 'rgba(216,255,62,.35)';
    if (splitScreenEnabled) showToast('PLAYER 2: ARROW KEYS TO DRIVE');
    else showToast('SINGLE PLAYER');
    refreshPlayerTwoGaragePanel();
    resizeRenderer();
  });

  const soundButtonForInsert = $('sound-btn');
  const preRaceSettings = $('pre-race-settings');
  if (preRaceSettings) preRaceSettings.append(difficultySelect, aiCountSelect, aiLevelWrap);
  if (soundButtonForInsert) {
    optionsBar.insertBefore(splitButton, soundButtonForInsert);
    optionsBar.insertBefore(player2CarSelect, soundButtonForInsert);
  } else {
    optionsBar.append(splitButton, player2CarSelect);
  }
  refreshPlayerTwoGaragePanel();
}

const mobileModeButton = $('mobile-mode-toggle');
const mobileControls = $('mobile-controls');
let mobileModeEnabled = false;
try { mobileModeEnabled = localStorage.getItem('apexMobileMode') === 'true'; } catch (_) {}

function syncMobileMode() {
  document.body.classList.toggle('mobile-mode', mobileModeEnabled);
  mobileControls.classList.toggle('is-visible', mobileModeEnabled && currentScreen === 'race');
  mobileModeButton.textContent = mobileModeEnabled ? 'TOUCH: ON' : 'TOUCH MODE';
  mobileModeButton.classList.toggle('is-active', mobileModeEnabled);
  mobileModeButton.setAttribute('aria-pressed', String(mobileModeEnabled));
}
syncMobileMode();

mobileModeButton.addEventListener('click', () => {
  mobileModeEnabled = !mobileModeEnabled;
  try { localStorage.setItem('apexMobileMode', String(mobileModeEnabled)); } catch (_) {}
  syncMobileMode();
  showToast(mobileModeEnabled ? 'TOUCH CONTROLS ENABLED' : 'TOUCH CONTROLS DISABLED');
});

mobileControls.querySelectorAll('[data-game-key]').forEach(button => {
  const key = button.dataset.gameKey;
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    keys[key] = true;
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => {
    button.addEventListener(type, () => { keys[key] = false; });
  });
  button.addEventListener('contextmenu', event => event.preventDefault());
});

// Player 2 gets both a keyboard handbrake and a dedicated on-screen button.
let player2HandbrakeButtonHeld = false;
const player2HandbrakeButton = document.createElement('button');
player2HandbrakeButton.id = 'player2-handbrake-button';
player2HandbrakeButton.type = 'button';
player2HandbrakeButton.innerHTML = '<strong>P2</strong><span>HANDBRAKE</span><small>HOLD TO DRIFT</small>';
player2HandbrakeButton.setAttribute('aria-label', 'Player 2 handbrake; hold to drift');
document.body.appendChild(player2HandbrakeButton);
const setPlayer2HandbrakeButton = held => {
  player2HandbrakeButtonHeld = held;
  player2HandbrakeButton.classList.toggle('is-pressed', held);
};
player2HandbrakeButton.addEventListener('pointerdown', event => {
  event.preventDefault();
  player2HandbrakeButton.setPointerCapture?.(event.pointerId);
  setPlayer2HandbrakeButton(true);
});
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => player2HandbrakeButton.addEventListener(type, () => setPlayer2HandbrakeButton(false)));
player2HandbrakeButton.addEventListener('contextmenu', event => event.preventDefault());
window.addEventListener('keydown', event => { player2Keys[event.code] = true; });
window.addEventListener('keyup', event => { player2Keys[event.code] = false; });
window.addEventListener('blur', () => {
  Object.keys(player2Keys).forEach(key => player2Keys[key] = false);
  setPlayer2HandbrakeButton(false);
});

function updatePlayerTwo(dt) {
  const p2CanDrive = splitScreenEnabled && !!player2 && raceStarted && !paused && !finished && currentScreen === 'race';
  player2HandbrakeButton.classList.toggle('is-visible', p2CanDrive);
  if (!p2CanDrive) { setPlayer2HandbrakeButton(false); return; }
  const type = CAR_TYPES[player2CarId];
  // Use the same per-car upgrade calculations as Player 1. This prevents P2
  // from being slower when both players choose the same car.
  const p2Upgrade = upgrades[player2CarId] || {};
  const p2Stats = {
    acceleration: type.acceleration * (1 + clamp(Number(p2Upgrade.engine) || 0, 0, 5) * 0.09),
    topSpeed: type.topSpeed * (1 + clamp(Number(p2Upgrade.aero) || 0, 0, 5) * 0.045),
    handling: type.handling * (1 + clamp(Number(p2Upgrade.grip) || 0, 0, 5) * 0.07),
    braking: type.braking * (1 + clamp(Number(p2Upgrade.brakes) || 0, 0, 5) * 0.1)
  };
  const gas = player2Keys.ArrowUp;
  const brake = player2Keys.ArrowDown;
  const steerInput = (player2Keys.ArrowLeft ? 1 : 0) - (player2Keys.ArrowRight ? 1 : 0);
  const handbrake = !!(player2Keys.ShiftRight || player2Keys.Numpad0 || player2HandbrakeButtonHeld);
  if (gas) player2Speed += p2Stats.acceleration * dt;
  else player2Speed -= (2.6 + Math.abs(player2Speed) * 0.075) * dt;
  if (brake) player2Speed -= p2Stats.braking * dt;
  if (handbrake && Math.abs(player2Speed) > 3) player2Speed -= Math.sign(player2Speed) * (1.4 + Math.abs(player2Speed) * 0.035) * dt;
  // Match Player 1's speed cap and wet-weather penalty.
  const p2WeatherCap = window.apexWeatherMode === 'rain' ? 0.91 : 1;
  player2Speed = clamp(player2Speed, -5, p2Stats.topSpeed * 0.72 * p2WeatherCap);
  player2Steering = THREE.MathUtils.damp(player2Steering, steerInput, 6, dt);
  const speedFactor = clamp(Math.abs(player2Speed) / 12, 0.12, 1);
  player2Yaw += player2Steering * speedFactor * p2Stats.handling * dt * (player2Speed < -0.5 ? -1 : 1);
  const forward = new THREE.Vector3(Math.sin(player2Yaw), 0, Math.cos(player2Yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  player2LateralVelocity += steerInput * Math.abs(player2Speed) * (handbrake ? 0.30 : 0.16) * dt;
  player2LateralVelocity *= Math.exp(-(handbrake ? 1.8 : 5.5) * dt);
  player2LateralVelocity = clamp(player2LateralVelocity, -9, 9);
  player2.position.addScaledVector(forward, player2Speed * dt);
  player2.position.addScaledVector(right, player2LateralVelocity * dt);
  player2.rotation.set(0, player2Yaw, -player2Steering * Math.min(Math.abs(player2Speed) / 50, 0.15));
  player2.userData.wheels.forEach(wheel => wheel.rotation.x -= player2Speed * dt * 0.8);

  // With Crash FX enabled, hard impacts with the physical fence or another car
  // trigger the same explosion-and-start-grid respawn for Player 2.
  if (crashRespawnEnabled && Math.abs(player2Speed) > 22) {
    const p2HalfLength = type.length * 0.48;
    const p2HalfWidth = type.width * 0.48;
    for (const barrier of barriers) {
      const dx = player2.position.x - barrier.position.x;
      const dz = player2.position.z - barrier.position.z;
      if (dx * dx + dz * dz > 10) continue;
      const localForward = dx * barrier.tangent.x + dz * barrier.tangent.z;
      const localSide = dx * barrier.normal.x + dz * barrier.normal.z;
      if (Math.abs(localForward) < p2HalfLength + barrier.halfLength && Math.abs(localSide) < p2HalfWidth + barrier.halfWidth) {
        if (triggerCrashRespawn(2)) return;
      }
    }
    const nearbyCars = [player, ...opponents.map(racer => racer.car)];
    for (const other of nearbyCars) {
      const dx = player2.position.x - other.position.x;
      const dz = player2.position.z - other.position.z;
      const otherWidth = other.userData.type?.width || selectedCar.width;
      if (Math.hypot(dx, dz) < (type.width + otherWidth) * 0.48) {
        if (triggerCrashRespawn(2)) return;
      }
    }
  }

  const track = nearestTrackPoint(player2.position);
  player2.position.y = (mapId === "mountainpass" && track.distance > mapConfig.width / 2
    ? Math.max(track.pose.position.y, mountainPassGroundHeight(player2.position.x, player2.position.z))
    : track.pose.position.y) + 0.03;
  player2.rotation.x = -Math.atan2(track.pose.tangent.y, Math.hypot(track.pose.tangent.x, track.pose.tangent.z));
  if (track.distance > mapConfig.width * 0.48 || track.distance > 65) {
    if (Math.abs(player2Speed) > 22 && triggerCrashRespawn(2)) return;
    const pose = poseAt(track.progress, 1.6);
    player2.position.copy(pose.position);
    player2.position.y = pose.position.y + 0.03;
    player2Yaw = pose.yaw;
    player2Speed *= 0.3;
    player2LateralVelocity = 0;
  }
}

function updatePlayerTwoCamera(dt) {
  if (!player2) return;
  const forward = new THREE.Vector3(Math.sin(player2Yaw), 0, Math.cos(player2Yaw));
  const target = player2.position.clone().addScaledVector(forward, -8).add(new THREE.Vector3(0, 4, 0));
  const look = player2.position.clone().addScaledVector(forward, 4).add(new THREE.Vector3(0, 1, 0));
  player2Camera.position.lerp(target, 1 - Math.exp(-4.5 * dt));
  player2Camera.lookAt(look);
}

function resizeRenderer() {
  const width = innerWidth;
  const height = innerHeight;
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, width, height);
renderer.setPixelRatio(
  Math.min(window.devicePixelRatio || 1, 1.1)
);
  renderer.setSize(width, height);
  camera.aspect = splitScreenEnabled ? (width / 2) / height : width / height;
  camera.updateProjectionMatrix();
  player2Camera.aspect = (width / 2) / height;
  player2Camera.updateProjectionMatrix();
}

// ============================================================
// SOUND SWITCH
// ============================================================

$("sound-btn").addEventListener("click", () => {
  audioEnabled = !audioEnabled;
  $("sound-btn").textContent = audioEnabled ? "♫ SOUND" : "♫ MUTED";
  showToast(audioEnabled ? "SOUND ENABLED" : "SOUND MUTED");
});

// ============================================================
// RESIZE AND BOOT
// ============================================================

window.addEventListener("resize", resizeRenderer);

buildMap();
createOpponents();
placeCarsOnTrack();
renderGarage();
renderTracks();
renderUpgrades();
updateCredits();
updateHome();
showScreen("home");

// ============================================================
// APEX EXPANSION SYSTEMS: CAREER, WEATHER, PIT, TELEMETRY, REPLAY
// ============================================================
window.apexWeatherMode = "clear";
window.apexSessionMode = "race";
window.apexTireCompound = "medium";
window.apexCareer = (() => {
  const defaults = { driverName: "Rookie Driver", nationality: "United States", teamName: "Apex Motorsport", carNumber: "27", bio: "Ready to earn my place on the grid.", races: 0, wins: 0, points: 0, xp: 0, level: 1, lastPosition: null, active: false, round: 0, seasonPoints: 0, seasonWins: 0, championships: 0, results: [] };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem("apexCareer") || "{}") }; }
  catch (_) { return defaults; }
})();
let careerFinishMessage = "";
const APEX_CAREER_SCHEDULE = [
  { track: "coast", name: "Coastal opener", goalPosition: 8, bonus: 350 },
  { track: "figure8", name: "Forest Grand Loop", goalPosition: 7, bonus: 450 },
  { track: "city", name: "City Lights GP", goalPosition: 6, bonus: 550 },
  { track: "volcano", name: "Volcanic Challenge", goalPosition: 5, bonus: 650 },
  { track: "snow", name: "Alpine Snow Prix", goalPosition: 4, bonus: 750 },
  { track: "grandprix", name: "Technical Grand Prix", goalPosition: 3, bonus: 900 },
  { track: "stony", name: "Highland Endurance", goalPosition: 2, bonus: 1100 },
  { track: "megacircuit", name: "Apex Masters Finale", goalPosition: 1, bonus: 1500 }
];
const APEX_CAREER_CONTRACTS = [
  { id: "podiums", progress: "podiums", name: "Podium Regular", target: 3, reward: 2500 },
  { id: "points", progress: "points", name: "Championship Scorer", target: 150, reward: 2200 },
  { id: "wins", progress: "wins", name: "Race Winner", target: 3, reward: 4000 }
];
const APEX_STORY_CAMPAIGN = [
  { track: "stadium", title: "The Last Bay", rival: "Nia Calder", intro: "Your family workshop is one missed payment from closing. Local team owner Nia Calder offers a single ride in exchange for proving you belong in the paddock.", outro: "Nia offers you a place on the regional grid.", goalPosition: 7, laps: 2, reward: 700 },
  { track: "coast", title: "Salt on the Visor", rival: "Rafe Moreno", intro: "A coastal sponsor needs a driver who can stay composed in traffic. Rafe Moreno has already promised them the seat.", outro: "The sponsor signs your team for the next round.", goalPosition: 6, laps: 3, reward: 900 },
  { track: "desert", title: "Dust and Doubt", rival: "Tess Okafor", intro: "The first contract pays the workshop bills, but veteran Tess Okafor says your early results were luck. The desert stage is your answer.", outro: "Your pace earns respect from the crew and a fresh engineering budget.", goalPosition: 5, laps: 3, reward: 1100 },
  { track: "neoncity", title: "After the Lights", rival: "Nia Calder", intro: "Under the city lights, Nia returns with a faster car and a harder challenge. This time the whole paddock is watching.", outro: "You take the rivalry into the championship's upper tier.", goalPosition: 4, laps: 3, reward: 1400 },
  { track: "mountainpass", title: "Thin Air", rival: "Rafe Moreno", intro: "A high-altitude invitational puts your team one strong result away from the finale. Rafe intends to close that door.", outro: "The team earns its place on the final grid.", goalPosition: 3, laps: 3, reward: 1800 },
  { track: "megacircuit", title: "Apex, on Your Terms", rival: "Tess Okafor", intro: "At the season finale, the drivers who doubted you are on the same grid. Win the race and secure the workshop's future.", outro: "The workshop is safe, the team is yours, and the next season starts on your terms.", goalPosition: 1, laps: 4, reward: 3000 }
];
window.apexStory = (() => {
  const defaults = { chapter: 0, activeRun: false, activeChapter: 0, results: [] };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem("apexStory") || "{}") }; }
  catch (_) { return defaults; }
})();
let storyFinishMessage = "";
let apexTelemetryOn = false;
let apexPhotoMode = false;
let apexPhotoAngle = 0;
let apexPitTimer = 0;
let apexPitUsed = false;
let apexReplayFrames = [];
let apexReplayCar = null;
let apexReplayActive = false;
let apexReplayIndex = 0;
let apexRain = null;
let apexRaceRecord = [];
let apexDamage = 0;
let apexTireWear = 0;
let apexTrackRecord = {};
try { apexTrackRecord = JSON.parse(localStorage.getItem("apexTrackRecords") || "{}"); } catch (_) {}

function apexAddStyle() {
  const style = document.createElement("style");
  style.textContent = `
  .apex-tools{position:fixed;z-index:25;right:16px;top:84px;display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;max-width:min(620px,68vw)}
  body:not([data-screen="race"]) .apex-tools{display:none!important}
  .apex-tools button,.apex-tools select{background:rgba(12,20,20,.91);border:1px solid rgba(216,255,62,.42);color:#eff8e9;border-radius:4px;padding:8px 10px;font:700 10px 'DM Mono',monospace;letter-spacing:.5px;cursor:pointer;box-shadow:0 3px 14px #0004}
  .apex-tools button:hover,.apex-tools select:hover{border-color:#d8ff3e;background:#202c27}
  #race-hud:not(.hidden)~.apex-tools{top:158px;max-width:min(820px,calc(100vw - 32px))}
  #race-hud:not(.hidden)~#apex-performance-monitor{top:auto;right:16px;bottom:154px}
  .apex-tools .active{background:#d8ff3e;color:#101710}
  .apex-overlay{position:fixed;z-index:30;left:16px;top:130px;width:min(300px,calc(100vw - 32px));padding:14px;background:rgba(8,15,15,.9);border:1px solid rgba(216,255,62,.55);color:#f5f8f3;font:11px 'DM Mono',monospace;line-height:1.8;backdrop-filter:blur(10px);pointer-events:none}
  .apex-overlay strong{color:#d8ff3e}.apex-overlay h3{font:800 20px 'Barlow Condensed',sans-serif;margin:0 0 8px;letter-spacing:1px}
  .apex-modal{position:fixed;z-index:35;inset:0;background:#050909d9;display:grid;place-items:center;padding:20px}
  .apex-modal-card{width:min(680px,100%);max-height:85vh;overflow:auto;background:#111a19;border:1px solid #d8ff3e66;padding:24px;color:#f5f8f3}
  .apex-modal-card h2{font:900 38px 'Barlow Condensed',sans-serif;margin:0 0 12px}.apex-modal-card p{color:#b8c4bc;line-height:1.7}.apex-modal-card button{background:#d8ff3e;color:#101710;border:0;padding:11px 14px;font:800 11px 'DM Mono',monospace;margin:5px 6px 0 0;cursor:pointer}
  .apex-modal-card .apex-secondary{background:#202a28;color:#eff8e9;border:1px solid #ffffff24}
  .career-card{width:min(760px,100%)}.career-calendar{margin:18px 0;border:1px solid #ffffff1b;background:#0a1110}
  .career-calendar-head{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;background:#1b2723;color:#d8ff3e;font:700 10px 'DM Mono',monospace;letter-spacing:.8px}
  .career-calendar-head span{color:#aab7ae}.career-event{display:grid;grid-template-columns:38px 1fr auto;gap:12px;align-items:center;padding:10px 14px;border-top:1px solid #ffffff10}
  .career-round{font:800 17px 'Barlow Condensed',sans-serif;color:#718078}.career-event strong{display:block;font:700 13px 'Barlow Condensed',sans-serif;letter-spacing:.5px}.career-event small{display:block;color:#8d9a92;font:10px 'DM Mono',monospace;margin-top:3px}.career-event em{font:700 9px 'DM Mono',monospace;color:#8b9990;font-style:normal;text-align:right}
  .career-event.next{background:#d8ff3e0c}.career-event.next .career-round,.career-event.next em{color:#d8ff3e}.career-event.done em{color:#9fdb8e}.career-rule{font-size:12px!important}
  .career-profile{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:16px 0;padding:14px;background:#0a1110;border:1px solid #ffffff16}
  .career-profile label{display:flex;flex-direction:column;gap:5px;color:#aebbb2;font:700 9px 'DM Mono',monospace;letter-spacing:.7px}
  .career-profile input,.career-profile textarea{box-sizing:border-box;width:100%;min-width:0;background:#17211e;border:1px solid #ffffff24;color:#f5f8f3;padding:10px;font:12px 'Rajdhani',sans-serif;outline:none}
  .career-profile input:focus,.career-profile textarea:focus{border-color:#d8ff3e}.career-profile .wide{grid-column:1/-1}.career-profile textarea{resize:vertical;min-height:54px}
  .driver-card{display:flex;gap:12px;align-items:center;padding:12px 14px;background:#1b2723;border-left:3px solid #d8ff3e;margin:12px 0}.driver-number{font:900 28px 'Barlow Condensed',sans-serif;color:#d8ff3e}.driver-card strong{display:block;font:800 17px 'Barlow Condensed',sans-serif}.driver-card small{color:#aab7ae;font:10px 'DM Mono',monospace}
  .showroom-intro{grid-column:1/-1;display:flex;flex-direction:column;gap:5px;margin:0 0 12px;padding:15px 18px;border:1px solid #d8ff3e35;background:linear-gradient(110deg,#111a19ed,#1a2925d9);box-shadow:0 10px 32px #0004}
  .showroom-intro span{font:700 9px 'DM Mono',monospace;letter-spacing:1.8px;color:#d8ff3e}
  .showroom-intro strong{font:800 24px 'Barlow Condensed',sans-serif;letter-spacing:1px;color:#f5f8f3}.showroom-intro em{font-style:normal;color:#d8ff3e}
  .showroom-intro small{max-width:640px;color:#aab7ae;font:11px 'DM Mono',monospace;line-height:1.6}
  @media(max-width:560px){.career-profile{grid-template-columns:1fr}.career-profile .wide{grid-column:auto}}
  body.apex-photo .topbar,body.apex-photo .screen,body.apex-photo .race-hud,body.apex-photo .speed-panel,body.apex-photo .minimap-wrap,body.apex-photo .bottom-hud,body.apex-photo .toast,body.apex-photo .center-message,body.apex-photo .apex-tools{display:none!important}
  @media(max-width:700px){
    .apex-tools{top:80px;right:6px;max-width:74vw}
    .apex-tools button,.apex-tools select{padding:6px;font-size:8px}
    #race-hud:not(.hidden)~.apex-tools{top:204px;left:8px;right:8px;max-width:none;justify-content:flex-start}
    #race-hud:not(.hidden)~.apex-tools select{flex:1 1 calc(50% - 4px);min-width:0;max-width:none}
    #race-hud:not(.hidden)~.apex-tools button{flex:1 1 calc(33.333% - 4px);min-width:0}
    #apex-performance-monitor{top:auto;right:8px;bottom:320px}
    .apex-overlay{top:145px;left:8px}
  }
  `;
  document.head.appendChild(style);
}

function apexCreateTools() {
  apexAddStyle();
  const bar = document.createElement("div");
  bar.className = "apex-tools";
  bar.innerHTML = `
    <select id="apex-weather" aria-label="Weather"><option value="clear">WEATHER: CLEAR</option><option value="rain">WEATHER: RAIN</option><option value="fog">WEATHER: FOG</option><option value="night">TIME: NIGHT</option></select>
    <select id="apex-laps" aria-label="Race length"><option value="1">SPRINT · 1 LAP</option><option value="3" selected>GRAND PRIX · 3 LAPS</option><option value="5">FEATURE · 5 LAPS</option><option value="8">ENDURANCE · 8 LAPS</option></select>
    <select id="apex-session" aria-label="Session type"><option value="race">SESSION: RACE</option><option value="practice">SESSION: PRACTICE</option><option value="qualifying">SESSION: QUALIFYING</option></select>
    <select id="apex-tires" aria-label="Tire compound"><option value="soft">TYRES: SOFT</option><option value="medium" selected>TYRES: MEDIUM</option><option value="hard">TYRES: HARD</option><option value="wet">TYRES: WET</option></select>
    <button id="apex-crash-respawn-btn" title="When enabled, a hard crash creates an explosion and sends you back to the starting grid">CRASH FX: OFF</button>
    <button id="apex-career-btn">CAREER</button><button id="apex-telemetry-btn">TELEMETRY [T]</button><button id="apex-pit-btn">PIT [P]</button><button id="apex-replay-btn">REPLAY [V]</button><button id="apex-photo-btn">PHOTO [O]</button>`;
  document.body.appendChild(bar);
  const crashToggle = document.getElementById("apex-crash-respawn-btn");
  const refreshCrashToggle = () => {
    crashToggle.textContent = crashRespawnEnabled ? "CRASH FX: ON" : "CRASH FX: OFF";
    crashToggle.classList.toggle("active", crashRespawnEnabled);
    crashToggle.setAttribute("aria-pressed", String(crashRespawnEnabled));
  };
  refreshCrashToggle();
  crashToggle.addEventListener("click", () => {
    crashRespawnEnabled = !crashRespawnEnabled;
    try { localStorage.setItem("apexCrashExplosionRespawn", String(crashRespawnEnabled)); } catch (_) {}
    refreshCrashToggle();
    showToast(crashRespawnEnabled ? "CRASH EXPLOSIONS ENABLED · HARD CRASHES RESPAWN AT START" : "CRASH EXPLOSIONS DISABLED");
  });
  const overlay = document.createElement("div");
  overlay.id = "apex-telemetry";
  overlay.className = "apex-overlay";
  overlay.style.display = "none";
  overlay.innerHTML = `<h3>LIVE TELEMETRY</h3><div>DRIVER <strong id="apex-t-driver">Rookie Driver</strong></div><div>VELOCITY <strong id="apex-t-speed">0 km/h</strong></div><div>THROTTLE <strong id="apex-t-throttle">0%</strong></div><div>STEERING <strong id="apex-t-steer">0%</strong></div><div>WEATHER <strong id="apex-t-weather">CLEAR</strong></div><div>TYRES <strong id="apex-t-tires">OPTIMAL</strong></div><div>DAMAGE <strong id="apex-t-damage">0%</strong></div><div>BEST LAP <strong id="apex-t-best">--</strong></div>`;
  document.body.appendChild(overlay);
  document.getElementById("apex-weather").addEventListener("change", e => apexSetWeather(e.target.value));
  document.getElementById("apex-session").addEventListener("change", e => { window.apexSessionMode = e.target.value; showToast(`SESSION: ${e.target.value.toUpperCase()}`); });
  document.getElementById("apex-tires").addEventListener("change", e => { window.apexTireCompound = e.target.value; showToast(`TYRE COMPOUND: ${e.target.value.toUpperCase()}`); });
  document.getElementById("apex-laps").addEventListener("change", e => { raceLaps = Number(e.target.value); const lapLabel = document.querySelector('#race-hud .hud-chip:nth-child(4) strong'); if (lapLabel) lapLabel.innerHTML = `<span id="lap">${lap}</span><small> / ${raceLaps}</small>`; showToast(`RACE LENGTH: ${raceLaps} LAP${raceLaps > 1 ? "S" : ""}`); });
  document.getElementById("apex-career-btn").addEventListener("click", apexShowCareer);
  document.getElementById("apex-telemetry-btn").addEventListener("click", apexToggleTelemetry);
  document.getElementById("apex-pit-btn").addEventListener("click", apexPitStop);
  document.getElementById("apex-replay-btn").addEventListener("click", apexStartReplay);
  document.getElementById("apex-photo-btn").addEventListener("click", apexTogglePhoto);
  const preRaceSettings = document.getElementById("pre-race-settings");
  if (preRaceSettings) {
    preRaceSettings.append(
      document.getElementById("apex-weather"),
      document.getElementById("apex-laps"),
      document.getElementById("apex-session"),
      document.getElementById("apex-tires"),
      crashToggle
    );
  }
  const garage = document.getElementById("garage-screen");
  if (garage) {
    const custom = document.createElement("div");
    custom.className = "choice-card";
    custom.style.marginTop = "14px";
    custom.innerHTML = `<div class="choice-info"><strong>PAINT & LIVERY LAB</strong><small>Change the body paint on your selected machine.</small></div><input id="apex-paint" aria-label="Car paint color" type="color" value="#d8ff3e" style="width:52px;height:38px;background:#111;border:1px solid #d8ff3e;cursor:pointer">`;
    const showroomIntro = document.createElement("div");
    showroomIntro.className = "showroom-intro";
    showroomIntro.innerHTML = `<span>APEX PERFORMANCE CENTRE</span><strong>SELECT. SPEC. <em>DRIVE.</em></strong><small>Walk through your private showroom, compare the machine, then apply your livery and head to the circuit.</small>`;
    garage.prepend(showroomIntro);
    garage.appendChild(custom);
    document.getElementById("apex-paint").addEventListener("input", e => {
      const color = Number.parseInt(e.target.value.slice(1), 16);
      selectedCar.color = color;
      const oldPos = player.position.clone();
      scene.remove(player); player = createCar(selectedCar); scene.add(player); player.position.copy(oldPos); player.rotation.y = yaw;
      saveGarage();
    });
  }
}

function apexSetWeather(mode) {
  window.apexWeatherMode = mode;
  scene.fog = new THREE.Fog(mapConfig.sky, mode === "fog" ? 95 : 420, mode === "fog" ? 650 : mode === "night" ? 1300 : 1900);
  if (mode === "night") {
    renderer.toneMappingExposure = 0.92;
    scene.background = new THREE.Color(0x101a2a);
    if (sun) sun.intensity = 1.25;
  } else {
    renderer.toneMappingExposure = 1.28;
    scene.background = new THREE.Color(mode === "fog" ? 0xb7c2c5 : mode === "rain" ? 0x52636c : mapConfig.sky);
    if (sun) sun.intensity = mode === "rain" ? 1.6 : 3.35;
  }
  if (apexRain) { scene.remove(apexRain); apexRain.geometry.dispose(); apexRain.material.dispose(); apexRain = null; }
  if (mode === "rain") {
    const count = 900; const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { positions[i*3] = (Math.random()-.5)*180; positions[i*3+1] = Math.random()*75; positions[i*3+2] = (Math.random()-.5)*180; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(positions,3));
    apexRain = new THREE.Points(geo, new THREE.PointsMaterial({color:0xcfe7f4,size:0.16,transparent:true,opacity:0.7})); scene.add(apexRain);
  }
  showToast(`CONDITIONS: ${mode.toUpperCase()}`);
}

function apexShowCareer() {
  const old = document.getElementById("apex-modal"); if (old) old.remove();
  const career = window.apexCareer;
  const complete = career.round >= APEX_CAREER_SCHEDULE.length;
  const nextIndex = Math.min(career.round || 0, APEX_CAREER_SCHEDULE.length - 1);
  const next = APEX_CAREER_SCHEDULE[nextIndex];
  const calendar = APEX_CAREER_SCHEDULE.map((event, i) => {
    const result = (career.results || []).find(r => r.round === i + 1);
    const status = result ? `P${result.position} · ${result.points} PTS` : i < career.round ? "COMPLETED" : i === nextIndex && career.active ? "NEXT EVENT" : "UPCOMING";
    return `<div class="career-event ${result ? "done" : i === nextIndex && career.active ? "next" : ""}"><span class="career-round">${String(i + 1).padStart(2, "0")}</span><span><strong>${event.name}</strong><small>${MAPS[event.track].name} · TARGET P${event.goalPosition} · ${event.bonus} CR</small></span><em>${status}${result?.objectiveComplete ? " · GOAL" : ""}</em></div>`;
  }).join("");
  const contractProgress = career.contractProgress || {};
  const completedContracts = new Set(Array.isArray(career.completedContracts) ? career.completedContracts : []);
  const sponsorCards = APEX_CAREER_CONTRACTS.map((contract, index) => {
    const progress = Math.min(contract.target, Number(contractProgress[contract.progress]) || 0);
    const complete = completedContracts.has(contract.id);
    const percent = progress / contract.target * 100;
    const measure = contract.progress === "points" ? `${progress} / ${contract.target} PTS` : `${progress} / ${contract.target}`;
    return `<div class="career-event ${complete ? "done" : ""}"><span class="career-round">S${index + 1}</span><span><strong>${contract.name}</strong><small>${measure} · REWARD ${contract.reward.toLocaleString()} CR</small><span style="display:block;height:3px;margin-top:6px;background:#ffffff18"><span style="display:block;width:${percent}%;height:100%;background:${complete ? "#9fdb8e" : "#d8ff3e"}"></span></span></span><em>${complete ? "PAID" : "SPONSOR"}</em></div>`;
  }).join("");
  const actionLabel = complete ? "START NEW SEASON" : career.active ? `RACE ROUND ${career.round + 1}` : "START CAREER SEASON";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const modal = document.createElement("div"); modal.id = "apex-modal"; modal.className = "apex-modal";
  modal.innerHTML = `<div class="apex-modal-card career-card"><div class="eyebrow">APEX RACING SERIES · DRIVER DEVELOPMENT</div><h2>${complete ? "SEASON <em>COMPLETE.</em>" : "CAREER <em>PADDOCK.</em>"}</h2><p>Build your driver identity, sign with a team, then compete through an eight-event championship with rising AI pace, longer races, driver XP, and sponsor bonuses. Your profile and results save on this device.</p><div class="driver-card"><span class="driver-number">#<span id="career-card-number">${esc(career.carNumber)}</span></span><div><strong id="career-card-name">${esc(career.driverName)}</strong><small><span id="career-card-team">${esc(career.teamName)}</span> · <span id="career-card-nationality">${esc(career.nationality)}</span></small></div></div><div class="career-profile"><label>DRIVER NAME<input id="career-driver-name" maxlength="28" value="${esc(career.driverName)}" placeholder="Your racing name"></label><label>CAR NUMBER<input id="career-car-number" inputmode="numeric" maxlength="3" value="${esc(career.carNumber)}" placeholder="27"></label><label>TEAM NAME<input id="career-team-name" maxlength="32" value="${esc(career.teamName)}" placeholder="Your racing team"></label><label>NATIONALITY / REGION<input id="career-nationality" maxlength="28" value="${esc(career.nationality)}" placeholder="Your country"></label><label class="wide">DRIVER BIO<textarea id="career-bio" maxlength="140" placeholder="A short intro for your driver profile">${esc(career.bio)}</textarea></label><div class="wide"><button id="career-save-profile" type="button">SAVE DRIVER PROFILE</button></div></div><div class="home-stats"><div><small>DRIVER LEVEL</small><strong>${career.level || (1 + Math.floor((career.xp || 0)/500))}</strong></div><div><small>DRIVER XP</small><strong>${career.xp || 0}</strong></div><div><small>CAREER RACES</small><strong>${career.races}</strong></div><div><small>CAREER WINS</small><strong>${career.wins}</strong></div><div><small>SEASON POINTS</small><strong>${career.seasonPoints || 0}</strong></div><div><small>ROUND</small><strong>${complete ? `${APEX_CAREER_SCHEDULE.length} / ${APEX_CAREER_SCHEDULE.length}` : `${career.active ? career.round + 1 : 1} / ${APEX_CAREER_SCHEDULE.length}`}</strong></div></div><div class="career-calendar"><div class="career-calendar-head"><strong>CHAMPIONSHIP CALENDAR</strong><span>${career.active ? "SEASON IN PROGRESS" : complete ? "FINISHED SEASON" : "READY TO BEGIN"}</span></div>${calendar}</div><p class="career-rule"><strong>Championship:</strong> P1 25 · P2 18 · P3 15 · P4 12 · P5 10 · P6 8 · P7 6 · P8 4 · P9 2 · P10 1. Every 2 rounds pays a 450 CR sponsor bonus. Earn 500 XP per driver level; later rounds add laps and tougher AI.</p><button id="apex-career-start">${actionLabel}</button><button id="apex-close-career" class="apex-secondary">BACK TO GARAGE</button><button class="apex-secondary" id="apex-reset-career">RESET CAREER</button></div>`;
  document.body.appendChild(modal);
  const championshipStat = document.createElement("div");
  championshipStat.innerHTML = `<small>CHAMPIONSHIPS</small><strong>${career.championships || 0}</strong>`;
  modal.querySelector(".home-stats")?.append(championshipStat);
  const sponsorBoard = document.createElement("div");
  sponsorBoard.className = "career-calendar";
  sponsorBoard.innerHTML = `<div class="career-calendar-head"><strong>SPONSOR CONTRACTS</strong><span>CAREER MILESTONES</span></div>${sponsorCards}`;
  modal.querySelector(".career-calendar")?.after(sponsorBoard);
  const storyLink = document.createElement("button");
  storyLink.className = "apex-secondary";
  storyLink.textContent = "OPEN STORY CAMPAIGN";
  sponsorBoard.after(storyLink);
  storyLink.addEventListener("click", apexShowStory);
  const storyButton = document.createElement("button");
  storyButton.id = "career-story-launch";
  storyButton.className = "apex-secondary";
  storyButton.textContent = "OPEN STORY CAMPAIGN";
  sponsorBoard.after(storyButton);
  storyButton.addEventListener("click", apexShowStory);
  const saveProfile = () => {
    career.driverName = document.getElementById("career-driver-name").value.trim().slice(0, 28) || "Rookie Driver";
    career.carNumber = document.getElementById("career-car-number").value.replace(/[^0-9]/g, "").slice(0, 3) || "27";
    career.teamName = document.getElementById("career-team-name").value.trim().slice(0, 32) || "Independent Driver";
    career.nationality = document.getElementById("career-nationality").value.trim().slice(0, 28) || "Independent";
    career.bio = document.getElementById("career-bio").value.trim().slice(0, 140) || "Ready to earn my place on the grid.";
    document.getElementById("career-driver-name").value = career.driverName;
    document.getElementById("career-car-number").value = career.carNumber;
    document.getElementById("career-team-name").value = career.teamName;
    document.getElementById("career-nationality").value = career.nationality;
    document.getElementById("career-bio").value = career.bio;
    document.getElementById("career-card-number").textContent = career.carNumber;
    document.getElementById("career-card-name").textContent = career.driverName;
    document.getElementById("career-card-team").textContent = career.teamName;
    document.getElementById("career-card-nationality").textContent = career.nationality;
    try { localStorage.setItem("apexCareer", JSON.stringify(career)); } catch (_) {}
    showToast("DRIVER PROFILE SAVED");
  };
  document.getElementById("career-save-profile").onclick = saveProfile;
  document.getElementById("apex-close-career").onclick = () => { saveProfile(); modal.remove(); };
  document.getElementById("apex-career-start").onclick = () => {
    saveProfile();
    if (complete || !career.active) {
      career.active = true; career.round = 0; career.seasonPoints = 0; career.seasonWins = 0; career.results = [];
    }
    const event = APEX_CAREER_SCHEDULE[Math.min(career.round, APEX_CAREER_SCHEDULE.length - 1)];
    selectedTrackId = event.track; mapId = event.track; buildMap(); createOpponents();
    raceLaps = Math.min(7, 3 + Math.floor(career.round / 2));
    // Career opponents escalate automatically by championship stage.
    const careerDifficulty = career.round < 2 ? "easy" : career.round < 4 ? "medium" : career.round < 6 ? "hard" : "expert";
    setAIDifficulty(careerDifficulty);
    const lapSelect = document.getElementById("apex-laps"); if (lapSelect) lapSelect.value = String(raceLaps);
    const sessionSelect = document.getElementById("apex-session"); if (sessionSelect) sessionSelect.value = "race";
    window.apexSessionMode = "race";
    try { localStorage.setItem("apexCareer", JSON.stringify(career)); } catch (_) {}
    modal.remove(); startRace(false); showToast(`CAREER ROUND ${career.round + 1}/${APEX_CAREER_SCHEDULE.length} · ${event.name.toUpperCase()} · ${raceLaps} LAPS`);
  };
  document.getElementById("apex-reset-career").onclick = () => {
    window.apexCareer = { driverName: "Rookie Driver", nationality: "United States", teamName: "Apex Motorsport", carNumber: "27", bio: "Ready to earn my place on the grid.", races: 0, wins: 0, points: 0, xp: 0, level: 1, lastPosition: null, active: false, round: 0, seasonPoints: 0, seasonWins: 0, championships: 0, contractProgress: { podiums: 0, points: 0, wins: 0 }, completedContracts: [], results: [] };
    try { localStorage.setItem("apexCareer", JSON.stringify(window.apexCareer)); } catch (_) {}
    modal.remove(); showToast("CAREER PROGRESS RESET"); apexShowCareer();
  };
}

function apexShowStory() {
  const old = document.getElementById("apex-modal");
  if (old) old.remove();
  const story = window.apexStory;
  const complete = story.chapter >= APEX_STORY_CAMPAIGN.length;
  const chapterIndex = complete ? APEX_STORY_CAMPAIGN.length - 1 : story.chapter;
  const chapter = APEX_STORY_CAMPAIGN[chapterIndex];
  const results = Array.isArray(story.results) ? story.results : [];
  const chapters = APEX_STORY_CAMPAIGN.map((item, index) => {
    const result = [...results].reverse().find(entry => entry.chapter === index + 1);
    const status = index < story.chapter ? "CLEARED" : index === story.chapter ? "CURRENT" : "LOCKED";
    return `<div class="career-event ${index < story.chapter ? "done" : index === story.chapter ? "next" : ""}"><span class="career-round">${String(index + 1).padStart(2, "0")}</span><span><strong>${item.title}</strong><small>${MAPS[item.track].name} · ${item.rival} · TARGET P${item.goalPosition}${result ? ` · BEST P${result.position}` : ""}</small></span><em>${status}</em></div>`;
  }).join("");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const modal = document.createElement("div");
  modal.id = "apex-modal";
  modal.className = "apex-modal";
  modal.innerHTML = `<div class="apex-modal-card career-card"><div class="eyebrow">APEX ORIGINAL STORY CAMPAIGN</div><h2>${complete ? "THE GRID IS <em>YOURS.</em>" : "APEX: <em>BACK ROW.</em>"}</h2><p>A six-chapter racing drama about saving a family workshop, earning a seat, and turning a paddock rivalry into a championship fight. Beat each rival's finishing target to unlock the next chapter.</p><div class="driver-card"><span class="driver-number">#${esc(window.apexCareer.carNumber)}</span><div><strong>${esc(window.apexCareer.driverName)}</strong><small>${esc(window.apexCareer.teamName)} · CHAPTER ${complete ? APEX_STORY_CAMPAIGN.length : chapterIndex + 1} / ${APEX_STORY_CAMPAIGN.length}</small></div></div><div class="career-calendar"><div class="career-calendar-head"><strong>CHAPTER FILE</strong><span>${complete ? "CAMPAIGN COMPLETE" : `RIVAL: ${chapter.rival.toUpperCase()}`}</span></div>${chapters}</div><div class="driver-card"><span class="driver-number">${complete ? "END" : String(chapterIndex + 1).padStart(2, "0")}</span><div><strong>${complete ? "A place at the top" : chapter.title}</strong><small>${complete ? "Replay the campaign to race the story again." : esc(chapter.intro)}</small></div></div><p class="career-rule">CHAPTER TARGET: P${chapter.goalPosition} · ${chapter.laps} LAPS · REWARD ${chapter.reward.toLocaleString()} CR + 150 XP</p><button id="story-start-btn" type="button">${complete ? "REPLAY CAMPAIGN" : `RACE CHAPTER ${chapterIndex + 1}`}</button><button id="story-close-btn" class="apex-secondary" type="button">BACK</button></div>`;
  document.body.appendChild(modal);
  document.getElementById("story-close-btn").onclick = () => modal.remove();
  document.getElementById("story-start-btn").onclick = () => {
    if (complete) {
      story.chapter = 0;
      story.results = [];
    }
    const nextChapterIndex = story.chapter;
    const nextChapter = APEX_STORY_CAMPAIGN[nextChapterIndex];
    story.activeRun = true;
    story.activeChapter = nextChapterIndex;
    selectedTrackId = nextChapter.track;
    mapId = nextChapter.track;
    buildMap();
    createOpponents();
    raceLaps = nextChapter.laps;
    const difficulty = nextChapterIndex < 2 ? "medium" : nextChapterIndex < 4 ? "hard" : "expert";
    setAIDifficulty(difficulty);
    const lapSelect = document.getElementById("apex-laps");
    if (lapSelect) lapSelect.value = String(raceLaps);
    const sessionSelect = document.getElementById("apex-session");
    if (sessionSelect) sessionSelect.value = "race";
    window.apexSessionMode = "story";
    try { localStorage.setItem("apexStory", JSON.stringify(story)); } catch (_) {}
    modal.remove();
    startRace(false);
    showToast(`STORY CHAPTER ${nextChapterIndex + 1} · ${nextChapter.title.toUpperCase()}`);
  };
}

function apexToggleTelemetry() {
  apexTelemetryOn = !apexTelemetryOn;
  document.getElementById("apex-telemetry").style.display = apexTelemetryOn ? "block" : "none";
  document.getElementById("apex-telemetry-btn").classList.toggle("active", apexTelemetryOn);
}
function apexPitStop() {
  if (currentScreen !== "race" || (!raceStarted && !countdownActive) || apexPitUsed) { showToast(apexPitUsed ? "PIT STOP ALREADY USED" : "PIT STOP AVAILABLE DURING A RACE"); return; }
  if (Math.abs(speed) > 12) { showToast("SLOW DOWN TO ENTER THE PIT LANE"); return; }
  apexPitUsed = true; apexPitTimer = 2.5; speed = 0; lateralVelocity = 0; apexDamage = 0; apexTireWear = 0;
  raceTime += 3.5;
  showToast("PIT CREW: TYRES CHANGED · REPAIRS COMPLETE");
}
function apexTogglePhoto() {
  apexPhotoMode = !apexPhotoMode;
  document.body.classList.toggle("apex-photo", apexPhotoMode);
  document.getElementById("apex-photo-btn").classList.toggle("active", apexPhotoMode);
  if (apexPhotoMode) { cameraMode = 0; showToast("PHOTO MODE · PRESS O TO EXIT"); }
  else { showScreen(currentScreen); showToast("PHOTO MODE CLOSED"); }
}
function apexStartReplay() {
  if (apexRaceRecord.length < 20) { showToast("COMPLETE A RACE FIRST TO SAVE A REPLAY"); return; }
  if (apexReplayCar) scene.remove(apexReplayCar);
  apexReplayFrames = apexRaceRecord.slice(); apexReplayIndex = 0; apexReplayActive = true;
  apexReplayCar = createCar({...selectedCar, color:0xffffff}, false);
  apexReplayCar.traverse(obj => { if (obj.isMesh && obj.material && obj.material.color) { obj.material = obj.material.clone(); obj.material.transparent = true; obj.material.opacity = 0.62; } });
  scene.add(apexReplayCar); showScreen("race"); showToast("REPLAY PLAYING · PRESS V TO STOP");
}
function apexUpdateSystems(dt) {
  if (apexRain) {
    const pos = apexRain.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.array[i*3+1] -= 38 * dt;
      if (pos.array[i*3+1] < 0) { pos.array[i*3+1] = 65; pos.array[i*3] = player.position.x + (Math.random()-.5)*100; pos.array[i*3+2] = player.position.z + (Math.random()-.5)*100; }
    }
    pos.needsUpdate = true; apexRain.position.set(player.position.x,0,player.position.z);
  }
  if (raceStarted && !paused && !finished && currentScreen === "race") {
    apexRaceRecord.push({p:player.position.toArray(), r:[player.rotation.x,player.rotation.y,player.rotation.z], t:raceTime, s:speed});
    apexTireWear = Math.min(100, apexTireWear + dt * (window.apexTireCompound === "soft" ? 0.19 : window.apexTireCompound === "hard" ? 0.07 : window.apexTireCompound === "wet" ? 0.11 : 0.12) * (Math.abs(speed) / 25));
    if (apexRaceRecord.length > 12000) apexRaceRecord.shift();
  }
  if (apexReplayActive && apexReplayCar) {
    apexReplayIndex += Math.max(1, Math.round(dt*60));
    if (apexReplayIndex >= apexReplayFrames.length) { apexReplayActive = false; scene.remove(apexReplayCar); showToast("REPLAY COMPLETE"); }
    else { const frame = apexReplayFrames[apexReplayIndex]; apexReplayCar.position.fromArray(frame.p); apexReplayCar.rotation.set(...frame.r); }
  }
  if (apexPhotoMode) {
    apexPhotoAngle += dt * 0.12;
    const target = player.position.clone();
    camera.position.lerp(target.clone().add(new THREE.Vector3(Math.sin(apexPhotoAngle)*22, 8, Math.cos(apexPhotoAngle)*22)), 1-Math.exp(-2*dt));
    camera.lookAt(target.x,target.y+0.8,target.z);
  }
  if (apexTelemetryOn) {
    const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
    set("apex-t-speed", `${Math.round(Math.abs(speed)*3.6)} km/h`);
    set("apex-t-throttle", `${gasPressed()?100:brakePressed()?0:Math.round(20)}%`);
    set("apex-t-steer", `${Math.round(steering*100)}%`);
    set("apex-t-driver", window.apexCareer?.driverName || "Rookie Driver");
    set("apex-t-weather", window.apexWeatherMode.toUpperCase());
    set("apex-t-tires", `${window.apexTireCompound.toUpperCase()} · ${Math.round(apexTireWear)}% WORN`);
    set("apex-t-damage", `${Math.round(apexDamage)}%`);
    set("apex-t-best", bestTime ? formatTime(bestTime) : "--");
  }
  if (apexPitTimer > 0) apexPitTimer -= dt;
}

// Keyboard shortcuts for the expanded driving tools.
window.addEventListener("keydown", event => {
  if (event.repeat) return;
  if (event.code === "KeyT") apexToggleTelemetry();
  if (event.code === "KeyP") apexPitStop();
  if (event.code === "KeyV") { if (apexReplayActive) { apexReplayActive=false; if(apexReplayCar) scene.remove(apexReplayCar); showToast("REPLAY STOPPED"); } else apexStartReplay(); }
  if (event.code === "KeyO") apexTogglePhoto();
});
apexCreateTools();

// Start exactly one render loop. animate() schedules its own next frame.
requestAnimationFrame(animate);