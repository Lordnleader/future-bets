import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

export function createLandingScene(container) {
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
  scene.fog = new THREE.FogExp2(0x040504, 0.05);

  const camera = new THREE.PerspectiveCamera(
    34,
    container.clientWidth / Math.max(container.clientHeight, 1),
    0.1,
    120,
  );
  camera.position.set(0, 0.5, 13.5);

  const root = new THREE.Group();
  root.position.set(0, 0.1, 0);
  scene.add(root);

  const sprite = createCircularSprite();
  const farStars = createFarStars(sprite);
  const galaxy = createGalaxy(sprite);
  const glowCloud = createGlowCloud(sprite);
  const depthField = createDepthField(sprite);

  scene.add(farStars);
  root.add(galaxy.group);
  root.add(glowCloud);
  root.add(depthField.background);
  root.add(depthField.foreground);

  const ambient = new THREE.AmbientLight(0xf0f1ec, 0.48);
  const front = new THREE.PointLight(0xf9faf5, 1.35, 42);
  const rim = new THREE.PointLight(0xe3e5dc, 0.72, 56);
  front.position.set(0, 3, 10);
  rim.position.set(-5, 1.5, -4);
  scene.add(ambient, front, rim);

  const pointer = { x: 0, y: 0 };
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

    root.rotation.z = THREE.MathUtils.lerp(root.rotation.z, pointer.x * -0.018, 0.024);
    root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, pointer.y * 0.03 - 0.06, 0.024);
    root.position.x = THREE.MathUtils.lerp(root.position.x, pointer.x * 0.55, 0.03);
    root.position.y = THREE.MathUtils.lerp(root.position.y, pointer.y * 0.28 + 0.1, 0.03);

    galaxy.group.rotation.y = Math.sin(elapsed * 0.05) * 0.02;
    galaxy.group.rotation.z = Math.sin(elapsed * 0.045) * 0.012;
    galaxy.group.position.y = Math.sin(elapsed * 0.1) * 0.03;
    galaxy.dust.rotation.z = elapsed * 0.012;
    galaxy.core.rotation.z = elapsed * 0.015;
    galaxy.lines.rotation.z = elapsed * 0.008;
    galaxy.dust.rotation.y = Math.sin(elapsed * 0.08) * 0.02;
    galaxy.core.rotation.y = Math.sin(elapsed * 0.1) * 0.026;
    galaxy.lines.rotation.y = Math.sin(elapsed * 0.07) * 0.016;

    glowCloud.rotation.z = elapsed * 0.012;
    glowCloud.material.opacity = 0.06 + Math.sin(elapsed * 0.22) * 0.012;

    depthField.background.rotation.z = elapsed * 0.014;
    depthField.foreground.rotation.z = elapsed * 0.02;
    depthField.background.material.opacity = 0.08 + Math.sin(elapsed * 0.18) * 0.01;
    depthField.foreground.material.opacity = 0.1 + Math.sin(elapsed * 0.2) * 0.012;

    farStars.rotation.y += 0.00008;
    farStars.rotation.x = Math.sin(elapsed * 0.06) * 0.02;

    galaxy.dust.material.opacity = 0.61 + Math.sin(elapsed * 0.3) * 0.03;
    galaxy.core.material.opacity = 0.8 + Math.sin(elapsed * 0.24) * 0.04;
    galaxy.lines.material.opacity = 0.13 + Math.sin(elapsed * 0.26) * 0.018;

    renderer.render(scene, camera);
  }

  function handlePointerMove(event) {
    const rect = container.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * -2;
  }

  function resetPointer() {
    pointer.x = 0;
    pointer.y = 0;
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
  gradient.addColorStop(0.32, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.62, "rgba(255,255,255,0.34)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createFarStars(sprite) {
  const count = 7000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const radius = THREE.MathUtils.randFloat(16, 42);
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi) * 0.65;
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const tint = THREE.MathUtils.randFloat(0.82, 1);
    colors[i * 3] = tint * 0.94;
    colors[i * 3 + 1] = tint;
    colors[i * 3 + 2] = tint * 0.96;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    map: sprite,
    size: 0.03,
    transparent: true,
    opacity: 0.72,
    alphaTest: 0.02,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  return new THREE.Points(geometry, material);
}

