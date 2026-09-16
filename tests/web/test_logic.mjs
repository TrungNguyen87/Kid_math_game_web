/**
 * Logic tests for the web app.
 *
 * These deliberately test the parts that have no DOM: the question
 * generators, the scoring rules, the adaptive-level machinery and the
 * translation table. Those are where a porting mistake actually hurts - a
 * generator that can produce a negative angle, or a level-5 question a groep 7
 * child cannot answer, is invisible until a child hits it.
 *
 * Every generator is run many times, because the bugs worth catching here are
 * the ones that only appear on an unlucky draw.
 *
 * Run with: node --test tests/web/
 */
import test from "node:test";
import assert from "node:assert/strict";

const REPS = 400;

// The modules read localStorage inside try/catch, so they import cleanly in
// Node with no DOM. Anything that touches the DOM is tested in the browser
// smoke test instead (tests/web/smoke.mjs).
const { TRANSLATIONS, t, setLanguage, getLanguage } = await import("../../web/js/i18n.js");
const { markdown, escapeHtml } = await import("../../web/js/markdown.js");
const { gcd, randInt, sample, shuffled, unique } = await import("../../web/js/rng.js");
const state = await import("../../web/js/state.js");
const { checkNewBadges, BADGE_IDS } = await import("../../web/js/badges.js");
const rewards = await import("../../web/js/rewards.js");
const log = await import("../../web/js/log.js");
const race = await import("../../web/js/race-logic.js");
const visuals = await import("../../web/js/visuals.js");
const qrcode = await import("../../web/js/qrcode.js");
const { RaceRoomManager } = await import("../../web/js/race-room-engine.js");
const webrtcSignal = await import("../../web/js/webrtc-signal.js");

const tafel = await import("../../web/js/games/tafel.js");
const breuken = await import("../../web/js/games/breuken.js");
const meten = await import("../../web/js/games/meten.js");
const procenten = await import("../../web/js/games/procenten.js");
const algebra = await import("../../web/js/games/algebra.js");
const meetkunde = await import("../../web/js/games/meetkunde.js");
const verhoudingen = await import("../../web/js/games/verhoudingen.js");
const getallen = await import("../../web/js/games/getallen.js");
const bliksem = await import("../../web/js/games/bliksem.js");
const logica = await import("../../web/js/games/logica.js");
const code = await import("../../web/js/games/code.js");
const jacht = await import("../../web/js/games/jacht.js");

const LEVELS = [0, 1, 2, 3, 4, 5];
const eachLevel = (fn) => LEVELS.forEach((level) => fn(level));

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

test("every Dutch key has an English translation and vice versa", () => {
  const nl = Object.keys(TRANSLATIONS.nl).sort();
  const en = Object.keys(TRANSLATIONS.en).sort();
  assert.deepEqual(nl, en, "NL and EN key sets must match exactly");
  assert.ok(nl.length > 450, `expected 450+ keys, got ${nl.length}`);
});

test("no translation is an empty string", () => {
  for (const [lang, table] of Object.entries(TRANSLATIONS)) {
    for (const [key, value] of Object.entries(table)) {
      assert.ok(String(value).trim().length > 0, `${lang}.${key} is empty`);
    }
  }
});

test("a key's placeholders are the same in both languages", () => {
  const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of Object.keys(TRANSLATIONS.nl)) {
    assert.deepEqual(
      placeholders(TRANSLATIONS.nl[key]),
      placeholders(TRANSLATIONS.en[key]),
      `placeholders differ for ${key}`,
    );
  }
});

test("t() substitutes placeholders and falls back to the key", () => {
  assert.match(t("common.level_up", { level: 3 }), /3/);
  assert.equal(t("this.key.does.not.exist"), "this.key.does.not.exist");
});

test("every game key the app navigates to has a name and a why-tip", () => {
  for (const key of state.GAME_KEYS) {
    assert.ok(TRANSLATIONS.nl[`game.${key}.name`], `missing game.${key}.name`);
    assert.ok(TRANSLATIONS.nl[`${key}.title`], `missing ${key}.title`);
  }
});

// ---------------------------------------------------------------------------
// Markdown / escaping
// ---------------------------------------------------------------------------

