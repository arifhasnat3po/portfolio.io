# Contact form delivery

The portfolio uses FormSubmit to email contact submissions to **arifhasnat83@gmail.com**. It works with this repository's static Vercel deployment and GitHub Pages without a server, API key, npm package, or paid account.

The form sends a visitor's name, reply email, and message to FormSubmit over HTTPS. The page should disclose this next to the form. FormSubmit processes and forwards the submission; no Gmail credentials belong in the website.

## Required one-time activation

Delivery is **not verified** by a successful local build or a passing JavaScript check. No activation or test email was sent during implementation.

1. Deploy the form to the primary public site.
2. Deliberately submit one clearly labeled test message from that live form, using an email address you control.
3. Open the activation email in **arifhasnat83@gmail.com** and confirm the form. Check Gmail's Spam folder if necessary.
4. Submit a second test from the live form and confirm that the email arrives with the expected name, message, and Reply-To address. Only then consider delivery verified.

FormSubmit states that the first submission sends an activation email. Until activation, it retains pending submissions for up to 30 days and sends them after confirmation. Changing the recipient requires activation again. See [setup instructions](https://formsubmit.co/) and [activation and delivery FAQs](https://formsubmit.co/help).

## Markup and behavior

Load `assets/js/contact.js` with `defer`. The script enhances this HTML contract:

- `form#contact-form` with `method="POST"` and `action="https://formsubmit.co/arifhasnat83@gmail.com"`.
- Labeled required `name`, `email`, and `message` fields. Use a text input with `minlength="2" maxlength="100"`, an email input with `maxlength="254"`, and a textarea with `minlength="10" maxlength="5000"`.
- A CSS-hidden text honeypot named `_honey`, with `tabindex="-1"`, `autocomplete="off"`, and `aria-hidden="true"`.
- Hidden `_subject` and `_template` fields for the native POST. Suggested values: `New portfolio message — Arif Hasnat` and `table`. A hidden `_url` may contain the primary contact URL.
- A submit button with `data-contact-submit` and an inner text span with `data-contact-submit-label`.
- A status element inside the form with `data-contact-status`, `role="status"`, `aria-live="polite"`, and `aria-atomic="true"`.
- An optional `type="button" data-contact-fallback hidden` button labeled **Send through FormSubmit**.
- An always-visible direct email link as another way to contact Arif.

JavaScript sends JSON to FormSubmit's documented cross-origin AJAX endpoint. It validates trimmed fields, blocks a populated honeypot, prevents simultaneous submissions, and keeps entered text after errors or an activation notice. A 20-second timeout reports an unconfirmed result rather than claiming the message failed to reach the service. No automatic retries occur. On confirmed acceptance, the form resets and reports **Message accepted**, which is not a claim that Gmail delivery has been verified.

When JavaScript is unavailable, the form performs its ordinary POST to FormSubmit. After a failed AJAX attempt, the optional fallback button lets the visitor deliberately submit through FormSubmit's own page. The default native CAPTCHA is retained; the implementation does not set `_captcha=false`. FormSubmit's autoresponse feature is not used because its documentation says it does not work with AJAX submissions.

The script never logs message contents, stores messages in browser storage, or sends a copy to another recipient. Validation and honeypots reduce accidental or automated submissions, but do not replace the provider's server-side spam controls.

## Verification without sending mail

Run `node --check assets/js/contact.js`. In browser QA, intercept or mock requests to `https://formsubmit.co/ajax/*` rather than submitting real visitor details. Check required/invalid fields, whitespace-only input, success, service rejection, activation notices, timeout, repeated clicks, and message preservation after errors. Test the native fallback separately only when a deliberate activation/delivery test is intended.

Official references: [AJAX request examples](https://formsubmit.co/ajax-documentation), [form settings, honeypot, Reply-To, and CAPTCHA documentation](https://formsubmit.co/documentation).
