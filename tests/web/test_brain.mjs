/**
 * Round 20: the four thinking games - Telduel (a counting duel against the
 * computer), Weegpuzzel (balance scales with hidden weights), Kapotte
 * Rekenmachine (a broken calculator with a par) and Getallenbouwer (build a
 * target from a hand of cards).
 *
 * What matters most for a child:
 *   - a puzzle is always solvable, and solvable by plain reasoning: every
 *     Weegpuzzel balances and has one answer, every calculator target has a
 *     route and the par is the true shortest, every hand of cards can make
 *     its target;
 *   - Telduel's maths is right (the safe totals), the computer never makes a
 *     mistake it was not allowed to, and a child who does the sum always
 *     wins;
 *   - nothing prints "undefined", "NaN" or a bare translation key.
 *
 * Run with: npm test
 */
import test from "node:test";
import assert from "node:assert/strict";

const { setLanguage, TRANSLATIONS } = await import("../../web/js/i18n.js");
const state = await import("../../web/js/state.js");
const { checkNewBadges, BADGE_IDS } = await import("../../web/js/badges.js");
const duel = await import("../../web/js/games/duel.js");
const weeg = await import("../../web/js/games/weeg.js");
const machine = await import("../../web/js/games/machine.js");
const bouw = await import("../../web/js/games/bouw.js");

const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7];
const S = state.state;
const sum = (list) => list.reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------
// Telduel
// ---------------------------------------------------------------------------

/** The slow, obviously-right version of analyse(): plain recursion over (total). */
function bruteLoses(rules, total, memo = new Map()) {
  if (total === rules.target) return !rules.misere;
  if (memo.has(total)) return memo.get(total);
  const moves = rules.steps.filter((s) => total + s <= rules.target);
  const result = !moves.some((s) => bruteLoses(rules, total + s, memo));
  memo.set(total, result);
  return result;
}

test("Telduel: analyse() agrees with plain recursion for races, misère games and forbidden steps", () => {
  for (let i = 0; i < 300; i++) {
    const k = 2 + Math.floor(Math.random() * 11);
    const skip = Math.random() < 0.4 ? 2 + Math.floor(Math.random() * (k - 2)) : null;
    const steps = Array.from({ length: k }, (_, j) => j + 1).filter((s) => s !== skip);
    const rules = { target: 8 + Math.floor(Math.random() * 80), steps, misere: Math.random() < 0.5 };
    const { lose } = duel.analyse(rules);
    for (let total = 0; total <= rules.target; total++) {
      assert.equal(lose[total], bruteLoses(rules, total), `target ${rules.target} steps ${steps} misère ${rules.misere} at ${total}`);
    }
  }
});

test("Telduel: the safe totals of the classic games are the ones a teacher would write down", () => {
  // Race to 10, add 1-3: say 2, then 6, then 10.
  assert.deepEqual(duel.safeTotals({ target: 10, steps: [1, 2, 3], misere: false }), [2, 6, 10]);
  // Race to 100, add 1-10: 1, 12, 23, ... 100 (every 11).
  const hundred = duel.safeTotals({ target: 100, steps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], misere: false });
  assert.equal(hundred[0], 1);
  assert.equal(hundred.at(-1), 100);
  assert.ok(hundred.every((v, i) => i === 0 || v - hundred[i - 1] === 11));
  // Whoever says 10 loses (add 1-3): the safe totals move down by one: 1, 5, 9.
  assert.deepEqual(duel.safeTotals({ target: 10, steps: [1, 2, 3], misere: true }), [1, 5, 9]);
  // 1-12 but never 6, target 50: the totals come in pairs (offsets 0 and 6, 19 and 25, 38 and 44).
  const noSix = duel.safeTotals({ target: 50, steps: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12], misere: false });
  assert.deepEqual(noSix, [6, 12, 25, 31, 44, 50]);
});

test("Telduel: every level's rules are in range, and the first player wins where the child has no choice", () => {
  for (const level of LEVELS) {
    const spec = duel.LEVEL_RULES[level];
    let firstWins = 0;
    let firstLoses = 0;
    for (let i = 0; i < 300; i++) {
      const rules = duel.makeRules(level);
      assert.ok(rules.target >= spec.range[0] && rules.target <= spec.range[1], `level ${level} target ${rules.target}`);
      assert.equal(rules.misere, spec.kind === "misere");
      assert.equal(rules.choose, spec.choose);
      assert.ok(rules.steps.includes(1), "a step of 1 always exists, so nobody can be stuck");
      assert.equal(rules.slip, spec.slip);
      if (duel.perfectWinner(rules) === "first") firstWins++;
      else firstLoses++;
      if (!spec.choose) assert.equal(duel.perfectWinner(rules), "first", `level ${level}: a child who begins must be able to win`);
    }
    if (spec.choose) {
      assert.ok(firstWins > 50 && firstLoses > 30, `level ${level}: choosing who starts must matter (${firstWins}/${firstLoses})`);
    }
  }
});

test("Telduel: the largest step grows from level 0 to 4, and level 7 forbids one step", () => {
  const biggest = (level) => Math.max(...duel.makeRules(level).steps);
  assert.equal(biggest(0), 3);
  assert.ok(biggest(4) >= 9);
  for (let i = 0; i < 50; i++) {
    const steps = duel.makeRules(7).steps;
    const missing = Array.from({ length: Math.max(...steps) }, (_, j) => j + 1).filter((s) => !steps.includes(s));
    assert.equal(missing.length, 1, "exactly one step is forbidden at level 7");
    assert.ok(missing[0] > 1 && missing[0] < Math.max(...steps));
  }
});

