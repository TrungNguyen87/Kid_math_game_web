/**
 * The reward shop: what a child can do with the coins they earn.
 *
 * Every correct answer already pays coins alongside the score (see
 * addScore() in state.js - coins are never capped or rolled back, so a big
 * day of play always leaves a child closer to what they're saving for) -
 * this module is only about spending them: a static catalog of characters,
 * stickers and special gifts, and the actions that unlock and equip them.
 * Unlocks are permanent and persisted with the rest of the player's profile,
 * exactly like badges and levels.
 *
 * Five collections: characters (equip one to show next to your name),
 * stickers and special gifts (pure collectibles), colour themes (equip one to
 * recolour the whole app - the first reward that changes what the app looks
 * like), and treasures, which cannot be bought at all: each one is found in
 * a daily treasure chest (quests.js), so they reward coming back, not saving.
 *
 * Two things gate the priciest items, on top of the coin cost:
 *   - minLevel: the child must have pushed at least one game to that level,
 *     not just saved up the balance - "a certain level" as well as "more
 *     points".
 *   - requiresMastery (the single ultra item only): every game at its own
 *     true max level, and every other reward in the shop already unlocked.
 *     That is the "only people who can finish everything" item.
 */
import {
  MAX_LEVEL,
  allGamesAtTrueMax,
  emitChange,
  highestLevelReached,
  saveCurrentProfile,
  spendCoins,
  state,
} from "./state.js";

const DEFAULT_AVATAR_ID = "avatar_default";

// Costs are tiered so the first couple of items fall in one sitting and the
// rarest ones are a multi-session goal to save up for - a plausible "ask a
// parent to be proud of you" milestone. Coins accumulate without limit (see
// addScore() in state.js), so however long it takes, saved-up coins are
// never lost or discarded on the way to a goal.
const COMMON = 40;
const UNCOMMON = 120;
const RARE = 320;
const EPIC = 700;
const LEGENDARY = 1500;
const MYTHIC = 3000; // the "special anime-style hero" tier
const ULTRA = 8000; // exactly one item lives here - see requiresMastery

export const TIER_ORDER = ["common", "uncommon", "rare", "epic", "legendary", "mythic", "ultra"];

