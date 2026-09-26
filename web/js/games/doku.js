/**
 * Rekendoku / Mathdoku (round 19) - a logic puzzle with sums inside it.
 *
 * Fill the grid with the numbers 1 to n so that no number appears twice in
 * a row or a column (as in a sudoku). The thick lines divide the grid into
 * cages; the corner of each cage says what its numbers make together and
 * how: "7+" (they add up to 7), "2−" (two numbers that differ by 2), "12×"
 * (they multiply to 12), "3:" (the bigger divided by the smaller is 3).
 *
 * The maths is the whole point: to solve a cage a child has to know which
 * pairs make 12 when multiplied, or which three numbers add up to 9 - and
 * the 💡 tip button teaches exactly that for the cage they are stuck on, by
 * listing every combination of numbers that fits it. That is the
 * micro-lesson inside the puzzle.
 *
 * Every puzzle has exactly one solution. The generator builds a random
 * Latin square, cuts it into cages, then runs a solver: while there is a
 * second solution, a cell where the two solutions differ becomes a given.
 * That keeps the "show one cell" help honest - it can never contradict a
 * different, equally valid answer the child found.
 *
 * Levels grow the grid (3×3 to 6×6) and the operations (+ first, then −,
 * ×, and :). A clean solve - no cells shown - masters the level.
 */
import { getLanguage, t } from "../i18n.js";
import { choice, shuffle } from "../rng.js";
import { el, clear, append, raw } from "../dom.js";
import { addScore, awardablePoints, getLevel, recordFeat, saveCurrentProfile } from "../state.js";
import { adaptAfterGame, announceNewBadges, settleAnswer } from "../gameflow.js";
import { climbInvite, expander, gameShell, recordedCaption, statRow } from "../ui.js";
import { markdown } from "../markdown.js";
import { bigCelebration, confetti } from "../fx.js";
import * as sound from "../sound.js";

const GAME_KEY = "doku";

/**
 * Per level: grid size, the operations cages may use, and how likely each
 * cage size is (weights). Size-1 cages are givens, filled in from the start.
 */
export const LEVEL_RULES = {
  0: { n: 3, ops: ["+"], sizes: { 1: 2, 2: 3 } },
  1: { n: 3, ops: ["+", "-"], sizes: { 1: 1, 2: 3, 3: 1 } },
  2: { n: 4, ops: ["+"], sizes: { 1: 1, 2: 3, 3: 2 } },
  3: { n: 4, ops: ["+", "-"], sizes: { 1: 1, 2: 3, 3: 2 } },
  4: { n: 4, ops: ["+", "-", "×"], sizes: { 1: 1, 2: 3, 3: 2 } },
  5: { n: 5, ops: ["+", "-", "×", ":"], sizes: { 1: 1, 2: 4, 3: 2 } },
  6: { n: 5, ops: ["+", "-", "×", ":"], sizes: { 1: 0.5, 2: 3, 3: 3, 4: 1 } },
  7: { n: 6, ops: ["+", "-", "×", ":"], sizes: { 1: 0.5, 2: 3, 3: 3, 4: 1 } },
};

// ---------------------------------------------------------------------------
// Generator and solver (pure, tested in tests/web/test_puzzles.mjs)
// ---------------------------------------------------------------------------

/** A random n×n Latin square: every row and column holds 1..n once. */
export function latinSquare(n) {
  const rows = shuffle([...Array(n).keys()]);
  const cols = shuffle([...Array(n).keys()]);
  const symbols = shuffle([...Array(n).keys()].map((i) => i + 1));
  return rows.map((r) => cols.map((c) => symbols[(r + c) % n]));
}

function weightedSize(sizes) {
  const entries = Object.entries(sizes).map(([size, weight]) => [Number(size), weight]);
  let roll = Math.random() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [size, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return size;
  }
  return entries[entries.length - 1][0];
}

const NEIGHBOURS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** The operation and target for a group of cells, given the solution. */
export function assignOp(cells, solution, ops) {
  const values = cells.map(([r, c]) => solution[r][c]);
  if (cells.length === 1) return { op: "=", target: values[0] };
  const sum = values.reduce((a, b) => a + b, 0);
  const product = values.reduce((a, b) => a * b, 1);
  const options = [];
  if (ops.includes("+")) options.push({ op: "+", target: sum });
  if (ops.includes("×") && product <= 720) options.push({ op: "×", target: product });
  if (cells.length === 2) {
    const [small, big] = [Math.min(...values), Math.max(...values)];
    // Subtraction and division are the rarer, more interesting clues: when
    // they are allowed, they are offered twice as often.
    if (ops.includes("-")) options.push({ op: "-", target: big - small }, { op: "-", target: big - small });
    if (ops.includes(":") && big % small === 0 && big !== small) {
      options.push({ op: ":", target: big / small }, { op: ":", target: big / small });
    }
  }
  return options.length ? choice(options) : { op: "+", target: sum };
}

