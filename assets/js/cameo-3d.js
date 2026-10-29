/* Licensed local models, procedural skeletal posing, and model-attached propulsion. */
import * as THREE from '../vendor/cameo-three/three.module.js';
import { GLTFLoader } from '../vendor/cameo-three/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/cameo-three/meshopt_decoder.module.js';
import { RoomEnvironment } from '../vendor/cameo-three/RoomEnvironment.js';
import { createCaraxes } from './caraxes-3d.js';

const assets = {
  ironman: { file: 'ironman-mark85.glb', label: 'Iron Man Mark 85 by 9A Films / Nihar Arora and LLIypuk', source: 'https://sketchfab.com/3d-models/iron-man-mark-85-rigged-dde1085c464d4f8da259fe6669ae4dd2' },
  falcon: { file: 'millennium-falcon.glb', label: 'Millennium Falcon by Johnson Martin', source: 'https://sketchfab.com/models/bd3e54ac20ff4ade8ddd8043db75c1d1' },
  dragon: { procedural: true, label: 'Caraxes-inspired red dragon — original stylized 3D reconstruction', source: null }
};

// Aim the real Mixamo joints in anatomical coordinates, independent of the imported bone axes.
// The original bind pose and material groups are retained; no vertices are hand-deformed.
function createSuitRig(model, normalized, interactive) {
  const bones = new Map();
  model.traverse(node => {
    if (!node.isBone) return;
    const name = node.name.replace(/^mixamorig:?/, '').replace(/_0\d*$/, '');
    bones.set(name, { bone: node, rest: node.quaternion.clone() });
  });
  if (!bones.has('LeftFoot') || !bones.has('RightFoot')) return null;
  const origin = new THREE.Vector3(), end = new THREE.Vector3(), direction = new THREE.Vector3();
  const current = new THREE.Quaternion(), parent = new THREE.Quaternion(), basis = new THREE.Quaternion();
  const turn = new THREE.Quaternion(), localTurn = new THREE.Quaternion();
  const xAxis = new THREE.Vector3(1, 0, 0), zAxis = new THREE.Vector3(0, 0, 1);
  const controlled = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftArm', 'RightArm',
    'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg'];

  function rotate(name, axis, angle) {
    const entry = bones.get(name); if (!entry) return;
    entry.bone.quaternion.multiply(localTurn.setFromAxisAngle(axis, angle));
    entry.bone.updateWorldMatrix(false, false);
  }
  function aim(name, nextName, x, y, z) {
    const entry = bones.get(name), next = bones.get(nextName);
    if (!entry || !next) return;
    const bone = entry.bone;
    bone.getWorldPosition(origin); next.bone.getWorldPosition(end);
    direction.copy(end).sub(origin).normalize();
    end.set(x, y, z).normalize().applyQuaternion(basis);
    turn.setFromUnitVectors(direction, end);
    bone.getWorldQuaternion(current); bone.parent.getWorldQuaternion(parent).invert();
    bone.quaternion.copy(parent.multiply(turn.multiply(current)));
    bone.updateWorldMatrix(false, false);
  }
  function update(time, flight, moving) {
    controlled.forEach(name => { const entry = bones.get(name); if (entry) entry.bone.quaternion.copy(entry.rest); });
    normalized.updateWorldMatrix(true, true);
    normalized.getWorldQuaternion(basis);
    const flying = !interactive;
    const bank = flying ? flight.bank : 0;
    const power = flying ? flight.throttle : .1;
    const breathe = moving ? Math.sin(time * 1.1) * .008 : 0;
    rotate('Hips', zAxis, bank * -.045);
    rotate('Spine', xAxis, flying ? -.07 - power * .035 : breathe);
    rotate('Spine2', zAxis, bank * .07);
    // Look along the line of travel, rather than keeping a standing head on a horizontal body.
    rotate('Neck', xAxis, flying ? -.18 : 0);
    rotate('Head', xAxis, flying ? -.48 - power * .11 : 0);
    for (const [side, sign] of [['Left', 1], ['Right', -1]]) {
      const correction = bank * sign;
      aim(`${side}Arm`, `${side}ForeArm`, sign * (flying ? .14 + sign * .025 + correction * .06 : .25), -1, flying ? -.16 - sign * .055 : -.03);
      aim(`${side}ForeArm`, `${side}Hand`, sign * (flying ? .08 + sign * .025 : .16), -1, flying ? -.01 + sign * .075 - correction * .12 : .14);
      aim(`${side}Hand`, `${side}HandMiddle1`, sign * .035, -1, flying ? -.10 : .08);
      aim(`${side}UpLeg`, `${side}Leg`, sign * (flying ? .055 : .075), -1, flying ? .02 + sign * .025 + correction * .03 : -.015);
      aim(`${side}Leg`, `${side}Foot`, sign * .025, -1, flying ? -.12 - sign * .045 - power * .07 - correction * .09 : -.035);
    }
    normalized.updateWorldMatrix(true, true);
  }
  function footSocket(side) {
    const foot = bones.get(`${side}Foot`).bone, toe = bones.get(`${side}ToeBase`)?.bone;
    if (!toe) return null;
    const ankle = foot.getWorldPosition(new THREE.Vector3());
    const toePosition = toe.getWorldPosition(new THREE.Vector3());
    const length = ankle.distanceTo(toePosition);
    // The nozzle sits beneath the sole, between heel and ball. Store it in the actual foot joint.
    const sole = ankle.clone().lerp(toePosition, .42);
    normalized.getWorldQuaternion(current);
    sole.add(new THREE.Vector3(0, -length * .43, 0).applyQuaternion(current));
    const socket = new THREE.Group(); socket.name = `${side.toLowerCase()}-boot-thruster`;
    socket.position.copy(foot.worldToLocal(sole));
    socket.quaternion.copy(foot.getWorldQuaternion(parent).invert().multiply(current));
    const scale = foot.getWorldScale(new THREE.Vector3());
    socket.scale.set(1 / scale.x, 1 / scale.y, 1 / scale.z);
    foot.add(socket);
    return socket;
  }
  return { update, footSocket, boneCount: bones.size };
}

