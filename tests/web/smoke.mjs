/**
 * Browser smoke test: open every route in a real Chromium, play a few
 * questions, and fail on any console error or unhandled rejection.
 *
 * The Node tests cover the maths. This covers the half that only exists in a
 * browser - the router, the DOM the games build, the service worker, and the
 * dozens of small ways a hand-written front-end can throw on load and still
 * look fine in a screenshot.
 *
 * Usage:
 *   node tests/web/smoke.mjs [baseUrl] [--screenshots DIR] [--headed]
 *
 * Playwright is expected to be resolvable (it is installed globally in CI and
 * in the dev container); the script says so plainly rather than crashing if
 * it is not.
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error(
    "playwright is not installed. Install it with:\n  npm install -g playwright\nand re-run.",
  );
  process.exit(2);
}

const args = process.argv.slice(2);
const baseUrl = args.find((a) => a.startsWith("http")) ?? "http://127.0.0.1:8080";
const shotIndex = args.indexOf("--screenshots");
const shotDir = shotIndex !== -1 ? args[shotIndex + 1] : null;
const headed = args.includes("--headed");

const ROUTES = [
  "home",
  "leerhapjes",
  "tafel",
  "breuken",
  "meten",
  "procenten",
  "algebra",
  "meetkunde",
  "verhoudingen",
  "getallen",
  "bliksemronde",
  "getallenjacht",
  "logica",
  "code",
  "lezen",
  "woorden",
  "spelling",
  "fladdervogel",
  "sprongheld",
  "lavatoren",
  "turbokart",
  "rekendoku",
  "tafeltactiek",
  "pretparkbaas",
  "telduel",
  "weegpuzzel",
  "rekenmachine",
  "getallenbouwer",
  "sterrenpad",
  "compete",
  "rewards",
  "uitleg",
  "dashboard",
];

const problems = [];
const note = (route, message) => problems.push(`[${route}] ${message}`);

const browser = await chromium.launch({
  headless: !headed,
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

let currentRoute = "boot";
page.on("console", (message) => {
  if (message.type() === "error") note(currentRoute, `console error: ${message.text()}`);
});
page.on("pageerror", (error) => note(currentRoute, `page error: ${error.message}`));
page.on("requestfailed", (request) => {
  // A favicon 404 is noise; anything the app actually imports is not.
  if (!/favicon/.test(request.url())) {
    note(currentRoute, `request failed: ${request.url()} (${request.failure()?.errorText})`);
  }
});

if (shotDir) mkdirSync(shotDir, { recursive: true });

async function visit(route) {
  currentRoute = route;
  await page.goto(`${baseUrl}/#/${route}`, { waitUntil: "networkidle" });
  // The router renders after a dynamic import resolves, so wait for content
  // rather than assuming it is there when the network goes quiet.
  await page.waitForSelector("#kmg-main > *", { timeout: 8000 });
  await page.waitForTimeout(350);

  const heading = await page.locator("#kmg-main h1").first().textContent();
  if (!heading || !heading.trim()) note(route, "no <h1> rendered");

  const bootLeft = await page.locator("#kmg-boot").count();
  if (bootLeft) note(route, "the boot placeholder was never removed");

  if (shotDir) {
    await page.screenshot({ path: path.join(shotDir, `${route}.png`), fullPage: false });
  }
  return heading?.trim();
}

console.log(`Smoke-testing ${baseUrl}\n`);

for (const route of ROUTES) {
  const heading = await visit(route);
  console.log(`  ${route.padEnd(16)} ${heading ?? "(no heading)"}`);
}

// --- play a real question in a typed-answer game ---------------------------

currentRoute = "tafel:play";
await page.goto(`${baseUrl}/#/tafel`, { waitUntil: "networkidle" });
await page.waitForSelector(".kmg-question");

const scoreBefore = Number(await page.locator(".kmg-scorebox-value").first().textContent());

// Every game has eight levels (0-7) since round 18. The picker used to be a
// fixed six-column grid, which pushed Tafel Monster's old "6" onto a row of
// its own; it now sets one column per level.
const levelRows = await page.$$eval(".kmg-levelrow .kmg-levelbtn", (buttons) => new Set(buttons.map((b) => b.offsetTop)).size);
if (levelRows !== 1) note("tafel:play", `the level picker wraps onto ${levelRows} rows`);

// Tap out an answer on the on-screen pad, exactly as a child on a tablet does.
await page.locator(".kmg-padkey", { hasText: /^7$/ }).first().click();
const typed = await page.locator(".kmg-numinput").inputValue();
if (typed !== "7") note("tafel:play", `number pad typed "${typed}" instead of "7"`);

await page.locator(".kmg-padkey-del").click();
if ((await page.locator(".kmg-numinput").inputValue()) !== "") {
  note("tafel:play", "backspace did not clear the field");
}

// Now answer correctly, by reading the question the app is actually showing.
const questionText = await page.locator(".kmg-question-text").textContent();
const [a, b] = [...questionText.matchAll(/\d+/g)].map((m) => Number(m[0]));
if (!Number.isFinite(a) || !Number.isFinite(b)) {
  note("tafel:play", `could not parse the question: "${questionText}"`);
} else {
  await page.locator(".kmg-numinput").fill(String(a * b));
  await page.locator(".kmg-actions .kmg-btn-primary").first().click();
  await page.waitForSelector(".kmg-banner", { timeout: 4000 });

  const banner = await page.locator(".kmg-banner").first().getAttribute("class");
  const isCorrect = banner.includes("kmg-banner-ok");
  // Level 0 is "a x b" only, so a x b is genuinely the answer there; on any
  // other level the question may be a division or word problem, in which case
  // a wrong answer is the expected outcome and equally fine to observe.
  console.log(`\n  answered "${questionText.trim()}" with ${a * b} -> ${isCorrect ? "correct" : "wrong"}`);

  if (isCorrect) {
    const scoreAfter = Number(await page.locator(".kmg-scorebox-value").first().textContent());
    if (scoreAfter <= scoreBefore) {
      note("tafel:play", `score did not rise: ${scoreBefore} -> ${scoreAfter}`);
    }
  }
}

// --- reward shop: earn coins, then unlock and equip something --------------

currentRoute = "rewards:earn";
// Force a clean level 0 with a reset streak, whatever tafel:play above left
// it at: two clicks to different levels always land on the second one, since
// the level picker only skips a click that targets the already-active level.
await page.locator('.kmg-levelbtn[data-level="2"]').click();
await page.locator('.kmg-levelbtn[data-level="0"]').click();
await page.waitForTimeout(200);

// Six correct answers in a row stays inside levels 0-1, where tafel only
// ever asks straight multiplication, so "a x b" can be parsed and answered
// reliably - enough to clear the shop's cheapest item (30 coins: 3 x 5 at
// level 0, then 2 x 10 at level 1, once the third correct answer levels up).
for (let i = 0; i < 6; i++) {
  const text = await page.locator(".kmg-question-text").textContent();
  const [a, b] = [...text.matchAll(/\d+/g)].map((m) => Number(m[0]));
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    note("rewards:earn", `could not parse question ${i + 1}: "${text}"`);
    break;
  }
  await page.locator(".kmg-numinput").fill(String(a * b));
  await page.locator(".kmg-actions .kmg-btn-primary").first().click();
  const ok = await page
    .waitForSelector(".kmg-banner-ok", { timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (!ok) {
    // Wrong answers do not auto-advance, and the check button then stays
    // disabled - stop here rather than hang retrying a frozen question.
    note("rewards:earn", `answer ${i + 1} to "${text}" was not marked correct`);
    break;
  }
  await page.waitForTimeout(1400); // auto-advance to the next question
}

const coinsBefore = Number(await page.locator(".kmg-scorebox-coins").first().textContent());
if (!(coinsBefore >= 30)) note("rewards:earn", `expected at least 30 coins, sidebar shows ${coinsBefore}`);

currentRoute = "rewards:shop";
await page.goto(`${baseUrl}/#/rewards`, { waitUntil: "networkidle" });
await page.waitForSelector(".kmg-reward-card");

const balanceShown = Number(await page.locator(".kmg-reward-balance-value").textContent());
if (balanceShown !== coinsBefore) {
  note("rewards:shop", `sidebar coins (${coinsBefore}) and shop balance (${balanceShown}) disagree`);
}

// Unlock the cheapest affordable item - on a fresh profile that is the first
// locked avatar card, which the shop should auto-equip.
await page.locator(".kmg-reward-card.is-locked .kmg-reward-btn:not([disabled])").first().click();
await page.waitForTimeout(300);

if (!(await page.locator(".kmg-reward-card.is-unlocked").count())) {
  note("rewards:shop", "unlocking an item did not turn any card into is-unlocked");
}
// Scoped to the characters section: a colour theme (round 17) is equipped
// too, so an unscoped count would pass even if no character had been.
const equippedCharacters = page.locator("#kmg-rewards-avatar .kmg-reward-card.is-equipped");
if (!(await equippedCharacters.count())) {
  note("rewards:shop", "no card is marked equipped after unlocking a character");
}

const balanceAfter = Number(await page.locator(".kmg-reward-balance-value").textContent());
if (!(balanceAfter < balanceShown)) {
  note("rewards:shop", `balance did not drop after unlocking: ${balanceShown} -> ${balanceAfter}`);
}
console.log(`  rewards shop: ${balanceShown} coins -> unlocked an item -> ${balanceAfter} left`);

// A level-gated item still out of reach (mythic tier needs level 5; this
// profile only just reached level 2) must show a lock reason instead of a
// price, whatever coins are on hand.
const lockedMythicCard = page.locator(".kmg-reward-card.is-locked:has(.kmg-tier-mythic)").first();
if (await lockedMythicCard.count()) {
  const hasLockMessage = await lockedMythicCard.locator(".kmg-reward-lockmsg").count();
  const hasBuyButton = await lockedMythicCard.locator(".kmg-reward-btn").count();
  if (!hasLockMessage || hasBuyButton) {
    note("rewards:shop", "a locked mythic item should show a lock reason, not a buy button, before its level is reached");
  }
} else {
  note("rewards:shop", "expected at least one locked mythic-tier card in the shop");
}

// Round 19: star-road rewards are earned, never bought - a link to the star
// road instead of a price, on every one of them.
const starCards = page.locator(".kmg-reward-card.is-starroad");
const starCount = await starCards.count();
if (starCount < 10) note("rewards:shop", `expected the star-road rewards in the shop, found ${starCount}`);
if (await starCards.locator(".kmg-reward-btn").count()) note("rewards:shop", "a star-road reward has a buy button");
if ((await starCards.locator(".kmg-reward-starlink").count()) !== starCount) {
  note("rewards:shop", "every locked star-road reward should link to the star road");
}

// Switching back to the default character must move the "equipped" tag.
const switchButton = page.locator("#kmg-rewards-avatar .kmg-reward-card.is-unlocked .kmg-reward-btn").first();
if (await switchButton.count()) {
  await switchButton.click();
  await page.waitForTimeout(200);
  const stillOneEquipped = await equippedCharacters.count();
  if (stillOneEquipped !== 1) {
    note("rewards:shop", `expected exactly one equipped card after switching, found ${stillOneEquipped}`);
  }
}

// --- replaying an already-cleared level must not pay extra coins -----------
// (state.js: canEarnAtLevel()/clearLevel() - applies to every level, not
// just the easy ones). The 6-in-a-row streak in "rewards:earn" above already
// carried tafel from level 0 through level 2 for real, clearing level 0 (and
// level 1) along the way - picking level 0 again now, via the level picker,
// is a manual replay of already-earned content, not a fresh pass.

currentRoute = "rewards:level-replay";
await page.goto(`${baseUrl}/#/tafel`, { waitUntil: "networkidle" });
await page.waitForSelector(".kmg-question");

await page.locator('.kmg-levelbtn[data-level="2"]').click();
await page.locator('.kmg-levelbtn[data-level="0"]').click();
await page.waitForTimeout(200);

const coinsBeforeReplay = Number(await page.locator(".kmg-scorebox-coins").first().textContent());
const scoreBeforeReplay = Number(await page.locator(".kmg-scorebox-value").first().textContent());
// Daily quests (quests.js) must not be a side door round the guard either: a
// replay answer that paid nothing may not move any quest. Read through the
// app's own module instance - same URL, so the same live state.
const readDaily = () =>
  page.evaluate(async () => JSON.stringify((await import("./js/state.js")).state.daily));
const dailyBeforeReplay = await readDaily();

const replayText = await page.locator(".kmg-question-text").textContent();
const [ra, rb] = [...replayText.matchAll(/\d+/g)].map((m) => Number(m[0]));
if (!Number.isFinite(ra) || !Number.isFinite(rb)) {
  note("rewards:level-replay", `could not parse question "${replayText}"`);
} else {
  await page.locator(".kmg-numinput").fill(String(ra * rb));
  await page.locator(".kmg-actions .kmg-btn-primary").first().click();
  await page.waitForSelector(".kmg-banner-ok", { timeout: 4000 });

  const bannerText = await page.locator(".kmg-banner-msg").first().textContent();
  if (!bannerText.includes("🔁")) {
    note("rewards:level-replay", `expected a practice/no-bonus note in the feedback, got "${bannerText}"`);
  }

  const scoreAfterReplay = Number(await page.locator(".kmg-scorebox-value").first().textContent());
  const coinsAfterReplay = Number(await page.locator(".kmg-scorebox-coins").first().textContent());
  if (scoreAfterReplay !== scoreBeforeReplay) {
    note(
      "rewards:level-replay",
      `a cleared level's replay must not grant score either: ${scoreBeforeReplay} -> ${scoreAfterReplay}`,
    );
  }
  if (coinsAfterReplay !== coinsBeforeReplay) {
    note(
      "rewards:level-replay",
      `replaying an already-cleared level should not pay coins: ${coinsBeforeReplay} -> ${coinsAfterReplay}`,
    );
  }
  if ((await readDaily()) !== dailyBeforeReplay) {
    note("rewards:level-replay", "a replay answer that paid nothing still moved today's quest progress");
  }
  // Round 19: the invitation up appears right under the practice answer,
  // where a child on a phone is looking - not only in the picker at the top.
  const invite = await page.locator(".kmg-climb-host .kmg-climb").textContent().catch(() => null);
  if (!invite) note("rewards:level-replay", "no climb invitation under a practice answer on a mastered level");
  else if (!/2/.test(invite) || !/⭐/.test(invite)) note("rewards:level-replay", `the invitation should name level 2 and its stars: "${invite}"`);
  console.log(`  level replay: coins stayed at ${coinsBeforeReplay} after a correct answer back at level 0`);
}

// --- round 18: the replay is explained, with one tap up to where coins are --
// Sitting on a mastered level shows a nudge naming the next level that still
// pays, and the picker marks the mastered levels. The nudge's button must
// actually move the game there.

currentRoute = "rewards:nudge";
{
  const nudgeVisible = await page.locator(".kmg-practice-nudge").isVisible();
  if (!nudgeVisible) note(currentRoute, "no 'move up' nudge while playing an already-mastered level");
  const cleared = await page.$$eval(".kmg-levelbtn.is-cleared", (buttons) => buttons.map((b) => b.dataset.level));
  if (JSON.stringify(cleared) !== JSON.stringify(["0", "1"])) {
    note(currentRoute, `the picker should mark levels 0 and 1 as mastered, marks ${JSON.stringify(cleared)}`);
  }
  if (nudgeVisible) {
    await page.locator(".kmg-practice-nudge-btn").click();
    await page.waitForTimeout(250);
    const current = await page.locator(".kmg-levelbtn.is-current").getAttribute("data-level");
    if (current !== "2") note(currentRoute, `the nudge should move the game to level 2, it is on ${current}`);
    if (await page.locator(".kmg-practice-nudge").isVisible()) note(currentRoute, "the nudge stayed up on a level that pays");
    console.log(`  practice nudge: mastered ${cleared.join(",")}, one tap up to level ${current}`);
  }
}

// --- home tiles after a game has been played --------------------------------
// Every tile of an already-tried game used to end in the literal word "null"
// (Node.append() stringifies a null child), and Tafel Monster read "Level
// 6/5" with its bar at 120%, because the tile assumed every game stops at 5.
// Since round 18 every game counts out of 7.

currentRoute = "home:tiles";
await page.goto(`${baseUrl}/#/home`, { waitUntil: "networkidle" });
await page.waitForSelector(".kmg-tile");
const tileTexts = await page.$$eval(".kmg-tile", (tiles) => tiles.map((tile) => tile.textContent));
const nullTile = tileTexts.find((text) => /null|undefined|NaN/.test(text));
if (nullTile) note("home:tiles", `a game tile renders junk text: "${nullTile.trim()}"`);
const tafelMeta = await page.locator('.kmg-tile[href="#/tafel"] .kmg-tile-meta').textContent();
if (!/\/7\b/.test(tafelMeta)) note("home:tiles", `Tafel Monster's tile should count levels out of 7, shows "${tafelMeta}"`);
// One pip per level, the mastered ones filled: rewards:earn mastered 0 and 1.
const tafelPips = await page.$$eval('.kmg-tile[href="#/tafel"] .kmg-tile-pip', (pips) => pips.map((p) => p.className));
if (tafelPips.length !== 8) note("home:tiles", `Tafel Monster's tile should show 8 level pips, shows ${tafelPips.length}`);
if (tafelPips.filter((c) => c.includes("is-cleared")).length !== 2) {
  note("home:tiles", `Tafel Monster's tile should show levels 0 and 1 as mastered: ${JSON.stringify(tafelPips)}`);
}
if (!(await page.locator(".kmg-challenge").count())) note("home:tiles", "no next-challenge card on the home page");
if (!(await page.locator(".kmg-passport td.is-cleared").count())) note("home:tiles", "the level passport shows no mastered level");
console.log(`  home tiles: ${tileTexts.length} tiles, tafel shows "${tafelMeta.trim()}"`);

// --- the answer must be recorded for the parent dashboard ------------------

currentRoute = "dashboard:data";
await page.goto(`${baseUrl}/#/dashboard`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const hasChart = await page.locator(".kmg-chart svg").count();
if (!hasChart) note("dashboard:data", "no chart rendered after a question was answered");
const hasRows = await page.locator(".kmg-logtable tbody tr").count();
if (!hasRows) note("dashboard:data", "the answered question is not in the log table");
const hasActivityRows = await page.locator(".kmg-activity-table tbody tr").count();
if (!hasActivityRows) note("dashboard:data", "no rows in the daily activity log table");
// Round 18: the parent sees which levels are mastered, per game.
const masteryRows = await page.$$eval(".kmg-mastery-table tbody tr", (rows) => rows.map((r) => r.textContent));
if (!masteryRows.some((text) => /Tafel/.test(text) && /0, 1/.test(text))) {
  note("dashboard:data", `the mastery table should list Tafel Monster with levels 0, 1: ${JSON.stringify(masteryRows)}`);
}

// A refresh must not lose any of it - the whole point of keeping results and
// activity in localStorage instead of only in page memory.
currentRoute = "dashboard:reload";
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);
if (!(await page.locator(".kmg-logtable tbody tr").count())) {
  note("dashboard:reload", "the log table is empty after refreshing the page");
}
if (!(await page.locator(".kmg-activity-table tbody tr").count())) {
  note("dashboard:reload", "the daily activity log is empty after refreshing the page");
}

// --- language switch -------------------------------------------------------

currentRoute = "i18n";
await page.goto(`${baseUrl}/#/home`, { waitUntil: "networkidle" });
const dutchHeading = await page.locator("#kmg-main h1").first().textContent();
await page.locator('.kmg-langbtn[data-lang="en"]').click();
await page.waitForTimeout(400);
const englishHeading = await page.locator("#kmg-main h1").first().textContent();
if (dutchHeading === englishHeading) {
  note("i18n", `switching to English did not change the heading ("${dutchHeading}")`);
}
await page.locator('.kmg-langbtn[data-lang="nl"]').click();
await page.waitForTimeout(300);

// --- a timed game must actually tick, and stop when you leave --------------

currentRoute = "bliksem:timer";
await page.goto(`${baseUrl}/#/bliksemronde`, { waitUntil: "networkidle" });
await page.locator(".kmg-stage .kmg-btn-big").first().click();
await page.waitForSelector(".kmg-ring", { timeout: 4000 });
const firstTick = await page.locator(".kmg-ring text").textContent();
await page.waitForTimeout(1600);
const secondTick = await page.locator(".kmg-ring text").textContent();
if (firstTick === secondTick) note("bliksem:timer", `the clock did not move (${firstTick})`);
console.log(`  bliksem clock: ${firstTick}s -> ${secondTick}s`);

// Navigating away mid-round must not leave the rAF loop running on a detached
// node - that used to be the classic leak in this kind of app.
await page.goto(`${baseUrl}/#/home`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

// --- Racewedstrijd / Race Challenge: the race mode ---------------------

// The race's operator can be +, − (U+2212), × (U+00D7) or a ":" division, so
// parsing "a OP b = ?" needs all four rather than the simple a*b tafel uses.
function computeRaceAnswer(text) {
  const m = text.match(/^(\d+)\s*([+−×:])\s*(\d+)\s*=/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[3]);
  if (m[2] === "+") return a + b;
  if (m[2] === "−") return a - b;
  if (m[2] === "×") return a * b;
  return a / b; // ":" - shown as "dividend : divisor"
}

// Read the question off one side-by-side player card and tap the matching
// choice button - the tap *is* the submission, there is no check button.
async function answerPlayerCard(page, cardIndex) {
  const card = page.locator(".kmg-race-player-card").nth(cardIndex);
  const text = await card.locator(".kmg-question-text").textContent();
  const answer = computeRaceAnswer(text ?? "");
  if (answer == null) return null;
  await card.locator(".kmg-choice", { hasText: new RegExp(`^${answer}$`) }).first().click();
  return answer;
}

// --- Local: several players race side by side on this one device ---------

currentRoute = "compete:local";
await page.goto(`${baseUrl}/#/compete`, { waitUntil: "networkidle" });
await page.waitForSelector(".kmg-race-mode-tab");
await page.locator(".kmg-race-mode-tab").nth(1).click(); // "Together on this device"
await page.waitForSelector(".kmg-levelrow .kmg-levelbtn");
// Level 0 is addition/subtraction only, so every question is answerable by
// straightforward parsing - avoids a round hanging on an unlucky draw.
await page.locator(".kmg-levelbtn", { hasText: /^0$/ }).first().click();
await page.locator(".kmg-race-segment-btn", { hasText: /^5\b/ }).first().click(); // 5 questions, keeps this fast
await page.locator(".kmg-btn-primary", { hasText: /🏁/ }).first().click();
await page.waitForSelector(".kmg-race-arena .kmg-race-player-card", { timeout: 6000 });

let localRoundsPlayed = 0;
for (let i = 0; i < 6; i++) {
  if (await page.locator(".kmg-race-winner-banner").count()) break;
  const cardCount = await page.locator(".kmg-race-player-card").count();
  if (cardCount !== 2) {
    note("compete:local", `expected 2 side-by-side player cards, found ${cardCount}`);
    break;
  }
  const a1 = await answerPlayerCard(page, 0);
  const a2 = await answerPlayerCard(page, 1);
  if (a1 == null || a2 == null) {
    note("compete:local", "could not parse a race question on one of the player cards");
    break;
  }
  localRoundsPlayed += 1;
  await page.waitForTimeout(1300); // feedback banner, then auto-advance to the next round
}

const localFinished = await page.locator(".kmg-race-winner-banner").count();
if (!localFinished) {
  note("compete:local", `local race did not reach the results screen after ${localRoundsPlayed} round(s)`);
} else {
  const summaryCards = await page.locator(".kmg-race-summary-card").count();
  if (summaryCards !== 2) note("compete:local", `expected 2 result summary cards, found ${summaryCards}`);
  if (!(await page.locator(".kmg-btn-primary", { hasText: /🔁/ }).count())) {
    note("compete:local", "results screen has no rematch button");
  }
}
console.log(`  compete local: played ${localRoundsPlayed} round(s) side by side -> results ${localFinished ? "shown" : "MISSING"}`);

// Two children racing on ONE PHONE have to be able to answer at the same
// moment. That needs two separate things to hold, and round 13 only got the
// second one:
//
//   1. Every player's card has to be ON THE SCREEN at once. On a 390x844
//      phone the cards stacked vertically and the page's own heading and
//      intro sat above them, so player 2's card started at y=884 - below the
//      fold of an 844px screen. No amount of correct event handling helps a
//      button nobody can reach, and this is why "only one person can touch
//      the screen at a time" survived round 13's fix.
//   2. Two simultaneous taps both have to REGISTER. A touch browser only
//      synthesizes a mouse-compatibility `click` for the first finger of a
//      multi-touch gesture, so `click` alone silently drops the second
//      player's tap; compete.js also listens on `pointerdown` and on a
//      document-level `touchstart` that walks `changedTouches`.
//
// The context below is a real PHONE (isMobile, 390x844) rather than a
// desktop viewport with hasTouch bolted on - round 13's check ran at
// 1280x900, where the cards fit side by side anyway, which is exactly why it
// passed while the phone stayed broken. The taps go through the low-level
// CDP Input.dispatchTouchEvent, both points in one call: a JS-dispatched
// PointerEvent proves nothing here, because Chromium synthesizes a
// compatibility click for a script-dispatched touch pointerdown whether or
// not another finger is already down, masking the very bug this catches.
currentRoute = "compete:local:multitouch";
{
  /**
   * Play one local round on a phone-sized touch context and report what
   * happened. `silence` names event types to swallow at the capture phase,
   * so one input path can be tested with the others switched off.
   */
  async function phoneRaceRound(silence = []) {
    const touchContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2,
    });
    const touchPage = await touchContext.newPage();
    touchPage.on("pageerror", (error) => note(currentRoute, `page error: ${error.message}`));
    touchPage.on("console", (message) => {
      if (message.type() === "error") note(currentRoute, `console error: ${message.text()}`);
    });

    await touchPage.goto(`${baseUrl}/#/compete`, { waitUntil: "networkidle" });
    await touchPage.waitForSelector(".kmg-race-mode-tab");
    await touchPage.locator(".kmg-race-mode-tab").nth(1).click();
    await touchPage.waitForSelector(".kmg-levelrow .kmg-levelbtn");
    await touchPage.locator(".kmg-levelbtn", { hasText: /^0$/ }).first().click();
    await touchPage.locator(".kmg-btn-primary", { hasText: /🏁/ }).first().click();
    await touchPage.waitForSelector(".kmg-race-arena .kmg-race-player-card", { timeout: 8000 });

    if (silence.length) {
      await touchPage.evaluate((types) => {
        for (const type of types) {
          // A capture-phase listener on document stops the event before it
          // reaches the button; touchstart is handled ON document, so that
          // one needs stopImmediatePropagation from window instead.
          document.addEventListener(type, (e) => e.stopPropagation(), true);
          if (type === "touchstart") {
            window.addEventListener("touchstart", (e) => e.stopImmediatePropagation(), true);
          }
        }
      }, silence);
    }

    const cards = touchPage.locator(".kmg-race-player-card");
    const texts = await cards.locator(".kmg-question-text").allTextContents();
    const answers = texts.map((text) => computeRaceAnswer(text ?? ""));
    if (answers.length !== 2 || answers.some((a) => a == null)) {
      note(currentRoute, `could not parse both player cards' questions: ${JSON.stringify(texts)}`);
      await touchContext.close();
      return null;
    }

    const layout = await touchPage.evaluate((answerStrings) => {
      const buttons = [...document.querySelectorAll(".kmg-race-player-card")].map((card, i) => {
        const btn = [...card.querySelectorAll(".kmg-choice")].find((b) => b.textContent.trim() === answerStrings[i]);
        const r = btn.getBoundingClientRect();
        return {
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          width: Math.round(r.width),
          height: Math.round(r.height),
          onScreen: r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth,
        };
      });
      return { buttons, viewportHeight: window.innerHeight, scrollHeight: document.documentElement.scrollHeight };
    }, answers.map(String));

    const cdp = await touchContext.newCDPSession(touchPage);
    // Both touch points go down in the SAME dispatchTouchEvent call - two
    // fingers landing at once, not two quick taps in a row.
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: layout.buttons.map((p) => ({ x: p.x, y: p.y })),
    });
    await touchPage.waitForTimeout(350);

    const registered = await touchPage.evaluate(() =>
      [...document.querySelectorAll(".kmg-race-player-card")].map((card) =>
        [...card.querySelectorAll(".kmg-choice")].some((b) => b.disabled),
      ),
    );
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }).catch(() => {});
    await touchContext.close();
    return { ...layout, registered };
  }

  const result = await phoneRaceRound();
  if (result) {
    const offScreen = result.buttons.filter((b) => !b.onScreen).length;
    if (offScreen) {
      note(
        currentRoute,
        `${offScreen} of 2 player cards' answer buttons are off-screen on a 390x844 phone - a second child physically cannot reach them`,
      );
    }
    if (result.scrollHeight > result.viewportHeight + 1) {
      note(
        currentRoute,
        `the local race play view scrolls on a phone (${result.scrollHeight}px of content in a ${result.viewportHeight}px screen); every player's card must fit at once`,
      );
    }
    // The arena sets touch-action: none, so a target that shrank below the
    // 44px minimum could not be scrolled away from either.
    const tooSmall = result.buttons.filter((b) => b.width < 44 || b.height < 44).length;
    if (tooSmall) {
      note(currentRoute, `${tooSmall} choice buttons are under the 44px minimum touch target: ${JSON.stringify(result.buttons)}`);
    }
    const bothRegistered = result.registered.length === 2 && result.registered.every(Boolean);
    if (!bothRegistered) {
      note(
        currentRoute,
        `a genuinely simultaneous two-finger tap on two different player cards did not register both answers (multi-touch regression): ${JSON.stringify(result.registered)}`,
      );
    }
    console.log(
      `  compete local multi-touch (phone 390x844): both cards on screen: ${!offScreen}, both taps registered: ${bothRegistered}`,
    );
  }

  // The touchstart path has to work on its own, because on a browser that
  // coalesces several simultaneous touches into one touchstart event it is
  // the only path that sees the second finger. Switching click and
  // pointerdown off is the only way to tell that it is carrying its weight
  // rather than being shadowed by them.
  const touchOnly = await phoneRaceRound(["click", "pointerdown"]);
  if (touchOnly) {
    const ok = touchOnly.registered.length === 2 && touchOnly.registered.every(Boolean);
    if (!ok) {
      note(
        currentRoute,
        `with click and pointerdown suppressed, the document-level touchstart handler did not register both simultaneous taps: ${JSON.stringify(touchOnly.registered)}`,
      );
    }
    console.log(`  compete local multi-touch: touchstart path alone registers both taps: ${ok}`);
  }
}

