import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const counts = { pages: 0, localReferences: 0, structuredData: 0, frames: 0, scripts: 0 };
const fail = message => failures.push(message);
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const entities = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };
const decode = value => value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (match, entity) => {
  if (entity[0] !== '#') return entities[entity.toLowerCase()] ?? match;
  const number = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
  return number <= 0x10ffff ? String.fromCodePoint(number) : match;
});

function attributes(tag) {
  const result = {};
  const body = tag.replace(/^<\/?[\w:-]+\s*/, '').replace(/\/?\s*>$/, '');
  const pattern = /([^\s=<>/'"]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of body.matchAll(pattern)) result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  return result;
}

function localReference(reference, owner) {
  if (!reference || /^(?:#|\/\/|[a-z][a-z\d+.-]*:)/i.test(reference)) return;
  let pathname;
  try { pathname = decodeURIComponent(reference.split(/[?#]/, 1)[0]); }
  catch { fail(`${owner}: invalid URL encoding in ${reference}`); return; }
  if (!pathname) return;
  const target = pathname.startsWith('/')
    ? path.resolve(root, `.${pathname}`)
    : path.resolve(root, path.dirname(owner), pathname);
  const relative = path.relative(root, target);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail(`${owner}: local reference escapes the site root: ${reference}`);
    return;
  }
  counts.localReferences++;
  try {
    const info = fs.statSync(target);
    const destination = info.isDirectory() ? path.join(target, 'index.html') : target;
    if (!fs.statSync(destination).isFile() || fs.statSync(destination).size === 0) {
      fail(`${owner}: empty or invalid local destination: ${reference}`);
    }
  } catch { fail(`${owner}: missing local destination: ${reference}`); }
}

function checkHtml(file) {
  let html;
  try { html = read(file); }
  catch { fail(`${file}: file is missing; run node scripts/build.mjs first`); return; }
  counts.pages++;
  const tokens = [...html.matchAll(/\{\{\s*[A-Za-z_][A-Za-z\d_]*\s*\}\}/g)];
  if (tokens.length) fail(`${file}: unresolved template tokens: ${[...new Set(tokens.map(token => token[0]))].join(', ')}`);

  let structuredData = 0;
  for (const script of html.matchAll(/(<script\b(?:[^"'>]|"[^"]*"|'[^']*')*>)([\s\S]*?)<\/script\s*>/gi)) {
    if (attributes(script[1]).type?.toLowerCase() !== 'application/ld+json') continue;
    structuredData++;
    try { JSON.parse(script[2]); counts.structuredData++; }
    catch (error) { fail(`${file}: invalid JSON-LD: ${error.message}`); }
  }
  if (file === 'index.html' && !structuredData) fail(`${file}: missing JSON-LD`);

  // Ignore inline JavaScript templates when checking document asset URLs.
  const markup = html.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(<script\b(?:[^"'>]|"[^"]*"|'[^']*')*>)[\s\S]*?<\/script\s*>/gi, '$1</script>');
  for (const tag of markup.matchAll(/<[a-z][\w:-]*\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi)) {
    const attrs = attributes(tag[0]);
    for (const name of ['href', 'src']) if (name in attrs) localReference(attrs[name], file);
  }
  // Also cover literal anchors inside the gym app's client-rendered templates.
  for (const tag of html.matchAll(/<a\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi)) {
    const attrs = attributes(tag[0]);
    if (attrs.target?.toLowerCase() === '_blank' && !/(?:^|\s)(?:noopener|noreferrer)(?:\s|$)/i.test(attrs.rel ?? '')) {
      fail(`${file}: target="_blank" needs rel="noopener" or rel="noreferrer": ${attrs.href ?? '(no href)'}`);
    }
  }
  for (const style of markup.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
    for (const url of style[1].matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/gi)) {
      localReference(url[1] ?? url[2] ?? url[3], file);
    }
  }
}

function checkWatchlist() {
  try {
    const source = read('assets/js/cinema.js');
    const base = source.match(/const\s+base\s*=\s*['"]([^'"]+)['"]/)?.[1];
    const frames = [...source.matchAll(/\bframe\(\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
    if (!base) { fail('assets/js/cinema.js: cannot find the watchlist asset directory'); return; }
    if (frames.length !== 20 || new Set(frames).size !== 20) fail(`Watchlist must reference all 20 unique supplied frames; found ${frames.length} references and ${new Set(frames).size} unique frames`);
    const files = new Set(frames.map(frame => `${base}${frame}.webp`));
    for (const file of files) localReference(file, 'index.html');
    counts.frames = files.size;
    const manifest = JSON.parse(read('assets/img/watchlist/manifest.json'));
    if (!Array.isArray(manifest)) throw new Error('image manifest must be an array');
    const listed = new Set(manifest.map(entry => entry.file));
    if (listed.size !== manifest.length) fail('Watchlist manifest contains duplicate file entries');
    for (const file of files) if (!listed.has(file)) fail(`Watchlist frame is missing from the manifest: ${file}`);
    for (const entry of manifest) {
      if (!files.has(entry.file)) fail(`Watchlist manifest frame is unused: ${entry.file}`);
      if (!(entry.width > 0 && entry.height > 0)) fail(`Watchlist dimensions are invalid: ${entry.file}`);
    }
  } catch (error) { fail(`Watchlist integrity: ${error.message}`); }
}

function checkSyntax(file) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  if (result.error || result.status !== 0) fail(`${file}: JavaScript syntax check failed\n${result.error?.message ?? result.stderr.trim()}`);
  else counts.scripts++;
}

for (const file of ['index.html', 'gym/index.html']) checkHtml(file);
checkWatchlist();
for (const file of ['assets/js/main.js', 'assets/js/cinema.js', 'gym/sw.js']) checkSyntax(file);

if (failures.length) {
  console.error(`Release check failed (${failures.length}):\n${failures.map(message => `- ${message}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Release check passed: ${counts.pages} HTML pages, ${counts.localReferences} local references, ${counts.structuredData} JSON-LD block, ${counts.frames} watchlist frames, ${counts.scripts} JavaScript syntax checks.`);
}
