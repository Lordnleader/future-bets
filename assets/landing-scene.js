import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

const STARFIELD_COUNT = 2200;
const DUST_COUNT = 720;
const CORE_COUNT = 22000;
const FILAMENT_COUNT = 9200;
const AURA_COUNT = 4200;
const GLOW_COUNT = 3200;
const CURRENT_COUNT = 4600;
const BOKEH_BACK_COUNT = 1600;
const BOKEH_FRONT_COUNT = 1300;
const TWO_PI = Math.PI * 2;
const WAVE_SPECS = [
  { offset: 0.08 * TWO_PI, speed: 0.05, width: 0.34, amplitude: 0.52, stretch: 0.08, drift: 0.06 },
  { offset: 0.29 * TWO_PI, speed: 0.034, width: 0.56, amplitude: 0.42, stretch: 0.05, drift: 0.04 },
  { offset: 0.54 * TWO_PI, speed: 0.061, width: 0.28, amplitude: 0.58, stretch: 0.1, drift: 0.07 },
  { offset: 0.77 * TWO_PI, speed: 0.041, width: 0.48, amplitude: 0.38, stretch: 0.06, drift: 0.05 },
];

const RIBBON_SPECS = [
  {
    startAngle: 0,
    endAngle: TWO_PI,
    radius: 3.1,
    weight: 3.2,
    macroSpeed: 0.022,
    flowRange: [0.006, 0.016],
    radiusWave: 0.08,
    breatheSpeed: 0.08,
    width: 0.9,
    foldAmp: 0.16,
    foldFreq: 1.6,
    foldSpeed: 0.16,
    sheetAmp: 0.22,
    sheetFreq: 2.1,
    sheetSpeed: 0.12,
    tangentAmp: 0.08,
    tangentFreq: 2.4,
    tangentSpeed: 0.14,
    depth: 0.26,
    depthAmp: 0.22,
    depthFreq: 1.6,
    depthSpeed: 0.12,
  },
  {
    startAngle: 0,
    endAngle: TWO_PI,
    radius: 3.2,
    weight: 4.2,
    macroSpeed: 0.024,
    flowRange: [0.008, 0.018],
    radiusWave: 0.1,
    breatheSpeed: 0.09,
    width: 1.12,
    foldAmp: 0.22,
    foldFreq: 1.9,
    foldSpeed: 0.18,
    sheetAmp: 0.3,
    sheetFreq: 2.5,
    sheetSpeed: 0.14,
    tangentAmp: 0.14,
    tangentFreq: 2.8,
    tangentSpeed: 0.18,
    depth: 0.34,
    depthAmp: 0.3,
    depthFreq: 1.8,
    depthSpeed: 0.14,
  },
  {
    startAngle: 0,
    endAngle: TWO_PI,
    radius: 3.02,
    weight: 2.9,
    macroSpeed: 0.02,
    flowRange: [0.006, 0.015],
    radiusWave: 0.08,
    breatheSpeed: 0.08,
    width: 0.82,
    foldAmp: 0.18,
    foldFreq: 1.7,
    foldSpeed: 0.16,
    sheetAmp: 0.22,
    sheetFreq: 2.2,
    sheetSpeed: 0.12,
    tangentAmp: 0.12,
    tangentFreq: 2.6,
    tangentSpeed: 0.16,
    depth: 0.3,
    depthAmp: 0.26,
    depthFreq: 1.7,
    depthSpeed: 0.12,
  },
  {
    startAngle: 0,
    endAngle: TWO_PI,
    radius: 3.26,
    weight: 2.4,
    macroSpeed: 0.018,
    flowRange: [0.005, 0.013],
    radiusWave: 0.07,
    breatheSpeed: 0.07,
    width: 0.68,
    foldAmp: 0.14,
    foldFreq: 1.5,
    foldSpeed: 0.12,
    sheetAmp: 0.18,
    sheetFreq: 1.9,
    sheetSpeed: 0.1,
    tangentAmp: 0.1,
    tangentFreq: 2.2,
    tangentSpeed: 0.13,
    depth: 0.24,
    depthAmp: 0.2,
    depthFreq: 1.5,
    depthSpeed: 0.1,
  },
  {
    startAngle: 0,
    endAngle: TWO_PI,
    radius: 3.14,
    weight: 1.5,
    macroSpeed: 0.021,
    flowRange: [0.006, 0.014],
    radiusWave: 0.09,
    breatheSpeed: 0.08,
    width: 0.56,
    foldAmp: 0.12,
    foldFreq: 1.8,
    foldSpeed: 0.14,
    sheetAmp: 0.16,
    sheetFreq: 2.1,
    sheetSpeed: 0.11,
    tangentAmp: 0.08,
    tangentFreq: 2.4,
    tangentSpeed: 0.14,
    depth: 0.22,
    depthAmp: 0.18,
    depthFreq: 1.6,
    depthSpeed: 0.11,
  },
];

