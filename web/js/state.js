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
// Levels 0-5 are the groep 6/7 curve every game has always had; 6 and 7
// (round 18) are groep 8 - "Kampioen" and "Legende". Every game, Tafel
// Monster included, now runs 0-7.
export const MAX_LEVEL = 7;
/**
 * The old top level. Things that were promised at "level 5" before groep 8
 * existed - the mythic rewards, the "level 5" and Reken Meester badges - stay
 * at 5, so raising the ceiling never moved a goal a child was already
 * working towards.
 */
export const MASTER_LEVEL = 5;
/** The first groep 8 level. */
export const GROEP8_LEVEL = 6;
export const LEVEL_UP_STREAK = 3; // correct answers in a row needed to level up
export const LEVEL_DOWN_STREAK = 2; // wrong answers in a row that drop a level
export const SESSION_GOAL_MINUTES = 45;

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
  // Reading and language (round 18).
  "lezen",
  "woorden",
  "spelling",
  // Arcade games (round 18): the questions come from the maths or the word
  // games, the gameplay is a flying/jumping game.
  "vlieg",
  "sprong",
  "toren",
  "kart",
  // Puzzles and strategy (round 19): a logic puzzle, a board game against
  // the computer, and a theme park to build.
  "doku",
  "tactiek",
  "park",
];

/** The reading and language games - they feed the reading counters and quest. */
export const READING_GAMES = new Set(["lezen", "woorden", "spelling"]);
/** The arcade games - one run is a round, like the timed games. */
export const ARCADE_GAMES = new Set(["vlieg", "sprong", "toren", "kart"]);
/** The puzzle and strategy games (round 19) - one puzzle, match or day is a round. */
export const PUZZLE_GAMES = new Set(["doku", "tactiek", "park"]);

/**
 * Bonus coins for mastering a level for the first time - see clearLevel().
 * Higher levels pay more, so the bonus itself says "keep climbing".
 */
export function masteryBonus(level) {
  return 10 + 5 * level;
}

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

function freshClearedLevels() {
  return {};
}

/**
 * The child's own calendar day, "YYYY-MM-DD" in *local* time. Daily quests
 * and the play-day streak roll over at the child's midnight - a UTC day
 * would flip at 01:00 or 02:00 in the Netherlands, in the middle of a late
 * homework session.
 */