// Engine geometry is attached in the model's normalized coordinates, before its flight rotation.
// Falcon: bow -Z, engine +Z. Iron Man: head +Y, soles -Y, chest +Z.
function createFlightEffects(kind, pivot, rig) {
  const group = new THREE.Group(); group.name = 'model-attached-engine-effects'; pivot.add(group);
  const engineMaterials = [], glowSprites = [];
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 96;
  const ctx = glowCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
  gradient.addColorStop(0, 'rgba(235,254,255,1)'); gradient.addColorStop(.12, 'rgba(178,242,255,.95)');
  gradient.addColorStop(.35, 'rgba(39,153,255,.4)'); gradient.addColorStop(1, 'rgba(12,91,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 96, 96);
  const glowMap = new THREE.CanvasTexture(glowCanvas);
  function glow(position, size, strength = 1, parent = group) {
    const material = new THREE.SpriteMaterial({ map: glowMap, color: 0xc7f6ff, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const sprite = new THREE.Sprite(material); sprite.position.copy(position); sprite.scale.setScalar(size);
    sprite.userData.baseSize = size; sprite.userData.strength = strength; parent.add(sprite); glowSprites.push(sprite); return sprite;
  }
  function plumeMaterial(axis) {
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uThrust: { value: .3 }, uAxis: { value: axis } },
      vertexShader: `uniform float uThrust;uniform float uAxis;varying vec2 vUv;
        void main(){vUv=uv;vec3 p=position;
          if(uAxis<0.5){p.z+=uv.y*(0.12+uThrust*0.75);p.y+=sin(uv.y*3.14159)*0.025;}
          else{p.y*=0.24+uThrust*0.9;p.xz*=0.8+uThrust*0.3;}
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
      fragmentShader: `uniform float uTime;uniform float uThrust;uniform float uAxis;varying vec2 vUv;
        void main(){float along=uAxis<0.5?vUv.y:1.0-vUv.y;
          float edge=uAxis<0.5?pow(max(0.0,sin(vUv.x*3.14159)),0.6):0.7;
          float flow=0.82+0.18*sin(along*28.0-uTime*16.0+vUv.x*12.0);
          float falloff=pow(1.0-along,1.7);float alpha=edge*falloff*flow*(0.10+uThrust*0.66);
          vec3 blue=mix(vec3(0.08,0.39,1.0),vec3(0.67,0.93,1.0),pow(1.0-along,5.0));
          gl_FragColor=vec4(blue,alpha);}`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false
    });
    engineMaterials.push(material); return material;
  }
  if (kind === 'falcon') {
    const points = [];
    for (let i = 0; i <= 48; i++) {
      const angle = -0.76 + i / 48 * 1.52;
      points.push(new THREE.Vector3(Math.sin(angle) * 1.45 + .005, -.045, .20 + Math.cos(angle) * 1.45));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const core = new THREE.Mesh(new THREE.TubeGeometry(curve, 72, .024, 8, false), new THREE.MeshBasicMaterial({ color: 0xbbefff, toneMapped: false }));
    const halo = new THREE.Mesh(new THREE.TubeGeometry(curve, 72, .050, 8, false), new THREE.MeshBasicMaterial({ color: 0x369aff, transparent: true, opacity: .36, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    group.add(core, halo);
    const positions = [], uvs = [], indices = [];
    for (let i = 0; i <= 48; i++) {
      const p = points[i];
      for (let j = 0; j <= 8; j++) {
        const t = j / 8;
        positions.push(p.x * (1 + t * .10), p.y, p.z);
        uvs.push(i / 48, t);
        if (i < 48 && j < 8) { const a = i * 9 + j; indices.push(a, a + 9, a + 1, a + 1, a + 9, a + 10); }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices);
    const material = plumeMaterial(0);
    for (const offset of [-.025, .025]) { const plume = new THREE.Mesh(geometry, material); plume.position.y = offset; plume.frustumCulled = false; group.add(plume); }
    for (let i = 6; i < 48; i += 9) glow(points[i], .38, .48);
    group.userData.updateCore = throttle => { core.material.color.setRGB(.38 + throttle * .45, .65 + throttle * .3, 1); halo.material.opacity = .15 + throttle * .38; };
  } else {
    function jet(socket, radius, length) {
      const geometry = new THREE.CylinderGeometry(radius * .42, radius, length, 16, 8, true); geometry.translate(0, -length / 2, 0);
      const plume = new THREE.Mesh(geometry, plumeMaterial(1)); plume.frustumCulled = false; plume.userData.engineEffect = true; socket.add(plume);
      const source = new THREE.Mesh(new THREE.CircleGeometry(radius * .48, 24), new THREE.MeshBasicMaterial({ color: 0xd6faff, side: THREE.DoubleSide, toneMapped: false }));
      source.rotation.x = Math.PI / 2; source.position.y = -.004; source.userData.engineEffect = true; socket.add(source);
      glow(new THREE.Vector3(), radius * 4.2, .9, socket);
    }
    for (const side of ['Left', 'Right']) {
      const socket = rig?.footSocket(side);
      if (socket) jet(socket, .083, .82);
    }
    // Eye, chest and palm light comes from the artist's emissive geometry and mask.
  }
  return {
    group,
    update(time, throttle, moving) {
      const thrust = THREE.MathUtils.clamp(throttle, 0, 1);
      for (const material of engineMaterials) { material.uniforms.uTime.value = moving ? time : 0; material.uniforms.uThrust.value = thrust; }
      for (const sprite of glowSprites) { sprite.material.opacity = (.22 + thrust * .65) * sprite.userData.strength; sprite.scale.setScalar(sprite.userData.baseSize * (.8 + thrust * .25)); }
      group.userData.updateCore?.(thrust);
    }
  };
}

/**
 * await Portfolio3D.mount(element, 'ironman'|'falcon'|'dragon', options) -> cleanup function.
 * options: interactive, signal, onReady({ kind, label, source, animationClips, firstFrameRendered }), onError(error).
 * Returned cleanup.setFlightState({throttle:0..1, bank, pitch, heading, yaw}) drives engines/attitude.
 * Angles are radians. Heading is clockwise from screen-right for Falcon, screen-up for Iron Man,
 * and screen-left for the dragon. The dragon has articulated wings, neck and tail, with no jet effects.
 * Bank rolls about the model's long axis.
 * The host needs nonzero width/height. Interactive: drag/arrow keys rotate; +/- zoom; Home resets.
 * Honors reduced motion, portfolio:motionchange, page visibility and viewport intersection.
 * No external network requests, shared global THREE, audio, or self-starting flyby traversal.
 */
export async function mount(container, kind, options = {}) {
  if (!(container instanceof HTMLElement)) throw new TypeError('A model container element is required.');
  if (!assets[kind]) throw new Error(`No local 3D model configured for ${kind}.`);
  if (options.signal?.aborted) return () => {};
  const loading = new AbortController();
  delete container.dataset.modelReady;
  const interactive = options.interactive === true;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = kind === 'falcon' ? .88 : 1;
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
  scene.environmentIntensity = kind === 'ironman' ? .95 : 0.6;

  let disposed = false, ready = false, frame = 0, last = 0, time = 0;
  let inView = true, width = 0, height = 0, zoom = 1;
  let yaw = 0, pitch = 0, drag = null;
  let effects = null, rig = null, flightControlled = false;
  const flight = { throttle: interactive ? .13 : .6, bank: 0, pitch: 0, heading: 0, yaw: 0 };
  const flightTarget = { ...flight };
  let fitPoints = null;
  const fitPoint = new THREE.Vector3();
  const fitRotation = new THREE.Matrix4();
  const attitude = new THREE.Euler(), turnRotation = new THREE.Euler();
  const turnQuaternion = new THREE.Quaternion(), headingQuaternion = new THREE.Quaternion();
  const headingAxis = new THREE.Vector3(0, 0, 1);
  const base = kind === 'falcon'
    ? new THREE.Euler(0.48, -0.65, -0.10)
    : kind === 'dragon' ? new THREE.Euler(.30, -.06, -.015, 'ZYX')
    : new THREE.Euler(interactive ? 0 : -0.07, -.30, 0, 'ZYX');
  const motion = () => !preference.matches && document.documentElement.dataset.motion !== 'off';
  const visible = () => !document.hidden && inView && container.isConnected;
  // Warm the canvas at its real fitted dimensions even while its entrance position is offscreen.
  // An intersection-gated "ready" previously let a cue run before any shader or pixel was drawn.
  function draw(force = false) {
    if (disposed || !ready || !container.isConnected || (!force && !visible())) return false;
    renderer.render(scene, camera);
    return true;
  }
  function pose() {
    const moving = motion();
    const drift = moving && !flightControlled;
    attitude.set(base.x + pitch + (drift ? Math.sin(time * .65) * .035 : 0),
      base.y + yaw + (drift ? Math.sin(time * .38) * .12 : 0),
      base.z + (drift ? Math.sin(time * .55) * .025 : 0), base.order);
    pivot.quaternion.setFromEuler(attitude);
    if (moving && flightControlled) {
      // Heading is camera-space, whereas roll and pitch are local to the actual aircraft/body.
      turnRotation.set(kind === 'dragon' ? flight.bank : flight.pitch,
        flight.yaw + (kind === 'ironman' ? flight.bank : 0),
        kind === 'falcon' ? flight.bank : kind === 'dragon' ? flight.pitch : 0, 'YXZ');
      pivot.quaternion.multiply(turnQuaternion.setFromEuler(turnRotation));
      pivot.quaternion.premultiply(headingQuaternion.setFromAxisAngle(headingAxis, -flight.heading));
    }
    pivot.position.y = drift ? Math.sin(time * 0.9) * 0.065 : 0;
    rig?.update(time, flight, moving);
    effects?.update(time, flight.throttle, moving);
  }
  function resize(render = true) {
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
    camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); if (render !== false) draw();
  }
  function tick(now) {
    frame = 0;
    if (disposed || !ready || !visible() || !motion()) { last = 0; return; }
    const dt = last ? Math.min(Math.max((now - last) / 1000, 0), 1) : 0;
    time += dt;
    const ease = 1 - Math.exp(-dt * 9);
    flight.throttle += (flightTarget.throttle - flight.throttle) * ease;
    flight.bank += (flightTarget.bank - flight.bank) * ease;
    flight.pitch += (flightTarget.pitch - flight.pitch) * ease;
    flight.heading += (flightTarget.heading - flight.heading) * ease;
    flight.yaw += (flightTarget.yaw - flight.yaw) * ease;
    last = now; pose(); draw(); frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (disposed) return;
    if (!container.isConnected) { cleanup(); return; }
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
    const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set();
    object.traverse(child => {
      if (child.geometry) geometries.add(child.geometry);
      if (child.skeleton) skeletons.add(child.skeleton);
      for (const material of [].concat(child.material || [])) {
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    textures.forEach(texture => { texture.dispose(); texture.source?.data?.close?.(); });
    skeletons.forEach(skeleton => skeleton.dispose());
  }
  function cleanup() {
    if (disposed) return;
    disposed = true; if (frame) cancelAnimationFrame(frame);
    loading.abort();
    resizeObserver.disconnect(); observer.disconnect();
    document.removeEventListener('visibilitychange', sync);
    document.removeEventListener('portfolio:motionchange', sync);
    preference.removeEventListener('change', sync);
    options.signal?.removeEventListener('abort', cleanup);
    delete container.dataset.modelReady;
    disposeObject(pivot); envTarget.dispose();key.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  }
  cleanup.setFlightState = state => {
    if (disposed || !state) return;
    flightControlled = true;
    if (Number.isFinite(state.throttle)) flightTarget.throttle = THREE.MathUtils.clamp(state.throttle, 0, 1);
    if (Number.isFinite(state.bank)) flightTarget.bank = THREE.MathUtils.clamp(state.bank, -.65, .65);
    if (Number.isFinite(state.pitch)) flightTarget.pitch = THREE.MathUtils.clamp(state.pitch, -.45, .45);
    if (Number.isFinite(state.heading)) flightTarget.heading = THREE.MathUtils.clamp(state.heading, -.65, .65);
    if (Number.isFinite(state.yaw)) flightTarget.yaw = THREE.MathUtils.clamp(state.yaw, -.4, .4);
    if (!motion()) { flight.throttle = flightTarget.throttle; pose(); draw(); }
  };
  options.signal?.addEventListener('abort', cleanup, { once: true });
  try {
    let gltf;
    if (kind === 'dragon') gltf = createCaraxes();
    else {
      await MeshoptDecoder.ready;
      if (disposed) return cleanup;
      const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
      const modelURL = new URL(`../models/${assets[kind].file}`, import.meta.url);
      const response = await fetch(modelURL, { signal: loading.signal });
      if (!response.ok) throw new Error(`Model request failed (${response.status}).`);
      const bytes = await response.arrayBuffer();
      if (disposed || !container.isConnected) { cleanup(); return cleanup; }
      gltf = await loader.parseAsync(bytes, new URL('.', modelURL).href);
    }
    if (disposed || !container.isConnected) { disposeObject(gltf.scene); cleanup(); return cleanup; }
    const bounds = new THREE.Box3().setFromObject(gltf.scene);
    const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    if (!Number.isFinite(size.length()) || size.length() === 0) throw new Error('Model has no visible geometry.');
    const normalized = new THREE.Group();
    gltf.scene.position.sub(center); normalized.add(gltf.scene);
    normalized.scale.setScalar(3.25 / Math.max(size.x, size.y, size.z));
    pivot.add(normalized);
    pivot.updateMatrixWorld(true);
    rig = kind === 'ironman' ? createSuitRig(gltf.scene, normalized, interactive) : gltf.rig || null;
    // Build sockets in the bind pose, then move the bones before fitting the camera.
    effects = kind === 'dragon' ? null : createFlightEffects(kind, pivot, rig);
    rig?.update(0, flight, false);
    const samples = [];
    pivot.updateMatrixWorld(true);
    const inversePivot = new THREE.Matrix4().copy(pivot.matrixWorld).invert();
    gltf.scene.traverse(child => {
      if (!child.isMesh) return;
      if (child.userData.engineEffect) return;
      const materials = [].concat(child.material || []);
      // The author's invisible glass cover must not occlude the reactor in a depth/shadow pass.
      if (materials.length && materials.every(material => material.transparent && material.opacity === 0)) {
        child.visible = false; child.castShadow = false; child.receiveShadow = false; return;
      }
      child.frustumCulled = !child.isSkinnedMesh;
      child.castShadow=true;child.receiveShadow=true;
      for (const material of materials) {
        // Imported normal/metalness/roughness maps remain in their glTF-defined color spaces.
        // Scene.environmentIntensity controls these materials because they have no own envMap.
        if (kind === 'ironman' && material.name === 'Lights') material.emissiveIntensity = 1.7;
      }
      const positions = child.geometry.getAttribute('position');
      const step = Math.max(1, Math.floor(positions.count / 1800));
      for (let i = 0; i < positions.count; i += step) {
        child.getVertexPosition(i, fitPoint).applyMatrix4(child.matrixWorld).applyMatrix4(inversePivot);
        samples.push(fitPoint.x, fitPoint.y, fitPoint.z);
      }
    });
    if (!interactive) {
      if (kind === 'falcon') samples.push(-.7, -.05, 2.25, .7, -.05, 2.25);
      else normalized.traverse(child => {
        if (!child.name.endsWith('-boot-thruster')) return;
        fitPoint.set(0, -.95, 0).applyMatrix4(child.matrixWorld).applyMatrix4(inversePivot);
        samples.push(fitPoint.x, fitPoint.y, fitPoint.z);
      });
    }
    if (kind === 'dragon') {
      // Include the changing wingspan in one stable camera fit; never zoom the camera with each flap.
      for (const sampleTime of [.7, 1.4, 2.1]) {
        rig.update(sampleTime, { ...flight, throttle: 1 }, true); pivot.updateMatrixWorld(true);
        gltf.scene.traverse(child => {
          if (!child.isMesh) return;
          const positions = child.geometry.getAttribute('position');
          const step = Math.max(1, Math.floor(positions.count / 200));
          for (let i = 0; i < positions.count; i += step) {
            child.getVertexPosition(i, fitPoint).applyMatrix4(child.matrixWorld).applyMatrix4(inversePivot);
            samples.push(fitPoint.x, fitPoint.y, fitPoint.z);
          }
        });
      }
    }
    fitPoints = new Float32Array(samples);
    pose(); resize(false);
    // compileAsync uses KHR_parallel_shader_compile where available. Resolve only after the
    // populated scene has actually rendered, so callers can begin entrance effects afterwards.
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
    if (disposed || !container.isConnected) { cleanup(); return cleanup; }
    ready = true;
    if (!draw(true)) throw new Error('The model could not draw its first frame.');
    container.dataset.modelReady = 'true';
    sync();
    options.onReady?.({ kind, label: assets[kind].label, source: assets[kind].source,
      animationClips: gltf.animations.length, bones: rig?.boneCount || 0, firstFrameRendered: true });
    return cleanup;
  } catch (error) {
    const cancelled = disposed || loading.signal.aborted;
    cleanup();
    if (cancelled) return cleanup;
    options.onError?.(error); throw error;
  }
}

window.Portfolio3D = Object.freeze({ mount, assets });