test("markdown renders the subset the copy actually uses", () => {
  assert.match(markdown("**bold**"), /<strong>bold<\/strong>/);
  assert.match(markdown("*italic*"), /<em>italic<\/em>/);
  assert.match(markdown("- one\n- two"), /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.match(markdown("# Heading"), /<h1>Heading<\/h1>/);
  assert.match(markdown("`code`"), /<code>code<\/code>/);
});

test("markdown escapes HTML by default", () => {
  const rendered = markdown('<img src=x onerror="alert(1)">');
  assert.ok(!rendered.includes("<img"), "raw HTML must not survive");
  assert.match(rendered, /&lt;img/);
});

test("escapeHtml neutralises quotes and angle brackets", () => {
  assert.equal(escapeHtml(`<a href="x">'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&lt;/a&gt;");
});

// ---------------------------------------------------------------------------
// rng helpers - the Python semantics the generators were transcribed against
// ---------------------------------------------------------------------------

test("randInt is inclusive on both ends", () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(randInt(1, 3));
  assert.deepEqual([...seen].sort(), [1, 2, 3]);
});

test("randInt(n, n) returns n", () => {
  assert.equal(randInt(7, 7), 7);
});

test("sample returns k distinct items and never more than the pool", () => {
  const pool = [1, 2, 3, 4, 5];
  const picked = sample(pool, 3);
  assert.equal(picked.length, 3);
  assert.equal(new Set(picked).size, 3);
  assert.equal(sample(pool, 99).length, 5);
});

test("shuffled keeps every element", () => {
  const input = [1, 2, 3, 4, 5, 6];
  assert.deepEqual(shuffled(input).sort((a, b) => a - b), input);
});

test("gcd matches math.gcd, including with zero and negatives", () => {
  assert.equal(gcd(12, 18), 6);
  assert.equal(gcd(7, 13), 1);
  assert.equal(gcd(0, 5), 5);
  assert.equal(gcd(-12, 18), 6);
});

test("unique keeps first-seen order", () => {
  assert.deepEqual(unique(["b", "a", "b", "c", "a"]), ["b", "a", "c"]);
});

// ---------------------------------------------------------------------------
// Adaptive difficulty
// ---------------------------------------------------------------------------

test("three correct answers in a row level a game up", () => {
  state.setLevel("tafel", 1);
  let result;
  for (let i = 0; i < 3; i++) result = state.registerAttempt("tafel", true);
  assert.equal(result.leveledUp, true);
  assert.equal(state.getLevel("tafel"), 2);
});

test("two wrong answers in a row level a game down", () => {
  state.setLevel("tafel", 3);
  let result;
  for (let i = 0; i < 2; i++) result = state.registerAttempt("tafel", false);
  assert.equal(result.leveledDown, true);
  assert.equal(state.getLevel("tafel"), 2);
});

test("a correct answer resets the wrong-streak, so 1 wrong + 1 right + 1 wrong does not drop a level", () => {
  state.setLevel("tafel", 3);
  state.registerAttempt("tafel", false);
  state.registerAttempt("tafel", true);
  const result = state.registerAttempt("tafel", false);
  assert.equal(result.leveledDown, false);
  assert.equal(state.getLevel("tafel"), 3);
});

test("levels never leave 0..5 for standard games", () => {
  state.setLevel("breuken", 5);
  for (let i = 0; i < 20; i++) state.registerAttempt("breuken", true);
  assert.equal(state.getLevel("breuken"), state.MAX_LEVEL);

  state.setLevel("breuken", 0);
  for (let i = 0; i < 20; i++) state.registerAttempt("breuken", false);
  assert.equal(state.getLevel("breuken"), state.MIN_LEVEL);
});

test("tafel monster level can reach level 6 and clamps at 6", () => {
  state.setLevel("tafel", 5);
  for (let i = 0; i < 3; i++) state.registerAttempt("tafel", true);
  assert.equal(state.getLevel("tafel"), 6);
  assert.equal(state.setLevel("tafel", 99), 6);
});

test("setLevel clamps out-of-range input", () => {
  assert.equal(state.setLevel("breuken", 99), state.MAX_LEVEL);
  assert.equal(state.setLevel("breuken", -4), state.MIN_LEVEL);
});

test("changing level resets that game's streak counters", () => {
  state.setLevel("breuken", 2);
  state.registerAttempt("breuken", true);
  state.registerAttempt("breuken", true);
  state.setLevel("breuken", 4); // manual override mid-streak
  // Two more correct answers must not be enough on their own to level up.
  state.registerAttempt("breuken", true);
  const result = state.registerAttempt("breuken", true);
  assert.equal(result.leveledUp, false);
});

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

test("badges are awarded once, in definition order", () => {
  state.state.badges = [];
  state.state.questionsAnswered = 100;
  state.state.streaks = 10;
  const first = checkNewBadges().map(([id]) => id);
  assert.ok(first.includes("q10") && first.includes("q100") && first.includes("streak10"));
  assert.deepEqual(checkNewBadges(), [], "a second call awards nothing new");
  // Stored in definition order, not the order they happened to be earned.
  const order = state.state.badges.map((id) => BADGE_IDS.indexOf(id));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

// ---------------------------------------------------------------------------
// Daily coin cap
// ---------------------------------------------------------------------------

test("addScore caps spendable coins per day but never totalScore or streaks", () => {
  state.state.coins = 0;
  state.state.coinsEarnedToday = 0;
  state.state.coinsEarnedDay = new Date().toISOString().slice(0, 10);
  state.state.totalScore = 0;
  state.state.streaks = 0;

  const cap = state.DAILY_COIN_CAP;
  state.addScore(cap - 10);
  assert.equal(state.state.coins, cap - 10);

  state.addScore(50); // would push coins past the cap
  assert.equal(state.state.coins, cap, "coins must not exceed the daily cap");
  assert.equal(state.state.totalScore, cap - 10 + 50, "totalScore is a lifetime number and is never capped");
  assert.equal(state.state.streaks, 2, "the streak counter is never capped either");
  assert.equal(state.remainingDailyCoins(), 0);

  state.addScore(25); // the day is spent: no more coins, but score still climbs
  assert.equal(state.state.coins, cap);
  assert.equal(state.state.totalScore, cap - 10 + 50 + 25);
});

test("remainingDailyCoins resets once the stored day is not today", () => {
  state.state.coinsEarnedToday = 250;
  state.state.coinsEarnedDay = "2000-01-01";
  assert.equal(state.remainingDailyCoins(), state.DAILY_COIN_CAP);
});

// ---------------------------------------------------------------------------
// Reward shop: level and collection gates, not just coins
// ---------------------------------------------------------------------------

test("highestLevelReached is the highest level across every game", () => {
  for (const k of state.GAME_KEYS) state.setLevel(k, 0);
  state.setLevel("breuken", 3);
  state.setLevel("tafel", 5);
  assert.equal(state.highestLevelReached(), 5);
  for (const k of state.GAME_KEYS) state.setLevel(k, 0);
});

test("allGamesAtTrueMax accounts for tafel's own max of 6, not the shared 5", () => {
  for (const k of state.GAME_KEYS) state.setLevel(k, state.getMaxLevel(k));
  assert.equal(state.getLevel("tafel"), 6);
  assert.equal(state.allGamesAtTrueMax(), true);
  state.setLevel("tafel", 5);
  assert.equal(state.allGamesAtTrueMax(), false, "tafel at 5 of 6 is not actually maxed");
  for (const k of state.GAME_KEYS) state.setLevel(k, 0);
});

test("unlockReward refuses a level-gated item until that level is reached, even with coins to spare", () => {
  for (const k of state.GAME_KEYS) state.setLevel(k, 0);
  state.state.unlockedRewards = new Set();
  state.state.equippedAvatar = null;
  state.state.coins = 100000;
  state.state.coinsEarnedToday = 0;

  assert.equal(rewards.lockReason("avatar_unicorn"), "level");
  assert.equal(rewards.unlockReward("avatar_unicorn"), false, "level 2 has not been reached anywhere yet");
  assert.equal(rewards.isUnlocked("avatar_unicorn"), false);

  state.setLevel("tafel", 2);
  assert.equal(rewards.lockReason("avatar_unicorn"), "coins", "the level is met, only the (already-had) cost is left");
  assert.equal(rewards.unlockReward("avatar_unicorn"), true);
  assert.equal(rewards.isUnlocked("avatar_unicorn"), true);
  for (const k of state.GAME_KEYS) state.setLevel(k, 0);
});

test("the ultra reward needs every game maxed and every other reward already unlocked", () => {
  for (const k of state.GAME_KEYS) state.setLevel(k, state.getMaxLevel(k));
  state.state.coins = 1000000;
  state.state.coinsEarnedToday = 0;

  // Nothing else unlocked yet: coins and maxed games are not enough on their own.
  state.state.unlockedRewards = new Set();
  assert.equal(rewards.lockReason("avatar_3d_champion"), "mastery");
  assert.equal(rewards.unlockReward("avatar_3d_champion"), false);

  // Unlock everything else first, exactly as a child actually would.
  state.state.unlockedRewards = new Set(
    rewards.REWARD_DEFS.map((d) => d.id).filter((id) => id !== "avatar_3d_champion"),
  );
  assert.equal(rewards.lockReason("avatar_3d_champion"), "coins");
  assert.equal(rewards.unlockReward("avatar_3d_champion"), true);
  assert.equal(rewards.isUnlocked("avatar_3d_champion"), true);

  for (const k of state.GAME_KEYS) state.setLevel(k, 0);
  state.state.unlockedRewards = new Set();
});

test("the always-free default avatar is never locked", () => {
  assert.equal(rewards.isUnlocked("avatar_default"), true);
  assert.equal(rewards.lockReason("avatar_default"), null);
});

// ---------------------------------------------------------------------------
// Attempt log retention (parent dashboard history)
// ---------------------------------------------------------------------------

test("trimToBudget never drops a row from inside the retention window, even over budget", () => {
  const now = Date.now();
  const isoDaysAgo = (n) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 19);

  const rows = [];
  for (let i = 0; i < 30; i++) rows.push({ timestamp: isoDaysAgo(20), id: `old-${i}` }); // outside the window
  for (let i = 0; i < 10; i++) rows.push({ timestamp: isoDaysAgo(1), id: `recent-${i}` }); // inside the window

  const trimmed = log.trimToBudget(rows, 5); // budget smaller than the recent rows alone
  const recentKept = trimmed.filter((r) => r.id.startsWith("recent-"));
  const oldKept = trimmed.filter((r) => r.id.startsWith("old-"));

  assert.equal(recentKept.length, 10, "every row inside MIN_RETENTION_DAYS must survive");
  assert.equal(oldKept.length, 0, "no budget is left for anything outside the window");
  assert.ok(trimmed.length > 5, "the retention guarantee can push the result over budget");

  // With room to spare, old rows fill the rest of the budget, newest first.
  const roomy = log.trimToBudget(rows, 15);
  assert.equal(roomy.filter((r) => r.id.startsWith("recent-")).length, 10);
  assert.equal(roomy.filter((r) => r.id.startsWith("old-")).length, 5);
  assert.equal(roomy.length, 15);
});

test("trimToBudget is a no-op when the list already fits", () => {
  const rows = [{ timestamp: new Date().toISOString() }];
  assert.equal(log.trimToBudget(rows, 100), rows);
});

// ---------------------------------------------------------------------------
// Generators: the shared contract
// ---------------------------------------------------------------------------

const GENERATORS = {
  tafel: tafel.generate,
  breuken: breuken.generate,
  meten: meten.generate,
  procenten: procenten.generate,
  algebra: algebra.generate,
  meetkunde: meetkunde.generate,
  verhoudingen: verhoudingen.generate,
  getallen: getallen.generate,
  logica: logica.generate,
};

for (const [name, generate] of Object.entries(GENERATORS)) {
  test(`${name}: every level produces a finite question and answer`, () => {
    eachLevel((level) => {
      for (let i = 0; i < REPS; i++) {
        const problem = generate(level);
        assert.ok(problem, `${name} level ${level} returned nothing`);
        assert.equal(typeof problem.text, "string");
        assert.ok(problem.text.length > 0, `${name} level ${level}: empty question`);
        assert.ok(
          !problem.text.includes("undefined") && !problem.text.includes("NaN"),
          `${name} level ${level}: "${problem.text}"`,
        );

        const answer = problem.answer ?? problem.correctNum;
        if (typeof answer === "number") {
          assert.ok(Number.isFinite(answer), `${name} level ${level}: answer ${answer}`);
        } else if (answer && typeof answer === "object") {
          for (const value of Object.values(answer)) {
            assert.ok(Number.isFinite(value), `${name} level ${level}: answer part ${value}`);
          }
        } else {
          assert.ok(answer != null, `${name} level ${level}: missing answer`);
        }
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Generators: the rules each game has to keep
// ---------------------------------------------------------------------------

test("tafel: the answer is always a whole positive number", () => {
  eachLevel((level) => {
    for (let i = 0; i < REPS; i++) {
      const problem = tafel.generate(level);
      assert.ok(Number.isInteger(problem.answer) && problem.answer > 0);
    }
  });
});

test("tafel: division questions divide exactly", () => {
  eachLevel((level) => {
    for (let i = 0; i < REPS; i++) {
      const problem = tafel.generate(level);
      if (problem.qType === "division" || problem.qType === "missing_factor") {
        assert.equal(problem.product % problem.answer, 0);
        assert.equal(problem.product / problem.knownFactor, problem.answer);
      }
    }
  });
});

test("tafel: only levels 2+ ask missing-factor, 3+ division, 4+ word problems, 6+ three_factor", () => {
  const allowed = {
    0: ["mult"],
    1: ["mult"],
    2: ["mult", "missing_factor"],
    3: ["mult", "missing_factor", "division"],
    4: ["mult", "missing_factor", "division", "word"],
    5: ["mult", "missing_factor", "division", "word"],
    6: ["mult", "missing_factor", "division", "word", "three_factor"],
  };
  [0, 1, 2, 3, 4, 5, 6].forEach((level) => {
    for (let i = 0; i < REPS; i++) {
      assert.ok(allowed[level].includes(tafel.generate(level).qType));
    }
  });
});

test("tafel: level 6 monster-level produces valid questions and whole positive answers", () => {
  for (let i = 0; i < REPS; i++) {
    const problem = tafel.generate(6);
    assert.ok(problem && problem.text.length > 0);
    assert.ok(Number.isInteger(problem.answer) && problem.answer > 0);
    assert.ok(!problem.text.includes("undefined") && !problem.text.includes("NaN"));
  }
});

test("breuken: the answer fraction has a positive denominator", () => {
  eachLevel((level) => {
    for (let i = 0; i < REPS; i++) {
      const problem = breuken.generate(level);
      assert.ok(problem.correctDen > 0, `denominator ${problem.correctDen}`);
      assert.ok(Number.isInteger(problem.correctNum));
      assert.ok(problem.correctNum >= 0, `numerator ${problem.correctNum} went negative`);
    }
  });
});

test("breuken: a 'simplify' question's expected answer really is in lowest terms", () => {
  for (let i = 0; i < REPS * 2; i++) {
    const problem = breuken.generate(3);
    assert.equal(
      gcd(problem.correctNum, problem.correctDen),
      1,
      `${problem.correctNum}/${problem.correctDen} is not fully simplified`,
    );
  }
});

test("breuken: every visual fraction is drawable (0 <= n, 0 < d)", () => {
  eachLevel((level) => {
    for (let i = 0; i < REPS; i++) {
      for (const [n, d] of breuken.generate(level).visualFracs) {
        assert.ok(d > 0 && n >= 0, `cannot draw ${n}/${d}`);
      }
    }
  });
});

test("meten: whole-number levels never expect a fractional answer", () => {
  [0, 1, 2, 3, 4].forEach((level) => {
    for (let i = 0; i < REPS; i++) {
      const problem = meten.generate(level);
      assert.equal(problem.answerKind, "int");
      assert.ok(
        Number.isInteger(problem.answer),
        `level ${level} expects ${problem.answer} in a whole-number box`,
      );
    }
  });
});

test("meten: money answers are non-negative and land on a cent", () => {
  for (let i = 0; i < REPS * 2; i++) {
    const problem = meten.generate(5);
    assert.equal(problem.answerKind, "euro");
    assert.ok(problem.answer >= 0, `negative change: ${problem.answer}`);
    assert.ok(
      Math.abs(problem.answer * 100 - Math.round(problem.answer * 100)) < 1e-6,
      `${problem.answer} is not a whole number of cents`,
    );
  }
});

test("procenten: choice questions include their own answer in the options", () => {
  [0, 1, 4].forEach((level) => {
    for (let i = 0; i < REPS; i++) {
      const problem = procenten.generate(level);
      assert.equal(problem.mode, "choice");
      assert.ok(problem.options.includes(problem.answer), "the answer is not among the options");
      assert.equal(new Set(problem.options).size, problem.options.length, "duplicate options");
      assert.ok(problem.options.length >= 2, "a choice needs at least two options");
    }
  });
});

test("procenten: numeric questions have whole-number answers", () => {
  [2, 3, 5].forEach((level) => {
    for (let i = 0; i < REPS; i++) {
      const problem = procenten.generate(level);
      assert.equal(problem.mode, "numeric");
      assert.ok(Number.isInteger(problem.answer), `level ${level} answer ${problem.answer}`);
      assert.ok(problem.answer >= 0);
    }
  });
});

test("algebra: only level 5 has two unknowns, and both are positive there", () => {
  eachLevel((level) => {
    for (let i = 0; i < REPS; i++) {
      const problem = algebra.generate(level);
      assert.equal(problem.twoVar, level === 5);
      if (level === 5) {
        assert.ok(problem.answer.x > 0 && problem.answer.y > 0);
        assert.ok(problem.answer.x > problem.answer.y, "x - y must stay positive");
      }
    }
  });
});

test("algebra: x is a whole number, and only levels 4+ can make it negative", () => {
  eachLevel((level) => {
    for (let i = 0; i < REPS; i++) {
      const { x } = algebra.generate(level).answer;
      assert.ok(Number.isInteger(x));
      if (level < 4) assert.ok(x > 0, `level ${level} produced x=${x}`);
    }
  });
});

test("meetkunde: every answer is a positive whole number", () => {
  eachLevel((level) => {
    for (let i = 0; i < REPS; i++) {
      const problem = meetkunde.generate(level);
      assert.ok(
        Number.isInteger(problem.answer) && problem.answer > 0,
        `level ${level}: ${problem.answer} (${problem.text})`,
      );
    }
  });
});

test("meetkunde: the angle level's given angles and the answer add to the shape's total", () => {
  for (let i = 0; i < REPS * 3; i++) {
    const problem = meetkunde.generate(5);
    const { shape, total, given } = problem.angles;
    assert.equal(total, shape === "triangle" ? 180 : 360);
    assert.equal(given.length, shape === "triangle" ? 2 : 3);
    const sum = given.reduce((s, v) => s + v, 0) + problem.answer;
    assert.equal(sum, total, `${given.join(" + ")} + ${problem.answer} = ${sum}, expected ${total}`);
    // Every angle has to be a sensible one to draw and to ask about - the old
    // rejection-sampled version could fall through to a negative third angle.
    assert.ok(problem.answer >= 20, `missing angle ${problem.answer} is too small`);
    for (const angle of given) {
      assert.ok(angle >= 20, `given angle ${angle} is too small`);
      assert.ok(angle < total, `given angle ${angle} exceeds the shape's total`);
    }
  }
});

test("verhoudingen: answers are non-negative, and only the unit-price level is money", () => {
  eachLevel((level) => {
    for (let i = 0; i < REPS; i++) {
      const problem = verhoudingen.generate(level);
      assert.ok(problem.answer >= 0, `level ${level}: ${problem.answer}`);
      assert.equal(problem.answerKind, level === 4 ? "euro" : "int");
      if (level !== 4) assert.ok(Number.isInteger(problem.answer));
    }
  });
});

test("getallen: long division splits into a whole quotient and a valid remainder", () => {
  for (let i = 0; i < REPS * 2; i++) {
    const problem = getallen.generate(4);
    assert.equal(problem.answerKind, "two_part");
    const { q, r } = problem.answer;
    const [dividend, divisor] = [...problem.text.matchAll(/\d+/g)].map((m) => Number(m[0]));
    assert.equal(q * divisor + r, dividend, `${dividend} : ${divisor} != ${q} r ${r}`);
    assert.ok(r >= 0 && r < divisor, `remainder ${r} out of range for divisor ${divisor}`);
  }
});

test("getallen: one-decimal answers really do have at most one decimal", () => {
  for (let i = 0; i < REPS * 2; i++) {
    const problem = getallen.generate(5);
    assert.equal(problem.answerKind, "decimal1");
    const tenths = problem.answer * 10;
    assert.ok(
      Math.abs(tenths - Math.round(tenths)) < 1e-9,
      `${problem.answer} needs more than one decimal`,
    );
  }
});

// ---------------------------------------------------------------------------
// Speed and logic games
// ---------------------------------------------------------------------------

test("bliksem: always offers four distinct non-negative options, one of them right", () => {
  eachLevel((level) => {
    for (let i = 0; i < REPS; i++) {
      const problem = bliksem.generateProblem(level);
      assert.equal(problem.options.length, 4, `got ${problem.options.length} options`);
      assert.equal(new Set(problem.options).size, 4, "duplicate options");
      assert.ok(problem.options.includes(problem.answer), "the answer is not among the options");
      for (const option of problem.options) {
        assert.ok(Number.isInteger(option) && option >= 0, `bad option ${option}`);
      }
    }
  });
});

test("bliksem: subtraction never goes below zero", () => {
  eachLevel((level) => {
    for (let i = 0; i < REPS; i++) {
      const problem = bliksem.generateProblem(level);
      assert.ok(problem.answer >= 0, `${problem.text} = ${problem.answer}`);
    }
  });
});

test("logica: choice questions always contain their answer", () => {
  eachLevel((level) => {
    for (let i = 0; i < REPS; i++) {
      const problem = logica.generate(level);
      if (problem.kind === "choice") {
        assert.ok(
          problem.options.map(String).includes(String(problem.answer)),
          `answer "${problem.answer}" missing from [${problem.options}]`,
        );
        assert.ok(problem.options.length >= 2);
      } else {
        assert.ok(Number.isInteger(problem.answer), `number answer ${problem.answer}`);
      }
      assert.ok(problem.explain && problem.explain.length > 0, "every logic question explains itself");
    }
  });
});

test("logica: a magic square's blank cell is consistent with the stated total", () => {
  let checked = 0;
  for (let i = 0; i < REPS * 6 && checked < 40; i++) {
    const problem = logica.generate(5);
    if (!problem.grid) continue;
    checked += 1;
    const { values, blankRow, blankCol } = problem.grid;
    const total = values[0].reduce((s, v) => s + v, 0);
    for (const row of values) assert.equal(row.reduce((s, v) => s + v, 0), total);
    for (let c = 0; c < 3; c++) {
      assert.equal(values[0][c] + values[1][c] + values[2][c], total);
    }
    assert.equal(problem.answer, values[blankRow][blankCol]);
  }
  assert.ok(checked > 0, "no magic square was generated in the sample");
});

test("code: Mastermind scoring never counts a repeated digit twice", () => {
  assert.deepEqual(code.scoreGuess([1, 2, 3], [1, 2, 3]), { exact: 3, misplaced: 0 });
  assert.deepEqual(code.scoreGuess([1, 2, 3], [3, 2, 1]), { exact: 1, misplaced: 2 });
  assert.deepEqual(code.scoreGuess([1, 2, 3], [4, 5, 6]), { exact: 0, misplaced: 0 });
  // The classic repeated-digit trap: one 1 in the secret cannot score twice.
  assert.deepEqual(code.scoreGuess([1, 2, 2], [2, 1, 1]), { exact: 0, misplaced: 2 });
  assert.deepEqual(code.scoreGuess([1, 1, 2], [1, 2, 1]), { exact: 1, misplaced: 2 });
});

test("code: exact + misplaced never exceeds the code length", () => {
  for (const level of LEVELS) {
    const [length, maxDigit, , allowRepeats] = code.LEVEL_RULES[level];
    for (let i = 0; i < REPS; i++) {
      const secret = code.newSecret(length, maxDigit, allowRepeats);
      const guess = code.newSecret(length, maxDigit, true);
      const { exact, misplaced } = code.scoreGuess(secret, guess);
      assert.ok(exact + misplaced <= length, `${exact}+${misplaced} > ${length}`);
    }
  }
});

test("code: a no-repeats level never generates a code with a repeated digit", () => {
  for (const level of LEVELS) {
    const [length, maxDigit, , allowRepeats] = code.LEVEL_RULES[level];
    if (allowRepeats) continue;
    for (let i = 0; i < REPS; i++) {
      const secret = code.newSecret(length, maxDigit, allowRepeats);
      assert.equal(new Set(secret).size, length, `repeated digit in ${secret}`);
      assert.ok(Math.max(...secret) <= maxDigit);
    }
  }
});

test("jacht: every round is winnable and has something to hunt", () => {
  eachLevel((level) => {
    for (let i = 0; i < 120; i++) {
      const round = jacht.buildRound(level);
      assert.equal(round.numbers.length, 20, `grid has ${round.numbers.length} cells`);
      assert.equal(new Set(round.numbers).size, 20, "the grid repeats a number");
      assert.ok(round.targets.size >= 1, `level ${level}: nothing to find`);
      assert.ok(
        round.targets.size < round.numbers.length,
        "tapping everything must not win the round",
      );
      for (const target of round.targets) {
        assert.ok(round.numbers.includes(target), "a target is not on the grid");
      }
      assert.ok(round.ruleLabel && !round.ruleLabel.includes("{"), `unfilled rule: ${round.ruleLabel}`);
    }
  });
});

// ---------------------------------------------------------------------------
// Visuals - they build strings, so they can be checked without a browser
// ---------------------------------------------------------------------------

test("every visual returns well-formed SVG with balanced tags", () => {
  const svgs = [
    visuals.pizzaSvg(3, 8),
    visuals.pizzaSvg(0, 1),
    visuals.fractionBarSvg(7, 16),
    visuals.fractionVisualSvg(5, 20),
    visuals.percentBarSvg(64),
    visuals.arrayGridSvg(4, 6),
    visuals.arrayGridSvg(20, 20), // over max_dots: the fallback grid
    visuals.clockSvg(9, 45),
    visuals.tapeDiagramSvg(20, 12.5),
    visuals.ratioBarSvg([3, 5], { labels: ["3", "5"] }),
    visuals.balanceScaleSvg("x + 4", "11"),
    visuals.numberLineSvg(-10, 10, [[-3, "start"]]),
    visuals.skipCountSvg(7, 56),
    visuals.rectangleSvg(6, 4, { unit: "cm" }),
    visuals.triangleSvg(12, 8, { unit: "cm" }),
    visuals.cuboidSvg(3, 4, 5, { unit: "cm" }),
    visuals.speedDiagramSvg(120, "km", 2, "uur"),
    visuals.countdownRingSvg(12, 60),
  ];
  for (const svg of svgs) {
    assert.match(svg, /^<svg[\s>]/, "does not start with <svg");
    assert.match(svg, /<\/svg>\s*$/, "does not end with </svg>");
    assert.ok(!svg.includes("NaN"), `NaN in SVG: ${svg.slice(0, 120)}`);
    assert.ok(!svg.includes("undefined"), `undefined in SVG: ${svg.slice(0, 120)}`);
    assert.equal(
      (svg.match(/<svg/g) || []).length,
      (svg.match(/<\/svg>/g) || []).length,
      "unbalanced <svg> tags",
    );
  }
});

test("each SVG scopes its animation classes to its own id", () => {
  // Two pizzas on one page must not animate each other - the whole reason the
  // visual library carries a per-render uid.
  const first = visuals.pizzaSvg(1, 4);
  const second = visuals.pizzaSvg(3, 4);
  const idOf = (svg) => svg.match(/id="(k[0-9a-f]+)"/)[1];
  assert.notEqual(idOf(first), idOf(second));
  assert.ok(first.includes(`.${idOf(first)}-fill`));
  assert.ok(!first.includes(idOf(second)));
});

test("every animated SVG honours prefers-reduced-motion", () => {
  const animated = [
    visuals.pizzaSvg(3, 8),
    visuals.percentBarSvg(50),
    visuals.clockSvg(3, 15),
    visuals.rectangleSvg(5, 3),
    visuals.speedDiagramSvg(60, "km", 1, "uur"),
  ];
  for (const svg of animated) {
    assert.match(svg, /prefers-reduced-motion/, "no reduced-motion escape hatch");
  }
});

test("a fraction visual clamps a numerator larger than its denominator", () => {
  const svg = visuals.pizzaSvg(99, 4);
  assert.match(svg, />4\/4 = 100%</);
});

test("visuals pick a pizza for small denominators and a bar for large ones", () => {
  assert.match(visuals.fractionVisualSvg(1, 8), /<path/);
  assert.match(visuals.fractionVisualSvg(1, 16), /<rect/);
});

// ---------------------------------------------------------------------------
// Language switching
// ---------------------------------------------------------------------------

test("switching language changes the generated question text", () => {
  setLanguage("nl");
  assert.equal(getLanguage(), "nl");
  const dutch = t("common.your_answer");
  setLanguage("en");
  const english = t("common.your_answer");
  assert.notEqual(dutch, english);
  setLanguage("nl");
});

test("generators work in English too", () => {
  setLanguage("en");
  try {
    for (const [name, generate] of Object.entries(GENERATORS)) {
      eachLevel((level) => {
        const problem = generate(level);
        assert.ok(problem.text.length > 0, `${name} produced no English question`);
        assert.ok(!problem.text.includes("{"), `${name}: unfilled placeholder in "${problem.text}"`);
      });
    }
  } finally {
    setLanguage("nl");
  }
});

// ---------------------------------------------------------------------------
// Racewedstrijd / Race Challenge - the race mode engine.
//
// Several players answer the same questions at once (online via a join
// code, or side by side on one device) - see web/js/race-logic.js. Every
// question is multiple choice, and a race can now draw from more than one
// kind of question (`category`), so the coverage here is mostly "every
// category, every level, produces a valid, answerable, fair question".
// ---------------------------------------------------------------------------

const RACE_LEVELS = [0, 1, 2, 3, 4, 5];

function assertValidProblem(problem, category) {
  assert.equal(typeof problem.text === "string" || typeof problem.textKey === "string", true, "problem needs text or a textKey");
  if (problem.textKey) {
    assert.ok(!problem.textKey.includes("undefined"));
  } else {
    assert.ok(problem.text.length > 0);
    assert.ok(!problem.text.includes("NaN") && !problem.text.includes("undefined"));
  }
  assert.equal(problem.answerDisplay, String(problem.answer));
  assert.equal(problem.options.length, 4, `${category}: expected 4 options, got ${problem.options.length}`);
  assert.ok(new Set(problem.options).size === 4, `${category}: options must be unique: ${problem.options}`);
  assert.ok(problem.options.includes(problem.answerDisplay), `${category}: the correct answer must be one of the options`);
  for (const opt of problem.options) assert.equal(typeof opt, "string", `${category}: options must be strings`);
}

test("every category produces a valid multiple-choice question at every level", () => {
  for (const category of race.CATEGORIES) {
    for (const level of RACE_LEVELS) {
      for (let i = 0; i < REPS / 4; i++) {
        assertValidProblem(race.generateRaceProblem(category, level), category);
      }
    }
  }
});

test("generateRaceQuestions returns exactly `count` questions", () => {
  for (const category of race.CATEGORIES) {
    const questions = race.generateRaceQuestions(category, 3, 12);
    assert.equal(questions.length, 12);
    questions.forEach((q) => assertValidProblem(q, category));
  }
});

test("questionText/questionAnswer (bliksem) are pure and agree with each other", () => {
  assert.equal(race.questionAnswer(4, 3, "+"), 7);
  assert.equal(race.questionAnswer(4, 3, "-"), 1);
  assert.equal(race.questionAnswer(4, 3, "x"), 12);
  assert.equal(race.questionAnswer(5, 3, ":"), 5); // a *is* the quotient
  assert.equal(race.questionText(4, 3, "+"), "4 + 3");
  assert.equal(race.questionText(4, 3, "-"), "4 − 3");
  assert.equal(race.questionText(4, 3, "x"), "4 × 3");
  assert.equal(race.questionText(5, 3, ":"), "15 : 3"); // dividend shown is a*b
});

test("procenten hands back a textKey + vars instead of a hardcoded connector word", () => {
  for (let i = 0; i < 50; i++) {
    const problem = race.generateRaceProblem("procenten", 3);
    assert.equal(problem.textKey, "race.pct_of");
    assert.ok(Number.isInteger(problem.textVars.pct));
    assert.ok(Number.isInteger(problem.textVars.base));
    assert.equal(Number(problem.answer), (problem.textVars.pct * problem.textVars.base) / 100);
  }
});

test("breuken adds two fractions that already share a denominator and never overflows it", () => {
  for (let i = 0; i < 100; i++) {
    const problem = race.generateRaceProblem("breuken", 4);
    const [num1, den1] = problem.text.split(" + ")[0].split("/").map(Number);
    const [sum, den2] = problem.answerDisplay.split("/").map(Number);
    assert.equal(den1, den2);
    assert.ok(sum <= den2, `fraction sum overflowed its denominator: ${problem.answerDisplay}`);
    assert.ok(num1 >= 1 && num1 < den1);
  }
});

test("makeChoices always returns 4 unique choices including the answer", () => {
  assert.deepEqual(new Set(race.makeChoices(10, [10, 11, 9, 12, 8])).size, 4);
  // Too few distractors: the numeric fallback must still fill to 4.
  assert.equal(race.makeChoices(0, []).length, 4);
  assert.equal(new Set(race.makeChoices(0, [])).size, 4);
  // Non-numeric answers (fractions) use the string fallback instead.
  assert.equal(race.makeChoices("1/2", []).length, 4);
});

test("race points: instant answers score the max, the buzzer scores the min, wrong scores nothing", () => {
  assert.equal(race.racePoints(false, 0), 0);
  assert.equal(race.racePoints(false, 15000), 0);
  assert.equal(race.racePoints(true, 0), race.RACE_MAX_POINTS);
  assert.equal(race.racePoints(true, race.ROUND_SECONDS * 1000), race.RACE_MIN_POINTS);
  // Never fully zero for a correct answer, however late - only wrong is zero.
  assert.ok(race.racePoints(true, race.ROUND_SECONDS * 1000 + 5000) >= race.RACE_MIN_POINTS);
  // Monotonically non-increasing as elapsed time grows.
  let previous = race.RACE_MAX_POINTS + 1;
  for (let ms = 0; ms <= race.ROUND_SECONDS * 1000; ms += 500) {
    const points = race.racePoints(true, ms);
    assert.ok(points <= previous, `points rose from ${previous} to ${points} at ${ms}ms`);
    previous = points;
  }
});

test("generateRoomCode produces a 5-character unambiguous code", () => {
  for (let i = 0; i < 200; i++) {
    const code = race.generateRoomCode();
    assert.equal(code.length, 5);
    assert.doesNotMatch(code, /[0O1I]/, `code contains an ambiguous character: ${code}`);
  }
});

test("cleanPlayerName trims, caps the length, and falls back when empty", () => {
  assert.equal(race.cleanPlayerName("  Alice  "), "Alice");
  assert.equal(race.cleanPlayerName("A".repeat(60)).length, race.MAX_NAME_LENGTH);
  assert.equal(race.cleanPlayerName("   "), "Player");
  assert.equal(race.cleanPlayerName("", "Speler 2"), "Speler 2");
});

test("rankPlayers sorts by score, ties broken by whoever joined first, and generalizes past two players", () => {
  const players = [
    { name: "A", score: 50 },
    { name: "B", score: 90 },
    { name: "C", score: 90 },
    { name: "D", score: 10 },
    { name: "E", score: 90 },
  ];
  const ranked = race.rankPlayers(players);
  assert.deepEqual(ranked.map((p) => p.name), ["B", "C", "E", "A", "D"]);
  assert.deepEqual(ranked.map((p) => p.rank), [1, 2, 3, 4, 5]);
});

// ---------------------------------------------------------------------------
// QR code encoder - independent round-trip decode
//
// The tables (Reed-Solomon block sizes, alignment-pattern positions) are
// copied verbatim from a well-known reference (see the comment at the top of
// qrcode.js), so what is actually worth testing here is this file's own
// wiring between them - not something a passing "it drew a grid of squares"
// check would catch. This decodes the matrix the same way a scanner (or a
// second implementation) would: read the format-info bits, unmask using the
// mask pattern they name, walk the data region in the same zig-zag order as
// the encoder (written fresh here, not imported from it), split the result
// back into Reed-Solomon blocks, and check the error-correction codewords
// against a from-scratch syndrome calculation - a different computation
// (polynomial evaluation) than the encoder's own (polynomial division), so a
// wrong generator polynomial or a wrong interleave order shows up as a
// non-zero syndrome instead of silently agreeing with itself.
// ---------------------------------------------------------------------------

function qrInFinderZone(row, col, moduleCount) {
  const near = (r0, c0) => row >= r0 - 1 && row <= r0 + 7 && col >= c0 - 1 && col <= c0 + 7;
  return near(0, 0) || near(moduleCount - 7, 0) || near(0, moduleCount - 7);
}

function qrReservedModule(row, col, moduleCount, typeNumber, alignmentPositions) {
  if (qrInFinderZone(row, col, moduleCount)) return true;

  if (row === 6 && col >= 8 && col <= moduleCount - 9) return true;
  if (col === 6 && row >= 8 && row <= moduleCount - 9) return true;

  // An alignment pattern is only actually drawn where its *center* does not
  // already fall inside a finder pattern's zone (that is what the encoder's
  // own "skip if this cell is already set" check amounts to, since at this
  // point in the build only the three finder patterns have been drawn) - a
  // center whose neighbourhood merely *overlaps* a finder zone without the
  // center itself being inside one still gets a real alignment pattern.
  for (const r0 of alignmentPositions) {
    for (const c0 of alignmentPositions) {
      if (qrInFinderZone(r0, c0, moduleCount)) continue;
      if (row >= r0 - 2 && row <= r0 + 2 && col >= c0 - 2 && col <= c0 + 2) return true;
    }
  }

  if (col === 8 && ((row <= 8 && row !== 6) || row >= moduleCount - 7)) return true;
  if (row === 8 && ((col <= 8 && col !== 6) || col >= moduleCount - 8)) return true;
  if (row === moduleCount - 8 && col === 8) return true; // the fixed dark module

  if (typeNumber >= 7) {
    if (row <= 5 && col >= moduleCount - 11 && col <= moduleCount - 9) return true;
    if (row >= moduleCount - 11 && row <= moduleCount - 9 && col <= 5) return true;
  }

  return false;
}

/** Walks the data region in the same column-pair, direction-flipping order
 *  ISO/IEC 18004 specifies (and qrcode.js's own placement loop uses) and
 *  returns the raw, unmasked codeword bytes. */
function qrExtractCodewords(encoded) {
  const { size, typeNumber, maskPattern, isDark } = encoded;
  const alignmentPositions = qrcode._internal.patternPosition(typeNumber);
  const maskFn = qrcode._internal.MASK_FUNCTIONS[maskPattern];

  const bytes = [];
  let byte = 0;
  let bitCount = 0;
  let inc = -1;
  let row = size - 1;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      for (let c = 0; c < 2; c += 1) {
        const cc = col - c;
        if (!qrReservedModule(row, cc, size, typeNumber, alignmentPositions)) {
          let dark = isDark(row, cc);
          if (maskFn(row, cc)) dark = !dark;
          byte = (byte << 1) | (dark ? 1 : 0);
          bitCount += 1;
          if (bitCount === 8) {
            bytes.push(byte);
            byte = 0;
            bitCount = 0;
          }
        }
      }
      row += inc;
      if (row < 0 || size <= row) {
        row -= inc;
        inc = -inc;
        break;
      }
    }
  }
  return bytes;
}

