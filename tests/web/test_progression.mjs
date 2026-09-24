/**
 * Round 17's longer-term rewards: the play-day streak, daily quests and the
 * treasure chest, the buddy, colour themes, chest-only treasures, the savings
 * goal and the new badges.
 *
 * The rule these tests guard hardest is the one that is easy to lose in a
 * refactor: nothing new may become a way round the level-replay guard
 * (state.js canEarnAtLevel()). An answer that paid no points must not move a
 * quest, so it can never complete one and pay bonus coins.
 *
 * Run with: npm test
 */
import test from "node:test";
import assert from "node:assert/strict";

const state = await import("../../web/js/state.js");
const rewards = await import("../../web/js/rewards.js");
const quests = await import("../../web/js/quests.js");
const buddy = await import("../../web/js/buddy.js");
const { checkNewBadges, BADGE_IDS } = await import("../../web/js/badges.js");
const { TRANSLATIONS } = await import("../../web/js/i18n.js");
const uiBits = await import("../../web/js/ui-bits.js");

const S = state.state;

/** A local-noon Date for "YYYY-MM-DD", so no timezone can tip it into another day. */
const at = (day) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

/** The first day from 2026-01-01 whose quests satisfy `pred`. */
function findDay(pred) {
  for (let i = 0; i < 800; i++) {
    const day = state.dayKey(new Date(2026, 0, 1 + i, 12));
    if (pred(quests.questsForDay(day), day)) return day;
  }
  throw new Error("no day in range matched");
}

