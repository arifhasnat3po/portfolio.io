/* Real licensed models. Rigid-body presentation; these assets have no skeletal animation clips. */
import * as THREE from '../vendor/cameo-three/three.module.js';
import { GLTFLoader } from '../vendor/cameo-three/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/cameo-three/meshopt_decoder.module.js';
import { RoomEnvironment } from '../vendor/cameo-three/RoomEnvironment.js';

const assets = {
  ironman: { file: 'ironman-mk7.glb', label: 'Iron Man MK7 by CHANG747', source: 'https://sketchfab.com/3d-models/iron-man-mk7-ad4776eea8184283a3e49cf5487df754' },
  falcon: { file: 'millennium-falcon.glb', label: 'Millennium Falcon by Johnson Martin', source: 'https://sketchfab.com/models/bd3e54ac20ff4ade8ddd8043db75c1d1' }
};

/**
 * await Portfolio3D.mount(element, 'ironman'|'falcon', options) -> cleanup function.
 * options: interactive, signal, onReady({ kind, label, source, animationClips }), onError(error).
 * The host needs nonzero width/height. Interactive: drag/arrow keys rotate; +/- zoom; Home resets.
 * Honors reduced motion, portfolio:motionchange, page visibility and viewport intersection.
 * No external network requests, shared global THREE, audio, or self-starting flyby traversal.
 */