/** Reed-Solomon syndrome check: for a valid codeword, evaluating it at
 *  alpha^0..alpha^(ecCount-1) over GF(256) must give zero every time. This
 *  is a different calculation from how the encoder produced the EC bytes
 *  (polynomial multiply + mod), so it only passes if the generator
 *  polynomial, the GF(256) tables and the block interleaving all agree. */
function assertRSBlockValid(blockBytes, ecCount, message) {
  const n = blockBytes.length;
  for (let j = 0; j < ecCount; j += 1) {
    let syndrome = 0;
    for (let k = 0; k < n; k += 1) {
      if (blockBytes[k] === 0) continue;
      syndrome ^= qrcode._internal.QRMath.gexp(
        qrcode._internal.QRMath.glog(blockBytes[k]) + j * (n - 1 - k),
      );
    }
    assert.equal(syndrome, 0, `${message}: non-zero syndrome at j=${j}`);
  }
}

/** Full round-trip: matrix -> codewords -> de-interleaved RS blocks
 *  (syndrome-checked) -> original data bit buffer -> mode/length/payload ->
 *  UTF-8 text. Throws/asserts on any mismatch. */
function qrDecodeText(encoded) {
  const { typeNumber, ecLevel } = encoded;
  const rsBlocks = qrcode._internal.getRSBlocks(typeNumber, ecLevel);
  const flat = qrExtractCodewords(encoded);

  const maxDcCount = Math.max(...rsBlocks.map((b) => b.dataCount));
  const maxEcCount = Math.max(...rsBlocks.map((b) => b.totalCount - b.dataCount));
  const dc = rsBlocks.map((b) => new Array(b.dataCount));
  const ec = rsBlocks.map((b) => new Array(b.totalCount - b.dataCount));

  let index = 0;
  for (let i = 0; i < maxDcCount; i += 1) {
    for (let r = 0; r < rsBlocks.length; r += 1) {
      if (i < dc[r].length) dc[r][i] = flat[index++];
    }
  }
  for (let i = 0; i < maxEcCount; i += 1) {
    for (let r = 0; r < rsBlocks.length; r += 1) {
      if (i < ec[r].length) ec[r][i] = flat[index++];
    }
  }

  rsBlocks.forEach((block, r) => {
    assertRSBlockValid([...dc[r], ...ec[r]], block.totalCount - block.dataCount, `block ${r}`);
  });

  // Original bit buffer = each block's data codewords, concatenated in
  // block order (not interleaved - the interleaving above undoes that).
  const dataBytes = dc.flat();
  const readBits = (bitOffset, numBits) => {
    let value = 0;
    for (let i = 0; i < numBits; i += 1) {
      const idx = bitOffset + i;
      const bit = (dataBytes[idx >> 3] >> (7 - (idx & 7))) & 1;
      value = (value << 1) | bit;
    }
    return value;
  };

  const mode = readBits(0, 4);
  assert.equal(mode, qrcode._internal.MODE_8BIT_BYTE, "mode indicator is not byte mode");
  const lengthBits = qrcode._internal.lengthInBits(typeNumber);
  const byteLength = readBits(4, lengthBits);
  const payloadStart = 4 + lengthBits;
  const payload = [];
  for (let i = 0; i < byteLength; i += 1) payload.push(readBits(payloadStart + i * 8, 8));

  return Buffer.from(payload).toString("utf8");
}

