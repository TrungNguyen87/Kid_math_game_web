/**
 * Milestone badges - a light "why keep playing" layer on top of the raw
 * score, independent of any one game. The first eight are a straight port of
 * utils/badges.py (same thresholds, same display order); round 17 added
 * thirteen more for the things a child can now work towards over days and
 * weeks rather than in one sitting: coming back day after day, daily quests
 * and chests, the collection, the buddy, and lifetime points.
 *
 * checkNewBadges() is called once per answered question, after that
 * question's score/level/streak updates have landed, and returns whatever
 * was newly earned so it can be celebrated.
 */
import { GAME_KEYS, MAX_LEVEL, getLevel, state } from "./state.js";
import { buddyStageIndex } from "./buddy.js";

const playedAllGames = () => GAME_KEYS.every((k) => state.gamesTried.has(k));
const anyLevelMaxed = () => GAME_KEYS.some((k) => getLevel(k) >= MAX_LEVEL);
const allLevelsMaxed = () => GAME_KEYS.every((k) => getLevel(k) >= MAX_LEVEL);
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
  ["level5", "⭐", anyLevelMaxed],
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
