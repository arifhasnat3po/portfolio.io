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

  function createState(kind, viewportWidth, viewportHeight, width, height) {
    const duration = kind === 'ironman' ? 14 : 20;
    const speed = (viewportWidth + width * 2 + 130) / (duration * 1.08);
    return {
      kind, duration, width, height, viewportWidth, viewportHeight,
      age: 0, x: -width - 70, y: viewportHeight * .43,
      vx: speed * .68, vy: -viewportHeight * .012,
      ax: 0, ay: 0, speed,
      altitudeTarget: viewportHeight * .34,
      bank: 0, pitch: 0, throttle: .46, scale: .83,
      maxForwardAcceleration: speed * 1.2,
      maxLateralAcceleration: clamp(viewportHeight * .085, 44, 100),
      maxLateralSpeed: clamp(viewportHeight * .1, 50, 120)
    };
  }

  /* Autopilot specifies altitude and speed, never position. Bounded thrust changes velocity. */
  function step(state, dt) {
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

    const targetBank = clamp(-state.ay / state.maxLateralAcceleration * .5, -.5, .5);
    const targetPitch = clamp(-Math.atan2(state.vy, Math.max(20, state.vx)) * .42, -.27, .27);
    state.bank = approach(state.bank, targetBank, 4.3, dt);
    state.pitch = approach(state.pitch, targetPitch, 3.5, dt);
    const thrust = Math.hypot(Math.max(0, state.ax) / state.maxForwardAcceleration,
      state.ay / state.maxLateralAcceleration * .35);
    const departure = smooth(.76, .98, progress);
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
      const entry = smooth(-state.width * .95, -state.width * .1, state.x);
      const exit = 1 - smooth(state.viewportWidth, state.viewportWidth + state.width * .45, state.x);
      element.style.opacity = (opacity * entry * exit).toFixed(3);
      options.setFlightState?.({ throttle: state.throttle, bank: state.bank, pitch: state.pitch });
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
      const outside = state.x > state.viewportWidth + state.width * .45;
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