test("qrSvg / encodeQr: round-trips short, medium and long payloads (independent decode)", () => {
  const samples = [
    "A",
    "HELLO WORLD 123",
    "v=0\r\no=- 1234567890 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n", // SDP-shaped
    "x".repeat(200),
    "y".repeat(900), // forces a version well above 6, exercising version-info bits
    "🎉 groep 6/7 — база64url-ish_-payload ".repeat(20), // multibyte UTF-8
  ];
  for (const text of samples) {
    const encoded = qrcode.encodeQr(text);
    assert.ok(encoded.typeNumber >= 1 && encoded.typeNumber <= 40);
    assert.equal(encoded.size, encoded.typeNumber * 4 + 17);
    const decoded = qrDecodeText(encoded);
    assert.equal(decoded, text, `round-trip mismatch for a ${text.length}-char payload`);
  }
});

test("encodeQr picks the smallest version that fits (version 1 L byte-mode capacity is 17 bytes)", () => {
  assert.equal(qrcode.encodeQr("a".repeat(17)).typeNumber, 1);
  assert.equal(qrcode.encodeQr("a".repeat(18)).typeNumber, 2);
});

test("encodeQr throws rather than silently truncating oversized payloads", () => {
  assert.throws(() => qrcode.encodeQr("x".repeat(3000)), RangeError);
});

