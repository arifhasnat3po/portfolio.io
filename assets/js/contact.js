/* Real static-site submissions through FormSubmit; native POST remains the fallback. */
(() => {
  'use strict';

  const form = document.getElementById('contact-form');
  if (!form || !window.fetch || !window.AbortController) return;
  const status = form.querySelector('[data-contact-status]');
  const submit = form.querySelector('[data-contact-submit]') || form.querySelector('[type="submit"]');
  const label = form.querySelector('[data-contact-submit-label]');
  const fallback = form.querySelector('[data-contact-fallback]');
  const fields = ['name', 'email', 'message'].map(name => form.elements.namedItem(name));
  if (!status || !submit || fields.some(field => !field)) return;

  const endpoint = new URL(form.action, window.location.href);
  // Do not intercept a form that has been intentionally moved to another provider.
  if (endpoint.origin !== 'https://formsubmit.co' || !/^\/[^/]+$/.test(endpoint.pathname)) return;
  const ajaxEndpoint = `${endpoint.origin}/ajax${endpoint.pathname}`;
  const idleLabel = label?.textContent || 'Send message';
  let pending = false;

  function showStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state;
  }

  function setPending(value) {
    pending = value;
    submit.disabled = value;
    if (fallback) fallback.disabled = value;
    form.setAttribute('aria-busy', String(value));
    fields.forEach(field => {
      if (value) field.dataset.contactWasReadonly = String(field.readOnly);
      field.readOnly = value || field.dataset.contactWasReadonly === 'true';
    });
    if (label) label.textContent = value ? 'Sending…' : idleLabel;
  }

  function collect() {
    const [name, email, message] = fields;
    fields.forEach(field => {
      field.value = field.value.trim();
      field.setCustomValidity('');
    });
    if (name.value.length < 2 || name.value.length > 100) name.setCustomValidity('Please enter your name using 2 to 100 characters.');
    if (!email.value || email.value.length > 254) email.setCustomValidity('Please enter a valid email address.');
    if (message.value.length < 10 || message.value.length > 5000) message.setCustomValidity('Please write a message between 10 and 5,000 characters.');
    if (!form.reportValidity()) return null;

    const honey = form.elements.namedItem('_honey');
    if (honey?.value.trim()) {
      showStatus('This submission could not be accepted. Please use the email link below.', 'error');
      return null;
    }
    if (!['http:', 'https:'].includes(window.location.protocol)) {
      showStatus('The contact form is unavailable in this preview. Please use the email link below.', 'error');
      return null;
    }
    return {
      name: name.value,
      email: email.value,
      message: message.value,
      _replyto: email.value,
      _subject: form.elements.namedItem('_subject')?.value || 'New portfolio message — Arif Hasnat',
      _template: 'table',
      _honey: '',
      _url: `${window.location.origin}${window.location.pathname}#contact`
    };
  }

  fields.forEach(field => field.addEventListener('input', () => field.setCustomValidity('')));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending) return;
    const payload = collect();
    if (!payload) return;
    if (fallback) fallback.hidden = true;
    showStatus('Sending your message…', 'pending');
    setPending(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(ajaxEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'omit',
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const result = await response.json();
      const serviceMessage = typeof result?.message === 'string' ? result.message : '';
      if (/activat|confirm[^.]*email|check[^.]*email|verif[^.]*email/i.test(serviceMessage)) {
        showStatus('Delivery is awaiting inbox confirmation. Please use the email link below if your message is time-sensitive.', 'warning');
        return;
      }
      if (!response.ok || !(result?.success === true || result?.success === 'true')) {
        throw new Error('The service did not confirm acceptance.');
      }
      form.reset();
      showStatus('Message accepted. Thanks for getting in touch.', 'success');
    } catch (error) {
      showStatus(error.name === 'AbortError'
        ? 'No confirmation arrived in time. Your message is still here. Try the submission page below or email me directly.'
        : 'Your submission could not be confirmed. Your message is still here. Try the submission page below or email me directly.', 'error');
      if (fallback) fallback.hidden = false;
    } finally {
      window.clearTimeout(timeout);
      setPending(false);
    }
  });

  fallback?.addEventListener('click', () => {
    if (pending || !collect()) return;
    // A separate, deliberate action avoids automatically retrying an ambiguous request.
    showStatus('Opening the submission page…', 'pending');
    setPending(true);
    HTMLFormElement.prototype.submit.call(form);
  });
})();
