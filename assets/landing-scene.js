import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

const STARFIELD_COUNT = 5200;
const DUST_COUNT = 1800;
const CORE_RING_COUNT = 12600;
const FILAMENT_RING_COUNT = 3600;
const BOKEH_BACK_COUNT = 1100;
const BOKEH_FRONT_COUNT = 900;
const TWO_PI = Math.PI * 2;

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
  scene.fog = new THREE.FogExp2(0x030303, 0.036);

  const camera = new THREE.PerspectiveCamera(
    30,
    container.clientWidth / Math.max(container.clientHeight, 1),
    0.1,
    120,
  );
  camera.position.set(0, 0, 11.8);

  const root = new THREE.Group();
  scene.add(root);

  const ringGroup = new THREE.Group();
  ringGroup.scale.set(0.94, 1.18, 1);
  root.add(ringGroup);

  const sprite = createCircularSprite();

  const farStars = createStarfield(sprite);
  const dustField = createDustField(sprite);
  const coreRing = createRingSystem(sprite, CORE_RING_COUNT, {
    majorRadiusX: 4.6,
    majorRadiusY: 4.6,
    tubeRadius: 0.86,
    depth: 1.5,
    pointSize: 0.0155,
    opacity: 0.7,
    brightnessRange: [0.74, 0.99],
    driftRange: [0.024, 0.064],
    crossRange: [0.28, 0.62],
    orbitAmplitude: 0.16,
    crossAmplitude: 0.86,
    tangentAmplitude: 0.12,
    tubeWave: 0.18,
    majorWave: 0.1,
    clustered: true,
  });
  const filamentRing = createRingSystem(sprite, FILAMENT_RING_COUNT, {
    majorRadiusX: 4.58,
    majorRadiusY: 4.58,
    tubeRadius: 0.62,
    depth: 1.18,
    pointSize: 0.025,
    opacity: 0.92,
    brightnessRange: [0.9, 1],
    driftRange: [0.038, 0.095],
    crossRange: [0.44, 0.88],
    orbitAmplitude: 0.22,
    crossAmplitude: 1.05,
    tangentAmplitude: 0.18,
    tubeWave: 0.12,
    majorWave: 0.06,
    clustered: true,
  });
  const bokehBack = createBokehLayer(sprite, BOKEH_BACK_COUNT, {
    majorRadiusX: 4.72,
    majorRadiusY: 4.72,
    tubeRadius: 1.12,
    depthOffset: -2.8,
    depthSpread: 1.05,
    pointSize: 0.12,
    opacity: 0.085,
  });
  const bokehFront = createBokehLayer(sprite, BOKEH_FRONT_COUNT, {
    majorRadiusX: 4.48,
    majorRadiusY: 4.48,
    tubeRadius: 0.96,
    depthOffset: 2.5,
    depthSpread: 0.82,
    pointSize: 0.145,
    opacity: 0.11,
  });

  scene.add(farStars);
  scene.add(dustField);
  ringGroup.add(coreRing.points);
  ringGroup.add(filamentRing.points);
  ringGroup.add(bokehBack);
  ringGroup.add(bokehFront);

  scene.add(new THREE.AmbientLight(0xf3f1eb, 0.45));
  const frontLight = new THREE.PointLight(0xffffff, 0.86, 32);
  frontLight.position.set(0, 0.2, 8.5);
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

    root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, pointer.y * 0.028, 0.03);
    root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, pointer.x * 0.045, 0.03);
    root.position.x = THREE.MathUtils.lerp(root.position.x, pointer.x * 0.18, 0.03);
    root.position.y = THREE.MathUtils.lerp(root.position.y, pointer.y * 0.08, 0.03);

    updateRingSystem(coreRing, elapsed, focus, 0.9);
    updateRingSystem(filamentRing, elapsed, focus, 1.3);
    updateBokehLayer(bokehBack, elapsed, focus, 0.65);
    updateBokehLayer(bokehFront, elapsed, focus, 1);
    updateDustField(dustField, elapsed);

    coreRing.material.opacity = 0.7 + focus * 0.12;
    filamentRing.material.opacity = 0.9 + focus * 0.08;
    bokehBack.material.opacity = 0.085 + focus * 0.02;
    bokehFront.material.opacity = 0.11 + focus * 0.028;

    farStars.rotation.y += 0.00002;
    farStars.rotation.x = Math.sin(elapsed * 0.05) * 0.012;

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
  gradient.addColorStop(0.18, "rgba(255,255,255,0.98)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.42)");
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
    const radius = THREE.MathUtils.randFloat(12, 40);
    const theta = Math.random() * TWO_PI;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi) * 0.78;
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
      size: 0.018,
      transparent: true,
      opacity: 0.42,
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
    positions[i * 3] = THREE.MathUtils.randFloatSpread(18);
    positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(12);
    positions[i * 3 + 2] = THREE.MathUtils.randFloat(-5, 4);

    meta[i * 4] = positions[i * 3];
    meta[i * 4 + 1] = positions[i * 3 + 1];
    meta[i * 4 + 2] = positions[i * 3 + 2];
    meta[i * 4 + 3] = Math.random() * TWO_PI;

    const tint = THREE.MathUtils.randFloat(0.7, 0.96);
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
      size: 0.026,
      transparent: true,
      opacity: 0.08,
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
    positions[i * 3] = meta[i * 4] + Math.sin(elapsed * 0.08 + phase) * 0.06;
    positions[i * 3 + 1] = meta[i * 4 + 1] + Math.cos(elapsed * 0.07 + phase * 0.6) * 0.05;
    positions[i * 3 + 2] = meta[i * 4 + 2] + Math.sin(elapsed * 0.09 + phase * 1.1) * 0.08;
  }

  points.geometry.attributes.position.needsUpdate = true;
}

