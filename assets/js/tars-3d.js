/* A procedural TARS tribute: four articulated metal columns, independent joint physics, and no downloaded model. */
import * as THREE from '../vendor/cameo-three/three.module.js';
import { RoomEnvironment } from '../vendor/cameo-three/RoomEnvironment.js';
import { TARS_DIMENSIONS, createTarsState, performTarsAction, advanceTarsPhysics, isTarsSettled } from './tars-physics.js';

function makeTexture(width, height, paint) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('TARS requires a canvas drawing context.');
  paint(context, canvas);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return { canvas, context, texture };
}

function buildRobot() {
  const body = new THREE.Group(); body.name = 'TARS-articulated-body'; body.rotation.order = 'ZXY';
  const joints = [], screens = [], glowMaterials = [];
  let seed = 9257;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const brushed = makeTexture(256, 1024, (ctx, canvas) => {
    ctx.fillStyle = '#b6bfc3'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let x = 0; x < canvas.width; x++) {
      const shade = Math.round(178 + random() * 43);
      ctx.strokeStyle = `rgba(${shade},${shade + 5},${shade + 7},${.17 + random() * .22})`;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let i = 0; i < 350; i++) {
      ctx.fillStyle = `rgba(245,249,250,${random() * .08})`;
      ctx.fillRect(random() * canvas.width, random() * canvas.height, .6, random() * 100 + 10);
    }
  });
  brushed.texture.anisotropy = 4;
  const faceMaterial = new THREE.MeshStandardMaterial({ map: brushed.texture, color: 0xd4d9db, metalness: .94, roughness: .32 });
  const sideMaterial = new THREE.MeshStandardMaterial({ color: 0x939ea4, metalness: .94, roughness: .29 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1c252a, metalness: .82, roughness: .46 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x090f12, metalness: .12, roughness: .9 });
  const edgeMetal = new THREE.MeshStandardMaterial({ color: 0xc2cbd1, metalness: 1, roughness: .23 });
  const d = TARS_DIMENSIONS, bevel = .008;
  const shape = new THREE.Shape();
  const w = d.width - bevel * 2, h = d.length - bevel * 2;
  shape.moveTo(-w / 2, -h / 2); shape.lineTo(w / 2, -h / 2); shape.lineTo(w / 2, h / 2); shape.lineTo(-w / 2, h / 2); shape.closePath();
  const columnGeometry = new THREE.ExtrudeGeometry(shape, { depth: d.depth - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, steps: 1, curveSegments: 1 });
  columnGeometry.translate(0, 0, -(d.depth - bevel * 2) / 2);
  const positions = columnGeometry.getAttribute('position'), uvs = columnGeometry.getAttribute('uv');
  for (let i = 0; i < positions.count; i++) uvs.setXY(i, positions.getX(i) / d.width + .5, positions.getY(i) / d.length + .5);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const boltGeometry = new THREE.CylinderGeometry(.008, .008, .005, 8);
  const hingeGeometry = new THREE.CylinderGeometry(.065, .065, .025, 24);
  const transform = new THREE.Object3D();
  function part(parent, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  for (let index = 0; index < 4; index++) {
    const joint = new THREE.Group(); joint.name = `TARS-column-${index + 1}`; joint.rotation.order = 'ZXY';
    joint.position.x = (index - 1.5) * d.spacing; body.add(joint); joints.push(joint);
    part(joint, columnGeometry, [faceMaterial, sideMaterial], 0, (d.aboveJoint - d.belowJoint) / 2, 0);
    part(joint, cube, rubber, 0, -d.belowJoint + .025, 0, d.width - .024, .05, d.depth - .018);
    part(joint, cube, edgeMetal, 0, d.aboveJoint - .025, 0, d.width - .015, .024, d.depth - .015);
    // Recesses are instanced strips, keeping the engraved panel structure inexpensive to draw.
    const grooves = [
      [-.176, -.99, .241, .004, 2.4, .003], [.176, -.99, .241, .004, 2.4, .003],
      [0, -.61, .241, .354, .008, .003], [0, -1.31, .241, .354, .007, .003],
      [0, -1.98, .241, .354, .008, .003], [0, -.61, -.241, .36, .008, .003],
      [0, -1.31, -.241, .36, .007, .003], [0, -1.98, -.241, .36, .008, .003]
    ];
    const seams = new THREE.InstancedMesh(cube, darkMetal, grooves.length);
    grooves.forEach((values, i) => {
      transform.position.set(...values.slice(0, 3)); transform.scale.set(...values.slice(3)); transform.rotation.set(0, 0, 0); transform.updateMatrix();
      seams.setMatrixAt(i, transform.matrix);
    }); joint.add(seams);
    const bolts = new THREE.InstancedMesh(boltGeometry, darkMetal, 8);
    let bolt = 0;
    for (const x of [-.17, .17]) for (const y of [.21, -.55, -1.37, -2.14]) {
      transform.position.set(x, y, .243); transform.scale.setScalar(1); transform.rotation.set(Math.PI / 2, 0, 0); transform.updateMatrix();
      bolts.setMatrixAt(bolt++, transform.matrix);
    } joint.add(bolts);
    for (const side of [-1, 1]) {
      const hinge = part(joint, hingeGeometry, darkMetal, side * (d.width / 2 + .003), 0, 0); hinge.rotation.z = Math.PI / 2;
    }
    if (index === 1 || index === 2) {
      part(joint, cube, darkMetal, 0, -.135, .247, .375, .438, .025);
      const screen = makeTexture(256, 280, () => {});
      const material = new THREE.MeshStandardMaterial({ map: screen.texture, emissiveMap: screen.texture, emissive: 0xb9e5f3, emissiveIntensity: .75, metalness: .05, roughness: .28 });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(.338, .393), material); plane.position.set(0, -.135, .262); joint.add(plane);
      screens.push({ ...screen, index: index - 1 }); glowMaterials.push(material);
    }
    if (index === 0) {
      const label = makeTexture(192, 640, ctx => {
        ctx.clearRect(0, 0, 192, 640); ctx.translate(96, 320); ctx.rotate(-Math.PI / 2);
        ctx.font = '700 130px monospace'; ctx.fillStyle = '#ed8b32'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('TARS', 0, 0);
      });
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(.21, .84), new THREE.MeshBasicMaterial({ map: label.texture, transparent: true, depthWrite: false, toneMapped: false }));
      decal.position.set(-.006, -.17, .247); joint.add(decal);
    }
  }
  // The internal crossmember is visible only through narrow gaps, not a fifth exterior column.
  part(body, cube, darkMetal, 0, -.08, -.035, 1.22, .19, .24);
  function paintScreens(speaking, time, action, grounded) {
    for (const screen of screens) {
      const ctx = screen.context, w = screen.canvas.width, h = screen.canvas.height;
      ctx.fillStyle = '#061014'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#23434d'; ctx.lineWidth = 1;
      for (let y = 15; y < h; y += 17) { ctx.beginPath(); ctx.moveTo(13, y); ctx.lineTo(w - 13, y); ctx.stroke(); }
      ctx.fillStyle = '#b4d7df'; ctx.font = '18px monospace'; ctx.textAlign = 'left';
      ctx.fillText(screen.index ? 'CONTACT / CTRL' : 'TARS / SYSTEMS', 16, 32);
      ctx.fillStyle = '#6f9da9'; ctx.font = '13px monospace'; ctx.fillText(screen.index ? (grounded ? 'SUPPORT: STABLE' : 'CONTACT: ACQUIRE') : 'AUTONOMOUS UNIT', 16, 58);
      ctx.strokeStyle = speaking ? '#c5f5ff' : '#7daab8'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 15; x <= 241; x += 3) {
        const envelope = speaking ? Math.sin(x * .047 + time * 5) * Math.sin(x * .12 - time * 7) * 27 : Math.sin(x * .07) * 2;
        const y = 125 + envelope + screen.index * 4; x === 15 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      } ctx.stroke();
      ctx.fillStyle = '#c9d9dd'; ctx.font = '16px monospace'; ctx.fillText(speaking ? 'VOICE LINK ACTIVE' : action === 'idle' ? 'READY / STANDBY' : `MODE / ${action.toUpperCase()}`, 16, 190);
      ctx.fillStyle = '#7599a4'; ctx.font = '12px monospace'; ctx.fillText(screen.index ? 'HINGE SERVO 04 / OK' : 'LOCAL SYSTEM ONLINE', 16, 219);
      for (let i = 0; i < 18; i++) { ctx.fillStyle = i < 14 ? '#71b5c3' : '#19343b'; ctx.fillRect(16 + i * 12, 245, 7, 8); }
      screen.texture.needsUpdate = true;
    }
    glowMaterials.forEach(material => { material.emissiveIntensity = speaking ? 1.05 : .75; });
  }
  paintScreens(false, 0, 'idle', true);
  return { body, joints, paintScreens };
}