// { id, category, tier, emoji, nameKey, cost, minLevel, requiresMastery } -
// cost 0 means always unlocked. category "avatar" items can be equipped
// (shown next to the player's name); category "sticker" items are pure
// collectibles. Existing ids are never renamed or removed, even when their
// cost or level gate changes, so a device that already unlocked something
// never loses it.
export const REWARD_DEFS = [
  { id: "avatar_default", category: "avatar", tier: "common", emoji: "🧑", nameKey: "rewards.avatar_default", cost: 0, minLevel: 0 },

  // --- Common: friendly animals, the first sitting or two -----------------
  { id: "avatar_cat", category: "avatar", tier: "common", emoji: "🐱", nameKey: "rewards.avatar_cat", cost: COMMON, minLevel: 0 },
  { id: "avatar_dog", category: "avatar", tier: "common", emoji: "🐶", nameKey: "rewards.avatar_dog", cost: COMMON, minLevel: 0 },
  { id: "avatar_fox", category: "avatar", tier: "common", emoji: "🦊", nameKey: "rewards.avatar_fox", cost: COMMON, minLevel: 0 },
  { id: "avatar_rabbit", category: "avatar", tier: "common", emoji: "🐰", nameKey: "rewards.avatar_rabbit", cost: COMMON, minLevel: 0 },
  { id: "avatar_koala", category: "avatar", tier: "common", emoji: "🐨", nameKey: "rewards.avatar_koala", cost: COMMON, minLevel: 0 },
  { id: "avatar_turtle", category: "avatar", tier: "common", emoji: "🐢", nameKey: "rewards.avatar_turtle", cost: COMMON, minLevel: 0 },
  { id: "avatar_hamster", category: "avatar", tier: "common", emoji: "🐹", nameKey: "rewards.avatar_hamster", cost: COMMON, minLevel: 0 },
  { id: "avatar_frog", category: "avatar", tier: "common", emoji: "🐸", nameKey: "rewards.avatar_frog", cost: COMMON, minLevel: 0 },

  // --- Uncommon: a few days of play in -------------------------------------
  { id: "avatar_panda", category: "avatar", tier: "uncommon", emoji: "🐼", nameKey: "rewards.avatar_panda", cost: UNCOMMON, minLevel: 0 },
  { id: "avatar_penguin", category: "avatar", tier: "uncommon", emoji: "🐧", nameKey: "rewards.avatar_penguin", cost: UNCOMMON, minLevel: 0 },
  { id: "avatar_lion", category: "avatar", tier: "uncommon", emoji: "🦁", nameKey: "rewards.avatar_lion", cost: UNCOMMON, minLevel: 0 },
  { id: "avatar_tiger", category: "avatar", tier: "uncommon", emoji: "🐯", nameKey: "rewards.avatar_tiger", cost: UNCOMMON, minLevel: 0 },
  { id: "avatar_owl", category: "avatar", tier: "uncommon", emoji: "🦉", nameKey: "rewards.avatar_owl", cost: UNCOMMON, minLevel: 0 },
  { id: "avatar_elephant", category: "avatar", tier: "uncommon", emoji: "🐘", nameKey: "rewards.avatar_elephant", cost: UNCOMMON, minLevel: 0 },
  { id: "avatar_butterfly", category: "avatar", tier: "uncommon", emoji: "🦋", nameKey: "rewards.avatar_butterfly", cost: UNCOMMON, minLevel: 0 },
  { id: "avatar_bee", category: "avatar", tier: "uncommon", emoji: "🐝", nameKey: "rewards.avatar_bee", cost: UNCOMMON, minLevel: 0 },
  { id: "avatar_giraffe", category: "avatar", tier: "uncommon", emoji: "🦒", nameKey: "rewards.avatar_giraffe", cost: UNCOMMON, minLevel: 0 },
  { id: "avatar_flamingo", category: "avatar", tier: "uncommon", emoji: "🦩", nameKey: "rewards.avatar_flamingo", cost: UNCOMMON, minLevel: 0 },
  { id: "avatar_dolphin", category: "avatar", tier: "uncommon", emoji: "🐬", nameKey: "rewards.avatar_dolphin", cost: UNCOMMON, minLevel: 0 },

  // --- Rare: needs level 2 in something, not just coins --------------------
  { id: "avatar_unicorn", category: "avatar", tier: "rare", emoji: "🦄", nameKey: "rewards.avatar_unicorn", cost: RARE, minLevel: 2 },
  { id: "avatar_dragon", category: "avatar", tier: "rare", emoji: "🐲", nameKey: "rewards.avatar_dragon", cost: RARE, minLevel: 2 },
  { id: "avatar_mermaid", category: "avatar", tier: "rare", emoji: "🧜", nameKey: "rewards.avatar_mermaid", cost: RARE, minLevel: 2 },
  { id: "avatar_genie", category: "avatar", tier: "rare", emoji: "🧞", nameKey: "rewards.avatar_genie", cost: RARE, minLevel: 2 },
  { id: "avatar_fairy", category: "avatar", tier: "rare", emoji: "🧚", nameKey: "rewards.avatar_fairy", cost: RARE, minLevel: 2 },
  { id: "avatar_robot", category: "avatar", tier: "rare", emoji: "🤖", nameKey: "rewards.avatar_robot", cost: RARE, minLevel: 2 },
  { id: "avatar_trex", category: "avatar", tier: "rare", emoji: "🦖", nameKey: "rewards.avatar_trex", cost: RARE, minLevel: 2 },
  { id: "avatar_whale", category: "avatar", tier: "rare", emoji: "🐳", nameKey: "rewards.avatar_whale", cost: RARE, minLevel: 2 },

  // --- Epic: level 3 --------------------------------------------------------
  { id: "avatar_wizard", category: "avatar", tier: "epic", emoji: "🧙", nameKey: "rewards.avatar_wizard", cost: EPIC, minLevel: 3 },
  { id: "avatar_superhero", category: "avatar", tier: "epic", emoji: "🦸", nameKey: "rewards.avatar_superhero", cost: EPIC, minLevel: 3 },
  { id: "avatar_ninja", category: "avatar", tier: "epic", emoji: "🥷", nameKey: "rewards.avatar_ninja", cost: EPIC, minLevel: 3 },
  { id: "avatar_detective", category: "avatar", tier: "epic", emoji: "🕵️", nameKey: "rewards.avatar_detective", cost: EPIC, minLevel: 3 },
  { id: "avatar_archer", category: "avatar", tier: "epic", emoji: "🏹", nameKey: "rewards.avatar_archer", cost: EPIC, minLevel: 3 },
  { id: "avatar_scientist", category: "avatar", tier: "epic", emoji: "🧑‍🔬", nameKey: "rewards.avatar_scientist", cost: EPIC, minLevel: 3 },
  { id: "avatar_pirate", category: "avatar", tier: "epic", emoji: "🏴‍☠️", nameKey: "rewards.avatar_pirate", cost: EPIC, minLevel: 3 },

  // --- Legendary: level 4 ----------------------------------------------------
  { id: "avatar_astronaut", category: "avatar", tier: "legendary", emoji: "🚀", nameKey: "rewards.avatar_astronaut", cost: LEGENDARY, minLevel: 4 },
  { id: "avatar_king", category: "avatar", tier: "legendary", emoji: "🤴", nameKey: "rewards.avatar_king", cost: LEGENDARY, minLevel: 4 },
  { id: "avatar_queen", category: "avatar", tier: "legendary", emoji: "👸", nameKey: "rewards.avatar_queen", cost: LEGENDARY, minLevel: 4 },
  { id: "avatar_phoenix_knight", category: "avatar", tier: "legendary", emoji: "🔥🛡️", nameKey: "rewards.avatar_phoenix_knight", cost: LEGENDARY, minLevel: 4 },
  { id: "avatar_ice_queen", category: "avatar", tier: "legendary", emoji: "❄️👸", nameKey: "rewards.avatar_ice_queen", cost: LEGENDARY, minLevel: 4 },
  { id: "avatar_dino_king", category: "avatar", tier: "legendary", emoji: "🦖👑", nameKey: "rewards.avatar_dino_king", cost: LEGENDARY, minLevel: 4 },

  // --- Mythic: original anime-style heroes, needs a maxed game -------------
  // (Real franchise characters like Luffy are trademarked, so these are
  // original archetypes in the same spirit rather than a copy of one.)
  { id: "avatar_dragon_blade", category: "avatar", tier: "mythic", emoji: "🐉⚔️", nameKey: "rewards.avatar_dragon_blade", cost: MYTHIC, minLevel: MAX_LEVEL },
  { id: "avatar_star_ninja", category: "avatar", tier: "mythic", emoji: "🥷✨", nameKey: "rewards.avatar_star_ninja", cost: MYTHIC, minLevel: MAX_LEVEL },
  { id: "avatar_galaxy_guardian", category: "avatar", tier: "mythic", emoji: "🌌🦸", nameKey: "rewards.avatar_galaxy_guardian", cost: MYTHIC, minLevel: MAX_LEVEL },
  { id: "avatar_tsunami_blade", category: "avatar", tier: "mythic", emoji: "🌊⚔️", nameKey: "rewards.avatar_tsunami_blade", cost: MYTHIC, minLevel: MAX_LEVEL },
  { id: "avatar_frost_wolf", category: "avatar", tier: "mythic", emoji: "❄️🐺", nameKey: "rewards.avatar_frost_wolf", cost: MYTHIC, minLevel: MAX_LEVEL },
  { id: "avatar_sakura_samurai", category: "avatar", tier: "mythic", emoji: "🌸⚔️", nameKey: "rewards.avatar_sakura_samurai", cost: MYTHIC, minLevel: MAX_LEVEL },
  { id: "avatar_nebula_phoenix", category: "avatar", tier: "mythic", emoji: "🌌🔥", nameKey: "rewards.avatar_nebula_phoenix", cost: MYTHIC, minLevel: MAX_LEVEL },

  // --- Ultra: the one capstone reward, rendered as a rotating 3D card ------
  { id: "avatar_3d_champion", category: "avatar", tier: "ultra", emoji: "🏆", nameKey: "rewards.avatar_3d_champion", cost: ULTRA, minLevel: MAX_LEVEL, requiresMastery: true, threeD: true },

  // ==========================================================================
  // Stickers - pure collectibles, the same tiers and gates as the characters.
  // ==========================================================================
  { id: "sticker_star", category: "sticker", tier: "common", emoji: "⭐", nameKey: "rewards.sticker_star", cost: COMMON, minLevel: 0 },
  { id: "sticker_rainbow", category: "sticker", tier: "common", emoji: "🌈", nameKey: "rewards.sticker_rainbow", cost: COMMON, minLevel: 0 },
  { id: "sticker_balloon", category: "sticker", tier: "common", emoji: "🎈", nameKey: "rewards.sticker_balloon", cost: COMMON, minLevel: 0 },
  { id: "sticker_heart", category: "sticker", tier: "common", emoji: "❤️", nameKey: "rewards.sticker_heart", cost: COMMON, minLevel: 0 },
  { id: "sticker_sun", category: "sticker", tier: "common", emoji: "☀️", nameKey: "rewards.sticker_sun", cost: COMMON, minLevel: 0 },
  { id: "sticker_cloud", category: "sticker", tier: "common", emoji: "☁️", nameKey: "rewards.sticker_cloud", cost: COMMON, minLevel: 0 },
  { id: "sticker_pizza", category: "sticker", tier: "common", emoji: "🍕", nameKey: "rewards.sticker_pizza", cost: COMMON, minLevel: 0 },
  { id: "sticker_palette", category: "sticker", tier: "common", emoji: "🎨", nameKey: "rewards.sticker_palette", cost: COMMON, minLevel: 0 },
  { id: "sticker_icecream", category: "sticker", tier: "common", emoji: "🍦", nameKey: "rewards.sticker_icecream", cost: COMMON, minLevel: 0 },
  { id: "sticker_donut", category: "sticker", tier: "common", emoji: "🍩", nameKey: "rewards.sticker_donut", cost: COMMON, minLevel: 0 },
  { id: "sticker_paw", category: "sticker", tier: "common", emoji: "🐾", nameKey: "rewards.sticker_paw", cost: COMMON, minLevel: 0 },

  { id: "sticker_clover", category: "sticker", tier: "uncommon", emoji: "🍀", nameKey: "rewards.sticker_clover", cost: UNCOMMON, minLevel: 0 },
  { id: "sticker_sparkle", category: "sticker", tier: "uncommon", emoji: "🌟", nameKey: "rewards.sticker_sparkle", cost: UNCOMMON, minLevel: 0 },
  { id: "sticker_fireworks", category: "sticker", tier: "uncommon", emoji: "🎆", nameKey: "rewards.sticker_fireworks", cost: UNCOMMON, minLevel: 0 },
  { id: "sticker_comet", category: "sticker", tier: "uncommon", emoji: "☄️", nameKey: "rewards.sticker_comet", cost: UNCOMMON, minLevel: 0 },
  { id: "sticker_potion", category: "sticker", tier: "uncommon", emoji: "🧪", nameKey: "rewards.sticker_potion", cost: UNCOMMON, minLevel: 0 },
  { id: "sticker_key", category: "sticker", tier: "uncommon", emoji: "🗝️", nameKey: "rewards.sticker_key", cost: UNCOMMON, minLevel: 0 },
  { id: "sticker_music_note", category: "sticker", tier: "uncommon", emoji: "🎵", nameKey: "rewards.sticker_music_note", cost: UNCOMMON, minLevel: 0 },
  { id: "sticker_butterfly", category: "sticker", tier: "uncommon", emoji: "🦋", nameKey: "rewards.sticker_butterfly", cost: UNCOMMON, minLevel: 0 },
  { id: "sticker_guitar", category: "sticker", tier: "uncommon", emoji: "🎸", nameKey: "rewards.sticker_guitar", cost: UNCOMMON, minLevel: 0 },
  { id: "sticker_puzzle", category: "sticker", tier: "uncommon", emoji: "🧩", nameKey: "rewards.sticker_puzzle", cost: UNCOMMON, minLevel: 0 },
  { id: "sticker_kite", category: "sticker", tier: "uncommon", emoji: "🪁", nameKey: "rewards.sticker_kite", cost: UNCOMMON, minLevel: 0 },

  { id: "sticker_trophy", category: "sticker", tier: "rare", emoji: "🏆", nameKey: "rewards.sticker_trophy", cost: RARE, minLevel: 2 },
  { id: "sticker_gem", category: "sticker", tier: "rare", emoji: "💎", nameKey: "rewards.sticker_gem", cost: RARE, minLevel: 2 },
  { id: "sticker_compass", category: "sticker", tier: "rare", emoji: "🧭", nameKey: "rewards.sticker_compass", cost: RARE, minLevel: 2 },
  { id: "sticker_shield", category: "sticker", tier: "rare", emoji: "🛡️", nameKey: "rewards.sticker_shield", cost: RARE, minLevel: 2 },
  { id: "sticker_crystal_ball", category: "sticker", tier: "rare", emoji: "🔮", nameKey: "rewards.sticker_crystal_ball", cost: RARE, minLevel: 2 },
  { id: "sticker_lightning", category: "sticker", tier: "rare", emoji: "⚡", nameKey: "rewards.sticker_lightning", cost: RARE, minLevel: 2 },
  { id: "sticker_telescope", category: "sticker", tier: "rare", emoji: "🔭", nameKey: "rewards.sticker_telescope", cost: RARE, minLevel: 2 },
  { id: "sticker_bullseye", category: "sticker", tier: "rare", emoji: "🎯", nameKey: "rewards.sticker_bullseye", cost: RARE, minLevel: 2 },

  { id: "sticker_medal", category: "sticker", tier: "epic", emoji: "🥇", nameKey: "rewards.sticker_medal", cost: EPIC, minLevel: 3 },
  { id: "sticker_flame_badge", category: "sticker", tier: "epic", emoji: "🔥", nameKey: "rewards.sticker_flame_badge", cost: EPIC, minLevel: 3 },
  { id: "sticker_diamond_badge", category: "sticker", tier: "epic", emoji: "💠", nameKey: "rewards.sticker_diamond_badge", cost: EPIC, minLevel: 3 },
  { id: "sticker_shooting_star", category: "sticker", tier: "epic", emoji: "🌠", nameKey: "rewards.sticker_shooting_star", cost: EPIC, minLevel: 3 },
  { id: "sticker_sparkler", category: "sticker", tier: "epic", emoji: "🎇", nameKey: "rewards.sticker_sparkler", cost: EPIC, minLevel: 3 },
  { id: "sticker_satellite", category: "sticker", tier: "epic", emoji: "🛰️", nameKey: "rewards.sticker_satellite", cost: EPIC, minLevel: 3 },
  { id: "sticker_volcano", category: "sticker", tier: "epic", emoji: "🌋", nameKey: "rewards.sticker_volcano", cost: EPIC, minLevel: 3 },

  { id: "sticker_crown", category: "sticker", tier: "legendary", emoji: "👑", nameKey: "rewards.sticker_crown", cost: LEGENDARY, minLevel: 4 },
  { id: "sticker_galaxy", category: "sticker", tier: "legendary", emoji: "🌌", nameKey: "rewards.sticker_galaxy", cost: LEGENDARY, minLevel: 4 },
  { id: "sticker_ufo", category: "sticker", tier: "legendary", emoji: "🛸", nameKey: "rewards.sticker_ufo", cost: LEGENDARY, minLevel: 4 },
  { id: "sticker_castle", category: "sticker", tier: "legendary", emoji: "🏰", nameKey: "rewards.sticker_castle", cost: LEGENDARY, minLevel: 4 },

  { id: "sticker_katana_emblem", category: "sticker", tier: "mythic", emoji: "🗡️✨", nameKey: "rewards.sticker_katana_emblem", cost: MYTHIC, minLevel: MAX_LEVEL },
  { id: "sticker_golden_scale", category: "sticker", tier: "mythic", emoji: "🐲✨", nameKey: "rewards.sticker_golden_scale", cost: MYTHIC, minLevel: MAX_LEVEL },
  { id: "sticker_moon_blade", category: "sticker", tier: "mythic", emoji: "🌙⚔️", nameKey: "rewards.sticker_moon_blade", cost: MYTHIC, minLevel: MAX_LEVEL },
  { id: "sticker_wolf_ember", category: "sticker", tier: "mythic", emoji: "🔥🐺", nameKey: "rewards.sticker_wolf_ember", cost: MYTHIC, minLevel: MAX_LEVEL },
  { id: "sticker_spirit_fox", category: "sticker", tier: "mythic", emoji: "🦊✨", nameKey: "rewards.sticker_spirit_fox", cost: MYTHIC, minLevel: MAX_LEVEL },

  // ==========================================================================
  // Special gifts - a third collection alongside characters and stickers:
  // trophies, charms and keepsakes rather than a character or a sticker, same
  // tiers and gates so the shop's "how special is this" reading stays
  // consistent across all three.
  // ==========================================================================
  { id: "gift_mystery_box", category: "gift", tier: "common", emoji: "🎁", nameKey: "rewards.gift_mystery_box", cost: COMMON, minLevel: 0 },
  { id: "gift_lucky_envelope", category: "gift", tier: "common", emoji: "🧧", nameKey: "rewards.gift_lucky_envelope", cost: COMMON, minLevel: 0 },
  { id: "gift_cupcake", category: "gift", tier: "common", emoji: "🧁", nameKey: "rewards.gift_cupcake", cost: COMMON, minLevel: 0 },
  { id: "gift_teddy", category: "gift", tier: "common", emoji: "🧸", nameKey: "rewards.gift_teddy", cost: COMMON, minLevel: 0 },

  { id: "gift_bronze_medal", category: "gift", tier: "uncommon", emoji: "🥉", nameKey: "rewards.gift_bronze_medal", cost: UNCOMMON, minLevel: 0 },
  { id: "gift_fanfare_horn", category: "gift", tier: "uncommon", emoji: "📯", nameKey: "rewards.gift_fanfare_horn", cost: UNCOMMON, minLevel: 0 },
  { id: "gift_magic_hat", category: "gift", tier: "uncommon", emoji: "🎩", nameKey: "rewards.gift_magic_hat", cost: UNCOMMON, minLevel: 0 },
  { id: "gift_music_box", category: "gift", tier: "uncommon", emoji: "🎶", nameKey: "rewards.gift_music_box", cost: UNCOMMON, minLevel: 0 },

  { id: "gift_silver_cup", category: "gift", tier: "rare", emoji: "🥈", nameKey: "rewards.gift_silver_cup", cost: RARE, minLevel: 2 },
  { id: "gift_treasure_map", category: "gift", tier: "rare", emoji: "🗺️", nameKey: "rewards.gift_treasure_map", cost: RARE, minLevel: 2 },
  { id: "gift_wish_lantern", category: "gift", tier: "rare", emoji: "🏮", nameKey: "rewards.gift_wish_lantern", cost: RARE, minLevel: 2 },

  { id: "gift_treasure_bag", category: "gift", tier: "epic", emoji: "💰", nameKey: "rewards.gift_treasure_bag", cost: EPIC, minLevel: 3 },
  { id: "gift_honor_ribbon", category: "gift", tier: "epic", emoji: "🎖️", nameKey: "rewards.gift_honor_ribbon", cost: EPIC, minLevel: 3 },
  { id: "gift_star_wand", category: "gift", tier: "epic", emoji: "🪄", nameKey: "rewards.gift_star_wand", cost: EPIC, minLevel: 3 },

  { id: "gift_trident_of_mastery", category: "gift", tier: "legendary", emoji: "🔱", nameKey: "rewards.gift_trident_of_mastery", cost: LEGENDARY, minLevel: 4 },
  { id: "gift_golden_violin", category: "gift", tier: "legendary", emoji: "🎻", nameKey: "rewards.gift_golden_violin", cost: LEGENDARY, minLevel: 4 },

  { id: "gift_celestial_seal", category: "gift", tier: "mythic", emoji: "🏯✨", nameKey: "rewards.gift_celestial_seal", cost: MYTHIC, minLevel: MAX_LEVEL },
  { id: "gift_infinity_orb", category: "gift", tier: "mythic", emoji: "♾️✨", nameKey: "rewards.gift_infinity_orb", cost: MYTHIC, minLevel: MAX_LEVEL },

  // ==========================================================================
  // Colour themes - equip one and the whole app changes colour (the
  // [data-theme] blocks at the end of app.css). `swatch` is only the preview
  // strip on the shop card. theme_classic is the app's own orange, free.
  // ==========================================================================
  { id: "theme_classic", category: "theme", tier: "common", emoji: "🧡", nameKey: "rewards.theme_classic", cost: 0, minLevel: 0, theme: "classic", swatch: ["#ff7043", "#ffb300"] },
  { id: "theme_ocean", category: "theme", tier: "uncommon", emoji: "🌊", nameKey: "rewards.theme_ocean", cost: UNCOMMON, minLevel: 0, theme: "ocean", swatch: ["#0288d1", "#26c6da"] },
  { id: "theme_forest", category: "theme", tier: "uncommon", emoji: "🌲", nameKey: "rewards.theme_forest", cost: UNCOMMON, minLevel: 0, theme: "forest", swatch: ["#43a047", "#c0ca33"] },
  { id: "theme_candy", category: "theme", tier: "rare", emoji: "🍭", nameKey: "rewards.theme_candy", cost: RARE, minLevel: 2, theme: "candy", swatch: ["#ec407a", "#4dd0e1"] },
  { id: "theme_space", category: "theme", tier: "epic", emoji: "🚀", nameKey: "rewards.theme_space", cost: EPIC, minLevel: 3, theme: "space", swatch: ["#7e57c2", "#ffca28"] },
  { id: "theme_rainbow", category: "theme", tier: "legendary", emoji: "🌈", nameKey: "rewards.theme_rainbow", cost: LEGENDARY, minLevel: 4, theme: "rainbow", swatch: ["#e53935", "#fdd835", "#43a047", "#1e88e5", "#8e24aa"] },
  { id: "theme_gold", category: "theme", tier: "mythic", emoji: "👑", nameKey: "rewards.theme_gold", cost: MYTHIC, minLevel: MAX_LEVEL, theme: "gold", swatch: ["#b8860b", "#ffd54f"] },

  // ==========================================================================
  // Treasures - never for sale. `chestOnly` items have no price (cost: null)
  // and are only ever found, one per day, in the treasure chest that opens
  // when all three daily quests are done (quests.js openChest()). The tier is
  // flavour: every unfound treasure is equally likely to turn up.
  // ==========================================================================
  { id: "treasure_seashell", category: "treasure", tier: "common", emoji: "🐚", nameKey: "rewards.treasure_seashell", cost: null, chestOnly: true },
  { id: "treasure_lucky_charm", category: "treasure", tier: "common", emoji: "🧿", nameKey: "rewards.treasure_lucky_charm", cost: null, chestOnly: true },
  { id: "treasure_scroll", category: "treasure", tier: "common", emoji: "📜", nameKey: "rewards.treasure_scroll", cost: null, chestOnly: true },
  { id: "treasure_wind_chime", category: "treasure", tier: "common", emoji: "🎐", nameKey: "rewards.treasure_wind_chime", cost: null, chestOnly: true },
  { id: "treasure_fossil", category: "treasure", tier: "uncommon", emoji: "🦴", nameKey: "rewards.treasure_fossil", cost: null, chestOnly: true },
  { id: "treasure_vase", category: "treasure", tier: "uncommon", emoji: "🏺", nameKey: "rewards.treasure_vase", cost: null, chestOnly: true },
  { id: "treasure_ice_crystal", category: "treasure", tier: "uncommon", emoji: "🧊", nameKey: "rewards.treasure_ice_crystal", cost: null, chestOnly: true },
  { id: "treasure_ring", category: "treasure", tier: "rare", emoji: "💍", nameKey: "rewards.treasure_ring", cost: null, chestOnly: true },
  { id: "treasure_pearl", category: "treasure", tier: "rare", emoji: "🦪", nameKey: "rewards.treasure_pearl", cost: null, chestOnly: true },
  { id: "treasure_dino", category: "treasure", tier: "epic", emoji: "🦕", nameKey: "rewards.treasure_dino", cost: null, chestOnly: true },
  { id: "treasure_statue", category: "treasure", tier: "epic", emoji: "🗿", nameKey: "rewards.treasure_statue", cost: null, chestOnly: true },
  { id: "treasure_planet", category: "treasure", tier: "legendary", emoji: "🪐", nameKey: "rewards.treasure_planet", cost: null, chestOnly: true },
];

