/**
 * Session and player state - the port of utils/state.py and utils/profiles.py.
 *
 * The level/streak/badge rules are unchanged from the Streamlit app, so a
 * child's difficulty curve feels identical. What changed is where the data
 * lives: st.session_state (server memory) and logs/player_profiles.json
 * (server disk) become localStorage in the child's own browser.
 *
 * That is a real improvement, not just a port:
 *   - progress survives a reload, a redeploy, and being offline;
 *   - nothing about a child ever leaves their device, which is exactly what
 *     docs/PLATFORM_ROADMAP.md section 6 asks for.
 *
 * Every read and write is wrapped: Safari private mode throws on the first
 * localStorage access, and a maths game must not white-screen because of it.
 */
export const MIN_LEVEL = 0; // level 0 is the extra-gentle warm-up tier
export const MAX_LEVEL = 5;
export const LEVEL_UP_STREAK = 3; // correct answers in a row needed to level up
export const LEVEL_DOWN_STREAK = 2; // wrong answers in a row that drop a level
export const SESSION_GOAL_MINUTES = 45;
// Warm-up (0) and Easy (1) - the two tiers a child can answer almost without
// thinking. See canEarnAtLevel() for why they only pay reward points once.
export const EASY_LEVEL_MAX = 1;

export const GAME_KEYS = [
  "tafel",
  "breuken",
  "meten",
  "procenten",
  "algebra",
  "meetkunde",
  "verhoudingen",
  "getallen",
  // Speed and logic games share the same level/streak/badge machinery, so
  // they count towards "tried every game" like the rest.
  "bliksem",
  "logica",
  "code",
  "jacht",
];

const PROFILES_KEY = "kmg.profiles";
const CURRENT_KEY = "kmg.currentPlayer";
const PREFS_KEY = "kmg.prefs";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Storage full or blocked: the session keeps working in memory, it just
    // won't be there next time.
    return false;
  }
}

function freshLevels() {
  return Object.fromEntries(GAME_KEYS.map((k) => [k, MIN_LEVEL]));
}

function freshGameStreaks() {
  return Object.fromEntries(GAME_KEYS.map((k) => [k, { correct: 0, wrong: 0 }]));
}

function freshEasyLevelCleared() {
  return {};
}

function randomId() {
  return Math.random().toString(16).slice(2, 10);
}

const listeners = new Set();

/** Subscribe to any state change; returns an unsubscribe function. */
export function onStateChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitChange() {
  listeners.forEach((fn) => fn(state));
}

const prefs = readJson(PREFS_KEY, {});

export const state = {
  // Session-scoped: these start fresh every time the app is opened, exactly
  // as they did per browser session in Streamlit.
  sessionId: randomId(),
  sessionStart: Date.now(),
  streaks: 0,
  questionsAnswered: 0,
  correctAnswered: 0,
  gameStreaks: freshGameStreaks(),
  // Player-scoped: restored from the saved profile below.
  playerName: "",
  totalScore: 0,
  levels: freshLevels(),
  badges: [],
  // The reward shop's spendable balance - mirrors totalScore as it is earned,
  // but drops when spent, so totalScore stays a lifetime achievement number
  // while coins are what the shop actually charges. Never capped or reset:
  // every point a child earns stays spendable until they choose to spend it.
  coins: 0,
  unlockedRewards: new Set(),
  equippedAvatar: null,
  gamesTried: new Set(),
  // Which games have ever leveled up out of the easy tier (Warm-up/Easy) -
  // see canEarnAtLevel(). Once true for a game, correct answers back at an
  // easy level in that game are practice, not a fresh payout.
  easyLevelCleared: freshEasyLevelCleared(),
  // Device preference, not tied to a player.
  soundEnabled: prefs.soundEnabled !== false,
};

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

/** All saved profiles, keyed by player name ("" is the no-name-yet player). */
export function allProfiles() {
  return readJson(PROFILES_KEY, {});
}

export function profileNames() {
  return Object.keys(allProfiles())
    .filter((n) => n !== "")
    .sort((a, b) => a.localeCompare(b));
}