test("encodeQr rejects an unknown error-correction level", () => {
  assert.throws(() => qrcode.encodeQr("hi", { ecLevel: "Z" }), RangeError);
});

test("every QR matrix has the three finder patterns and a fully alternating timing pattern", () => {
  for (const text of ["short", "a".repeat(300)]) {
    const { size, isDark } = qrcode.encodeQr(text);
    // Finder pattern: solid 7x7 ring with a light separator ring and a dark
    // 3x3 core, at all three corners.
    const checkFinder = (r0, c0) => {
      for (let r = 0; r < 7; r += 1) {
        for (let c = 0; c < 7; c += 1) {
          const isRing = r === 0 || r === 6 || c === 0 || c === 6;
          const isCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          const expected = isRing || isCore;
          assert.equal(isDark(r0 + r, c0 + c), expected, `finder(${r0},${c0}) mismatch at ${r},${c}`);
        }
      }
    };
    checkFinder(0, 0);
    checkFinder(0, size - 7);
    checkFinder(size - 7, 0);

    for (let i = 8; i <= size - 9; i += 1) {
      assert.equal(isDark(6, i), i % 2 === 0, `horizontal timing pattern breaks at column ${i}`);
      assert.equal(isDark(i, 6), i % 2 === 0, `vertical timing pattern breaks at row ${i}`);
    }
  }
});

