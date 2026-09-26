/**
 * Round 18: groep 8 levels (6 and 7), and what happens to levels a child has
 * already finished - the mastery log, the one-off mastery bonus, the "move
 * up" nudge, the next-challenge card and the level passport - plus the
 * places the new levels touch rewards, badges and quests.
 *
 * The rule guarded hardest here is the round-15 one, extended: finishing a
 * level pays a bonus exactly once. Sliding down and climbing back through
 * the same level must pay nothing more, or the bonus becomes a farm.
 *
 * Run with: npm test
 */
import test from "node:test";
import assert from "node:assert/strict";

const state = await import("../../web/js/state.js");
const progress = await import("../../web/js/progress.js");
const rewards = await import("../../web/js/rewards.js");
const quests = await import("../../web/js/quests.js");
const { checkNewBadges } = await import("../../web/js/badges.js");
const { TRANSLATIONS } = await import("../../web/js/i18n.js");
const uiBits = await import("../../web/js/ui-bits.js");

const S = state.state;

function freshPlayer() {
  state.applyProfile(`__mastery_${Math.random()}__`);
  S.streaks = 0;
}

/** In-memory localStorage for the tests that need a real save -> reload. */
function withStorage(fn) {
  const store = new Map();
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  try {
    return fn(store);
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
}

/** Three right answers in a row: the real, streak-earned level-up. */
function levelUp(game) {
  let result;
  for (let i = 0; i < state.LEVEL_UP_STREAK; i++) result = state.registerAttempt(game, true);
  return result;
}

/** Two wrong answers in a row: the real level-down. */
function levelDown(game) {
  let result;
  for (let i = 0; i < state.LEVEL_DOWN_STREAK; i++) result = state.registerAttempt(game, false);
  return result;
}

// ---------------------------------------------------------------------------
// Levels 0-7
// ---------------------------------------------------------------------------

test("every game runs 0-7, and the difficulty labels name levels 6 and 7 as groep 8", () => {
  assert.equal(state.MIN_LEVEL, 0);
  assert.equal(state.MAX_LEVEL, 7);
  assert.equal(state.MASTER_LEVEL, 5);
  assert.equal(state.GROEP8_LEVEL, 6);
  for (const game of state.GAME_KEYS) assert.equal(state.getMaxLevel(game), 7, game);
  assert.deepEqual(uiBits.getLevels("tafel"), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(uiBits.DIFFICULTY_KEYS.length, 8);
  for (const lang of ["nl", "en"]) {
    for (const key of uiBits.DIFFICULTY_KEYS) assert.ok(TRANSLATIONS[lang][key], `${lang} ${key}`);
    assert.match(TRANSLATIONS[lang]["common.difficulty_champion"], /groep 8/);
    assert.match(TRANSLATIONS[lang]["common.difficulty_legend"], /groep 8/);
  }
});

test("the new games are real, levelled games: in GAME_KEYS, with a name, title and intro in both languages", () => {
  // Round 19 added two arcade games and three puzzle/strategy games.
  for (const game of ["lezen", "woorden", "spelling", "vlieg", "sprong", "toren", "kart", "doku", "tactiek", "park"]) {
    assert.ok(state.GAME_KEYS.includes(game), game);
    for (const lang of ["nl", "en"]) {
      for (const key of [`game.${game}.name`, `${game}.title`, `${game}.tagline`, `${game}.intro`, `nav.${game}`]) {
        assert.ok(TRANSLATIONS[lang][key], `${lang} ${key}`);
      }
    }
  }
  assert.deepEqual([...state.READING_GAMES].sort(), ["lezen", "spelling", "woorden"]);
  assert.deepEqual([...state.ARCADE_GAMES].sort(), ["kart", "sprong", "toren", "vlieg"]);
  assert.deepEqual([...state.PUZZLE_GAMES].sort(), ["doku", "park", "tactiek"]);
});

// ---------------------------------------------------------------------------
// Mastery: the log and the one-off bonus
// ---------------------------------------------------------------------------

test("mastering a level pays a one-off bonus in coins (not score) and logs it with a date", () => {
  freshPlayer();
  state.setLevel("breuken", 2);
  const coins = S.coins;
  const score = S.totalScore;
  const result = levelUp("breuken");
  assert.equal(result.leveledUp, true);
  assert.equal(result.masteryBonus, state.masteryBonus(2));
  // The three answers themselves paid nothing here (registerAttempt does not
  // score), so every coin that moved is the bonus - and the score did not move.
  assert.equal(S.coins - coins, state.masteryBonus(2));
  assert.equal(S.totalScore, score, "the bonus is a gift: score stays 'points earned by answering'");
  assert.equal(S.masteryLog.length, 1);
  assert.equal(S.masteryLog[0].game, "breuken");
  assert.equal(S.masteryLog[0].level, 2);
  assert.ok(!Number.isNaN(Date.parse(S.masteryLog[0].at)));
});

test("sliding down and climbing back through a mastered level pays no second bonus - it cannot be farmed", () => {
  freshPlayer();
  state.setLevel("meten", 3);
  assert.equal(levelUp("meten").masteryBonus, state.masteryBonus(3));
  const coinsAfterFirst = S.coins;
  // Fall back to 3 and climb through it again, five times over.
  for (let round = 0; round < 5; round++) {
    assert.equal(levelDown("meten").leveledDown, true);
    assert.equal(state.getLevel("meten"), 3);
    const again = levelUp("meten");
    assert.equal(again.leveledUp, true);
    assert.equal(again.masteryBonus, 0, `round ${round}: a repeat climb must not pay`);
  }
  assert.equal(S.coins, coinsAfterFirst);
  assert.equal(S.masteryLog.filter((e) => e.game === "meten" && e.level === 3).length, 1, "logged once");
});

test("the mastery bonus grows with the level, so the bonus itself says 'keep climbing'", () => {
  for (let level = 1; level < state.MAX_LEVEL; level++) {
    assert.ok(state.masteryBonus(level) > state.masteryBonus(level - 1));
  }
});

test("a manual level pick still masters nothing and pays nothing (round 15's rule, unchanged)", () => {
  freshPlayer();
  const coins = S.coins;
  state.setLevel("procenten", 0);
  state.setLevel("procenten", 7);
  state.setLevel("procenten", 0);
  assert.equal(S.coins, coins);
  assert.equal(S.masteryLog.length, 0);
  assert.equal(state.masteredLevelCount(), 0);
});

// ---------------------------------------------------------------------------
// The nudge and the next challenge
// ---------------------------------------------------------------------------

test("nextPayingLevel points a child on a mastered level to the nearest level that still pays", () => {
  freshPlayer();
  state.setLevel("algebra", 0);
  levelUp("algebra"); // masters 0
  levelUp("algebra"); // masters 1
  levelUp("algebra"); // masters 2, now on 3
  state.setLevel("algebra", 0); // back to an easy level on purpose
  assert.equal(state.canEarnAtLevel("algebra", 0), false);
  assert.equal(state.nextPayingLevel("algebra", 0), 3, "skips 1 and 2, which are mastered too");
  assert.equal(state.nextPayingLevel("algebra", 3), 4);
  assert.equal(state.nextPayingLevel("algebra", 7), null, "nothing above the top");
});

test("the next challenge: climbing off a mastered level comes first, then groep 8, then new games (reading first), then the lowest", () => {
  freshPlayer();
  for (const game of state.GAME_KEYS) S.gamesTried.add(game);
  for (const game of state.GAME_KEYS) state.setLevel(game, 4);

  // Nothing special: the lowest game.
  state.setLevel("code", 1);
  assert.deepEqual(progress.nextChallenge(), { kind: "lowest", game: "code", level: 1 });

  // An untried game beats the lowest; a reading game beats an arcade one.
  S.gamesTried.delete("sprong");
  S.gamesTried.delete("woorden");
  assert.deepEqual(progress.nextChallenge(), { kind: "new", game: "woorden", level: 4 });

  // A game at the old top of 5 has groep 8 waiting: moving up beats trying
  // something new.
  state.setLevel("logica", 5);
  assert.deepEqual(progress.nextChallenge(), { kind: "groep8", game: "logica", level: 6 });

  // Sitting on a mastered level beats everything.
  state.setLevel("breuken", 1);
  levelUp("breuken"); // masters 1, now on 2
  state.setLevel("breuken", 1);
  assert.deepEqual(progress.nextChallenge(), { kind: "climb", game: "breuken", level: 2 });
});

test("the level passport stamps mastered levels, marks the current one, and has 8 cells per game", () => {
  freshPlayer();
  state.setLevel("spelling", 0);
  levelUp("spelling");
  levelUp("spelling"); // masters 0 and 1, now on 2
  const row = progress.levelPassport().find((r) => r.game === "spelling");
  assert.deepEqual(row.cells, ["cleared", "cleared", "current", "open", "open", "open", "open", "open"]);
  assert.equal(row.cleared, 2);
  for (const r of progress.levelPassport()) assert.equal(r.cells.length, 8, r.game);
  assert.equal(state.masteredLevelCount(), 2);
});

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

test("the mastery log, reading counters and learning bites survive a save and reload", () => {
  withStorage(() => {
    state.setPlayerName("Mastery Tester");
    state.setLevel("lezen", 1);
    levelUp("lezen");
    S.wordsRead = 321;
    S.readCorrect = 12;
    S.arcadeBest = 9;
    S.bites = { m_breuk: { stars: 2, at: "2026-09-01T10:00:00.000Z" } };
    state.saveCurrentProfile();

    state.applyProfile("somebody else");
    assert.equal(S.masteryLog.length, 0);
    assert.equal(S.wordsRead, 0);

    state.applyProfile("Mastery Tester");
    assert.equal(S.masteryLog.length, 1);
    assert.equal(S.masteryLog[0].game, "lezen");
    assert.equal(S.wordsRead, 321);
    assert.equal(S.readCorrect, 12);
    assert.equal(S.arcadeBest, 9);
    assert.deepEqual(S.bites, { m_breuk: { stars: 2, at: "2026-09-01T10:00:00.000Z" } });
    assert.equal(state.isLevelCleared("lezen", 1), true);
  });
});

test("a profile from before round 18 gets its mastery log rebuilt from its cleared levels, undated", () => {
  withStorage((store) => {
    store.set(
      "kmg.profiles",
      JSON.stringify({
        Oldie: { totalScore: 900, coins: 400, levels: { tafel: 5, breuken: 3 }, clearedLevels: { tafel: [0, 1, 2, 3, 4], breuken: [0, 1, 2] } },
      }),
    );
    state.applyProfile("Oldie");
    assert.equal(S.masteryLog.length, 8);
    assert.ok(S.masteryLog.every((e) => e.at === null));
    assert.equal(S.wordsRead, 0);
    assert.deepEqual(S.bites, {});
    // An old maxed Tafel Monster (5 of the old 5) is now 5 of 7: it can
    // climb into groep 8, and the next challenge says so.
    assert.equal(state.getLevel("tafel"), 5);
    assert.equal(state.canEarnAtLevel("tafel", 6), true);
    assert.equal(progress.masteryLogNewestFirst().length, 8);
  });
});

test("clearing all profiles resets the round-18 fields too", () => {
  withStorage(() => {
    freshPlayer();
    state.setLevel("woorden", 0);
    levelUp("woorden");
    S.wordsRead = 50;
    S.bites = { t_dt: { stars: 1, at: null } };
    state.clearAllProfiles();
    assert.equal(S.masteryLog.length, 0);
    assert.equal(S.wordsRead, 0);
    assert.equal(S.readCorrect, 0);
    assert.equal(S.arcadeBest, 0);
    assert.deepEqual(S.bites, {});
  });
});

// ---------------------------------------------------------------------------
// Rewards, badges, quests
// ---------------------------------------------------------------------------

test("raising the top level moved no existing goal: mythic items still unlock at level 5", () => {
  freshPlayer();
  for (const game of state.GAME_KEYS) state.setLevel(game, 0);
  const mythic = rewards.REWARD_DEFS.filter((d) => d.tier === "mythic" && !d.id.startsWith("avatar_crystal") && !d.id.startsWith("avatar_rocket") && d.id !== "gift_golden_book");
  assert.ok(mythic.length >= 10);
  for (const def of mythic) assert.equal(def.minLevel, 5, def.id);
  state.setLevel("tafel", 5);
  S.coins = 100000;
  assert.equal(rewards.lockReason("avatar_dragon_blade"), "coins", "level 5 is still enough for a mythic hero");
  for (const game of state.GAME_KEYS) state.setLevel(game, 0);
});

test("the groep 8 rewards need level 6 or 7 somewhere, whatever the coins", () => {
  freshPlayer();
  S.coins = 100000;
  for (const game of state.GAME_KEYS) state.setLevel(game, 5);
  assert.equal(rewards.lockReason("avatar_graduate"), "level");
  assert.equal(rewards.lockReason("avatar_rocket_legend"), "level");
  state.setLevel("spelling", 6);
  assert.equal(rewards.lockReason("avatar_graduate"), "coins");
  assert.equal(rewards.lockReason("sticker_diploma"), "coins");
  assert.equal(rewards.lockReason("avatar_rocket_legend"), "level", "legend items need level 7");
  state.setLevel("spelling", 7);
  assert.equal(rewards.lockReason("avatar_rocket_legend"), "coins");
  assert.equal(rewards.lockReason("gift_golden_book"), "coins");
  for (const game of state.GAME_KEYS) state.setLevel(game, 0);
});

test("badges: 'level 5' still means 5, groep 8 and legend mean 6 and 7, mastery counts levels", () => {
  freshPlayer();
  for (const game of state.GAME_KEYS) state.setLevel(game, 0);
  state.setLevel("getallen", 5);
  let earned = checkNewBadges().map(([id]) => id);
  assert.ok(earned.includes("level5"));
  assert.ok(!earned.includes("groep8"));
  state.setLevel("getallen", 6);
  earned = checkNewBadges().map(([id]) => id);
  assert.ok(earned.includes("groep8") && !earned.includes("legend"));
  state.setLevel("getallen", 7);
  assert.ok(checkNewBadges().map(([id]) => id).includes("legend"));

  // Ten mastered levels, earned the real way.
  state.setLevel("tafel", 0);
  for (let i = 0; i < 7; i++) levelUp("tafel");
  state.setLevel("bliksem", 0);
  for (let i = 0; i < 3; i++) levelUp("bliksem");
  assert.equal(state.masteredLevelCount(), 10);
  assert.ok(checkNewBadges().map(([id]) => id).includes("mastered10"));
  for (const game of state.GAME_KEYS) state.setLevel(game, 0);
});

test("every new badge has a name in both languages", () => {
  for (const id of ["groep8", "legend", "mastered10", "mastered40", "reader25", "words1000", "words5000", "arcade10", "bites5", "bites_all"]) {
    for (const lang of ["nl", "en"]) assert.ok(TRANSLATIONS[lang][`badges.${id}.name`], `${lang} ${id}`);
  }
});

test("the reading quest counts right answers in the reading games only, and only when they paid", () => {
  freshPlayer();
  const day = new Date(2026, 8, 25, 12);
  quests.recordQuestProgress({ gameKey: "lezen", isCorrect: true, pointsAwarded: 5 }, day);
  quests.recordQuestProgress({ gameKey: "spelling", isCorrect: true, pointsAwarded: 5 }, day);
  quests.recordQuestProgress({ gameKey: "tafel", isCorrect: true, pointsAwarded: 5 }, day);
  quests.recordQuestProgress({ gameKey: "woorden", isCorrect: false, pointsAwarded: 0 }, day);
  // A replay at a mastered level pays nothing: it must not count either.
  quests.recordQuestProgress({ gameKey: "woorden", isCorrect: true, pointsAwarded: 0 }, day);
  assert.equal(S.daily.read, 2);
});

test("the arcade games count towards the speed quest, and reading games can be the featured game", () => {
  assert.ok(quests.SPEED_GAMES.has("vlieg") && quests.SPEED_GAMES.has("sprong"));
  for (const game of ["lezen", "woorden", "spelling"]) assert.ok(quests.FEATURED_POOL.includes(game));
  assert.ok(quests.QUEST_MAP.read_6);
  for (const lang of ["nl", "en"]) assert.ok(TRANSLATIONS[lang]["quests.kind_read"]);
});

test("Getallenjacht's groep 8 rules hit exactly what their label says", async () => {
  const jacht = await import("../../web/js/games/jacht.js");
  const isPrime = (n) => {
    if (n < 2) return false;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
    return true;
  };
  for (const level of [6, 7]) {
    for (let i = 0; i < 400; i++) {
      const round = jacht.buildRound(level);
      for (const n of round.numbers) {
        const hit = round.targets.has(n);
        let expected;
        if (round.ruleId === "prime_between") expected = n >= 50 && n <= 99 && isPrime(n);
        else if (round.ruleId === "cube") expected = [1, 8, 27, 64, 125].includes(n);
        else if (round.ruleId === "factor_of") expected = Number(round.ruleLabel.match(/\d+/)[0]) % n === 0;
        else if (round.ruleId === "multiple_both") {
          const [a, b] = round.ruleLabel.match(/\d+/g).map(Number);
          expected = n % a === 0 && n % b === 0;
        } else if (round.ruleId === "multiple") expected = n % Number(round.ruleLabel.match(/\d+/)[0]) === 0;
        else if (round.ruleId === "square") expected = Number.isInteger(Math.sqrt(n));
        else throw new Error(`unexpected rule ${round.ruleId}`);
        assert.equal(hit, expected, `level ${level} "${round.ruleLabel}": ${n}`);
      }
    }
  }
});
