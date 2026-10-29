/* Inertial flight control for decorative visitors. The renderer owns the ship; this owns its travel. */
(() => {
  'use strict';

  const FIXED_STEP = 1 / 120;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const smooth = (low, high, value) => {
    const t = clamp((value - low) / (high - low), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const approach = (current, target, response, dt) => current + (target - current) * (1 - Math.exp(-response * dt));
  const ascentLane = (viewportWidth, width) => viewportWidth * (viewportWidth < 700 ? .66 : .74) - width / 2;

  function createState(kind, viewportWidth, viewportHeight, width, height) {
    const duration = kind === 'ironman' ? 14 : 20;
    if (kind === 'ironman') {
      const speed = (viewportHeight + height * 2 + 130) / (duration * 1.08);
      return {
        kind, duration, width, height, viewportWidth, viewportHeight,
        age: 0, x: ascentLane(viewportWidth, width), y: viewportHeight + height * .6 + 40,
        vx: 0, vy: -speed * .55, ax: 0, ay: 0, speed,
        bank: 0, pitch: 0, heading: 0, yaw: 0, throttle: .56, scale: .83,
        maxForwardAcceleration: speed * 1.2,
        maxLateralAcceleration: clamp(viewportWidth * .06, 24, 70),
        maxLateralSpeed: clamp(viewportWidth * .08, 30, 100)
      };
    }
    const speed = (viewportWidth + width * 2 + 130) / (duration * 1.08);
    return {
      kind, duration, width, height, viewportWidth, viewportHeight,
      age: 0, x: -width - 70, y: viewportHeight * .43,
      vx: speed * .68, vy: -viewportHeight * .012,
      ax: 0, ay: 0, speed,
      altitudeTarget: viewportHeight * .34,
      bank: 0, pitch: 0, heading: 0, yaw: 0, throttle: .46, scale: .83,
      maxForwardAcceleration: speed * 1.2,
      maxLateralAcceleration: clamp(viewportHeight * .085, 44, 100),
      maxLateralSpeed: clamp(viewportHeight * .1, 50, 120)
    };
  }

  function stepAscent(state, dt) {
    state.age += dt;
    const progress = state.age / state.duration;
    const departure = smooth(.76, .98, progress);
    let targetSpeed = state.speed * (.72 + .3 * smooth(0, .18, progress) + 2.7 * departure);
    if (progress > .76) {
      const remaining = Math.max(.3, state.duration - state.age);
      const distance = state.y + state.height * .6 + 40;
      targetSpeed = Math.max(targetSpeed, clamp(distance / remaining * 1.15, state.speed, state.speed * 5));
    }
    const requestedAy = clamp((-targetSpeed - state.vy) * 1.35,
      -state.maxForwardAcceleration, state.maxForwardAcceleration * .48);
    // Hold a vertical column. Only a viewport resize requires sideways correction.
    const targetVx = clamp((ascentLane(state.viewportWidth, state.width) - state.x) * .72,
      -state.maxLateralSpeed, state.maxLateralSpeed);
    const requestedAx = clamp((targetVx - state.vx) * 1.9,
      -state.maxLateralAcceleration, state.maxLateralAcceleration);
    state.ay += clamp(requestedAy - state.ay, -state.maxForwardAcceleration * 2.4 * dt, state.maxForwardAcceleration * 2.4 * dt);
    state.ax += clamp(requestedAx - state.ax, -state.maxLateralAcceleration * 2.1 * dt, state.maxLateralAcceleration * 2.1 * dt);
    state.vy += state.ay * dt;
    state.vx += state.ax * dt;
    state.y += state.vy * dt;
    state.x += state.vx * dt;
    // Heading is measured from screen-up for the upright suit, not from screen-right.
    const course = Math.atan2(state.vx, Math.max(20, -state.vy));
    state.heading = approach(state.heading, clamp(course, -.22, .22), 4.1, dt);
    state.bank = approach(state.bank, clamp(-state.ax / state.maxLateralAcceleration * .1, -.1, .1), 4.3, dt);
    state.pitch = approach(state.pitch, clamp(state.ay / state.maxForwardAcceleration * .06, -.06, .06), 3.5, dt);
    state.yaw = approach(state.yaw, 0, 2.4, dt);
    const thrust = Math.hypot(Math.max(0, -state.ay) / state.maxForwardAcceleration,
      state.ax / state.maxLateralAcceleration * .2);
    state.throttle = approach(state.throttle, clamp(.48 + thrust * .4 + departure * .12, 0, 1), 5, dt);
    state.scale = approach(state.scale, .83 - departure * .045, 1.4, dt);
    return state;
  }

  /* Autopilot specifies altitude and speed, never position. Bounded thrust changes velocity. */
  function step(state, dt) {
    if (state.kind === 'ironman') return stepAscent(state, dt);
    state.age += dt;
    const progress = state.age / state.duration;
    const height = state.viewportHeight;
    let altitude;
    if (progress < .24) altitude = .34;
    else if (progress < .47) altitude = .19;
    else if (progress < .70) altitude = .43;
    else if (progress < .84) altitude = .27;
    else altitude = .15;
    state.altitudeTarget = approach(state.altitudeTarget, height * altitude, 1.15, dt);

    let speedMultiplier;
    if (progress < .18) speedMultiplier = .72 + .3 * smooth(0, .18, progress);
    else if (progress < .76) speedMultiplier = 1.02;
    else speedMultiplier = 1.02 + 2.7 * smooth(.76, .98, progress);
    let targetSpeed = state.speed * speedMultiplier;
    if (progress > .76) {
      // The exit burn also compensates for viewport growth without moving the ship instantaneously.
      const remaining = Math.max(.3, state.duration - state.age);
      const distance = state.viewportWidth + state.width * .35 + 30 - state.x;
      targetSpeed = Math.max(targetSpeed, clamp(distance / remaining * 1.15, state.speed, state.speed * 5));
    }

    const requestedAx = clamp((targetSpeed - state.vx) * 1.35,
      -state.maxForwardAcceleration * .48, state.maxForwardAcceleration);
    const targetVy = clamp((state.altitudeTarget - state.y) * .72,
      -state.maxLateralSpeed, state.maxLateralSpeed);
    const requestedAy = clamp((targetVy - state.vy) * 1.9,
      -state.maxLateralAcceleration, state.maxLateralAcceleration);

    // Thrusters spool up: a bounded jerk keeps turns and departure burns from snapping.
    state.ax += clamp(requestedAx - state.ax, -state.maxForwardAcceleration * 2.4 * dt, state.maxForwardAcceleration * 2.4 * dt);
    state.ay += clamp(requestedAy - state.ay, -state.maxLateralAcceleration * 2.1 * dt, state.maxLateralAcceleration * 2.1 * dt);
    state.vx += state.ax * dt;
    state.vy += state.ay * dt;
    state.x += state.vx * dt;
    state.y += state.vy * dt;

    const course = Math.atan2(state.vy, Math.max(20, state.vx));
    const rollLimit = state.kind === 'falcon' ? .62 : .34;
    const targetBank = clamp(-state.ay / state.maxLateralAcceleration * rollLimit, -rollLimit, rollLimit);
    // A slight nose-up attitude under acceleration reads as thrust, independently of course and roll.
    const targetPitch = clamp(-state.ax / state.maxForwardAcceleration * .11 - course * .12, -.2, .2);
    state.bank = approach(state.bank, targetBank, 4.3, dt);
    state.pitch = approach(state.pitch, targetPitch, 3.5, dt);
    state.heading = approach(state.heading, clamp(course, -.55, .55), 4.1, dt);
    const departure = smooth(.76, .98, progress);
    const targetYaw = (state.kind === 'falcon' ? -.36 : -.2) * targetBank + departure * .14;
    state.yaw = approach(state.yaw, clamp(targetYaw, -.3, .3), 2.4, dt);
    const thrust = Math.hypot(Math.max(0, state.ax) / state.maxForwardAcceleration,
      state.ay / state.maxLateralAcceleration * .35);
    state.throttle = approach(state.throttle, clamp(.2 + thrust * .67 + departure * .15, 0, 1), 5, dt);
    const depth = .79 + clamp(state.y / height, .1, .6) * .24;
    state.scale = approach(state.scale, depth - departure * .045, 1.4, dt);
    return state;
  }

  /**
   * start(element, 'falcon'|'ironman', { setFlightState, onComplete }) -> stop()
   * The element remains in its existing fixed backdrop; its width/canvas are untouched.
   * stop() is idempotent and does not invoke onComplete. Natural or visibility/motion exits do.
   */
  function start(element, kind, options = {}) {
    if (!element?.style || !['falcon', 'ironman'].includes(kind)) return () => {};
    const viewport = () => ({
      width: Math.max(1, document.documentElement.clientWidth || window.innerWidth),
      height: Math.max(1, window.innerHeight || document.documentElement.clientHeight)
    });
    const size = viewport();
    const width = element.offsetWidth || Math.min(370, Math.max(190, size.width * .22));
    const height = element.offsetHeight || width;
    const state = createState(kind, size.width, size.height, width, height);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const moving = () => !document.hidden && !reduced.matches && document.documentElement.dataset.motion !== 'off';
    const opacity = element.classList.contains('cameo-requested') ? .96 : kind === 'falcon' ? .78 : .83;
    let frame = 0, last = null, accumulator = 0, stopped = false;

    element.style.animation = 'none';
    element.style.left = '0';
    element.style.top = '0';
    element.style.transformOrigin = '50% 50%';
    element.style.opacity = '0';

    function stop() {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(frame);
      frame = 0;
      document.removeEventListener('visibilitychange', checkVisibility);
      document.removeEventListener('portfolio:motionchange', checkVisibility);
      reduced.removeEventListener('change', checkVisibility);
      window.removeEventListener('pagehide', checkVisibility);
      window.removeEventListener('resize', resize);
      element.style.opacity = '0';
    }

    function finish() {
      if (stopped) return;
      stop();
      options.onComplete?.();
    }

    function checkVisibility(event) {
      if (event?.type === 'pagehide' || !moving()) finish();
    }

    function resize() {
      const next = viewport();
      state.viewportWidth = next.width;
      state.viewportHeight = next.height;
      state.width = element.offsetWidth || state.width;
      state.height = element.offsetHeight || state.height;
      // Keep position and momentum. Only steering destinations change on resize.
    }

    function paint() {
      element.style.transform = `translate3d(${state.x.toFixed(2)}px,${(state.y - state.height / 2).toFixed(2)}px,0) scale(${state.scale.toFixed(4)})`;
      const entry = kind === 'ironman'
        ? 1 - smooth(state.viewportHeight - state.height * .1, state.viewportHeight + state.height * .5, state.y)
        : smooth(-state.width * .95, -state.width * .1, state.x);
      const exit = kind === 'ironman'
        ? smooth(-state.height * .6, 0, state.y)
        : 1 - smooth(state.viewportWidth, state.viewportWidth + state.width * .45, state.x);
      element.style.opacity = (opacity * entry * exit).toFixed(3);
      options.setFlightState?.({ throttle: state.throttle, bank: state.bank, pitch: state.pitch, heading: state.heading, yaw: state.yaw });
    }

    function tick(now) {
      frame = 0;
      if (stopped) return;
      if (!moving() || !element.isConnected) { finish(); return; }
      if (last === null) last = now;
      // Embedded previews can render at 1 Hz while still reporting visible.
      // Catch up one second at a time; 120 cheap math steps avoid stretching the flight tenfold.
      accumulator += Math.min(Math.max((now - last) / 1000, 0), 1);
      last = now;
      // Fixed substeps give the same acceleration profile at 30, 60 and 120 Hz.
      while (accumulator + 1e-9 >= FIXED_STEP) {
        step(state, FIXED_STEP);
        accumulator -= FIXED_STEP;
      }
      paint();
      const outside = kind === 'ironman'
        ? state.y + state.height * state.scale / 2 < 0
        : state.x > state.viewportWidth + state.width * .45;
      if (state.age + FIXED_STEP / 2 >= state.duration && outside) { finish(); return; }
      // A late viewport resize may need a short coast beyond the nominal flight time.
      if (state.age >= state.duration + 3) { finish(); return; }
      frame = requestAnimationFrame(tick);
    }

    document.addEventListener('visibilitychange', checkVisibility);
    document.addEventListener('portfolio:motionchange', checkVisibility);
    reduced.addEventListener('change', checkVisibility);
    window.addEventListener('pagehide', checkVisibility);
    window.addEventListener('resize', resize);
    paint();
    if (moving() && element.isConnected) frame = requestAnimationFrame(tick);
    else queueMicrotask(finish);
    return stop;
  }

  window.PortfolioFlight = Object.freeze({ start });
})();
