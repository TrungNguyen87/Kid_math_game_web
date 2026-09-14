/**
 * The reward shop: what a child can do with the coins they earn.
 *
 * Every correct answer already pays coins alongside the score (see
 * addScore() in state.js) - this module is only about spending them: a
 * static catalog of characters and stickers, and the actions that unlock and
 * equip them. Unlocks are permanent and persisted with the rest of the
 * player's profile, exactly like badges and levels.
 */
import { emitChange, saveCurrentProfile, spendCoins, state } from "./state.js";

const DEFAULT_AVATAR_ID = "avatar_default";

// Costs are tiered so the first few items fall in one sitting and the rarest
// ones take many sessions to save up for - a plausible "ask a parent for a
// gift" milestone rather than something a single lucky round unlocks.
const COMMON = 30;
const UNCOMMON = 90;
const RARE = 220;
const EPIC = 500;
const LEGENDARY = 1000;

// { id, category, emoji, nameKey, cost } - cost 0 means always unlocked.
// category "avatar" items can be equipped (shown next to the player's name);
// category "sticker" items are pure collectibles.
export const REWARD_DEFS = [
  { id: "avatar_default", category: "avatar", emoji: "🧑", nameKey: "rewards.avatar_default", cost: 0 },
  { id: "avatar_cat", category: "avatar", emoji: "🐱", nameKey: "rewards.avatar_cat", cost: COMMON },
  { id: "avatar_dog", category: "avatar", emoji: "🐶", nameKey: "rewards.avatar_dog", cost: COMMON },
  { id: "avatar_fox", category: "avatar", emoji: "🦊", nameKey: "rewards.avatar_fox", cost: COMMON },
  { id: "avatar_panda", category: "avatar", emoji: "🐼", nameKey: "rewards.avatar_panda", cost: UNCOMMON },
  { id: "avatar_penguin", category: "avatar", emoji: "🐧", nameKey: "rewards.avatar_penguin", cost: UNCOMMON },
  { id: "avatar_lion", category: "avatar", emoji: "🦁", nameKey: "rewards.avatar_lion", cost: UNCOMMON },
  { id: "avatar_unicorn", category: "avatar", emoji: "🦄", nameKey: "rewards.avatar_unicorn", cost: RARE },
  { id: "avatar_dragon", category: "avatar", emoji: "🐲", nameKey: "rewards.avatar_dragon", cost: RARE },
  { id: "avatar_wizard", category: "avatar", emoji: "🧙", nameKey: "rewards.avatar_wizard", cost: EPIC },
  { id: "avatar_astronaut", category: "avatar", emoji: "🚀", nameKey: "rewards.avatar_astronaut", cost: LEGENDARY },

  { id: "sticker_star", category: "sticker", emoji: "⭐", nameKey: "rewards.sticker_star", cost: COMMON },
  { id: "sticker_rainbow", category: "sticker", emoji: "🌈", nameKey: "rewards.sticker_rainbow", cost: COMMON },
  { id: "sticker_balloon", category: "sticker", emoji: "🎈", nameKey: "rewards.sticker_balloon", cost: COMMON },
  { id: "sticker_clover", category: "sticker", emoji: "🍀", nameKey: "rewards.sticker_clover", cost: UNCOMMON },
  { id: "sticker_sparkle", category: "sticker", emoji: "🌟", nameKey: "rewards.sticker_sparkle", cost: UNCOMMON },
  { id: "sticker_fireworks", category: "sticker", emoji: "🎆", nameKey: "rewards.sticker_fireworks", cost: UNCOMMON },
  { id: "sticker_trophy", category: "sticker", emoji: "🏆", nameKey: "rewards.sticker_trophy", cost: RARE },
  { id: "sticker_gem", category: "sticker", emoji: "💎", nameKey: "rewards.sticker_gem", cost: RARE },
  { id: "sticker_medal", category: "sticker", emoji: "🥇", nameKey: "rewards.sticker_medal", cost: EPIC },
  { id: "sticker_crown", category: "sticker", emoji: "👑", nameKey: "rewards.sticker_crown", cost: LEGENDARY },
];

export const REWARD_MAP = Object.fromEntries(REWARD_DEFS.map((r) => [r.id, r]));

export function isUnlocked(id) {
  const def = REWARD_MAP[id];
  return !!def && (def.cost === 0 || state.unlockedRewards.has(id));
}

export function canAfford(id) {
  const def = REWARD_MAP[id];
  return !!def && state.coins >= def.cost;
}

/**
 * Spend coins to unlock a reward. An avatar is equipped immediately - the
 * whole point of spending on a character is seeing it show up right away.
 * @returns {boolean} whether the unlock actually happened.
 */
export function unlockReward(id) {
  const def = REWARD_MAP[id];
  if (!def || isUnlocked(id) || !spendCoins(def.cost)) return false;
  state.unlockedRewards.add(id);
  if (def.category === "avatar") state.equippedAvatar = id;
  saveCurrentProfile();
  emitChange();
  return true;
}

/** Switch to a previously unlocked avatar. */
export function equipAvatar(id) {
  const def = REWARD_MAP[id];
  if (!def || def.category !== "avatar" || !isUnlocked(id)) return false;
  state.equippedAvatar = id;
  saveCurrentProfile();
  emitChange();
  return true;
}

/** The avatar id currently in effect - always a real, unlocked entry. */
export function equippedAvatarId() {
  return isUnlocked(state.equippedAvatar) ? state.equippedAvatar : DEFAULT_AVATAR_ID;
}

/** The emoji shown next to the player's name (sidebar, etc). */
export function equippedAvatarEmoji() {
  return REWARD_MAP[equippedAvatarId()]?.emoji ?? "🧑";
}
