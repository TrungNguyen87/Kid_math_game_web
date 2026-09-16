/**
 * Race Mode - the engine, with no DOM in it.
 *
 * Replaces the old async "challenge code" design (compete.js): that model
 * could only ever have one person actually playing at a time - solo, or
 * passing the device around, or racing a saved-and-forwarded copy of
 * someone else's run. This engine backs a real race instead: several
 * players join the same room (an online room via a short code, or a local
 * roster on one shared device) and answer the *same* questions side by
 * side, at the same time.
 *
 * Every question is multiple choice - a tap picks and submits an answer in
 * one motion, so there is nothing left for a separate "check" button to do
 * (the rest of the app already made this move once, in Bliksemronde).
 *
 * A race also no longer means "arithmetic only": `category` picks which
 * kind of question each round draws from (lightning arithmetic, times
 * tables, fractions, percentages, or a mix of all four), so the same race
 * can move between game types round to round.
 *
 * This module is deliberately pure and DOM-free so it can run identically
 * in the browser (web/js/pages/compete.js) and under plain Node in the
 * room server (race-server.js) - one source of truth for what counts as a
 * correct answer and how many points it is worth.
 */
import { choice, randInt, shuffled } from "./rng.js";

export const ROUND_SECONDS = 15; // per question, unchanged from the old race
export const ROUND_CHOICES = [5, 10, 15];
export const DEFAULT_ROUNDS = 10;
export const MAX_LEVEL = 5;
export const MAX_NAME_LENGTH = 24;
export const MIN_PLAYERS_ONLINE = 2; // an online room needs someone to race
export const MAX_PLAYERS = 6; // keeps a side-by-side grid and a room list readable

export const RACE_MAX_POINTS = 100; // answered instantly
export const RACE_MIN_POINTS = 10; // answered correctly right at the buzzer

export const CATEGORIES = ["bliksem", "tafels", "breuken", "procenten", "all"];

function clampLevel(level) {
  const n = Math.round(Number(level));
  return Math.max(0, Math.min(MAX_LEVEL, Number.isFinite(n) ? n : 0));
}

// ---------------------------------------------------------------------------
// Multiple-choice helper - one correct answer plus up to three distractors,
// shuffled together. Shared by every category below.
// ---------------------------------------------------------------------------

export function makeChoices(answer, distractors = []) {
  const choices = new Set([answer]);
  for (const d of shuffled(distractors)) {
    if (choices.size >= 4) break;
    if (d !== answer && d !== null && d !== undefined && !choices.has(d)) {
      choices.add(d);
    }
  }
  const numeric = typeof answer === "number";
  let offset = 1;
  while (choices.size < 4) {
    if (numeric) {
      const alt = offset % 2 === 0 ? answer + offset : Math.max(0, answer - offset);
      if (!choices.has(alt)) choices.add(alt);
      offset += 1;
    } else {
      choices.add(`?${choices.size}`);
    }
  }
  return shuffled([...choices]);
}

// ---------------------------------------------------------------------------
// Category: bliksem - mixed +, -, x, : arithmetic. Same operand ranges the
// original race used, ported unchanged.
// ---------------------------------------------------------------------------

function bliksemLevelRanges(level) {
  const table = [
    { ops: ["+", "-"], add: [1, 10] },
    { ops: ["+", "-", "x"], add: [2, 15], mul: [2, 6] },
    { ops: ["+", "-", "x"], add: [5, 25], mul: [3, 9] },
    { ops: ["+", "-", "x", ":"], add: [10, 40], mul: [3, 12], div: [2, 9] },
    { ops: ["+", "-", "x", ":"], add: [15, 60], mul: [4, 15], div: [3, 11] },
    { ops: ["+", "-", "x", ":"], add: [30, 99], mul: [6, 20], div: [4, 13] },
  ];
  return table[clampLevel(level)];
}

function generateBliksemTriple(level) {
  const r = bliksemLevelRanges(level);
  const op = choice(r.ops);
  if (op === "+") return [randInt(...r.add), randInt(...r.add), "+"];
  if (op === "-") {
    let a = randInt(...r.add);
    let b = randInt(...r.add);
    if (a < b) [a, b] = [b, a];
    return [a, b, "-"];
  }
  if (op === "x") return [randInt(...r.mul), randInt(...r.mul), "x"];
  // ":" - a is the quotient (the actual answer), b the divisor; the text
  // shown is their product divided by b, so the result is always whole.
  return [randInt(...r.div), randInt(...r.div), ":"];
}

export function questionAnswer(a, b, op) {
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "x") return a * b;
  return a; // ":"
}

export function questionText(a, b, op) {
  if (op === "+") return `${a} + ${b}`;
  if (op === "-") return `${a} − ${b}`;
  if (op === "x") return `${a} × ${b}`;
  return `${a * b} : ${b}`;
}

function generateBliksemProblem(level) {
  const [a, b, op] = generateBliksemTriple(level);
  const answer = questionAnswer(a, b, op);
  const text = questionText(a, b, op);

  const pool = [answer + 1, answer - 1, answer + 2, answer - 2, answer + 10, answer - 10];
  if (op === "x") pool.push(a * (b + 1), a * (b - 1), (a + 1) * b, a + b);
  else if (op === ":") pool.push(answer + b, Math.max(1, answer - b), a * b);

  const options = makeChoices(answer, pool.filter((v) => v >= 0));
  return { category: "bliksem", text, answer, answerDisplay: String(answer), options: options.map(String) };
}

