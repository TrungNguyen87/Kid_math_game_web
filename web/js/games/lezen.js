/**
 * Leesdetective / Reading Detective - reading comprehension (round 18).
 *
 * A short text, then three questions about it. The texts grow with the
 * levels: at 0-1 a few sentences about a pet or a day out (built from
 * templates, so they never run out), from 2 onwards hand-written stories,
 * news items, instructions, letters and opinion pieces, up to the kind of
 * text the groep 8 doorstroomtoets uses.
 *
 * Every question names the reading *skill* it trains - finding it in the
 * text, order, what "she" or "that" refers to, signal words, main idea,
 * fact or opinion, reading between the lines, why the text was written -
 * and a wrong answer explains that skill. That is the micro-learning part:
 * a child learns how to read a text, not only this text.
 *
 * The text stays on screen for all three questions, and counts towards the
 * "words read" counter once, when it is first shown.
 */
import { getLanguage, t } from "../i18n.js";
import { choice, sample, shuffle } from "../rng.js";
import { escapeHtml } from "../markdown.js";
import { PASSAGES, STORY_PARTS, wordCount } from "../reading-data.js";
import { choiceAnswer, typedAnswerGame } from "./common.js";

const GAME_KEY = "lezen";

// The text being read and its questions still to come. Module-level on
// purpose: the shared game loop asks for one problem at a time, and the
// next question has to be about the same text.
let queue = [];
let queueKey = null;
const recentTexts = [];

const fill = (template, vars) => template.replace(/\{(\w+)\}/g, (whole, name) => vars[name] ?? whole);

/** An answer plus two other options from the same list. */
function optionsFrom(list, answer) {
  return shuffle([answer, ...sample(list.filter((item) => item !== answer), 2)]);
}

/** Levels 0-1: a text built from template parts, with its three questions. */
function templateText(level, lang) {
  const parts = STORY_PARTS[lang];
  const vars = {
    name: choice(parts.names),
    pet: choice(parts.pets),
    color: choice(parts.colors),
    petName: choice(parts.petNames),
    day: choice(parts.days),
    companion: choice(parts.companions),
    food: choice(parts.foods),
  };
  const placeIndex = Math.floor(Math.random() * parts.places.length);
  vars.place = parts.places[placeIndex];
  vars.activity = parts.activities[placeIndex];

  const story = level === 0 ? parts.pet : parts.trip;
  const text = fill(story.text, vars);
  const picked = level === 0 ? story.questions : sample(story.questions, 3);
  return {
    title: t(level === 0 ? "lezen.title_pet" : "lezen.title_trip", { name: vars.name }),
    text,
    questions: picked.map(([listName, varName, question]) => ({
      type: "who",
      q: fill(question, vars),
      a: vars[varName],
      options: optionsFrom(parts[listName], vars[varName]),
    })),
  };
}

/** Levels 2-7: one of the hand-written texts, not one of the last few shown. */
function writtenText(level, lang) {
  const pool = PASSAGES.filter((p) => p.level === level);
  const fresh = pool.filter((p) => !recentTexts.includes(p));
  const passage = choice(fresh.length ? fresh : pool);
  recentTexts.push(passage);
  if (recentTexts.length > 3) recentTexts.shift();
  return {
    title: passage.title[lang],
    text: passage.text[lang],
    questions: passage.questions.map((question) => {
      const item = question[lang];
      return { type: question.type, q: item.q, a: item.a, options: shuffle([item.a, ...item.w]) };
    }),
  };
}

function startText(level, lang) {
  const source = level <= 1 ? templateText(level, lang) : writtenText(level, lang);
  const words = wordCount(source.text);
  queue = source.questions.map((question, index) => ({
    title: source.title,
    passage: source.text,
    index,
    total: source.questions.length,
    // Counted once per text: with the first question.
    words: index === 0 ? words : 0,
    ...question,
  }));
  queueKey = `${level}:${lang}`;
}

export function generate(level) {
  const lang = getLanguage();
  if (!queue.length || queueKey !== `${level}:${lang}`) startText(level, lang);
  const item = queue.shift();
  const long = item.options.some((option) => option.length > 18);
  return {
    text: item.q,
    answer: item.a,
    options: item.options,
    skill: item.type,
    title: item.title,
    passage: item.passage,
    index: item.index,
    total: item.total,
    words: item.words,
    // Sentence answers read better stacked, one per row.
    columns: long ? 1 : null,
  };
}

/** The text itself, as a card above the question. */
function passageCard(problem) {
  return `<article class="kmg-passage">
    <header class="kmg-passage-head">
      <span class="kmg-passage-title">📖 ${escapeHtml(problem.title)}</span>
      <span class="kmg-passage-count">${escapeHtml(t("lezen.question_of", { n: problem.index + 1, total: problem.total }))}</span>
    </header>
    <p class="kmg-passage-text">${escapeHtml(problem.passage)}</p>
    <footer class="kmg-skillchip">🔎 ${escapeHtml(t(`lezen.skill_${problem.skill}`))}</footer>
  </article>`;
}

export const render = typedAnswerGame({
  gameKey: GAME_KEY,
  emoji: "🔍",
  questionEmoji: "🕵️‍♀️",
  okIcon: "📚",
  badIcon: "🔎",
  tipKey: "lezen.why_tip",
  generate,
  visuals: (problem) => [passageCard(problem)],
  answer: (problem, api) => choiceAnswer(problem, api),
  tipFor: (problem) => t(`lezen.tip_${problem.skill}`),
  settleExtras: (problem) => ({ wordsRead: problem.words }),
});
