/**
 * GitHub Pages simulation: serve web/ the way the live site actually serves
 * it, and check that it works there.
 *
 * `npm run test:smoke` runs against server.js, which answers *any* unknown
 * path with index.html and a 200 - right for the app's hash routes, but it
 * also means a missing file never shows up as a 404. That is how
 * index.html's apple-touch-icon pointed at a non-existent icon-180.png for
 * several rounds without a single test noticing (round 17). GitHub Pages
 * has no such fallback, and it serves this repository under a sub-path
 * (/Kid_math_game_web/), which catches any absolute "/js/..." path too.
 *
 * So this script:
 *   1. copies web/ to a temp folder and stamps BUILD_ID exactly as
 *      .github/workflows/deploy-pages.yml does;
 *   2. serves it with a plain static server under /Kid_math_game_web/ -
 *      real 404s, no fallback;
 *   3. opens every route in Chromium and fails on any HTTP error, failed
 *      request, page error or console error; checks every <link>ed file and
 *      manifest icon exists; checks the service worker installs with the
 *      stamped cache name; and reloads offline.
 *
 * Usage: node tests/web/pages-sim.mjs   (Playwright resolvable, as for smoke.mjs)
 */
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { cpSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("playwright is not installed. Install it with:\n  npm install -g playwright\nand re-run.");
  process.exit(2);
}

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SUBPATH = "/Kid_math_game_web/";
const BUILD_ID = "pagesim00001"; // 12 characters, like ${GITHUB_SHA::12}
// Kept in step with nav.js: every page must load under the Pages sub-path.
const ROUTES = [
  "home", "leerhapjes", "tafel", "breuken", "meten", "procenten", "algebra", "meetkunde", "verhoudingen",
  "getallen", "bliksemronde", "getallenjacht", "logica", "code", "lezen", "woorden", "spelling",
  "fladdervogel", "sprongheld", "compete", "rewards", "uitleg", "dashboard",
];
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};

// --- 1. a stamped copy, as the deploy workflow builds it ---------------------
const scratch = mkdtempSync(path.join(tmpdir(), "kmg-pages-"));
const site = path.join(scratch, "site");
cpSync(path.join(REPO_ROOT, "web"), site, { recursive: true });
const swPath = path.join(site, "sw.js");
const swSource = readFileSync(swPath, "utf8");
if (!swSource.includes("__BUILD_ID__")) {
  console.error("web/sw.js has no __BUILD_ID__ placeholder - the deploy's stamp step would do nothing.");
  process.exit(1);
}
writeFileSync(swPath, swSource.replace("__BUILD_ID__", BUILD_ID));

// --- 2. a static server with no fallback ------------------------------------
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (!url.pathname.startsWith(SUBPATH)) {
    res.writeHead(404).end("outside the Pages sub-path");
    return;
  }
  let file = path.join(site, decodeURIComponent(url.pathname.slice(SUBPATH.length)));
  if (!file.startsWith(site)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if (statSync(file).isDirectory()) file = path.join(file, "index.html");
    const body = readFileSync(file);
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}${SUBPATH}`;

// --- 3. the checks -----------------------------------------------------------
const problems = [];
const browser = await chromium.launch({ args: ["--no-sandbox"] });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("response", (r) => {
    if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`);
  });
  page.on("requestfailed", (r) => problems.push(`request failed: ${r.url()} (${r.failure()?.errorText})`));
  page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console error: ${m.text()}`);
  });

  console.log(`Pages simulation at ${base}\n`);
  for (const route of ROUTES) {
    await page.goto(`${base}#/${route}`, { waitUntil: "networkidle" });
    const heading = await page
      .waitForSelector("#kmg-main h1", { timeout: 8000 })
      .then((h) => h.textContent())
      .catch(() => null);
    if (!heading) problems.push(`#/${route}: no heading rendered`);
  }
  console.log(`  ${ROUTES.length} routes opened`);

  const linked = await page.evaluate(() => [...document.querySelectorAll("link[href]")].map((l) => l.href));
  const manifest = await (await page.request.get(`${base}manifest.webmanifest`)).json();
  const files = [...linked, ...manifest.icons.map((icon) => new URL(icon.src, base).href)];
  for (const href of files) {
    const status = (await page.request.get(href)).status();
    if (status >= 400) problems.push(`linked file missing (${status}): ${href}`);
  }
  console.log(`  ${files.length} linked files and manifest icons checked`);

  const sw = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return caches.keys();
  });
  if (!sw.includes(`kmg-${BUILD_ID}`)) problems.push(`service worker cache is ${JSON.stringify(sw)}, expected kmg-${BUILD_ID}`);
  console.log(`  service worker cache: ${sw.join(", ")}`);

  await context.setOffline(true);
  await page.goto(`${base}#/rewards`, { waitUntil: "domcontentloaded" }).catch(() => {});
  const offline = await page
    .waitForSelector("#kmg-main h1", { timeout: 8000 })
    .then((h) => h.textContent())
    .catch(() => null);
  if (!offline) problems.push("the app did not render offline under the sub-path");
  console.log(`  offline reload: ${offline?.trim() ?? "(nothing)"}`);
} finally {
  await browser.close();
  server.close();
  rmSync(scratch, { recursive: true, force: true });
}

console.log("");
if (problems.length) {
  console.error(`FAILED - ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log("OK - the stamped site works as GitHub Pages will serve it.");
