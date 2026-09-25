/**
 * Daily quests and the treasure chest - a reason to come back tomorrow.
 *
 * Every day brings three small quests, one from each slot below (a bit of
 * effort, a bit of skill, a bit of variety). Each finished quest pays bonus
 * coins on the spot; finishing all three unlocks that day's treasure chest,
 * which holds more coins plus one treasure from a collection that can never
 * be bought (rewards.js, category "treasure").
 *
 * Two rules keep this honest, and both are deliberate:
 *
 *   - Quests only move on answers that actually *paid* points. The
 *     level-replay guard (state.js canEarnAtLevel()) already stops a child
 *     farming coins on an already-cleared level; if quests counted those
 *     answers too, a replay could still complete a quest and pay out, which
 *     is the exact loophole rounds 15-16 closed. Practice at a cleared level
 *     still counts everywhere else (levels, badges, the play-day streak).
 *   - Quest and chest coins are a gift, not score: grantBonusCoins() moves
 *     the spendable balance only. totalScore - and the buddy that grows with
 *     it - stays "points earned by answering".
 *
 * The day's quests are a pure function of the date, so every profile on a
 * device sees the same three and a reload never re-rolls them.
 */
import { READING_GAMES, dayKey, freshDaily, grantBonusCoins, saveCurrentProfile, state } from "./state.js";
import { REWARD_DEFS, isUnlocked } from "./rewards.js";

// One quest is drawn from each slot per day. Targets are sized so an ordinary
// 15-20 minute session finishes all three without trying especially hard -
// the point is showing up and mixing it up, not grinding.
export const QUEST_SLOTS = [
  [
    { id: "correct_10", kind: "correct", target: 10, reward: 20 },
    { id: "correct_15", kind: "correct", target: 15, reward: 25 },
    { id: "points_80", kind: "points", target: 80, reward: 20 },
    { id: "points_150", kind: "points", target: 150, reward: 30 },
  ],
  [
    { id: "streak_5", kind: "streak", target: 5, reward: 25 },
    { id: "streak_8", kind: "streak", target: 8, reward: 35 },
    { id: "speed_40", kind: "speed", target: 40, reward: 25 },
  ],
  [
    { id: "games_3", kind: "games", target: 3, reward: 25 },
    { id: "games_4", kind: "games", target: 4, reward: 35 },
    { id: "featured_5", kind: "featured", target: 5, reward: 30 },
    // Round 18: a reading quest in the variety slot, so reading comes up
    // every few days even for a child who only ever opens the maths.
    { id: "read_6", kind: "read", target: 6, reward: 30 },
  ],
];

export const QUEST_MAP = Object.fromEntries(QUEST_SLOTS.flat().map((q) => [q.id, q]));

/** The timed and arcade games - the "speed" quest counts points earned in any of them. */
export const SPEED_GAMES = new Set(["bliksem", "jacht", "vlieg", "sprong"]);

/**
 * Games that can be "today's featured game": the ones where one correct
 * answer is one question. (Code Kraker pays once per cracked code and the
 * speed games once per tap or round, so "5 correct" would mean something
 * very different there.)
 */
export const FEATURED_POOL = [
  "tafel",
  "breuken",
  "meten",
  "procenten",
  "algebra",
  "meetkunde",
  "verhoudingen",
  "getallen",
  "logica",
  "lezen",
  "woorden",
  "spelling",
];

export const CHEST_COINS = 40;
/** Paid instead of a treasure once the whole treasure collection is found. */
export const CHEST_ALL_FOUND_COINS = 100;

/** A small, stable string hash (FNV-1a) - the day's "dice", no Math.random. */
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The three quests for a given day ("YYYY-MM-DD"). */
export function questsForDay(day) {
  return QUEST_SLOTS.map((slot, i) => slot[hash(`${day}#${i}`) % slot.length]);
}

/** The featured game for a given day. */
export function featuredGame(day) {
  return FEATURED_POOL[hash(`${day}#featured`) % FEATURED_POOL.length];
}