const RIBBON_WEIGHTS = buildWeightTable();

export function createLandingScene(container, { triggerElement } = {}) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(container.clientWidth, container.clientHeight, false);
  renderer.setClearColor(0x000000, 0);
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030303, 0.032);

  const camera = new THREE.PerspectiveCamera(
    30,
    container.clientWidth / Math.max(container.clientHeight, 1),
    0.1,
    120,
  );
  camera.position.set(0, 0, 11.2);

  const root = new THREE.Group();
  scene.add(root);

  const wreathGroup = new THREE.Group();
  wreathGroup.scale.set(1, 1, 1);
  root.add(wreathGroup);

  const sprite = createCircularSprite();
  const starfield = createStarfield(sprite);
  const dust = createDustField(sprite);
  const auraLayer = createRibbonLayer(sprite, AURA_COUNT, {
    pointSize: 0.094,
    opacity: 0.12,
    brightnessRange: [0.84, 0.98],
    widthScale: 1.24,
    depthScale: 1.45,
    tangentScale: 1.05,
    speedScale: 0.92,
    depthOffset: 0,
  });
  const glowLayer = createRibbonLayer(sprite, GLOW_COUNT, {
    pointSize: 0.18,
    opacity: 0.16,
    brightnessRange: [0.9, 1],
    widthScale: 1.08,
    depthScale: 1.1,
    tangentScale: 0.82,
    speedScale: 0.88,
    depthOffset: 0,
  });
  const currentLayer = createRibbonLayer(sprite, CURRENT_COUNT, {
    pointSize: 0.09,
    opacity: 0.72,
    brightnessRange: [0.95, 1],
    widthScale: 0.54,
    depthScale: 0.72,
    tangentScale: 1.8,
    speedScale: 0.94,
    depthOffset: 0,
    waveResponse: 2.2,
    brightnessResponse: 1.45,
    waveDriftScale: 2.4,
    streakResponse: 2,
  });
  const coreLayer = createRibbonLayer(sprite, CORE_COUNT, {
    pointSize: 0.028,
    opacity: 0.9,
    brightnessRange: [0.8, 1],
    widthScale: 1.02,
    depthScale: 0.92,
    tangentScale: 1,
    speedScale: 1,
    depthOffset: 0,
  });
  const filamentLayer = createRibbonLayer(sprite, FILAMENT_COUNT, {
    pointSize: 0.052,
    opacity: 0.98,
    brightnessRange: [0.92, 1],
    widthScale: 0.9,
    depthScale: 0.8,
    tangentScale: 1.18,
    speedScale: 1.08,
    depthOffset: 0,
  });
  const backBokeh = createRibbonLayer(sprite, BOKEH_BACK_COUNT, {
    pointSize: 0.34,
    opacity: 0.22,
    brightnessRange: [0.84, 0.96],
    widthScale: 1.34,
    depthScale: 2.2,
    tangentScale: 0.9,
    speedScale: 0.82,
    depthOffset: -3.8,
  });
  const frontBokeh = createRibbonLayer(sprite, BOKEH_FRONT_COUNT, {
    pointSize: 0.42,
    opacity: 0.25,
    brightnessRange: [0.88, 1],
    widthScale: 1.18,
    depthScale: 2.05,
    tangentScale: 0.92,
    speedScale: 0.9,
    depthOffset: 3.55,
  });

  scene.add(starfield);
  scene.add(dust);
  wreathGroup.add(auraLayer.points);
  wreathGroup.add(glowLayer.points);
  wreathGroup.add(backBokeh.points);
  wreathGroup.add(coreLayer.points);
  wreathGroup.add(currentLayer.points);
  wreathGroup.add(filamentLayer.points);
  wreathGroup.add(frontBokeh.points);

  scene.add(new THREE.AmbientLight(0xf2f0eb, 0.42));
  const frontLight = new THREE.PointLight(0xffffff, 0.78, 30);
  frontLight.position.set(0, 0.15, 8.4);
  scene.add(frontLight);

  const pointer = { x: 0, y: 0, rawX: 0, rawY: 0 };
  const clock = new THREE.Clock();
  let rafId = 0;

  container.addEventListener("pointermove", handlePointerMove);
  container.addEventListener("pointerleave", resetPointer);
  window.addEventListener("resize", handleResize);

  handleResize();
  animate();

  return {
    destroy,
  };

  function animate() {
    rafId = window.requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();
    const focus = computeFocusIntensity();

    root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, pointer.y * 0.024, 0.03);
    root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, pointer.x * 0.035, 0.03);
    root.position.x = THREE.MathUtils.lerp(root.position.x, pointer.x * 0.14, 0.03);
    root.position.y = THREE.MathUtils.lerp(root.position.y, pointer.y * 0.06, 0.03);

    updateRibbonLayer(auraLayer, elapsed, focus);
    updateRibbonLayer(glowLayer, elapsed, focus);
    updateRibbonLayer(backBokeh, elapsed, focus);
    updateRibbonLayer(coreLayer, elapsed, focus);
    updateRibbonLayer(currentLayer, elapsed, focus);
    updateRibbonLayer(filamentLayer, elapsed, focus);
    updateRibbonLayer(frontBokeh, elapsed, focus);
    updateDustField(dust, elapsed);

    auraLayer.material.opacity = 0.12 + focus * 0.03;
    glowLayer.material.opacity = 0.12 + focus * 0.03;
    coreLayer.material.opacity = 0.9 + focus * 0.05;
    currentLayer.material.opacity = 0.72 + focus * 0.08;
    filamentLayer.material.opacity = 0.98 + focus * 0.02;
    backBokeh.material.opacity = 0.22 + focus * 0.03;
    frontBokeh.material.opacity = 0.25 + focus * 0.04;

    starfield.rotation.y += 0.000015;
    starfield.rotation.x = Math.sin(elapsed * 0.05) * 0.01;

    renderer.render(scene, camera);
  }

  function handlePointerMove(event) {
    const rect = container.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * -2;
    pointer.rawX = event.clientX;
    pointer.rawY = event.clientY;
  }

  function resetPointer() {
    pointer.x = 0;
    pointer.y = 0;
    pointer.rawX = 0;
    pointer.rawY = 0;
  }

  function handleResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (!width || !height) {
      return;
    }

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function computeFocusIntensity() {
    if (!triggerElement || !pointer.rawX || !pointer.rawY) {
      return 0;
    }

    const rect = triggerElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(pointer.rawX - centerX, pointer.rawY - centerY);
    const maxDistance = Math.max(rect.width, rect.height) * 3.6;
    return THREE.MathUtils.clamp(1 - distance / maxDistance, 0, 1);
  }

  function destroy() {
    window.cancelAnimationFrame(rafId);
    container.removeEventListener("pointermove", handlePointerMove);
    container.removeEventListener("pointerleave", resetPointer);
    window.removeEventListener("resize", handleResize);
    renderer.dispose();
    sprite.dispose();
    disposeObject(scene);
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  }
}

