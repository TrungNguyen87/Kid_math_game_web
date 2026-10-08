/**
 * Getallenbouwer / Number Builder (round 20) - build a target number out of
 * a hand of cards. It is the "make 24" game, and the number round of the
 * quiz show Countdown, in one.
 *
 * Tap a card, tap an operation, tap a second card: the two cards are
 * replaced by their result, which can be used again. Keep combining until a
 * card shows the target.
 *
 *     cards 3, 3, 8, 6   target 24
 *     8 ÷ ... no:  (6 − 3) × 8 = 24      (and 3 is left over)
 *
 * What it trains is flexible arithmetic and the order of operations: to get
 * from cards to a target you have to see structure - 24 is 3 × 8, 4 × 6,
 * 2 × 12, 30 − 6 - and the winning card remembers how it was built, so the
 * game can write the child's own solution down with the brackets in the
 * right places ("(6 − 3) × 8").
 *
 * Only whole numbers above zero are allowed on the cards: a subtraction that
 * would reach 0 or less, or a division that does not come out exactly, is
 * refused. (That is the rule of the quiz show, and it keeps the game about
 * whole numbers.)
 *
 * Levels grow the hand (3 → 6 cards), the operations (+ − first, then ×, then
 * ÷) and the target: levels 4 and 5 are the classic "make 24" - level 5 only
 * with hands that have one or two solutions - and levels 6 and 7 are the
 * quiz show: a few small cards, one or two big ones (25, 50, 75, 100) and
 * a three-digit target.
 *
 * The generator makes sure a solution exists: levels 0-5 search every way of
 * combining the cards (a few thousand, instantly) and levels 6-7 build the
 * target by combining the cards themselves at random.
 */
import { getLanguage, t } from "../i18n.js";
import { choice, randInt, sample, shuffle } from "../rng.js";
import { el, clear, append, raw } from "../dom.js";
import { markdown } from "../markdown.js";
import { addScore, awardablePoints, getLevel, recordFeat, saveCurrentProfile } from "../state.js";
import { adaptAfterGame, announceNewBadges, settleAnswer } from "../gameflow.js";
import { climbInvite, expander, gameShell, recordedCaption, statRow } from "../ui.js";
import { bigCelebration, confetti, floatPoints } from "../fx.js";
import * as sound from "../sound.js";

const GAME_KEY = "bouw";
export const ALL_OPS = ["+", "−", "×", "÷"];

/**
 * Per level: how many cards, which numbers they can show (`pool`, or a few
 * `small` ones plus `bigCount` of the `big` ones), the operations, the range
 * of targets, how many of the cards the shortest route must use (`steps` =
 * merges), and for the 24 levels how many different solutions are wanted.
 */
export const LEVEL_RULES = {
  0: { cards: 3, pool: [1, 9], ops: ["+", "−"], target: [6, 20], steps: [2, 2], mode: "explore" },
  1: { cards: 3, pool: [1, 9], ops: ["+", "−", "×"], target: [10, 45], steps: [2, 2], mode: "explore" },
  2: { cards: 4, pool: [1, 9], ops: ["+", "−", "×"], target: [12, 60], steps: [3, 3], mode: "explore" },
  3: { cards: 4, pool: [1, 9], ops: ALL_OPS, target: [10, 80], steps: [3, 3], mode: "explore" },
  4: { cards: 4, pool: [1, 9], ops: ALL_OPS, target: [24, 24], steps: [3, 3], solutions: [3, 60], mode: "full" },
  5: { cards: 4, pool: [1, 13], ops: ALL_OPS, target: [24, 24], steps: [3, 3], solutions: [1, 2], mode: "full" },
  6: { cards: 5, small: [1, 10], big: [25, 50], bigCount: 1, ops: ALL_OPS, target: [100, 400], steps: [3, 4], mode: "random" },
  7: { cards: 6, small: [1, 10], big: [25, 50, 75, 100], bigCount: 2, ops: ALL_OPS, target: [101, 999], steps: [4, 5], mode: "random" },
};

// ---------------------------------------------------------------------------
// Combining cards (pure, tested in tests/web/test_brain.mjs)
// ---------------------------------------------------------------------------