/**
 * await mountTars(host, { compact=false, onReady, signal })
 * -> { destroy(), setMotion(enabled), setSpeaking(bool), perform(action), resize() }
 * No network requests. Actions: walk, wave, balance, reset, nudge. perform returns false when motion is disabled.
 */
export async function mountTars(host, { compact = false, onReady, signal } = {}) {
  if (!(host instanceof HTMLElement)) throw new TypeError('A TARS host element is required.');
  if (signal?.aborted) throw new DOMException('TARS mount cancelled.', 'AbortError');
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement; canvas.className = 'tars-renderer';
  canvas.style.cssText = 'display:block;width:100%;height:100%;'; canvas.setAttribute('aria-hidden', 'true'); host.appendChild(canvas);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, .05, 60);
  const robot = buildRobot(); scene.add(robot.body);
  const hemi = new THREE.HemisphereLight(0xdfeef4, 0x323539, .8); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xf9f4e9, 3.1); key.position.set(-3.5, 5.5, 4.2); key.castShadow = true;
  key.shadow.mapSize.set(compact ? 512 : 1024, compact ? 512 : 1024); key.shadow.radius = 3;
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -3, near: .1, far: 18 });
  key.shadow.bias = -.0002; key.shadow.normalBias = .014; scene.add(key);
  const fill = new THREE.DirectionalLight(0xc2dce9, 1.25); fill.position.set(4, 2.8, 3); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xe6b98a, 2.2); rim.position.set(3, 4, -4); scene.add(rim);
  const room = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
  let environment = pmrem.fromScene(room, .035); room.dispose(); pmrem.dispose();
  scene.environment = environment.texture; scene.environmentIntensity = 1.1;
  // A shadow catcher keeps the surrounding bay visible instead of painting a second rectangular floor.
  const groundMaterial = new THREE.ShadowMaterial({ color: 0x020705, transparent: true, opacity: compact ? .28 : .35, depthWrite: false });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), groundMaterial);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.002; ground.receiveShadow = true; scene.add(ground);
  const state = createTarsState();
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let disposed = false, lost = false, enabled = true, speaking = false, inView = true, frame = 0, last = 0;
  let width = 0, height = 0, lastScreen = -1, screenState = '', distance = 7, focusX = 0;
  const allowed = () => enabled && !preference.matches && document.documentElement.dataset.motion !== 'off';
  const visible = () => !disposed && !lost && !document.hidden && inView && host.isConnected;
  function telemetry() {
    host.dataset.tarsAction = state.action; host.dataset.tarsMotion = allowed() ? 'on' : 'off';
    host.dataset.tarsGrounded = String(state.grounded); host.dataset.tarsContacts = String(state.contactCount);
  }
  function pose() {
    robot.body.position.set(state.position.x, state.position.y, state.position.z);
    robot.body.rotation.set(state.pitch, 0, state.roll, 'ZXY');
    robot.joints.forEach((joint, index) => { joint.rotation.set(state.joints[index].pitch, 0, state.joints[index].roll, 'ZXY'); });
    telemetry();
  }
  function frameCamera(dt = 0, immediate = false) {
    const spread = state.action === 'wave' || Math.abs(state.joints[0].roll) > .22;
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const targetDistance = Math.max(3.35 / (2 * tangent * .89), (spread ? 3.9 : 2.1) / (2 * tangent * camera.aspect * .87));
    const response = immediate ? 1 : 1 - Math.exp(-dt * 5.5);
    distance += (targetDistance - distance) * response; focusX += ((spread ? -.35 : 0) - focusX) * response;
    camera.position.set(focusX + distance * .46, 1.26 + distance * .22, distance * .888);
    camera.lookAt(focusX, 1.26, 0);
  }
  function paintScreens(force = false) {
    const stamp = Math.floor(state.time * 12), status = `${speaking}/${state.action}/${state.grounded}`;
    if (force || status !== screenState || (speaking && stamp !== lastScreen)) {
      robot.paintScreens(speaking, state.time, state.action, state.grounded); screenState = status; lastScreen = stamp;
    }
  }
  function draw() { if (visible()) renderer.render(scene, camera); }
  function resize() {
    if (disposed) return;
    const rect = host.getBoundingClientRect(), w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
    if (w !== width || h !== height) { width = w; height = h; renderer.setSize(w, h, false); }
    camera.aspect = width / height; camera.updateProjectionMatrix(); frameCamera(0, true); draw();
  }
  function tick(now) {
    frame = 0;
    if (!visible() || !allowed()) { last = 0; return; }
    const dt = last ? Math.min(Math.max((now - last) / 1000, 0), 1) : 0; last = now;
    advanceTarsPhysics(state, dt); pose(); frameCamera(dt); paintScreens(); draw();
    if (!isTarsSettled(state) || speaking) frame = requestAnimationFrame(tick);
    else last = 0;
  }
  function sync() {
    if (disposed) return;
    if (!host.isConnected) { destroy(); return; }
    if (frame) cancelAnimationFrame(frame); frame = 0; last = 0;
    telemetry(); paintScreens(); draw();
    if (visible() && allowed() && (!isTarsSettled(state) || speaking)) frame = requestAnimationFrame(tick);
  }
  function setMotion(value) { if (disposed) return; enabled = Boolean(value); sync(); }
  function setSpeaking(value) { if (disposed) return; speaking = Boolean(value); paintScreens(true); sync(); }
  function perform(action) {
    if (disposed || !allowed() || !performTarsAction(state, action)) return false;
    telemetry(); sync(); return true;
  }
  function theme() {
    if (disposed) return;
    const light = document.documentElement.dataset.theme === 'light';
    groundMaterial.opacity = light ? .22 : compact ? .28 : .35;
    renderer.toneMappingExposure = light ? 1.03 : 1.15; draw();
  }
  function contextLost(event) {
    event.preventDefault(); lost = true; host.dataset.tarsRenderer = 'lost';
    if (frame) cancelAnimationFrame(frame); frame = 0; last = 0;
  }
  function contextRestored() {
    if (disposed) return;
    // Render-target contents do not survive context loss; rebuild the lighting environment too.
    const restoredRoom = new RoomEnvironment(), generator = new THREE.PMREMGenerator(renderer);
    const restoredEnvironment = generator.fromScene(restoredRoom, .035);
    restoredRoom.dispose(); generator.dispose(); environment.dispose(); environment = restoredEnvironment;
    scene.environment = environment.texture;
    lost = false; host.dataset.tarsRenderer = 'ready'; resize(); sync();
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
  const intersectionObserver = new IntersectionObserver(entries => { inView = entries[0]?.isIntersecting ?? true; sync(); }); intersectionObserver.observe(host);
  canvas.addEventListener('webglcontextlost', contextLost); canvas.addEventListener('webglcontextrestored', contextRestored);
  document.addEventListener('visibilitychange', sync); document.addEventListener('portfolio:motionchange', sync);
  document.addEventListener('portfolio:themechange', theme); preference.addEventListener('change', sync);
  function destroy() {
    if (disposed) return;
    disposed = true; if (frame) cancelAnimationFrame(frame); frame = 0;
    resizeObserver.disconnect(); intersectionObserver.disconnect();
    document.removeEventListener('visibilitychange', sync); document.removeEventListener('portfolio:motionchange', sync);
    document.removeEventListener('portfolio:themechange', theme); preference.removeEventListener('change', sync);
    canvas.removeEventListener('webglcontextlost', contextLost); canvas.removeEventListener('webglcontextrestored', contextRestored);
    window.removeEventListener('pagehide', destroy); signal?.removeEventListener('abort', destroy);
    const geometries = new Set(), materials = new Set(), textures = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of [].concat(object.material || [])) {
        materials.add(material); Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
      }
    });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); textures.forEach(texture => texture.dispose());
    environment.dispose(); key.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    host.dataset.tarsReady = 'false'; host.dataset.tarsRenderer = 'destroyed';
  }
  window.addEventListener('pagehide', destroy); signal?.addEventListener('abort', destroy, { once: true });
  pose(); theme(); resize(); paintScreens(true); draw();
  host.dataset.tarsReady = 'true'; host.dataset.tarsRenderer = 'ready';
  const controller = { destroy, setMotion, setSpeaking, perform, resize };
  onReady?.(controller);
  return controller;
}