/** Roll today's progress over to a fresh record when the date has changed. */
function ensureToday(now) {
  const today = dayKey(now);
  if (state.daily.day !== today) state.daily = freshDaily(today);
  return today;
}

function progressFor(quest) {
  const daily = state.daily;
  switch (quest.kind) {
    case "correct":
      return daily.correct;
    case "points":
      return daily.points;
    case "streak":
      return daily.streak;
    case "speed":
      return daily.speed;
    case "featured":
      return daily.featured;
    case "games":
      return daily.games.length;
    case "read":
      return daily.read ?? 0;
    default:
      return 0;
  }
}

/**
 * Today's quests with their progress.
 * @returns {Array<{id, kind, target, reward, progress, done, game?}>}
 *   `game` is set on the featured-game quest.
 */
export function todaysQuests(now = new Date()) {
  const today = ensureToday(now);
  const featured = featuredGame(today);
  return questsForDay(today).map((quest) => ({
    ...quest,
    progress: Math.min(quest.target, progressFor(quest)),
    done: state.daily.completed.includes(quest.id),
    ...(quest.kind === "featured" ? { game: featured } : {}),
  }));
}

/**
 * Feed one settled answer into today's quests (called from settleAnswer()).
 * Pays each newly finished quest's bonus coins and returns those quests so
 * the caller can celebrate them.
 */
export function recordQuestProgress({ gameKey, isCorrect, pointsAwarded }, now = new Date()) {
  const today = ensureToday(now);
  if (!(pointsAwarded > 0)) return [];

  const daily = state.daily;
  daily.points += pointsAwarded;
  if (isCorrect) daily.correct += 1;
  if (isCorrect && gameKey === featuredGame(today)) daily.featured += 1;
  if (SPEED_GAMES.has(gameKey)) daily.speed += pointsAwarded;
  if (isCorrect && READING_GAMES.has(gameKey)) daily.read = (daily.read ?? 0) + 1;
  if (!daily.games.includes(gameKey)) daily.games.push(gameKey);
  // state.streaks only climbs on paying answers (addScore()), so the best of
  // it today is a fair "in a row" measure under the same rule.
  daily.streak = Math.max(daily.streak, state.streaks);

  const finished = [];
  for (const quest of questsForDay(today)) {
    if (daily.completed.includes(quest.id) || progressFor(quest) < quest.target) continue;
    daily.completed.push(quest.id);
    state.questsCompleted += 1;
    grantBonusCoins(quest.reward);
    finished.push(quest.kind === "featured" ? { ...quest, game: featuredGame(today) } : quest);
  }
  return finished;
}

/** All three of today's quests done, and the chest not opened yet. */
export function chestReady(now = new Date()) {
  const today = ensureToday(now);
  return !state.daily.chestOpened && questsForDay(today).every((q) => state.daily.completed.includes(q.id));
}

/** Whether today's chest has already been opened. */
export function chestOpenedToday(now = new Date()) {
  ensureToday(now);
  return state.daily.chestOpened;
}

/**
 * Open today's chest: bonus coins plus one treasure the child does not have
 * yet (every unfound treasure equally likely - no duplicates, ever). Once the
 * whole collection is found, a bigger coin prize takes the treasure's place.
 * @param {Function} [rng] returns [0, 1) - injectable so the tests can pin it.
 * @returns {{coins: number, treasureId: string|null}|null} null if not ready.
 */
export function openChest(rng = Math.random, now = new Date()) {
  if (!chestReady(now)) return null;
  state.daily.chestOpened = true;
  state.chestsOpened += 1;

  const unfound = REWARD_DEFS.filter((d) => d.chestOnly && !isUnlocked(d.id));
  let treasureId = null;
  let coins = CHEST_ALL_FOUND_COINS;
  if (unfound.length) {
    const pick = unfound[Math.min(unfound.length - 1, Math.floor(rng() * unfound.length))];
    treasureId = pick.id;
    state.unlockedRewards.add(treasureId);
    coins = CHEST_COINS;
  }
  grantBonusCoins(coins);
  saveCurrentProfile();
  return { coins, treasureId };
}
