/**
 * Rekie, the maths buddy: a companion that hatches from an egg and grows into
 * a dragon as the child learns.
 *
 * It grows on totalScore - the lifetime number that only ever rises for a
 * correct answer that actually paid out. So it cannot be fed by replaying an
 * already-cleared level (state.js canEarnAtLevel()), bonus coins from quests
 * and chests do not count (state.js grantBonusCoins()), and spending coins in
 * the shop never shrinks it. That makes it the one reward that is purely
 * "how much have I learned", which is exactly what makes it worth showing
 * off.
 *
 * No DOM here: the home page draws the buddy, gameflow.js announces growth.
 */
import { onStateChange, state } from "./state.js";

// Thresholds roughly double, so the first growth happens in the first
// sitting (a dozen correct answers at the gentlest level) and the last one is
// a many-week goal - the same shape as the reward shop's tier prices.
export const BUDDY_STAGES = [
  { min: 0, emoji: "🥚", key: "buddy.stage_egg", aura: "egg" },
  { min: 60, emoji: "🐣", key: "buddy.stage_hatchling", aura: "soft" },
  { min: 250, emoji: "🦎", key: "buddy.stage_lizard", aura: "soft" },
  { min: 700, emoji: "🐲", key: "buddy.stage_baby_dragon", aura: "green" },
  { min: 1600, emoji: "🐉", key: "buddy.stage_dragon", aura: "green" },
  { min: 3500, emoji: "🐉", key: "buddy.stage_fire_dragon", aura: "fire" },
  { min: 7000, emoji: "🐉", key: "buddy.stage_dragon_king", aura: "gold", crown: true },
  { min: 12000, emoji: "🐉", key: "buddy.stage_cosmic_dragon", aura: "cosmic", crown: true },
];

/** The stage index a given lifetime score has earned. */
export function buddyStageIndex(score = state.totalScore) {
  let index = 0;
  BUDDY_STAGES.forEach((stage, i) => {
    if (score >= stage.min) index = i;
  });
  return index;
}

/**
 * Everything the home page needs to draw the buddy.
 * @returns {{index: number, stage: object, next: object|null, toNext: number, pct: number}}
 *   pct is progress from this stage's threshold to the next one, 0-100 (100
 *   at the final stage).
 */
export function buddyInfo(score = state.totalScore) {
  const index = buddyStageIndex(score);
  const stage = BUDDY_STAGES[index];
  const next = BUDDY_STAGES[index + 1] ?? null;
  if (!next) return { index, stage, next, toNext: 0, pct: 100 };
  const span = next.min - stage.min;
  const pct = Math.max(0, Math.min(100, Math.round((100 * (score - stage.min)) / span)));
  return { index, stage, next, toNext: next.min - score, pct };
}

/**
 * A profile saved before the buddy existed has buddySeenStage -1 (see
 * state.js applyProfile()). Resolve it to the stage its score already
 * earned, silently - growth that happened before the buddy was there is not
 * news.
 */
export function syncBuddyStage() {
  if (!(state.buddySeenStage >= 0)) state.buddySeenStage = buddyStageIndex();
}
onStateChange(syncBuddyStage);

/**
 * Call after points land. Returns the new stage the first time the buddy
 * reaches it (so it can be celebrated once), or null.
 */
export function checkBuddyGrowth() {
  syncBuddyStage();
  const index = buddyStageIndex();
  if (index <= state.buddySeenStage) return null;
  state.buddySeenStage = index;
  return BUDDY_STAGES[index];
}
