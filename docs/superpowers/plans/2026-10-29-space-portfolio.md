# Space Portfolio Implementation Plan

**Goal:** Refresh Arif Hasnat's existing portfolio with a cinematic space theme, current search and automation expertise, preserved professional history, and an interactive watchlist.

**Architecture:** Keep the existing static GitHub/Vercel site. Generate semantic HTML from the existing data file with a dependency-free Node build script. Vanilla JavaScript supplies progressive interactions; no server or client framework is required.

**Tech stack:** HTML, CSS, JavaScript, Node built-ins for generation and checks.

**Spec:** The user's detailed October 29 brief and supplied LinkedIn PDF, 20 movie images, and gym app ZIP/HTML are the source of requirements. Prior source data remains authoritative for existing history.

## Decisions
- Deep navy, cyan, restrained violet, a CSS orbital hero, large typography, varied layouts.
- Existing GitHub/Vercel delivery is retained; no separate Sites hosting registration.
- Four primary expertise cards: Technical SEO, SEO, AEO, GEO. No invented percentages.
- Preserve all existing education, roles, skills, publications, certificates, achievements, extracurricular entries, and projects. Add content writing, copy editing, payments, automation, and user-requested new projects.
- All 20 supplied images appear across 16 watchlist titles, with multiple scenes in an accessible dialog.
- Serve the user's complete gym app at `gym/`.
- Feature verified PixelPair walkthrough; YouTube loads only on interaction and retains a direct link.
- Unknown external project URLs use useful local project details, never fake demo links. No private repository contents are published.

## Tasks
- [x] Extend `assets/js/data.js`, preserving historical data; add current expertise and new projects.
- [x] Create `src/index.template.html`, `scripts/build.mjs`, main CSS and interactions. Generate `index.html` with crawlable profile content, social links, filters, project details, and print résumé.
- [x] Build `assets/js/cinema.js`, `assets/css/cinema.css`, and optimized watchlist images. Verify pointer/keyboard/touch behavior and reduced motion.
- [x] Integrate supplied gym ZIP at `gym/`, checking offline scope and relative assets.
- [x] Verify preservation, local links/assets, syntax, responsive layout, gallery, filters, dialogs, mobile menu, and gym controls. Independent whole-change review.
- [ ] Commit and deliver the update through the existing repository; verify the resulting deployment or clearly report a hosting blocker.

## Review Focus
- Mobile width and long titles must not overflow; all dialogs remain operable.
- Reduced motion and manual pause stop nonessential movement, including tilt.
- All previous professional data survives generation; no placeholders become fictitious achievements.
- Unknown/private source URLs must not appear as usable public demo links.
- Gym offline worker must not delete unrelated origin caches; no install prompt or permission without user interaction.

## Progress
Initial repository cloned on `feat/space-portfolio`. Existing source uses runtime injection; refresh will emit profile content at build time. Original CV and one publication PDF are referenced but absent from repository; retain data, provide printable profile and working DOI links instead of broken downloads. User supplied specific implementation requirements, so execution proceeds within that authorized scope.

Release verification: build and dependency-free integrity checks pass. All original profile records are retained. Browser checks at 1440, 768, and 390 pixels found no horizontal content overflow. Verified pointer-driven tilt, movie filters and expansion, scene switching, Escape and focus return, project details, search results/empty state, mobile navigation, motion toggle, YouTube playback, and gym set/rest/exercise controls. Browser console reported no errors during checks. Independent review fixes align canonical/sitemap URLs and add a printable identity header. System reduced motion and print styles were reviewed in source; no OS preference was changed. The old blog destination returns 404, so the writing section points to the existing LinkedIn and YouTube profiles.
