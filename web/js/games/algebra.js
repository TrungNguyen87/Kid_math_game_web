/**
 * Het X-Mysterie - solving equations, up to a two-unknown system.
 * Ported from pages/07_Het_X-Mysterie.py.
 *
 * Levels 6-7 (round 18) are groep 8 (and a peek at the brugklas): x on both
 * sides, brackets, "two numbers together" word puzzles, and a system where
 * one equation has a coefficient. Every answer is a positive whole number.
 */
import { t } from "../i18n.js";
import { choice, coinFlip, randInt, range } from "../rng.js";
import { balanceScaleSvg } from "../visuals.js";
import { numberAnswer, twoFieldAnswer, typedAnswerGame } from "./common.js";

const GAME_KEY = "algebra";

/** "3x", but plain "x" for a coefficient of 1. */
const term = (k) => (k === 1 ? "x" : `${k}x`);

export function generate(level) {
  let twoVar = false;
  let text;
  let answer;
  let visual;

  if (level === 0) {
    // Warm-up: addition only, small numbers - no subtraction yet.
    const a = randInt(1, 5);
    const x = randInt(1, 10);
    const b = a + x;
    text = t("algebra.q_add", { a, b });
    answer = { x };
    visual = [[`x + ${a}`, String(b)]];
  } else if (level === 1) {
    const a = randInt(1, 15);
    if (coinFlip()) {
      const x = randInt(1, 20);
      const b = a + x;
      text = t("algebra.q_add", { a, b });
      answer = { x };
      visual = [[`x + ${a}`, String(b)]];
    } else {
      const x = randInt(a + 1, a + 20);
      const b = x - a;
      text = t("algebra.q_sub", { a, b });
      answer = { x };
      visual = [[`x - ${a}`, String(b)]];
    }
  } else if (level === 2) {
    const a = randInt(2, 9);
    if (coinFlip()) {
      const x = randInt(2, 12);
      const b = a * x;
      text = t("algebra.q_mul", { a, b });
      answer = { x };
      visual = [[`${a} × x`, String(b)]];
    } else {
      const q = randInt(2, 12);
      const x = a * q;
      text = t("algebra.q_div", { a, q });
      answer = { x };
      visual = [[`x : ${a}`, String(q)]];
    }
  } else if (level === 3) {
    const a = randInt(2, 6);
    const x = randInt(1, 10);
    const ax = a * x;
    if (coinFlip()) {
      const b = randInt(1, 15);
      const c = ax + b;
      text = t("algebra.q_two_step_add", { a, b, c });
      visual = [[`${a}x + ${b}`, String(c)]];
    } else {
      const b = randInt(1, Math.max(1, ax));
      const c = ax - b;
      text = t("algebra.q_two_step_sub", { a, b, c });
      visual = [[`${a}x - ${b}`, String(c)]];
    }
    answer = { x };
  } else if (level === 4) {
    const a = randInt(2, 8);
    const x = choice(range(-10, 11).filter((v) => v !== 0));
    const b = randInt(1, 25);
    const ax = a * x;
    if (coinFlip()) {
      const c = ax + b;
      text = t("algebra.q_two_step_add", { a, b, c });
      visual = [[`${a}x + ${b}`, String(c)]];
    } else {
      const c = ax - b;
      text = t("algebra.q_two_step_sub", { a, b, c });
      visual = [[`${a}x - ${b}`, String(c)]];
    }
    answer = { x };
  } else if (level === 6) {
    const x = randInt(1, 12);
    if (coinFlip()) {
      // x on both sides: ax + b = cx + d.
      const a = randInt(3, 9);
      const c = randInt(1, a - 1);
      const b = randInt(1, 20);
      const d = (a - c) * x + b;
      const left = `${term(a)} + ${b}`;
      const right = `${term(c)} + ${d}`;
      text = t("algebra.q_equation", { left, right });
      visual = [[left, right]];
    } else {
      // Brackets: a(x + b) = c.
      const a = randInt(2, 6);
      const b = randInt(1, 9);
      const c = a * (x + b);
      const left = `${a}(x + ${b})`;
      text = t("algebra.q_equation", { left, right: c });
      visual = [[left, String(c)]];
    }
    answer = { x };
  } else if (level === 7) {
    if (coinFlip()) {
      // "Two numbers add up to s; one is k times the other" - the smaller one is x.
      const x = randInt(3, 25);
      const k = randInt(2, 5);
      const s = x * (k + 1);
      text = t("algebra.q_word_times", { s, k });
      answer = { x };
      visual = [[`x + ${k}x`, String(s)]];
    } else {
      // kx + y = s and x + y = t: subtract to get (k - 1)x = s - t.
      twoVar = true;
      const x = randInt(2, 15);
      const y = randInt(1, 15);
      const k = randInt(2, 4);
      const s = k * x + y;
      const tt = x + y;
      text = t("algebra.q_system_k", { k, s, t: tt });
      answer = { x, y };
      visual = [
        [`${k}x + y`, String(s)],
        ["x + y", String(tt)],
      ];
    }
  } else {
    twoVar = true;
    const x = randInt(2, 20);
    const y = randInt(1, x - 1);
    const s = x + y;
    const d = x - y;
    text = t("algebra.q_system", { s, d });
    answer = { x, y };
    visual = [
      ["x + y", String(s)],
      ["x - y", String(d)],
    ];
  }

  // Levels 4-5 can have a negative x; the groep 8 levels are all positive but
  // keep the sign key so the pad does not change shape between levels.
  return { text, answer, visual, twoVar, negative: level >= 4, answerLabel: t("algebra.x_label") };
}

export const render = typedAnswerGame({
  gameKey: GAME_KEY,
  emoji: "🕵️",
  questionEmoji: "🕵️",
  okIcon: "🕵️",
  badIcon: "🧩",
  tipKey: "algebra.why_tip",
  generate,
  visuals: (problem) => problem.visual.map(([left, right]) => balanceScaleSvg(left, right)),
  answer: (problem, api) => {
    if (!problem.twoVar) {
      // Logged as "x=7" rather than "7", matching what the Streamlit version
      // wrote, so a parent's older CSV export and a new one read alike.
      const widget = numberAnswer(
        { ...problem, answer: problem.answer.x, answerDisplay: `x=${problem.answer.x}` },
        api,
        {},
      );
      const gradeNumber = widget.grade;
      widget.grade = () => {
        const graded = gradeNumber();
        return graded && { ...graded, studentAnswer: `x=${graded.studentAnswer}` };
      };
      return widget;
    }
    return twoFieldAnswer(problem, api, {
      labelA: t("algebra.x_label"),
      labelB: t("algebra.y_label"),
      negative: true,
      gradeFn: (x, y) => ({
        isCorrect: x === problem.answer.x && y === problem.answer.y,
        studentAnswer: `x=${x}, y=${y}`,
        correctAnswerDisplay: `x=${problem.answer.x}, y=${problem.answer.y}`,
      }),
    });
  },
});