/** `a op b`, or null when the result would not be a whole number above zero. */
export function combine(a, b, op) {
  switch (op) {
    case "+":
      return a + b;
    case "−":
      return a > b ? a - b : null;
    case "×":
      return a * b;
    case "÷":
      return b > 0 && a % b === 0 ? a / b : null;
    default:
      return null;
  }
}

/** Why `a op b` is refused: "negative" (a − b not above zero) or "fraction". */
export function refusal(a, b, op) {
  return op === "−" ? "negative" : "fraction";
}

const leaf = (value) => ({ value });
const join = (op, left, right, value) => ({ op, left, right, value });
const PREC = { "+": 1, "−": 1, "×": 2, "÷": 2 };

/** The division sign in the current language: ":" in Dutch schoolbooks, "÷" in English. */
export const symbol = (op, lang = getLanguage()) => (op === "÷" && lang === "nl" ? ":" : op);

/** How many cards an expression is made of. */
export const leafCount = (node) => (node.op ? leafCount(node.left) + leafCount(node.right) : 1);

/** An expression as text with only the brackets that are needed: "(6 − 3) × 8". */
export function formatExpr(node, lang = getLanguage()) {
  if (!node.op) return String(node.value);
  const side = (child, which) => {
    const text = formatExpr(child, lang);
    if (!child.op) return text;
    const weaker = PREC[child.op] < PREC[node.op];
    const sameRight = PREC[child.op] === PREC[node.op] && which === "right" && (node.op === "−" || node.op === "÷");
    return weaker || sameRight ? `(${text})` : text;
  };
  return `${side(node.left, "left")} ${symbol(node.op, lang)} ${side(node.right, "right")}`;
}

/** One string per expression up to swapping the sides of + and ×, to count distinct solutions. */
export function canonical(node) {
  if (!node.op) return String(node.value);
  let l = canonical(node.left);
  let r = canonical(node.right);
  if ((node.op === "+" || node.op === "×") && l > r) [l, r] = [r, l];
  return `(${l}${node.op}${r})`;
}

/** Every way to merge two of `nodes` with one of `ops` (both orders for − and ÷). */
function* allMerges(nodes, ops) {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const rest = nodes.filter((_, k) => k !== i && k !== j);
      for (const op of ops) {
        const orders = op === "+" || op === "×" ? [[nodes[i], nodes[j]]] : [[nodes[i], nodes[j]], [nodes[j], nodes[i]]];
        for (const [a, b] of orders) {
          const value = combine(a.value, b.value, op);
          // × 1 and ÷ 1 only copy a card: not a move worth searching.
          if (value == null || ((op === "×" || op === "÷") && b.value === 1) || (op === "×" && a.value === 1)) continue;
          const merged = join(op, a, b, value);
          yield { node: merged, nodes: [...rest, merged] };
        }
      }
    }
  }
}

const stateKey = (nodes) => nodes.map((n) => n.value).sort((a, b) => a - b).join(",");

/**
 * Everything reachable by combining the cards: a map from each number to the
 * fewest merges that make it, with one expression that does. (Any subset of
 * the cards may be used.)
 */
export function explore(values, ops) {
  const best = new Map();
  let layer = [values.map(leaf)];
  const seen = new Set([stateKey(layer[0])]);
  for (let depth = 1; depth < values.length; depth++) {
    const next = [];
    for (const nodes of layer) {
      for (const merge of allMerges(nodes, ops)) {
        if (!best.has(merge.node.value)) best.set(merge.node.value, { steps: depth, node: merge.node });
        const key = stateKey(merge.nodes);
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(merge.nodes);
      }
    }
    layer = next;
  }
  return best;
}

/** The distinct ways (as canonical strings) to make `target` using ALL the cards. */
export function fullSolutions(values, ops, target) {
  const found = new Map();
  const go = (nodes) => {
    if (nodes.length === 1) {
      if (nodes[0].value === target) found.set(canonical(nodes[0]), nodes[0]);
      return;
    }
    for (const merge of allMerges(nodes, ops)) go(merge.nodes);
  };
  go(values.map(leaf));
  return found;
}

/**
 * A way to reach `target` from these card values: the list of merges
 * ({a, b, op, result}), or null. Searches with a budget, so it always
 * returns quickly - a null can mean "none" or "too big to say".
 */
