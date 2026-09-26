/**
 * Het Sterrenpad / The Star Road (round 19) - the reward track for climbing.
 *
 * The request behind it, twice now: once a child has finished the easy
 * levels, they should not keep playing them - and moving up should feel like
 * an invitation. Round 18 stopped a mastered level from paying and pointed at
 * the next one. This is the carrot that goes with it: stars, shown on a road
 * of rewards, and they only ever come from *mastering a level for the first
 * time*.
 *
 *   - A level is worth more stars the higher it is (starsForLevel): the easy
 *     levels 0 and 1 give one star each, groep 8's level 6 gives four. So the
 *     fastest way along the road is always up.
 *   - Stars are counted from state.clearedLevels, which only ever gains a
 *     level through a real, streak-earned level-up (state.js clearLevel()) -
 *     never through a manual pick, and never twice for the same level. There
 *     is no star counter to farm: replaying, sliding down and climbing back
 *     up all leave the count exactly where it was.
 *   - A game's top level (7) can never be "mastered" (there is nothing above
 *     it to level up into), so it gives no stars; reaching it is its own
 *     reward (the Legend badge, the legend rewards).
 *
 * Every tier along the road is claimed with a tap - bonus coins, or a reward
 * that is never for sale in the shop (rewards.js, `starRoad`).
 */
import {
  GAME_KEYS,
  canEarnAtLevel,
  emitChange,
  getLevel,
  getMaxLevel,
  grantBonusCoins,
  nextPayingLevel,
  saveCurrentProfile,
  state,
} from "./state.js";
import { REWARD_MAP } from "./rewards.js";

/** Stars for mastering `level` for the first time: 1, 1, 2, 2, 3, 3, 4. */
export function starsForLevel(level) {
  return 1 + Math.floor(Math.max(0, level) / 2);
}

/**
 * The road: a tier every few stars, close together at the start (the first
 * one after mastering two levels) and further apart later. `coins` tiers pay
 * bonus coins; `reward` tiers unlock a star-road-only reward.
 */
export const STAR_TIERS = [
  { stars: 2, coins: 20 },
  { stars: 4, reward: "sticker_moonlight" },
  { stars: 7, coins: 40 },
  { stars: 10, reward: "avatar_star_hedgehog" },
  { stars: 14, reward: "sticker_star_ribbon" },
  { stars: 18, coins: 60 },
  { stars: 23, reward: "theme_aurora" },
  { stars: 29, reward: "avatar_star_eagle" },
  { stars: 36, coins: 100 },
  { stars: 44, reward: "sticker_summit" },
  { stars: 53, reward: "avatar_star_wolf" },
  { stars: 63, coins: 150 },
  { stars: 75, reward: "sticker_star_cup" },
  { stars: 90, reward: "avatar_star_wizard" },
  { stars: 110, coins: 250 },
  { stars: 135, reward: "sticker_star_crown" },
  { stars: 165, reward: "avatar_star_dragon" },
  { stars: 200, reward: "avatar_star_unicorn" },
];

/** Stars earned so far: one entry per mastered level, weighted by its height. */
export function totalStars() {
  let sum = 0;
  for (const levels of Object.values(state.clearedLevels)) {
    for (const level of levels) sum += starsForLevel(level);
  }
  return sum;
}

/** Stars per game, for the page's "where your stars came from" list. */
export function starsPerGame() {
  return GAME_KEYS.map((game) => {
    const levels = [...(state.clearedLevels[game] ?? [])].sort((a, b) => a - b);
    return { game, levels, stars: levels.reduce((sum, level) => sum + starsForLevel(level), 0) };
  });
}

/**
 * Where the next stars are: per game, the next level still to master and
 * what it is worth - the most valuable first, so the list itself says
 * "climb". A game already on a mastered level points at the level above.
 * @returns {Array<{game: string, level: number, stars: number, moveUp: boolean}>}
 */
export function nextStarSources(limit = 4) {
  const sources = [];
  for (const game of GAME_KEYS) {
    const level = getLevel(game);
    const target = canEarnAtLevel(game, level) ? level : nextPayingLevel(game, level);
    if (target == null || target >= getMaxLevel(game)) continue;
    sources.push({ game, level: target, stars: starsForLevel(target), moveUp: target !== level });
  }
  return sources.sort((a, b) => b.stars - a.stars || b.level - a.level).slice(0, limit);
}

/** The most stars one game can give: every level below its top mastered. */
export function maxStarsPerGame(maxLevel = 7) {
  let sum = 0;
  for (let level = 0; level < maxLevel; level++) sum += starsForLevel(level);
  return sum;
}

/**
 * Every tier with its state: "claimed", "ready" (enough stars, tap to
 * claim) or "locked".
 */
export function tierStates(stars = totalStars()) {
  const claimed = new Set(state.passClaimed);
  return STAR_TIERS.map((tier) => ({
    ...tier,
    status: claimed.has(tier.stars) ? "claimed" : stars >= tier.stars ? "ready" : "locked",
  }));
}

/** How many tiers are waiting to be claimed. */
export function claimableCount(stars = totalStars()) {
  return tierStates(stars).filter((tier) => tier.status === "ready").length;
}

/** The next tier not reached yet, or null at the end of the road. */
export function nextLockedTier(stars = totalStars()) {
  return STAR_TIERS.find((tier) => tier.stars > stars) ?? null;
}

/**
 * Claim the tier at `stars`. Pays its coins (a gift, like quest coins - never
 * score) or unlocks its reward, once.
 * @returns {{coins: number, rewardId: string|null}|null} null if it is not
 *   ready (not enough stars, already claimed, or no such tier).
 */
export function claimTier(stars) {
  const tier = tierStates().find((t) => t.stars === stars);
  if (!tier || tier.status !== "ready") return null;
  state.passClaimed.push(tier.stars);
  let rewardId = null;
  if (tier.coins) grantBonusCoins(tier.coins);
  if (tier.reward && REWARD_MAP[tier.reward]) {
    rewardId = tier.reward;
    state.unlockedRewards.add(rewardId);
  }
  saveCurrentProfile();
  emitChange();
  return { coins: tier.coins ?? 0, rewardId };
}
