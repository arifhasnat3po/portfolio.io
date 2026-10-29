# Arif Hasnat — Portfolio

A moving space observatory and static portfolio for Technical SEO, SEO, AEO, GEO, automation, WordPress development, and machine learning research.

Primary site: **https://arifhasnat.vercel.app/**

Gym app: **https://arifhasnat.vercel.app/gym/**

## Structure

- `assets/js/data.js` — professional profile, current expertise, original skills/history, projects, publications, and credentials.
- `src/index.template.html` — page structure, metadata, hero copy, and section layout.
- `scripts/build.mjs` — dependency-free Node script that generates the root `index.html`.
- `scripts/check.mjs` — dependency-free release checks for generated pages, local assets, watchlist coverage, structured data, and JavaScript syntax.
- `assets/css/style.css` — main visual system and desktop layout.
- `assets/css/responsive.css` — responsive layout and printable résumé styles.
- `assets/js/main.js` — navigation, motion controls, project filtering/details, video dialog, and printing.
- `assets/js/cinema.js` and `assets/css/cinema.css` — watchlist gallery, pointer tilt, filters, and accessible scene viewer.
- `assets/img/watchlist/` — 23 optimized supplied images; `manifest.json` records the source mapping.
- `assets/js/entangled.js` and `assets/css/cosmos.css` — the layered 3D world tree, drifting black hole with click/tap sparks, stars, and galaxies. Light mode fades the black hole; motion controls and reduced-motion preferences are respected.
- `assets/js/cameos.js` and `assets/css/cameos.css` — model flybys and five discoverable secrets.
- `assets/js/flight-physics.js` — fixed-step velocity/acceleration simulation with bounded thrust, smooth banking, and throttle feedback for the engines.
- `assets/js/cameo-3d.js` — local licensed meshes, material lighting, model-attached engines, and 3D viewer controls. `assets/models/credits.json` records provenance. Iron Man uses the detailed, 66-bone Mark 85 model with articulated flight and boot-mounted exhaust. Models load on demand. The separate docking-bay viewer features only the Millennium Falcon.
- `src/routine.fragment.html`, `assets/js/routine.js`, and `assets/css/routine.css` — the dedicated personal workout section.
- `assets/js/contact.js` — FormSubmit delivery, validation, status, and native fallback. See `docs/contact-setup.md` for Gmail activation.
- `assets/img/projects/sources.json` — provenance for authentic project artwork.
- `gym/` — the supplied standalone Gym Field Guide app, with local assets and a scoped offline service worker.

The portfolio uses HTML, CSS, and vanilla JavaScript. Profile content is rendered into HTML at build time, so professional information remains readable without JavaScript. The gallery and interactive controls use JavaScript. The main page loads optional Google Fonts; the gym app bundles its fonts locally.

## Edit content and build

Use a current Node.js LTS release. There are no npm packages to install.

1. Edit the relevant object or array in `assets/js/data.js`.
2. For page structure or fixed section copy, edit `src/index.template.html`.
3. Run:

   ```sh
   node scripts/build.mjs
   ```

4. Commit both the edited source files and the regenerated `index.html`.

Do not edit the generated `index.html` directly: the next build replaces it. The object inside `data.js` is parsed as JSON, so keep quoted keys, double-quoted strings, and JSON-compatible values; do not add comments, trailing commas, or executable expressions inside the object.

`currentSkills` controls the four interactive expertise tabs. `featuredProjects` controls the editorial project showcase; `projects` retains the earlier work. StreamVision and the projects following it appear after Publications, along with the project archive. Keep existing records when adding new information. A featured project without a public destination opens a local details dialog rather than a placeholder link. Never add private repository links as public demos.

To edit the watchlist, update the title/frame metadata in `assets/js/cinema.js` and the matching images. Keep descriptive alternative text and accurate dimensions. Duplicate scenes are available in the scene viewer. The gallery respects reduced-motion preferences and the page's motion toggle.

Certificate PDFs belong in `assets/pdf/`; point `pdfFile` at an existing file. The build only renders PDF links whose files exist. The résumé control opens the browser print dialog, where visitors can choose **Save as PDF**.

## Preview locally

Build first, then start a static server from the repository root:

```sh
node scripts/build.mjs
python -m http.server 8766 --bind 127.0.0.1
```

Open **http://127.0.0.1:8766/** and **http://127.0.0.1:8766/gym/**. Choose another port if 8766 is already in use. Stop the server with Ctrl+C when finished. HTTP localhost is needed to test the gym app's service worker; opening a `file://` URL does not exercise offline installation.

## Checks

```sh
node scripts/build.mjs
node scripts/check.mjs
```

The release check reports unresolved template tokens, malformed JSON-LD, missing local `href`/`src` destinations, missing watchlist images, unsafe new-tab links, and JavaScript syntax errors. It exits with a nonzero status when a check fails.

Before publishing, check desktop and mobile layouts, keyboard navigation, project search, project/video dialogs, watchlist filters and scene controls, reduced motion, printable résumé identity, and the gym app's exercise/set/rest controls. The YouTube player loads only after a visitor opens it; a direct YouTube link remains available if embedded playback is unavailable.

## Deployment

This repository contains a ready-to-serve static site at its root. Retain the existing Vercel project's repository connection and serving configuration. If configuring a build command, use `node scripts/build.mjs` and serve the repository root; no framework runtime or package installation is needed. Build and commit the generated HTML before pushing changes through the repository's normal review/deployment process.

The canonical URL, Open Graph URL, `robots.txt`, and `sitemap.xml` use the primary Vercel domain. If the primary domain changes, update them together. Keep the gym route in the sitemap. Relative asset paths also support a subdirectory preview, but a secondary host should not replace the canonical domain accidentally.

When updating the gym app's offline assets, review `gym/sw.js` and bump its version as appropriate. Its cache prefix and request handling are restricted to the gym app so it does not clear or intercept unrelated portfolio resources.