export function findPath(values, target, ops, budget = 150000) {
  const seen = new Set();
  let spent = 0;
  const go = (nodes) => {
    if (nodes.some((n) => n.value === target)) return [];
    if (nodes.length === 1) return null;
    const key = stateKey(nodes);
    if (seen.has(key)) return null;
    seen.add(key);
    for (const merge of allMerges(nodes, ops)) {
      if (++spent > budget) return null;
      const rest = go(merge.nodes);
      if (rest) return [{ a: merge.node.left.value, b: merge.node.right.value, op: merge.node.op, result: merge.node.value }, ...rest];
    }
    return null;
  };
  return go(values.map(leaf));
}

/** An expression's merges in the order they are done: [{a, b, op, result}, ...]. */
export function recipeMerges(node) {
  if (!node.op) return [];
  return [...recipeMerges(node.left), ...recipeMerges(node.right), { a: node.left.value, b: node.right.value, op: node.op, result: node.value }];
}

/**
 * The next step of a recipe, given the expressions the cards in hand were
 * built from: the first merge in the recipe tree whose two operands are both
 * on the table, or null if the recipe cannot be followed from here (the
 * player went another way).
 *
 * Cards are matched by what they are made of, not by their number: with the
 * hand 7, 4, 7, 4 and the recipe 7 + 4 × (7 + 4), the second 7 and 4 are
 * reserved for the later steps, so after 7 + 4 = 11 the answer is "4 × 11",
 * not "7 + 4" again.
 * @returns {{a: number, b: number, op: string, result: number, aKey: string, bKey: string}|null}
 */
export function nextRecipeMerge(recipe, nodes) {
  const avail = new Map();
  for (const node of nodes) {
    const key = canonical(node);
    avail.set(key, (avail.get(key) ?? 0) + 1);
  }
  const visit = (node) => {
    const key = canonical(node);
    if ((avail.get(key) ?? 0) > 0) {
      avail.set(key, avail.get(key) - 1);
      return { here: true };
    }
    if (!node.op) return null;
    const left = visit(node.left);
    if (left?.merge) return left;
    const right = visit(node.right);
    if (right?.merge) return right;
    if (left?.here && right?.here) {
      return { merge: { a: node.left.value, b: node.right.value, op: node.op, result: node.value, aKey: canonical(node.left), bKey: canonical(node.right) } };
    }
    return null;
  };
  return visit(recipe)?.merge ?? null;
}

// ---------------------------------------------------------------------------
// Making a hand (pure)
// ---------------------------------------------------------------------------

function dealCards(rules) {
  if (rules.pool) return Array.from({ length: rules.cards }, () => randInt(...rules.pool));
  const small = Array.from({ length: rules.cards - rules.bigCount }, () => randInt(...rules.small));
  return shuffle([...small, ...sample(rules.big, rules.bigCount)]);
}

/** Does any step of this expression just give back a number it was made from (100 × 2 ÷ 2)? */
function hasPointlessStep(node) {
  if (!node.op) return false;
  const inside = (n) => (n.op ? [...inside(n.left), ...inside(n.right)] : [n.value]);
  return inside(node).includes(node.value) || hasPointlessStep(node.left) || hasPointlessStep(node.right);
}

/** Merge cards at random, as a quiz-show host would, and return the last result made. */
function randomPlay(values, rules) {
  let nodes = values.map(leaf);
  const merges = randInt(...rules.steps);
  let last = null;
  for (let step = 0; step < merges; step++) {
    const options = [...allMerges(nodes, rules.ops)];
    if (!options.length) break;
    // Prefer × and + so that three-digit targets are within reach.
    const weighted = options.flatMap((o) => (o.node.op === "×" || o.node.op === "+" ? [o, o] : [o]));
    const pick = choice(weighted);
    nodes = pick.nodes;
    last = pick.node;
  }
  return last;
}

/**
 * A hand for `level`: { level, rules, cards (numbers), target, recipe (an
 * expression that makes it), solutions (how many distinct ways, where
 * counted) }. A solution always exists.
 */