function buildWeightTable() {
  let total = 0;
  return RIBBON_SPECS.map((spec) => {
    total += spec.weight;
    return total;
  });
}

function pickRibbonIndex() {
  const target = Math.random() * RIBBON_WEIGHTS[RIBBON_WEIGHTS.length - 1];
  for (let i = 0; i < RIBBON_WEIGHTS.length; i += 1) {
    if (target <= RIBBON_WEIGHTS[i]) {
      return i;
    }
  }

  return RIBBON_WEIGHTS.length - 1;
}

function createCircularSprite() {
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.16, "rgba(255,255,255,0.99)");
  gradient.addColorStop(0.46, "rgba(255,255,255,0.44)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createStarfield(sprite) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(STARFIELD_COUNT * 3);
  const colors = new Float32Array(STARFIELD_COUNT * 3);

  for (let i = 0; i < STARFIELD_COUNT; i += 1) {
    const radius = THREE.MathUtils.randFloat(12, 36);
    const theta = Math.random() * TWO_PI;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi) * 0.82;
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const tint = THREE.MathUtils.randFloat(0.76, 1);
    colors[i * 3] = tint * 0.97;
    colors[i * 3 + 1] = tint;
    colors[i * 3 + 2] = tint * 0.98;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      map: sprite,
      size: 0.016,
      transparent: true,
      opacity: 0.22,
      alphaTest: 0.02,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
}

