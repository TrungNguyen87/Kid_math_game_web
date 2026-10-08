/**
 * Kapotte Rekenmachine / Broken Calculator (round 20) - a planning puzzle.
 *
 * The calculator is broken: only a few buttons still work. The display shows
 * a number, a target is set, and the job is to turn one into the other in as
 * few presses as possible - "par", like golf.
 *
 *     start 7, target 32, buttons  +9   ×2   −3
 *     7 → +9 → 16 → ×2 → 32        two presses
 *
 * It looks like trial and error and it is not: the good players work
 * backwards ("32 is even, so it could have come from 16 by ×2") and use the
 * inverse of what each button does. Higher levels add buttons that cannot
 * always be pressed (÷ only works on a number it divides exactly), numbers
 * below zero, and a square button.
 *
 * The numbers a puzzle can pass through are bounded, so the whole thing is a
 * small graph (about a thousand numbers) and one breadth-first search gives
 * the exact shortest route. That is how the generator picks a target with a
 * known par, how the 💡 hint finds the next press from wherever the child
 * has got to, and how the game can say - for free - "you can no longer reach
 * the target from here, undo".
 *
 * Solving it in par or par + 1 presses without the hint masters the level;
 * a slower solve or a hint keeps the level; giving up counts as a loss
 * (gameflow.js adaptAfterGame()).
 */
import { t } from "../i18n.js";
import { choice, randInt } from "../rng.js";
import { el, clear, append, raw } from "../dom.js";
import { markdown } from "../markdown.js";
import { addScore, awardablePoints, getLevel, recordFeat, saveCurrentProfile } from "../state.js";
import { adaptAfterGame, announceNewBadges, settleAnswer } from "../gameflow.js";
import { climbInvite, expander, gameShell, recordedCaption, statRow } from "../ui.js";
import { bigCelebration, confetti, floatPoints } from "../fx.js";
import * as sound from "../sound.js";

const GAME_KEY = "machine";

/**
 * Per level: the buttons (a slot is [kind, smallest number, biggest number];
 * one button is made from each), the range of start numbers, the par the
 * target must have, and the numbers the display can show (`lo`..`hi`).
 */
export const LEVEL_RULES = {
  0: { slots: [["add", 1, 3], ["add", 4, 9], ["mul", 2, 2]], start: [0, 4], par: [2, 3], lo: 0, hi: 40 },
  1: { slots: [["add", 2, 9], ["sub", 1, 5], ["mul", 2, 3]], start: [1, 9], par: [3, 3], lo: 0, hi: 60 },
  2: { slots: [["add", 3, 12], ["sub", 2, 9], ["mul", 2, 4]], start: [1, 10], par: [3, 4], lo: 0, hi: 100 },
  3: { slots: [["add", 5, 20], ["mul", 2, 5], ["div", 2, 4]], start: [2, 20], par: [3, 4], lo: 0, hi: 200 },
  4: { slots: [["add", 5, 25], ["sub", 3, 20], ["mul", 2, 5], ["div", 2, 5]], start: [2, 30], par: [4, 4], lo: 0, hi: 300 },
  5: { slots: [["add", 10, 50], ["sub", 5, 30], ["mul", 2, 6], ["div", 2, 5]], start: [3, 40], par: [4, 5], lo: 0, hi: 500 },
  6: { slots: [["add", 5, 40], ["sub", 10, 50], ["mul", 2, 6], ["div", 2, 5]], start: [-20, 40], par: [5, 5], lo: -100, hi: 500 },
  7: { slots: [["add", 10, 60], ["sub", 10, 60], ["mul", 2, 7], ["div", 2, 6], ["square", 0, 0]], start: [-30, 50], par: [5, 6], lo: -200, hi: 999 },
};

// ---------------------------------------------------------------------------
// Buttons and the graph of numbers (pure, tested in tests/web/test_brain.mjs)
// ---------------------------------------------------------------------------