export function generateHand(level) {
  const rules = LEVEL_RULES[Math.max(0, Math.min(7, level))];
  const [lo, hi] = rules.target;
  for (let attempt = 0; attempt < 600; attempt++) {
    const cards = dealCards(rules);
    if (rules.mode === "random") {
      const last = randomPlay(cards, rules);
      if (!last || last.value < lo || last.value > hi || cards.includes(last.value) || leafCount(last) < 4 || hasPointlessStep(last)) continue;
      return { level, rules, cards, target: last.value, recipe: last, solutions: null };
    }
    if (rules.mode === "explore") {
      const best = explore(cards, rules.ops);
      const options = [...best].filter(([value, info]) => value >= lo && value <= hi && info.steps >= rules.steps[0] && info.steps <= rules.steps[1] && !cards.includes(value));
      if (!options.length) continue;
      const [target, info] = choice(options);
      return { level, rules, cards, target, recipe: info.node, solutions: null };
    }
    // "full": the classic 24, with the wanted number of different solutions.
    const found = fullSolutions(cards, rules.ops, lo);
    if (found.size < rules.solutions[0] || found.size > rules.solutions[1]) continue;
    // No shortcut with fewer cards: the hand is needed in full.
    if (explore(cards, rules.ops).get(lo)?.steps !== rules.cards - 1) continue;
    return { level, rules, cards, target: lo, recipe: choice([...found.values()]), solutions: found.size };
  }
  // Practically unreachable: a hand with an easy answer.
  const cards = [2, 3, 4];
  return { level, rules, cards, target: 14, recipe: join("+", join("×", leaf(2), leaf(4), 8), join("×", leaf(3), leaf(2), 6), 14), solutions: null };
}

