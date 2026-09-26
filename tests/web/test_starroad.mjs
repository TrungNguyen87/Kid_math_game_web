/**
 * Round 19: the star road - stars for mastering levels, more for higher
 * ones, and a road of rewards claimed with a tap - plus the levelling rule
 * the puzzle and strategy games share (gameflow.js adaptAfterGame()) and the
 * one-off feats their badges read.
 *
 * The rule guarded hardest is the one the request is about: finishing an
 * easy level must not become something to farm. Stars are counted from the
 * set of mastered levels, so replaying, sliding down and climbing back up,
 * or picking a level by hand, can never add a star; and a tier on the road
 * pays exactly once.
 *
 * Run with: npm test
 */
import test from "node:test";
import assert from "node:assert/strict";

const state = await import("../../web/js/state.js");
const road = await import("../../web/js/starroad.js");
const rewards = await import("../../web/js/rewards.js");
const gameflow = await import("../../web/js/gameflow.js");
const quests = await import("../../web/js/quests.js");
const { checkNewBadges } = await import("../../web/js/badges.js");
const { TRANSLATIONS } = await import("../../web/js/i18n.js");

const S = state.state;

function freshPlayer() {
  state.applyProfile(`__road_${Math.random()}__`);
  S.streaks = 0;
}

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

/**
 * adaptAfterRound() celebrates on screen (a toast, the level-up card). Give
 * it an inert page to do that on - with "reduce motion" on, so no confetti
 * canvas is needed - and take it away again afterwards.
 */
function withInertPage(fn) {
  const node = () => ({
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {},
    appendChild(child) {
      return child;
    },
    remove() {},
    querySelector: () => node(),
    set innerHTML(_) {},
  });
  const saved = { document: globalThis.document, window: globalThis.window };
  globalThis.document = { createElement: node, getElementById: () => null, body: node() };
  globalThis.window = { innerWidth: 800, innerHeight: 600, matchMedia: () => ({ matches: true }) };
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
}

function levelUp(game) {
  for (let i = 0; i < state.LEVEL_UP_STREAK; i++) state.registerAttempt(game, true);
}
function levelDown(game) {
  for (let i = 0; i < state.LEVEL_DOWN_STREAK; i++) state.registerAttempt(game, false);
}

// ---------------------------------------------------------------------------
// Stars
// ---------------------------------------------------------------------------

test("a level is worth more stars the higher it is: 1, 1, 2, 2, 3, 3, 4", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(road.starsForLevel), [1, 1, 2, 2, 3, 3, 4]);
  assert.equal(road.maxStarsPerGame(), 16, "levels 0-6 of one game; the top level 7 is never 'mastered'");
});

test("mastering a level adds its stars once; replaying, sliding down and climbing back add nothing", () => {
  freshPlayer();
  assert.equal(road.totalStars(), 0);
  levelUp("tafel"); // masters 0
  levelUp("tafel"); // masters 1
  levelUp("tafel"); // masters 2
  assert.equal(road.totalStars(), 1 + 1 + 2);
  // Slide down to 1 and climb back through 1 and 2: the same levels again.
  levelDown("tafel");
  levelUp("tafel");
  levelUp("tafel");
  assert.equal(state.getLevel("tafel"), 4, "climbed to level 3, then mastered 3 too");
  assert.equal(road.totalStars(), 1 + 1 + 2 + 2, "only level 3 was new");
  // Picking a level by hand is never mastering it.
  state.setLevel("breuken", 6);
  state.setLevel("breuken", 0);
  assert.equal(road.totalStars(), 6);
  // And playing an already-mastered level, right or wrong, changes nothing.
  state.setLevel("tafel", 0);
  for (let i = 0; i < 10; i++) state.registerAttempt("tafel", i % 3 !== 0);
  assert.equal(road.starsPerGame().find((row) => row.game === "tafel").stars, 6);
});

test("higher levels move you along the road faster than the easy ones", () => {
  // Mastering levels 0-1 in four games (easy) versus level 4-5 in one game.
  assert.ok(road.starsForLevel(4) + road.starsForLevel(5) > road.starsForLevel(0) + road.starsForLevel(1) + road.starsForLevel(0));
  freshPlayer();
  for (const game of ["tafel", "breuken"]) {
    levelUp(game);
    levelUp(game);
  }
  const easy = road.totalStars();
  freshPlayer();
  state.setLevel("meten", 4);
  levelUp("meten");
  levelUp("meten");
  assert.ok(road.totalStars() >= easy + 2, `two groep 7 levels (${road.totalStars()}) beat four warm-up levels (${easy})`);
});

// ---------------------------------------------------------------------------
// The road
// ---------------------------------------------------------------------------

