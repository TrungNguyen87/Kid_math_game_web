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
  await page.locator(".kmg-btn-primary").first().click();
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
  await page.locator(".kmg-btn-primary").first().click();
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
if (!(await page.locator(".kmg-reward-card.is-equipped").count())) {
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

// Switching back to the default character must move the "equipped" tag.
const switchButton = page.locator(".kmg-reward-card.is-unlocked .kmg-reward-btn").first();
if (await switchButton.count()) {
  await switchButton.click();
  await page.waitForTimeout(200);
  const stillOneEquipped = await page.locator(".kmg-reward-card.is-equipped").count();
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

const replayText = await page.locator(".kmg-question-text").textContent();
const [ra, rb] = [...replayText.matchAll(/\d+/g)].map((m) => Number(m[0]));
if (!Number.isFinite(ra) || !Number.isFinite(rb)) {
  note("rewards:level-replay", `could not parse question "${replayText}"`);
} else {
  await page.locator(".kmg-numinput").fill(String(ra * rb));
  await page.locator(".kmg-btn-primary").first().click();
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
  console.log(`  level replay: coins stayed at ${coinsBeforeReplay} after a correct answer back at level 0`);
}

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
await page.locator(".kmg-btn-primary").first().click();
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