export function dayKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The day before `day` ("YYYY-MM-DD"), done in calendar terms so DST can't skip one. */
export function previousDayKey(day) {
  const [y, m, d] = day.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

/** Today's quest progress - see quests.js. Reset lazily when the day changes. */
export function freshDaily(day = null) {
  return {
    day,
    correct: 0,
    points: 0,
    streak: 0,
    speed: 0,
    featured: 0,
    read: 0,
    games: [],
    completed: [],
    chestOpened: false,
  };
}

function freshPlayStreak() {
  return { last: null, count: 0, best: 0 };
}

/**
 * The theme park a child builds in Pretparkbaas (round 19): park cash (its
 * own money - never the shop's coins), the attractions built, and a few
 * counters for the park sign. Kept per player, like everything else.
 */
export function freshPark() {
  return { cash: 0, built: [], days: 0, visitors: 0, bestDay: 0, topLevel: 0 };
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
  // Per game, the set of levels a child has already leveled all the way
  // through - see canEarnAtLevel(). A level in this set has already paid
  // out once; coming back to it later is practice, not a fresh payout.
  clearedLevels: freshClearedLevels(),
  // Daily quests (quests.js) and the "days in a row" play streak.
  daily: freshDaily(),
  playStreak: freshPlayStreak(),
  questsCompleted: 0,
  chestsOpened: 0,
  // The reward a child is saving up for (rewards.js setGoal), and the colour
  // theme they picked in the shop.
  goalReward: null,
  equippedTheme: null,
  // The highest buddy stage (buddy.js) already celebrated, so growing is
  // announced exactly once.
  buddySeenStage: 0,
  // Round 18. A dated record of every level a child has mastered - the
  // "level passport" on the home page and the parent's mastery log - and the
  // reading counters: words read in the reading games and micro-lessons,
  // reading questions answered right, the best arcade run, and the
  // micro-lessons (Leerhapjes) collected.
  masteryLog: [],
  wordsRead: 0,
  readCorrect: 0,
  arcadeBest: 0,
  bites: {},
  // Round 19. One-off achievements in the new games (reaching the top of
  // the lava tower, winning a kart race, ...) that badges look at; the
  // theme park; and the star-road tiers already claimed (starroad.js).
  feats: new Set(),
  park: freshPark(),
  passClaimed: [],
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
    clearedLevels: Object.fromEntries(
      Object.entries(state.clearedLevels).map(([k, levels]) => [k, [...levels].sort((a, b) => a - b)]),
    ),
    daily: { ...state.daily, games: [...state.daily.games], completed: [...state.daily.completed] },
    playStreak: { ...state.playStreak },
    questsCompleted: state.questsCompleted,
    chestsOpened: state.chestsOpened,
    goalReward: state.goalReward,
    equippedTheme: state.equippedTheme,
    buddySeenStage: state.buddySeenStage,
    masteryLog: state.masteryLog.map((entry) => ({ ...entry })),
    wordsRead: state.wordsRead,
    readCorrect: state.readCorrect,
    arcadeBest: state.arcadeBest,
    bites: JSON.parse(JSON.stringify(state.bites)),
    feats: [...state.feats].sort(),
    park: { ...state.park, built: [...state.park.built] },
    passClaimed: [...state.passClaimed].sort((a, b) => a - b),
    updatedAt: new Date().toISOString(),
  };
  writeJson(PROFILES_KEY, profiles);
  try {
    localStorage.setItem(CURRENT_KEY, state.playerName);
  } catch {
    /* see writeJson */
  }
}

/**
 * Every player-scoped field back to a brand-new player. One function, used by
 * both applyProfile() and clearAllProfiles(), so a field added later cannot
 * be reset in one place and forgotten in the other.
 */
function resetPlayerFields() {
  state.totalScore = 0;
  state.levels = freshLevels();
  state.badges = [];
  state.coins = 0;
  state.unlockedRewards = new Set();
  state.equippedAvatar = null;
  state.gamesTried = new Set();
  state.gameStreaks = freshGameStreaks();
  state.clearedLevels = freshClearedLevels();
  state.daily = freshDaily();
  state.playStreak = freshPlayStreak();
  state.questsCompleted = 0;
  state.chestsOpened = 0;
  state.goalReward = null;
  state.equippedTheme = null;
  state.buddySeenStage = 0;
  state.masteryLog = [];
  state.wordsRead = 0;
  state.readCorrect = 0;
  state.arcadeBest = 0;
  state.bites = {};
  state.feats = new Set();
  state.park = freshPark();
  state.passClaimed = [];
}