test("the road's tiers climb, and every star-road reward sits on exactly one tier with the same star count", () => {
  const stars = road.STAR_TIERS.map((tier) => tier.stars);
  for (let i = 1; i < stars.length; i++) assert.ok(stars[i] > stars[i - 1]);
  assert.ok(stars[0] <= 2, "the first reward comes after mastering one or two levels");
  const reachable = state.GAME_KEYS.length * road.maxStarsPerGame();
  assert.ok(stars[stars.length - 1] <= reachable, "the end of the road can be reached");
  const onRoad = road.STAR_TIERS.filter((tier) => tier.reward).map((tier) => tier.reward);
  const starItems = rewards.REWARD_DEFS.filter((def) => def.starRoad != null);
  assert.deepEqual([...onRoad].sort(), starItems.map((def) => def.id).sort());
  for (const tier of road.STAR_TIERS) {
    assert.ok(!!tier.coins !== !!tier.reward, "a tier is coins or a reward");
    if (tier.reward) assert.equal(rewards.REWARD_MAP[tier.reward].starRoad, tier.stars, tier.reward);
  }
  for (const def of starItems) {
    assert.equal(def.tier, "star");
    assert.equal(def.cost, null);
    for (const lang of ["nl", "en"]) assert.ok(TRANSLATIONS[lang][def.nameKey], `${lang} ${def.nameKey}`);
  }
});

test("a star-road reward cannot be bought or saved up for, whatever the coins", () => {
  freshPlayer();
  S.coins = 1e9;
  for (const game of state.GAME_KEYS) state.setLevel(game, 7);
  for (const def of rewards.REWARD_DEFS.filter((d) => d.starRoad != null)) {
    assert.equal(rewards.lockReason(def.id), "stars");
    assert.equal(rewards.canUnlock(def.id), false);
    assert.equal(rewards.canAfford(def.id), false);
    assert.equal(rewards.canBeGoal(def.id), false);
    assert.equal(rewards.unlockReward(def.id), false);
  }
  assert.equal(S.coins, 1e9);
  for (const game of state.GAME_KEYS) state.setLevel(game, 0);
});

test("a tier is claimed once, only when reached, and pays coins as a gift (never score) or unlocks its reward", () => {
  freshPlayer();
  const [coinTier, rewardTier] = road.STAR_TIERS;
  assert.equal(road.claimTier(coinTier.stars), null, "not reached yet");
  levelUp("tafel");
  levelUp("tafel"); // 2 stars
  assert.equal(road.claimableCount(), 1);
  const score = S.totalScore;
  const coins = S.coins;
  const result = road.claimTier(coinTier.stars);
  assert.deepEqual(result, { coins: coinTier.coins, rewardId: null });
  assert.equal(S.coins, coins + coinTier.coins);
  assert.equal(S.totalScore, score, "a gift, not score");
  assert.equal(road.claimTier(coinTier.stars), null, "and only once");
  assert.equal(S.coins, coins + coinTier.coins);
  assert.equal(road.claimTier(rewardTier.stars), null, "the next tier is not reached");
  levelUp("tafel"); // +2 = 4 stars
  assert.equal(road.claimTier(rewardTier.stars).rewardId, rewardTier.reward);
  assert.equal(rewards.isUnlocked(rewardTier.reward), true);
  assert.equal(road.claimTier(999), null, "no such tier");
  assert.deepEqual(road.tierStates().slice(0, 3).map((t) => t.status), ["claimed", "claimed", "locked"]);
});

test("claimed tiers survive a reload; an older profile finds its earned tiers waiting to be claimed", () => {
  withStorage(() => {
    state.applyProfile("RoadKid");
    for (let i = 0; i < 3; i++) levelUp("tafel"); // 1 + 1 + 2 = 4 stars
    road.claimTier(2);
    state.saveCurrentProfile();
    state.applyProfile("Other");
    assert.deepEqual(S.passClaimed, []);
    state.applyProfile("RoadKid");
    assert.deepEqual(S.passClaimed, [2]);
    assert.equal(road.totalStars(), 4);
    assert.equal(road.claimableCount(), 1, "the 4-star tier is still waiting");

    // A profile saved before round 19: cleared levels but no road yet.
    localStorage.setItem(
      "kmg.profiles",
      JSON.stringify({ Veteran: { totalScore: 900, clearedLevels: { tafel: [0, 1, 2, 3], breuken: [0, 1, 2, 3, 4, 5] } } }),
    );
    state.applyProfile("Veteran");
    assert.equal(road.totalStars(), 6 + 12);
    assert.deepEqual(S.passClaimed, []);
    assert.equal(road.claimableCount(), road.STAR_TIERS.filter((t) => t.stars <= 18).length);
  });
});