/** Categories whose items can be *equipped*, and the state field holding the choice. */
const EQUIP_FIELDS = { avatar: "equippedAvatar", theme: "equippedTheme" };
const DEFAULT_THEME_ID = "theme_classic";

export const REWARD_MAP = Object.fromEntries(REWARD_DEFS.map((r) => [r.id, r]));

export function isUnlocked(id) {
  const def = REWARD_MAP[id];
  return !!def && (def.cost === 0 || state.unlockedRewards.has(id));
}

export function canAfford(id) {
  const def = REWARD_MAP[id];
  return !!def && !def.chestOnly && state.coins >= def.cost;
}

/** Has the child reached the level this item asks for? */
export function meetsLevelRequirement(id) {
  const def = REWARD_MAP[id];
  return !!def && highestLevelReached() >= (def.minLevel || 0);
}

/** The ultra item also needs every game at its own true max level. */
export function meetsMasteryRequirement(id) {
  return !REWARD_MAP[id]?.requiresMastery || allGamesAtTrueMax();
}

/** ... and every other reward in the shop already unlocked. */
export function meetsCollectionRequirement(id) {
  if (!REWARD_MAP[id]?.requiresMastery) return true;
  return REWARD_DEFS.every((d) => d.id === id || isUnlocked(d.id));
}

