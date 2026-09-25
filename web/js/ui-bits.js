/**
 * Small shared UI vocabulary. Split out from ui.js so gameflow.js can use
 * levelLabel() without importing the whole game shell (which imports
 * gameflow itself).
 */
import { t } from "./i18n.js";
import { MAX_LEVEL, MIN_LEVEL, getMaxLevel } from "./state.js";

export const DIFFICULTY_KEYS = [
  "common.difficulty_warmup",
  "common.difficulty_easy",
  "common.difficulty_medium",
  "common.difficulty_hard",
  "common.difficulty_expert",
  "common.difficulty_master",
  // Levels 6 and 7 are groep 8 (round 18). Tafel Monster's old level 6 was
  // called "Monster-level"; it is now simply every game's level 6.
  "common.difficulty_champion",
  "common.difficulty_legend",
];

export function levelLabel(level) {
  const idx = Math.max(0, Math.min(DIFFICULTY_KEYS.length - 1, level));
  return t(DIFFICULTY_KEYS[idx]);
}

export const LEVELS = Array.from({ length: MAX_LEVEL - MIN_LEVEL + 1 }, (_, i) => MIN_LEVEL + i);

export function getLevels(gameKey = null) {
  const max = gameKey ? getMaxLevel(gameKey) : MAX_LEVEL;
  return Array.from({ length: max - MIN_LEVEL + 1 }, (_, i) => MIN_LEVEL + i);
}

/** Format a number the way the selected language writes it. */
export function formatDecimal(value, digits = null) {
  const text = digits == null ? String(Number(value)) : Number(value).toFixed(digits);
  return text;
}

/** How many `praise.N` lines i18n-data.js carries (1-based, both languages). */
export const PRAISE_COUNT = 16;

/**
 * One of a pool of cheerful lines for a correct answer. The per-game "✅
 * Monster defeated!" message is the same every time; after the twentieth
 * identical banner a child stops reading it. A rotating extra line keeps the
 * praise feeling like it is about *this* answer.
 */
export function randomPraise(rng = Math.random) {
  return t(`praise.${1 + Math.floor(rng() * PRAISE_COUNT)}`);
}

/** Where parents and children can send ideas and bug reports. */
export const FEEDBACK_EMAIL = "nxtrung87@gmail.com";

/**
 * A mailto: link with a subject and a short prompt already filled in, so a
 * parent can send feedback in two taps. `where` names the page it came from.
 */
export function feedbackHref(where = "") {
  const subject = t("feedback.mail_subject") + (where ? ` (${where})` : "");
  const body = t("feedback.mail_body");
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