function indexCages(n, cages) {
  const cageOf = Array.from({ length: n }, () => Array(n).fill(-1));
  cages.forEach((cage, index) => {
    cage.id = index;
    for (const [r, c] of cage.cells) cageOf[r][c] = index;
  });
  return cageOf;
}

/** Cut the grid into random connected cages. */
export function makeCages(solution, rules) {
  const n = solution.length;
  const taken = Array.from({ length: n }, () => Array(n).fill(false));
  const order = shuffle([...Array(n * n).keys()]);
  const cages = [];
  for (const index of order) {
    const r0 = Math.floor(index / n);
    const c0 = index % n;
    if (taken[r0][c0]) continue;
    const want = weightedSize(rules.sizes);
    const cells = [[r0, c0]];
    taken[r0][c0] = true;
    while (cells.length < want) {
      const frontier = [];
      for (const [r, c] of cells) {
        for (const [dr, dc] of NEIGHBOURS) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < n && cc >= 0 && cc < n && !taken[rr][cc]) frontier.push([rr, cc]);
        }
      }
      if (!frontier.length) break;
      const [rr, cc] = choice(frontier);
      taken[rr][cc] = true;
      cells.push([rr, cc]);
    }
    cages.push({ cells, ...assignOp(cells, solution, rules.ops) });
  }
  return cages;
}

/** Does `cage` hold (or can it still hold, if unfinished) the right numbers? */
export function cageAllows(cage, values, n) {
  let filled = 0;
  let sum = 0;
  let product = 1;
  const seen = [];
  for (const v of values) {
    if (!v) continue;
    filled += 1;
    sum += v;
    product *= v;
    seen.push(v);
  }
  const rest = cage.cells.length - filled;
  switch (cage.op) {
    case "=":
      return filled === 0 || seen[0] === cage.target;
    case "+":
      return sum + rest <= cage.target && sum + rest * n >= cage.target;
    case "×":
      return rest === 0 ? product === cage.target : cage.target % product === 0;
    case "-":
      return rest > 0 || Math.abs(seen[0] - seen[1]) === cage.target;
    case ":":
      return rest > 0 || Math.max(...seen) === cage.target * Math.min(...seen);
    default:
      return false;
  }
}

/**
 * Up to `limit` solutions of a puzzle (grids of numbers). A backtracking
 * search, cell by cell, pruned by the rows, columns and cages.
 */
export function solve(puzzle, limit = 2) {
  const { n, cages, cageOf } = puzzle;
  const grid = Array.from({ length: n }, () => Array(n).fill(0));
  const rowUsed = Array.from({ length: n }, () => Array(n + 1).fill(false));
  const colUsed = Array.from({ length: n }, () => Array(n + 1).fill(false));
  const solutions = [];
  const valuesOf = (cage) => cage.cells.map(([r, c]) => grid[r][c]);

  // Givens first, then the most constrained cages: far fewer dead ends.
  const order = [];
  const ranked = [...cages].sort((a, b) => (a.op === "=" ? -1 : 0) - (b.op === "=" ? -1 : 0) || a.cells.length - b.cells.length);
  for (const cage of ranked) order.push(...cage.cells);

  function search(i) {
    if (solutions.length >= limit) return;
    if (i === order.length) {
      solutions.push(grid.map((row) => [...row]));
      return;
    }
    const [r, c] = order[i];
    const cage = cages[cageOf[r][c]];
    for (let v = 1; v <= n; v++) {
      if (rowUsed[r][v] || colUsed[c][v]) continue;
      grid[r][c] = v;
      rowUsed[r][v] = true;
      colUsed[c][v] = true;
      if (cageAllows(cage, valuesOf(cage), n)) search(i + 1);
      grid[r][c] = 0;
      rowUsed[r][v] = false;
      colUsed[c][v] = false;
      if (solutions.length >= limit) return;
    }
  }
  search(0);
  return solutions;
}

