import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

const STARFIELD_COUNT = 1600;
const DUST_COUNT = 420;
const AURA_COUNT = 5600;
const CORE_COUNT = 26000;
const CURRENT_COUNT = 7200;
const GLOW_COUNT = 3600;
const BOKEH_BACK_COUNT = 1800;
const BOKEH_FRONT_COUNT = 1500;

const TWO_PI = Math.PI * 2;
const BAND_RADIUS = 3.16;
const BAND_WIDTH = 1.04;
const BAND_DEPTH = 0.34;
const MACRO_SPEED = 0.017;

const WAVE_SPECS = [
  {
    offset: 0.08 * TWO_PI,
    speed: 0.02,
    width: 0.68,
    amplitude: 0.34,
    lineFreq: 5.6,
    lineSpeed: 0.22,
    secondaryFreq: 3.4,
    secondarySpeed: 0.14,
    tangentAmp: 0.055,
    radialAmp: 0.052,
    depthAmp: 0.078,
    drift: 0.055,
  },
  {
    offset: 0.29 * TWO_PI,
    speed: 0.014,
    width: 0.82,
    amplitude: 0.26,
    lineFreq: 4.1,
    lineSpeed: 0.16,
    secondaryFreq: 2.8,
    secondarySpeed: 0.11,
    tangentAmp: 0.038,
    radialAmp: 0.035,
    depthAmp: 0.052,
    drift: 0.036,
  },
  {
    offset: 0.54 * TWO_PI,
    speed: 0.024,
    width: 0.58,
    amplitude: 0.42,
    lineFreq: 6.9,
    lineSpeed: 0.24,
    secondaryFreq: 4.2,
    secondarySpeed: 0.17,
    tangentAmp: 0.072,
    radialAmp: 0.058,
    depthAmp: 0.088,
    drift: 0.068,
  },
  {
    offset: 0.77 * TWO_PI,
    speed: 0.016,
    width: 0.74,
    amplitude: 0.28,
    lineFreq: 4.9,
    lineSpeed: 0.18,
    secondaryFreq: 3.1,
    secondarySpeed: 0.13,
    tangentAmp: 0.042,
    radialAmp: 0.036,
    depthAmp: 0.054,
    drift: 0.042,
  },
];

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
  scene.fog = new THREE.FogExp2(0x030303, 0.028);

  const camera = new THREE.PerspectiveCamera(
    30,
    container.clientWidth / Math.max(container.clientHeight, 1),
    0.1,
    120,
  );
  camera.position.set(0, 0, 11.2);

  const root = new THREE.Group();
  scene.add(root);

  const ringGroup = new THREE.Group();
  ringGroup.scale.set(1, 1, 1);
  root.add(ringGroup);

  const sprite = createCircularSprite();
  const starfield = createStarfield(sprite);
  const dust = createDustField(sprite);

  const auraLayer = createBandLayer(sprite, AURA_COUNT, {
    pointSize: 0.108,
    opacity: 0.13,
    brightnessRange: [0.8, 0.94],
    widthScale: 1.12,
    depthScale: 1.12,
    currentInfluence: 0.9,
    brightnessResponse: 0.82,
    depthOffset: 0,
  });
  const coreLayer = createBandLayer(sprite, CORE_COUNT, {
    pointSize: 0.034,
    opacity: 0.9,
    brightnessRange: [0.84, 1],
    widthScale: 1,
    depthScale: 1,
    currentInfluence: 1,
    brightnessResponse: 1,
    depthOffset: 0,
  });
  const currentLayer = createBandLayer(sprite, CURRENT_COUNT, {
    pointSize: 0.084,
    opacity: 0.96,
    brightnessRange: [0.95, 1],
    widthScale: 0.78,
    depthScale: 0.76,
    currentInfluence: 1.16,
    brightnessResponse: 1.82,
    depthOffset: 0,
  });
  const glowLayer = createBandLayer(sprite, GLOW_COUNT, {
    pointSize: 0.23,
    opacity: 0.18,
    brightnessRange: [0.9, 0.98],
    widthScale: 0.94,
    depthScale: 0.9,
    currentInfluence: 1.08,
    brightnessResponse: 1.46,
    depthOffset: 0,
  });
  const backBokeh = createBandLayer(sprite, BOKEH_BACK_COUNT, {
    pointSize: 0.34,
    opacity: 0.2,
    brightnessRange: [0.84, 0.94],
    widthScale: 1.08,
    depthScale: 2.3,
    currentInfluence: 0.94,
    brightnessResponse: 0.7,
    depthOffset: -3.9,
  });
  const frontBokeh = createBandLayer(sprite, BOKEH_FRONT_COUNT, {
    pointSize: 0.42,
    opacity: 0.24,
    brightnessRange: [0.88, 1],
    widthScale: 1.02,
    depthScale: 2.15,
    currentInfluence: 0.98,
    brightnessResponse: 0.8,
    depthOffset: 3.65,
  });

  scene.add(starfield);
  scene.add(dust);
  ringGroup.add(auraLayer.points);
  ringGroup.add(backBokeh.points);
  ringGroup.add(coreLayer.points);
  ringGroup.add(currentLayer.points);
  ringGroup.add(glowLayer.points);
  ringGroup.add(frontBokeh.points);

  scene.add(new THREE.AmbientLight(0xf2f0eb, 0.4));
  const frontLight = new THREE.PointLight(0xffffff, 0.76, 30);
  frontLight.position.set(0, 0.15, 8.2);
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

    root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, pointer.y * 0.02, 0.03);
    root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, pointer.x * 0.03, 0.03);
    root.position.x = THREE.MathUtils.lerp(root.position.x, pointer.x * 0.12, 0.03);
    root.position.y = THREE.MathUtils.lerp(root.position.y, pointer.y * 0.05, 0.03);

    updateBandLayer(auraLayer, elapsed, focus);
    updateBandLayer(backBokeh, elapsed, focus);
    updateBandLayer(coreLayer, elapsed, focus);
    updateBandLayer(currentLayer, elapsed, focus);
    updateBandLayer(glowLayer, elapsed, focus);
    updateBandLayer(frontBokeh, elapsed, focus);
    updateDustField(dust, elapsed);

    auraLayer.material.opacity = 0.13 + focus * 0.02;
    coreLayer.material.opacity = 0.9 + focus * 0.04;
    currentLayer.material.opacity = 0.96 + focus * 0.03;
    glowLayer.material.opacity = 0.18 + focus * 0.03;
    backBokeh.material.opacity = 0.2 + focus * 0.02;
    frontBokeh.material.opacity = 0.24 + focus * 0.03;

    starfield.rotation.y += 0.000012;
    starfield.rotation.x = Math.sin(elapsed * 0.05) * 0.008;

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
    const radius = THREE.MathUtils.randFloat(12, 34);
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
      opacity: 0.18,
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

    const tint = THREE.MathUtils.randFloat(0.7, 0.92);
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
      size: 0.022,
      transparent: true,
      opacity: 0.028,
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
    positions[i * 3] = meta[i * 4] + Math.sin(elapsed * 0.08 + phase) * 0.04;
    positions[i * 3 + 1] = meta[i * 4 + 1] + Math.cos(elapsed * 0.07 + phase * 0.6) * 0.035;
    positions[i * 3 + 2] = meta[i * 4 + 2] + Math.sin(elapsed * 0.09 + phase * 1.1) * 0.05;
  }

  points.geometry.attributes.position.needsUpdate = true;
}