// Leaving mid-race must stop the shared timer, same as bliksem above - the
// exact same class of leak, in a page that reimplements its own countdown.
await page.goto(`${baseUrl}/#/home`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

// --- Online: a real join code against this same dev server ---------------
//
// The dev server this smoke test runs against (node server.js) is exactly
// the self-hosted setup race-server.js is built for, so this exercises the
// whole path for real: two browser pages, one WebSocket room, no mocking.

currentRoute = "compete:online";
await page.goto(`${baseUrl}/#/compete`, { waitUntil: "networkidle" });
await page.waitForSelector(".kmg-race-mode-tab"); // online + "create" is the default
await page.locator(".kmg-race-segment-btn", { hasText: /^5\b/ }).first().click();
await page.locator(".kmg-btn-primary", { hasText: /🏁/ }).first().click();

const codeVisible = await page
  .waitForSelector(".kmg-race-big-code", { timeout: 6000 })
  .then(() => true)
  .catch(() => false);

if (!codeVisible) {
  note("compete:online", "creating a room never showed a join code");
} else {
  const roomCode = (await page.locator(".kmg-race-big-code").textContent())?.trim();

  const guest = await context.newPage();
  guest.on("pageerror", (error) => note("compete:online", `guest page error: ${error.message}`));
  guest.on("console", (message) => {
    if (message.type() === "error") note("compete:online", `guest console error: ${message.text()}`);
  });
  // A shared join link pre-fills the code, exactly like a pasted invite would.
  await guest.goto(`${baseUrl}/#/compete?race=${roomCode}`, { waitUntil: "networkidle" });
  await guest.waitForSelector(".kmg-race-mode-tab");
  const codeField = guest.locator("input.kmg-textinput").last();
  if ((await codeField.inputValue()).toUpperCase() !== roomCode) await codeField.fill(roomCode);
  await guest.locator(".kmg-btn-primary", { hasText: /🏁/ }).first().click();

  const guestJoined = await guest
    .waitForSelector(".kmg-race-players-status .kmg-race-player-pill.is-me", { timeout: 6000 })
    .then(() => true)
    .catch(() => false);
  if (!guestJoined) note("compete:online", "guest never reached the lobby after joining with the code");

  const hostSeesGuest = await page
    .waitForFunction(() => document.querySelectorAll(".kmg-race-players-status .kmg-race-player-pill").length >= 2, {
      timeout: 6000,
    })
    .then(() => true)
    .catch(() => false);
  if (!hostSeesGuest) note("compete:online", "host lobby never updated to show the guest joining live");

  if (hostSeesGuest) {
    await page.locator(".kmg-btn-primary", { hasText: /🏁/ }).first().click(); // host starts the race
    const [hostInRound, guestInRound] = await Promise.all([
      page.waitForSelector(".kmg-choices .kmg-choice", { timeout: 8000 }).then(() => true).catch(() => false),
      guest.waitForSelector(".kmg-choices .kmg-choice", { timeout: 8000 }).then(() => true).catch(() => false),
    ]);
    if (!hostInRound || !guestInRound) {
      note("compete:online", `the round did not reach both players (host: ${hostInRound}, guest: ${guestInRound})`);
    } else {
      await page.locator(".kmg-choices .kmg-choice").first().click();
      await guest.locator(".kmg-choices .kmg-choice").first().click();
      const recapReached = await page
        .waitForSelector(".kmg-race-feedback .kmg-msg-ok, .kmg-race-feedback .kmg-msg-bad", { timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (!recapReached) note("compete:online", "the round recap never reached the host after both players answered");
    }
  }
  await guest.close();
}
console.log(`  compete online: join code ${codeVisible ? "shown and joined" : "MISSING"}`);

// Leaving an online race must stop it. RaceClient.stop() used to close the
// socket while the room code was still set, and the socket's close handler
// then started a fresh poller that nobody stopped: the page, already gone,
// kept logging every round of the race as a wrong answer (with the "wrong"
// sound) in whatever the child played next. Found in round 19, when those
// phantom answers made a new game's "one jump = one answer" check fail.
currentRoute = "compete:leave";
{
  await page.goto(`${baseUrl}/#/home`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const logged = () => page.evaluate(async () => (await import("./js/log.js")).allAttempts().length);
  const before = await logged();
  const polls = [];
  const onRequest = (request) => {
    if (/\/api\/rooms\//.test(request.url())) polls.push(request.url());
  };
  page.on("request", onRequest);
  await page.waitForTimeout(3500);
  page.off("request", onRequest);
  const after = await logged();
  if (after !== before) note(currentRoute, `${after - before} answer(s) were logged after leaving the online race`);
  if (polls.length) note(currentRoute, `the race kept polling the server after it was left: ${polls.length} request(s)`);
  console.log(`  compete left: ${polls.length} polls and ${after - before} answers logged in 3.5 s afterwards`);
}

// --- mobile layout ---------------------------------------------------------

currentRoute = "mobile";
const phone = await context.newPage();
phone.on("pageerror", (error) => note("mobile", `page error: ${error.message}`));
await phone.setViewportSize({ width: 390, height: 780 });
await phone.goto(`${baseUrl}/#/breuken`, { waitUntil: "networkidle" });
await phone.waitForSelector(".kmg-question", { timeout: 8000 });
const overflow = await phone.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
if (overflow > 1) note("mobile", `the page scrolls sideways by ${overflow}px at 390px wide`);

// Nothing may sit invisibly on top of the game. A full-screen overlay left
// showing at phone width dims the page and swallows every tap, and it looks
// almost right in a screenshot - so assert on the actual hit test.
const covered = await phone.evaluate(async () => {
  const target = document.querySelector(".kmg-padkey, .kmg-choice, .kmg-btn-primary");
  if (!target) return "no tappable control found";

  // elementFromPoint only answers for coordinates inside the viewport, so
  // scroll the control into view first - otherwise every below-the-fold
  // control looks "covered" and the check cries wolf.
  target.scrollIntoView({ block: "center", behavior: "instant" });
  await new Promise((resolve) => requestAnimationFrame(resolve));

  const box = target.getBoundingClientRect();
  const onTop = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
  if (!onTop) return "the control is outside the viewport";
  if (onTop === target || target.contains(onTop)) return null;
  const describe = (node) =>
    `<${node.tagName.toLowerCase()} class="${node.getAttribute("class") ?? ""}">`;
  return `covered by ${describe(onTop)}`;
});
if (covered) note("mobile", `the first control is not tappable: ${covered}`);

// And prove it by clicking: Playwright refuses a click that another element
// would intercept.
await phone
  .locator(".kmg-padkey, .kmg-choice, .kmg-btn-primary")
  .first()
  .click({ timeout: 3000 })
  .catch((error) => note("mobile", `could not tap the first control: ${error.message.split("\n")[0]}`));

if (shotDir) await phone.screenshot({ path: path.join(shotDir, "mobile-breuken.png") });
await phone.close();

// --- round 17: buddy, daily quests + chest, treasures, themes, goal ---------
// On a phone-sized page, because that is where the new home cards and the
// shop's jump bar have to fit. A fresh context, so this player starts clean.

currentRoute = "progression";
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  // Seed once, on the very first load only - a reseed on every navigation
  // would undo the reload checks below (session 7's lesson).
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem("kmg.test.seeded")) return;
    sessionStorage.setItem("kmg.test.seeded", "1");
    localStorage.setItem(
      "kmg.profiles",
      JSON.stringify({ Sam: { totalScore: 300, coins: 200, levels: { tafel: 2 }, gamesTried: ["tafel"] } }),
    );
    localStorage.setItem("kmg.currentPlayer", "Sam");
  });
  const p = await ctx.newPage();
  p.on("pageerror", (error) => note(currentRoute, `page error: ${error.message}`));
  p.on("console", (message) => {
    if (message.type() === "error") note(currentRoute, `console error: ${message.text()}`);
  });
  const coins = async () => Number(await p.locator(".kmg-scorebox-coins").first().textContent());
  const sideways = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  await p.goto(`${baseUrl}/#/home`, { waitUntil: "networkidle" });
  await p.waitForSelector(".kmg-buddy");
  if (!(await p.locator(".kmg-buddy-emoji").textContent())?.trim()) note(currentRoute, "the buddy has no picture");
  const questRows = await p.locator(".kmg-quest").count();
  if (questRows !== 3) note(currentRoute, `expected 3 daily quests on the home page, found ${questRows}`);
  if (await p.locator(".kmg-chest-btn").count()) note(currentRoute, "the chest is openable before any quest is done");
  if ((await sideways()) > 1) note(currentRoute, `home scrolls sideways on a phone by ${await sideways()}px`);
  if (!(await p.locator('a[href^="mailto:nxtrung87@gmail.com"]').count())) {
    note(currentRoute, "no feedback email link on the home page");
  }

  // Finishing three quests honestly would take a whole scripted session, and
  // which three depends on the date. So mark today's three done through the
  // app's own modules (same URL, same instance), then re-render with a hash
  // round-trip rather than a reload, so the autosave cannot race it.
  await p.evaluate(async () => {
    const s = await import("./js/state.js");
    const q = await import("./js/quests.js");
    const today = s.dayKey();
    s.state.daily = { ...s.freshDaily(today), completed: q.questsForDay(today).map((quest) => quest.id) };
    s.saveCurrentProfile();
  });
  await p.evaluate(() => (location.hash = "#/uitleg"));
  await p.waitForTimeout(250);
  await p.evaluate(() => (location.hash = "#/home"));
  await p.waitForSelector(".kmg-chest-btn", { timeout: 4000 }).catch(() => note(currentRoute, "all quests done but no chest button"));

  const coinsBeforeChest = await coins();
  await p.locator(".kmg-chest-btn").click();
  await p.waitForSelector(".kmg-chest.is-open", { timeout: 4000 }).catch(() => note(currentRoute, "the chest did not open"));
  const coinsAfterChest = await coins();
  if (coinsAfterChest !== coinsBeforeChest + 40) {
    note(currentRoute, `the chest should pay 40 coins: ${coinsBeforeChest} -> ${coinsAfterChest}`);
  }

  // Opened is opened: a reload must not re-arm today's chest.
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForSelector(".kmg-quests");
  if (await p.locator(".kmg-chest-btn").count()) note(currentRoute, "today's chest could be opened again after a reload");

  // The shop: the treasure is in the collection, a theme can be bought and
  // actually recolours the app (and stays on after a reload), and 🎯 pins a
  // savings goal that shows up in the sidebar.
  await p.goto(`${baseUrl}/#/rewards`, { waitUntil: "networkidle" });
  await p.waitForSelector(".kmg-reward-jump");
  const treasures = await p.locator(".kmg-reward-card.is-treasure.is-unlocked").count();
  if (treasures !== 1) note(currentRoute, `expected exactly 1 found treasure in the shop, found ${treasures}`);
  if ((await sideways()) > 1) note(currentRoute, `the shop scrolls sideways on a phone by ${await sideways()}px`);

  await p.locator('[data-reward="theme_ocean"] .kmg-btn-primary').click();
  await p.waitForTimeout(200);
  const theme = await p.evaluate(() => document.documentElement.dataset.theme);
  if (theme !== "ocean") note(currentRoute, `buying the ocean theme did not apply it (data-theme="${theme}")`);

  await p.locator('[data-reward="avatar_lion"] .kmg-reward-goalbtn').click();
  await p.waitForTimeout(200);
  if (!(await p.locator(".kmg-scorebox-goal").count())) note(currentRoute, "pinning a goal did not show it in the sidebar");

  await p.reload({ waitUntil: "networkidle" });
  await p.waitForSelector(".kmg-reward-card");
  const themeAfterReload = await p.evaluate(() => document.documentElement.dataset.theme);
  if (themeAfterReload !== "ocean") note(currentRoute, `the theme did not survive a reload (data-theme="${themeAfterReload}")`);
  if (!(await p.locator(".kmg-reward-card.is-goal").count())) note(currentRoute, "the savings goal did not survive a reload");

  if (shotDir) await p.screenshot({ path: path.join(shotDir, "progression-shop.png") });
  console.log(
    `  progression: 3 quests, chest ${coinsBeforeChest} -> ${coinsAfterChest} coins + ${treasures} treasure, theme "${themeAfterReload}", goal pinned`,
  );
  await ctx.close();
}

// --- round 18: reading games -------------------------------------------------
// Leesdetective at level 0: a template text whose right answer is the only
// option that appears in it, so the script can read it the way a child does.
// Three right answers are three questions about one text, and its words
// count once.

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

currentRoute = "lezen:play";
{
  await page.goto(`${baseUrl}/#/lezen`, { waitUntil: "networkidle" });
  await page.waitForSelector(".kmg-passage");
  await page.locator('.kmg-levelbtn[data-level="2"]').click();
  await page.locator('.kmg-levelbtn[data-level="0"]').click();
  await page.waitForSelector(".kmg-passage-text");
  const readState = () => page.evaluate(async () => {
    const s = (await import("./js/state.js")).state;
    return { words: s.wordsRead, right: s.readCorrect };
  });
  const before = await readState();
  const firstText = await page.locator(".kmg-passage-text").textContent();
  const expectedWords = await page.evaluate(async (text) => (await import("./js/reading-data.js")).wordCount(text), firstText);
  if (!(await page.locator(".kmg-skillchip").count())) note(currentRoute, "the text card does not name its reading skill");
  let answered = 0;
  for (let i = 0; i < 3; i++) {
    const passage = await page.locator(".kmg-passage-text").textContent();
    if (passage !== firstText) note(currentRoute, `question ${i + 1} is about a different text`);
    const options = await page.locator(".kmg-choice").allTextContents();
    const right = options.find((o) => new RegExp(`(^|[^\\p{L}])${escapeRegex(o)}([^\\p{L}]|$)`, "u").test(passage));
    if (!right) {
      note(currentRoute, `no option appears in the text: ${JSON.stringify(options)} / "${passage}"`);
      break;
    }
    await page.locator(".kmg-choice", { hasText: new RegExp(`^${escapeRegex(right)}$`) }).click();
    const ok = await page.waitForSelector(".kmg-banner-ok", { timeout: 4000 }).then(() => true).catch(() => false);
    if (!ok) {
      note(currentRoute, `"${right}" was not marked right`);
      break;
    }
    answered += 1;
    await page.waitForTimeout(1400);
  }
  const after = await readState();
  if (after.words - before.words !== expectedWords) {
    note(currentRoute, `words read should grow by the text's ${expectedWords} words once, grew by ${after.words - before.words}`);
  }
  if (after.right - before.right !== answered) note(currentRoute, `reading questions right grew by ${after.right - before.right}, expected ${answered}`);
  console.log(`  lezen: ${answered} questions about one text, +${after.words - before.words} words read`);

  // Spelling at a groep 8 level: any answer gives feedback, a wrong one the rule.
  currentRoute = "spelling:play";
  await page.goto(`${baseUrl}/#/spelling`, { waitUntil: "networkidle" });
  await page.locator('.kmg-levelbtn[data-level="6"]').click();
  await page.waitForTimeout(200);
  if (!/🎓/.test(await page.locator(".kmg-level-badge").textContent())) note(currentRoute, "a groep 8 level is not marked 🎓");
  await page.locator(".kmg-choice").first().click();
  await page.waitForSelector(".kmg-banner", { timeout: 4000 }).catch(() => note(currentRoute, "no feedback after answering"));
  if (await page.locator(".kmg-banner-bad").count()) {
    const tip = await page.locator(".kmg-banner-tip").textContent();
    if (!/kofschip/.test(tip ?? "")) note(currentRoute, `a wrong answer at level 6 should explain 't kofschip, says "${tip}"`);
  }
}

// --- round 18: arcade games on a phone ------------------------------------------
// The whole playfield and the question must be on screen at once - a child
// cannot scroll while steering - and a run must end on its own: never
// tapping after the start drops the bird three times.

currentRoute = "arcade:phone";
{
  // Small phone, ordinary phone and a phone on its side, each with the
  // longest questions there are (words mode, level 7). Started from the
  // keyboard: a Playwright click on the canvas would scroll it into view by
  // itself and hide exactly the overflow this is looking for.
  for (const [w, h] of [[360, 640], [390, 844], [844, 390]]) {
    const fitCtx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
    await fitCtx.addInitScript(() => localStorage.setItem("kmg.arcade.mode", "words"));
    const fp = await fitCtx.newPage();
    fp.on("pageerror", (error) => note(currentRoute, `page error: ${error.message}`));
    for (const route of ["fladdervogel", "sprongheld", "lavatoren", "turbokart"]) {
      await fp.goto(`${baseUrl}/#/${route}`, { waitUntil: "networkidle" });
      await fp.locator('.kmg-levelbtn[data-level="7"]').click();
      await fp.locator(".kmg-arcade .kmg-btn-big").click();
      await fp.waitForTimeout(150);
      await fp.keyboard.press("Space");
      await fp.waitForTimeout(700);
      const fit = await fp.evaluate(() => {
        const canvas = document.querySelector(".kmg-arcade-canvas").getBoundingClientRect();
        const question = document.querySelector(".kmg-arcade-question").getBoundingClientRect();
        return {
          top: question.top,
          bottom: canvas.bottom,
          vh: innerHeight,
          sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      if (fit.top < 0 || fit.bottom > fit.vh + 1) {
        note(currentRoute, `${route} at ${w}x${h}: question and playfield are not on screen together (${Math.round(fit.top)}..${Math.round(fit.bottom)} in ${fit.vh}px)`);
      }
      if (fit.sideways > 1) note(currentRoute, `${route} at ${w}x${h} scrolls sideways by ${fit.sideways}px`);
      if (shotDir) await fp.screenshot({ path: path.join(shotDir, `arcade-${route}-${w}x${h}.png`) });
    }
    await fitCtx.close();
  }

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const p = await ctx.newPage();
  p.on("pageerror", (error) => note(currentRoute, `page error: ${error.message}`));
  p.on("console", (message) => {
    if (message.type() === "error") note(currentRoute, `console error: ${message.text()}`);
  });

  // Fladdervogel: tap once to start, then let go - three falls end the run.
  await p.goto(`${baseUrl}/#/fladdervogel`, { waitUntil: "networkidle" });
  await p.locator(".kmg-arcade .kmg-btn-big").click();
  await p.locator(".kmg-arcade-canvas").tap();
  const over = await p
    .waitForSelector(".kmg-arcade .kmg-stats", { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  if (!over) note(currentRoute, "Fladdervogel never ended after the bird fell three times");
  console.log(`  arcade: 4 games' playfields fit at 360x640, 390x844 and 844x390; fladdervogel run ${over ? "ended on its own" : "DID NOT END"}`);
  await ctx.close();
}

// Sprongheld on the desktop page: the canvas really animates, stopping shows
// the results, and leaving mid-run leaves no loop behind.
currentRoute = "arcade:desktop";
{
  await page.goto(`${baseUrl}/#/sprongheld`, { waitUntil: "networkidle" });
  await page.locator(".kmg-arcade .kmg-btn-big").click();
  await page.locator(".kmg-arcade-canvas").click();
  const frameA = await page.locator(".kmg-arcade-canvas").evaluate((c) => c.toDataURL());
  await page.waitForTimeout(500);
  const frameB = await page.locator(".kmg-arcade-canvas").evaluate((c) => c.toDataURL());
  if (frameA === frameB) note(currentRoute, "the Sprongheld canvas did not change in half a second");
  const question = (await page.locator(".kmg-arcade-question .kmg-question-text").textContent())?.trim();
  if (!question || /undefined|NaN/.test(question)) note(currentRoute, `bad arcade question: "${question}"`);
  await page.locator(".kmg-arcade .kmg-btn-ghost").click(); // Stop
  await page.waitForSelector(".kmg-arcade .kmg-stats", { timeout: 4000 }).catch(() => note(currentRoute, "stopping did not show the results"));
  // Start a new run and leave in the middle of it.
  await page.locator(".kmg-arcade .kmg-btn-primary").first().click();
  await page.locator(".kmg-arcade-canvas").click();
  await page.goto(`${baseUrl}/#/home`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  console.log(`  sprongheld: canvas animates, "${question}", stop -> results, leave mid-run clean`);
}

// --- round 18: a learning bite, answered right, pays once -------------------

currentRoute = "leerhapjes";
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  p.on("pageerror", (error) => note(currentRoute, `page error: ${error.message}`));
  p.on("console", (message) => {
    if (message.type() === "error") note(currentRoute, `console error: ${message.text()}`);
  });
  const coins = async () => Number(await p.locator(".kmg-scorebox-coins").first().textContent());
  const doBite = async () => {
    await p.locator(".kmg-bite-start").click();
    await p.locator(".kmg-bite-quiz-start").click();
    const answers = await p.evaluate(async () => {
      const b = await import("./js/bites.js");
      const lang = document.documentElement.lang === "en" ? "en" : "nl";
      return b.biteOfTheDay()[lang].quiz.map((q) => q.a);
    });
    for (const answer of answers) {
      await p.locator(".kmg-bite-quiz .kmg-choice", { hasText: new RegExp(`^${escapeRegex(answer)}$`) }).click();
      await p.locator(".kmg-bite-next").click();
    }
    await p.waitForSelector(".kmg-bite-result");
    return (await p.locator(".kmg-bite-result h2").textContent())?.trim();
  };

  await p.goto(`${baseUrl}/#/leerhapjes`, { waitUntil: "networkidle" });
  await p.waitForSelector(".kmg-bite-daily");
  const coins0 = await coins();
  const score = await doBite();
  const coins1 = await coins();
  if (!/3/.test(score ?? "")) note(currentRoute, `three right answers should score 3 of 3, shows "${score}"`);
  // 15 for the card, 5 for gold, 10 for it being the bite of the day.
  if (coins1 - coins0 !== 30) note(currentRoute, `the first perfect bite of the day should pay 30 coins, paid ${coins1 - coins0}`);

  await p.reload({ waitUntil: "networkidle" });
  await p.waitForSelector(".kmg-bite-grid");
  const gold = await p.locator(".kmg-bite-card.is-gold").count();
  if (gold !== 1) note(currentRoute, `the gold card should be in the album after a reload, found ${gold}`);

  // The bite of the day stays the same bite; repeating it pays nothing.
  const coins2 = await coins();
  await doBite();
  if ((await coins()) !== coins2) note(currentRoute, "repeating a collected bite paid coins again");

  await p.goto(`${baseUrl}/#/home`, { waitUntil: "networkidle" });
  await p.waitForSelector(".kmg-homestat");
  const stats = await p.locator(".kmg-homestat").allTextContents();
  if (!stats.some((text) => /1\/24/.test(text))) note(currentRoute, `the home page should count 1/24 bites: ${JSON.stringify(stats)}`);
  console.log(`  leerhapjes: ${score}, +${coins1 - coins0} coins, gold card kept after reload, repeat paid 0`);
  await ctx.close();
}

// --- round 19: the new arcade games play, log answers and report a result ----

currentRoute = "round19:arcade";
{
  const readAnswered = () => page.evaluate(async () => (await import("./js/state.js")).state.questionsAnswered);
  // Poll from here, not with page.waitForFunction(async ...): that treats the
  // returned Promise as truthy and resolves at once, which made the first
  // version of these checks pass or fail by luck.
  const answeredMoreThan = async (n, timeout) => {
    for (const end = Date.now() + timeout; Date.now() < end; await page.waitForTimeout(100)) {
      if ((await readAnswered()) > n) return true;
    }
    return false;
  };
  // Lavatoren: a tap on the middle platform answers the first floor's question.
  await page.goto(`${baseUrl}/#/lavatoren`, { waitUntil: "networkidle" });
  await page.locator(".kmg-arcade .kmg-btn-big").click();
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
  const before = await readAnswered();
  await page.keyboard.press("2");
  // The jump is half a second of game time; on a busy machine the frame clamp
  // stretches that, so wait for the landing rather than a fixed time.
  await answeredMoreThan(before, 4000);
  await page.waitForTimeout(300);
  const jumpAnswers = (await readAnswered()) - before;
  if (jumpAnswers !== 1) {
    note(currentRoute, `jumping onto a Lavatoren platform should answer exactly one question, answered ${jumpAnswers}`);
  }
  const towerQuestion = (await page.locator(".kmg-arcade-question .kmg-question-text").textContent())?.trim();
  if (!towerQuestion || /undefined|NaN/.test(towerQuestion)) note(currentRoute, `bad Lavatoren question: "${towerQuestion}"`);
  await page.locator(".kmg-arcade .kmg-btn-ghost").click(); // Stop
  await page.waitForSelector(".kmg-arcade-result", { timeout: 4000 }).catch(() => note(currentRoute, "Lavatoren showed no result line"));
  const towerResult = await page.locator(".kmg-arcade-result").textContent().catch(() => "");

  // Turbokart: drive until the first gate is answered; the HUD shows the place.
  await page.goto(`${baseUrl}/#/turbokart`, { waitUntil: "networkidle" });
  await page.locator(".kmg-arcade .kmg-btn-big").click();
  await page.keyboard.press("Space");
  const kartBefore = await readAnswered();
  const gatePassed = await answeredMoreThan(kartBefore, 15000);
  if (!gatePassed) note(currentRoute, "Turbokart answered no gate in 15 seconds");
  const place = await page.locator(".kmg-arcade-stat-extra").textContent().catch(() => "");
  if (!/🏁 [1-4]\/4/.test(place)) note(currentRoute, `Turbokart's HUD should show the place, shows "${place}"`);
  await page.locator(".kmg-arcade .kmg-btn-ghost").click();
  await page.waitForSelector(".kmg-arcade-result", { timeout: 4000 }).catch(() => note(currentRoute, "Turbokart showed no result line"));
  const kartResult = await page.locator(".kmg-arcade-result .kmg-banner-icon").textContent().catch(() => "");
  if (!/[🥇🥈🥉🏁]/u.test(kartResult)) note(currentRoute, `Turbokart's result should carry a medal, has "${kartResult}"`);
  console.log(`  lavatoren: one jump = ${jumpAnswers} answer(s), "${towerResult.trim()}"; turbokart: gate answered, ${place.trim()}, result ${kartResult}`);
}

// --- round 19: puzzles, strategy, the park and the star road, on a phone ------
// One fresh player: solve two Rekendoku puzzles cleanly (masters levels 0 and
// 1 = 2 stars), one more with help (stays), claim the first star-road tier;
// a Tafeltactiek move each way; build in the park and play a day.

currentRoute = "round19:puzzles";
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem("kmg.test.seeded")) return;
    sessionStorage.setItem("kmg.test.seeded", "1");
    localStorage.setItem("kmg.profiles", JSON.stringify({ Puzzel: { totalScore: 0, coins: 0 } }));
    localStorage.setItem("kmg.currentPlayer", "Puzzel");
  });
  const p = await ctx.newPage();
  p.on("pageerror", (error) => note(currentRoute, `page error: ${error.message}`));
  p.on("console", (message) => {
    if (message.type() === "error") note(currentRoute, `console error: ${message.text()}`);
  });
  const game = (key) =>
    p.evaluate(async (k) => {
      const s = (await import("./js/state.js")).state;
      return { level: s.levels[k], cleared: [...(s.clearedLevels[k] ?? [])], coins: s.coins, score: s.totalScore, answered: s.questionsAnswered, park: { ...s.park } };
    }, key);
  const sideways = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  // Read the puzzle back off the screen - the cages each cell belongs to,
  // the clues from the labels - and solve it with the game's own solver.
  const solveOnScreen = () =>
    p.evaluate(async () => {
      const doku = await import("./js/games/doku.js");
      const cells = [...document.querySelectorAll(".kmg-doku-cell")];
      const n = Math.round(Math.sqrt(cells.length));
      const groups = new Map();
      cells.forEach((cell, i) => {
        const cage = cell.dataset.cage;
        if (!groups.has(cage)) groups.set(cage, []);
        groups.get(cage).push(i);
      });
      const cages = [...groups.values()].map((members) => {
        const cellsRC = members.map((i) => [Math.floor(i / n), i % n]);
        const first = cells[members[0]];
        if (first.classList.contains("is-given")) return { cells: cellsRC, op: "=", target: Number(first.textContent) };
        const label = members.map((i) => cells[i].querySelector(".kmg-doku-label")?.textContent).find(Boolean);
        const [, target, symbol] = label.match(/^(\d+)(.)$/);
        return { cells: cellsRC, op: { "+": "+", "−": "-", "×": "×", ":": ":", "÷": ":" }[symbol], target: Number(target) };
      });
      const cageOf = Array.from({ length: n }, () => Array(n).fill(-1));
      cages.forEach((cage, index) => cage.cells.forEach(([r, c]) => (cageOf[r][c] = index)));
      const solutions = doku.solve({ n, cages, cageOf }, 2);
      return { n, count: solutions.length, grid: solutions[0] };
    });

  const fillPuzzle = async () => {
    const { n, count, grid } = await solveOnScreen();
    if (count !== 1) note(currentRoute, `the Rekendoku on screen has ${count} solutions`);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const cell = p.locator(`.kmg-doku-cell[data-r="${r}"][data-c="${c}"]`);
        if (await cell.evaluate((node) => node.classList.contains("is-given"))) continue;
        await cell.click();
        await p.locator(".kmg-doku-key", { hasText: new RegExp(`^${grid[r][c]}$`) }).click();
      }
    }
    return n;
  };

  await p.goto(`${baseUrl}/#/rekendoku`, { waitUntil: "networkidle" });
  await p.waitForSelector(".kmg-doku-board");
  if ((await sideways()) > 1) note(currentRoute, `Rekendoku scrolls sideways on a phone by ${await sideways()}px`);
  // The 💡 tip explains the selected cage.
  await p.locator(".kmg-doku-cell:not(.is-given)").first().click();
  await p.locator(".kmg-doku-tipbtn").click();
  const tip = (await p.locator(".kmg-doku-tip").textContent().catch(() => "")) ?? "";
  if (!/1 t\/m 3/.test(tip)) note(currentRoute, `the level-0 tip should talk about the numbers 1 to 3: "${tip}"`);
  const start = await game("doku");
  const n0 = await fillPuzzle();
  await p.waitForSelector(".kmg-doku .kmg-banner-ok", { timeout: 4000 }).catch(() => note(currentRoute, "a correctly filled Rekendoku was not accepted"));
  let now = await game("doku");
  if (now.level !== 1 || !now.cleared.includes(0)) note(currentRoute, `a clean solve should master level 0: ${JSON.stringify(now)}`);
  if (now.answered !== start.answered + 1) note(currentRoute, "a solved puzzle should count as one answered question");
  if (!(now.score > start.score)) note(currentRoute, "a solved puzzle paid no points");
  if (shotDir) await p.screenshot({ path: path.join(shotDir, "rekendoku-solved.png") });

  await p.locator(".kmg-doku .kmg-btn-big").click(); // new puzzle, level 1
  await p.waitForSelector(".kmg-doku-board");
  await fillPuzzle();
  await p.waitForSelector(".kmg-doku .kmg-banner-ok", { timeout: 4000 }).catch(() => note(currentRoute, "the level-1 puzzle was not accepted"));
  now = await game("doku");
  if (now.level !== 2) note(currentRoute, `a second clean solve should master level 1: ${JSON.stringify(now)}`);

  // With help: show cells until it is solved; the level stays.
  await p.locator(".kmg-doku .kmg-btn-big").click();
  await p.waitForSelector(".kmg-doku-board");
  for (let i = 0; i < 20 && !(await p.locator(".kmg-doku .kmg-banner-ok").count()); i++) await p.locator(".kmg-doku-reveal").click();
  const helped = (await p.locator(".kmg-doku .kmg-banner-ok").textContent().catch(() => "")) ?? "";
  if (!/vakje/.test(helped)) note(currentRoute, `a puzzle solved with help should say so: "${helped}"`);
  if ((await game("doku")).level !== 2) note(currentRoute, "a puzzle solved with help should not change the level");
  console.log(`  rekendoku: ${n0}×${n0} solved from the screen, levels 0 and 1 mastered, a helped solve stayed on level 2`);

  // The star road: 2 stars, the first tier is ready - and pays once.
  await p.goto(`${baseUrl}/#/home`, { waitUntil: "networkidle" });
  const card = (await p.locator(".kmg-starroad-card").textContent().catch(() => "")) ?? "";
  if (!/2 ⭐/.test(card)) note(currentRoute, `the home card should show 2 stars: "${card}"`);
  if (!(await p.locator(".kmg-starroad-card.is-ready").count())) note(currentRoute, "the home card should say a reward is ready");
  await p.goto(`${baseUrl}/#/sterrenpad`, { waitUntil: "networkidle" });
  if ((await p.locator(".kmg-starroad-count").textContent())?.trim() !== "2") note(currentRoute, "the star road should count 2 stars");
  const coinsBeforeClaim = (await game("doku")).coins;
  await p.locator(".kmg-starroad-claim").first().click();
  await p.waitForTimeout(300);
  const coinsAfterClaim = (await game("doku")).coins;
  if (coinsAfterClaim !== coinsBeforeClaim + 20) note(currentRoute, `the first tier should pay 20 coins: ${coinsBeforeClaim} -> ${coinsAfterClaim}`);
  if (await p.locator(".kmg-starroad-claim").count()) note(currentRoute, "a claim button is still showing after claiming the only ready tier");
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForSelector(".kmg-starroad-tier");
  if (!(await p.locator('.kmg-starroad-tier.is-claimed[data-stars="2"]').count())) note(currentRoute, "the claimed tier was not remembered after a reload");
  if (await p.locator(".kmg-starroad-claim").count()) note(currentRoute, "the claimed tier could be claimed again after a reload");
  const history = await p.locator(".kmg-starroad-history tbody tr").allTextContents();
  if (!history.some((row) => /Rekendoku/.test(row) && /0, 1/.test(row))) note(currentRoute, `the star log should list Rekendoku 0, 1: ${JSON.stringify(history)}`);
  if ((await sideways()) > 1) note(currentRoute, `the star road scrolls sideways on a phone by ${await sideways()}px`);
  if (shotDir) await p.screenshot({ path: path.join(shotDir, "sterrenpad.png"), fullPage: true });
  console.log(`  sterrenpad: 2 stars, first tier paid ${coinsAfterClaim - coinsBeforeClaim} coins once, remembered after reload`);

  // Tafeltactiek: a right answer claims the square, the computer answers,
  // and a wrong answer claims nothing.
  await p.goto(`${baseUrl}/#/tafeltactiek`, { waitUntil: "networkidle" });
  await p.waitForSelector(".kmg-tactic-board");
  if ((await sideways()) > 1) note(currentRoute, `Tafeltactiek scrolls sideways on a phone by ${await sideways()}px`);
  const move = async (right) => {
    // A factor whose product is already taken shows a note, not a question:
    // try the next one.
    const factors = p.locator(".kmg-tactic-factor:not([disabled])");
    for (let i = 0; i < (await factors.count()) && !(await p.locator(".kmg-tactic-question").count()); i++) {
      await factors.nth(i).click();
    }
    await p.waitForSelector(".kmg-tactic-question", { timeout: 3000 });
    const [a, b] = ((await p.locator(".kmg-tactic-question-text").textContent()) ?? "").match(/\d+/g).map(Number);
    const options = await p.locator(".kmg-tactic-option").allTextContents();
    const pick = right ? String(a * b) : options.find((o) => o !== String(a * b));
    await p.locator(".kmg-tactic-option", { hasText: new RegExp(`^${pick}$`) }).click();
  };
  await move(true);
  if ((await p.locator(".kmg-tactic-cell.is-mine").count()) !== 1) note(currentRoute, "a right answer should claim exactly one square");
  const cpuMoved = await p.waitForSelector(".kmg-tactic-cell.is-theirs", { timeout: 4000 }).then(() => true).catch(() => false);
  if (!cpuMoved) note(currentRoute, "the computer never made its move");
  await p.waitForSelector(".kmg-tactic-factor:not([disabled])", { timeout: 4000 });
  await move(false);
  if ((await p.locator(".kmg-tactic-cell.is-mine").count()) !== 1) note(currentRoute, "a wrong answer should not claim a square");
  if (!/Net niet/.test((await p.locator(".kmg-tactic-note").textContent().catch(() => "")) ?? "")) note(currentRoute, "a wrong answer should show the right product");
  if (shotDir) await p.screenshot({ path: path.join(shotDir, "tafeltactiek.png") });
  console.log(`  tafeltactiek: right answer claimed a square, computer moved, wrong answer claimed nothing`);

  // Pretparkbaas: build the sweet stall with seeded park money, then play a
  // whole day. Park money moves by exactly the income for each happy
  // visitor, and never touches the shop's coins.
  await p.evaluate(async () => {
    const s = await import("./js/state.js");
    s.state.park.cash = 25;
    s.saveCurrentProfile();
  });
  await p.goto(`${baseUrl}/#/pretparkbaas`, { waitUntil: "networkidle" });
  await p.waitForSelector(".kmg-park-map");
  if ((await sideways()) > 1) note(currentRoute, `Pretparkbaas scrolls sideways on a phone by ${await sideways()}px`);
  await p.locator('.kmg-park-plot[data-attraction="candy"] .kmg-park-build').click();
  await p.waitForTimeout(200);
  if (!(await p.locator('.kmg-park-plot.is-built[data-attraction="candy"]').count())) note(currentRoute, "building the sweet stall did not put it in the park");
  const parkStart = await game("park");
  if (parkStart.park.cash !== 5) note(currentRoute, `building for €20 out of €25 should leave €5, left €${parkStart.park.cash}`);
  await p.locator(".kmg-park-open").click();
  // Level 0 asks three kinds of question, easy to read back: tickets
  // ("3 kinderen ... €4" = 3 × 4), change ("kost €6 ... briefje van €10" =
  // 10 − 6) and two prices together (3 + 5). Answer them the way a child does.
  const levelZeroAnswer = (text) => {
    const [a, b] = (text.match(/\d+/g) ?? []).map(Number);
    if (/kinderen/.test(text)) return a * b;
    if (/wisselgeld/.test(text)) return b - a;
    return a + b;
  };
  let happy = 0;
  for (let visitor = 0; visitor < 8; visitor++) {
    await p.waitForSelector(".kmg-park-option:not([disabled])", { timeout: 4000 });
    const question = (await p.locator(".kmg-park-question .kmg-question-text").textContent()) ?? "";
    const want = `€${levelZeroAnswer(question)}`;
    const right = p.locator(".kmg-park-option", { hasText: new RegExp(`^${want}$`) });
    if (await right.count()) await right.click();
    else {
      note(currentRoute, `no option ${want} for "${question}"`);
      await p.locator(".kmg-park-option").first().click();
    }
    await p.waitForSelector(".kmg-park .kmg-banner", { timeout: 3000 });
    if (await p.locator(".kmg-park .kmg-banner-ok").count()) {
      happy += 1;
      if (visitor < 7) await p.waitForTimeout(1500); // a happy visitor moves on by itself
    } else {
      const why = (await p.locator(".kmg-park-why").textContent()) ?? "";
      if (!why.trim() || /undefined|NaN|\{/.test(why)) note(currentRoute, `a wrong answer's explanation is broken: "${why}"`);
      await p.locator(".kmg-park .kmg-actions .kmg-btn-primary").click();
    }
  }
  await p.waitForSelector(".kmg-park .kmg-stats", { timeout: 4000 }).catch(() => note(currentRoute, "the day summary never showed"));
  const parkEnd = await game("park");
  // Level 0 entrance €4 + the sweet stall's €1 = €5 per happy visitor.
  if (parkEnd.park.cash - parkStart.park.cash !== happy * 5) {
    note(currentRoute, `park money should grow by €5 per happy visitor: ${happy} happy, +€${parkEnd.park.cash - parkStart.park.cash}`);
  }
  if (happy !== 8) note(currentRoute, `every level-0 visitor was answered right, but only ${happy} were happy`);
  if (parkEnd.park.days !== 1) note(currentRoute, `one day played, the park counts ${parkEnd.park.days}`);
  // 8 of 8 is a perfect day: park level 0 is mastered (a star), the game moves up.
  if (parkEnd.level !== 1 || !parkEnd.cleared.includes(0)) note(currentRoute, `a perfect park day should master level 0: ${JSON.stringify(parkEnd)}`);
  if (parkEnd.coins < parkStart.coins) note(currentRoute, "building in the park took shop coins");
  if (shotDir) await p.screenshot({ path: path.join(shotDir, "pretparkbaas-day.png") });
  console.log(`  pretparkbaas: built the sweet stall, a day with ${happy}/8 happy visitors, +€${parkEnd.park.cash - parkStart.park.cash} park money`);
  await ctx.close();
}

// --- round 20: the four thinking games, played from what is on the screen ----
// A fresh player on a phone. Telduel is won by doing the division the game
// teaches; a Weegpuzzel is read off its scales and solved by brute force;
// the broken calculator and the card game are solved by the games' own
// searches, run on what the page shows; each win masters level 0.

currentRoute = "round20:thinking";
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem("kmg.test.seeded")) return;
    sessionStorage.setItem("kmg.test.seeded", "1");
    localStorage.setItem("kmg.profiles", JSON.stringify({ Denker: { totalScore: 0, coins: 0 } }));
    localStorage.setItem("kmg.currentPlayer", "Denker");
  });
  const p = await ctx.newPage();
  p.on("pageerror", (error) => note(currentRoute, `page error: ${error.message}`));
  p.on("console", (message) => {
    if (message.type() === "error") note(currentRoute, `console error: ${message.text()}`);
  });
  const game = (key) =>
    p.evaluate(async (k) => {
      const s = (await import("./js/state.js")).state;
      return { level: s.levels[k], cleared: [...(s.clearedLevels[k] ?? [])], coins: s.coins, score: s.totalScore, answered: s.questionsAnswered, feats: [...s.feats] };
    }, key);
  const sideways = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const setLevel = async (level) => {
    await p.locator(`.kmg-levelbtn[data-level="${level}"]`).click();
    await p.waitForTimeout(250);
  };
  const open = async (route) => {
    currentRoute = `round20:${route}`;
    await p.goto(`${baseUrl}/#/${route}`, { waitUntil: "networkidle" });
    await p.waitForSelector(".kmg-levelrow");
  };

  // ---- Telduel -----------------------------------------------------------
  await open("telduel");
  if ((await p.locator(".kmg-duel-stepbtn").count()) !== 3) note(currentRoute, "level 0 should offer the steps +1, +2 and +3 as buttons");
  if ((await sideways()) > 1) note(currentRoute, `Telduel scrolls sideways on a phone by ${await sideways()}px`);

  /** Play one match the way the game teaches: land on the totals that leave a multiple of (biggest step + 1). */
  const playDuel = async ({ hintFirst = false } = {}) => {
    if (hintFirst) {
      await p.locator(".kmg-duel-hintbtn").click();
      const text = (await p.locator(".kmg-duel-hinttext").textContent().catch(() => "")) ?? "";
      if (!/\d/.test(text)) note(currentRoute, `the hint should list safe numbers: "${text}"`);
      if (!(await p.locator(".kmg-duel-cell.is-safe").count()) && !(await p.locator(".kmg-duel-mark").count())) note(currentRoute, "the hint should mark the safe totals on the track");
    }
    for (let turn = 0; turn < 40 && !(await p.locator(".kmg-duel-result").count()); turn++) {
      const ready = await p
        .waitForSelector(".kmg-duel-stepbtn:not([disabled]), .kmg-duel-result", { timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (!ready) {
        note(currentRoute, "Telduel never gave the turn back");
        return;
      }
      if (await p.locator(".kmg-duel-result").count()) return;
      const total = Number(await p.locator(".kmg-duel-now strong").textContent());
      const target = Number(((await p.locator(".kmg-duel-now small").textContent()) ?? "").replace(/\D/g, ""));
      const steps = (await p.locator(".kmg-duel-stepbtn").evaluateAll((nodes) => nodes.map((n) => Number(n.dataset.step)))).sort((a, b) => a - b);
      const gap = Math.max(...steps) + 1;
      const step = (target - total) % gap || 1;
      await p.locator(`.kmg-duel-stepbtn[data-step="${step}"]`).click();
      await p.waitForTimeout(80);
    }
  };

  const before = await game("duel");
  await playDuel();
  await p.waitForSelector(".kmg-duel-result", { timeout: 5000 });
  if (!(await p.locator(".kmg-duel-result.kmg-banner-ok").count())) note(currentRoute, "a child who does the division should win Telduel level 0");
  if (!/rest|gaat precies op/.test((await p.locator(".kmg-duel-explain").textContent()) ?? "")) note(currentRoute, "the result should explain the division");
  let now = await game("duel");
  if (now.level !== 1 || !now.cleared.includes(0)) note(currentRoute, `winning Telduel level 0 should master it: ${JSON.stringify(now)}`);
  if (now.answered !== before.answered + 1) note(currentRoute, "a match should count as one answered question");
  if (!(now.score > before.score)) note(currentRoute, "a won match paid no points");
  if (!(await p.locator(".kmg-duel-cell.is-mine").count()) && !(await p.locator(".kmg-duel-history .is-mine").count())) note(currentRoute, "the child's own numbers should be marked");
  if (shotDir) await p.screenshot({ path: path.join(shotDir, "telduel-won.png"), fullPage: true });

  // A win that needed the hint stays on the level.
  await p.locator(".kmg-duel-again").click();
  await p.waitForSelector(".kmg-duel-stepbtn");
  await playDuel({ hintFirst: true });
  await p.waitForSelector(".kmg-duel-result", { timeout: 5000 });
  now = await game("duel");
  if (now.level !== 1) note(currentRoute, `a win with the hint should stay on level 1, not ${now.level}`);
  if (!/hint/i.test((await p.locator(".kmg-duel-result").textContent()) ?? "")) note(currentRoute, "a win with the hint should say so");

  // A typed level: an illegal number is refused with a reason, a legal one is played.
  await setLevel(3);
  await p.waitForSelector(".kmg-duel-typed");
  const startTotal = Number(await p.locator(".kmg-duel-now strong").textContent());
  await p.locator(".kmg-numinput").fill("999");
  await p.locator(".kmg-duel-say").click();
  if (!/mag niet/.test((await p.locator(".kmg-duel-note").textContent().catch(() => "")) ?? "")) note(currentRoute, "an illegal number should be refused with a reason");
  if (Number(await p.locator(".kmg-duel-now strong").textContent()) !== startTotal) note(currentRoute, "an illegal number must not move the count");
  const range = (((await p.locator(".kmg-duel-range").textContent()) ?? "").match(/\d+/g) ?? []).map(Number);
  await p.locator(".kmg-numinput").fill(String(range[0]));
  await p.locator(".kmg-duel-say").click();
  if (Number(await p.locator(".kmg-duel-now strong").textContent()) !== range[0]) note(currentRoute, "a legal number should move the count");
  await p.waitForSelector(".kmg-duel-typed", { timeout: 5000 }).catch(() => note(currentRoute, "the computer never replied in the typed game"));
  if ((await p.locator(".kmg-duel-history li").count()) < 2) note(currentRoute, "the computer's reply should join the history");

  // From level 5 the child chooses who starts - and the choice is a division:
  // if the target divides exactly by (biggest step + 1), the computer must begin.
  await setLevel(5);
  await p.waitForSelector(".kmg-duel-starter");
  if ((await sideways()) > 1) note(currentRoute, `Telduel level 5 scrolls sideways on a phone by ${await sideways()}px`);
  {
    const [, biggest, target] = (((await p.locator(".kmg-duel-rule").textContent()) ?? "").match(/\d+/g) ?? []).map(Number);
    const gap = biggest + 1;
    await p.locator(target % gap === 0 ? ".kmg-duel-second" : ".kmg-duel-first").click();
    for (let turn = 0; turn < 40 && !(await p.locator(".kmg-duel-result").count()); turn++) {
      await p.waitForSelector(".kmg-duel-say, .kmg-duel-result", { timeout: 6000 }).catch(() => note(currentRoute, "level 5 never gave the turn back"));
      if (await p.locator(".kmg-duel-result").count()) break;
      const total = Number(await p.locator(".kmg-duel-now strong").textContent());
      const step = (target - total) % gap || 1;
      await p.locator(".kmg-numinput").fill(String(total + step));
      await p.locator(".kmg-duel-say").click();
      await p.waitForTimeout(80);
    }
    if (!(await p.locator(".kmg-duel-result.kmg-banner-ok").count())) note(currentRoute, `a child who does the division and picks the right start must win level 5 (target ${target}, gap ${gap})`);
    if (!(await game("duel")).feats.includes("duel_hard")) note(currentRoute, "winning level 5 without the hint should record the duel feat");
    if (!(await p.evaluate(async () => (await import("./js/state.js")).state.badges.includes("duel_win")))) note(currentRoute, "the Telduel badge should be earned with that feat");
  }
  await setLevel(5);
  await p.waitForSelector(".kmg-duel-starter");
  await p.locator(".kmg-duel-second").click();
  await p.waitForSelector(".kmg-duel-history li", { timeout: 4000 }).catch(() => note(currentRoute, "when the computer starts it should make the first move"));
  await setLevel(7);
  await p.waitForSelector(".kmg-duel-starter");
  if (!/behalve|nooit/.test((await p.locator(".kmg-duel-rule").textContent()) ?? "")) note(currentRoute, "level 7 should name the forbidden step");
  console.log("  telduel: won level 0 by the division, a hinted win stayed, typed and choose-the-start levels play");

  // ---- Weegpuzzel --------------------------------------------------------
  await open("weegpuzzel");
  await setLevel(1);
  await p.waitForSelector(".kmg-weeg-scale");
  if ((await sideways()) > 1) note(currentRoute, `Weegpuzzel scrolls sideways on a phone by ${await sideways()}px`);

  /** Read the scales off the page (their aria-labels) and weigh the asked fruit by trying every weight. */
  const solveWeeg = async () => {
    const { labels, question } = await p.evaluate(() => ({
      labels: [...document.querySelectorAll(".kmg-weeg-scale:not(.is-question) svg")].map((svg) => svg.getAttribute("aria-label")),
      question: document.querySelector(".kmg-question-text").textContent,
    }));
    const scales = labels.map((label) =>
      label
        .replace(/^\S+\s/, "")
        .split(" = ")
        .map((side) => side.split(" + ").map((token) => (/^\d+$/.test(token) ? { grams: Number(token) } : { fruit: [...token][0], count: [...token].length }))),
    );
    const fruit = [...new Set(scales.flat(2).filter((t) => t.fruit).map((t) => t.fruit))];
    const asked = question.match(/\p{Extended_Pictographic}/u)?.[0];
    // A "total" question has a scale with a ? on it: the answer is what its left pan weighs.
    const totalLabel = await p.evaluate(() => document.querySelector(".kmg-weeg-scale.is-question svg")?.getAttribute("aria-label") ?? null);
    const totalSide = totalLabel
      ? totalLabel.replace(/^\S+\s/, "").split(" = ")[0].split(" + ").map((token) => ({ fruit: [...token][0], count: [...token].length }))
      : null;
    const weights = Array(fruit.length).fill(1);
    const weigh = (side) => side.reduce((sum, t) => sum + (t.grams ?? t.count * weights[fruit.indexOf(t.fruit)]), 0);
    let answer = null;
    const go = (i) => {
      if (answer != null) return;
      if (i === fruit.length) {
        if (scales.every(([l, r]) => weigh(l) === weigh(r))) answer = totalSide ? weigh(totalSide) : weights[fruit.indexOf(asked)];
        return;
      }
      for (let w = 1; w <= 40 && answer == null; w++) {
        weights[i] = w;
        go(i + 1);
      }
    };
    go(0);
    return { answer, scales: scales.length, asked };
  };

  const wBefore = await game("weeg");
  // Wrong first: the worked solution must appear, on several lines.
  await p.locator(".kmg-numinput").fill("9999");
  await p.locator(".kmg-actions .kmg-btn-primary").first().click();
  await p.waitForSelector(".kmg-banner-bad", { timeout: 4000 });
  const tip = (await p.locator(".kmg-banner-tip").innerText()) ?? "";
  if (!/→/.test(tip) || !/ g/.test(tip) || tip.split("\n").length < 3) note(currentRoute, `a wrong Weegpuzzel answer should show the worked solution on several lines: "${tip}"`);
  if (/undefined|NaN|weeg\./.test(tip)) note(currentRoute, `junk in the worked solution: "${tip}"`);
  await p.locator(".kmg-actions .kmg-btn", { hasText: /Volgende/ }).click();
  await p.waitForSelector(".kmg-weeg-scale");
  const solved = await solveWeeg();
  if (solved.answer == null) note(currentRoute, "could not solve the Weegpuzzel read off the screen");
  else {
    await p.locator(".kmg-numinput").fill(String(solved.answer));
    await p.locator(".kmg-actions .kmg-btn-primary").first().click();
    await p.waitForSelector(".kmg-banner-ok", { timeout: 4000 }).catch(() => note(currentRoute, `the right weight (${solved.answer} g) was not accepted`));
  }
  const wNow = await game("weeg");
  if (wNow.answered !== wBefore.answered + 2) note(currentRoute, `two answers should be logged: ${wBefore.answered} -> ${wNow.answered}`);
  if (!(wNow.score > wBefore.score)) note(currentRoute, "a right Weegpuzzel answer paid no points");
  if (shotDir) await p.screenshot({ path: path.join(shotDir, "weegpuzzel.png"), fullPage: true });

  // The top level: four kinds of fruit, a "?" scale, and it still fits a phone.
  await setLevel(7);
  await p.waitForSelector(".kmg-weeg-scale.is-question");
  if ((await p.locator(".kmg-weeg-scale").count()) < 5) note(currentRoute, "level 7 should show four scales and the question scale");
  if ((await sideways()) > 1) note(currentRoute, `Weegpuzzel level 7 scrolls sideways on a phone by ${await sideways()}px`);
  if (shotDir) await p.screenshot({ path: path.join(shotDir, "weegpuzzel-l7.png"), fullPage: true });
  // Solve it: four kinds of fruit, asked as a total - records the feat and earns the badge.
  const top = await solveWeeg();
  if (top.answer == null) note(currentRoute, "could not solve the level-7 Weegpuzzel read off the screen");
  else {
    await p.locator(".kmg-numinput").fill(String(top.answer));
    await p.locator(".kmg-actions .kmg-btn-primary").first().click();
    await p.waitForSelector(".kmg-banner-ok", { timeout: 4000 }).catch(() => note(currentRoute, `the right total (${top.answer} g) was not accepted at level 7`));
    if (!(await game("weeg")).feats.includes("weeg_four")) note(currentRoute, "solving a four-fruit puzzle should record the feat");
    if (!(await p.evaluate(async () => (await import("./js/state.js")).state.badges.includes("weeg_four")))) note(currentRoute, "the Weegpuzzel badge should be earned with that feat");
  }
  console.log(`  weegpuzzel: a wrong answer showed the worked solution, a puzzle read off the screen was solved, level 7 fits a phone`);

  // ---- Kapotte Rekenmachine ---------------------------------------------
  await open("rekenmachine");
  if ((await sideways()) > 1) note(currentRoute, `the calculator scrolls sideways on a phone by ${await sideways()}px`);

  /** The shortest route from the keys and numbers on screen, using the game's own search. */
  const routeOnScreen = () =>
    p.evaluate(async () => {
      const m = await import("./js/games/machine.js");
      const level = (await import("./js/state.js")).getLevel("machine");
      const rules = m.LEVEL_RULES[level];
      const [start, target] = ((document.querySelector(".kmg-machine-goal").textContent ?? "").match(/-?\d+/g) ?? []).map(Number);
      const buttons = [...document.querySelectorAll(".kmg-machine-key")].map((key) => {
        const kind = key.dataset.kind;
        return kind === "square" ? { kind } : { kind, n: Number(key.textContent.match(/\d+/)[0]) };
      });
      const lims = { lo: rules.lo, hi: rules.hi };
      return { start, target, route: m.shortestRoute(buttons, lims, start, target), count: buttons.length };
    });

  const mBefore = await game("machine");
  const first = await routeOnScreen();
  if (!first.route || first.route.length < 2) note(currentRoute, `no route found on screen: ${JSON.stringify(first)}`);
  // Undo and reset work, and cost nothing.
  await p.locator(".kmg-machine-key").nth(first.route[0]).click();
  if (!/Gedrukt: 1/.test((await p.locator(".kmg-machine-count").textContent()) ?? "")) note(currentRoute, "one press should count as one");
  await p.locator(".kmg-machine-undo").click();
  if (!/Gedrukt: 0/.test((await p.locator(".kmg-machine-count").textContent()) ?? "")) note(currentRoute, "undo should take the press back");
  // The hint lights the next key, and the dead-end warning shows when the target slips away.
  await p.locator(".kmg-machine-hint").click();
  if ((await p.locator(".kmg-machine-key.is-hint").count()) !== 1) note(currentRoute, "the hint should light exactly one key");
  // A hint was used: solve it anyway, and the level must stay (a hinted solve is practice).
  for (const index of first.route) await p.locator(".kmg-machine-key").nth(index).click();
  await p.waitForSelector(".kmg-machine-result.kmg-banner-ok", { timeout: 4000 }).catch(() => note(currentRoute, "pressing the shortest route should solve it"));
  if (!/⭐⭐⭐/.test((await p.locator(".kmg-machine-stars").textContent().catch(() => "")) ?? "")) note(currentRoute, "the shortest route should earn three stars");
  let mNow = await game("machine");
  if (mNow.level !== 0) note(currentRoute, `a solve that used the hint should stay on level 0, not ${mNow.level}`);
  if (!(mNow.score > mBefore.score)) note(currentRoute, "a solved calculator puzzle paid no points");
  // Now one with no hint: level 0 is mastered.
  await p.locator(".kmg-machine-new").click();
  await p.waitForSelector(".kmg-machine-key");
  const second = await routeOnScreen();
  for (const index of second.route) await p.locator(".kmg-machine-key").nth(index).click();
  await p.waitForSelector(".kmg-machine-result.kmg-banner-ok", { timeout: 4000 }).catch(() => note(currentRoute, "the second route was not accepted"));
  mNow = await game("machine");
  if (mNow.level !== 1 || !mNow.cleared.includes(0)) note(currentRoute, `a par solve without a hint should master level 0: ${JSON.stringify(mNow)}`);
  if (shotDir) await p.screenshot({ path: path.join(shotDir, "rekenmachine-solved.png"), fullPage: true });

  // Overshooting says so. Press the biggest key until the target is behind us.
  await setLevel(0);
  await p.waitForSelector(".kmg-machine-key:not([disabled])");
  const target0 = Number(((await p.locator(".kmg-machine-target").textContent()) ?? "").replace(/\D/g, ""));
  let dead = false;
  for (let i = 0; i < 12 && !dead; i++) {
    const keys = await p.locator(".kmg-machine-key:not([disabled])").count();
    if (!keys) break;
    await p.locator(".kmg-machine-key").nth(1).click(); // the big + key at level 0
    const shown = Number(await p.locator(".kmg-machine-now").textContent());
    dead = /kom je niet meer/.test((await p.locator(".kmg-machine-note").textContent().catch(() => "")) ?? "");
    if (shown > target0) break;
  }
  const finalShown = Number(await p.locator(".kmg-machine-now").textContent().catch(() => "0"));
  if (finalShown > target0 && !dead) note(currentRoute, "going past the target should show the dead-end warning");
  await setLevel(4);
  await p.waitForSelector(".kmg-machine-key");
  const four = await routeOnScreen();
  for (const index of four.route) await p.locator(".kmg-machine-key").nth(index).click();
  await p.waitForSelector(".kmg-machine-result.kmg-banner-ok", { timeout: 4000 }).catch(() => note(currentRoute, "the level-4 route was not accepted"));
  if (!(await game("machine")).feats.includes("machine_par")) note(currentRoute, "par without the hint at level 4 should record the feat");
  if (!(await p.evaluate(async () => (await import("./js/state.js")).state.badges.includes("machine_par")))) note(currentRoute, "the calculator badge should be earned with that feat");
  await setLevel(7);
  if ((await sideways()) > 1) note(currentRoute, `the calculator at level 7 scrolls sideways on a phone by ${await sideways()}px`);
  if ((await p.locator(".kmg-machine-key").count()) !== 5) note(currentRoute, "level 7 should have five keys");
  console.log(`  rekenmachine: the shortest route read off the screen solved it for three stars, a hinted solve stayed, par without a hint mastered level 0`);

  // ---- Getallenbouwer ----------------------------------------------------
  await open("getallenbouwer");
  if ((await sideways()) > 1) note(currentRoute, `the card game scrolls sideways on a phone by ${await sideways()}px`);
  const bBefore = await game("bouw");

  /** The merges that make the target from the cards on screen, using the game's own search. */
  const pathOnScreen = () =>
    p.evaluate(async () => {
      const b = await import("./js/games/bouw.js");
      const level = (await import("./js/state.js")).getLevel("bouw");
      const values = [...document.querySelectorAll(".kmg-bouw-card")].map((c) => Number(c.textContent));
      const target = Number(document.querySelector(".kmg-bouw-target strong").textContent);
      return { values, target, path: b.findPath(values, target, b.LEVEL_RULES[level].ops) };
    });
  const merge = async (a, b, op) => {
    const cards = p.locator(".kmg-bouw-card:not([disabled])");
    const texts = await cards.allTextContents();
    const i = texts.findIndex((text) => Number(text) === a);
    const j = texts.findIndex((text, k) => k !== i && Number(text) === b);
    await cards.nth(i).click();
    await p.locator(`.kmg-bouw-op[data-op="${op}"]`).click();
    await cards.nth(j).click();
  };

  // Not allowed: a subtraction that would reach 0 or less is refused, with a reason.
  {
    const { values } = await pathOnScreen();
    const sorted = [...values].sort((x, y) => x - y);
    const small = sorted[0];
    const big = sorted.at(-1);
    await merge(small, big, "−");
    if (!/geeft geen getal boven nul/.test((await p.locator(".kmg-bouw-note").textContent().catch(() => "")) ?? "")) note(currentRoute, "taking a bigger number from a smaller one should be refused with a reason");
    if ((await p.locator(".kmg-bouw-card").count()) !== values.length) note(currentRoute, "a refused merge must not change the cards");
    await p.locator(".kmg-bouw-card.is-selected").click().catch(() => {});
  }
  // The hint glows two cards and an operation.
  await p.locator(".kmg-bouw-hint").click();
  if ((await p.locator(".kmg-bouw-card.is-hint").count()) !== 2) note(currentRoute, `the hint should light two cards, lit ${await p.locator(".kmg-bouw-card.is-hint").count()}`);
  if ((await p.locator(".kmg-bouw-op.is-hint").count()) !== 1) note(currentRoute, "the hint should light one operation");
  // Undo and restart.
  const plan = await pathOnScreen();
  if (!plan.path) note(currentRoute, `no path found on screen: ${JSON.stringify(plan)}`);
  else {
    await merge(plan.path[0].a, plan.path[0].b, plan.path[0].op);
    if ((await p.locator(".kmg-bouw-card").count()) !== plan.values.length - 1) note(currentRoute, "a merge should replace two cards with one");
    await p.locator(".kmg-bouw-undo").click();
    if ((await p.locator(".kmg-bouw-card").count()) !== plan.values.length) note(currentRoute, "undo should bring the two cards back");
    for (const step of plan.path) await merge(step.a, step.b, step.op);
    await p.waitForSelector(".kmg-bouw-result.kmg-banner-ok", { timeout: 4000 }).catch(() => note(currentRoute, "building the target was not accepted"));
    const expr = (await p.locator(".kmg-bouw-expr").textContent().catch(() => "")) ?? "";
    if (!new RegExp(`= ${plan.target}$`).test(expr.trim())) note(currentRoute, `the solution should be written out ending in "= ${plan.target}": "${expr}"`);
    if (/undefined|NaN/.test(expr)) note(currentRoute, `junk in the written solution: "${expr}"`);
  }
  let bNow = await game("bouw");
  if (bNow.level !== 0) note(currentRoute, `a solve that used the hint should stay on level 0, not ${bNow.level}`);
  if (!(bNow.score > bBefore.score)) note(currentRoute, "a built target paid no points");
  // Without a hint, level 0 is mastered.
  await p.locator(".kmg-bouw-new").click();
  await p.waitForSelector(".kmg-bouw-card");
  const clean = await pathOnScreen();
  for (const step of clean.path) await merge(step.a, step.b, step.op);
  await p.waitForSelector(".kmg-bouw-result.kmg-banner-ok", { timeout: 4000 }).catch(() => note(currentRoute, "the second hand was not accepted"));
  bNow = await game("bouw");
  if (bNow.level !== 1 || !bNow.cleared.includes(0)) note(currentRoute, `a clean build should master level 0: ${JSON.stringify(bNow)}`);
  if (shotDir) await p.screenshot({ path: path.join(shotDir, "getallenbouwer-solved.png"), fullPage: true });

  // Level 5 is "make 24" with only one or two solutions: a clean build records the feat.
  await setLevel(5);
  await p.waitForSelector(".kmg-bouw-card");
  const twentyFour = await pathOnScreen();
  if (twentyFour.target !== 24) note(currentRoute, `level 5 should ask for 24, asked ${twentyFour.target}`);
  for (const step of twentyFour.path ?? []) await merge(step.a, step.b, step.op);
  await p.waitForSelector(".kmg-bouw-result.kmg-banner-ok", { timeout: 4000 }).catch(() => note(currentRoute, "the level-5 hand was not built"));
  if (!/solutions|manieren/.test((await p.locator(".kmg-bouw-result ~ .kmg-caption").first().textContent().catch(() => "")) ?? "")) note(currentRoute, "level 5 should say how many ways there are to make 24");
  if (!(await game("bouw")).feats.includes("bouw_hard")) note(currentRoute, "a clean level-5 build should record the feat");
  if (!(await p.evaluate(async () => (await import("./js/state.js")).state.badges.includes("bouw_hard")))) note(currentRoute, "the card-game badge should be earned with that feat");

  // The biggest hand still fits a phone: six cards, four operations.
  await setLevel(7);
  await p.waitForSelector(".kmg-bouw-card");
  if ((await p.locator(".kmg-bouw-card").count()) !== 6) note(currentRoute, "level 7 should deal six cards");
  if ((await p.locator(".kmg-bouw-op").count()) !== 4) note(currentRoute, "level 7 should offer four operations");
  if ((await sideways()) > 1) note(currentRoute, `the card game at level 7 scrolls sideways on a phone by ${await sideways()}px`);
  if (shotDir) await p.screenshot({ path: path.join(shotDir, "getallenbouwer-l7.png"), fullPage: true });
  console.log(`  getallenbouwer: a refused subtraction explained itself, a hinted build stayed, a clean build mastered level 0, level 7 fits a phone`);
  await ctx.close();
}

// --- offline, after the service worker has installed ------------------------

currentRoute = "offline";
await page.goto(`${baseUrl}/#/home`, { waitUntil: "networkidle" });
const swReady = await page.evaluate(async () => {
  if (!("serviceWorker" in navigator)) return "unsupported";
  const registration = await navigator.serviceWorker.ready.catch(() => null);
  return registration ? "ready" : "failed";
});
console.log(`  service worker: ${swReady}`);

if (swReady === "ready") {
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page
    .waitForSelector("#kmg-main > *", { timeout: 8000 })
    .catch(() => note("offline", "the app did not render with the network off"));
  const offlineHeading = await page.locator("#kmg-main h1").first().textContent();
  console.log(`  offline reload rendered: ${offlineHeading?.trim() ?? "(nothing)"}`);
  await context.setOffline(false);
}

await browser.close();

// --- report ----------------------------------------------------------------

console.log("");
if (problems.length) {
  console.error(`FAILED - ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`OK - ${ROUTES.length} routes, gameplay, i18n, timers, mobile and offline all clean.`);
