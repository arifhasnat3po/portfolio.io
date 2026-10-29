/* Original stylized Caraxes-inspired geometry, made for this portfolio.
 * No movie still, third-party mesh, texture download, or animation dependency.
 * Anatomical forward is -X, up is +Y, and the camera-facing flank is +Z.
 */
import * as THREE from '../vendor/cameo-three/three.module.js';

export function createCaraxes() {
  const scene = new THREE.Group(); scene.name = 'original-articulated-red-dragon';
  const hide = new THREE.MeshStandardMaterial({ color: 0x862b28, roughness: .61, metalness: .05 });
  const ridge = new THREE.MeshStandardMaterial({ color: 0x3d171b, roughness: .72, metalness: .02 });
  const belly = new THREE.MeshStandardMaterial({ color: 0xbb6550, roughness: .75 });
  const horn = new THREE.MeshStandardMaterial({ color: 0x442b27, roughness: .58 });
  const membrane = new THREE.MeshStandardMaterial({ color: 0x9f352c, roughness: .79, side: THREE.DoubleSide });
  const vein = new THREE.MeshStandardMaterial({ color: 0x571e20, roughness: .67 });
  const eye = new THREE.MeshBasicMaterial({ color: 0xffbe45, toneMapped: false });
  const pupil = new THREE.MeshBasicMaterial({ color: 0x0b0504 });
  const mouth = new THREE.MeshStandardMaterial({ color: 0x190d10, roughness: .92 });
  const tooth = new THREE.MeshStandardMaterial({ color: 0xcfc0a0, roughness: .47 });
  const sphere = new THREE.SphereGeometry(1, 18, 12);
  const yAxis = new THREE.Vector3(0, 1, 0);
  const vector = p => new THREE.Vector3(...p);
  function ellipsoid(parent, position, scale, material = hide) {
    const mesh = new THREE.Mesh(sphere, material); mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh); return mesh;
  }
  function rod(parent, start, end, radius, material = hide, tip = radius * .73) {
    const a = vector(start), b = vector(end), d = b.clone().sub(a);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(tip, radius, d.length(), 8), material);
    mesh.position.copy(a.add(b).multiplyScalar(.5)); mesh.quaternion.setFromUnitVectors(yAxis, d.normalize()); parent.add(mesh); return mesh;
  }
  function swept(parent, points, radius, material, segments = 16) {
    const curve = new THREE.CatmullRomCurve3(points.map(vector));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 7, false), material); parent.add(mesh); return mesh;
  }
  function spike(parent, start, end, radius = .065, material = horn) { return rod(parent, start, end, radius, material, .003); }

  // Continuous weighted skin: each ring blends two genuine joints, rather than a row of disconnected beads.
  function spine(points, radii, name) {
    const curve = new THREE.CatmullRomCurve3(points.map(vector));
    const count = (points.length - 1) * 9, sides = 12, frames = curve.computeFrenetFrames(count, false);
    const positions = [], normals = [], uv = [], joints = [], weights = [], indices = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count, joint = Math.min(points.length - 2, Math.floor(t * (points.length - 1)));
      const blend = t * (points.length - 1) - joint;
      const radius = THREE.MathUtils.lerp(radii[joint], radii[joint + 1], blend), p = curve.getPointAt(t);
      for (let j = 0; j <= sides; j++) {
        const a = j / sides * Math.PI * 2;
        const n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
        positions.push(p.x + n.x * radius, p.y + n.y * radius, p.z + n.z * radius);
        normals.push(n.x, n.y, n.z); uv.push(t * 5, j / sides);
        joints.push(joint, joint + 1, 0, 0); weights.push(1 - blend, blend, 0, 0);
        if (i < count && j < sides) { const k = i * (sides + 1) + j; indices.push(k, k + sides + 1, k + 1, k + 1, k + sides + 1, k + sides + 2); }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(joints, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4)); geometry.setIndex(indices);
    const bones = points.map((p, i) => {
      const bone = new THREE.Bone(); bone.name = `${name}-${i}`;
      bone.position.copy(vector(p)); if (i) bone.position.sub(vector(points[i - 1])); return bone;
    });
    bones.forEach((bone, i) => { if (i) bones[i - 1].add(bone); });
    const mesh = new THREE.SkinnedMesh(geometry, hide); mesh.name = `${name}-continuous-skin`; mesh.add(bones[0]);
    scene.add(mesh); mesh.bind(new THREE.Skeleton(bones)); mesh.frustumCulled = false;
    return bones;
  }

  ellipsoid(scene, [0, .12, 0], [1.08, .38, .42]);
  ellipsoid(scene, [-.42, .14, 0], [.61, .42, .48]);
  ellipsoid(scene, [.13, -.11, .02], [.85, .22, .35], belly);
  // Overlapping ventral plates and the ridged dorsal line add readable volume in grazing light.
  for (let i = 0; i < 10; i++) {
    const x = -.65 + i * .16;
    ellipsoid(scene, [x, -.18, 0], [.105, .07, .29 - Math.abs(x) * .07], i % 2 ? belly : hide);
    spike(scene, [x, .43 - Math.abs(x) * .12, 0], [x + .14, .64 - Math.abs(x) * .13, 0], .062, ridge);
  }
  const neck = spine([[-.68, .22, 0], [-1.22, .29, 0], [-1.76, .48, .025], [-2.25, .78, .06], [-2.72, 1.02, .045], [-3.18, 1.12, 0]], [.29, .26, .22, .18, .145, .12], 'neck');
  const tail = spine([[.78, .12, 0], [1.38, .08, -.03], [2.05, .02, -.11], [2.75, .02, -.23], [3.42, .14, -.33], [4.0, .34, -.3]], [.27, .21, .155, .105, .055, .006], 'tail');
  neck.slice(1).forEach((bone, i) => {
    spike(bone, [.04, .19 - i * .024, 0], [.18, .43 - i * .043, -.025], .048 - i * .005, ridge);
    for (const sign of [-1, 1]) swept(bone, [[.15, -.07, sign * (.21 - i * .02)], [0, -.16, sign * (.17 - i * .018)], [-.13, -.12, sign * (.13 - i * .015)]], .014, belly, 8);
  });
  tail.slice(0, -1).forEach((bone, i) => spike(bone, [.1, .22 - i * .038, 0], [.27, .42 - i * .065, 0], .055 - i * .008, ridge));
  const head = new THREE.Group(); head.name = 'horned-serpentine-head'; neck.at(-1).add(head);
  ellipsoid(head, [-.15, .01, 0], [.31, .16, .18]);
  ellipsoid(head, [-.43, -.045, 0], [.29, .085, .12]);
  ellipsoid(head, [-.44, -.10, 0], [.26, .018, .102], mouth);
  const jaw = new THREE.Group(); jaw.position.set(-.10, -.10, 0); head.add(jaw);
  ellipsoid(jaw, [-.27, -.035, 0], [.30, .045, .105]);
  for (const sign of [-1, 1]) {
    ellipsoid(head, [-.23, .075, sign * .153], [.060, .033, .025], eye);
    ellipsoid(head, [-.247, .077, sign * .174], [.007, .025, .009], pupil);
    rod(head, [-.35, .115, sign * .11], [-.1, .14, sign * .17], .036, ridge, .018);
    spike(head, [-.02, .11, sign * .12], [.40, .30, sign * .22], .073);
    spike(head, [.055, .015, sign * .16], [.35, .12, sign * .33], .054);
    spike(head, [-.02, -.075, sign * .15], [.18, -.03, sign * .24], .033);
    ellipsoid(head, [-.62, -.013, sign * .09], [.027, .015, .014], mouth);
    for (let i = 0; i < 5; i++) spike(head, [-.24 - i * .075, -.09, sign * (.10 - i * .006)], [-.25 - i * .075, -.14, sign * (.10 - i * .006)], .014, tooth);
  }
  spike(head, [-.18, .16, 0], [.12, .35, 0], .044, ridge);

  // A bat-like hand, with a scalloped skin between four elongated fingers. Every surface is a mesh.
  function wing(sign) {
    const root = new THREE.Group(); root.name = `${sign > 0 ? 'near' : 'far'}-wing-shoulder`;
    root.position.set(-.47, .27, sign * .28); root.scale.z = sign; scene.add(root);
    const wrist = [-.88, .08, 2.06];
    rod(root, [0, 0, 0], [-.40, .10, .86], .13, hide, .075);
    rod(root, [-.40, .10, .86], wrist, .082, hide, .047);
    ellipsoid(root, [-.40, .10, .86], [.115, .10, .12]);
    const hand = new THREE.Group(); hand.position.set(...wrist); root.add(hand);
    const tips = [[-.48, .015, 1.63], [.60, -.015, 1.38], [1.24, -.035, .63], [1.62, -.01, -.35], [1.60, -.02, -1.42]];
    tips.forEach((tip, i) => {
      const mid = [tip[0] * .43 - .04, .055, tip[2] * .55];
      swept(hand, [[0, 0, 0], mid, tip], i ? .028 : .041, hide, 14);
      if (i === 0) spike(hand, tip, [tip[0] - .08, tip[1] + .035, tip[2] + .23], .029);
    });
    // Separate curved fan panels make the trailing edge naturally concave, with inset supporting veins.
    for (let panel = 0; panel < tips.length - 1; panel++) {
      const a = vector(tips[panel]), b = vector(tips[panel + 1]);
      const p = [], colors = [], ids = [], steps = 14;
      for (let row = 0; row <= steps; row++) for (let col = 0; col <= steps; col++) {
        const u = row / steps, v = col / steps;
        const edge = a.clone().lerp(b, v).multiplyScalar(1 - .19 * Math.sin(v * Math.PI));
        const q = edge.multiplyScalar(u); q.y -= Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * .13;
        p.push(q.x, q.y, q.z);
        const warm = .63 + .23 * Math.sin(v * Math.PI) * Math.sin(u * Math.PI);
        colors.push(warm, warm * .59, warm * .50);
        if (row < steps && col < steps) { const k = row * (steps + 1) + col; ids.push(k, k + 1, k + steps + 1, k + 1, k + steps + 2, k + steps + 1); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.setIndex(ids); g.computeVertexNormals();
      const material = membrane.clone(); material.vertexColors = true;
      const mesh = new THREE.Mesh(g, material); mesh.name = 'scalloped-wing-membrane'; hand.add(mesh);
      const middle = a.clone().lerp(b, .5).multiplyScalar(.81);
      swept(hand, [[0, -.005, 0], [middle.x * .53, -.08, middle.z * .53], [middle.x, middle.y, middle.z]], .009, vein, 12);
    }
    // Inner patagium joins the hand to the ribs instead of leaving an empty gap at the shoulder.
    const inner = new THREE.BufferGeometry();
    inner.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, -.40,.10,.86, ...wrist, .72,.06,.64, 1.08,-.03,.12], 3));
    inner.setIndex([0,1,3,1,2,3,0,3,4]); inner.computeVertexNormals(); root.add(new THREE.Mesh(inner, membrane));
    spike(hand, [-.02, .02, .08], [-.29, .17, .05], .055);
    return { root, hand, sign };
  }
  const wings = [wing(-1), wing(1)];
  const legs = [];
  for (const sign of [-1, 1]) {
    const leg = new THREE.Group(); leg.name = 'tucked-hind-leg'; leg.position.set(.61, -.13, sign * .28); scene.add(leg); legs.push(leg);
    ellipsoid(leg, [.12, -.12, sign * .08], [.31, .19, .14]);
    rod(leg, [.21, -.21, sign * .1], [.62, -.34, sign * .14], .075, hide, .047);
    rod(leg, [.62, -.34, sign * .14], [.82, -.27, sign * .16], .045, hide, .029);
    for (let toe = 0; toe < 3; toe++) spike(leg, [.78, -.28, sign * .16 + (toe - 1) * .045], [1.02, -.32, sign * .16 + (toe - 1) * .075], .026);
    const web = new THREE.BufferGeometry(); web.setAttribute('position', new THREE.Float32BufferAttribute([.12,-.12,sign*.12, .62,-.34,sign*.14, .50,-.15,sign*.47], 3)); web.computeVertexNormals(); leg.add(new THREE.Mesh(web, membrane));
  }
  scene.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
  const phaseRate = 2.3;
  function update(time = 0, flight = {}, moving = true) {
    const t = moving ? time : 0, power = THREE.MathUtils.clamp(flight.throttle ?? .6, 0, 1), bank = flight.bank || 0;
    const flap = .43 + (moving ? Math.sin(t * phaseRate - .65) * (.35 + power * .12) : .13);
    for (const { root, hand, sign } of wings) {
      root.rotation.x = -sign * flap;
      root.rotation.y = sign * (.06 + Math.cos(t * phaseRate - 1.05) * (moving ? .07 : 0));
      hand.rotation.y = -.12 + (moving ? Math.sin(t * phaseRate - 1.15) * .12 : 0);
      hand.rotation.x = -sign * bank * .10;
    }
    neck.forEach((bone, i) => {
      bone.rotation.z = (moving ? Math.sin(t * .95 - i * .38) * .022 : 0) + (flight.pitch || 0) * .05;
      bone.rotation.y = moving ? Math.sin(t * .72 - i * .45) * .018 : 0;
    });
    tail.forEach((bone, i) => {
      bone.rotation.y = (moving ? Math.sin(t * 1.25 - i * .62) * (.045 + i * .012) : 0) - bank * .04;
      bone.rotation.z = moving ? Math.sin(t * .9 - i * .5) * .022 : 0;
    });
    head.rotation.z = moving ? Math.sin(t * .8) * -.024 : 0;
    jaw.rotation.z = moving ? .025 + Math.sin(t * .62) * .018 : .018;
    legs.forEach((leg, i) => { leg.rotation.z = moving ? Math.sin(t * phaseRate - i * .4) * .035 : 0; });
    scene.updateMatrixWorld(true);
  }
  update(0, {}, false);
  return { scene, animations: [], rig: { update, boneCount: neck.length + tail.length },
    attribution: 'Original stylized Caraxes-inspired procedural model created for this portfolio; not an official film asset.' };
}