test("Telduel: saying the target wins - or loses, in the misère game - and the turn alternates", () => {
  const race = duel.newMatch({ target: 5, steps: [1, 2, 3], misere: false, slip: 0 }, "me");
  duel.playStep(race, 2);
  assert.equal(race.turn, "cpu");
  assert.equal(race.winner, null);
  duel.playStep(race, 3);
  assert.equal(race.winner, "cpu", "the computer said the target");
  const misere = duel.newMatch({ target: 5, steps: [1, 2, 3], misere: true, slip: 0 }, "me");
  duel.playStep(misere, 3);
  duel.playStep(misere, 2);
  assert.equal(misere.winner, "me", "the computer said the target, so it lost");
});

test("Telduel: an illegal step is refused and changes nothing", () => {
  const match = duel.newMatch({ target: 10, steps: [1, 2, 3], misere: false, slip: 0 });
  assert.throws(() => duel.playStep(match, 4));
  duel.playStep(match, 3);
  duel.playStep(match, 3);
  duel.playStep(match, 3);
  assert.equal(match.total, 9);
  assert.throws(() => duel.playStep(match, 2), /illegal/, "cannot go past the target");
  assert.deepEqual(duel.legalSteps(match.rules, 9), [1]);
  assert.equal(match.total, 9);
});

test("Telduel: a computer that never slips always plays a winning step when one exists, and always a legal one", () => {
  for (const level of [4, 5, 6, 7]) {
    for (let i = 0; i < 200; i++) {
      const rules = { ...duel.makeRules(level), slip: 0 };
      const { lose } = duel.analyse(rules);
      const match = duel.newMatch(rules, "cpu");
      // Put the game in a random reachable position first.
      const warmup = Math.floor(Math.random() * 6);
      for (let w = 0; w < warmup && !match.winner; w++) {
        const legal = duel.legalSteps(rules, match.total);
        duel.playStep(match, legal[Math.floor(Math.random() * legal.length)]);
        match.turn = "cpu";
      }
      if (match.winner) continue;
      const step = duel.cpuStep(match);
      assert.ok(duel.legalSteps(rules, match.total).includes(step));
      if (duel.winningSteps(rules, match.total, lose).length) assert.ok(lose[match.total + step], `level ${level} total ${match.total}: ${step} is not a winning step`);
    }
  }
});

test("Telduel: a computer that always slips sometimes plays a losing step (the slip really does something)", () => {
  const rules = { ...duel.makeRules(4), slip: 1 };
  const { lose } = duel.analyse(rules);
  const match = duel.newMatch(rules, "cpu");
  const picked = new Set();
  for (let i = 0; i < 300; i++) picked.add(lose[match.total + duel.cpuStep(match)]);
  assert.ok(picked.has(false), "never slipped");
});

test("Telduel: a child who does the sum, and picks the right start, always beats the near-perfect computer", () => {
  for (const level of LEVELS) {
    let wins = 0;
    const N = 150;
    for (let i = 0; i < N; i++) {
      const rules = { ...duel.makeRules(level), slip: 0 };
      const { lose } = duel.analyse(rules);
      const match = duel.newMatch(rules, rules.choose && duel.perfectWinner(rules) === "second" ? "cpu" : "me");
      while (!match.winner) {
        if (match.turn === "me") {
          const winning = duel.winningSteps(rules, match.total, lose);
          const legal = duel.legalSteps(rules, match.total);
          duel.playStep(match, winning.length ? winning[0] : legal[0]);
        } else {
          duel.playStep(match, duel.cpuStep(match));
        }
      }
      if (match.winner === "me") wins++;
    }
    assert.equal(wins, N, `level ${level}: a perfect child lost ${N - wins} of ${N} to a computer that never slips`);
  }
});

test("Telduel: every match ends, at every level, whatever either side does", () => {
  for (const level of LEVELS) {
    for (let i = 0; i < 100; i++) {
      const rules = duel.makeRules(level);
      const match = duel.newMatch(rules, Math.random() < 0.5 ? "me" : "cpu");
      let turns = 0;
      while (!match.winner) {
        const legal = duel.legalSteps(rules, match.total);
        assert.ok(legal.length, "someone is stuck without a winner being declared");
        duel.playStep(match, match.turn === "me" ? legal[Math.floor(Math.random() * legal.length)] : duel.cpuStep(match));
        assert.ok(++turns <= rules.target, "the count must grow every turn");
      }
      assert.ok(match.winner === "me" || match.winner === "cpu");
    }
  }
});

test("Telduel: a casual child (right 8 times in 10) does worse and worse as the levels climb", () => {
  const winRate = (level) => {
    let wins = 0;
    const N = 1200;
    for (let i = 0; i < N; i++) {
      const rules = duel.makeRules(level);
      const { lose } = duel.analyse(rules);
      const match = duel.newMatch(rules, rules.choose && duel.perfectWinner(rules) === "second" ? "cpu" : "me");
      while (!match.winner) {
        const legal = duel.legalSteps(rules, match.total);
        if (match.turn === "me") {
          const winning = duel.winningSteps(rules, match.total, lose);
          duel.playStep(match, winning.length && Math.random() < 0.8 ? winning[Math.floor(Math.random() * winning.length)] : legal[Math.floor(Math.random() * legal.length)]);
        } else {
          duel.playStep(match, duel.cpuStep(match));
        }
      }
      if (match.winner === "me") wins++;
    }
    return wins / N;
  };
  const rates = [0, 2, 4, 5, 6].map(winRate);
  assert.ok(rates[0] > rates[1] && rates[1] > rates[2] - 0.02, `levels 0-4 should get harder: ${rates}`);
  assert.ok(rates[0] > 0.6, `level 0 should be winnable: ${rates[0]}`);
  assert.ok(rates[2] < rates[0] - 0.2, `level 4 should be clearly harder than level 0: ${rates}`);
  assert.ok(rates[4] < 0.3, `a casual child should not win level 6: ${rates[4]}`);
});

