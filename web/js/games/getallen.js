/**
 * Getallen Universum - negative numbers, jumps on the number line, long
 * multiplication and division, and one-decimal arithmetic.
 * Ported from pages/10_Getallen_Universum.py.
 *
 * Levels 6-7 (round 18) are groep 8: the order of operations
 * (bewerkingsvolgorde - brackets, powers, x and :, then + and -), rounding
 * big numbers, and at level 7 multiplying and dividing negative numbers,
 * squares, cubes and square roots.
 */
import { getLanguage, t } from "../i18n.js";
import { choice, coinFlip, randInt, range } from "../rng.js";
import { numberLineSvg } from "../visuals.js";
import { fmtSigned, formatNum1, numberAnswer, twoFieldAnswer, typedAnswerGame } from "./common.js";

const GAME_KEY = "getallen";

/**
 * One order-of-operations expression, as display text plus its value. The
 * text uses the school symbols (× and :); every value is a positive whole
 * number. Exported so the tests can re-evaluate the text independently.
 */
export function orderOfOperations() {
  const kind = choice(["add_mul", "mul_sub", "brackets_mul", "sub_div", "mul_brackets", "square_add"]);
  const a = randInt(2, 12);
  const b = randInt(2, 9);
  const c = randInt(2, 9);
  if (kind === "add_mul") return { text: `${a} + ${b} × ${c}`, value: a + b * c };
  if (kind === "mul_sub") {
    const small = randInt(1, a * b - 1);
    return { text: `${a} × ${b} − ${small}`, value: a * b - small };
  }
  if (kind === "brackets_mul") return { text: `(${a} + ${b}) × ${c}`, value: (a + b) * c };
  if (kind === "sub_div") {
    const quotient = randInt(2, 9);
    const big = quotient * c + randInt(1, 30);
    return { text: `${big} − ${quotient * c} : ${c}`, value: big - quotient };
  }
  if (kind === "mul_brackets") {
    const hi = c + randInt(1, 9);
    return { text: `${a} × (${hi} − ${c})`, value: a * (hi - c) };
  }
  return { text: `${b}² + ${a}`, value: b * b + a };
}

/** Level 7's negative numbers, powers and roots. Negative answers allowed. */
export function powersAndNegatives() {
  const kind = choice(["neg_mul", "neg_div", "neg_square", "sqrt", "cube"]);
  if (kind === "neg_mul") {
    const a = randInt(2, 12);
    const b = randInt(2, 9);
    const sa = coinFlip() ? -a : a;
    const sb = sa > 0 || coinFlip() ? -b : b;
    return { text: `${fmtSigned(sa)} × ${fmtSigned(sb)}`, value: sa * sb };
  }
  if (kind === "neg_div") {
    const q = randInt(2, 12);
    const d = randInt(2, 9);
    const sq = coinFlip() ? -q : q;
    const sd = coinFlip() ? -d : d;
    return { text: `${fmtSigned(sq * sd)} : ${fmtSigned(sd)}`, value: sq };
  }
  if (kind === "neg_square") {
    const a = randInt(2, 12);
    return { text: `(${-a})²`, value: a * a };
  }
  if (kind === "sqrt") {
    const a = randInt(2, 15);
    return { text: `√${a * a}`, value: a };
  }
  const a = randInt(2, 5);
  return { text: `${a}³`, value: a * a * a };
}