/** Split cell (r, c) out of its cage as a given; what is left is re-caged per connected piece. */
function splitCell(puzzle, r, c, rules) {
  const { n, solution } = puzzle;
  const index = puzzle.cageOf[r][c];
  const cage = puzzle.cages[index];
  const rest = cage.cells.filter(([rr, cc]) => rr !== r || cc !== c);
  const pieces = [];
  const left = new Set(rest.map(([rr, cc]) => rr * n + cc));
  while (left.size) {
    const start = left.values().next().value;
    left.delete(start);
    const piece = [start];
    for (let k = 0; k < piece.length; k++) {
      const [pr, pc] = [Math.floor(piece[k] / n), piece[k] % n];
      for (const [dr, dc] of NEIGHBOURS) {
        const key = (pr + dr) * n + (pc + dc);
        if (pr + dr >= 0 && pr + dr < n && pc + dc >= 0 && pc + dc < n && left.has(key)) {
          left.delete(key);
          piece.push(key);
        }
      }
    }
    pieces.push(piece.map((key) => [Math.floor(key / n), key % n]));
  }
  const cages = puzzle.cages.filter((_, i) => i !== index);
  cages.push({ cells: [[r, c]], op: "=", target: solution[r][c] });
  for (const piece of pieces) cages.push({ cells: piece, ...assignOp(piece, solution, rules.ops) });
  puzzle.cages = cages;
  puzzle.cageOf = indexCages(n, cages);
}

/**
 * A new puzzle for `level`, with exactly one solution.
 * @returns {{n: number, level: number, solution: number[][], cages: object[], cageOf: number[][]}}
 */
export function generatePuzzle(level) {
  const rules = LEVEL_RULES[Math.max(0, Math.min(7, level))];
  const solution = latinSquare(rules.n);
  const cages = makeCages(solution, rules);
  const puzzle = { n: rules.n, level, solution, cages, cageOf: indexCages(rules.n, cages) };
  for (let guard = 0; guard < rules.n * rules.n; guard++) {
    const found = solve(puzzle, 2);
    if (found.length <= 1) break;
    // Two solutions: pin down a cell where they disagree.
    let cell = null;
    for (let r = 0; r < rules.n && !cell; r++) {
      for (let c = 0; c < rules.n && !cell; c++) if (found[0][r][c] !== found[1][r][c]) cell = [r, c];
    }
    splitCell(puzzle, cell[0], cell[1], rules);
  }
  return puzzle;
}

/** The corner label of a cage, in the current language's symbols. */
export function cageLabel(cage, lang = getLanguage()) {
  if (cage.op === "=") return String(cage.target);
  const symbol = { "+": "+", "-": "−", "×": "×", ":": lang === "en" ? "÷" : ":" }[cage.op];
  return `${cage.target}${symbol}`;
}

/**
 * Can these numbers be put in these cells without the same number twice in
 * a row or a column? (A bent cage may hold a number twice, as long as the
 * two copies are in different rows and different columns.)
 */
function fitsCells(cells, combo) {
  const used = Array(combo.length).fill(false);
  const assigned = [];
  const place = (i) => {
    if (i === cells.length) return true;
    const [r, c] = cells[i];
    for (let j = 0; j < combo.length; j++) {
      if (used[j]) continue;
      const clash = assigned.some((v, k) => v === combo[j] && (cells[k][0] === r || cells[k][1] === c));
      if (clash) continue;
      used[j] = true;
      assigned.push(combo[j]);
      if (place(i + 1)) return true;
      used[j] = false;
      assigned.pop();
    }
    return false;
  };
  return place(0);
}

/**
 * Every set of numbers (smallest first) that could fill `cage` in an n×n
 * grid, ignoring the rest of the puzzle - the 💡 tip.
 * @returns {number[][]}
 */
export function cageCombos(cage, n) {
  const k = cage.cells.length;
  const combos = [];
  const pick = (start, acc) => {
    if (acc.length === k) {
      if (cageAllows(cage, acc, n) && fitsCells(cage.cells, acc)) combos.push([...acc]);
      return;
    }
    for (let v = start; v <= n; v++) pick(v, [...acc, v]);
  };
  pick(1, []);
  return combos;
}

/** Rows and columns with a repeated number: the cells to mark red. */
export function conflicts(grid) {
  const n = grid.length;
  const bad = new Set();
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        if (grid[i][a] && grid[i][a] === grid[i][b]) bad.add(`${i},${a}`).add(`${i},${b}`);
        if (grid[a][i] && grid[a][i] === grid[b][i]) bad.add(`${a},${i}`).add(`${b},${i}`);
      }
    }
  }
  return bad;
}