/** Everything that has to be true before a child can spend coins on this. */
export function canUnlock(id) {
  return (
    !!REWARD_MAP[id] &&
    !REWARD_MAP[id].chestOnly &&
    !isUnlocked(id) &&
    meetsLevelRequirement(id) &&
    meetsMasteryRequirement(id) &&
    meetsCollectionRequirement(id) &&
    canAfford(id)
  );
}

/**
 * Why a locked item can't be bought yet, in priority order - the reasons no
 * amount of saved coins fixes come first, so the shop shows the real
 * blocker instead of "too expensive" on something that was never for sale
 * yet anyway.
 * @returns {"chest"|"mastery"|"level"|"coins"|null} null means already
 *   unlocked; "chest" means it can only be found in a daily treasure chest.
 */
export function lockReason(id) {
  if (isUnlocked(id)) return null;
  if (REWARD_MAP[id]?.chestOnly) return "chest";
  if (!meetsMasteryRequirement(id) || !meetsCollectionRequirement(id)) return "mastery";
  if (!meetsLevelRequirement(id)) return "level";
  return "coins";
}

/**
 * Spend coins to unlock a reward. A character or a theme is equipped
 * immediately - the whole point of spending on one is seeing it right away.
 * Reaching the child's savings goal also clears the goal.
 * @returns {boolean} whether the unlock actually happened.
 */
