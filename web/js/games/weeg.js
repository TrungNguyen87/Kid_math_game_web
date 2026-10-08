/**
 * Weegpuzzel / Balance Puzzles (round 20) - a deduction puzzle with sums in it.
 *
 * Every scale on the screen is in balance. Fruit weigh something, but not
 * what: the only way to learn it is to reason from one scale to the next.
 *
 *     🍎🍎 = 12 g          →  one 🍎 is 6 g
 *     🍌 + 🍎 = 15 g       →  so 🍌 is 15 − 6 = 9 g
 *
 * That is algebra without letters - substituting, balancing, undoing - and
 * the reasoning is the point: the answer is only reachable by working out
 * which scale to read first.
 *
 * A puzzle is built backwards from its answer. The generator picks the real
 * weights, then writes scales that are true for them, one "family" at a time:
 *
 *   anchor  a scale with a single kind of fruit (and numbers): a way in;
 *   chain   a scale with one new fruit and fruit already worked out;
 *   swap    two new fruit at once - one scale says how they compare ("🍎 is
 *           🍌🍌 and 4 g"), another weighs them together - so the child has
 *           to put one scale into the other.
 *
 * Then solve() does what a child should do, and nothing cleverer: read a
 * scale with one unknown left, or put a scale with a lone fruit into another
 * one. If that cannot finish the puzzle the puzzle is thrown away, so every
 * puzzle can be solved by plain reasoning - and the steps solve() took are
 * the explanation shown after a wrong answer.
 *
 * Levels run from one scale (🍎🍎🍎 = 18 g) to four fruit over five scales,
 * and from level 4 the last question can be "what do these weigh together?".
 */
import { t } from "../i18n.js";
import { choice, coinFlip, randInt, sample, shuffle } from "../rng.js";
import { recordFeat, saveCurrentProfile } from "../state.js";
import { announceNewBadges } from "../gameflow.js";
import { typedAnswerGame } from "./common.js";

const GAME_KEY = "weeg";

/** Fruit with clearly different shapes (and colours), so no two look alike. */
export const FRUITS = ["🍎", "🍌", "🍇", "🍊", "🍓", "🍐"];
const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"];
const MAX_PAN = 6; // items (fruit and weight blocks) that fit on one pan

/**
 * Per level: the recipes a puzzle can be built from (a list of families, in
 * order), the heaviest fruit (grams), the biggest count of one fruit on a
 * pan, and what is asked ("weight" of the last fruit, or the "total" of a
 * few fruit; "mixed" is either).
 */
export const LEVEL_RULES = {
  0: { recipes: [["anchor"]], maxW: 9, coef: 3, ask: "weight" },
  1: { recipes: [["anchor", "chain"]], maxW: 12, coef: 2, ask: "weight" },
  2: { recipes: [["anchor", "chain"]], maxW: 15, coef: 3, ask: "weight" },
  3: { recipes: [["anchor", "chain", "chain"]], maxW: 15, coef: 2, ask: "weight" },
  4: { recipes: [["anchor", "chain", "chain"]], maxW: 20, coef: 3, ask: "mixed" },
  5: { recipes: [["anchor", "swap"], ["swap", "chain"]], maxW: 20, coef: 3, ask: "mixed" },
  6: { recipes: [["swap", "chain", "chain"], ["anchor", "chain", "swap"]], maxW: 25, coef: 3, ask: "mixed" },
  7: { recipes: [["swap", "swap"], ["swap", "chain", "chain"]], maxW: 30, coef: 4, ask: "total" },
};

// ---------------------------------------------------------------------------
// Pans and scales
// ---------------------------------------------------------------------------

/** A pan: how many of each kind of fruit, and its loose weights (grams). */
const newPan = (m) => ({ counts: Array(m).fill(0), nums: [] });
const sum = (list) => list.reduce((a, b) => a + b, 0);
const panWeight = (pan, weights) => sum(pan.counts.map((c, i) => c * weights[i])) + sum(pan.nums);
export const panSize = (pan) => sum(pan.counts) + pan.nums.length;
export const isBalanced = (scale, weights) => panWeight(scale.left, weights) === panWeight(scale.right, weights);

/** Put a weight on a pan as a loose block (nothing for 0). */
const addNum = (pan, grams) => {
  if (grams > 0) pan.nums.push(grams);
};