/** Restore a saved profile into the live state. Returns true if one existed. */
export function applyProfile(name) {
  const profile = allProfiles()[name];
  state.playerName = name;
  if (!profile) {
    resetPlayerFields();
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
  state.clearedLevels = Object.fromEntries(
    Object.entries(profile.clearedLevels || {}).map(([k, levels]) => [k, new Set(levels)]),
  );
  // Profiles saved before round 17 have none of the fields below; each one
  // falls back to a fresh value rather than `undefined`.
  const daily = profile.daily || {};
  state.daily = {
    ...freshDaily(daily.day ?? null),
    ...daily,
    games: [...(daily.games || [])],
    completed: [...(daily.completed || [])],
  };
  state.playStreak = { ...freshPlayStreak(), ...(profile.playStreak || {}) };
  state.questsCompleted = profile.questsCompleted || 0;
  state.chestsOpened = profile.chestsOpened || 0;
  state.goalReward = profile.goalReward || null;
  state.equippedTheme = profile.equippedTheme || null;
  // An existing player's buddy starts out already at whatever stage their
  // score has earned - no surprise "your buddy grew!" for points banked
  // before the buddy existed. buddy.js owns the thresholds, so this is -1
  // here and resolved there (see buddy.js syncBuddyStage()).
  state.buddySeenStage = Number.isInteger(profile.buddySeenStage) ? profile.buddySeenStage : -1;
  // A profile from before round 18 has cleared levels but no log: rebuild
  // the log from them, undated ("earlier"), so the passport is complete.
  state.masteryLog = Array.isArray(profile.masteryLog)
    ? profile.masteryLog.filter((e) => e && typeof e.game === "string" && Number.isInteger(e.level)).map((e) => ({ ...e }))
    : Object.entries(profile.clearedLevels || {}).flatMap(([game, levels]) =>
        [...levels].sort((a, b) => a - b).map((level) => ({ game, level, at: null })),
      );
  state.wordsRead = profile.wordsRead || 0;
  state.readCorrect = profile.readCorrect || 0;
  state.arcadeBest = profile.arcadeBest || 0;
  state.bites = profile.bites && typeof profile.bites === "object" ? JSON.parse(JSON.stringify(profile.bites)) : {};
  // Round 19 fields; a profile saved before then starts them fresh.
  state.feats = new Set(Array.isArray(profile.feats) ? profile.feats : []);
  const park = profile.park && typeof profile.park === "object" ? profile.park : {};
  state.park = {
    ...freshPark(),
    ...park,
    built: Array.isArray(park.built) ? park.built.filter((id) => typeof id === "string") : [],
  };
  state.passClaimed = Array.isArray(profile.passClaimed) ? profile.passClaimed.filter(Number.isInteger) : [];
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
 * Coins that are a *gift* rather than points for an answer - a finished
 * daily quest, a treasure chest. They go straight to the spendable balance
 * and leave totalScore alone: the score (and the buddy that grows with it)
 * stays a record of answers actually earned.
 */
export function grantBonusCoins(amount) {
  if (!(amount > 0)) return;
  state.coins += Math.round(amount);
  emitChange();
}

/**
 * Mark today as a day this player practised, and keep the "days in a row"
 * streak: yesterday + today continues it, a gap restarts it at 1. Returns
 * true the first time it is called on a new day.
 */
export function touchPlayDay(now = new Date()) {
  const today = dayKey(now);
  const streak = state.playStreak;
  if (streak.last === today) return false;
  streak.count = streak.last === previousDayKey(today) ? streak.count + 1 : 1;
  streak.best = Math.max(streak.best, streak.count);
  streak.last = today;
  emitChange();
  return true;
}

/** Days in a row as of `now` - 0 once a whole day has been missed. */
export function currentPlayStreak(now = new Date()) {
  const today = dayKey(now);
  const { last, count } = state.playStreak;
  return last === today || last === previousDayKey(today) ? count : 0;
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

/**
 * A game's own top level. Every game runs 0-7 since round 18 (Tafel Monster
 * used to be the one with 0-6); kept as a function so a game with its own
 * ceiling is still one line, and so no caller goes back to assuming a shared
 * constant.
 */
export function getMaxLevel(gameKey = null) {
  return MAX_LEVEL;
}

export function getLevel(gameKey) {
  return state.levels[gameKey] ?? MIN_LEVEL;
}

/** The highest level the child has reached in any single game so far. */
export function highestLevelReached() {
  return Math.max(MIN_LEVEL, ...GAME_KEYS.map((k) => getLevel(k)));
}

/** True once every game is at its own top level. */
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
 * points. Every level pays out normally the first time a child works
 * through it - exactly until their own streak levels them up out of it -
 * but once a level has been cleared that way (see clearLevel() below),
 * coming back to it again - a slip back down after wrong answers, or
 * picking it again on purpose from the level picker - is practice, not a
 * new payout. Otherwise a child could sit on one level and earn coins
 * indefinitely instead of progressing.
 *
 * The one level this never applies to in practice is a game's own top level
 * (getMaxLevel()): there is nowhere higher to level up
 * into, so it can never be "cleared" by the mechanism below and always pays
 * - a child who has reached the hardest content is still doing the hardest
 * content, not replaying something easier.
 */
export function canEarnAtLevel(gameKey, level) {
  return !state.clearedLevels[gameKey]?.has(level);
}

/** The points actually payable for one correct answer, after that guard. */
export function awardablePoints(gameKey, level, points) {
  return canEarnAtLevel(gameKey, level) ? points : 0;
}

/**
 * Mark `level` as cleared for `gameKey` - called only from the *automatic*
 * leveling paths below and adaptAfterRound() in gameflow.js, i.e. only when
 * the child's own streak of correct/round performance earned the level-up,
 * never from a manual level-picker click. That distinction matters:
 * browsing the level picker up and back down again (or a parent/older
 * sibling trying a harder level for fun) must never cost a child their
 * first honest, coin-earning pass through a level.
 */
export function clearLevel(gameKey, level, now = new Date()) {
  const cleared = (state.clearedLevels[gameKey] ??= new Set());
  if (cleared.has(level)) return 0;
  cleared.add(level);
  // First time only: log it, and pay a one-off mastery bonus. Because the
  // set above can only ever gain a level once, dropping back and levelling
  // up through the same level again pays nothing - the bonus rewards
  // climbing, it cannot be farmed by sliding up and down.
  state.masteryLog.push({ game: gameKey, level, at: new Date(now).toISOString() });
  const bonus = masteryBonus(level);
  grantBonusCoins(bonus);
  return bonus;
}

/** Whether `level` of `gameKey` has already been mastered (and so no longer pays). */
export function isLevelCleared(gameKey, level) {
  return !!state.clearedLevels[gameKey]?.has(level);
}

/**
 * Where a child playing an already-mastered level should go instead: the
 * nearest level above `level` that still pays. A game's top level can never
 * be cleared, so there always is one - unless `level` is the top itself.
 * @returns {number|null}
 */
export function nextPayingLevel(gameKey, level = getLevel(gameKey)) {
  for (let l = level + 1; l <= getMaxLevel(gameKey); l++) {
    if (canEarnAtLevel(gameKey, l)) return l;
  }
  return null;
}

/** How many levels have been mastered, across every game. */
export function masteredLevelCount() {
  return Object.values(state.clearedLevels).reduce((sum, levels) => sum + levels.size, 0);
}

/**
 * Record a one-off achievement (round 19) - "reached the top of the lava
 * tower", "won a kart race". Returns true the first time only, so a caller
 * can celebrate it once.
 */
export function recordFeat(id) {
  if (state.feats.has(id)) return false;
  state.feats.add(id);
  emitChange();
  return true;
}

/** Add to the "words read" counter (reading games and micro-lessons). */
export function addWordsRead(words) {
  if (!(words > 0)) return;
  state.wordsRead += Math.round(words);
  emitChange();
}

/**
 * Update the counters after an answer and adapt the level: up after
 * LEVEL_UP_STREAK correct in a row, down after LEVEL_DOWN_STREAK wrong.
 * @returns {{leveledUp: boolean, leveledDown: boolean, masteryBonus: number}}
 *   masteryBonus is the one-off coin gift paid when the level-up mastered a
 *   level for the first time (0 otherwise).
 */
export function registerAttempt(gameKey, isCorrect) {
  state.questionsAnswered += 1;
  state.gamesTried.add(gameKey);
  const streak = (state.gameStreaks[gameKey] ??= { correct: 0, wrong: 0 });
  let leveledUp = false;
  let leveledDown = false;
  let bonus = 0;
  const currentLevel = getLevel(gameKey);
  const max = getMaxLevel(gameKey);

  if (isCorrect) {
    state.correctAnswered += 1;
    streak.correct += 1;
    streak.wrong = 0;
    if (streak.correct >= LEVEL_UP_STREAK && currentLevel < max) {
      setLevel(gameKey, currentLevel + 1);
      leveledUp = true;
      bonus = clearLevel(gameKey, currentLevel);
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
  return { leveledUp, leveledDown, masteryBonus: bonus };
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
  resetPlayerFields();
  state.streaks = 0;
  state.questionsAnswered = 0;
  state.correctAnswered = 0;
  emitChange();
}