test("qrSvg embeds the module count's pixel size and only the two documented colours", () => {
  const svg = qrcode.qrSvg("https://example.invalid/join?x=1", { cellSize: 3, margin: 12 });
  const { size } = qrcode.encodeQr("https://example.invalid/join?x=1");
  const pixels = size * 3 + 12 * 2;
  assert.ok(svg.includes(`viewBox="0 0 ${pixels} ${pixels}"`));
  assert.ok(svg.startsWith("<svg"));
  assert.ok(svg.trim().endsWith("</svg>"));
  assert.ok(svg.includes('fill="#ffffff"'));
  assert.ok(svg.includes('fill="#000000"'));
});

// ---------------------------------------------------------------------------
// Race room engine - the transport-agnostic authoritative room state machine
// extracted out of race-server.js so the WebRTC "direct" connection mode can
// run it locally in the browser. A fake `ws` here is anything with `.send()`
// and `.readyState` - exactly what a real WebSocket and an RTCDataChannel
// wrapper both look like from this class's point of view.
// ---------------------------------------------------------------------------

function fakeSocket() {
  const received = [];
  return {
    received,
    readyState: 1,
    send(payload) {
      received.push(JSON.parse(payload));
    },
  };
}

test("RaceRoomManager: create, join, start, answer and finish a 2-player room", () => {
  const manager = new RaceRoomManager();
  const hostWs = fakeSocket();
  const guestWs = fakeSocket();

  manager.handleMessage(hostWs, {
    type: "create_room",
    playerName: "Host",
    settings: { category: "tafels", rounds: 5, level: 0 },
  });
  const created = hostWs.received.find((m) => m.type === "room_created");
  assert.ok(created, "no room_created ack");
  const { roomCode, playerId: hostId } = created;

  manager.handleMessage(guestWs, { type: "join_room", roomCode, playerName: "Guest" });
  const joined = guestWs.received.find((m) => m.type === "room_joined");
  assert.ok(joined, "no room_joined ack");
  const guestId = joined.playerId;
  assert.equal(joined.players.length, 2);

  const hostJoinBroadcast = hostWs.received.find((m) => m.type === "player_joined");
  assert.ok(hostJoinBroadcast, "host was never told a guest joined");

  manager.handleMessage(hostWs, { type: "start_game", roomCode, playerId: hostId });
  assert.ok(hostWs.received.some((m) => m.type === "countdown_started"));

  const room = manager.rooms.get(roomCode);
  // Skip past the 3-2-1 countdown timers directly to the first round rather
  // than waiting on real setTimeout delays in a unit test.
  clearTimeout(room.timer);
  manager.startNextRound(room);
  const roundStarted = hostWs.received.find((m) => m.type === "round_started");
  assert.ok(roundStarted, "round never started");
  assert.equal(roundStarted.question.options.length, 4);

  const correctAnswer = room.questions[0].answerDisplay;
  manager.handleMessage(hostWs, { type: "submit_answer", roomCode, playerId: hostId, answer: correctAnswer });
  manager.handleMessage(guestWs, { type: "submit_answer", roomCode, playerId: guestId, answer: "not-the-answer" });

  // Both players answered - endRound was scheduled for 700ms out; run it now.
  clearTimeout(room.timer);
  manager.endRound(room);
  const recap = hostWs.received.find((m) => m.type === "round_recap");
  assert.ok(recap, "no round recap broadcast");
  const hostResult = recap.results.find((r) => r.id === hostId);
  const guestResult = recap.results.find((r) => r.id === guestId);
  assert.equal(hostResult.isCorrect, true);
  assert.equal(guestResult.isCorrect, false);
  assert.ok(hostResult.points > 0);

  // Fast-forward through the remaining 4 rounds the same way.
  for (let i = 1; i < 5; i += 1) {
    clearTimeout(room.timer);
    manager.startNextRound(room);
    const answer = room.questions[i].answerDisplay;
    manager.handleMessage(hostWs, { type: "submit_answer", roomCode, playerId: hostId, answer });
    manager.handleMessage(guestWs, { type: "submit_answer", roomCode, playerId: guestId, answer });
    clearTimeout(room.timer);
    manager.endRound(room);
  }
  clearTimeout(room.timer);
  manager.startNextRound(room); // currentRoundIndex is now 5 == questions.length -> finishGame

  const finished = hostWs.received.find((m) => m.type === "game_finished");
  assert.ok(finished, "game never finished");
  assert.equal(finished.stats.length, 2);
  const hostStat = finished.stats.find((s) => s.id === hostId);
  assert.ok(hostStat.correctCount >= 1);
});