/** Add up to `max` fruit-kinds worth of counts: kind -> count, onto a pan. */
function putFruit(pan, kind, count) {
  pan.counts[kind] += count;
}

/** Balance a scale by adding the difference as a loose weight on the lighter pan. */
function balance(scale, weights) {
  const left = panWeight(scale.left, weights);
  const right = panWeight(scale.right, weights);
  if (left < right) addNum(scale.left, right - left);
  else addNum(scale.right, left - right);
  return scale;
}

const mirror = (scale) => ({ left: scale.right, right: scale.left });

// ---------------------------------------------------------------------------
// The families a puzzle is built from
// ---------------------------------------------------------------------------

/** A weight for a new fruit, different from every fruit already weighed. */
function freshWeight(ctx, lo, hi) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const w = randInt(lo, hi);
    if (!ctx.weights.some((other) => other === w)) return w;
  }
  return randInt(lo, hi);
}

/** a fruit (and perhaps a loose weight) against loose weights: a way in. */
function anchorFamily(ctx) {
  const { rules, m } = ctx;
  const kind = ctx.next++;
  const w = freshWeight(ctx, 2, rules.maxW);
  ctx.weights[kind] = w;
  let count;
  let extra;
  do {
    count = randInt(1, rules.coef);
    extra = ctx.level >= 1 && coinFlip() ? randInt(1, Math.max(2, Math.floor(rules.maxW / 2))) : 0;
  } while (count === 1 && extra === 0);
  const scale = { left: newPan(m), right: newPan(m) };
  putFruit(scale.left, kind, count);
  addNum(scale.left, extra);
  addNum(scale.right, count * w + extra);
  ctx.scales.push(coinFlip() ? scale : mirror(scale));
  ctx.known.push(kind);
}

/** one new fruit against fruit already weighed (and a loose weight to even it out). */
function chainFamily(ctx) {
  const { rules, m } = ctx;
  const kind = ctx.next++;
  const w = freshWeight(ctx, 2, rules.maxW);
  ctx.weights[kind] = w;
  const scale = { left: newPan(m), right: newPan(m) };
  putFruit(scale.left, kind, randInt(1, Math.max(1, rules.coef - 1)));
  // One or two known fruit, on the other pan - or on the same pan as the new one.
  // (Each known fruit sits on one pan only; the loose weight evens things out.)
  const picks = sample(ctx.known, Math.min(ctx.known.length, coinFlip() ? 2 : 1));
  for (const other of picks) putFruit(coinFlip() ? scale.right : scale.left, other, randInt(1, rules.coef));
  balance(scale, ctx.weights);
  ctx.scales.push(coinFlip() ? scale : mirror(scale));
  ctx.known.push(kind);
}

/**
 * Two new fruit: one scale compares them ("🍎 = 🍌🍌 + 4 g"), another weighs
 * them together. Neither can be read alone; put one into the other.
 */
function swapFamily(ctx) {
  const { rules, m } = ctx;
  const heavy = ctx.next++;
  const light = ctx.next++;
  const times = randInt(1, Math.max(1, rules.coef - 1));
  const gap = times === 1 ? randInt(1, 4) : randInt(0, 3);
  const wLight = freshWeight(ctx, 2, Math.max(3, Math.floor((rules.maxW - gap) / times)));
  const wHeavy = times * wLight + gap;
  ctx.weights[light] = wLight;
  ctx.weights[heavy] = wHeavy;

  const relation = { left: newPan(m), right: newPan(m) };
  putFruit(relation.left, heavy, 1);
  putFruit(relation.right, light, times);
  addNum(relation.right, gap);
  ctx.scales.push(coinFlip() ? relation : mirror(relation));

  const total = { left: newPan(m), right: newPan(m) };
  putFruit(total.left, heavy, randInt(1, 2));
  putFruit(total.left, light, randInt(1, rules.coef));
  if (ctx.known.length && coinFlip()) putFruit(total.left, choice(ctx.known), 1);
  addNum(total.right, panWeight(total.left, ctx.weights));
  ctx.scales.push(coinFlip() ? total : mirror(total));
  ctx.known.push(heavy, light);
}

