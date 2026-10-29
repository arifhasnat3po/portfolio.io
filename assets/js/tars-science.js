/* Small, local experiments. These are teaching models, not live measurements. */
export const GRAVITIES = Object.freeze({ Earth: 9.81, Moon: 1.62, Mars: 3.71 });
export const LIGHT_SPEED = 299792458;
export const MOON_DISTANCE = 384400000;
export function fallTime(height, gravity) {
  if (!Number.isFinite(height) || height < 0 || !Number.isFinite(gravity) || gravity <= 0) throw new RangeError('Use a nonnegative height and positive gravity.');
  return Math.sqrt(2 * height / gravity);
}
export function timeFactor(beta) {
  if (!Number.isFinite(beta) || beta < 0 || beta >= 1) throw new RangeError('Speed must be below the speed of light.');
  return 1 / Math.sqrt(1 - beta * beta);
}
export const moonSignalSeconds = () => MOON_DISTANCE / LIGHT_SPEED;

export function mountTarsScience(host, { motionAllowed = () => true, onExplain = () => {}, onReact = () => {} } = {}) {
  let frame = 0, active = '', disposed = false;
  host.innerHTML = `<details class="tars-lab"><summary>Science lab <span>Try a small experiment</span></summary><div class="tars-lab-tabs" role="group" aria-label="Science experiments"><button type="button" data-lab="gravity">Gravity</button><button type="button" data-lab="time">Time dilation</button><button type="button" data-lab="light">Light delay</button></div><section class="tars-lab-panel" aria-label="Science experiment"><p>Pick an experiment. No lab coat required.</p></section></details>`;
  const details = host.querySelector('details'), panel = host.querySelector('.tars-lab-panel');
  const fixed = value => value.toFixed(2);
  function cancel() { if (frame) cancelAnimationFrame(frame); frame = 0; }
  function animate(duration, paint, finish) {
    cancel();
    if (!motionAllowed()) { paint(duration); finish(); return; }
    let start;
    const tick = now => {
      if (disposed || document.hidden || !details.open || !host.isConnected) { cancel(); return; }
      start ??= now;
      const elapsed = Math.min((now - start) / 1000, duration);
      paint(elapsed);
      if (elapsed < duration && motionAllowed()) frame = requestAnimationFrame(tick);
      else { frame = 0; paint(duration); finish(); }
    };
    frame = requestAnimationFrame(tick);
  }
  function select(kind, narrate = true) {
    if (disposed || !['gravity', 'time', 'light'].includes(kind)) return false;
    cancel(); active = kind; details.open = true;
    host.querySelectorAll('[data-lab]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lab === kind)));
    if (kind === 'gravity') {
      panel.innerHTML = `<h3>Same drop. Different worlds.</h3><p>Release three probes from 2 meters. Gravity changes; their mass does not affect the fall time in this vacuum model.</p><svg viewBox="0 0 360 170" role="img" aria-label="Three probes falling on Earth, the Moon, and Mars">${Object.keys(GRAVITIES).map((world, i) => `<g><path d="M${60 + i * 120} 24v116" class="lab-track"/><circle data-probe="${world}" cx="${60 + i * 120}" cy="24" r="9" class="lab-probe lab-probe-${i}"/><text x="${60 + i * 120}" y="163">${world}</text></g>`).join('')}</svg><div class="tars-lab-readouts">${Object.entries(GRAVITIES).map(([world, g]) => `<span><strong>${fixed(fallTime(2, g))} s</strong>${world} · ${g} m/s²</span>`).join('')}</div><button type="button" class="tars-lab-run">Drop the probes</button><p class="tars-lab-result" role="status">Ready at 2 meters.</p><small>Ideal vacuum; constant surface gravity. Distance = ½ × gravity × time².</small>`;
      panel.querySelector('button').addEventListener('click', () => {
        onReact('balance');
        panel.querySelector('.tars-lab-result').textContent = motionAllowed() ? 'Probes released…' : 'Motion paused; showing the result.';
        animate(fallTime(2, GRAVITIES.Moon), time => {
          for (const [world, g] of Object.entries(GRAVITIES)) panel.querySelector(`[data-probe="${world}"]`).setAttribute('cy', String(24 + Math.min(1, .5 * g * time * time / 2) * 116));
        }, () => { panel.querySelector('.tars-lab-result').textContent = 'Earth lands first, then Mars, then the Moon.'; });
      });
    } else if (kind === 'time') {
      panel.innerHTML = `<h3>A different kind of hour.</h3><p>Compare 1 hour on a moving spacecraft with the time measured in Earth’s frame.</p><label for="tars-light-speed">Spacecraft speed <output id="tars-beta">50% of light speed</output></label><input id="tars-light-speed" type="range" min="0" max="99" step="1" value="50"/><div class="tars-clock-pair"><span><strong>1.00 h</strong>On the spacecraft</span><span><strong data-earth-hours>1.15 h</strong>In Earth’s frame</span></div><div class="tars-time-track" aria-hidden="true"><span></span></div><p class="tars-lab-result">At this speed, 1 spacecraft hour corresponds to <b>1.15</b> Earth hours.</p><small>Special relativity at constant relative speed. Acceleration, gravity, and a return trip are excluded. γ = 1 / √(1 − v²/c²).</small>`;
      const speed = panel.querySelector('input');
      function update() {
        const percent = Number(speed.value), factor = timeFactor(percent / 100);
        panel.querySelector('output').textContent = `${percent}% of light speed`;
        speed.setAttribute('aria-valuetext', `${percent} percent of light speed`);
        panel.querySelector('[data-earth-hours]').textContent = `${fixed(factor)} h`;
        panel.querySelector('.tars-lab-result b').textContent = fixed(factor);
        panel.querySelector('.tars-time-track span').style.width = `${percent}%`;
      }
      speed.addEventListener('input', update); update();
    } else {
      panel.innerHTML = `<h3>Even light takes a moment.</h3><p>A signal crosses the average Earth–Moon distance of 384,400 km.</p><svg viewBox="0 0 360 100" role="img" aria-label="Light signal traveling from Earth to the Moon and back"><path d="M40 40H320" class="lab-track"/><circle cx="40" cy="40" r="17" class="lab-probe"/><circle cx="320" cy="40" r="11" class="lab-moon"/><circle data-signal cx="40" cy="40" r="5" class="lab-signal"/><text x="40" y="85">Earth</text><text x="320" y="85">Moon</text></svg><div class="tars-lab-readouts"><span><strong>${fixed(moonSignalSeconds())} s</strong>One way</span><span><strong>${fixed(moonSignalSeconds() * 2)} s</strong>Round trip</span></div><button type="button" class="tars-lab-run">Send a light pulse</button><p class="tars-lab-result" role="status">Ready to transmit.</p><small>Illustrated at real time using average distance. Actual lunar distance varies; processing delays are excluded.</small>`;
      panel.querySelector('button').addEventListener('click', () => {
        onReact('wave');
        const oneWay = moonSignalSeconds();
        animate(oneWay * 2, time => {
          const progress = time <= oneWay ? time / oneWay : 2 - time / oneWay;
          panel.querySelector('[data-signal]').setAttribute('cx', String(40 + progress * 280));
          const status = panel.querySelector('.tars-lab-result');
          const message = time < oneWay ? 'Signal traveling to the Moon…' : 'Signal returning to Earth…';
          if (status.textContent !== message) status.textContent = message;
        }, () => { panel.querySelector('.tars-lab-result').textContent = `Reply received after ${fixed(oneWay * 2)} seconds.`; });
      });
    }
    if (narrate) onExplain(`science-${kind}`);
    return true;
  }
  host.querySelectorAll('[data-lab]').forEach(button => button.addEventListener('click', () => select(button.dataset.lab)));
  details.addEventListener('toggle', () => { if (!details.open) cancel(); });
  function visibility() { if (document.hidden) cancel(); }
  document.addEventListener('visibilitychange', visibility);
  return { open(action) { return select(action.replace(/^science-/, ''), false); },
    cancel,
    destroy() { disposed = true; cancel(); document.removeEventListener('visibilitychange', visibility); host.replaceChildren(); }
  };
}
