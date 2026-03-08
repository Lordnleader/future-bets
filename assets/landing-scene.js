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
  scene.fog = new THREE.FogExp2(0x020302, 0.072);

  const camera = new THREE.PerspectiveCamera(
    42,
    container.clientWidth / Math.max(container.clientHeight, 1),
    0.1,
    100,
  );
  camera.position.set(0, 0.35, 11.5);

  const root = new THREE.Group();
  root.position.set(0, 0.4, 0);
  scene.add(root);

  const ambient = new THREE.AmbientLight(0xd7f3b3, 0.55);
  scene.add(ambient);

  const point = new THREE.PointLight(0xe9ffcb, 1.4, 30);
  point.position.set(0, 1.8, 7.5);
  scene.add(point);

  const stars = createStarField();
  scene.add(stars);

  const cloud = createCloud();
  root.add(cloud);

  const form = createSignalForm();
  form.position.set(0, 0.2, 0);
  root.add(form);

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
    root.rotation.y += 0.0007;
    root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, pointer.y * 0.16, 0.04);
    root.rotation.z = THREE.MathUtils.lerp(root.rotation.z, pointer.x * -0.08, 0.04);
    root.position.x = THREE.MathUtils.lerp(root.position.x, pointer.x * 0.45, 0.035);
    root.position.y = THREE.MathUtils.lerp(root.position.y, 0.4 + pointer.y * 0.28, 0.035);

    stars.rotation.y += 0.00012;
    stars.rotation.x = Math.sin(elapsed * 0.08) * 0.03;

    cloud.rotation.y = elapsed * 0.035;
    cloud.rotation.z = Math.sin(elapsed * 0.18) * 0.05;
    cloud.material.opacity = 0.24 + Math.sin(elapsed * 0.45) * 0.04;

    form.rotation.y = elapsed * 0.16;
    form.rotation.x = Math.sin(elapsed * 0.22) * 0.07;
    form.position.y = 0.2 + Math.sin(elapsed * 0.3) * 0.18;

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
    disposeObject(scene);
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  }
}

function createStarField() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(5200 * 3);
  const colors = new Float32Array(5200 * 3);

  for (let i = 0; i < 5200; i += 1) {
    const radius = THREE.MathUtils.randFloat(9, 26);
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi) * 0.72;
    const z = radius * Math.sin(phi) * Math.sin(theta);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const tint = THREE.MathUtils.randFloat(0.78, 1);
    colors[i * 3] = tint * 0.92;
    colors[i * 3 + 1] = tint;
    colors[i * 3 + 2] = tint * 0.94;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.055,
    transparent: true,
    opacity: 0.85,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}

function createCloud() {
  const geometry = new THREE.BufferGeometry();
  const count = 2600;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const spread = THREE.MathUtils.randFloat(0.4, 1);
    const angle = THREE.MathUtils.randFloat(0, Math.PI * 2);
    const radius = Math.pow(Math.random(), 0.6) * 4.2;
    const x = Math.cos(angle) * radius * 1.35;
    const y = THREE.MathUtils.randFloatSpread(1.4) * spread;
    const z = Math.sin(angle) * radius * 0.78;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    colors[i * 3] = 0.78;
    colors[i * 3 + 1] = 0.92 + Math.random() * 0.04;
    colors[i * 3 + 2] = 0.68;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.12,
    transparent: true,
    opacity: 0.24,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}

function createSignalForm() {
  const group = new THREE.Group();
  const base = new THREE.IcosahedronGeometry(2.55, 18);
  const positions = base.attributes.position;
  const vector = new THREE.Vector3();

  for (let i = 0; i < positions.count; i += 1) {
    vector.fromBufferAttribute(positions, i);
    const normalized = vector.clone().normalize();
    const wave =
      Math.sin(normalized.y * 7.2) * 0.25 +
      Math.sin(normalized.x * 5.4) * 0.18 +
      Math.cos(normalized.z * 6.2) * 0.12;
    const stretch = 1 + Math.max(normalized.y, 0) * 0.85;

    vector.multiplyScalar((2.2 + wave) * stretch);
    vector.y *= 1.7;
    vector.x *= 0.92;
    vector.z *= 0.72;
    positions.setXYZ(i, vector.x, vector.y, vector.z);
  }

  base.computeVertexNormals();

  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(base),
    new THREE.LineBasicMaterial({
      color: 0xf1f4ef,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
    }),
  );
  group.add(wire);

  const points = new THREE.Points(
    base,
    new THREE.PointsMaterial({
      color: 0xf4f7f2,
      size: 0.038,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  group.add(points);

  return group;
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