function createBandLayer(sprite, count, config) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const meta = new Float32Array(count * 8);

  for (let i = 0; i < count; i += 1) {
    const brightness = THREE.MathUtils.randFloat(config.brightnessRange[0], config.brightnessRange[1]);

    meta[i * 8] = Math.random() * TWO_PI;
    meta[i * 8 + 1] = THREE.MathUtils.randFloatSpread(1);
    meta[i * 8 + 2] = THREE.MathUtils.randFloatSpread(1);
    meta[i * 8 + 3] = Math.random() * TWO_PI;
    meta[i * 8 + 4] = Math.random() * TWO_PI;
    meta[i * 8 + 5] = THREE.MathUtils.randFloat(0.45, 1);
    meta[i * 8 + 6] = Math.random() > 0.5 ? 1 : -1;
    meta[i * 8 + 7] = brightness;

    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = brightness * 0.988;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    map: sprite,
    size: config.pointSize,
    transparent: true,
    opacity: config.opacity,
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
    config,
  };
}

function updateBandLayer(layer, elapsed, focus) {
  const { positions, meta, geometry, config } = layer;
  const colors = geometry.attributes.color.array;
  const energy = 1 + focus * 0.35;

  for (let i = 0; i < positions.length / 3; i += 1) {
    const metaIndex = i * 8;
    const baseAngle = meta[metaIndex];
    const radialSeed = meta[metaIndex + 1];
    const depthSeed = meta[metaIndex + 2];
    const phaseA = meta[metaIndex + 3];
    const phaseB = meta[metaIndex + 4];
    const laneBias = meta[metaIndex + 5];
    const direction = meta[metaIndex + 6];
    const baseBrightness = meta[metaIndex + 7];

    const macroAngle = baseAngle - elapsed * MACRO_SPEED;
    const laneCenter =
      Math.sin(macroAngle * 1.6 - elapsed * 0.085 + phaseA) * 0.19 +
      Math.sin(macroAngle * 2.85 + elapsed * 0.062 + phaseB) * 0.08;
    const lane =
      radialSeed * 0.68 +
      laneCenter * (0.88 - Math.abs(radialSeed) * 0.34) +
      Math.sin(elapsed * 0.045 + phaseA + phaseB) * 0.018;

    const field = sampleWaveField(macroAngle, lane, elapsed, phaseA, phaseB);
    const angle =
      macroAngle +
      field.drift * 0.05 * config.currentInfluence +
      Math.sin(elapsed * 0.04 + phaseA) * 0.0025 +
      Math.sin(elapsed * 0.07 + phaseB + macroAngle * 1.8) * 0.0015;

    const lowerBias = 0.94 + ((1 - Math.sin(angle)) * 0.5) * 0.09;
    const compression = THREE.MathUtils.lerp(
      1,
      0.6,
      THREE.MathUtils.clamp((field.squeeze - 0.08) * 0.34 * config.currentInfluence, 0, 0.88),
    );
    const currentStrength = Math.max(0, field.density - 0.98) * config.currentInfluence * energy;

    const radius =
      BAND_RADIUS +
      lane * BAND_WIDTH * config.widthScale * compression +
      field.radial * config.currentInfluence * lowerBias;
    const tangent =
      field.tangent * config.currentInfluence +
      Math.sin(angle * 2.2 + phaseA + lane * 3.8 + elapsed * 0.11) * 0.012 * laneBias +
      currentStrength * 0.032 * direction;

    const x = Math.cos(angle) * radius - Math.sin(angle) * tangent;
    const y = Math.sin(angle) * radius + Math.cos(angle) * tangent;
    const z =
      config.depthOffset +
      depthSeed * BAND_DEPTH * config.depthScale * (0.84 + compression * 0.16) +
      field.depth * config.currentInfluence +
      currentStrength * 0.04 * Math.sign(depthSeed || 1);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const brightness = THREE.MathUtils.clamp(
      baseBrightness *
        (0.9 +
          (field.brightness - 0.82) * 0.42 * config.brightnessResponse +
          currentStrength * 0.24 +
          lowerBias * 0.04),
      0,
      1.28,
    );
    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = brightness * 0.988;
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
}

function sampleWaveField(angle, lane, elapsed, phaseA, phaseB) {
  let density = 0.94;
  let brightness = 0.84;
  let tangent = 0;
  let radial = 0;
  let depth = 0;
  let drift = 0;
  let squeeze = 0;

  for (const wave of WAVE_SPECS) {
    const center = wrapAngle(wave.offset - elapsed * wave.speed);
    const delta = shortestAngularDistance(angle, center);
    const gaussian = Math.exp(-(delta * delta) / (2 * wave.width * wave.width));
    const lanePhase = lane * wave.lineFreq * 0.58;
    const crestA = 0.5 + 0.5 * Math.sin(delta * wave.lineFreq - elapsed * wave.lineSpeed + lanePhase + phaseA * 0.55);
    const crestB =
      0.5 + 0.5 * Math.sin(delta * wave.secondaryFreq + elapsed * wave.secondarySpeed - lane * 4.2 + phaseB * 0.75);
    const packet = gaussian * (0.32 + crestA * 0.68) * (0.76 + crestB * 0.24);
    const fold = Math.sin(delta * (wave.lineFreq * 0.78) - elapsed * (wave.lineSpeed * 0.82) + lane * 5.1 + phaseB);
    const eddy = Math.cos(delta * (wave.secondaryFreq * 1.05) + elapsed * (wave.secondarySpeed * 0.9) - lane * 4.6 + phaseA);

    density += packet * wave.amplitude;
    brightness += packet * 0.34;
    tangent += gaussian * (fold * 0.58 + eddy * 0.42) * wave.tangentAmp;
    radial += gaussian * (eddy * 0.62 + fold * 0.38) * wave.radialAmp;
    depth += packet * (fold * 0.6 + eddy * 0.4) * wave.depthAmp;
    drift += gaussian * wave.drift * (0.42 + crestA * 0.58);
    squeeze += packet;
  }

  const ribbonNoise =
    Math.sin(angle * 1.9 - elapsed * 0.06 + phaseA) * 0.034 +
    Math.sin(angle * 3.6 + elapsed * 0.048 + phaseB + lane * 1.8) * 0.028 +
    Math.sin(angle * 6.2 - elapsed * 0.03 + phaseA * 0.7 + lane * 3.4) * 0.018;
  density += ribbonNoise;
  brightness += ribbonNoise * 0.42;

  return {
    density: THREE.MathUtils.clamp(density, 0.84, 1.62),
    brightness: THREE.MathUtils.clamp(brightness, 0.8, 1.34),
    tangent,
    radial,
    depth,
    drift,
    squeeze: THREE.MathUtils.clamp(squeeze, 0, 1.85),
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