const FAMILIES = { anchor: anchorFamily, chain: chainFamily, swap: swapFamily };
const KINDS_OF = { anchor: 1, chain: 1, swap: 2 };

// ---------------------------------------------------------------------------
// Solving it the way a child should (pure, tested in tests/web/test_brain.mjs)
// ---------------------------------------------------------------------------

/** A scale as an equation: sum(e[i] * weight[i]) = c. */
const equationOf = (scale, index) => ({
  e: scale.left.counts.map((count, i) => count - scale.right.counts[i]),
  c: sum(scale.right.nums) - sum(scale.left.nums),
  from: [index],
});

/**
 * Solve a puzzle with two moves only: read a scale with a single unknown
 * fruit left, or - when there is none - take a scale with one lone fruit
 * ("🍎 = 🍌🍌 + 4") and put it into another scale that has that fruit.
 * @returns {{ok: boolean, weights?: number[], steps?: object[]}}
 */
export function solvePuzzle(puzzle) {
  const m = puzzle.kinds.length;
  const known = Array(m).fill(null);
  const steps = [];
  const support = (eq) => eq.e.filter((v) => v !== 0).length;
  const reduce = (eq) => {
    const e = [...eq.e];
    let c = eq.c;
    for (let i = 0; i < m; i++) {
      if (known[i] != null && e[i] !== 0) {
        c -= e[i] * known[i];
        e[i] = 0;
      }
    }
    return { ...eq, e, c };
  };
  let eqs = puzzle.scales.map(equationOf);

  for (let guard = 0; guard < 40; guard++) {
    eqs = eqs.map(reduce);
    if (eqs.some((eq) => support(eq) === 0 && eq.c !== 0)) return { ok: false };
    eqs = eqs.filter((eq) => support(eq) > 0);
    if (known.every((w) => w != null)) return { ok: true, weights: known, steps };

    const single = eqs.find((eq) => support(eq) === 1);
    if (single) {
      const kind = single.e.findIndex((v) => v !== 0);
      const weight = single.c / single.e[kind];
      if (!Number.isInteger(weight) || weight <= 0) return { ok: false };
      // What this scale looked like with the fruit already weighed filled in.
      steps.push({ type: "single", kind, weight, from: single.from, knownBefore: [...known] });
      known[kind] = weight;
      eqs = eqs.filter((eq) => eq !== single);
      continue;
    }

    // Put a lone-fruit scale into another scale: the substitution that leaves the fewest unknowns.
    let best = null;
    for (const pivot of eqs) {
      for (let i = 0; i < m; i++) {
        if (Math.abs(pivot.e[i]) !== 1) continue;
        for (const other of eqs) {
          if (other === pivot || other.e[i] === 0) continue;
          const factor = other.e[i] / pivot.e[i];
          const e = other.e.map((v, k) => v - factor * pivot.e[k]);
          const left = e.filter((v) => v !== 0).length;
          if (left < support(other) && (!best || left < best.left)) {
            best = { pivot, other, kind: i, left, derived: { e, c: other.c - factor * pivot.c, from: [...other.from, ...pivot.from] } };
          }
        }
      }
    }
    if (!best) return { ok: false };
    steps.push({ type: "combine", kind: best.kind, pivot: best.pivot, target: best.other, derived: best.derived });
    eqs = eqs.map((eq) => (eq === best.other ? best.derived : eq));
  }
  return { ok: false };
}

// ---------------------------------------------------------------------------
// Building a puzzle
// ---------------------------------------------------------------------------

/**
 * A puzzle for `level`: { kinds (emoji), weights (hidden), scales, question,
 * answer, steps }. Always solvable by solvePuzzle(), with a single answer.
 */
