/**
 * Milestone badges - a light "why keep playing" layer on top of the raw
 * score, independent of any one game. The first eight are a straight port of
 * utils/badges.py (same thresholds, same display order); round 17 added
 * thirteen more for the things a child can now work towards over days and
 * weeks rather than in one sitting: coming back day after day, daily quests
 * and chests, the collection, the buddy, and lifetime points. Round 18
 * added ten more for groep 8 (levels 6 and 7), mastering levels, reading,
 * the arcade games and the learning bites. Round 19 added eight: the star
 * road, and one feat in each of the five new games. Round 20 added four more,
 * one feat in each of the thinking games.
 *
 * checkNewBadges() is called once per answered question, after that
 * question's score/level/streak updates have landed, and returns whatever
 * was newly earned so it can be celebrated.
 */
import { GAME_KEYS, GROEP8_LEVEL, MASTER_LEVEL, MAX_LEVEL, getLevel, masteredLevelCount, state } from "./state.js";
import { buddyStageIndex } from "./buddy.js";
import { BITES } from "./bites-data.js";
import { totalStars } from "./starroad.js";

const playedAllGames = () => GAME_KEYS.every((k) => state.gamesTried.has(k));
// "Level 5" and "Reken Meester" were earned at level 5 when 5 was the top;
// they stay at 5 now that groep 8 goes to 7 (the badge names say "level 5").
const anyLevelAtLeast = (level) => () => GAME_KEYS.some((k) => getLevel(k) >= level);
const allLevelsMaxed = () => GAME_KEYS.every((k) => getLevel(k) >= MASTER_LEVEL);
const bitesCollected = () => Object.values(state.bites).filter((b) => b?.stars > 0).length;
const allLevelsAtLeast = (level) => () => GAME_KEYS.every((k) => getLevel(k) >= level);
// `best`, not the current count: a streak that was reached stays earned even
// after a missed day breaks it.
const playDaysInARow = (days) => () => state.playStreak.best >= days;
const collected = (count) => () => state.unlockedRewards.size >= count;

// [id, emoji, check] - the order doubles as the display order.
export const BADGE_DEFS = [
  ["q10", "🥉", () => state.questionsAnswered >= 10],
  ["q50", "🥈", () => state.questionsAnswered >= 50],
  ["q100", "🥇", () => state.questionsAnswered >= 100],
  ["streak5", "🔥", () => state.streaks >= 5],
  ["streak10", "🔥🔥", () => state.streaks >= 10],
  ["explorer", "🗺️", playedAllGames],
  ["level5", "⭐", anyLevelAtLeast(MASTER_LEVEL)],
  ["mastermind", "👑", allLevelsMaxed],
  ["streak20", "🌋", () => state.streaks >= 20],
  ["days3", "📅", playDaysInARow(3)],
  ["days7", "🗓️", playDaysInARow(7)],
  ["days30", "🏅", playDaysInARow(30)],
  ["quest1", "📜", () => state.questsCompleted >= 1],
  ["chest1", "🧰", () => state.chestsOpened >= 1],
  ["chest10", "🏴‍☠️", () => state.chestsOpened >= 10],
  ["collector10", "🎒", collected(10)],
  ["collector30", "🧳", collected(30)],
  ["score1000", "💫", () => state.totalScore >= 1000],
  ["score5000", "🌠", () => state.totalScore >= 5000],
  ["buddy_dragon", "🐉", () => buddyStageIndex(state.totalScore) >= 4],
  ["all_level3", "🌟", allLevelsAtLeast(3)],
  // Round 18.
  ["groep8", "🎓", anyLevelAtLeast(GROEP8_LEVEL)],
  ["legend", "🏆", anyLevelAtLeast(MAX_LEVEL)],
  ["mastered10", "🏅", () => masteredLevelCount() >= 10],
  ["mastered40", "🎖️", () => masteredLevelCount() >= 40],
  ["reader25", "📚", () => state.readCorrect >= 25],
  ["words1000", "📖", () => state.wordsRead >= 1000],
  ["words5000", "🦉", () => state.wordsRead >= 5000],
  ["arcade10", "🕹️", () => state.arcadeBest >= 10],
  ["bites5", "🍪", () => bitesCollected() >= 5],
  ["bites_all", "🧠", () => bitesCollected() >= BITES.length],
  // Round 19: the star road, and one for each new game - each a feat the
  // game records once (state.recordFeat), so a badge can never be earned by
  // replaying something easy.
  ["stars25", "🌟", () => totalStars() >= 25],
  ["stars100", "✨", () => totalStars() >= 100],
  ["toren_top", "🌋", () => state.feats.has("toren_top")],
  ["kart_first", "🏎️", () => state.feats.has("kart_first")],
  ["doku_big", "🧩", () => state.feats.has("doku_big")],
  ["tactiek_win", "♟️", () => state.feats.has("tactiek_win_hard")],
  ["park_6", "🎡", () => state.feats.has("park_6")],
  ["park_all", "🎢", () => state.feats.has("park_all")],
  // Round 20: a feat in each of the four thinking games.
  ["duel_win", "🎲", () => state.feats.has("duel_hard")],
  ["weeg_four", "⚖️", () => state.feats.has("weeg_four")],
  ["machine_par", "🧮", () => state.feats.has("machine_par")],
  ["bouw_hard", "🧱", () => state.feats.has("bouw_hard")],
];

export const BADGE_IDS = BADGE_DEFS.map((b) => b[0]);
export const BADGE_EMOJI = Object.fromEntries(BADGE_DEFS.map((b) => [b[0], b[1]]));

/**
 * Evaluate every badge, update state.badges, and return the
 * [id, emoji] pairs newly earned by this call.
 */
export function checkNewBadges() {
  const earned = new Set(state.badges);
  const newly = [];
  for (const [id, emoji, check] of BADGE_DEFS) {
    if (!earned.has(id) && check()) {
      earned.add(id);
      newly.push([id, emoji]);
    }
  }
  state.badges = BADGE_IDS.filter((id) => earned.has(id));
  return newly;
}