/** A full grid that breaks no row, column or cage rule. */
export function isSolved(puzzle, grid) {
  const { n, cages } = puzzle;
  if (grid.some((row) => row.some((v) => !v))) return false;
  if (conflicts(grid).size) return false;
  return cages.every((cage) => cage.cells.length && cageAllows(cage, cage.cells.map(([r, c]) => grid[r][c]), n));
}

/**
 * The cage walls as one SVG laid over the grid: a line wherever two
 * neighbouring cells are in different cages. (Drawing them as thick cell
 * borders doubled every wall and left wedges where thick met thin.)
 */
export function cageWallsSvg({ n, cageOf }) {
  const lines = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (c < n - 1 && cageOf[r][c] !== cageOf[r][c + 1]) lines.push(`M${c + 1} ${r}V${r + 1}`);
      if (r < n - 1 && cageOf[r][c] !== cageOf[r + 1][c]) lines.push(`M${c} ${r + 1}H${c + 1}`);
    }
  }
  return `<svg viewBox="0 0 ${n} ${n}" preserveAspectRatio="none" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><path d="${lines.join("")}" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="square" vector-effect="non-scaling-stroke"/></svg>`;
}

/** Points for a solve: more for a bigger level, less for every cell shown. */
export function solvePoints(level, revealed) {
  return Math.max(3 * (level + 1), 12 * (level + 1) - 3 * (level + 1) * revealed);
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

const formatTime = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function render(container) {
  let puzzle = null;
  let grid = [];
  let selected = null;
  let revealed = 0;
  let finished = null; // null | "solved" | "gaveup"
  let startedAt = 0;
  let endedAt = 0;
  let tip = null;
  let earned = 0;
  let message = null;

  const shell = gameShell({
    gameKey: GAME_KEY,
    emoji: "🧩",
    titleKey: "doku.title",
    taglineKey: "doku.tagline",
    introKey: "doku.intro",
    autoAdvance: false,
    onLevelChange: () => newPuzzle(),
  });

  const stage = el("div.kmg-stage.kmg-doku");
  shell.slots.extraSlot.append(
    stage,
    expander(t("doku.how_to_heading"), raw("div", markdown(t("doku.how_to_body")))),
    recordedCaption(),
  );

  function newPuzzle() {
    puzzle = generatePuzzle(getLevel(GAME_KEY));
    grid = puzzle.solution.map((row, r) => row.map((v, c) => (puzzle.cages[puzzle.cageOf[r][c]].op === "=" ? v : 0)));
    selected = firstEmpty();
    revealed = 0;
    finished = null;
    startedAt = Date.now();
    tip = null;
    earned = 0;
    message = null;
    paint();
  }

  const isGiven = (r, c) => puzzle.cages[puzzle.cageOf[r][c]].op === "=";

  function firstEmpty() {
    for (let r = 0; r < puzzle.n; r++) for (let c = 0; c < puzzle.n; c++) if (!grid[r][c]) return [r, c];
    return null;
  }

  function put(value) {
    if (finished || !selected) return;
    const [r, c] = selected;
    if (isGiven(r, c)) return;
    grid[r][c] = value;
    sound.playTap();
    tip = null;
    message = null;
    afterChange();
  }

  function afterChange() {
    if (grid.every((row) => row.every(Boolean))) {
      if (isSolved(puzzle, grid)) {
        finish("solved");
        return;
      }
      message = t("doku.not_yet");
      sound.playIncorrect();
    }
    paint();
  }

  function reveal() {
    if (finished) return;
    // The selected cell if it is empty or wrong, otherwise the first one that is.
    let target = selected && !isGiven(...selected) && grid[selected[0]][selected[1]] !== puzzle.solution[selected[0]][selected[1]] ? selected : null;
    if (!target) {
      for (let r = 0; r < puzzle.n && !target; r++) {
        for (let c = 0; c < puzzle.n && !target; c++) if (grid[r][c] !== puzzle.solution[r][c]) target = [r, c];
      }
    }
    if (!target) return;
    grid[target[0]][target[1]] = puzzle.solution[target[0]][target[1]];
    revealed += 1;
    selected = target;
    tip = null;
    sound.playTap();
    afterChange();
  }

  function finish(outcome) {
    finished = outcome;
    endedAt = Date.now();
    const level = getLevel(GAME_KEY);
    const logQuestion = t("doku.log_question", { n: puzzle.n });
    if (outcome === "solved") {
      earned = awardablePoints(GAME_KEY, level, solvePoints(level, revealed));
      if (earned > 0) addScore(earned);
      bigCelebration();
      confetti({ count: 80 });
      sound.playFanfare();
      settleAnswer({
        gameKey: GAME_KEY,
        level,
        questionText: logQuestion,
        studentAnswer: t("doku.log_solved", { revealed }),
        correctAnswer: t("doku.log_solved", { revealed: 0 }),
        isCorrect: true,
        points: earned,
        adaptLevel: false,
        score: false,
      });
      if (revealed === 0 && puzzle.n >= 5 && recordFeat("doku_big")) {
        announceNewBadges();
        saveCurrentProfile();
      }
      // A clean solve masters the level; with help, stay and try another.
      adaptAfterGame(GAME_KEY, revealed === 0 ? "win" : "draw");
    } else {
      grid = puzzle.solution.map((row) => [...row]);
      settleAnswer({
        gameKey: GAME_KEY,
        level,
        questionText: logQuestion,
        studentAnswer: t("doku.log_gave_up"),
        correctAnswer: t("doku.log_solved", { revealed: 0 }),
        isCorrect: false,
        points: 0,
        adaptLevel: false,
      });
      adaptAfterGame(GAME_KEY, "loss");
    }
    paint();
  }

  function tipFor(r, c) {
    const cage = puzzle.cages[puzzle.cageOf[r][c]];
    if (cage.op === "=") return t("doku.tip_given", { value: cage.target });
    const combos = cageCombos(cage, puzzle.n);
    const join = { "+": " + ", "-": " − ", "×": " × ", ":": getLanguage() === "en" ? " ÷ " : " : " }[cage.op];
    const shown = combos.slice(0, 6).map((combo) =>
      cage.op === "-" || cage.op === ":" ? [...combo].reverse().join(join) : combo.join(join),
    );
    const list = shown.join("  ·  ") + (combos.length > 6 ? "  · …" : "");
    const key = combos.length === 1 ? "doku.tip_one" : "doku.tip_many";
    return `${t(`doku.tip_op_${{ "+": "plus", "-": "minus", "×": "times", ":": "divide" }[cage.op]}`, {
      target: cage.target,
      cells: cage.cells.length,
    })} ${t(key, { n: puzzle.n, list })}`;
  }

  // --- keyboard -------------------------------------------------------------

  const onKey = (event) => {
    if (!puzzle || finished || event.target instanceof HTMLInputElement) return;
    const n = puzzle.n;
    if (/^[1-9]$/.test(event.key) && Number(event.key) <= n) {
      event.preventDefault();
      put(Number(event.key));
    } else if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
      event.preventDefault();
      put(0);
    } else if (event.key.startsWith("Arrow") && selected) {
      event.preventDefault();
      const [r, c] = selected;
      const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
      const [dr, dc] = moves[event.key];
      selected = [Math.max(0, Math.min(n - 1, r + dr)), Math.max(0, Math.min(n - 1, c + dc))];
      tip = null;
      paint();
    }
  };
  document.addEventListener("keydown", onKey);

  // --- painting -------------------------------------------------------------

  function board() {
    const { n } = puzzle;
    const bad = conflicts(grid);
    const node = el("div.kmg-doku-board", {
      role: "grid",
      "aria-label": t("doku.board_label", { n }),
      style: { "--kmg-doku-n": String(n) },
    });
    // Each cage's label sits in its top-left cell.
    const labelCell = new Map();
    for (const cage of puzzle.cages) {
      const [r, c] = [...cage.cells].sort((a, b) => a[0] - b[0] || a[1] - b[1])[0];
      labelCell.set(`${r},${c}`, cage);
    }
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const cageIndex = puzzle.cageOf[r][c];
        const cage = puzzle.cages[cageIndex];
        const classes = [
          isGiven(r, c) ? ".is-given" : "",
          selected && selected[0] === r && selected[1] === c ? ".is-selected" : "",
          selected && !finished && (selected[0] === r || selected[1] === c) ? ".is-line" : "",
          selected && !finished && puzzle.cageOf[selected[0]][selected[1]] === cageIndex ? ".is-cage" : "",
          bad.has(`${r},${c}`) ? ".is-conflict" : "",
        ].join("");
        const label = labelCell.get(`${r},${c}`);
        const values = cage.cells.map(([rr, cc]) => grid[rr][cc]);
        const full = values.every(Boolean);
        const cageState = full && cage.op !== "=" ? (cageAllows(cage, values, n) ? ".is-ok" : ".is-bad") : "";
        const cell = el(
          `button.kmg-doku-cell${classes}`,
          {
            type: "button",
            role: "gridcell",
            "aria-label": `${t("doku.cell_label", { row: r + 1, col: c + 1 })}${label ? `, ${cageLabel(label)}` : ""}`,
            dataset: { r, c, cage: cageIndex },
            onClick: () => {
              if (finished) return;
              selected = [r, c];
              tip = null;
              sound.playTap();
              paint();
            },
          },
          [
            label && label.op !== "=" ? el(`span.kmg-doku-label${cageState}`, { text: cageLabel(label) }) : null,
            el("span.kmg-doku-value", { text: grid[r][c] ? String(grid[r][c]) : "" }),
          ],
        );
        node.append(cell);
      }
    }
    node.append(raw("div.kmg-doku-walls", cageWallsSvg(puzzle), { "aria-hidden": "true" }));
    return node;
  }

  function pad() {
    const node = el("div.kmg-doku-pad", { style: { "--kmg-doku-keys": String(puzzle.n + 1) } });
    for (let v = 1; v <= puzzle.n; v++) {
      node.append(el("button.kmg-padkey.kmg-doku-key", { type: "button", text: String(v), onClick: () => put(v) }));
    }
    node.append(
      el("button.kmg-padkey.kmg-padkey-del.kmg-doku-key", {
        type: "button",
        text: "⌫",
        "aria-label": t("common.backspace_key"),
        onClick: () => put(0),
      }),
    );
    return node;
  }

  function paint() {
    clear(stage);
    shell.picker.refresh();
    const elapsed = formatTime((finished ? endedAt : Date.now()) - startedAt);
    append(
      stage,
      el("p.kmg-doku-goal", { text: t("doku.goal", { n: puzzle.n }) }),
      el("div.kmg-doku-wrap", {}, [board()]),
    );
    if (!finished) {
      append(
        stage,
        pad(),
        tip ? el("div.kmg-doku-tip", { role: "status" }, [el("span", { text: "💡" }), el("span", { text: tip })]) : null,
        message
          ? el("div.kmg-banner.kmg-banner-info", {}, [
              el("span.kmg-banner-icon", { text: "🔎" }),
              el("span.kmg-banner-body", { text: message }),
            ])
          : null,
        el("div.kmg-doku-actions", {}, [
          el("button.kmg-btn.kmg-btn-ghost.kmg-doku-tipbtn", {
            type: "button",
            text: t("doku.tip_button"),
            disabled: !selected,
            onClick: () => {
              if (!selected) return;
              tip = tipFor(...selected);
              sound.playTap();
              paint();
            },
          }),
          el("button.kmg-btn.kmg-btn-ghost.kmg-doku-reveal", {
            type: "button",
            text: t("doku.reveal_button"),
            onClick: () => reveal(),
          }),
          el("button.kmg-btn.kmg-btn-ghost.kmg-doku-giveup", {
            type: "button",
            text: t("doku.give_up_button"),
            onClick: () => finish("gaveup"),
          }),
        ]),
        el("p.kmg-caption", { text: revealed ? t("doku.revealed_note", { revealed }) : t("doku.keys_hint") }),
      );
      return;
    }
    if (finished === "solved") {
      append(
        stage,
        el("div.kmg-banner.kmg-banner-ok", {}, [
          el("span.kmg-banner-icon", { text: "🧩" }),
          el("span.kmg-banner-body", {
            text: revealed
              ? t("doku.solved_help", { time: elapsed, points: earned, revealed })
              : t("doku.solved_clean", { time: elapsed, points: earned }),
          }),
        ]),
        statRow([
          { label: t("doku.stat_time"), value: elapsed },
          { label: t("doku.stat_revealed"), value: revealed },
          { label: t("doku.stat_points"), value: earned },
        ]),
      );
    } else {
      stage.append(
        el("div.kmg-banner.kmg-banner-info", {}, [
          el("span.kmg-banner-icon", { text: "🙈" }),
          el("span.kmg-banner-body", { text: t("doku.gave_up") }),
        ]),
      );
    }
    append(
      stage,
      climbInvite(GAME_KEY, () => newPuzzle()),
      el("div.kmg-actions", {}, [
        el("button.kmg-btn.kmg-btn-primary.kmg-btn-big", {
          type: "button",
          text: t("doku.new_button"),
          onClick: () => newPuzzle(),
        }),
      ]),
    );
  }

  container.append(shell.root);
  newPuzzle();

  return () => {
    document.removeEventListener("keydown", onKey);
    shell.destroy();
  };
}