test("RaceRoomManager: joinRoom rejects a full room, a bad code, and a race already in progress", () => {
  const manager = new RaceRoomManager();
  const room = manager.createRoom("Host", { rounds: 5 });

  assert.equal(manager.joinRoom("does-not-exist", "X").error, "Racecode niet gevonden. Controleer de code.");

  for (let i = 0; i < race.MAX_PLAYERS - 1; i += 1) {
    const result = manager.joinRoom(room.code, `Guest ${i}`);
    assert.ok(!result.error, `guest ${i} should have been able to join`);
  }
  assert.ok(manager.joinRoom(room.code, "One too many").error);

  room.status = "in_round";
  assert.ok(manager.joinRoom(room.code, "Late joiner").error);
});

// ---------------------------------------------------------------------------
// WebRTC signal blobs - the offer/answer round trip that replaces the
// join-code server for Direct mode. Treated as hostile input on decode,
// exactly like the old challenge-link decoder (CHANGELOG round 9): a player
// can hand-edit, truncate, or paste the wrong kind of blob entirely.
// ---------------------------------------------------------------------------

function fakeDescription(type, extra = "") {
  return { type, sdp: `v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n${extra}` };
}

test("encodeSignalBlob / decodeSignalBlob: offer round-trips its code, settings and SDP", () => {
  const description = fakeDescription("offer", "a=candidate:1 1 UDP 1 192.168.1.5 50000 typ host\r\n");
  const settings = { category: "tafels", rounds: 8, level: 3 };
  const blob = webrtcSignal.encodeSignalBlob({ type: "offer", code: "AB2CD", settings, description });

  const decoded = webrtcSignal.decodeSignalBlob(blob, "offer");
  assert.equal(decoded.ok, true);
  assert.equal(decoded.code, "AB2CD");
  assert.deepEqual(decoded.settings, settings);
  assert.deepEqual(decoded.description, description);
});

