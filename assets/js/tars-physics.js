/* Small articulated-body solver. Motors request angles; gravity, spring torque and floor constraints resolve motion. */
export const TARS_DIMENSIONS = Object.freeze({ width: .43, depth: .48, length: 2.6, aboveJoint: .3, belowJoint: 2.3, spacing: .475 });
export const TARS_STEP = 1 / 120;
const GRAVITY = 9.81, MASS = 11, JOINT_INERTIA = 2.8;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const ease = value => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };

export function createTarsState() {
  return {
    time: 0, accumulator: 0, action: 'idle', actionTime: 0, actionDuration: 0,
    position: { x: 0, y: TARS_DIMENSIONS.belowJoint, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    roll: 0, pitch: 0, rollVelocity: 0, pitchVelocity: 0,
    joints: Array.from({ length: 4 }, (_, index) => ({ x: (index - 1.5) * TARS_DIMENSIONS.spacing, pitch: 0, roll: 0, pitchVelocity: 0, rollVelocity: 0 })),
    grounded: true, contactCount: 4, contactImpulse: 0, impacts: 0
  };
}

export function performTarsAction(state, action) {
  if (!['walk', 'wave', 'balance', 'reset', 'nudge'].includes(action)) return false;
  state.action = action; state.actionTime = 0;
  state.actionDuration = ({ walk: 4.8, wave: 3.7, balance: 3.8, reset: .8, nudge: 1.3 })[action];
  if (action === 'nudge') {
    // A real impulse, recovered by the balancing controller and ground friction.
    state.velocity.x += .43; state.velocity.z -= .16; state.rollVelocity -= .32;
  }
  return true;
}

function rotate(point, pitch, roll) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  const y = point.y * cp - point.z * sp, z = point.y * sp + point.z * cp;
  return { x: point.x * cr - y * sr, y: point.x * sr + y * cr, z };
}

/** Lowest world-space sole corner per column; shared by the solver and validation. */
export function getTarsContacts(state) {
  const d = TARS_DIMENSIONS;
  return state.joints.map((joint, index) => {
    let lowest = { y: Infinity };
    for (const x of [-d.width / 2, d.width / 2]) for (const z of [-d.depth / 2, d.depth / 2]) {
      const local = rotate({ x, y: -d.belowJoint, z }, joint.pitch, joint.roll);
      local.x += joint.x;
      const point = rotate(local, state.pitch, state.roll);
      point.x += state.position.x; point.y += state.position.y; point.z += state.position.z;
      if (point.y < lowest.y) lowest = point;
    }
    return { ...lowest, index };
  });
}

function motorTargets(state) {
  const joints = Array.from({ length: 4 }, () => ({ pitch: 0, roll: 0 }));
  const t = state.actionTime, duration = state.actionDuration;
  const envelope = ease(t / .55) * ease((duration - t) / .65);
  let roll = 0, pitch = 0, speed = 0;
  if (state.action === 'walk') {
    // This is a motor command, not the rendered angle. Each hinge integrates its own torque and inertia.
    const phase = t * Math.PI * 2 / 1.3;
    joints.forEach((joint, index) => { joint.pitch = Math.sin(phase + (index % 2 ? Math.PI : 0)) * .27 * envelope; });
    roll = Math.sin(phase) * .025 * envelope; pitch = -.025 * envelope; speed = .13 * envelope;
  } else if (state.action === 'wave') {
    joints[0].roll = -1.13 * envelope;
    joints[0].pitch = (.06 + Math.sin(t * 5.7) * .14) * envelope;
    joints[3].roll = .10 * envelope;
    roll = .09 * envelope;
  } else if (state.action === 'balance') {
    joints[0].roll = -.43 * envelope; joints[3].roll = .43 * envelope;
    joints[1].pitch = -.08 * envelope; joints[2].pitch = .08 * envelope;
    roll = .12 * Math.sin(t * 1.5) * envelope;
  }
  return { joints, roll, pitch, speed };
}