export function unlockReward(id) {
  if (!canUnlock(id)) return false;
  const def = REWARD_MAP[id];
  if (!spendCoins(def.cost)) return false;
  state.unlockedRewards.add(id);
  const field = EQUIP_FIELDS[def.category];
  if (field) state[field] = id;
  if (state.goalReward === id) state.goalReward = null;
  saveCurrentProfile();
  emitChange();
  return true;
}

/** Whether items in this category can be equipped (characters and themes). */
export function isEquippable(id) {
  return !!EQUIP_FIELDS[REWARD_MAP[id]?.category];
}

/** Switch to a previously unlocked character or theme. */
export function equipReward(id) {
  const def = REWARD_MAP[id];
  const field = EQUIP_FIELDS[def?.category];
  if (!field || !isUnlocked(id)) return false;
  state[field] = id;
  saveCurrentProfile();
  emitChange();
  return true;
}

/** Whether `id` is the character or theme currently in effect. */
export function isEquipped(id) {
  const def = REWARD_MAP[id];
  if (def?.category === "avatar") return equippedAvatarId() === id;
  if (def?.category === "theme") return equippedThemeId() === id;
  return false;
}

/** The avatar id currently in effect - always a real, unlocked entry. */
export function equippedAvatarId() {
  return isUnlocked(state.equippedAvatar) ? state.equippedAvatar : DEFAULT_AVATAR_ID;
}