/** Points for a solve: more for a higher level; half with the hint. */
export function solvePoints(level, hinted) {
  const base = 12 * (level + 1);
  return hinted ? Math.round(base / 2) : base;
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

const opAria = { "+": "plus", "−": "minus", "×": "times", "÷": "divide" };

export function render(container) {
  let hand = null;
  let cards = []; // [{id, value, node}]
  let history = [];
  let nextId = 0;
  let selected = null;
  let op = null;
  let hinted = 0;
  let hintMerge = null; // {a, b, op} to glow
  let note = null;
  let finished = null; // null | "solved" | "gaveup"
  let earned = 0;
  let winning = null;
  let shakeId = null;

  const shell = gameShell({
    gameKey: GAME_KEY,
    emoji: "🧱",
    titleKey: "bouw.title",
    taglineKey: "bouw.tagline",
    introKey: "bouw.intro",
    autoAdvance: false,
    onLevelChange: () => newHand(),
  });

  const stage = el("div.kmg-stage.kmg-bouw");
  shell.slots.extraSlot.append(
    stage,
    expander(t("bouw.how_to_heading"), raw("div", markdown(t("bouw.how_to_body")))),
    recordedCaption(),
  );

  const makeCard = (value, node = leaf(value)) => ({ id: nextId++, value, node });

  function newHand() {
    hand = generateHand(getLevel(GAME_KEY));
    nextId = 0;
    cards = hand.cards.map((value) => makeCard(value));
    history = [];
    selected = null;
    op = null;
    hinted = 0;
    hintMerge = null;
    note = null;
    finished = null;
    earned = 0;
    winning = null;
    shakeId = null;
    paint();
  }

  const cardById = (id) => cards.find((card) => card.id === id);

  function tapCard(id) {
    if (finished) return;
    sound.playTap();
    if (selected == null || selected === id && !op) {
      selected = selected === id ? null : id;
      hintMerge = null;
      paint();
      return;
    }
    if (selected === id) {
      selected = null;
      op = null;
      paint();
      return;
    }
    if (!op) {
      selected = id;
      paint();
      return;
    }
    merge(selected, id, op);
  }

  function tapOp(chosen) {
    if (finished) return;
    if (selected == null) {
      note = { icon: "👆", text: t("bouw.pick_card_first") };
      paint();
      return;
    }
    sound.playTap();
    op = op === chosen ? null : chosen;
    paint();
  }

  function merge(aId, bId, chosen) {
    const a = cardById(aId);
    const b = cardById(bId);
    const value = combine(a.value, b.value, chosen);
    if (value == null) {
      note = { icon: "🚫", text: t(`bouw.cant_${refusal(a.value, b.value, chosen)}`, { a: a.value, b: b.value, op: symbol(chosen) }) };
      shakeId = bId;
      sound.playIncorrect();
      paint();
      return;
    }
    history.push({ cards: cards.map((c) => ({ ...c })) });
    const made = makeCard(value, join(chosen, a.node, b.node, value));
    cards = [...cards.filter((c) => c.id !== aId && c.id !== bId), made];
    selected = null;
    op = null;
    hintMerge = null;
    note = null;
    sound.playTap();
    if (value === hand.target) {
      winning = made;
      finish("solved");
      return;
    }
    if (cards.length === 1) {
      note = { icon: "🤔", text: t("bouw.last_card", { value, target: hand.target }) };
    }
    paint();
  }

  function undo() {
    if (finished || !history.length) return;
    cards = history.pop().cards;
    selected = null;
    op = null;
    hintMerge = null;
    note = null;
    sound.playTap();
    paint();
  }

  function reset() {
    if (finished || !history.length) return;
    cards = history[0].cards;
    history = [];
    selected = null;
    op = null;
    hintMerge = null;
    note = null;
    sound.playTap();
    paint();
  }

  function hint() {
    if (finished) return;
    hinted += 1;
    sound.playTap();
    const values = cards.map((c) => c.value);
    // The recipe while the player is still on it; otherwise a search from wherever they are.
    let next = nextRecipeMerge(hand.recipe, cards.map((c) => c.node));
    if (!next) {
      const path = findPath(values, hand.target, hand.rules.ops);
      next = path?.[0] ?? null;
    }
    if (!next) {
      hintMerge = null;
      note = { icon: "🚧", text: t("bouw.hint_none") };
    } else {
      hintMerge = next;
      note = { icon: "💡", text: t("bouw.hint_next", { a: next.a, b: next.b, op: symbol(next.op) }) };
    }
    selected = null;
    op = null;
    paint();
  }

  function finish(outcome) {
    finished = outcome;
    const level = getLevel(GAME_KEY);
    const logQuestion = t("bouw.log_question", { cards: hand.cards.join(", "), target: hand.target });
    if (outcome === "solved") {
      earned = awardablePoints(GAME_KEY, level, solvePoints(level, hinted > 0));
      if (earned > 0) addScore(earned);
      bigCelebration();
      confetti({ count: 80 });
      sound.playFanfare();
      settleAnswer({
        gameKey: GAME_KEY,
        level,
        questionText: logQuestion,
        studentAnswer: formatExpr(winning.node),
        correctAnswer: formatExpr(hand.recipe),
        isCorrect: true,
        points: earned,
        adaptLevel: false,
        score: false,
      });
      if (level >= 5 && hinted === 0 && recordFeat("bouw_hard")) {
        announceNewBadges();
        saveCurrentProfile();
      }
      adaptAfterGame(GAME_KEY, hinted ? "draw" : "win");
    } else {
      settleAnswer({
        gameKey: GAME_KEY,
        level,
        questionText: logQuestion,
        studentAnswer: t("bouw.log_gave_up"),
        correctAnswer: formatExpr(hand.recipe),
        isCorrect: false,
        points: 0,
        adaptLevel: false,
      });
      adaptAfterGame(GAME_KEY, "loss");
    }
    saveCurrentProfile();
    paint();
  }

  // --- painting -------------------------------------------------------------

  function cardsNode() {
    const row = el("div.kmg-bouw-cards", { role: "group", "aria-label": t("bouw.cards_label") });
    const glow = new Set();
    if (hintMerge && !finished) {
      // The two cards of the hinted merge: by what they are made of when the
      // hint came from the recipe, else by their number.
      const matches = (card, key, value) => (key ? canonical(card.node) === key : card.value === value);
      for (const [key, value] of [[hintMerge.aKey, hintMerge.a], [hintMerge.bKey, hintMerge.b]]) {
        const card = cards.find((c) => !glow.has(c.id) && matches(c, key, value));
        if (card) glow.add(card.id);
      }
    }
    for (const card of cards) {
      const cls = [
        selected === card.id ? ".is-selected" : "",
        glow.has(card.id) ? ".is-hint" : "",
        shakeId === card.id ? ".is-shake" : "",
        card.node.op ? ".is-made" : "",
        finished === "solved" && winning && winning.id === card.id ? ".is-winner" : "",
      ].join("");
      row.append(
        el(`button.kmg-bouw-card${cls}`, {
          type: "button",
          text: String(card.value),
          disabled: !!finished && !(winning && winning.id === card.id),
          dataset: { value: card.value, id: card.id },
          "aria-pressed": String(selected === card.id),
          onClick: () => tapCard(card.id),
        }),
      );
    }
    shakeId = null;
    return row;
  }

  function opsNode() {
    const row = el("div.kmg-bouw-ops", { role: "group", "aria-label": t("bouw.ops_label"), style: { "--kmg-bouw-ops": String(hand.rules.ops.length) } });
    for (const chosen of hand.rules.ops) {
      const glow = hintMerge && hintMerge.op === chosen && !finished;
      row.append(
        el(`button.kmg-bouw-op${op === chosen ? ".is-selected" : ""}${glow ? ".is-hint" : ""}`, {
          type: "button",
          text: symbol(chosen),
          disabled: !!finished,
          dataset: { op: chosen },
          "aria-pressed": String(op === chosen),
          "aria-label": t(`bouw.aria_${opAria[chosen]}`),
          onClick: () => tapOp(chosen),
        }),
      );
    }
    return row;
  }

  function paint() {
    clear(stage);
    shell.picker.refresh();
    append(
      stage,
      el("p.kmg-bouw-goal", { text: t("bouw.goal", { target: hand.target }) }),
      el("div.kmg-bouw-target", { role: "status" }, [el("span", { text: "🎯" }), el("strong", { text: String(hand.target) })]),
      cardsNode(),
    );
    if (!finished) {
      const status = selected == null ? t("bouw.step_card") : !op ? t("bouw.step_op", { a: cardById(selected).value }) : t("bouw.step_second", { a: cardById(selected).value, op: symbol(op) });
      append(
        stage,
        opsNode(),
        el("p.kmg-bouw-status", { text: status }),
        note ? el("div.kmg-banner.kmg-banner-info.kmg-bouw-note", { role: "status" }, [
          el("span.kmg-banner-icon", { text: note.icon }),
          el("span.kmg-banner-body", { text: note.text }),
        ]) : null,
        el("div.kmg-bouw-actions", {}, [
          el("button.kmg-btn.kmg-btn-ghost.kmg-bouw-undo", { type: "button", text: t("bouw.undo_button"), disabled: !history.length, onClick: undo }),
          el("button.kmg-btn.kmg-btn-ghost.kmg-bouw-reset", { type: "button", text: t("bouw.reset_button"), disabled: !history.length, onClick: reset }),
          el("button.kmg-btn.kmg-btn-ghost.kmg-bouw-hint", { type: "button", text: t("bouw.hint_button"), onClick: hint }),
          el("button.kmg-btn.kmg-btn-ghost.kmg-bouw-giveup", { type: "button", text: t("bouw.give_up_button"), onClick: () => finish("gaveup") }),
        ]),
      );
      return;
    }
    if (finished === "solved") {
      append(
        stage,
        el("div.kmg-banner.kmg-banner-ok.kmg-bouw-result", {}, [
          el("span.kmg-banner-icon", { text: "🧱" }),
          el("span.kmg-banner-body", { text: `${t(hinted ? "bouw.solved_help" : "bouw.solved", { points: earned })}` }),
        ]),
        el("p.kmg-bouw-expr", { text: `${formatExpr(winning.node)} = ${hand.target}` }),
        hand.solutions ? el("p.kmg-caption", { text: t("bouw.solutions_note", { n: hand.solutions }) }) : null,
        statRow([
          { label: t("bouw.stat_merges"), value: history.length },
          { label: t("bouw.stat_hints"), value: hinted },
          { label: t("bouw.stat_points"), value: earned },
        ]),
      );
    } else {
      append(
        stage,
        el("div.kmg-banner.kmg-banner-info.kmg-bouw-result", {}, [
          el("span.kmg-banner-icon", { text: "🙈" }),
          el("span.kmg-banner-body", { text: t("bouw.gave_up") }),
        ]),
        el("p.kmg-bouw-expr", { text: `${formatExpr(hand.recipe)} = ${hand.target}` }),
      );
    }
    append(
      stage,
      climbInvite(GAME_KEY, () => newHand()),
      el("div.kmg-actions", {}, [
        el("button.kmg-btn.kmg-btn-primary.kmg-btn-big.kmg-bouw-new", { type: "button", text: t("bouw.new_button"), onClick: () => newHand() }),
      ]),
    );
    if (finished === "solved" && earned > 0) {
      const anchor = stage.querySelector(".kmg-bouw-result");
      if (anchor) floatPoints(anchor, `+${earned}`);
    }
  }

  container.append(shell.root);
  newHand();

  return () => shell.destroy();
}