function freshPlayer() {
  state.applyProfile(`__progression_${Math.random()}__`);
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

// ---------------------------------------------------------------------------
// Days and the play-day streak
// ---------------------------------------------------------------------------

test("dayKey is the local calendar day, and previousDayKey steps back across months, years and DST", () => {
  assert.equal(state.dayKey(at("2026-03-05")), "2026-03-05");
  assert.equal(state.previousDayKey("2026-03-01"), "2026-02-28");
  assert.equal(state.previousDayKey("2028-03-01"), "2028-02-29", "leap year");
  assert.equal(state.previousDayKey("2027-01-01"), "2026-12-31");
  // The last Sunday of March and October are 23h/25h days in Europe.
  assert.equal(state.previousDayKey("2026-03-30"), "2026-03-29");
  assert.equal(state.previousDayKey("2026-10-26"), "2026-10-25");
});

test("the play-day streak grows on consecutive days, ignores repeats, and restarts after a gap", () => {
  freshPlayer();
  assert.equal(state.touchPlayDay(at("2026-05-01")), true);
  assert.equal(S.playStreak.count, 1);
  assert.equal(state.touchPlayDay(at("2026-05-01")), false, "a second answer the same day changes nothing");
  state.touchPlayDay(at("2026-05-02"));
  state.touchPlayDay(at("2026-05-03"));
  assert.equal(S.playStreak.count, 3);
  assert.equal(state.currentPlayStreak(at("2026-05-04")), 3, "still alive the next day, before playing");
  assert.equal(state.currentPlayStreak(at("2026-05-05")), 0, "a whole missed day ends it");

  state.touchPlayDay(at("2026-05-06"));
  assert.equal(S.playStreak.count, 1, "restarts at 1 after a gap");
  assert.equal(S.playStreak.best, 3, "the record is kept");
});

// ---------------------------------------------------------------------------
// Bonus coins
// ---------------------------------------------------------------------------

test("bonus coins go to the spendable balance only, never to the score", () => {
  freshPlayer();
  state.addScore(30);
  state.grantBonusCoins(25);
  assert.equal(S.coins, 55);
  assert.equal(S.totalScore, 30, "score (and so the buddy) only grows from answers");
  state.grantBonusCoins(0);
  state.grantBonusCoins(-10);
  assert.equal(S.coins, 55, "zero or negative bonuses are ignored");
});

// ---------------------------------------------------------------------------
// Daily quests
// ---------------------------------------------------------------------------

test("each day has exactly one quest from each slot, the same on every call", () => {
  for (let i = 0; i < 60; i++) {
    const day = state.dayKey(new Date(2026, 0, 1 + i, 12));
    const today = quests.questsForDay(day);
    assert.equal(today.length, 3);
    today.forEach((quest, slot) => assert.ok(quests.QUEST_SLOTS[slot].includes(quest), `${day}: slot ${slot}`));
    assert.deepEqual(quests.questsForDay(day), today, "deterministic - a reload never re-rolls");
    assert.ok(quests.FEATURED_POOL.includes(quests.featuredGame(day)));
  }
  // And over a couple of months every quest in every slot actually comes up.
  const seen = new Set();
  for (let i = 0; i < 90; i++) quests.questsForDay(state.dayKey(new Date(2026, 0, 1 + i, 12))).forEach((q) => seen.add(q.id));
  assert.equal(seen.size, Object.keys(quests.QUEST_MAP).length, "no quest is unreachable");
});

test("an answer that paid no points never moves a quest - the level-replay guard has no side door", () => {
  freshPlayer();
  const day = findDay((qs) => qs[0].kind === "correct");
  const now = at(day);
  S.streaks = 50;
  for (let i = 0; i < 40; i++) {
    const done = quests.recordQuestProgress({ gameKey: "tafel", isCorrect: true, pointsAwarded: 0 }, now);
    assert.deepEqual(done, [], "a replay answer must never finish a quest");
  }
  const [effort] = quests.todaysQuests(now);
  assert.equal(effort.progress, 0);
  assert.equal(S.coins, 0, "and so never pays a quest bonus");
  assert.equal(S.daily.games.length, 0);
});

test("a quest completes once, pays its bonus once, and is remembered for the day", () => {
  freshPlayer();
  const day = findDay((qs) => qs[0].id === "correct_10");
  const now = at(day);
  let finished = [];
  for (let i = 0; i < 10; i++) {
    S.streaks = 1;
    finished = finished.concat(quests.recordQuestProgress({ gameKey: "tafel", isCorrect: true, pointsAwarded: 5 }, now));
  }
  assert.deepEqual(finished.map((q) => q.id), ["correct_10"]);
  assert.equal(S.coins, 20, "correct_10 pays 20 bonus coins");
  assert.equal(S.questsCompleted, 1);
  assert.equal(quests.recordQuestProgress({ gameKey: "tafel", isCorrect: true, pointsAwarded: 5 }, now).length, 0);
  assert.equal(S.coins, 20, "never paid twice");
  assert.equal(quests.todaysQuests(now)[0].done, true);
});

test("quest progress resets on a new day", () => {
  freshPlayer();
  const day = findDay((qs) => qs[0].kind === "points");
  quests.recordQuestProgress({ gameKey: "tafel", isCorrect: true, pointsAwarded: 30 }, at(day));
  assert.equal(S.daily.points, 30);
  const next = state.dayKey(new Date(at(day).getTime() + 36 * 3600 * 1000));
  quests.todaysQuests(at(next));
  assert.equal(S.daily.day, next);
  assert.equal(S.daily.points, 0);
  assert.deepEqual(S.daily.completed, []);
});

test("the featured-game quest only counts the featured game, and names it", () => {
  freshPlayer();
  const day = findDay((qs) => qs[2].id === "featured_5");
  const now = at(day);
  const featured = quests.featuredGame(day);
  const other = quests.FEATURED_POOL.find((g) => g !== featured);
  for (let i = 0; i < 6; i++) quests.recordQuestProgress({ gameKey: other, isCorrect: true, pointsAwarded: 5 }, now);
  const quest = quests.todaysQuests(now)[2];
  assert.equal(quest.game, featured);
  assert.equal(quest.progress, 0, `answers in ${other} must not count for ${featured}`);
  let done = [];
  for (let i = 0; i < 5; i++) done = done.concat(quests.recordQuestProgress({ gameKey: featured, isCorrect: true, pointsAwarded: 5 }, now));
  assert.ok(done.some((q) => q.id === "featured_5" && q.game === featured), "the finished quest carries its game for the toast");
});

test("the games, speed and streak quests measure what they say", () => {
  freshPlayer();
  const now = at(findDay(() => true));
  quests.recordQuestProgress({ gameKey: "tafel", isCorrect: true, pointsAwarded: 5 }, now);
  quests.recordQuestProgress({ gameKey: "tafel", isCorrect: true, pointsAwarded: 5 }, now);
  quests.recordQuestProgress({ gameKey: "breuken", isCorrect: true, pointsAwarded: 5 }, now);
  // A Getallenjacht round that was not cleared still paid for its hits.
  quests.recordQuestProgress({ gameKey: "jacht", isCorrect: false, pointsAwarded: 25 }, now);
  assert.deepEqual(S.daily.games, ["tafel", "breuken", "jacht"]);
  assert.equal(S.daily.speed, 25, "only the timed games count towards the speed quest");
  S.streaks = 7;
  quests.recordQuestProgress({ gameKey: "tafel", isCorrect: true, pointsAwarded: 5 }, now);
  S.streaks = 0;
  quests.recordQuestProgress({ gameKey: "tafel", isCorrect: true, pointsAwarded: 5 }, now);
  assert.equal(S.daily.streak, 7, "the best streak of the day is kept after it breaks");
});

// ---------------------------------------------------------------------------
// The treasure chest
// ---------------------------------------------------------------------------

/** Finish all three of `day`'s quests the honest way. */
function finishAllQuests(now) {
  for (let i = 0; i < 40; i++) {
    S.streaks = i + 1;
    const gameKey = quests.FEATURED_POOL[i % quests.FEATURED_POOL.length];
    quests.recordQuestProgress({ gameKey, isCorrect: true, pointsAwarded: 10 }, now);
    quests.recordQuestProgress({ gameKey: quests.featuredGame(state.dayKey(now)), isCorrect: true, pointsAwarded: 10 }, now);
    quests.recordQuestProgress({ gameKey: "bliksem", isCorrect: true, pointsAwarded: 10 }, now);
  }
  assert.ok(quests.todaysQuests(now).every((q) => q.done), "helper should finish every quest");
}

test("the chest stays shut until all three quests are done, and opens once a day", () => {
  freshPlayer();
  const now = at("2026-06-10");
  assert.equal(quests.chestReady(now), false);
  assert.equal(quests.openChest(() => 0, now), null);
  finishAllQuests(now);
  assert.equal(quests.chestReady(now), true);
  const coinsBefore = S.coins;
  const result = quests.openChest(() => 0, now);
  assert.ok(result?.treasureId, "a first chest always holds a treasure");
  assert.equal(result.coins, quests.CHEST_COINS);
  assert.equal(S.coins, coinsBefore + quests.CHEST_COINS);
  assert.equal(rewards.isUnlocked(result.treasureId), true);
  assert.equal(S.chestsOpened, 1);
  assert.equal(quests.openChest(() => 0, now), null, "one chest per day");
  assert.equal(quests.chestOpenedToday(now), true);
});

test("chests never hand out a duplicate, and pay extra coins once every treasure is found", () => {
  freshPlayer();
  const treasures = rewards.REWARD_DEFS.filter((d) => d.chestOnly).map((d) => d.id);
  const found = [];
  for (let i = 0; i < treasures.length; i++) {
    const now = at(state.dayKey(new Date(2026, 6, 1 + i, 12)));
    finishAllQuests(now);
    // rng pinned to the very end of the range - the edge a naive floor() gets wrong.
    const result = quests.openChest(() => 0.999999, now);
    found.push(result.treasureId);
  }
  assert.equal(new Set(found).size, treasures.length, "every treasure exactly once");
  const now = at("2026-12-01");
  finishAllQuests(now);
  const coinsBefore = S.coins;
  const last = quests.openChest(() => 0.5, now);
  assert.equal(last.treasureId, null);
  assert.equal(last.coins, quests.CHEST_ALL_FOUND_COINS);
  assert.equal(S.coins, coinsBefore + quests.CHEST_ALL_FOUND_COINS);
});

// ---------------------------------------------------------------------------
// Treasures, themes and the savings goal in the shop
// ---------------------------------------------------------------------------

test("a treasure can never be bought, whatever the coins and levels", () => {
  freshPlayer();
  for (const k of state.GAME_KEYS) state.setLevel(k, state.getMaxLevel(k));
  S.coins = 1e9;
  for (const def of rewards.REWARD_DEFS.filter((d) => d.chestOnly)) {
    assert.equal(def.cost, null, `${def.id} must have no price`);
    assert.equal(rewards.isUnlocked(def.id), false);
    assert.equal(rewards.lockReason(def.id), "chest");
    assert.equal(rewards.canUnlock(def.id), false);
    assert.equal(rewards.unlockReward(def.id), false);
    assert.equal(rewards.canBeGoal(def.id), false, "cannot save up for something that is not for sale");
  }
  assert.equal(S.coins, 1e9, "nothing was spent");
  for (const k of state.GAME_KEYS) state.setLevel(k, 0);
});

test("themes: classic is free and default, a bought theme is equipped at once and can be switched back", () => {
  freshPlayer();
  assert.equal(rewards.isUnlocked("theme_classic"), true);
  assert.equal(rewards.equippedThemeId(), "theme_classic");
  S.coins = 1000;
  assert.equal(rewards.unlockReward("theme_ocean"), true);
  assert.equal(rewards.equippedThemeId(), "theme_ocean", "buying a theme puts it on straight away");
  assert.equal(rewards.isEquipped("theme_ocean"), true);
  assert.equal(rewards.equipReward("theme_classic"), true);
  assert.equal(rewards.equippedThemeId(), "theme_classic");
  // Equipping a theme must never touch the equipped character, or vice versa.
  assert.equal(rewards.unlockReward("avatar_cat"), true);
  assert.equal(rewards.equippedThemeId(), "theme_classic");
  assert.equal(rewards.equippedAvatarId(), "avatar_cat");
  assert.equal(rewards.equipReward("sticker_star"), false, "stickers are not equippable");
  // A stale id (e.g. a removed or never-unlocked theme) falls back safely.
  S.equippedTheme = "theme_gold";
  assert.equal(rewards.equippedThemeId(), "theme_classic");
});

test("every theme has a stylesheet block, a swatch and a unique theme name", async () => {
  const { readFile } = await import("node:fs/promises");
  const css = await readFile(new URL("../../web/css/app.css", import.meta.url), "utf8");
  const themes = rewards.REWARD_DEFS.filter((d) => d.category === "theme");
  assert.equal(new Set(themes.map((d) => d.theme)).size, themes.length);
  for (const def of themes) {
    assert.ok(Array.isArray(def.swatch) && def.swatch.length >= 2, `${def.id}: swatch`);
    if (def.theme === "classic") continue;
    assert.ok(css.includes(`:root[data-theme="${def.theme}"]`), `${def.id}: no [data-theme="${def.theme}"] block in app.css`);
  }
});

test("the savings goal: toggles, reports progress, fires 'ready' once, and clears when bought", () => {
  freshPlayer();
  S.coins = 30;
  assert.equal(rewards.goalInfo(), null);
  assert.equal(rewards.toggleGoal("avatar_panda"), "avatar_panda");
  let info = rewards.goalInfo();
  assert.equal(info.def.id, "avatar_panda");
  assert.equal(info.pct, 25);
  assert.equal(info.remaining, 90);
  assert.equal(info.ready, false);
  assert.equal(rewards.goalJustBecameReady(), false);

  S.coins = 120;
  assert.equal(rewards.goalJustBecameReady(), true, "the moment saving pays off");
  assert.equal(rewards.goalJustBecameReady(), false, "and only once");

  assert.equal(rewards.unlockReward("avatar_panda"), true);
  assert.equal(S.goalReward, null, "buying the goal clears it");
  assert.equal(rewards.goalInfo(), null);

  assert.equal(rewards.toggleGoal("avatar_lion"), "avatar_lion");
  assert.equal(rewards.toggleGoal("avatar_lion"), null, "tapping 🎯 again unpins it");
  assert.equal(rewards.toggleGoal("avatar_panda"), null, "an already-owned item cannot be a goal");
});

test("a level-gated goal says so instead of pretending coins are the problem", () => {
  freshPlayer();
  for (const k of state.GAME_KEYS) state.setLevel(k, 0);
  S.coins = 5000;
  rewards.toggleGoal("avatar_unicorn");
  const info = rewards.goalInfo();
  assert.equal(info.ready, false);
  assert.equal(info.reason, "level");
});

// ---------------------------------------------------------------------------
// The buddy
// ---------------------------------------------------------------------------

test("buddy stages rise with the score, and report progress to the next one", () => {
  const stages = buddy.BUDDY_STAGES;
  for (let i = 1; i < stages.length; i++) assert.ok(stages[i].min > stages[i - 1].min, "thresholds must rise");
  assert.equal(buddy.buddyStageIndex(0), 0);
  assert.equal(buddy.buddyStageIndex(stages[1].min - 1), 0);
  assert.equal(buddy.buddyStageIndex(stages[1].min), 1);
  assert.equal(buddy.buddyStageIndex(1e9), stages.length - 1);

  const mid = buddy.buddyInfo(stages[1].min + (stages[2].min - stages[1].min) / 2);
  assert.equal(mid.index, 1);
  assert.equal(mid.pct, 50);
  assert.equal(mid.toNext, (stages[2].min - stages[1].min) / 2);
  const top = buddy.buddyInfo(1e9);
  assert.equal(top.next, null);
  assert.equal(top.pct, 100);
});

test("the buddy's growth is announced exactly once per stage", () => {
  freshPlayer();
  assert.equal(buddy.checkBuddyGrowth(), null, "a new egg is not news");
  state.addScore(buddy.BUDDY_STAGES[1].min);
  const grown = buddy.checkBuddyGrowth();
  assert.equal(grown?.key, buddy.BUDDY_STAGES[1].key);
  assert.equal(buddy.checkBuddyGrowth(), null, "not announced twice");
  // Jumping two stages at once announces the stage reached, once.
  state.addScore(buddy.BUDDY_STAGES[3].min);
  assert.equal(buddy.checkBuddyGrowth()?.key, buddy.BUDDY_STAGES[3].key);
  assert.equal(buddy.checkBuddyGrowth(), null);
});

// ---------------------------------------------------------------------------
// Persistence: new fields round-trip, and old profiles still load
// ---------------------------------------------------------------------------

test("streak, quests, chest count, goal, theme and buddy stage all survive a reload", () => {
  withStorage(() => {
    state.applyProfile("__round17_reload__");
    S.coins = 500;
    rewards.unlockReward("theme_forest");
    rewards.toggleGoal("avatar_lion");
    state.touchPlayDay(at("2026-04-01"));
    state.touchPlayDay(at("2026-04-02"));
    const now = at("2026-04-02");
    finishAllQuests(now);
    quests.openChest(() => 0, now);
    S.totalScore = buddy.BUDDY_STAGES[2].min;
    buddy.checkBuddyGrowth();
    const snapshot = {
      daily: structuredClone(S.daily),
      playStreak: { ...S.playStreak },
      questsCompleted: S.questsCompleted,
      chestsOpened: S.chestsOpened,
      unlocked: [...S.unlockedRewards].sort(),
    };
    state.saveCurrentProfile();

    state.applyProfile("__someone_else__");
    assert.equal(S.chestsOpened, 0, "another player starts clean");
    assert.equal(S.equippedTheme, null);

    state.applyProfile("__round17_reload__");
    assert.deepEqual(S.daily, snapshot.daily);
    assert.deepEqual(S.playStreak, snapshot.playStreak);
    assert.equal(S.questsCompleted, snapshot.questsCompleted);
    assert.equal(S.chestsOpened, snapshot.chestsOpened);
    assert.deepEqual([...S.unlockedRewards].sort(), snapshot.unlocked);
    assert.equal(rewards.equippedThemeId(), "theme_forest");
    assert.equal(S.goalReward, "avatar_lion");
    assert.equal(S.buddySeenStage, 2);
    assert.equal(quests.chestOpenedToday(now), true, "reloading must not re-arm today's chest");
  });
});

test("a profile saved before round 17 loads with sensible defaults and no surprise buddy announcement", () => {
  withStorage((store) => {
    store.set(
      "kmg.profiles",
      JSON.stringify({ Old: { totalScore: 2000, levels: { tafel: 3 }, badges: ["q10"], coins: 90, unlockedRewards: ["avatar_cat"], gamesTried: ["tafel"] } }),
    );
    state.applyProfile("Old");
    assert.equal(S.coins, 90);
    assert.deepEqual(S.playStreak, { last: null, count: 0, best: 0 });
    assert.equal(S.daily.games.length, 0);
    assert.equal(S.questsCompleted, 0);
    assert.equal(S.goalReward, null);
    assert.equal(rewards.equippedThemeId(), "theme_classic");
    assert.equal(S.buddySeenStage, buddy.buddyStageIndex(2000), "synced silently to the stage already earned");
    assert.equal(buddy.checkBuddyGrowth(), null, "points banked before the buddy existed are not news");
  });
});

test("clearing all profiles resets every round-17 field too", () => {
  withStorage(() => {
    state.applyProfile("__to_clear__");
    S.questsCompleted = 5;
    S.chestsOpened = 2;
    S.goalReward = "avatar_lion";
    S.equippedTheme = "theme_ocean";
    S.playStreak = { last: "2026-01-01", count: 4, best: 4 };
    state.clearAllProfiles();
    assert.equal(S.questsCompleted, 0);
    assert.equal(S.chestsOpened, 0);
    assert.equal(S.goalReward, null);
    assert.equal(S.equippedTheme, null);
    assert.deepEqual(S.playStreak, { last: null, count: 0, best: 0 });
  });
});

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

test("the new badges are earned by what they describe", () => {
  freshPlayer();
  S.badges = [];
  assert.ok(!checkNewBadges().some(([id]) => ["days3", "chest1", "collector10", "score1000", "quest1"].includes(id)));

  S.playStreak = { last: "2026-01-03", count: 1, best: 3 };
  S.chestsOpened = 1;
  S.questsCompleted = 1;
  S.totalScore = 1000;
  S.unlockedRewards = new Set(rewards.REWARD_DEFS.filter((d) => d.cost).slice(0, 10).map((d) => d.id));
  const earned = checkNewBadges().map(([id]) => id);
  for (const id of ["days3", "chest1", "quest1", "score1000", "collector10"]) {
    assert.ok(earned.includes(id), `${id} should be earned`);
  }
  assert.ok(!earned.includes("days7") && !earned.includes("collector30") && !earned.includes("score5000"));
  assert.ok(earned.includes("buddy_dragon") === false, "1000 points is not yet a dragon");
});

test("every badge id is unique and has a name in both languages", () => {
  assert.equal(new Set(BADGE_IDS).size, BADGE_IDS.length);
  for (const id of BADGE_IDS) {
    for (const lang of ["nl", "en"]) assert.ok(TRANSLATIONS[lang][`badges.${id}.name`], `${lang}: badges.${id}.name`);
  }
});

// ---------------------------------------------------------------------------
// Copy that the new features look up by constructed key
// ---------------------------------------------------------------------------

test("every quest kind, buddy stage/line and praise line has copy in both languages", () => {
  const keys = [
    ...new Set(Object.values(quests.QUEST_MAP).map((q) => `quests.kind_${q.kind}`)),
    ...buddy.BUDDY_STAGES.map((s) => s.key),
    ...Array.from({ length: 8 }, (_, i) => `buddy.say_${i + 1}`),
    ...Array.from({ length: uiBits.PRAISE_COUNT }, (_, i) => `praise.${i + 1}`),
  ];
  for (const lang of ["nl", "en"]) {
    for (const key of keys) assert.ok(TRANSLATIONS[lang][key], `${lang}: missing ${key}`);
    assert.equal(TRANSLATIONS[lang][`praise.${uiBits.PRAISE_COUNT + 1}`], undefined, "PRAISE_COUNT matches the table");
  }
});

test("randomPraise only ever returns a real line, and the feedback link is a mailto to the right address", () => {
  for (const r of [0, 0.5, 0.999999]) {
    const line = uiBits.randomPraise(() => r);
    assert.ok(line && !line.startsWith("praise."), `rng ${r} gave "${line}"`);
  }
  const href = uiBits.feedbackHref("home");
  assert.ok(href.startsWith("mailto:nxtrung87@gmail.com?subject="), href);
  assert.ok(href.includes("&body="));
  assert.ok(!/[\s<>"]/.test(href), "subject and body are URL-encoded");
});