function createDustField(sprite) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(DUST_COUNT * 3);
  const colors = new Float32Array(DUST_COUNT * 3);
  const meta = new Float32Array(DUST_COUNT * 4);

  for (let i = 0; i < DUST_COUNT; i += 1) {
    positions[i * 3] = THREE.MathUtils.randFloatSpread(16);
    positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(11);
    positions[i * 3 + 2] = THREE.MathUtils.randFloat(-5, 4);

    meta[i * 4] = positions[i * 3];
    meta[i * 4 + 1] = positions[i * 3 + 1];
    meta[i * 4 + 2] = positions[i * 3 + 2];
    meta[i * 4 + 3] = Math.random() * TWO_PI;

    const tint = THREE.MathUtils.randFloat(0.7, 0.94);
    colors[i * 3] = tint;
    colors[i * 3 + 1] = tint;
    colors[i * 3 + 2] = tint;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      map: sprite,
      size: 0.024,
      transparent: true,
      opacity: 0.035,
      alphaTest: 0.02,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );

  points.userData.metaRef = meta;
  return points;
}

function updateDustField(points, elapsed) {
  const positions = points.geometry.attributes.position.array;
  const meta = points.userData.metaRef;

  for (let i = 0; i < DUST_COUNT; i += 1) {
    const phase = meta[i * 4 + 3];
    positions[i * 3] = meta[i * 4] + Math.sin(elapsed * 0.08 + phase) * 0.05;
    positions[i * 3 + 1] = meta[i * 4 + 1] + Math.cos(elapsed * 0.07 + phase * 0.6) * 0.04;
    positions[i * 3 + 2] = meta[i * 4 + 2] + Math.sin(elapsed * 0.09 + phase * 1.1) * 0.06;
  }

  points.geometry.attributes.position.needsUpdate = true;
}

function createRibbonLayer(sprite, count, layerConfig) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const meta = new Float32Array(count * 12);

  for (let i = 0; i < count; i += 1) {
    const ribbonIndex = pickRibbonIndex();
    const spec = RIBBON_SPECS[ribbonIndex];
    const brightness = THREE.MathUtils.randFloat(layerConfig.brightnessRange[0], layerConfig.brightnessRange[1]);

    meta[i * 12] = ribbonIndex;
    meta[i * 12 + 1] = Math.random();
    meta[i * 12 + 2] = THREE.MathUtils.randFloat(spec.flowRange[0], spec.flowRange[1]) * layerConfig.speedScale;
    meta[i * 12 + 3] = THREE.MathUtils.randFloatSpread(spec.width * layerConfig.widthScale);
    meta[i * 12 + 4] = THREE.MathUtils.randFloatSpread(spec.depth * layerConfig.depthScale);
    meta[i * 12 + 5] = Math.random() * TWO_PI;
    meta[i * 12 + 6] = Math.random() * TWO_PI;
    meta[i * 12 + 7] = THREE.MathUtils.randFloat(0.45, 1);
    meta[i * 12 + 8] = Math.random() > 0.5 ? 1 : -1;
    meta[i * 12 + 9] = THREE.MathUtils.randFloat(0.55, 1.25);
    meta[i * 12 + 10] = layerConfig.depthOffset;
    meta[i * 12 + 11] = brightness;

    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = brightness * 0.988;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    map: sprite,
    size: layerConfig.pointSize,
    transparent: true,
    opacity: layerConfig.opacity,
    alphaTest: 0.02,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  return {
    points: new THREE.Points(geometry, material),
    geometry,
    positions,
    meta,
    material,
    layerConfig,
  };
}

