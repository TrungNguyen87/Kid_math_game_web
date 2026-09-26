/**
 * Round 19: the puzzle and strategy games - Rekendoku (a cage logic
 * puzzle), Tafeltactiek (a times-table board game against the computer) and
 * Pretparkbaas (a theme park built with money maths).
 *
 * What matters most for a child:
 *   - every Rekendoku has exactly ONE solution, so "show a cell" can never
 *     contradict a different, equally right answer, and the 💡 tip lists
 *     real possibilities;
 *   - Tafeltactiek always ends, never lets a square be claimed twice, gives
 *     the square only for a right answer, and its computer takes wins and
 *     blocks yours from the levels that say it does;
 *   - every park visitor's question has a real, positive answer among four
 *     distinct options, and the park's money works like the page says.
 *
 * Run with: npm test
 */
import test from "node:test";
import assert from "node:assert/strict";

const { setLanguage, TRANSLATIONS } = await import("../../web/js/i18n.js");
const state = await import("../../web/js/state.js");
const doku = await import("../../web/js/games/doku.js");
const tactiek = await import("../../web/js/games/tactiek.js");
const park = await import("../../web/js/games/park.js");

const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7];
const S = state.state;

function withStorage(fn) {
  const store = new Map();
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  try {
    return fn(store);
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
}

// ---------------------------------------------------------------------------
// Rekendoku
// ---------------------------------------------------------------------------

const isLatin = (grid, n) =>
  grid.length === n &&
  grid.every((row) => row.length === n && new Set(row).size === n && row.every((v) => v >= 1 && v <= n)) &&
  grid[0].every((_, c) => new Set(grid.map((row) => row[c])).size === n);

test("Rekendoku: every level makes a puzzle with exactly one solution, a Latin square of the level's size", () => {
  for (const level of LEVELS) {
    const rules = doku.LEVEL_RULES[level];
    for (let i = 0; i < 40; i++) {
      const puzzle = doku.generatePuzzle(level);
      assert.equal(puzzle.n, rules.n);
      assert.ok(isLatin(puzzle.solution, rules.n), `level ${level}: not a Latin square`);
      const solutions = doku.solve(puzzle, 3);
      assert.equal(solutions.length, 1, `level ${level}: ${solutions.length} solutions`);
      assert.deepEqual(solutions[0], puzzle.solution);
      assert.equal(doku.isSolved(puzzle, puzzle.solution), true);
    }
  }
});

test("Rekendoku: cages cover every cell once, are connected, and use only the level's operations", () => {
  for (const level of LEVELS) {
    const { n, ops } = doku.LEVEL_RULES[level];
    for (let i = 0; i < 40; i++) {
      const puzzle = doku.generatePuzzle(level);
      const seen = new Set();
      puzzle.cages.forEach((cage, index) => {
        assert.ok(cage.cells.length >= 1);
        for (const [r, c] of cage.cells) {
          assert.ok(!seen.has(`${r},${c}`), "a cell in two cages");
          seen.add(`${r},${c}`);
          assert.equal(puzzle.cageOf[r][c], index);
        }
        // Connected: a flood fill from the first cell reaches them all.
        const inCage = new Set(cage.cells.map(([r, c]) => `${r},${c}`));
        const reached = new Set([`${cage.cells[0][0]},${cage.cells[0][1]}`]);
        const queue = [cage.cells[0]];
        while (queue.length) {
          const [r, c] = queue.pop();
          for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const key = `${r + dr},${c + dc}`;
            if (inCage.has(key) && !reached.has(key)) {
              reached.add(key);
              queue.push([r + dr, c + dc]);
            }
          }
        }
        assert.equal(reached.size, cage.cells.length, "a cage in two pieces");
        const values = cage.cells.map(([r, c]) => puzzle.solution[r][c]);
        if (cage.op === "=") {
          assert.equal(cage.cells.length, 1);
          assert.equal(cage.target, values[0]);
          return;
        }
        assert.ok(ops.includes(cage.op), `level ${level}: ${cage.op} not allowed`);
        assert.ok(cage.cells.length >= 2);
        if (cage.op === "-" || cage.op === ":") assert.equal(cage.cells.length, 2, "− and : only on pairs");
        const expected = {
          "+": values.reduce((a, b) => a + b, 0),
          "×": values.reduce((a, b) => a * b, 1),
          "-": Math.max(...values) - Math.min(...values),
          ":": Math.max(...values) / Math.min(...values),
        }[cage.op];
        assert.equal(cage.target, expected, `${cage.op} target`);
        assert.ok(Number.isInteger(cage.target) && cage.target > 0);
      });
      assert.equal(seen.size, n * n);
    }
  }
});