export async function mount(container, kind, options = {}) {
  if (!(container instanceof HTMLElement)) throw new TypeError('A model container element is required.');
  if (!assets[kind]) throw new Error(`No licensed local model configured for ${kind}.`);
  if (options.signal?.aborted) return () => {};
  const interactive = options.interactive === true;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.88;
  const canvas = renderer.domElement;
  canvas.className = 'cameo-3d-canvas';
  canvas.style.cssText = 'display:block;width:100%;height:100%;outline-offset:-4px;';
  if (interactive) {
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${assets[kind].label}. Interactive 3D model: drag or use arrow keys to rotate, plus and minus to zoom, Home to reset.`);
    canvas.style.touchAction = 'pan-y';
  } else canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 100);
  const pivot = new THREE.Group();
  scene.add(pivot);
  const hemi = new THREE.HemisphereLight(0xf5f2e7, 0x1b292e, 0.42);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffebd0, 2.4); key.position.set(-3, 4, 6); scene.add(key);
  key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:20});
  key.shadow.bias=-.0001;key.shadow.normalBias=.012;
  const fill = new THREE.DirectionalLight(0xbedce8, 0.65); fill.position.set(5, 1, -2); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xe7ffe4, 1.2); rim.position.set(-4, 2, -4); scene.add(rim);
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(environment, 0.04);
  environment.dispose(); pmrem.dispose();
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.6;

  let disposed = false, ready = false, frame = 0, last = 0, time = 0;
  let inView = true, width = 0, height = 0, zoom = 1;
  let yaw = 0, pitch = 0, drag = null;
  let fitPoints = null;
  const fitPoint = new THREE.Vector3();
  const fitRotation = new THREE.Matrix4();
  const base = kind === 'falcon'
    ? new THREE.Euler(0.48, -0.65, -0.10)
    : new THREE.Euler(interactive ? 0 : -0.16, 0.38, interactive ? 0 : -Math.PI / 2);
  const motion = () => !preference.matches && document.documentElement.dataset.motion !== 'off';
  const visible = () => !document.hidden && inView && container.isConnected;
  const draw = () => { if (!disposed && ready && visible()) renderer.render(scene, camera); };
  function pose() {
    pivot.rotation.set(base.x + pitch + (motion() ? Math.sin(time * 0.65) * 0.035 : 0), base.y + yaw + (motion() ? Math.sin(time * 0.38) * 0.12 : 0), base.z + (motion() ? Math.sin(time * 0.55) * 0.025 : 0));
    pivot.position.y = motion() ? Math.sin(time * 0.9) * 0.065 : 0;
  }
  function resize() {
    if (disposed) return;
    const rect = container.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
    if (w !== width || h !== height) { width = w; height = h; renderer.setSize(w, h, false); }
    camera.aspect = width / height;
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let distance = 5;
    let centerX = 0, centerY = 0;
    if (fitPoints) {
      // Fit actual mesh samples, not the empty corners of its box. This matters for a thin ship.
      fitRotation.makeRotationFromEuler(base);
      const fillX = interactive ? 0.89 : 0.91;
      const fillY = interactive ? 0.75 : 0.80;
      const rotated = new Float32Array(fitPoints.length);
      let nearest = 0;
      for (let i = 0; i < fitPoints.length; i += 3) {
        fitPoint.fromArray(fitPoints, i).applyMatrix4(fitRotation);
        fitPoint.toArray(rotated, i); nearest = Math.max(nearest, fitPoint.z);
      }
      const projection = d => {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let i = 0; i < rotated.length; i += 3) {
          const depth = Math.max(0.01, d - rotated[i + 2]);
          const x = rotated[i] / (tangent * camera.aspect * depth);
          const y = rotated[i + 1] / (tangent * depth);
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
        return { width: maxX - minX, height: maxY - minY, x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
      };
      let low = nearest + 0.1, high = Math.max(6, low * 2);
      while (projection(high).width > fillX * 2 || projection(high).height > fillY * 2) high *= 2;
      for (let i = 0; i < 18; i++) {
        const mid = (low + high) / 2, extents = projection(mid);
        if (extents.width > fillX * 2 || extents.height > fillY * 2) low = mid;
        else high = mid;
      }
      distance = Math.max(nearest + 0.2, high / zoom);
      const framing = projection(distance); centerX = framing.x; centerY = framing.y;
    }
    camera.position.set(0, 0, distance);
    // Perspective makes the hull's visual centre differ from its 3D origin.
    camera.setViewOffset(width, height, centerX * width / 2, -centerY * height / 2, width, height);
    camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); draw();
  }
  function tick(now) {
    frame = 0;
    if (disposed || !ready || !visible() || !motion()) { last = 0; return; }
    if (last) time += Math.min((now - last) / 1000, 0.05);
    last = now; pose(); draw(); frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (disposed) return;
    if (frame) cancelAnimationFrame(frame);
    frame = 0; last = 0; pose(); draw();
    if (ready && visible() && motion()) frame = requestAnimationFrame(tick);
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container);
  const observer = new IntersectionObserver(entries => { inView = entries[0]?.isIntersecting ?? true; sync(); }); observer.observe(container);
  function down(event) {
    if (!interactive || event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY, yaw, pitch, id: event.pointerId };
    canvas.setPointerCapture(event.pointerId); canvas.style.cursor = 'grabbing';
  }
  function move(event) {
    if (!drag || drag.id !== event.pointerId) return;
    yaw = drag.yaw + (event.clientX - drag.x) * 0.009;
    pitch = THREE.MathUtils.clamp(drag.pitch + (event.clientY - drag.y) * 0.007, -1.3, 1.3);
    pose(); draw();
  }
  function up() { drag = null; canvas.style.cursor = 'grab'; }
  function keydown(event) {
    const step = 0.15;
    if (event.key === 'ArrowLeft') yaw -= step;
    else if (event.key === 'ArrowRight') yaw += step;
    else if (event.key === 'ArrowUp') pitch -= step;
    else if (event.key === 'ArrowDown') pitch += step;
    else if (event.key === '+' || event.key === '=') zoom = Math.min(1.5, zoom + 0.1);
    else if (event.key === '-' || event.key === '_') zoom = Math.max(0.7, zoom - 0.1);
    else if (event.key === 'Home') { yaw = pitch = 0; zoom = 1; }
    else return;
    event.preventDefault(); pitch = THREE.MathUtils.clamp(pitch, -1.3, 1.3); pose(); resize();
  }
  if (interactive) {
    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('lostpointercapture', up); canvas.addEventListener('keydown', keydown);
  }
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('portfolio:motionchange', sync);
  preference.addEventListener('change', sync);
  function disposeObject(object) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    object.traverse(child => {
      if (child.geometry) geometries.add(child.geometry);
      for (const material of [].concat(child.material || [])) {
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    textures.forEach(texture => { texture.dispose(); texture.source?.data?.close?.(); });
  }
  function cleanup() {
    if (disposed) return;
    disposed = true; if (frame) cancelAnimationFrame(frame);
    resizeObserver.disconnect(); observer.disconnect();
    document.removeEventListener('visibilitychange', sync);
    document.removeEventListener('portfolio:motionchange', sync);
    preference.removeEventListener('change', sync);
    options.signal?.removeEventListener('abort', cleanup);
    disposeObject(pivot); envTarget.dispose();key.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  }
  options.signal?.addEventListener('abort', cleanup, { once: true });
  try {
    await MeshoptDecoder.ready;
    const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(new URL(`../models/${assets[kind].file}`, import.meta.url).href);
    if (disposed || !container.isConnected) { disposeObject(gltf.scene); cleanup(); return cleanup; }
    const bounds = new THREE.Box3().setFromObject(gltf.scene);
    const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    if (!Number.isFinite(size.length()) || size.length() === 0) throw new Error('Model has no visible geometry.');
    const normalized = new THREE.Group();
    gltf.scene.position.sub(center); normalized.add(gltf.scene);
    normalized.scale.setScalar(3.25 / Math.max(size.x, size.y, size.z));
    pivot.add(normalized);
    const samples = [];
    pivot.updateMatrixWorld(true);
    const inversePivot = new THREE.Matrix4().copy(pivot.matrixWorld).invert();
    gltf.scene.traverse(child => {
      if (!child.isMesh) return;
      child.frustumCulled = true;
      child.castShadow=true;child.receiveShadow=true;
      for (const material of [].concat(child.material || [])) material.envMapIntensity = 0.65;
      const positions = child.geometry.getAttribute('position');
      const step = Math.max(1, Math.floor(positions.count / 1800));
      for (let i = 0; i < positions.count; i += step) {
        fitPoint.fromBufferAttribute(positions, i).applyMatrix4(child.matrixWorld).applyMatrix4(inversePivot);
        samples.push(fitPoint.x, fitPoint.y, fitPoint.z);
      }
    });
    fitPoints = new Float32Array(samples);
    ready = true; pose(); resize(); sync();
    options.onReady?.({ kind, label: assets[kind].label, source: assets[kind].source, animationClips: gltf.animations.length });
    return cleanup;
  } catch (error) {
    cleanup(); options.onError?.(error); throw error;
  }
}

window.Portfolio3D = Object.freeze({ mount, assets });