/** Semi-implicit integration plus unilateral floor contact projection; dt must be <= 1/60 s. */
export function stepTarsPhysics(state, dt = TARS_STEP) {
  if (!(Number.isFinite(dt) && dt > 0 && dt <= 1 / 60 + 1e-9)) throw new RangeError('Use a positive physics step no larger than 1/60 second.');
  state.time += dt; state.actionTime += dt;
  if (state.actionTime >= state.actionDuration) state.action = 'idle';
  const target = motorTargets(state);
  for (let i = 0; i < state.joints.length; i++) {
    const joint = state.joints[i];
    for (const axis of ['pitch', 'roll']) {
      const velocityKey = `${axis}Velocity`, angle = joint[axis], velocity = joint[velocityKey];
      const requested = target.joints[i][axis];
      const gravityTorque = -15.5 * Math.sin(angle);
      const motorTorque = 88 * (requested - angle) - 25 * velocity + 15.5 * Math.sin(requested);
      joint[velocityKey] += (motorTorque + gravityTorque) / JOINT_INERTIA * dt;
      joint[velocityKey] = clamp(joint[velocityKey], -2.8, 2.8);
      joint[axis] += joint[velocityKey] * dt;
      const limit = axis === 'roll' ? 1.35 : .5;
      if (Math.abs(joint[axis]) > limit) { joint[axis] = clamp(joint[axis], -limit, limit); joint[velocityKey] *= -.06; }
    }
  }
  const before = getTarsContacts(state);
  const supported = before.filter(contact => contact.y < .025);
  const supportCenter = supported.length ? supported.reduce((sum, point) => sum + point.x, 0) / supported.length : state.position.x;
  // Bounded ankle/hip balancing torque reacts to a changing support polygon.
  const supportError = clamp(state.position.x - supportCenter, -.28, .28);
  state.rollVelocity += ((target.roll - state.roll) * 39 - state.rollVelocity * 10 - supportError * 3.2) * dt;
  state.pitchVelocity += ((target.pitch - state.pitch) * 36 - state.pitchVelocity * 10) * dt;
  state.roll = clamp(state.roll + state.rollVelocity * dt, -.22, .22);
  state.pitch = clamp(state.pitch + state.pitchVelocity * dt, -.18, .18);

  const frictionLimit = supported.length ? GRAVITY * .62 : .2;
  const ax = clamp(-state.position.x * 8 - state.velocity.x * 5.8, -frictionLimit, frictionLimit);
  const az = clamp((target.speed - state.velocity.z) * 5.5 - state.position.z * 2.3, -frictionLimit, frictionLimit);
  state.velocity.x += ax * dt; state.velocity.z += az * dt;
  state.velocity.y -= GRAVITY * dt;
  state.position.x += state.velocity.x * dt;
  state.position.y += state.velocity.y * dt;
  state.position.z += state.velocity.z * dt;

  const contacts = getTarsContacts(state), lowest = Math.min(...contacts.map(contact => contact.y));
  state.contactImpulse = 0; state.grounded = lowest <= .00001;
  if (lowest < 0) {
    // Non-penetration is a constraint, not a sine-based vertical bob. Gravity supplies the incoming momentum.
    state.position.y -= lowest;
    if (state.velocity.y < 0) {
      state.contactImpulse = -state.velocity.y * MASS;
      if (state.velocity.y < -.25) state.impacts++;
      state.velocity.y = 0;
    }
  }
  state.contactCount = contacts.filter(contact => contact.y - Math.min(0, lowest) < .025).length;
  return state;
}

/** Fixed substeps make the same input deterministic at different rendering frame rates. */
export function advanceTarsPhysics(state, elapsed) {
  if (!Number.isFinite(elapsed) || elapsed <= 0) return 0;
  state.accumulator += Math.min(elapsed, 1);
  let steps = 0;
  while (state.accumulator + 1e-10 >= TARS_STEP) {
    stepTarsPhysics(state, TARS_STEP); state.accumulator -= TARS_STEP; steps++;
  }
  return steps;
}

export function isTarsSettled(state) {
  return state.action === 'idle' && Math.abs(state.position.x) < .006 && Math.abs(state.position.z) < .006
    && Math.abs(state.velocity.x) + Math.abs(state.velocity.y) + Math.abs(state.velocity.z) < .008
    && Math.abs(state.roll) + Math.abs(state.pitch) + Math.abs(state.rollVelocity) + Math.abs(state.pitchVelocity) < .009
    && state.joints.every(joint => Math.abs(joint.pitch) + Math.abs(joint.roll) + Math.abs(joint.pitchVelocity) + Math.abs(joint.rollVelocity) < .012);
}