export function generatePuzzle(level) {
  const rules = LEVEL_RULES[Math.max(0, Math.min(7, level))];
  for (let attempt = 0; attempt < 300; attempt++) {
    const recipe = choice(rules.recipes);
    const m = sum(recipe.map((family) => KINDS_OF[family]));
    const ctx = { level, rules, m, weights: Array(m).fill(0), scales: [], known: [], next: 0 };
    for (const family of recipe) FAMILIES[family](ctx);
    if (ctx.weights.some((w) => w < 1 || w > rules.maxW + 2 * rules.coef)) continue;
    if (!ctx.scales.every((scale) => panSize(scale.left) >= 1 && panSize(scale.right) >= 1 && panSize(scale.left) <= MAX_PAN && panSize(scale.right) <= MAX_PAN)) continue;
    if (!ctx.scales.every((scale) => isBalanced(scale, ctx.weights))) continue;

    const kinds = sample(FRUITS, m);
    const puzzle = { level, kinds, weights: ctx.weights, scales: shuffle([...ctx.scales]) };
    const solved = solvePuzzle(puzzle);
    if (!solved.ok || solved.weights.some((w, i) => w !== ctx.weights[i])) continue;
    puzzle.steps = solved.steps;

    const wantTotal = rules.ask === "total" || (rules.ask === "mixed" && m >= 3 && coinFlip());
    if (wantTotal && m >= 2) {
      const counts = Array(m).fill(0);
      for (const kind of sample([...Array(m).keys()], Math.min(m, randInt(2, 3)))) counts[kind] = randInt(1, 2);
      if (sum(counts) > 5) continue;
      puzzle.question = { type: "total", counts };
      puzzle.answer = sum(counts.map((c, i) => c * ctx.weights[i]));
    } else {
      // Ask for the fruit worked out last: the longest road through the scales.
      const kind = puzzle.steps.length ? puzzle.steps[puzzle.steps.length - 1].kind : 0;
      puzzle.question = { type: "weight", kind };
      puzzle.answer = ctx.weights[kind];
    }
    return puzzle;
  }
  // Practically unreachable; the simplest puzzle there is.
  const w = randInt(2, 9);
  const kinds = sample(FRUITS, 1);
  const scale = { left: newPan(1), right: newPan(1) };
  putFruit(scale.left, 0, 2);
  addNum(scale.right, 2 * w);
  const puzzle = { level, kinds, weights: [w], scales: [scale] };
  puzzle.steps = solvePuzzle(puzzle).steps;
  puzzle.question = { type: "weight", kind: 0 };
  puzzle.answer = w;
  return puzzle;
}

// ---------------------------------------------------------------------------
// Writing it down: the explanation lines
// ---------------------------------------------------------------------------

const fruitText = (puzzle, kind, count) => puzzle.kinds[kind].repeat(count);

/**
 * A pan as text: its fruit, then - for fruit already weighed (`known`) - the
 * sum to do ("3 × 8"), then its loose weights: "🍌🍌 + 3 × 8 + 10". Showing
 * the sum rather than its total lets a child see where a number came from.
 */
function panText(puzzle, pan, known = []) {
  const fruit = [];
  const weighed = [];
  pan.counts.forEach((count, kind) => {
    if (!count) return;
    if (known[kind] != null) weighed.push(count === 1 ? String(known[kind]) : `${count} × ${known[kind]}`);
    else fruit.push(fruitText(puzzle, kind, count));
  });
  return [...fruit, ...weighed, ...pan.nums.map(String)].join(" + ");
}

/** A scale as text, with already-weighed fruit replaced by their grams. */
export function scaleText(puzzle, scale, known = []) {
  return `${panText(puzzle, scale.left, known)} = ${panText(puzzle, scale.right, known)}`;
}

/** "🍎 = 🍌🍌 + 4" from a lone-fruit equation, or null when it does not read that way. */
function relationText(puzzle, eq, kind) {
  const sign = eq.e[kind];
  const positives = [];
  const negatives = [];
  eq.e.forEach((value, i) => {
    if (i === kind || value === 0) return;
    // kind*sign + value*i = c  ->  kind = sign*(c - value*i)
    const coef = -sign * value;
    (coef > 0 ? positives : negatives).push(fruitText(puzzle, i, Math.abs(coef)));
  });
  const grams = sign * eq.c;
  if (grams > 0) positives.push(String(grams));
  else if (grams < 0) negatives.push(String(-grams));
  if (!positives.length) return null;
  const right = positives.join(" + ") + negatives.map((text) => ` − ${text}`).join("");
  return `${puzzle.kinds[kind]} = ${right}`;
}