/** What pressing `button` does to `x` - the new display, or null when it cannot be done. */
export function press(button, x, rules) {
  let y;
  switch (button.kind) {
    case "add":
      y = x + button.n;
      break;
    case "sub":
      y = x - button.n;
      break;
    case "mul":
      y = x * button.n;
      break;
    case "div":
      if (x % button.n !== 0) return null;
      y = x / button.n;
      break;
    case "square":
      y = x * x;
      break;
    default:
      return null;
  }
  return y >= rules.lo && y <= rules.hi ? y : null;
}

/** Why a press does nothing: "fraction" (÷ that does not divide), "below" or "above" the display's range. */
export function whyNot(button, x, rules) {
  if (button.kind === "div" && x % button.n !== 0) return "fraction";
  const y = button.kind === "add" ? x + button.n : button.kind === "sub" ? x - button.n : button.kind === "mul" ? x * button.n : button.kind === "square" ? x * x : x / button.n;
  return y < rules.lo ? "below" : "above";
}

/** The text on a key: +9, −3, ×2, ÷4, x². */
export function buttonLabel(button) {
  switch (button.kind) {
    case "add":
      return `+${button.n}`;
    case "sub":
      return `−${button.n}`;
    case "mul":
      return `×${button.n}`;
    case "div":
      return `÷${button.n}`;
    default:
      return "x²";
  }
}

/** Shortest distance from `from` to every number it can reach, with the key that got there. */
export function searchFrom(buttons, rules, from) {
  const seen = new Map([[from, { dist: 0, prev: null, via: null }]]);
  const queue = [from];
  for (let head = 0; head < queue.length; head++) {
    const x = queue[head];
    const here = seen.get(x).dist;
    buttons.forEach((button, index) => {
      const y = press(button, x, rules);
      if (y == null || seen.has(y)) return;
      seen.set(y, { dist: here + 1, prev: x, via: index });
      queue.push(y);
    });
  }
  return seen;
}

/** The shortest presses (button indices) from `from` to `target`, or null if it cannot be done. */
export function shortestRoute(buttons, rules, from, target) {
  const seen = searchFrom(buttons, rules, from);
  if (!seen.has(target)) return null;
  const route = [];
  for (let x = target; seen.get(x).prev !== null; x = seen.get(x).prev) route.unshift(seen.get(x).via);
  return route;
}

/** Follow presses from `start`; null if one of them cannot be done. */
export function runRoute(buttons, rules, start, route) {
  let x = start;
  for (const index of route) {
    x = press(buttons[index], x, rules);
    if (x == null) return null;
  }
  return x;
}

function makeButton(slot) {
  const [kind, lo, hi] = slot;
  return kind === "square" ? { kind } : { kind, n: randInt(lo, hi) };
}

/**
 * A puzzle for `level`: broken-calculator buttons, a start, a target and its
 * par - the length of the shortest route, found by search, so it is exact.
 * @returns {{level: number, rules: object, buttons: object[], start: number, target: number, par: number, route: number[]}}
 */
export function generatePuzzle(level) {
  const rules = LEVEL_RULES[Math.max(0, Math.min(7, level))];
  const [parLo, parHi] = rules.par;
  for (let attempt = 0; attempt < 400; attempt++) {
    const buttons = rules.slots.map(makeButton);
    // Two keys that do the same thing (or undo each other exactly) make a dull puzzle.
    const labels = buttons.map(buttonLabel);
    if (new Set(labels).size !== labels.length) continue;
    const opposite = (a, b) => (a.kind === "add" && b.kind === "sub" && a.n === b.n) || (a.kind === "mul" && b.kind === "div" && a.n === b.n);
    if (buttons.some((a) => buttons.some((b) => opposite(a, b)))) continue;

    const start = randInt(rules.start[0], rules.start[1]);
    const seen = searchFrom(buttons, rules, start);
    const candidates = [];
    for (const [value, info] of seen) {
      if (info.dist < parLo || info.dist > parHi || value === start) continue;
      // Look at the road: a puzzle whose shortest route is one key pressed over and over is dull.
      const route = [];
      for (let x = value; seen.get(x).prev !== null; x = seen.get(x).prev) route.unshift(seen.get(x).via);
      if (new Set(route).size < (info.dist >= 5 ? 3 : 2)) continue;
      candidates.push({ value, route, par: info.dist });
    }
    if (!candidates.length) continue;
    const pick = choice(candidates);
    return { level, rules, buttons, start, target: pick.value, par: pick.par, route: pick.route };
  }
  // Practically unreachable: a plain two-step puzzle.
  const buttons = [{ kind: "add", n: 3 }, { kind: "mul", n: 2 }];
  const fallback = { lo: 0, hi: 40 };
  return { level, rules: fallback, buttons, start: 1, target: 8, par: 2, route: shortestRoute(buttons, fallback, 1, 8) };
}