export function generate(level) {
  const lang = getLanguage();
  let answerKind = "int"; // "int", "decimal1" or "two_part"
  let visual = null;
  let text;
  let answer;

  if (level === 0 || level === 1) {
    const bound = level === 0 ? 5 : 15;
    const pool = range(-bound, bound + 1).filter((v) => v !== 0);
    const a = choice(pool);
    const b = choice(pool);
    if (coinFlip()) {
      text = t("getallen.q_negative_add", { a: fmtSigned(a), b: fmtSigned(b) });
      answer = a + b;
    } else {
      text = t("getallen.q_negative_sub", { a: fmtSigned(a), b: fmtSigned(b) });
      answer = a - b;
    }
    const span = level === 0 ? 10 : 20;
    visual = numberLineSvg(Math.min(-span, a - 5), Math.max(span, a + 5), [[a, "start"]]);
  } else if (level === 2) {
    const a = randInt(-10, 10);
    const step = randInt(2, 5);
    const jumps = randInt(2, 5);
    const direction = choice(["right", "left"]);
    const sign = direction === "right" ? 1 : -1;
    answer = a + sign * step * jumps;
    text = t("getallen.q_jump", {
      a,
      jumps,
      step,
      direction: t(`getallen.direction_${direction}`),
    });
    const lo = Math.min(-25, a - step * jumps - 5);
    const hi = Math.max(25, a + step * jumps + 5);
    visual = numberLineSvg(lo, hi, [[a, "start"]]);
  } else if (level === 3) {
    const a = randInt(11, 99);
    const b = randInt(11, 99);
    text = t("getallen.q_long_mult", { a, b });
    answer = a * b;
  } else if (level === 4) {
    const divisor = randInt(3, 12);
    const quotient = randInt(4, 20);
    const remainder = randInt(0, divisor - 1);
    const dividend = divisor * quotient + remainder;
    text = t("getallen.q_long_div", { dividend, divisor });
    answer = { q: quotient, r: remainder };
    answerKind = "two_part";
  } else if (level === 6) {
    if (coinFlip()) {
      const expr = orderOfOperations();
      text = t("getallen.q_order", { expr: expr.text });
      answer = expr.value;
    } else {
      const unit = choice([10, 100, 1000]);
      const n = randInt(unit === 1000 ? 1001 : 101, unit === 10 ? 999 : 99999);
      text = t("getallen.q_round", { n, place: t(`getallen.round_${unit}`) });
      answer = Math.round(n / unit) * unit;
    }
  } else if (level === 7) {
    const expr = powersAndNegatives();
    text = t("getallen.q_calc", { expr: expr.text });
    answer = expr.value;
  } else {
    answerKind = "decimal1";
    // Both branches are built from a whole number of tenths and divided by 10
    // exactly once, so the answer lands on a clean single decimal instead of
    // something like 5.699999999999999.
    if (coinFlip()) {
      const tenths = randInt(11, 95);
      const b = randInt(2, 9);
      text = t("getallen.q_decimal_mult", { a: formatNum1(tenths / 10, lang), b });
      answer = (tenths * b) / 10;
    } else {
      const b = randInt(2, 9);
      const quotientTenths = randInt(11, 95);
      const dividendVal = (quotientTenths * b) / 10;
      text = t("getallen.q_decimal_div", { dividend: formatNum1(dividendVal, lang), b });
      answer = quotientTenths / 10;
    }
  }

  const problem = { text, answer, answerKind, visual };
  if (answerKind === "decimal1") {
    problem.decimal = true;
    problem.negative = false;
    problem.tolerance = 0.05;
    problem.answerDisplay = formatNum1(answer, lang);
    problem.answerLabel = t("getallen.answer_label");
  } else if (answerKind === "int") {
    problem.negative = level <= 2 || level === 7;
    problem.answerLabel = t("getallen.answer_label");
  }
  return problem;
}

export const render = typedAnswerGame({
  gameKey: GAME_KEY,
  emoji: "🔢",
  questionEmoji: "🔢",
  okIcon: "🛰️",
  badIcon: "☄️",
  tipKey: "getallen.why_tip",
  generate,
  visuals: (problem) => (problem.visual ? [problem.visual] : []),
  answer: (problem, api) => {
    if (problem.answerKind !== "two_part") return numberAnswer(problem, api);
    const word = t("getallen.remainder_word");
    return twoFieldAnswer(problem, api, {
      labelA: t("getallen.quotient_label"),
      labelB: t("getallen.remainder_label"),
      gradeFn: (q, r) => ({
        isCorrect: q === problem.answer.q && r === problem.answer.r,
        studentAnswer: `${q} ${word} ${r}`,
        correctAnswerDisplay: `${problem.answer.q} ${word} ${problem.answer.r}`,
      }),
    });
  },
});
