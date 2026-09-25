/**
 * Leerhapjes / Learning Bites - the rules (round 18). The page is
 * pages/leerhapjes.js; the lessons themselves are in bites-data.js.
 *
 * A bite is passed with 2 of its 3 questions right and becomes a card in the
 * album; 3 of 3 makes it a gold card. The coins follow the same rule as
 * everything else since round 15 - pay once, never for repeating:
 *
 *   - BITE_COINS the first time a bite's card is collected;
 *   - GOLD_BONUS the first time it turns gold;
 *   - DAILY_BONUS on top when the collected bite was the bite of the day.
 *
 * Repeating a collected bite is always allowed and always worth doing, it
 * just pays nothing more. All bite coins are gifts (grantBonusCoins()), not
 * score: the score and the buddy stay "points earned by answering".
 */
import { BITES, BITE_MAP } from "./bites-data.js";
import { dayKey, grantBonusCoins, saveCurrentProfile, state } from "./state.js";

export const BITE_COINS = 15;
export const GOLD_BONUS = 5;
export const DAILY_BONUS = 10;
/** Right answers (of 3) needed to collect a card, and for a gold one. */
export const PASS_MARK = 2;
export const GOLD_MARK = 3;

/** A small, stable string hash (FNV-1a), as in quests.js. */
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 0 (not collected), 1 (card) or 2 (gold card). */
export function biteStars(id) {
  return state.bites[id]?.stars ?? 0;
}

export function collectedCount() {
  return BITES.filter((bite) => biteStars(bite.id) > 0).length;
}

export function goldCount() {
  return BITES.filter((bite) => biteStars(bite.id) >= 2).length;
}

/** Whether a bite's card was first collected on `day` ("YYYY-MM-DD"). */
function collectedOn(id, day) {
  const at = state.bites[id]?.at;
  return !!at && dayKey(new Date(at)) === day;
}

/**
 * The bite of the day: chosen among the bites this child had not collected
 * yet when the day began (so it is always something new), or among all of
 * them once the album is full.
 *
 * "When the day began" matters: picking among the bites open *right now*
 * made the choice jump to another bite the moment the child collected any
 * card during the day, taking the promised daily bonus with it. A bite
 * collected today stays in today's pool, so the pick holds until midnight.
 */
export function biteOfTheDay(now = new Date()) {
  const today = dayKey(now);
  const open = BITES.filter((bite) => biteStars(bite.id) === 0 || collectedOn(bite.id, today));
  const pool = open.length ? open : BITES;
  return pool[hash(`${today}#bite`) % pool.length];
}

/**
 * Record a finished bite quiz and pay whatever it newly earned.
 * @param {string} id
 * @param {number} right  answers right, 0-3
 * @returns {{stars: number, coins: number, newCard: boolean, newGold: boolean}}
 */
export function finishBite(id, right, now = new Date()) {
  if (!BITE_MAP[id]) return { stars: 0, coins: 0, newCard: false, newGold: false };
  const earned = right >= GOLD_MARK ? 2 : right >= PASS_MARK ? 1 : 0;
  const before = biteStars(id);
  // The pick is stable for the day (see biteOfTheDay()), so asking before or
  // after recording makes no difference; before reads more plainly.
  const wasBiteOfTheDay = biteOfTheDay(now).id === id;
  let coins = 0;
  const newCard = before === 0 && earned >= 1;
  const newGold = before < 2 && earned === 2;
  if (newCard) coins += BITE_COINS + (wasBiteOfTheDay ? DAILY_BONUS : 0);
  if (newGold) coins += GOLD_BONUS;
  // `at` is when the card was first collected; turning it gold later keeps
  // that date (biteOfTheDay() relies on it).
  if (earned > before) {
    state.bites[id] = { stars: earned, at: before === 0 ? new Date(now).toISOString() : state.bites[id].at };
  }
  if (coins) grantBonusCoins(coins);
  saveCurrentProfile();
  return { stars: Math.max(before, earned), coins, newCard, newGold };
}