function createGalaxy(sprite) {
  const group = new THREE.Group();
  group.rotation.x = -0.38;
  group.rotation.z = 0.16;
  group.scale.set(1.28, 1, 1);

  const nodePositions = [];
  const nodeGeometry = new THREE.BufferGeometry();
  const nodeCount = 264;
  const nodeCoords = new Float32Array(nodeCount * 3);

  for (let i = 0; i < nodeCount; i += 1) {
    const point = generateGalaxyPoint(i, nodeCount);
    nodeCoords[i * 3] = point.x;
    nodeCoords[i * 3 + 1] = point.y;
    nodeCoords[i * 3 + 2] = point.z;
    nodePositions.push(point);
  }

  nodeGeometry.setAttribute("position", new THREE.BufferAttribute(nodeCoords, 3));

  const nodeMaterial = new THREE.PointsMaterial({
    map: sprite,
    color: 0xf4f5f0,
    size: 0.048,
    transparent: true,
    opacity: 0.9,
    alphaTest: 0.02,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const stars = new THREE.Points(nodeGeometry, nodeMaterial);
  group.add(stars);

  const dustGeometry = new THREE.BufferGeometry();
  const dustCount = 7600;
  const dustCoords = new Float32Array(dustCount * 3);
  const dustColors = new Float32Array(dustCount * 3);

  for (let i = 0; i < dustCount; i += 1) {
    const point = generateGalaxyPoint(i, dustCount, true);
    dustCoords[i * 3] = point.x;
    dustCoords[i * 3 + 1] = point.y;
    dustCoords[i * 3 + 2] = point.z;

    const tint = THREE.MathUtils.randFloat(0.76, 0.98);
    dustColors[i * 3] = tint * 0.9;
    dustColors[i * 3 + 1] = tint;
    dustColors[i * 3 + 2] = tint * 0.92;
  }

  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustCoords, 3));
  dustGeometry.setAttribute("color", new THREE.BufferAttribute(dustColors, 3));

  const dustMaterial = new THREE.PointsMaterial({
    map: sprite,
    size: 0.02,
    transparent: true,
    opacity: 0.61,
    alphaTest: 0.02,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const dust = new THREE.Points(dustGeometry, dustMaterial);
  group.add(dust);

  const coreGeometry = new THREE.BufferGeometry();
  const coreCount = 3000;
  const coreCoords = new Float32Array(coreCount * 3);
  const coreColors = new Float32Array(coreCount * 3);

  for (let i = 0; i < coreCount; i += 1) {
    const radius = Math.pow(Math.random(), 0.7) * 1.9;
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * radius * 1.85;
    const y = THREE.MathUtils.randFloatSpread(0.12);
    const z = Math.sin(angle) * radius * 0.62 + THREE.MathUtils.randFloatSpread(0.28);

    coreCoords[i * 3] = x;
    coreCoords[i * 3 + 1] = y;
    coreCoords[i * 3 + 2] = z;
    coreColors[i * 3] = 0.84;
    coreColors[i * 3 + 1] = 0.96;
    coreColors[i * 3 + 2] = 0.7;
  }

  coreGeometry.setAttribute("position", new THREE.BufferAttribute(coreCoords, 3));
  coreGeometry.setAttribute("color", new THREE.BufferAttribute(coreColors, 3));

  const coreMaterial = new THREE.PointsMaterial({
    map: sprite,
    size: 0.032,
    transparent: true,
    opacity: 0.8,
    alphaTest: 0.02,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const core = new THREE.Points(coreGeometry, coreMaterial);
  group.add(core);

  const lineSegments = buildGalaxyLines(nodePositions);
  const lineGeometry = new THREE.BufferGeometry();
  const lineCoords = new Float32Array(lineSegments.length * 6);

  lineSegments.forEach((segment, index) => {
    lineCoords[index * 6] = segment.from.x;
    lineCoords[index * 6 + 1] = segment.from.y;
    lineCoords[index * 6 + 2] = segment.from.z;
    lineCoords[index * 6 + 3] = segment.to.x;
    lineCoords[index * 6 + 4] = segment.to.y;
    lineCoords[index * 6 + 5] = segment.to.z;
  });

  lineGeometry.setAttribute("position", new THREE.BufferAttribute(lineCoords, 3));
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xf4f2ea,
    transparent: true,
    opacity: 0.13,
    blending: THREE.AdditiveBlending,
  });
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  group.add(lines);

  return {
    group,
    dust,
    core,
    lines,
  };
}

function createGlowCloud(sprite) {
  const geometry = new THREE.BufferGeometry();
  const count = 1200;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const radius = Math.pow(Math.random(), 0.72) * 4.4;
    const angle = Math.random() * Math.PI * 2;

    positions[i * 3] = Math.cos(angle) * radius * 1.4;
    positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(0.35);
    positions[i * 3 + 2] = Math.sin(angle) * radius * 0.78;

    colors[i * 3] = 0.8;
    colors[i * 3 + 1] = 0.82;
    colors[i * 3 + 2] = 0.78;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      map: sprite,
      size: 0.22,
      transparent: true,
      opacity: 0.06,
      alphaTest: 0.01,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
}

function createDepthField(sprite) {
  return {
    background: createBokehLayer(sprite, {
      count: 1200,
      radiusX: 7.6,
      radiusZ: 2.6,
      spreadY: 0.55,
      offsetZ: -2.8,
      size: 0.12,
      opacity: 0.08,
    }),
    foreground: createBokehLayer(sprite, {
      count: 900,
      radiusX: 7.1,
      radiusZ: 2.2,
      spreadY: 0.48,
      offsetZ: 2.4,
      size: 0.15,
      opacity: 0.1,
    }),
  };
}

function createBokehLayer(
  sprite,
  { count, radiusX, radiusZ, spreadY, offsetZ, size, opacity },
) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.pow(Math.random(), 0.74) * radiusX;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(spreadY);
    positions[i * 3 + 2] = Math.sin(angle) * (radius / radiusX) * radiusZ + offsetZ;

    const tint = THREE.MathUtils.randFloat(0.78, 0.98);
    colors[i * 3] = tint;
    colors[i * 3 + 1] = tint;
    colors[i * 3 + 2] = tint * 0.98;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      map: sprite,
      size,
      transparent: true,
      opacity,
      alphaTest: 0.01,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
}

function generateGalaxyPoint(index, total, isDust = false) {
  const armCount = 4;
  const arm = index % armCount;
  const progress = Math.pow(Math.random(), isDust ? 0.78 : 0.92);
  const radius = progress * (isDust ? 6.8 : 6.2);
  const armOffset = (arm / armCount) * Math.PI * 2;
  const twist = radius * 0.82;
  const angle = armOffset + twist + THREE.MathUtils.randFloatSpread(isDust ? 0.9 : 0.46);
  const bandJitter = isDust ? 0.18 : 0.09;
  const x = Math.cos(angle) * radius * 1.65 + THREE.MathUtils.randFloatSpread(isDust ? 0.5 : 0.16);
  const y = THREE.MathUtils.randFloatSpread(bandJitter) * (1.4 - progress);
  const z = Math.sin(angle) * radius * 0.56 + THREE.MathUtils.randFloatSpread(isDust ? 0.24 : 0.08);

  return new THREE.Vector3(x, y, z);
}

function buildGalaxyLines(points) {
  const segments = [];
  const dedupe = new Set();

  points.forEach((point, index) => {
    const nearest = points
      .map((candidate, candidateIndex) => ({
        candidate,
        candidateIndex,
        distance: candidateIndex === index ? Infinity : point.distanceTo(candidate),
      }))
      .filter((entry) => entry.distance < 1.42)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    nearest.forEach((entry) => {
      const key = [index, entry.candidateIndex].sort((a, b) => a - b).join(":");
      if (!dedupe.has(key)) {
        dedupe.add(key);
        segments.push({
          from: point,
          to: entry.candidate,
        });
      }
    });
  });

  return segments;
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