/** 3 stars for par, 2 for one over, 1 for anything slower. */
export function starsFor(presses, par) {
  return presses <= par ? 3 : presses <= par + 1 ? 2 : 1;
}

/** Points for a solve: more for a higher level and for fewer presses, half as much with the hint. */
export function solvePoints(level, stars, hinted) {
  const base = [4, 8, 12][stars - 1] * (level + 1);
  return hinted ? Math.round(base / 2) : base;
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

const ariaFor = (button) => t(`machine.aria_${button.kind}`, { n: button.n ?? "" });

export function render(container) {
  let puzzle = null;
  let route = [];
  let hinted = 0;
  let hintButton = null; // the key to glow
  let note = null;
  let finished = null; // null | "solved" | "gaveup"
  let earned = 0;
  let stars = 0;
  let shake = null;

  const shell = gameShell({
    gameKey: GAME_KEY,
    emoji: "🧮",
    titleKey: "machine.title",
    taglineKey: "machine.tagline",
    introKey: "machine.intro",
    autoAdvance: false,
    onLevelChange: () => newPuzzle(),
  });

  const stage = el("div.kmg-stage.kmg-machine");
  shell.slots.extraSlot.append(
    stage,
    expander(t("machine.how_to_heading"), raw("div", markdown(t("machine.how_to_body")))),
    recordedCaption(),
  );

  const display = () => runRoute(puzzle.buttons, puzzle.rules, puzzle.start, route);

  function newPuzzle() {
    puzzle = generatePuzzle(getLevel(GAME_KEY));
    route = [];
    hinted = 0;
    hintButton = null;
    note = null;
    finished = null;
    earned = 0;
    stars = 0;
    shake = null;
    paint();
  }

  function pressKey(index) {
    if (finished) return;
    const x = display();
    const button = puzzle.buttons[index];
    const y = press(button, x, puzzle.rules);
    if (y == null) {
      const why = whyNot(button, x, puzzle.rules);
      note = { icon: "🚫", text: t(`machine.cant_${why}`, { x, label: buttonLabel(button), lo: puzzle.rules.lo, hi: puzzle.rules.hi }) };
      shake = index;
      sound.playIncorrect();
      paint();
      return;
    }
    route.push(index);
    hintButton = null;
    sound.playTap();
    if (y === puzzle.target) {
      note = null;
      finish("solved");
      return;
    }
    note = null;
    // Free feedback: the target has slipped out of reach from here.
    if (!shortestRoute(puzzle.buttons, puzzle.rules, y, puzzle.target)) {
      note = { icon: "🚧", text: t("machine.dead_end", { target: puzzle.target }) };
    }
    paint();
  }

  function undo() {
    if (finished || !route.length) return;
    route.pop();
    hintButton = null;
    note = null;
    sound.playTap();
    paint();
  }

  function reset() {
    if (finished || !route.length) return;
    route = [];
    hintButton = null;
    note = null;
    sound.playTap();
    paint();
  }

  function hint() {
    if (finished) return;
    const next = shortestRoute(puzzle.buttons, puzzle.rules, display(), puzzle.target);
    hinted += 1;
    sound.playTap();
    if (!next) {
      note = { icon: "🚧", text: t("machine.dead_end", { target: puzzle.target }) };
      hintButton = null;
    } else {
      hintButton = next[0];
      note = { icon: "💡", text: t("machine.hint_next", { label: buttonLabel(puzzle.buttons[next[0]]), left: next.length }) };
    }
    paint();
  }

  function finish(outcome) {
    finished = outcome;
    const level = getLevel(GAME_KEY);
    const logQuestion = t("machine.log_question", { start: puzzle.start, target: puzzle.target, par: puzzle.par });
    if (outcome === "solved") {
      stars = starsFor(route.length, puzzle.par);
      earned = awardablePoints(GAME_KEY, level, solvePoints(level, stars, hinted > 0));
      if (earned > 0) addScore(earned);
      bigCelebration();
      confetti({ count: stars === 3 ? 90 : 50 });
      sound.playFanfare();
      settleAnswer({
        gameKey: GAME_KEY,
        level,
        questionText: logQuestion,
        studentAnswer: t("machine.log_solved", { presses: route.length }),
        correctAnswer: t("machine.log_solved", { presses: puzzle.par }),
        isCorrect: true,
        points: earned,
        adaptLevel: false,
        score: false,
      });
      const clean = hinted === 0 && route.length <= puzzle.par + 1;
      if (level >= 4 && hinted === 0 && route.length <= puzzle.par && recordFeat("machine_par")) {
        announceNewBadges();
        saveCurrentProfile();
      }
      // Par (or one over) with no hint masters the level; anything slower stays.
      adaptAfterGame(GAME_KEY, clean ? "win" : "draw");
    } else {
      settleAnswer({
        gameKey: GAME_KEY,
        level,
        questionText: logQuestion,
        studentAnswer: t("machine.log_gave_up"),
        correctAnswer: t("machine.log_solved", { presses: puzzle.par }),
        isCorrect: false,
        points: 0,
        adaptLevel: false,
      });
      adaptAfterGame(GAME_KEY, "loss");
    }
    saveCurrentProfile();
    paint();
  }

  /** "7 → +9 → 16 → ×2 → 32" as a list of steps. */
  function routeNode(presses, start, ariaKey) {
    const list = el("ol.kmg-machine-tape", { "aria-label": t(ariaKey) });
    list.append(el("li.kmg-machine-step.is-start", {}, [el("span.kmg-machine-num", { text: String(start) })]));
    let x = start;
    for (const index of presses) {
      const button = puzzle.buttons[index];
      x = press(button, x, puzzle.rules);
      list.append(
        el("li.kmg-machine-step", {}, [
          el("span.kmg-machine-op", { text: buttonLabel(button) }),
          el("span.kmg-machine-num", { text: String(x) }),
        ]),
      );
    }
    return list;
  }

  function paint() {
    clear(stage);
    shell.picker.refresh();
    const x = display();
    append(
      stage,
      el("p.kmg-machine-goal", { text: t("machine.goal", { start: puzzle.start, target: puzzle.target, par: puzzle.par }) }),
      el("div.kmg-machine-screen", { role: "status", "aria-live": "polite" }, [
        el("span.kmg-machine-now", { text: String(x), "aria-label": t("machine.display_label", { x }) }),
        el(`span.kmg-machine-target${x === puzzle.target ? ".is-hit" : ""}`, { text: `🎯 ${puzzle.target}` }),
      ]),
      el("p.kmg-machine-count", {
        text: t("machine.presses", { n: route.length, par: puzzle.par }),
      }),
    );
    const keys = el("div.kmg-machine-keys", { role: "group", "aria-label": t("machine.keys_label"), style: { "--kmg-machine-cols": String(puzzle.buttons.length <= 3 ? puzzle.buttons.length : puzzle.buttons.length === 4 ? 2 : 3) } });
    puzzle.buttons.forEach((button, index) => {
      const cls = `${hintButton === index ? ".is-hint" : ""}${shake === index ? ".is-shake" : ""}`;
      keys.append(
        el(`button.kmg-machine-key${cls}`, {
          type: "button",
          text: buttonLabel(button),
          disabled: !!finished,
          dataset: { key: index, kind: button.kind },
          "aria-label": ariaFor(button),
          onClick: () => pressKey(index),
        }),
      );
    });
    shake = null;
    append(stage, keys);
    if (route.length) append(stage, routeNode(route, puzzle.start, "machine.tape_label"));

    if (!finished) {
      append(
        stage,
        note ? el("div.kmg-banner.kmg-banner-info.kmg-machine-note", { role: "status" }, [
          el("span.kmg-banner-icon", { text: note.icon }),
          el("span.kmg-banner-body", { text: note.text }),
        ]) : null,
        el("div.kmg-machine-actions", {}, [
          el("button.kmg-btn.kmg-btn-ghost.kmg-machine-undo", { type: "button", text: t("machine.undo_button"), disabled: !route.length, onClick: undo }),
          el("button.kmg-btn.kmg-btn-ghost.kmg-machine-reset", { type: "button", text: t("machine.reset_button"), disabled: !route.length, onClick: reset }),
          el("button.kmg-btn.kmg-btn-ghost.kmg-machine-hint", { type: "button", text: t("machine.hint_button"), onClick: hint }),
          el("button.kmg-btn.kmg-btn-ghost.kmg-machine-giveup", { type: "button", text: t("machine.give_up_button"), onClick: () => finish("gaveup") }),
        ]),
      );
      return;
    }

    if (finished === "solved") {
      const verdictKey = stars === 3 ? "machine.solved_par" : stars === 2 ? "machine.solved_close" : "machine.solved_slow";
      append(
        stage,
        el("div.kmg-banner.kmg-banner-ok.kmg-machine-result", {}, [
          el("span.kmg-banner-icon", { text: "🧮" }),
          el("span.kmg-banner-body", { text: `${t(verdictKey, { presses: route.length, par: puzzle.par })} ${t("machine.points", { points: earned })}` }),
        ]),
        el("p.kmg-machine-stars", { "aria-label": t("machine.stars_label", { stars }), text: "⭐".repeat(stars) + "☆".repeat(3 - stars) }),
        statRow([
          { label: t("machine.stat_presses"), value: route.length },
          { label: t("machine.stat_par"), value: puzzle.par },
          { label: t("machine.stat_points"), value: earned },
        ]),
        hinted ? el("p.kmg-caption", { text: t("machine.hinted_note") }) : null,
      );
      if (route.length > puzzle.par) {
        append(stage, el("p.kmg-machine-best", { text: t("machine.shortest") }), routeNode(puzzle.route, puzzle.start, "machine.best_label"));
      }
    } else {
      append(
        stage,
        el("div.kmg-banner.kmg-banner-info.kmg-machine-result", {}, [
          el("span.kmg-banner-icon", { text: "🙈" }),
          el("span.kmg-banner-body", { text: t("machine.gave_up", { par: puzzle.par }) }),
        ]),
        el("p.kmg-machine-best", { text: t("machine.shortest") }),
        routeNode(puzzle.route, puzzle.start, "machine.best_label"),
      );
    }
    append(
      stage,
      climbInvite(GAME_KEY, () => newPuzzle()),
      el("div.kmg-actions", {}, [
        el("button.kmg-btn.kmg-btn-primary.kmg-btn-big.kmg-machine-new", { type: "button", text: t("machine.new_button"), onClick: () => newPuzzle() }),
      ]),
    );
    if (finished === "solved" && earned > 0) {
      const anchor = stage.querySelector(".kmg-machine-result");
      if (anchor) floatPoints(anchor, `+${earned}`);
    }
  }

  container.append(shell.root);
  newPuzzle();

  return () => shell.destroy();
}