/** What is left of a derived equation with one fruit in it: "3 × 🍌 = 26". Empty if more than one is left. */
function derivedText(puzzle, eq) {
  const unknown = eq.e.map((v, i) => (v !== 0 ? i : -1)).filter((i) => i >= 0);
  if (unknown.length !== 1) return "";
  const kind = unknown[0];
  const times = Math.abs(eq.e[kind]);
  const grams = eq.c * Math.sign(eq.e[kind]);
  return times === 1 ? `${puzzle.kinds[kind]} = ${grams}` : `${times} × ${puzzle.kinds[kind]} = ${grams}`;
}

/**
 * The solution as short lines of fruit and numbers, e.g.
 *   ① 🍌🍌 + 10 = 34  →  🍌 = 12 g
 * so a child can follow the reasoning on the same scales they just saw.
 */
export function explanationLines(puzzle) {
  const lines = [];
  const steps = puzzle.steps;
  steps.forEach((step) => {
    if (step.type === "combine") {
      const relation = relationText(puzzle, step.pivot, step.kind);
      const pivotN = step.pivot.from.map((i) => CIRCLED[i]).join("");
      const targetN = step.target.from.map((i) => CIRCLED[i]).join("");
      lines.push(
        t("weeg.step_combine", {
          pivot: pivotN,
          relation: relation ?? scaleText(puzzle, puzzle.scales[step.pivot.from[0]]),
          target: targetN,
          result: derivedText(puzzle, step.derived),
        }).trim(),
      );
      return;
    }
    const grams = `${puzzle.kinds[step.kind]} = ${step.weight} g`;
    const derived = step.from.length > 1;
    const body = derived ? "" : `${CIRCLED[step.from[0]]} ${scaleText(puzzle, puzzle.scales[step.from[0]], step.knownBefore)}  →  `;
    lines.push(`${body}${grams}`);
  });
  const { question } = puzzle;
  if (question.type === "total") {
    const parts = [];
    const numbers = [];
    question.counts.forEach((count, kind) => {
      if (!count) return;
      parts.push(fruitText(puzzle, kind, count));
      numbers.push(count === 1 ? String(puzzle.weights[kind]) : `${count} × ${puzzle.weights[kind]}`);
    });
    lines.push(`${parts.join(" + ")} = ${numbers.join(" + ")} = ${puzzle.answer} g`);
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Drawing the scales
// ---------------------------------------------------------------------------

const STROKE = "#5d4037";
const PAN = "#ffb74d";
const BLOCK = "#cfd8dc";
const QUESTION = "#ff7043";
const PAN_HALF = 58; // pan bowl half-width
const ITEM_W = 27;
const GAP = 3;

/** The things on one pan, left to right: fruit, then loose weights, then "?" for the question. */
function panItems(puzzle, pan, question = false) {
  const items = [];
  pan.counts.forEach((count, kind) => {
    for (let i = 0; i < count; i++) items.push({ fruit: puzzle.kinds[kind] });
  });
  for (const grams of pan.nums) items.push({ grams });
  if (question) items.push({ question: true });
  return items;
}

const itemWidth = (item) => (item.fruit ? ITEM_W : item.question ? 30 : 16 + 8 * String(item.grams).length);

/** Lay items out in one or two centred rows above a pan; returns SVG for them. */
function drawItems(items, cx, baseY) {
  const total = sum(items.map(itemWidth)) + GAP * (items.length - 1);
  const rows = total > 2 * PAN_HALF - 6 ? [items.slice(0, Math.ceil(items.length / 2)), items.slice(Math.ceil(items.length / 2))] : [items];
  let svg = "";
  rows.forEach((row, r) => {
    const y = baseY - (rows.length - 1 - r) * 26;
    const width = sum(row.map(itemWidth)) + GAP * (row.length - 1);
    let x = cx - width / 2;
    for (const item of row) {
      const w = itemWidth(item);
      if (item.fruit) {
        svg += `<text x="${x + w / 2}" y="${y}" text-anchor="middle" font-size="23">${item.fruit}</text>`;
      } else {
        const fill = item.question ? QUESTION : BLOCK;
        const label = item.question ? "?" : `${item.grams}`;
        const fg = item.question ? "#fff" : STROKE;
        svg += `<rect x="${x}" y="${y - 21}" width="${w}" height="22" rx="5" fill="${fill}" stroke="${STROKE}" stroke-width="1.5"/>`;
        svg += `<text x="${x + w / 2}" y="${y - 5}" text-anchor="middle" font-size="12.5" font-weight="800" fill="${fg}" font-family="sans-serif">${label}</text>`;
      }
      x += w + GAP;
    }
  });
  return svg;
}

/** One balanced scale as an SVG; `label` is its circled number (or ❓ for the question). */
export function scaleSvg(puzzle, scale, label, { question = false } = {}) {
  const leftItems = panItems(puzzle, scale.left);
  const rightItems = panItems(puzzle, scale.right, question);
  const aria = question
    ? `${label} ${panText(puzzle, scale.left)} = ?`
    : `${label} ${panText(puzzle, scale.left)} = ${panText(puzzle, scale.right)}`;
  const bowl = (cx) =>
    `<line x1="${cx}" y1="20" x2="${cx - PAN_HALF}" y2="72" stroke="${STROKE}" stroke-width="1.6"/>` +
    `<line x1="${cx}" y1="20" x2="${cx + PAN_HALF}" y2="72" stroke="${STROKE}" stroke-width="1.6"/>` +
    `<path d="M ${cx - PAN_HALF} 72 Q ${cx} 100 ${cx + PAN_HALF} 72 Z" fill="${PAN}" stroke="${STROKE}" stroke-width="2.5" stroke-linejoin="round"/>`;
  return `<svg class="kmg-svg kmg-weeg-svg" viewBox="0 0 320 112" width="320" height="112" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${aria}">
    <polygon points="128,108 192,108 176,98 144,98" fill="${STROKE}"/>
    <line x1="160" y1="20" x2="160" y2="100" stroke="${STROKE}" stroke-width="5" stroke-linecap="round"/>
    <line x1="64" y1="20" x2="256" y2="20" stroke="${STROKE}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="160" cy="20" r="7" fill="${PAN}" stroke="${STROKE}" stroke-width="2.5"/>
    ${bowl(72)}${bowl(248)}
    ${drawItems(leftItems, 72, 67)}${drawItems(rightItems, 248, 67)}
    <text x="6" y="16" font-size="17" font-weight="800" fill="${STROKE}" font-family="sans-serif">${label}</text>
  </svg>`;
}

/** Every scale of a puzzle (and, for a "total" question, the scale with a "?"), as one HTML string. */
export function scalesHtml(puzzle) {
  const figures = puzzle.scales.map((scale, i) => `<figure class="kmg-weeg-scale">${scaleSvg(puzzle, scale, CIRCLED[i])}</figure>`);
  if (puzzle.question.type === "total") {
    const left = newPan(puzzle.kinds.length);
    left.counts = [...puzzle.question.counts];
    figures.push(`<figure class="kmg-weeg-scale is-question">${scaleSvg(puzzle, { left, right: newPan(puzzle.kinds.length) }, "❓", { question: true })}</figure>`);
  }
  return `<div class="kmg-weeg-scales" data-count="${figures.length}">${figures.join("")}</div>`;
}

// ---------------------------------------------------------------------------
// The game
// ---------------------------------------------------------------------------

/** The problem object typedAnswerGame() wants. */
export function generate(level) {
  const puzzle = generatePuzzle(level);
  const { question } = puzzle;
  let text;
  if (question.type === "weight") {
    text = t("weeg.q_weight", { fruit: puzzle.kinds[question.kind] });
  } else {
    const items = question.counts.map((count, kind) => fruitText(puzzle, kind, count)).join(" ");
    text = t("weeg.q_total", { items });
  }
  return { text, answer: puzzle.answer, answerLabel: t("weeg.answer_label"), puzzle, level };
}

export const render = typedAnswerGame({
  gameKey: GAME_KEY,
  emoji: "⚖️",
  questionEmoji: "⚖️",
  okIcon: "⚖️",
  badIcon: "🤔",
  tipKey: "weeg.why_tip",
  generate,
  visuals: (problem) => [scalesHtml(problem.puzzle)],
  points: (level) => 6 * (level + 1),
  // After a wrong answer: the way through, line by line, on the scales just seen.
  tipFor: (problem) => `${t("weeg.why_tip")}\n${explanationLines(problem.puzzle).join("\n")}`,
  onAnswered: (problem, isCorrect) => {
    if (isCorrect && problem.puzzle.kinds.length >= 4 && recordFeat("weeg_four")) {
      announceNewBadges();
      saveCurrentProfile();
    }
  },
});
