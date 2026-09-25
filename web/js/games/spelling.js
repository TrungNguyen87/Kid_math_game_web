/**
 * Spellingstorm / Spelling Storm - spelling (round 18).
 *
 * Which way of writing it is right? In Dutch the levels run from the
 * groep 4 "hond or hont?" (make the word longer: honden) through ei/ij and
 * au/ou, one letter or two, -ig/-lijk/-heid, loan words, to the verb
 * spelling of groep 7 and 8: d, t or dt in the present tense, the past
 * tense and past participle ('t kofschip), and the famous traps (gebeurd /
 * gebeurt, "word jij" / "wordt hij"). In English: short words, digraphs,
 * magic e, tricky everyday words, suffixes, homophones and the words even
 * adults misspell.
 *
 * After a wrong answer the tip is the spelling rule for that level, in the
 * language being spelled.
 */
import { getLanguage, t } from "../i18n.js";
import { choice, shuffle } from "../rng.js";
import { SPELLING } from "../reading-data.js";
import { choiceAnswer, typedAnswerGame } from "./common.js";

const GAME_KEY = "spelling";

let last = null;

/**
 * One spelling question at `level`. Exported (with an explicit language)
 * so the arcade games can use the same words.
 */
export function spellingQuestion(level, lang = getLanguage()) {
  const clamped = Math.max(0, Math.min(7, level));
  const items = SPELLING[lang][clamped];
  let item = choice(items);
  if (item === last && items.length > 1) item = choice(items.filter((i) => i !== item));
  last = item;

  if (Array.isArray(item)) {
    const [right, ...wrong] = item;
    return { text: t("spelling.q_word"), answer: right, options: shuffle([right, ...wrong]), level: clamped };
  }
  const sentence = item.s.replace("___", "_____");
  return {
    text: item.v ? t("spelling.q_sentence_verb", { sentence, verb: item.v }) : t("spelling.q_sentence", { sentence }),
    answer: item.a,
    options: shuffle([item.a, ...item.w]),
    sentence,
    level: clamped,
  };
}

export function generate(level) {
  return spellingQuestion(level);
}

export const render = typedAnswerGame({
  gameKey: GAME_KEY,
  emoji: "🌪️",
  questionEmoji: "✏️",
  okIcon: "🌟",
  badIcon: "✏️",
  tipKey: "spelling.why_tip",
  generate,
  // Three across when the words are short, stacked when they are long
  // ("gerepareerde" does not fit a third of a phone screen).
  answer: (problem, api) =>
    choiceAnswer(problem, api, { columns: problem.options.some((o) => o.length > 10) ? 1 : 3 }),
  tipFor: (problem) => t(`spelling.tip_${problem.level}`),
});