export function saveCurrentProfile() {
  const profiles = allProfiles();
  profiles[state.playerName] = {
    totalScore: state.totalScore,
    levels: { ...state.levels },
    badges: [...state.badges],
    coins: state.coins,
    unlockedRewards: [...state.unlockedRewards].sort(),
    equippedAvatar: state.equippedAvatar,
    gamesTried: [...state.gamesTried].sort(),
    easyLevelCleared: { ...state.easyLevelCleared },
    updatedAt: new Date().toISOString(),
  };
  writeJson(PROFILES_KEY, profiles);
  try {
    localStorage.setItem(CURRENT_KEY, state.playerName);
  } catch {
    /* see writeJson */
  }
}

/** Restore a saved profile into the live state. Returns true if one existed. */
export function applyProfile(name) {
  const profile = allProfiles()[name];
  state.playerName = name;
  if (!profile) {
    state.totalScore = 0;
    state.levels = freshLevels();
    state.badges = [];
    state.coins = 0;
    state.unlockedRewards = new Set();
    state.equippedAvatar = null;
    state.gamesTried = new Set();
    state.gameStreaks = freshGameStreaks();
    state.easyLevelCleared = freshEasyLevelCleared();
    emitChange();
    return false;
  }
  state.totalScore = profile.totalScore || 0;
  state.levels = Object.fromEntries(
    GAME_KEYS.map((k) => [k, profile.levels?.[k] ?? MIN_LEVEL]),
  );
  state.badges = profile.badges || [];
  state.coins = profile.coins || 0;
  state.unlockedRewards = new Set(profile.unlockedRewards || []);
  state.equippedAvatar = profile.equippedAvatar || null;
  state.gamesTried = new Set(profile.gamesTried || []);
  state.gameStreaks = freshGameStreaks();
  state.easyLevelCleared = { ...(profile.easyLevelCleared || {}) };
  emitChange();
  return true;
}

/** Called once at boot: pick up whoever was playing last on this device. */
export function restoreLastPlayer() {
  let name = "";
  try {
    name = localStorage.getItem(CURRENT_KEY) || "";
  } catch {
    /* see readJson */
  }
  return applyProfile(name);
}

export function setPlayerName(name) {
  const trimmed = (name || "").trim().slice(0, 40);
  if (trimmed === state.playerName) return false;
  // Keep whatever the previous player earned before switching over.
  saveCurrentProfile();
  const existed = applyProfile(trimmed);
  saveCurrentProfile();
  return existed;
}

export function setSoundEnabled(enabled) {
  state.soundEnabled = !!enabled;
  writeJson(PREFS_KEY, { ...readJson(PREFS_KEY, {}), soundEnabled: state.soundEnabled });
  emitChange();
}

// ---------------------------------------------------------------------------
// Scoring and adaptive difficulty (unchanged rules from utils/state.py)
// ---------------------------------------------------------------------------

export function addScore(points = 10) {
  state.totalScore += points;
  state.streaks += 1;
  // Coins are the reward-shop currency and totalScore is the lifetime
  // achievement number; they move together and neither is ever capped or
  // rolled back, so every point a child earns stays banked until they choose
  // to spend it - a big day of play should bring a child closer to what
  // they're saving for, never less close.
  state.coins += points;
  emitChange();
}

/**
 * Spend coins from the reward-shop balance. Returns false (and spends
 * nothing) if the balance is short, so a caller can just check the result
 * instead of comparing state.coins itself.
 */
export function spendCoins(amount) {
  if (!(amount > 0) || state.coins < amount) return false;
  state.coins -= amount;
  emitChange();
  return true;
}

export function resetStreak() {
  state.streaks = 0;
  emitChange();
}

export function getMaxLevel(gameKey = null) {
  if (gameKey === "tafel") return 6;
  return MAX_LEVEL;
}

export function getLevel(gameKey) {
  return state.levels[gameKey] ?? MIN_LEVEL;
}

/** The highest level the child has reached in any single game so far. */
export function highestLevelReached() {
  return Math.max(MIN_LEVEL, ...GAME_KEYS.map((k) => getLevel(k)));
}

/** True once every game - Tafel Monster's own level 6 included - is maxed. */
export function allGamesAtTrueMax() {
  return GAME_KEYS.every((k) => getLevel(k) >= getMaxLevel(k));
}

export function setLevel(gameKey, level) {
  const max = getMaxLevel(gameKey);
  const clamped = Math.max(MIN_LEVEL, Math.min(max, level));
  state.levels[gameKey] = clamped;
  // Starting fresh at the new level: the old streak counters described a
  // difficulty the child is no longer playing.
  state.gameStreaks[gameKey] = { correct: 0, wrong: 0 };
  emitChange();
  return clamped;
}