/** The emoji shown next to the player's name (sidebar, etc). */
export function equippedAvatarEmoji() {
  return REWARD_MAP[equippedAvatarId()]?.emoji ?? "🧑";
}

/** The theme id currently in effect - always a real, unlocked theme. */
export function equippedThemeId() {
  return isUnlocked(state.equippedTheme) && REWARD_MAP[state.equippedTheme].category === "theme"
    ? state.equippedTheme
    : DEFAULT_THEME_ID;
}

/**
 * Put the equipped theme on <html data-theme>, where app.css picks it up, and
 * tint the browser chrome to match. Cheap and idempotent, so the shell simply
 * calls it on every state change (a profile switch changes theme too).
 */
export function applyTheme(doc = globalThis.document) {
  if (!doc?.documentElement) return;
  const def = REWARD_MAP[equippedThemeId()];
  const root = doc.documentElement;
  if (def.theme === "classic") delete root.dataset.theme;
  else if (root.dataset.theme !== def.theme) root.dataset.theme = def.theme;
  doc.querySelector('meta[name="theme-color"]')?.setAttribute("content", def.swatch[0]);
}

// ---------------------------------------------------------------------------
// Savings goal - "what am I saving up for?", pinned from the shop and shown in
// the sidebar and on the home page, so every answer visibly moves towards it.
// ---------------------------------------------------------------------------