test("Rekendoku: a finished grid is only accepted when every row, column and cage is right", () => {
  const puzzle = doku.generatePuzzle(4);
  const grid = puzzle.solution.map((row) => [...row]);
  assert.equal(doku.isSolved(puzzle, grid), true);
  // Swap two whole rows: still a Latin square, but the cages break (the
  // solution is unique, so any other Latin square is wrong).
  const swapped = [grid[1], grid[0], ...grid.slice(2)];
  assert.equal(doku.isSolved(puzzle, swapped), false);
  const blank = grid.map((row) => [...row]);
  blank[0][0] = 0;
  assert.equal(doku.isSolved(puzzle, blank), false, "an empty cell is not solved");
  const twice = grid.map((row) => [...row]);
  twice[0][1] = twice[0][0];
  assert.ok(doku.conflicts(twice).has("0,0") && doku.conflicts(twice).has("0,1"));
  assert.equal(doku.conflicts(grid).size, 0);
});

test("Rekendoku: the 💡 tip lists every set of numbers that fits a cage, and only those", () => {
  const pair = (op, target) => ({ cells: [[0, 0], [0, 1]], op, target });
  assert.deepEqual(doku.cageCombos(pair("+", 3), 4), [[1, 2]]);
  assert.deepEqual(doku.cageCombos(pair("×", 12), 4), [[3, 4]]);
  assert.deepEqual(doku.cageCombos(pair("-", 2), 4), [[1, 3], [2, 4]]);
  assert.deepEqual(doku.cageCombos(pair(":", 2), 4), [[1, 2], [2, 4]]);
  assert.deepEqual(doku.cageCombos(pair("+", 4), 4), [[1, 3]], "2 + 2 cannot sit in one row");
  // A bent cage may hold a number twice, as long as the copies differ in row and column.
  const bent = { cells: [[0, 0], [0, 1], [1, 1]], op: "+", target: 5 };
  const combos = doku.cageCombos(bent, 4).map((c) => c.join(""));
  assert.ok(combos.includes("122") && combos.includes("113"), JSON.stringify(combos));
  // Every real cage's own numbers are among its combos, whatever the level.
  for (const level of LEVELS) {
    for (let i = 0; i < 20; i++) {
      const puzzle = doku.generatePuzzle(level);
      for (const cage of puzzle.cages) {
        const real = cage.cells.map(([r, c]) => puzzle.solution[r][c]).sort((a, b) => a - b).join(",");
        const all = doku.cageCombos(cage, puzzle.n);
        assert.ok(all.some((combo) => combo.join(",") === real), `level ${level}: ${real} missing from its tip`);
        for (const combo of all) assert.ok(doku.cageAllows(cage, combo, puzzle.n), `the tip offers ${combo} for ${cage.target}${cage.op}`);
      }
    }
  }
});

test("Rekendoku: the wall overlay draws exactly one wall between every two neighbouring cells of different cages", () => {
  for (const level of LEVELS) {
    const puzzle = doku.generatePuzzle(level);
    const svg = doku.cageWallsSvg(puzzle);
    assert.match(svg, /^<svg[^>]*viewBox="0 0 (\d) \1"/);
    const segments = (svg.match(/M\d+ \d+[VH]\d+/g) || []).length;
    let expected = 0;
    for (let r = 0; r < puzzle.n; r++) {
      for (let c = 0; c < puzzle.n; c++) {
        if (c < puzzle.n - 1 && puzzle.cageOf[r][c] !== puzzle.cageOf[r][c + 1]) expected += 1;
        if (r < puzzle.n - 1 && puzzle.cageOf[r][c] !== puzzle.cageOf[r + 1][c]) expected += 1;
      }
    }
    assert.equal(segments, expected, `level ${level}`);
    assert.ok(!/NaN|undefined/.test(svg));
  }
});

test("Rekendoku: labels use the language's symbols, and points drop with each cell shown but never to nothing", () => {
  assert.equal(doku.cageLabel({ op: ":", target: 3 }, "nl"), "3:");
  assert.equal(doku.cageLabel({ op: ":", target: 3 }, "en"), "3÷");
  assert.equal(doku.cageLabel({ op: "-", target: 2 }, "nl"), "2−");
  assert.equal(doku.cageLabel({ op: "=", target: 4 }, "nl"), "4");
  for (const level of LEVELS) {
    let last = Infinity;
    for (let revealed = 0; revealed < 10; revealed++) {
      const points = doku.solvePoints(level, revealed);
      assert.ok(points <= last);
      assert.ok(points >= 3 * (level + 1));
      last = points;
    }
    assert.ok(doku.solvePoints(level, 0) > doku.solvePoints(level, 1), "a clean solve pays more");
  }
});

