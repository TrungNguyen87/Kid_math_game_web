/**
 * Woordenschat Wizard / Word Wizard - vocabulary (round 18).
 *
 * The levels follow how word knowledge grows at school: picture words, then
 * opposites, words that mean the same, the word that fits a sentence, what a
 * harder word means, and in groep 8 sayings (uitdrukkingen) and proverbs
 * (spreekwoorden) - the figurative language the doorstroomtoets loves.
 *
 * Content lives in reading-data.js (VOCAB); the Dutch and English lists are
 * separate lists of real words in each language, not translations.
 */
import { getLanguage, t } from "../i18n.js";
import { choice, sample, shuffle } from "../rng.js";
import { VOCAB } from "../reading-data.js";
import { choiceAnswer, typedAnswerGame } from "./common.js";

const GAME_KEY = "woorden";

let last = null;

/**
 * One vocabulary question at `level`, in the current language. Exported
 * (with an explicit language) so the arcade games can ask the same
 * questions.
 */
export function vocabQuestion(level, lang = getLanguage()) {
  const items = VOCAB[lang][Math.max(0, Math.min(7, level))];
  let item = choice(items);
  // Never the same word twice in a row.
  if (item === last && items.length > 1) item = choice(items.filter((i) => i !== item));
  last = item;

  // Picture words take their wrong options from the other picture words.
  const wrong = item.w ?? sample(items.filter((i) => i !== item).map((i) => i.a), 2);
  const options = shuffle([item.a, ...wrong]);
  const shown = item.k === "ctx" ? item.x.replace("___", "_____") : item.x;
  return {
    text: t(`woorden.q_${item.k}`, { x: shown }),
    answer: item.a,
    options,
    kind: item.k,
    columns: options.some((o) => o.length > 18) ? 1 : options.length === 4 ? 2 : null,
  };
}

export function generate(level) {
  return vocabQuestion(level);
}

export const render = typedAnswerGame({
  gameKey: GAME_KEY,
  emoji: "🧙",
  questionEmoji: "🔤",
  okIcon: "✨",
  badIcon: "📖",
  tipKey: "woorden.why_tip",
  generate,
  answer: (problem, api) => choiceAnswer(problem, api),
  tipFor: (problem) => t(`woorden.tip_${problem.kind}`),
});