function createRingSystem(sprite, count, config) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const meta = new Float32Array(count * 10);

  for (let i = 0; i < count; i += 1) {
    const orbit = config.clustered ? sampleOrbitAngle() : Math.random() * TWO_PI;
    const cross = Math.random() * TWO_PI;
    const brightness = THREE.MathUtils.randFloat(config.brightnessRange[0], config.brightnessRange[1]);

    meta[i * 10] = orbit;
    meta[i * 10 + 1] = cross;
    meta[i * 10 + 2] = THREE.MathUtils.randFloatSpread(config.tubeRadius * 0.5);
    meta[i * 10 + 3] = THREE.MathUtils.randFloatSpread(config.depth * 0.45);
    meta[i * 10 + 4] = THREE.MathUtils.randFloat(config.driftRange[0], config.driftRange[1]);
    meta[i * 10 + 5] = THREE.MathUtils.randFloat(config.crossRange[0], config.crossRange[1]);
    meta[i * 10 + 6] = Math.random() * TWO_PI;
    meta[i * 10 + 7] = THREE.MathUtils.randFloat(0.4, 1);
    meta[i * 10 + 8] = Math.random() > 0.5 ? 1 : -1;
    meta[i * 10 + 9] = THREE.MathUtils.randFloat(0.04, config.orbitAmplitude);

    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = brightness * 0.985;
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

function sampleOrbitAngle() {
  if (Math.random() < 0.46) {
    return Math.random() * TWO_PI;
  }

  const clusterCenters = [
    -0.08 * Math.PI,
    0.18 * Math.PI,
    0.86 * Math.PI,
    1.1 * Math.PI,
    1.34 * Math.PI,
    1.62 * Math.PI,
  ];
  const center = clusterCenters[Math.floor(Math.random() * clusterCenters.length)];
  return center + THREE.MathUtils.randFloatSpread(0.46);
}

function updateRingSystem(system, elapsed, focus, energyMultiplier) {
  const { positions, meta, geometry, config } = system;
  const energy = 1 + focus * 0.55 * energyMultiplier;

  for (let i = 0; i < positions.length / 3; i += 1) {
    const metaIndex = i * 10;
    const baseOrbit = meta[metaIndex];
    const baseCross = meta[metaIndex + 1];
    const radialSeed = meta[metaIndex + 2];
    const depthSeed = meta[metaIndex + 3];
    const driftSpeed = meta[metaIndex + 4];
    const crossSpeed = meta[metaIndex + 5];
    const phase = meta[metaIndex + 6];
    const densityBias = meta[metaIndex + 7];
    const direction = meta[metaIndex + 8];
    const orbitAmplitude = meta[metaIndex + 9];

    const localTime = elapsed * 0.46;
    const orbitDrift =
      Math.sin(localTime * driftSpeed * 7.5 + phase) * orbitAmplitude +
      direction * Math.sin(localTime * driftSpeed * 1.3 + phase * 0.7) * 0.026 * energy;
    const orbit = baseOrbit + orbitDrift;

    const cross =
      baseCross +
      Math.sin(localTime * crossSpeed * 5.5 + phase + baseOrbit * 2.8) * config.crossAmplitude * energy +
      Math.cos(localTime * 1.1 + phase * 1.7 + baseOrbit * 6) * 0.22 * densityBias;

    const densityWave =
      1 +
      Math.sin(baseOrbit * 4.3 + elapsed * 0.34 + phase) * 0.18 +
      Math.sin(baseOrbit * 9.4 - elapsed * 0.24 + phase * 0.8) * 0.12;

    const tube =
      config.tubeRadius +
      radialSeed * densityWave +
      Math.sin(localTime * 2 + phase + baseOrbit * 5.6) * config.tubeWave * densityBias * energy;

    const majorRadiusX =
      config.majorRadiusX + Math.sin(baseOrbit * 2.1 + elapsed * 0.12 + phase * 0.2) * config.majorWave;
    const majorRadiusY =
      config.majorRadiusY + Math.cos(baseOrbit * 2.6 - elapsed * 0.1 + phase * 0.15) * config.majorWave * 1.2;

    const ringX = Math.cos(orbit) * majorRadiusX;
    const ringY = Math.sin(orbit) * majorRadiusY;
    const normalX = Math.cos(orbit);
    const normalY = Math.sin(orbit);
    const tangentX = -Math.sin(orbit);
    const tangentY = Math.cos(orbit);

    const tangentDrift =
      Math.sin(localTime * 1.8 + phase * 1.4 + baseOrbit * 11) * config.tangentAmplitude * densityBias * energy;
    const flutter = Math.sin(localTime * 2.6 + phase * 0.8) * 0.022 * densityBias * energy;
    const depth =
      Math.sin(cross) * config.depth +
      depthSeed +
      Math.sin(localTime * 1.4 + phase + baseOrbit * 4.1) * 0.26 * densityBias;

    positions[i * 3] = ringX + Math.cos(cross) * normalX * tube + tangentX * tangentDrift + flutter;
    positions[i * 3 + 1] = ringY + Math.cos(cross) * normalY * tube + tangentY * tangentDrift;
    positions[i * 3 + 2] = depth;
  }

  geometry.attributes.position.needsUpdate = true;
}

function createBokehLayer(sprite, count, config) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const meta = new Float32Array(count * 5);

  for (let i = 0; i < count; i += 1) {
    meta[i * 5] = sampleOrbitAngle();
    meta[i * 5 + 1] = Math.random() * TWO_PI;
    meta[i * 5 + 2] = THREE.MathUtils.randFloatSpread(config.depthSpread);
    meta[i * 5 + 3] = Math.random() * TWO_PI;
    meta[i * 5 + 4] = THREE.MathUtils.randFloat(0.4, 1);

    const tint = THREE.MathUtils.randFloat(0.8, 1);
    colors[i * 3] = tint;
    colors[i * 3 + 1] = tint;
    colors[i * 3 + 2] = tint;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    map: sprite,
    size: config.pointSize,
    transparent: true,
    opacity: config.opacity,
    alphaTest: 0.01,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  points.userData.geometryRef = geometry;
  points.userData.positionsRef = positions;
  points.userData.metaRef = meta;
  points.userData.configRef = config;
  return points;
}

function updateBokehLayer(points, elapsed, focus, energyMultiplier) {
  const geometry = points.userData.geometryRef;
  const positions = points.userData.positionsRef;
  const meta = points.userData.metaRef;
  const config = points.userData.configRef;
  const energy = 1 + focus * 0.4 * energyMultiplier;

  for (let i = 0; i < positions.length / 3; i += 1) {
    const orbit = meta[i * 5] + Math.sin(elapsed * 0.22 + meta[i * 5 + 3]) * 0.06;
    const cross = meta[i * 5 + 1] + Math.sin(elapsed * 0.38 + meta[i * 5 + 3]) * 0.45 * energy;
    const radius = config.tubeRadius + Math.sin(elapsed * 0.31 + meta[i * 5 + 3]) * 0.1;
    const majorRadiusX = config.majorRadiusX;
    const majorRadiusY = config.majorRadiusY;

    positions[i * 3] = Math.cos(orbit) * majorRadiusX + Math.cos(cross) * Math.cos(orbit) * radius;
    positions[i * 3 + 1] = Math.sin(orbit) * majorRadiusY + Math.cos(cross) * Math.sin(orbit) * radius;
    positions[i * 3 + 2] =
      config.depthOffset +
      meta[i * 5 + 2] +
      Math.sin(cross) * 0.9 +
      Math.sin(elapsed * 0.26 + meta[i * 5 + 3] * 1.2) * 0.16 * meta[i * 5 + 4];
  }

  geometry.attributes.position.needsUpdate = true;
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