test("where the next stars are: the most valuable level first, and a game on a mastered level points one up", () => {
  freshPlayer();
  state.setLevel("meten", 5);
  state.setLevel("breuken", 2);
  levelUp("tafel");
  levelUp("tafel");
  state.setLevel("tafel", 0); // back on a mastered level
  state.setLevel("spelling", 7); // the top: nothing left to master there
  const sources = road.nextStarSources(30);
  assert.equal(sources[0].game, "meten");
  assert.equal(sources[0].stars, 3);
  for (let i = 1; i < sources.length; i++) assert.ok(sources[i].stars <= sources[i - 1].stars);
  const tafel = sources.find((s) => s.game === "tafel");
  assert.deepEqual([tafel.level, tafel.moveUp], [2, true]);
  assert.ok(!sources.some((s) => s.game === "spelling"));
  assert.equal(road.nextStarSources().length, 4);
});

// ---------------------------------------------------------------------------
// adaptAfterGame: the puzzle and strategy games
// ---------------------------------------------------------------------------

test("adaptAfterGame: a win levels up and masters the level; a draw stays; one loss stays; two losses in a row step down", () => withInertPage(() => {
  freshPlayer();
  const game = "tactiek";
  state.setLevel(game, 3);
  assert.equal(gameflow.adaptAfterGame(game, "draw").leveledUp, false);
  assert.equal(state.getLevel(game), 3);
  assert.equal(gameflow.adaptAfterGame(game, "loss").leveledDown, false, "one close loss is still a good game");
  assert.equal(state.getLevel(game), 3);
  assert.equal(gameflow.adaptAfterGame(game, "loss").leveledDown, true);
  assert.equal(state.getLevel(game), 2);
  // A loss, then a win, then a loss: never two in a row.
  gameflow.adaptAfterGame(game, "loss");
  const win = gameflow.adaptAfterGame(game, "win");
  assert.equal(win.leveledUp, true);
  assert.equal(state.isLevelCleared(game, 2), true, "a win masters the level");
  assert.ok(win.masteryBonus > 0);
  assert.equal(gameflow.adaptAfterGame(game, "loss").leveledDown, false);
  assert.equal(state.getLevel(game), 3);
}));

test("adaptAfterGame: losses at different levels do not add up", () => withInertPage(() => {
  freshPlayer();
  const game = "doku";
  state.setLevel(game, 4);
  gameflow.adaptAfterGame(game, "loss");
  state.setLevel(game, 5); // picked a harder puzzle
  assert.equal(gameflow.adaptAfterGame(game, "loss").leveledDown, false, "the first loss at level 5");
  assert.equal(state.getLevel(game), 5);
}));

// ---------------------------------------------------------------------------
// Feats, badges, quests
// ---------------------------------------------------------------------------

test("a feat is recorded once, and each new game's badge follows its feat", () => {
  freshPlayer();
  assert.equal(state.recordFeat("toren_top"), true);
  assert.equal(state.recordFeat("toren_top"), false);
  state.recordFeat("kart_first");
  state.recordFeat("doku_big");
  state.recordFeat("tactiek_win_hard");
  state.recordFeat("park_6");
  const newly = checkNewBadges().map(([id]) => id);
  for (const id of ["toren_top", "kart_first", "doku_big", "tactiek_win", "park_6"]) assert.ok(newly.includes(id), id);
  assert.ok(!newly.includes("park_all"));
  for (const lang of ["nl", "en"]) {
    for (const id of ["stars25", "stars100", "toren_top", "kart_first", "doku_big", "tactiek_win", "park_6", "park_all"]) {
      assert.ok(TRANSLATIONS[lang][`badges.${id}.name`], `${lang} ${id}`);
    }
  }
});

test("the star badges count stars, not levels played", () => {
  freshPlayer();
  S.clearedLevels = { tafel: new Set([0, 1, 2, 3, 4, 5, 6]), breuken: new Set([0, 1, 2, 3, 4]) };
  assert.equal(road.totalStars(), 16 + 9);
  assert.ok(checkNewBadges().some(([id]) => id === "stars25"));
});

test("the new arcade games count for the speed quest, and a park visitor can be today's featured question", () => {
  assert.ok(quests.SPEED_GAMES.has("toren") && quests.SPEED_GAMES.has("kart"));
  assert.ok(quests.FEATURED_POOL.includes("park"));
  for (const game of quests.FEATURED_POOL) assert.ok(state.GAME_KEYS.includes(game), game);
});

test("the nudge and the climb invitation name the stars in both languages", () => {
  for (const lang of ["nl", "en"]) {
    assert.match(TRANSLATIONS[lang]["mastery.nudge_bonus"], /\{stars\}/);
    assert.match(TRANSLATIONS[lang]["climb.text"], /\{next\}.*\{stars\}/s);
  }
});