// ---------------------------------------------------------------------------
// Tafeltactiek
// ---------------------------------------------------------------------------

test("Tafeltactiek: every level's board holds every product of its factors exactly once, in a full rectangle", () => {
  for (const level of LEVELS) {
    const match = tactiek.newMatch(level);
    const { lo, hi, rows, cols } = match.rules;
    assert.equal(match.numbers.length, rows * cols, `level ${level}`);
    for (let a = lo; a <= hi; a++) for (let b = lo; b <= hi; b++) assert.ok(match.numbers.includes(a * b));
    assert.deepEqual(match.numbers, [...match.numbers].sort((x, y) => x - y));
    assert.notEqual(match.clips[0], match.clips[1]);
    assert.equal(match.turn, "me", "the child always starts");
  }
});

test("Tafeltactiek: legal moves move one clip to a new factor whose product is still free", () => {
  const match = tactiek.newMatch(4, () => 0.3);
  for (const move of tactiek.legalMoves(match)) {
    assert.notEqual(move.factor, match.clips[move.clip]);
    assert.equal(move.product, move.factor * match.clips[1 - move.clip]);
    assert.equal(match.numbers[move.index], move.product);
  }
  const first = tactiek.legalMoves(match)[0];
  tactiek.playMove(match, first, true);
  assert.equal(match.owner[first.index], "me");
  assert.ok(!tactiek.legalMoves(match).some((m) => m.index === first.index), "a claimed square is never offered again");
});

test("Tafeltactiek: a wrong answer moves the clip but claims nothing, and the turn passes", () => {
  const match = tactiek.newMatch(2, () => 0.5);
  const move = tactiek.legalMoves(match)[0];
  tactiek.playMove(match, move, false);
  assert.equal(match.owner[move.index], null);
  assert.equal(match.clips[move.clip], move.factor);
  assert.equal(match.turn, "cpu");
  assert.equal(match.last.correct, false);
});

test("Tafeltactiek: a line of the level's length wins - across, down and both diagonals", () => {
  const match = tactiek.newMatch(4); // 6×6, four in a row
  const { cols } = match.rules;
  const at = (r, c) => r * cols + c;
  for (const cells of [
    [at(0, 0), at(0, 1), at(0, 2)],
    [at(1, 5), at(2, 5), at(3, 5)],
    [at(0, 0), at(1, 1), at(2, 2)],
    [at(0, 5), at(1, 4), at(2, 3)],
  ]) {
    match.owner.fill(null);
    for (const index of cells) match.owner[index] = "me";
    const [r0, c0] = [Math.floor(cells[2] / cols), cells[2] % cols];
    const [r1, c1] = [Math.floor(cells[1] / cols), cells[1] % cols];
    const next = at(r0 + (r0 - r1), c0 + (c0 - c1));
    assert.ok(tactiek.lineThrough(match, next, "me").length >= 4, `line through ${cells}`);
    assert.equal(tactiek.lineThrough(match, next, "cpu").length, 0, "someone else's squares are not your line");
  }
  match.owner.fill(null);
  match.owner[at(0, 0)] = "me";
  match.owner[at(0, 1)] = "me";
  assert.equal(tactiek.lineThrough(match, at(0, 2), "me").length, 0, "three is not four");
  // No wrap-around from the end of one row to the start of the next.
  match.owner.fill(null);
  match.owner[at(0, 4)] = "me";
  match.owner[at(0, 5)] = "me";
  match.owner[at(1, 0)] = "me";
  assert.equal(tactiek.lineThrough(match, at(1, 1), "me").length, 0);
});

test("Tafeltactiek: every match ends - a winner or a draw - at every level, however either side plays", () => {
  for (const level of LEVELS) {
    for (let game = 0; game < 40; game++) {
      const match = tactiek.newMatch(level);
      let turns = 0;
      while (!match.winner && turns < 400) {
        turns += 1;
        const moves = tactiek.legalMoves(match);
        if (!moves.length) break;
        const move = match.turn === "me" ? moves[Math.floor(Math.random() * moves.length)] : tactiek.cpuMove(match);
        tactiek.playMove(match, move, match.turn === "cpu" || Math.random() < 0.8);
      }
      assert.ok(match.winner, `level ${level}: no result after ${turns} turns`);
      const claimed = match.owner.filter(Boolean).length;
      assert.ok(claimed <= match.numbers.length);
    }
  }
});