test("encodeSignalBlob / decodeSignalBlob: answer round-trips its code and SDP, with no settings", () => {
  const description = fakeDescription("answer");
  const blob = webrtcSignal.encodeSignalBlob({ type: "answer", code: "ZZZZZ", description });
  const decoded = webrtcSignal.decodeSignalBlob(blob, "answer");
  assert.equal(decoded.ok, true);
  assert.equal(decoded.code, "ZZZZZ");
  assert.equal(decoded.settings, null);
  assert.deepEqual(decoded.description, description);
});

test("decodeSignalBlob rejects an answer blob when an offer was expected, and vice versa", () => {
  const offerBlob = webrtcSignal.encodeSignalBlob({ type: "offer", code: "ABCDE", settings: {}, description: fakeDescription("offer") });
  const answerBlob = webrtcSignal.encodeSignalBlob({ type: "answer", code: "ABCDE", description: fakeDescription("answer") });
  assert.equal(webrtcSignal.decodeSignalBlob(offerBlob, "answer").ok, false);
  assert.equal(webrtcSignal.decodeSignalBlob(answerBlob, "offer").ok, false);
});

test("decodeSignalBlob rejects garbage, empty, truncated and oversized input without throwing", () => {
  const cases = [
    "",
    "   ",
    "not-base64url-json!!!",
    btoa("this is not json"),
    webrtcSignal.encodeSignalBlob({ type: "offer", code: "ABCDE", settings: {}, description: fakeDescription("offer") }).slice(0, 20),
    "A".repeat(webrtcSignal._internal.MAX_BLOB_LENGTH + 10),
  ];
  for (const input of cases) {
    const decoded = webrtcSignal.decodeSignalBlob(input, "offer");
    assert.equal(decoded.ok, false, `expected ${JSON.stringify(input.slice(0, 30))} to be rejected`);
  }
});

test("decodeSignalBlob rejects a well-formed blob whose SDP was tampered with", () => {
  const blob = webrtcSignal.encodeSignalBlob({ type: "offer", code: "ABCDE", settings: {}, description: fakeDescription("offer") });
  const raw = JSON.parse(webrtcSignal._internal.fromBase64Url(blob));
  raw.sdp.sdp = "not an sdp body";
  const tampered = webrtcSignal._internal.toBase64Url(JSON.stringify(raw));
  assert.equal(webrtcSignal.decodeSignalBlob(tampered, "offer").ok, false);
});

test("decodeSignalBlob fills in default settings when an offer omits them", () => {
  const blob = webrtcSignal.encodeSignalBlob({ type: "offer", code: "ABCDE", settings: null, description: fakeDescription("offer") });
  const decoded = webrtcSignal.decodeSignalBlob(blob, "offer");
  assert.equal(decoded.ok, true);
  assert.equal(decoded.settings.category, "bliksem");
  assert.equal(decoded.settings.rounds, 10);
  assert.equal(decoded.settings.level, 2);
});