test("Telduel: the explanation does the division the game teaches, in both languages", () => {
  const race = duel.explanation({ kind: "race", target: 10, steps: [1, 2, 3], misere: false });
  assert.equal(race.key, "duel.explain_race");
  assert.deepEqual([race.vars.target, race.vars.gap, race.vars.q, race.vars.r], [10, 4, 2, 2]);
  assert.equal(duel.explanation({ kind: "race", target: 12, steps: [1, 2, 3], misere: false }).key, "duel.explain_race_zero");
  // Whoever says 11 loses, so 10 is the last safe number: 10 : 4 = 2 rest 2.
  const misere = duel.explanation({ kind: "misere", target: 11, steps: [1, 2, 3], misere: true });
  assert.deepEqual([misere.key, misere.vars.base, misere.vars.q, misere.vars.r], ["duel.explain_misere", 10, 2, 2]);
  // Whoever says 9 loses: 8 : 4 goes exactly, so the player who starts loses.
  assert.equal(duel.explanation({ kind: "misere", target: 9, steps: [1, 2, 3], misere: true }).key, "duel.explain_misere_zero");
  assert.equal(duel.explanation({ kind: "set", target: 50, steps: [1, 2, 3, 4, 5, 7], misere: false }).key, "duel.explain_set");
  for (const lang of ["nl", "en"]) {
    setLanguage(lang);
    for (const level of LEVELS) {
      const { key, vars } = duel.explanation(duel.makeRules(level));
      const text = TRANSLATIONS[lang][key].replace(/\{(\w+)\}/g, (_, name) => String(vars[name]));
      assert.ok(!/undefined|NaN|\{/.test(text), `${lang} ${key}: ${text}`);
    }
    assert.equal(duel.describeSteps([1, 2, 3]).includes("3"), true);
    assert.match(duel.describeSteps([1, 2, 3, 4, 5, 7]), /5|7/);
  }
  setLanguage("nl");
});

test("Telduel: the points reward landing on safe totals and winning, and scale with the level", () => {
  assert.ok(duel.WIN_POINTS(7) > duel.WIN_POINTS(0));
  assert.ok(duel.LANDING_POINTS(7) > duel.LANDING_POINTS(0));
  assert.deepEqual(duel.listText([1, 12, 23]), "1 · 12 · 23");
  assert.equal(duel.listText([1, 12, 23, 34, 45, 56, 67, 78, 89, 100]), "1 · 12 · 23 · 34 · 45 … 89 · 100");
  const rules = { target: 10, steps: [1, 2, 3], misere: false };
  const { lose } = duel.analyse(rules);
  assert.equal(duel.isLanding({ total: 6 }, lose), true);
  assert.equal(duel.isLanding({ total: 7 }, lose), false);
});

// ---------------------------------------------------------------------------
// Weegpuzzel
// ---------------------------------------------------------------------------

/** Every weight vector in 1..max that balances all the scales (the slow, sure way). */
function bruteSolutions(puzzle, max) {
  const m = puzzle.kinds.length;
  const w = Array(m).fill(1);
  const found = [];
  const pan = (p) => sum(p.counts.map((c, i) => c * w[i])) + sum(p.nums);
  const go = (i) => {
    if (i === m) {
      if (puzzle.scales.every((s) => pan(s.left) === pan(s.right))) found.push([...w]);
      return;
    }
    for (let v = 1; v <= max; v++) {
      w[i] = v;
      go(i + 1);
    }
  };
  go(0);
  return found;
}

test("Weegpuzzel: every scale balances with the real weights, and every pan fits on the screen", () => {
  for (const level of LEVELS) {
    const rules = weeg.LEVEL_RULES[level];
    for (let i = 0; i < 80; i++) {
      const puzzle = weeg.generatePuzzle(level);
      assert.ok(puzzle.scales.length >= 1);
      for (const scale of puzzle.scales) {
        assert.ok(weeg.isBalanced(scale, puzzle.weights), `level ${level}: an unbalanced scale`);
        for (const pan of [scale.left, scale.right]) {
          const size = weeg.panSize(pan);
          assert.ok(size >= 1 && size <= 6, `level ${level}: a pan with ${size} things`);
        }
      }
      assert.ok(puzzle.weights.every((w) => Number.isInteger(w) && w >= 1 && w <= rules.maxW + 2 * rules.coef));
      assert.equal(new Set(puzzle.kinds).size, puzzle.kinds.length, "two kinds of fruit look the same");
    }
  }
});

test("Weegpuzzel: no kind of fruit sits on both pans of one scale (nothing to cancel by accident)", () => {
  for (const level of LEVELS) {
    for (let i = 0; i < 150; i++) {
      const puzzle = weeg.generatePuzzle(level);
      for (const scale of puzzle.scales) {
        scale.left.counts.forEach((count, kind) => {
          assert.ok(!(count > 0 && scale.right.counts[kind] > 0), `level ${level}: ${puzzle.kinds[kind]} is on both pans of ${JSON.stringify(scale)}`);
        });
      }
    }
  }
});

test("Weegpuzzel: the kinds of fruit and scales grow with the level", () => {
  const sizes = LEVELS.map((level) => {
    const p = weeg.generatePuzzle(level);
    return [p.kinds.length, p.scales.length];
  });
  assert.deepEqual(sizes[0], [1, 1]);
  assert.equal(sizes[1][0], 2);
  assert.equal(sizes[3][0], 3);
  assert.equal(sizes[6][0], 4);
  assert.equal(sizes[7][0], 4);
});

test("Weegpuzzel: plain reasoning solves every puzzle - and finds the real weights", () => {
  for (const level of LEVELS) {
    for (let i = 0; i < 150; i++) {
      const puzzle = weeg.generatePuzzle(level);
      const solved = weeg.solvePuzzle(puzzle);
      assert.ok(solved.ok, `level ${level}: not solvable by reading single scales and substituting`);
      assert.deepEqual(solved.weights, puzzle.weights);
    }
  }
});

test("Weegpuzzel: each puzzle has exactly one answer, checked by trying every possible weight", () => {
  for (const level of LEVELS) {
    for (let i = 0; i < 25; i++) {
      const puzzle = weeg.generatePuzzle(level);
      // Four kinds up to 14 g each is 38,000 tries; three kinds up to 40 g is 64,000.
      const max = puzzle.kinds.length <= 3 ? 40 : 14;
      if (Math.max(...puzzle.weights) > max) continue;
      const found = bruteSolutions(puzzle, max);
      assert.equal(found.length, 1, `level ${level}: ${found.length} ways to weigh ${JSON.stringify(puzzle.scales)}`);
      assert.deepEqual(found[0], puzzle.weights);
    }
  }
});

test("Weegpuzzel: levels below 5 never need two scales put into each other; level 5 and up do", () => {
  const combines = (level) => {
    let count = 0;
    for (let i = 0; i < 60; i++) count += weeg.generatePuzzle(level).steps.filter((s) => s.type === "combine").length;
    return count;
  };
  for (const level of [0, 1, 2, 3, 4]) assert.equal(combines(level), 0, `level ${level}`);
  for (const level of [5, 6, 7]) assert.ok(combines(level) >= 30, `level ${level} should put a scale into another most of the time`);
});

test("Weegpuzzel: a scale that is wrong makes the puzzle unsolvable or changes the answer (the solver really checks)", () => {
  let caught = 0;
  let tried = 0;
  for (let i = 0; i < 100; i++) {
    const puzzle = weeg.generatePuzzle(3);
    const broken = { ...puzzle, scales: puzzle.scales.map((s, j) => (j === 0 ? { left: s.left, right: { counts: s.right.counts, nums: [...s.right.nums, 1] } } : s)) };
    tried++;
    const solved = weeg.solvePuzzle(broken);
    if (!solved.ok || solved.weights.some((w, k) => w !== puzzle.weights[k])) caught++;
  }
  assert.equal(caught, tried);
});

test("Weegpuzzel: the question is answerable and the answer is right", () => {
  for (const level of LEVELS) {
    for (let i = 0; i < 80; i++) {
      const puzzle = weeg.generatePuzzle(level);
      const { question } = puzzle;
      if (question.type === "weight") {
        assert.equal(puzzle.answer, puzzle.weights[question.kind]);
      } else {
        assert.equal(puzzle.answer, sum(question.counts.map((c, k) => c * puzzle.weights[k])));
        assert.ok(sum(question.counts) >= 2 && sum(question.counts) <= 5);
        assert.ok(level >= 4, "a total is asked from level 4");
      }
      assert.ok(Number.isInteger(puzzle.answer) && puzzle.answer > 0);
    }
  }
  // Level 7 only ever asks for a total; levels 0-3 only for a weight.
  for (let i = 0; i < 40; i++) {
    assert.equal(weeg.generatePuzzle(7).question.type, "total");
    assert.equal(weeg.generatePuzzle(2).question.type, "weight");
  }
});

test("Weegpuzzel: the worked solution reads as fruit and numbers, ends at the answer and never prints junk", () => {
  setLanguage("nl");
  for (const level of LEVELS) {
    for (let i = 0; i < 60; i++) {
      const puzzle = weeg.generatePuzzle(level);
      const lines = weeg.explanationLines(puzzle);
      assert.ok(lines.length >= puzzle.steps.length);
      for (const line of lines) {
        assert.ok(line.trim().length > 0, "an empty line");
        assert.ok(!/undefined|NaN|weeg\./.test(line), `junk in: ${line}`);
      }
      const last = lines.at(-1);
      assert.ok(last.includes(`${puzzle.answer} g`) || puzzle.question.type === "weight", last);
      // The solution mentions the weight of every fruit that was worked out.
      for (const step of puzzle.steps.filter((s) => s.type === "single")) {
        assert.ok(lines.some((line) => line.includes(`${puzzle.kinds[step.kind]} = ${step.weight} g`)), `no line gives ${puzzle.kinds[step.kind]} = ${step.weight}`);
      }
    }
  }
});

test("Weegpuzzel: the drawing is well-formed, shows every fruit, and has a ? only on the question scale", () => {
  setLanguage("nl");
  for (const level of LEVELS) {
    for (let i = 0; i < 25; i++) {
      const puzzle = weeg.generatePuzzle(level);
      const html = weeg.scalesHtml(puzzle);
      assert.ok(!/NaN|undefined/.test(html));
      assert.equal((html.match(/<svg/g) || []).length, (html.match(/<\/svg>/g) || []).length);
      const expected = puzzle.scales.length + (puzzle.question.type === "total" ? 1 : 0);
      assert.equal((html.match(/<svg/g) || []).length, expected);
      for (const scale of puzzle.scales) {
        for (const pan of [scale.left, scale.right]) {
          pan.counts.forEach((count, kind) => count && assert.ok(html.includes(puzzle.kinds[kind]), `missing ${puzzle.kinds[kind]}`));
        }
      }
      assert.equal(html.includes(">?<"), puzzle.question.type === "total");
    }
  }
});

test("Weegpuzzel: the question reads naturally in both languages", () => {
  for (const lang of ["nl", "en"]) {
    setLanguage(lang);
    for (const level of LEVELS) {
      const problem = weeg.generate(level);
      assert.ok(problem.text.length > 10 && !/undefined|NaN|\{|weeg\./.test(problem.text), problem.text);
      assert.ok(problem.puzzle.kinds.some((fruit) => problem.text.includes(fruit)), problem.text);
      assert.equal(problem.answer, problem.puzzle.answer);
    }
  }
  setLanguage("nl");
});

// ---------------------------------------------------------------------------
// Kapotte Rekenmachine
// ---------------------------------------------------------------------------

test("Kapotte Rekenmachine: a button does what its label says, and refuses what it cannot do", () => {
  const rules = { lo: 0, hi: 100 };
  assert.equal(machine.press({ kind: "add", n: 7 }, 5, rules), 12);
  assert.equal(machine.press({ kind: "sub", n: 7 }, 5, rules), null, "below the lowest number the screen shows");
  assert.equal(machine.press({ kind: "mul", n: 3 }, 40, rules), null, "above the highest");
  assert.equal(machine.press({ kind: "div", n: 4 }, 12, rules), 3);
  assert.equal(machine.press({ kind: "div", n: 4 }, 10, rules), null, "10 ÷ 4 is not a whole number");
  assert.equal(machine.press({ kind: "square" }, 9, rules), 81);
  assert.equal(machine.press({ kind: "square" }, 11, rules), null);
  const negatives = { lo: -50, hi: 100 };
  assert.equal(machine.press({ kind: "sub", n: 7 }, 5, negatives), -2);
  assert.equal(machine.press({ kind: "div", n: 3 }, -12, negatives), -4);
  assert.equal(machine.press({ kind: "square" }, -6, negatives), 36);
  assert.equal(machine.whyNot({ kind: "div", n: 4 }, 10, rules), "fraction");
  assert.equal(machine.whyNot({ kind: "sub", n: 7 }, 5, rules), "below");
  assert.equal(machine.whyNot({ kind: "mul", n: 3 }, 40, rules), "above");
  assert.deepEqual(["add", "sub", "mul", "div", "square"].map((kind) => machine.buttonLabel({ kind, n: 4 })), ["+4", "−4", "×4", "÷4", "x²"]);
});

test("Kapotte Rekenmachine: every puzzle's route works, and its par is the shortest there is", () => {
  for (const level of LEVELS) {
    const rules = machine.LEVEL_RULES[level];
    for (let i = 0; i < 80; i++) {
      const puzzle = machine.generatePuzzle(level);
      assert.equal(puzzle.route.length, puzzle.par);
      assert.equal(machine.runRoute(puzzle.buttons, puzzle.rules, puzzle.start, puzzle.route), puzzle.target, "the stored route does not reach the target");
      assert.ok(puzzle.par >= rules.par[0] && puzzle.par <= rules.par[1], `level ${level} par ${puzzle.par}`);
      assert.notEqual(puzzle.target, puzzle.start);
      assert.ok(puzzle.start >= rules.start[0] && puzzle.start <= rules.start[1]);
      assert.equal(puzzle.buttons.length, rules.slots.length);
      // The independent check: no shorter route exists (iterative deepening over presses).
      assert.equal(machine.shortestRoute(puzzle.buttons, puzzle.rules, puzzle.start, puzzle.target).length, puzzle.par);
      assert.equal(shorterRouteExists(puzzle), false, `level ${level}: a route shorter than par ${puzzle.par}`);
    }
  }
});

/** Is there any way to reach the target in fewer presses than par? Depth-limited search, no cleverness. */
function shorterRouteExists(puzzle) {
  const go = (x, left) => {
    if (x === puzzle.target) return true;
    if (left === 0) return false;
    return puzzle.buttons.some((button) => {
      const y = machine.press(button, x, puzzle.rules);
      return y != null && go(y, left - 1);
    });
  };
  return go(puzzle.start, puzzle.par - 1);
}

test("Kapotte Rekenmachine: keys are all different, none just undoes another, and the answer is not one key pressed over and over", () => {
  for (const level of LEVELS) {
    for (let i = 0; i < 60; i++) {
      const puzzle = machine.generatePuzzle(level);
      const labels = puzzle.buttons.map(machine.buttonLabel);
      assert.equal(new Set(labels).size, labels.length, `level ${level}: duplicate keys ${labels}`);
      for (const a of puzzle.buttons) {
        for (const b of puzzle.buttons) {
          assert.ok(!(a.kind === "add" && b.kind === "sub" && a.n === b.n), `level ${level}: +n and −n together`);
          assert.ok(!(a.kind === "mul" && b.kind === "div" && a.n === b.n), `level ${level}: ×n and ÷n together`);
        }
      }
      assert.ok(new Set(puzzle.route).size >= 2, `level ${level}: the shortest route is a single key`);
    }
  }
});

test("Kapotte Rekenmachine: the groep 8 levels bring numbers below zero and a square key", () => {
  assert.equal(machine.LEVEL_RULES[5].lo, 0);
  assert.ok(machine.LEVEL_RULES[6].lo < 0 && machine.LEVEL_RULES[7].lo < 0);
  assert.ok(machine.LEVEL_RULES[7].slots.some(([kind]) => kind === "square"));
  assert.ok(!machine.LEVEL_RULES[3].slots.some(([kind]) => kind === "square"));
  assert.ok(machine.LEVEL_RULES[0].slots.every(([kind]) => kind === "add" || kind === "mul"), "level 0 keeps to adding and doubling");
  let below = 0;
  for (let i = 0; i < 100; i++) {
    const puzzle = machine.generatePuzzle(6);
    const seen = machine.searchFrom(puzzle.buttons, puzzle.rules, puzzle.start);
    if ([...seen.keys()].some((x) => x < 0)) below++;
  }
  assert.ok(below > 20, "level 6 should let the display go below zero");
});

test("Kapotte Rekenmachine: from anywhere on the way the shortest route is found, and a dead end says so", () => {
  const buttons = [{ kind: "add", n: 3 }, { kind: "mul", n: 2 }];
  const rules = { lo: 0, hi: 100 };
  // 5 ×2 = 10, +3 = 13, ×2 = 26: three presses, and nothing shorter.
  const route = machine.shortestRoute(buttons, rules, 5, 26);
  assert.equal(route.length, 3);
  assert.equal(machine.runRoute(buttons, rules, 5, route), 26);
  assert.equal(machine.shortestRoute(buttons, rules, 30, 5), null, "this calculator can only go up: 5 is behind us");
  assert.deepEqual(machine.shortestRoute(buttons, rules, 7, 7), []);
  assert.equal(machine.runRoute(buttons, rules, 90, [1]), null, "180 is off the display");
});

test("Kapotte Rekenmachine: stars and points reward fewer presses and a level climbed, and halve with the hint", () => {
  assert.deepEqual([3, 4, 5, 9].map((n) => machine.starsFor(n, 3)), [3, 2, 1, 1]);
  assert.deepEqual([1, 2, 3].map((n) => machine.starsFor(n, 3)), [3, 3, 3], "fewer than par cannot happen, but would still be three stars");
  assert.ok(machine.solvePoints(0, 3, false) > machine.solvePoints(0, 2, false));
  assert.ok(machine.solvePoints(0, 2, false) > machine.solvePoints(0, 1, false));
  assert.ok(machine.solvePoints(7, 3, false) > machine.solvePoints(0, 3, false));
  assert.equal(machine.solvePoints(3, 3, true), Math.round(machine.solvePoints(3, 3, false) / 2));
});

// ---------------------------------------------------------------------------
// Getallenbouwer
// ---------------------------------------------------------------------------

const evalNode = (n) => {
  if (!n.op) return n.value;
  const l = evalNode(n.left);
  const r = evalNode(n.right);
  return { "+": l + r, "−": l - r, "×": l * r, "÷": l / r }[n.op];
};
const leavesOf = (n) => (n.op ? [...leavesOf(n.left), ...leavesOf(n.right)] : [n.value]);
const usesOnly = (used, cards) => {
  const pool = [...cards];
  for (const v of used) {
    const at = pool.indexOf(v);
    if (at < 0) return false;
    pool.splice(at, 1);
  }
  return true;
};

test("Getallenbouwer: whole numbers above zero only - a subtraction that would reach 0 and a division that is not exact are refused", () => {
  assert.equal(bouw.combine(5, 3, "−"), 2);
  assert.equal(bouw.combine(3, 5, "−"), null);
  assert.equal(bouw.combine(4, 4, "−"), null, "0 is not allowed");
  assert.equal(bouw.combine(12, 4, "÷"), 3);
  assert.equal(bouw.combine(10, 4, "÷"), null);
  assert.equal(bouw.combine(4, 12, "÷"), null);
  assert.equal(bouw.combine(7, 6, "×"), 42);
  assert.equal(bouw.combine(7, 6, "+"), 13);
  assert.equal(bouw.refusal(3, 5, "−"), "negative");
  assert.equal(bouw.refusal(10, 4, "÷"), "fraction");
});

test("Getallenbouwer: a solution is written with exactly the brackets it needs, and ':' in Dutch", () => {
  const n = (v) => ({ value: v });
  const j = (op, l, r) => ({ op, left: l, right: r, value: evalNode({ op, left: l, right: r }) });
  assert.equal(bouw.formatExpr(j("×", j("−", n(6), n(3)), n(8)), "en"), "(6 − 3) × 8");
  assert.equal(bouw.formatExpr(j("+", n(2), j("×", n(3), n(4))), "en"), "2 + 3 × 4");
  assert.equal(bouw.formatExpr(j("×", n(2), j("+", n(3), n(4))), "en"), "2 × (3 + 4)");
  assert.equal(bouw.formatExpr(j("−", n(9), j("−", n(5), n(2))), "en"), "9 − (5 − 2)");
  assert.equal(bouw.formatExpr(j("−", j("−", n(9), n(5)), n(2)), "en"), "9 − 5 − 2");
  assert.equal(bouw.formatExpr(j("÷", n(24), j("÷", n(6), n(2))), "en"), "24 ÷ (6 ÷ 2)");
  assert.equal(bouw.formatExpr(j("÷", n(24), j("÷", n(6), n(2))), "nl"), "24 : (6 : 2)");
  assert.equal(bouw.formatExpr(j("+", j("+", n(1), n(2)), j("+", n(3), n(4))), "en"), "1 + 2 + 3 + 4");
  // Whatever brackets are printed, the text must mean the same number.
  for (let i = 0; i < 200; i++) {
    const hand = bouw.generateHand(Math.floor(Math.random() * 8));
    const text = bouw.formatExpr(hand.recipe, "en").replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
    assert.equal(Function(`"use strict"; return (${text});`)(), hand.target, `${text} != ${hand.target}`);
  }
});

test("Getallenbouwer: every hand can make its target - with the cards it was dealt, using the operations of its level", () => {
  for (const level of LEVELS) {
    const rules = bouw.LEVEL_RULES[level];
    for (let i = 0; i < 80; i++) {
      const hand = bouw.generateHand(level);
      assert.equal(hand.cards.length, rules.cards);
      assert.equal(evalNode(hand.recipe), hand.target, `level ${level}: the recipe does not make the target`);
      assert.ok(usesOnly(leavesOf(hand.recipe), hand.cards), `level ${level}: the recipe uses cards that were not dealt`);
      assert.ok(hand.target >= rules.target[0] && hand.target <= rules.target[1]);
      assert.ok(!hand.cards.includes(hand.target), "the target is already on a card");
      const ops = new Set();
      (function collect(node) {
        if (!node.op) return;
        ops.add(node.op);
        collect(node.left);
        collect(node.right);
      })(hand.recipe);
      for (const op of ops) assert.ok(rules.ops.includes(op), `level ${level}: the recipe uses ${op}`);
      // Every intermediate result is a whole number above zero.
      for (const m of bouw.recipeMerges(hand.recipe)) assert.ok(Number.isInteger(m.result) && m.result > 0);
    }
  }
});

test("Getallenbouwer: no recipe has a step that just gives a number back (100 × 2 ÷ 2)", () => {
  for (const level of LEVELS) {
    for (let i = 0; i < 150; i++) {
      const hand = bouw.generateHand(level);
      (function check(node) {
        if (!node.op) return;
        assert.ok(!leavesOf(node).includes(node.value) || level < 6, `level ${level}: ${bouw.formatExpr(node, "en")} = ${node.value} repeats one of its own cards`);
        check(node.left);
        check(node.right);
      })(hand.recipe);
    }
  }
});

test("Getallenbouwer: the hands grow from three cards to six, and from + − to all four operations", () => {
  assert.deepEqual(LEVELS.map((level) => bouw.LEVEL_RULES[level].cards), [3, 3, 4, 4, 4, 4, 5, 6]);
  assert.deepEqual(bouw.LEVEL_RULES[0].ops, ["+", "−"]);
  assert.ok(!bouw.LEVEL_RULES[2].ops.includes("÷"));
  assert.ok(bouw.LEVEL_RULES[3].ops.includes("÷"));
  for (let i = 0; i < 40; i++) {
    const hand = bouw.generateHand(7);
    assert.ok(hand.cards.filter((c) => [25, 50, 75, 100].includes(c)).length >= 2, "two big cards at level 7");
    assert.ok(hand.target >= 101, "a three-digit target");
  }
});

test("Getallenbouwer: levels 4 and 5 are 'make 24' - needing every card - and level 5 has only one or two solutions", () => {
  for (const level of [4, 5]) {
    const rules = bouw.LEVEL_RULES[level];
    for (let i = 0; i < 40; i++) {
      const hand = bouw.generateHand(level);
      assert.equal(hand.target, 24);
      const found = bouw.fullSolutions(hand.cards, rules.ops, 24);
      assert.equal(found.size, hand.solutions);
      assert.ok(found.size >= rules.solutions[0] && found.size <= rules.solutions[1], `level ${level}: ${found.size} solutions for ${hand.cards}`);
      // No shortcut: with fewer than all four cards, 24 cannot be made.
      assert.equal(bouw.explore(hand.cards, rules.ops).get(24)?.steps, 3, `level ${level}: ${hand.cards} makes 24 with fewer cards`);
    }
  }
});

test("Getallenbouwer: counting distinct solutions treats 3 + 4 and 4 + 3 as one", () => {
  const found = bouw.fullSolutions([2, 3, 4, 6], bouw.ALL_OPS, 24);
  const strings = [...found.keys()];
  assert.equal(new Set(strings).size, strings.length);
  // 2 × 3 × 4 and 6 × 4 × ... : at the very least these two classic ones exist.
  assert.ok(found.size >= 4);
  // [1, 5, 5, 5] only makes 24 with a fraction (5 × (5 − 1/5)): not with whole numbers.
  assert.equal(bouw.fullSolutions([1, 5, 5, 5], bouw.ALL_OPS, 24).size, 0);
});

test("Getallenbouwer: following the hint step by step - cards matched by what they are made of - always reaches the target, even with equal cards", () => {
  const join = (op, left, right, value) => ({ op, left, right, value });
  // The hand that broke value-matching: 7, 4, 7, 4 with the recipe 7 + 4 × (7 + 4).
  const recipe = join("+", { value: 7 }, join("×", { value: 4 }, join("+", { value: 7 }, { value: 4 }, 11), 44), 51);
  let nodes = [7, 4, 7, 4].map((value) => ({ value }));
  const order = [];
  while (!nodes.some((n) => n.value === 51)) {
    const next = bouw.nextRecipeMerge(recipe, nodes);
    assert.ok(next, `stuck at ${nodes.map((n) => n.value)}`);
    order.push(`${next.a}${next.op}${next.b}`);
    const take = (key) => nodes.splice(nodes.findIndex((n) => bouw.canonical(n) === key), 1)[0];
    const a = take(next.aKey);
    const b = take(next.bKey);
    nodes.push(join(next.op, a, b, next.result));
  }
  assert.deepEqual(order, ["7+4", "4×11", "7+44"]);

  for (const level of LEVELS) {
    for (let i = 0; i < 60; i++) {
      const hand = bouw.generateHand(level);
      let cards = hand.cards.map((value) => ({ value }));
      let guard = 0;
      while (!cards.some((n) => n.value === hand.target)) {
        const next = bouw.nextRecipeMerge(hand.recipe, cards);
        assert.ok(next, `level ${level}: ran out of recipe at ${cards.map((n) => n.value)} (target ${hand.target}, ${bouw.formatExpr(hand.recipe, "en")})`);
        assert.equal(bouw.combine(next.a, next.b, next.op), next.result);
        const take = (key) => cards.splice(cards.findIndex((n) => bouw.canonical(n) === key), 1)[0];
        const a = take(next.aKey);
        const b = take(next.bKey);
        cards.push(join(next.op, a, b, next.result));
        assert.ok(++guard <= hand.cards.length, "more merges than cards allow");
      }
    }
  }
});

test("Getallenbouwer: when the player goes another way the recipe gives no hint (the page then searches instead)", () => {
  const recipe = { op: "×", left: { op: "+", left: { value: 2 }, right: { value: 3 }, value: 5 }, right: { value: 4 }, value: 20 };
  // Cards: 2 and 3 were merged with × instead of +, so the 5 the recipe needs is not there.
  const cards = [{ op: "×", left: { value: 2 }, right: { value: 3 }, value: 6 }, { value: 4 }];
  assert.equal(bouw.nextRecipeMerge(recipe, cards), null);
});

test("Getallenbouwer: findPath finds a way from a good position, says null for a hopeless one, and gives up within its budget", () => {
  const hand = bouw.generateHand(4);
  const path = bouw.findPath(hand.cards, 24, bouw.ALL_OPS);
  assert.ok(path && path.length >= 1);
  let values = [...hand.cards];
  for (const step of path) {
    assert.equal(bouw.combine(step.a, step.b, step.op), step.result);
    values.splice(values.indexOf(step.a), 1);
    values.splice(values.indexOf(step.b), 1);
    values.push(step.result);
  }
  assert.ok(values.includes(24));
  assert.equal(bouw.findPath([3, 3, 3], 100, bouw.ALL_OPS), null);
  assert.equal(bouw.findPath([2, 5, 7, 9, 11, 13], 997, bouw.ALL_OPS, 3), null, "a tiny budget must stop the search");
});

test("Getallenbouwer: points halve with the hint and grow with the level", () => {
  assert.equal(bouw.solvePoints(3, true), Math.round(bouw.solvePoints(3, false) / 2));
  assert.ok(bouw.solvePoints(7, false) > bouw.solvePoints(0, false));
});

// ---------------------------------------------------------------------------
// All four: copy, badges, registration
// ---------------------------------------------------------------------------

test("The four thinking games are real, levelled games with a name, title, intro and menu entry in both languages", () => {
  for (const game of ["duel", "weeg", "machine", "bouw"]) {
    assert.ok(state.GAME_KEYS.includes(game), game);
    assert.ok(state.PUZZLE_GAMES.has(game), `${game} is a puzzle game`);
    assert.equal(state.getMaxLevel(game), 7);
    for (const lang of ["nl", "en"]) {
      for (const key of [`game.${game}.name`, `${game}.title`, `${game}.tagline`, `${game}.intro`, `nav.${game}`]) {
        assert.ok(TRANSLATIONS[lang][key], `${lang} ${key}`);
      }
    }
  }
  for (const lang of ["nl", "en"]) {
    assert.ok(TRANSLATIONS[lang]["uitleg.topic_denk"] && TRANSLATIONS[lang]["uitleg.body_denk"]);
    for (const badge of ["duel_win", "weeg_four", "machine_par", "bouw_hard"]) assert.ok(TRANSLATIONS[lang][`badges.${badge}.name`], `${lang} badge ${badge}`);
  }
});

test("Every key a thinking game asks for exists in both languages", async () => {
  const { readFileSync } = await import("node:fs");
  for (const file of ["duel", "weeg", "machine", "bouw"]) {
    const source = readFileSync(new URL(`../../web/js/games/${file}.js`, import.meta.url), "utf8");
    const keys = new Set([...source.matchAll(/["'`]((?:duel|weeg|machine|bouw)\.[a-z_]+)["'`]/g)].map((m) => m[1]));
    // Weegpuzzel's shared question loop (common.js) derives its other keys from the game key.
    assert.ok(keys.size >= (file === "weeg" ? 4 : 15), `${file}: found only ${keys.size} keys`);
    for (const key of keys) {
      for (const lang of ["nl", "en"]) assert.ok(TRANSLATIONS[lang][key], `${file}.js uses ${key}, missing in ${lang}`);
    }
  }
  // Keys built from a template: machine.cant_*, machine.aria_*, bouw.cant_*, bouw.aria_*,
  // and the ones typedAnswerGame() derives from the game key for Weegpuzzel.
  for (const lang of ["nl", "en"]) {
    for (const key of ["weeg.title", "weeg.tagline", "weeg.intro", "weeg.check_button", "weeg.next_button", "weeg.correct", "weeg.incorrect", "weeg.why_tip", "machine.cant_fraction", "machine.cant_below", "machine.cant_above", "machine.aria_add", "machine.aria_sub", "machine.aria_mul", "machine.aria_div", "machine.aria_square", "bouw.cant_negative", "bouw.cant_fraction", "bouw.aria_plus", "bouw.aria_minus", "bouw.aria_times", "bouw.aria_divide"]) {
      assert.ok(TRANSLATIONS[lang][key], `${lang} ${key}`);
    }
  }
});

test("Each thinking game has a badge for its one-off feat, earned once and only by that feat", () => {
  S.badges = [];
  S.feats = new Set();
  for (const id of ["duel_win", "weeg_four", "machine_par", "bouw_hard"]) assert.ok(BADGE_IDS.includes(id), id);
  assert.deepEqual(checkNewBadges().map(([id]) => id).filter((id) => ["duel_win", "weeg_four", "machine_par", "bouw_hard"].includes(id)), []);
  const feats = { duel_hard: "duel_win", weeg_four: "weeg_four", machine_par: "machine_par", bouw_hard: "bouw_hard" };
  for (const [feat, badge] of Object.entries(feats)) {
    assert.equal(state.recordFeat(feat), true);
    assert.equal(state.recordFeat(feat), false, "a feat is recorded once");
    const earned = checkNewBadges().map(([id]) => id);
    assert.ok(earned.includes(badge), `${feat} should earn ${badge}`);
    assert.ok(!checkNewBadges().map(([id]) => id).includes(badge), "and only once");
  }
});

test("A profile saved before round 20 opens with the four new games at level 0", () => {
  const store = new Map();
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  try {
    store.set("kmg.profiles", JSON.stringify({ Sam: { totalScore: 120, levels: { tafel: 3, doku: 2 }, gamesTried: ["tafel"] } }));
    state.applyProfile("Sam");
    assert.equal(state.getLevel("tafel"), 3);
    for (const game of ["duel", "weeg", "machine", "bouw"]) assert.equal(state.getLevel(game), 0, game);
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});