test("Tafeltactiek: the computer always sees a win at the top levels, and blocks yours from level 1", () => {
  const rigged = (level, owners, clips) => {
    const match = tactiek.newMatch(level, () => 0);
    match.owner.fill(null);
    for (const [index, who] of owners) match.owner[index] = who;
    match.clips = clips;
    match.turn = "cpu";
    return match;
  };
  // 6×6 board of 1..9: row 0 is 1 2 3 4 5 6. The computer holds 1, 2 and 3;
  // 4 wins, and it is reachable (clip on 1: move the other clip to 4).
  const win = rigged(7, [[0, "cpu"], [1, "cpu"], [2, "cpu"]], [1, 9]);
  for (let i = 0; i < 20; i++) {
    const move = tactiek.cpuMove(win);
    assert.equal(win.numbers[move.index], 4, "takes the winning square");
  }
  // The child holds 1, 2 and 3; a level that blocks must take 4. Its dice
  // are pinned high so it never plays one of its random moves here.
  const block = rigged(5, [[0, "me"], [1, "me"], [2, "me"]], [1, 9]);
  for (let i = 0; i < 20; i++) assert.equal(block.numbers[tactiek.cpuMove(block, () => 0.99).index], 4, "blocks the child's line");
  // Level 1 already blocks, on its 3×6 board with three in a row (row 0: 1..6).
  const small = rigged(1, [[0, "me"], [1, "me"]], [1, 5]);
  assert.equal(small.rules.need, 3);
  assert.equal(small.numbers[tactiek.cpuMove(small, () => 0.99).index], 3);
  // Level 0 does not block on purpose: with its dice pinned it builds its own line instead.
  assert.equal(tactiek.LEVEL_RULES[0].block, false);

  // A position where building its own line looks better than blocking - so
  // only the block rule makes it block. (Found by a search; M = the child,
  // C = the computer, row by row on the 6×6 board.) The child threatens 1 2 3 [4].
  const board = "MMM.......C.C.C.....M.......C..CM...";
  const position = (rules) => {
    const match = tactiek.newMatch(5, () => 0);
    match.rules = { ...match.rules, ...rules };
    match.owner = [...board].map((ch) => (ch === "M" ? "me" : ch === "C" ? "cpu" : null));
    match.clips = [4, 3];
    match.turn = "cpu";
    return match;
  };
  assert.equal(tactiek.cpuMove(position({}), () => 0.99).index, 3, "level 5 blocks");
  assert.notEqual(tactiek.cpuMove(position({ block: false, lookahead: false }), () => 0.99).index, 3, "without the rule it would not");
});