/**
 * Whether a correct answer at `level` in `gameKey` should still pay reward
 * points. The easy tier (Warm-up/Easy) pays out normally the first time a
 * child works through it - exactly enough to reach level 2 - but once
 * they've graduated out of it once (see graduateIfCrossedEasyTier() below),
 * coming back to an easy level again - a slip back down after wrong
 * answers, or picking it again on purpose - is practice, not a new payout.
 * Otherwise a child could sit on the easiest questions and earn coins
 * indefinitely instead of progressing. Levels above the easy tier are never
 * gated by this.
 */
export function canEarnAtLevel(gameKey, level) {
  if (level > EASY_LEVEL_MAX) return true;
  return !state.easyLevelCleared[gameKey];
}

/** The points actually payable for one correct answer, after that guard. */
export function awardablePoints(gameKey, level, points) {
  return canEarnAtLevel(gameKey, level) ? points : 0;
}

/**
 * Mark a game as having graduated out of the easy tier, if `fromLevel` was
 * inside it and `toLevel` is not. Called only from the *automatic* leveling
 * paths below and adaptAfterRound() in gameflow.js - i.e. only when the
 * child's own streak of correct answers earned the level-up - never from a
 * manual level-picker click. That distinction matters: browsing the level
 * picker up and back down again (or a parent/older sibling trying a harder
 * level for fun) must never cost a child their first honest, coin-earning
 * pass through Warm-up/Easy.
 */
export function graduateIfCrossedEasyTier(gameKey, fromLevel, toLevel) {
  if (fromLevel <= EASY_LEVEL_MAX && toLevel > EASY_LEVEL_MAX) {
    state.easyLevelCleared[gameKey] = true;
  }
}

/**
 * Update the counters after an answer and adapt the level: up after
 * LEVEL_UP_STREAK correct in a row, down after LEVEL_DOWN_STREAK wrong.
 * @returns {{leveledUp: boolean, leveledDown: boolean}}
 */
export function registerAttempt(gameKey, isCorrect) {
  state.questionsAnswered += 1;
  state.gamesTried.add(gameKey);
  const streak = (state.gameStreaks[gameKey] ??= { correct: 0, wrong: 0 });
  let leveledUp = false;
  let leveledDown = false;
  const currentLevel = getLevel(gameKey);
  const max = getMaxLevel(gameKey);

  if (isCorrect) {
    state.correctAnswered += 1;
    streak.correct += 1;
    streak.wrong = 0;
    if (streak.correct >= LEVEL_UP_STREAK && currentLevel < max) {
      setLevel(gameKey, currentLevel + 1);
      leveledUp = true;
      graduateIfCrossedEasyTier(gameKey, currentLevel, currentLevel + 1);
    }
  } else {
    streak.wrong += 1;
    streak.correct = 0;
    if (streak.wrong >= LEVEL_DOWN_STREAK && currentLevel > MIN_LEVEL) {
      setLevel(gameKey, currentLevel - 1);
      leveledDown = true;
    }
  }
  emitChange();
  return { leveledUp, leveledDown };
}

/** Count a question without touching the difficulty (used by timed rounds). */
export function countAttemptOnly(gameKey, isCorrect) {
  state.questionsAnswered += 1;
  state.gamesTried.add(gameKey);
  if (isCorrect) state.correctAnswered += 1;
  emitChange();
}

export function sessionElapsedMinutes() {
  return (Date.now() - state.sessionStart) / 60000;
}

export function sessionAccuracy() {
  if (!state.questionsAnswered) return 0;
  return (100 * state.correctAnswered) / state.questionsAnswered;
}

/** Wipe every profile on this device (parent dashboard "danger zone"). */
export function clearAllProfiles() {
  try {
    localStorage.removeItem(PROFILES_KEY);
    localStorage.removeItem(CURRENT_KEY);
  } catch {
    /* see writeJson */
  }
  state.totalScore = 0;
  state.levels = freshLevels();
  state.badges = [];
  state.coins = 0;
  state.unlockedRewards = new Set();
  state.equippedAvatar = null;
  state.gamesTried = new Set();
  state.gameStreaks = freshGameStreaks();
  state.easyLevelCleared = freshEasyLevelCleared();
  state.streaks = 0;
  state.questionsAnswered = 0;
  state.correctAnswered = 0;
  emitChange();
}