/** Whether `id` can be a goal: a real, still-locked item that is for sale. */
export function canBeGoal(id) {
  const def = REWARD_MAP[id];
  return !!def && !def.chestOnly && !isUnlocked(id);
}

/** Pin `id` as the goal, or unpin it if it already is. Returns the new goal id. */
export function toggleGoal(id) {
  if (!canBeGoal(id)) return state.goalReward;
  state.goalReward = state.goalReward === id ? null : id;
  goalAnnounced = false;
  saveCurrentProfile();
  emitChange();
  return state.goalReward;
}

/**
 * The current goal with its progress, or null when there is none (or it was
 * unlocked some other way in the meantime).
 * @returns {{def: object, pct: number, remaining: number, ready: boolean, reason: string|null}|null}
 */
export function goalInfo() {
  const id = state.goalReward;
  if (!id || !canBeGoal(id)) return null;
  const def = REWARD_MAP[id];
  const pct = Math.max(0, Math.min(100, Math.round((100 * state.coins) / def.cost)));
  return {
    def,
    pct,
    remaining: Math.max(0, def.cost - state.coins),
    ready: canUnlock(id),
    reason: lockReason(id),
  };
}

// Session-scoped on purpose: after a reload the "you can buy it now!" note
// may show once more, which is harmless, and it keeps the profile format
// free of a flag that means nothing outside this tab.
let goalAnnounced = false;

/**
 * True exactly once when the goal first becomes buyable - gameflow.js uses it
 * to tell the child the moment their saving has paid off.
 */
export function goalJustBecameReady() {
  const info = goalInfo();
  if (!info?.ready) {
    if (!info) goalAnnounced = false;
    return false;
  }
  if (goalAnnounced) return false;
  goalAnnounced = true;
  return true;
}