// ---------------------------------------------------------------------------
// Category: tafels - times tables.
// ---------------------------------------------------------------------------

function tafelOperands(level) {
  if (level <= 1) return [randInt(1, 6), randInt(2, 6)];
  if (level <= 3) return [randInt(2, 10), randInt(2, 10)];
  return [randInt(3, 12), randInt(3, 12)];
}

function generateTafelsProblem(level) {
  const [a, b] = tafelOperands(level);
  const answer = a * b;
  const text = `${a} × ${b}`;
  const pool = [
    answer + a,
    answer - a,
    answer + b,
    answer - b,
    answer + 2,
    answer - 2,
    answer + 10,
    answer - 10,
  ].filter((v) => v >= 0);
  const options = makeChoices(answer, pool);
  return { category: "tafels", text, answer, answerDisplay: String(answer), options: options.map(String) };
}

// ---------------------------------------------------------------------------
// Category: breuken - adding two fractions that already share a denominator,
// so the sum never needs simplifying to stay a fair multiple-choice answer.
// ---------------------------------------------------------------------------

function generateBreukenProblem(level) {
  const denPool = level <= 2 ? [2, 3, 4, 5] : [2, 3, 4, 5, 6, 8, 10];
  const den = choice(denPool);
  const num1 = randInt(1, den - 1);
  const num2 = randInt(1, den - num1);
  const sum = num1 + num2;
  const text = `${num1}/${den} + ${num2}/${den}`;
  const answerDisplay = `${sum}/${den}`;
  const pool = [
    `${Math.max(1, sum - 1)}/${den}`,
    `${Math.min(den, sum + 1)}/${den}`,
    `${sum}/${den * 2}`,
    `${num1 + num2}/${den + den}`,
    `${Math.min(den, sum + 2)}/${den}`,
  ];
  const options = makeChoices(answerDisplay, pool);
  return { category: "breuken", text, answer: answerDisplay, answerDisplay, options };
}

// ---------------------------------------------------------------------------
// Category: procenten - percentage of a whole number. The connector word
// ("van" / "of") is language-specific, so this hands back the pieces
// (`textKey` + `textVars`) instead of a hardcoded string - the page looks
// them up through the normal i18n table, the same as every other question
// in the app.
// ---------------------------------------------------------------------------

function generateProcentenProblem(level) {
  const pctPool = level <= 2 ? [10, 25, 50] : [10, 20, 25, 50, 75];
  const basePool = level <= 2 ? [20, 40, 50, 100] : [20, 40, 50, 60, 80, 100, 200];
  const pct = choice(pctPool);
  const base = choice(basePool);
  const answer = (pct * base) / 100;
  const pool = [answer + 5, Math.max(1, answer - 5), answer * 2, Math.max(1, answer / 2), answer + 10, Math.max(1, answer - 10)];
  const options = makeChoices(answer, pool.filter((v) => Number.isInteger(v) && v >= 0));
  return {
    category: "procenten",
    textKey: "race.pct_of",
    textVars: { pct, base },
    answer,
    answerDisplay: String(answer),
    options: options.map(String),
  };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function generateRaceProblem(category, level) {
  let cat = category;
  if (cat === "all") cat = choice(["bliksem", "tafels", "breuken", "procenten"]);
  if (cat === "tafels") return generateTafelsProblem(level);
  if (cat === "breuken") return generateBreukenProblem(level);
  if (cat === "procenten") return generateProcentenProblem(level);
  return generateBliksemProblem(level);
}

export function generateRaceQuestions(category, level, count = DEFAULT_ROUNDS) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(generateRaceProblem(category, level));
  return out;
}

// ---------------------------------------------------------------------------
// Scoring - faster is worth more, wrong is worth nothing.
// ---------------------------------------------------------------------------

/**
 * @param {boolean} isCorrect
 * @param {number} elapsedMs  time from the question appearing to the answer
 * @returns {number} 0 for a wrong or timed-out answer; otherwise a score
 *   that falls linearly from RACE_MAX_POINTS (instant) down to
 *   RACE_MIN_POINTS (right as the clock hit zero).
 */
export function racePoints(isCorrect, elapsedMs) {
  if (!isCorrect) return 0;
  const seconds = Math.max(0, Math.min(ROUND_SECONDS, elapsedMs / 1000));
  const fraction = 1 - seconds / ROUND_SECONDS;
  return Math.round(RACE_MIN_POINTS + (RACE_MAX_POINTS - RACE_MIN_POINTS) * fraction);
}

// ---------------------------------------------------------------------------
// Rooms & standings
// ---------------------------------------------------------------------------

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export function generateRoomCode() {
  let code = "";
  for (let i = 0; i < 5; i++) code += choice([...ROOM_CODE_CHARS]);
  return code;
}

export function cleanPlayerName(name, fallback = "Player") {
  const n = String(name ?? "").trim().slice(0, MAX_NAME_LENGTH);
  return n || fallback;
}

/** Ranked standings, highest score first; ties go to whoever joined first. */
export function rankPlayers(players) {
  return players
    .map((player, index) => ({ player, index }))
    .sort((a, b) => b.player.score - a.player.score || a.index - b.index)
    .map(({ player, index }, i) => ({ ...player, index, rank: i + 1 }));
}