function updateRibbonLayer(layer, elapsed, focus) {
  const { positions, meta, geometry, layerConfig } = layer;
  const colors = geometry.attributes.color.array;
  const energy = 1 + focus * 0.4;
  const waveResponse = layerConfig.waveResponse ?? 1;
  const brightnessResponse = layerConfig.brightnessResponse ?? 1;
  const waveDriftScale = layerConfig.waveDriftScale ?? 1;
  const streakResponse = layerConfig.streakResponse ?? 1;

  for (let i = 0; i < positions.length / 3; i += 1) {
    const metaIndex = i * 12;
    const spec = RIBBON_SPECS[Math.floor(meta[metaIndex])];
    const baseT = meta[metaIndex + 1];
    const speed = meta[metaIndex + 2];
    const widthSeed = meta[metaIndex + 3];
    const depthSeed = meta[metaIndex + 4];
    const phaseA = meta[metaIndex + 5];
    const phaseB = meta[metaIndex + 6];
    const density = meta[metaIndex + 7];
    const direction = meta[metaIndex + 8];
    const tension = meta[metaIndex + 9];
    const depthOffset = meta[metaIndex + 10];
    const baseBrightness = meta[metaIndex + 11];

    const flow = mod1(baseT + elapsed * speed);
    const macroSpin = -elapsed * spec.macroSpeed;
    const angleProgress =
      flow +
      Math.sin(elapsed * 0.08 + phaseA) * 0.006 +
      Math.sin(elapsed * 0.14 + phaseB + flow * 4.2) * 0.005 * density;
    let angle = THREE.MathUtils.lerp(spec.startAngle, spec.endAngle, angleProgress) + macroSpin;
    const lowerBias = 0.84 + ((1 - Math.sin(angle)) * 0.5) * 0.2;
    const waveField = sampleWaveField(angle, elapsed);
    angle += waveField.drift * 0.03 * direction * waveDriftScale;
    const compressionMix = THREE.MathUtils.clamp(((waveField.density - 0.72) / 0.78) * waveResponse, 0, 1);
    const clusterCompression = THREE.MathUtils.lerp(1.02, 0.54, compressionMix);
    const clusterLift = THREE.MathUtils.lerp(0.98, 1.22, compressionMix);
    const streakBias = 1 + waveField.stretch * 0.7 * streakResponse;
    const currentPulse = Math.max(0, waveField.density - 0.96) * waveResponse;
    const radius =
      spec.radius +
      Math.sin(angle * 1.4 + phaseA + elapsed * spec.breatheSpeed) * spec.radiusWave * density * lowerBias +
      Math.sin(angle * 2.8 + phaseB) * 0.05 * tension;

    const pathX = Math.cos(angle) * radius;
    const pathY = Math.sin(angle) * radius;
    const normalX = Math.cos(angle);
    const normalY = Math.sin(angle);
    const tangentX = -Math.sin(angle);
    const tangentY = Math.cos(angle);

    const fold =
      widthSeed +
      Math.sin(angle * spec.foldFreq + elapsed * spec.foldSpeed + phaseA) *
        spec.foldAmp *
        density *
        layerConfig.widthScale *
        clusterCompression *
        lowerBias;
    const sheet =
      Math.cos(angle * spec.sheetFreq - elapsed * spec.sheetSpeed + phaseB) *
      spec.sheetAmp *
      density *
      tension *
      layerConfig.widthScale *
      clusterCompression *
      lowerBias *
      streakBias;
    const tangentDrift =
      Math.sin(angle * spec.tangentFreq + elapsed * spec.tangentSpeed + phaseB) *
      spec.tangentAmp *
      density *
      layerConfig.tangentScale *
      clusterLift *
      streakBias +
      currentPulse * 0.09 * direction;
    const swirl =
      Math.sin(elapsed * 0.46 + phaseA + angle * 2.6) * 0.045 * density * energy * clusterLift +
      Math.cos(elapsed * 0.34 + phaseB + angle * 1.8) * 0.035 * tension * clusterLift +
      currentPulse * 0.045 * direction;
    const depth =
      depthOffset +
      depthSeed +
      Math.sin(angle * spec.depthFreq + elapsed * spec.depthSpeed + phaseA) *
        spec.depthAmp *
        density +
      sheet * 0.42 +
      swirl * 0.5 +
      (waveField.density - 0.82) * 0.18 * density +
      currentPulse * 0.06;

    positions[i * 3] = pathX + normalX * (fold + sheet * 0.56) + tangentX * tangentDrift + swirl;
    positions[i * 3 + 1] = pathY + normalY * (fold + sheet * 0.56) + tangentY * tangentDrift;
    positions[i * 3 + 2] = depth;

    const brightness = THREE.MathUtils.clamp(
      baseBrightness *
        (0.88 + (waveField.density - 0.72) * 0.48 * brightnessResponse + lowerBias * 0.08 + currentPulse * 0.22),
      0,
      1.25,
    );
    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = brightness * 0.988;
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
}

function mod1(value) {
  return ((value % 1) + 1) % 1;
}

function sampleWaveField(angle, elapsed) {
  let density = 0.72;
  let stretch = 0;
  let drift = 0;

  for (const spec of WAVE_SPECS) {
    const center = wrapAngle(spec.offset - elapsed * spec.speed);
    const delta = shortestAngularDistance(angle, center);
    const gaussian = Math.exp(-(delta * delta) / (2 * spec.width * spec.width));
    density += gaussian * spec.amplitude;
    stretch += gaussian * spec.stretch * Math.sin(delta * 5 + elapsed * 0.12 + spec.offset * 3);
    drift += gaussian * spec.drift * (-delta / Math.max(spec.width, 0.001));
  }

  density += Math.sin(angle * 1.2 - elapsed * 0.09) * 0.06;
  density += Math.sin(angle * 2.1 + elapsed * 0.05) * 0.04;

  return {
    density: THREE.MathUtils.clamp(density, 0.68, 1.5),
    stretch,
    drift,
  };
}

function wrapAngle(angle) {
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}

function shortestAngularDistance(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }

    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}