test("Tafeltactiek: answer options hold the product and plausible neighbours, all different and positive", () => {
  for (const level of LEVELS) {
    const match = tactiek.newMatch(level);
    for (let a = match.rules.lo; a <= match.rules.hi; a++) {
      for (let b = match.rules.lo; b <= match.rules.hi; b++) {
        const options = tactiek.productOptions(match, a, b, match.rules.options);
        assert.equal(options.length, match.rules.options);
        assert.equal(new Set(options).size, options.length, `${a}×${b}: ${options}`);
        assert.ok(options.includes(a * b));
        assert.ok(options.every((o) => Number.isInteger(o) && o > 0));
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Pretparkbaas
// ---------------------------------------------------------------------------

test("Pretparkbaas: every visitor question has a right answer among four distinct, positive options, in both languages", () => {
  for (const lang of ["nl", "en"]) {
    setLanguage(lang);
    for (const level of LEVELS) {
      const kinds = new Set();
      for (let i = 0; i < 1500; i++) {
        const q = park.parkQuestion(level, lang);
        kinds.add(q.kind);
        assert.equal(q.options.length, 4);
        assert.equal(new Set(q.options).size, 4, JSON.stringify(q));
        assert.ok(q.options.includes(q.answerText));
        assert.ok(q.values.every((v) => v > 0 && Number.isFinite(v)), JSON.stringify(q.values));
        assert.ok(Math.abs(q.answer * 100 - Math.round(q.answer * 100)) < 1e-6, "whole cents");
        if (q.unit !== "money") assert.ok(Number.isInteger(q.answer), `${q.kind}: ${q.answer}`);
        for (const text of [q.text, q.why]) {
          assert.ok(!/undefined|NaN|\{\w+\}|park\.[a-z]/.test(text), `${lang} ${q.kind}: "${text}"`);
        }
        assert.ok(q.why.includes(q.answerText) || q.why.includes(q.answerText.replace(" min", "")), `the explanation ends at the answer: ${q.why}`);
      }
      assert.deepEqual([...kinds].sort(), [...park.LEVEL_KINDS[level]].sort(), `level ${level} uses all its kinds`);
    }
  }
  setLanguage("nl");
});

test("Pretparkbaas: money is written the way each language writes it", () => {
  assert.equal(park.money(2.5, "nl"), "€2,50");
  assert.equal(park.money(2.5, "en"), "€2.50");
  assert.equal(park.money(12, "nl"), "€12");
  assert.equal(park.formatAnswer(35, "minutes", "en"), "35 min");
  assert.equal(park.formatAnswer(20, "percent", "nl"), "20%");
});

test("Pretparkbaas: attractions are sorted by price, unique, named in both languages, and the blueprints climb with the level", () => {
  const ids = park.ATTRACTIONS.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  for (let i = 1; i < park.ATTRACTIONS.length; i++) {
    const [before, a] = [park.ATTRACTIONS[i - 1], park.ATTRACTIONS[i]];
    assert.ok(a.price > before.price && a.income >= before.income && a.minLevel >= before.minLevel);
  }
  assert.ok(park.ATTRACTIONS.some((a) => a.minLevel === 7), "the last blueprint needs the top level");
  for (const lang of ["nl", "en"]) for (const id of ids) assert.ok(TRANSLATIONS[lang][`park.a_${id}`], `${lang} park.a_${id}`);
});

test("Pretparkbaas: a visitor pays entrance plus every attraction's extra - half, rounded up, on a mastered level", () => {
  assert.equal(park.visitorIncome(0, []), 4);
  assert.equal(park.visitorIncome(3, []), 10);
  assert.equal(park.visitorIncome(3, ["candy", "carousel"]), 13);
  assert.equal(park.visitorIncome(3, ["candy", "carousel"], true), 7);
  for (let level = 1; level <= 7; level++) assert.ok(park.ticketFor(level) > park.ticketFor(level - 1), "climbing pays more entrance");
  assert.equal(park.parkRating([]), 1);
  assert.equal(park.parkRating(park.ATTRACTIONS.map((a) => a.id)), 5);
});

test("Pretparkbaas: building needs an open blueprint and enough park money, happens once, and never touches the shop's coins", () => {
  state.applyProfile(`__park_${Math.random()}__`);
  S.coins = 500;
  assert.equal(park.isBlueprintOpen("candy"), true, "the first two are open from the start");
  assert.equal(park.isBlueprintOpen("darts"), false);
  assert.equal(park.build("candy"), false, "no park money yet");
  S.park.cash = 100;
  assert.equal(park.build("candy"), true);
  assert.equal(S.park.cash, 80);
  assert.equal(park.build("candy"), false, "built once");
  assert.equal(park.build("darts"), false, "blueprint still locked");
  S.park.topLevel = 1;
  S.park.cash = 90;
  assert.equal(park.build("darts"), true);
  assert.deepEqual(S.park.built, ["candy", "darts"]);
  assert.equal(S.coins, 500, "park money and shop coins are separate");
});

test("Pretparkbaas: the park is saved with the profile, and a profile from before the park gets an empty one", () => {
  withStorage(() => {
    state.applyProfile("ParkKid");
    S.park.cash = 321;
    S.park.built = ["candy", "carousel"];
    S.park.days = 4;
    S.park.topLevel = 2;
    S.feats = new Set(["park_6"]);
    state.saveCurrentProfile();
    state.applyProfile("Someone else");
    assert.equal(S.park.cash, 0);
    state.applyProfile("ParkKid");
    assert.equal(S.park.cash, 321);
    assert.deepEqual(S.park.built, ["candy", "carousel"]);
    assert.equal(S.park.days, 4);
    assert.equal(S.park.topLevel, 2);
    assert.ok(S.feats.has("park_6"));

    localStorage.setItem("kmg.profiles", JSON.stringify({ Old: { totalScore: 50, coins: 20 } }));
    state.applyProfile("Old");
    assert.deepEqual(S.park, state.freshPark());
    assert.equal(S.feats.size, 0);
    assert.deepEqual(S.passClaimed, []);
  });
});
