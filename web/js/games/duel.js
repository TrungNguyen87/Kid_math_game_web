/**
 * Telduel / Count Duel (round 20) - a strategy game against the computer
 * where the winning idea is arithmetic, not luck.
 *
 * Two players take turns counting up from 0. On your turn you say the next
 * number, but you may only add a few: "add 1, 2 or 3". Whoever says the
 * target number wins ("first to 100!"). It sounds like a game of chance - and
 * it is not. Work backwards from the end: whoever says 96 can be stopped,
 * but whoever says 89 cannot, because from 89 the opponent can reach at most
 * 99 and you finish the job. Those "safe totals" are always the same distance
 * apart - one more than the biggest step - so winning is a division: the
 * target divided by (biggest step + 1), and the remainder is what you say
 * first. That is the micro-lesson inside the game.
 *
 * The levels turn the idea over a few times:
 *   0-4  race to N, with a longer and longer count, a bigger step and a
 *        computer that slips less and less (you always begin);
 *   5    race to N where the CHILD CHOOSES who begins - a first player wins
 *        unless the target divides exactly, so the choice is a calculation;
 *   6    the twist: whoever says N LOSES, which moves every safe total by one;
 *   7    one step is forbidden ("add 1 to 12, but never 6"), which breaks the
 *        simple pattern: the safe totals come in pairs, and the only way to
 *        find them is to work backwards from the target.
 *
 * Every position is solved exactly (analyse() is a dynamic program over the
 * totals), so the computer can play perfectly, the 💡 hint can list the safe
 * totals, and a lost game can say what the winning plan was.
 *
 * One match is one round: a win levels up (and masters the level), a draw
 * (a win that needed the hint) stays, two losses in a row step down
 * (gameflow.js adaptAfterGame()).
 */
import { t } from "../i18n.js";
import { el, clear, append, raw } from "../dom.js";
import { markdown } from "../markdown.js";
import { addScore, awardablePoints, getLevel, recordFeat, saveCurrentProfile } from "../state.js";
import { adaptAfterGame, announceNewBadges, settleAnswer } from "../gameflow.js";
import { climbInvite, expander, gameShell, numberField, recordedCaption } from "../ui.js";
import { equippedAvatarEmoji } from "../rewards.js";
import { bigCelebration, confetti, floatPoints } from "../fx.js";
import * as sound from "../sound.js";

const GAME_KEY = "duel";
export const CPU_EMOJI = "🤖";

/**
 * Per level: the kind of game, the biggest step (`ks`, one is drawn) or a
 * biggest step with one forbidden step (`skips`, [biggest, forbidden]), the
 * range the target is drawn from, how often the
 * computer plays a random step instead of the best one (`slip`), and whether
 * the child chooses who begins.
 */
export const LEVEL_RULES = {
  0: { kind: "race", ks: [3], range: [10, 15], slip: 0.5, choose: false },
  1: { kind: "race", ks: [4], range: [17, 24], slip: 0.4, choose: false },
  2: { kind: "race", ks: [5], range: [28, 40], slip: 0.3, choose: false },
  3: { kind: "race", ks: [6, 7], range: [45, 64], slip: 0.2, choose: false },
  4: { kind: "race", ks: [9, 10], range: [80, 120], slip: 0.1, choose: false },
  5: { kind: "race", ks: [11, 12, 14], range: [100, 150], slip: 0.04, choose: true },
  6: { kind: "misere", ks: [8, 9, 11], range: [80, 130], slip: 0, choose: true },
  7: { kind: "set", skips: [[12, 6], [12, 5], [11, 5], [10, 4]], range: [70, 110], slip: 0, choose: true },
};

/** How many allowed steps still fit on a row of buttons; more than this and the child types the number. */
export const BUTTON_STEPS = 5;

// ---------------------------------------------------------------------------
// Rules (pure, tested in tests/web/test_brain.mjs)
// ---------------------------------------------------------------------------

const clampLevel = (level) => Math.max(0, Math.min(7, level));

/**
 * Solve a game completely. `lose[t]` is true when the player who has to move
 * at running total `t` loses with the best play on both sides.
 *
 * At the target itself the game is over: in the normal game the player who
 * said it has won, so the one "to move" there has lost; in the misère game
 * (whoever says it loses) it is the other way round. A player who has no
 * legal step left loses too, which only matters for step sets without a 1.
 * @returns {{lose: boolean[]}}
 */
export function analyse(rules) {
  const { target, steps, misere } = rules;
  const lose = Array(target + 1).fill(false);
  lose[target] = !misere;
  for (let total = target - 1; total >= 0; total--) {
    lose[total] = !steps.some((step) => total + step <= target && lose[total + step]);
  }
  return { lose };
}

/** The steps allowed right now: in the set, and not past the target. */
export function legalSteps(rules, total) {
  return rules.steps.filter((step) => total + step <= rules.target);
}

/** The steps that leave the opponent in a lost position (empty when the mover is already lost). */
export function winningSteps(rules, total, lose = analyse(rules).lose) {
  return legalSteps(rules, total).filter((step) => lose[total + step]);
}

/**
 * The totals worth saying, smallest first: say one of these and, with the
 * right replies, the opponent can no longer win. (In the misère game the
 * target itself is never one of them.)
 */
export function safeTotals(rules) {
  const { lose } = analyse(rules);
  const totals = [];
  for (let total = 1; total <= rules.target; total++) if (lose[total]) totals.push(total);
  return totals;
}

/**
 * Rules for a new match at `level`. Without a choice of who begins, the
 * child always gets a position the first player can win (so a child who
 * works out the pattern can always win); where the child chooses, about a
 * third of the matches are ones the first player loses, so choosing to go
 * first every time is a mistake that costs something.
 */
export function makeRules(level, rng = Math.random) {
  const spec = LEVEL_RULES[clampLevel(level)];
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const [lo, hi] = spec.range;
  const build = () => {
    const target = lo + Math.floor(rng() * (hi - lo + 1));
    let steps;
    if (spec.skips) {
      const [biggest, skip] = pick(spec.skips);
      steps = Array.from({ length: biggest }, (_, i) => i + 1).filter((step) => step !== skip);
    } else {
      steps = Array.from({ length: pick(spec.ks) }, (_, i) => i + 1);
    }
    return { level: clampLevel(level), kind: spec.kind, target, steps, misere: spec.kind === "misere", slip: spec.slip, choose: spec.choose };
  };
  const wantLost = spec.choose && rng() < 0.35;
  for (let attempt = 0; attempt < 400; attempt++) {
    const rules = build();
    const firstLoses = analyse(rules).lose[0];
    if (spec.choose ? firstLoses === wantLost : !firstLoses) return rules;
  }
  // Practically unreachable; a rule set the first player wins, to be safe.
  for (;;) {
    const rules = build();
    if (!analyse(rules).lose[0]) return rules;
  }
}

/** Who wins from here with perfect play: "first" or "second". */
export function perfectWinner(rules) {
  return analyse(rules).lose[0] ? "second" : "first";
}

/** A fresh match. `first` is who says the first number: "me" or "cpu". */
export function newMatch(rules, first = "me") {
  return { rules, total: 0, turn: first, first, winner: null, history: [] };
}

/**
 * Say the next number: add `step` for whoever's turn it is. Returns the
 * history entry. Ends the match when the target is reached.
 */
export function playStep(match, step) {
  const { rules } = match;
  if (match.winner || !legalSteps(rules, match.total).includes(step)) throw new Error(`illegal step ${step} at ${match.total}`);
  const who = match.turn;
  match.total += step;
  const entry = { who, step, total: match.total };
  match.history.push(entry);
  if (match.total === rules.target) {
    const other = who === "me" ? "cpu" : "me";
    match.winner = rules.misere ? other : who;
  } else {
    match.turn = who === "me" ? "cpu" : "me";
    // Nobody can move (only possible for step sets without a 1): the one to move loses.
    if (!legalSteps(rules, match.total).length) match.winner = who;
  }
  return entry;
}

/**
 * The computer's step: a winning one when there is one - except that on
 * `rules.slip` of its turns it plays a random legal step instead - and a
 * random legal step when every step loses.
 */
export function cpuStep(match, rng = Math.random) {
  const { rules, total } = match;
  const legal = legalSteps(rules, total);
  if (!legal.length) return null;
  const winning = winningSteps(rules, total);
  const pool = winning.length && rng() >= rules.slip ? winning : legal;
  return pool[Math.floor(rng() * pool.length)];
}

/**
 * The allowed steps in words: "1 to 10", "1 to 12, except 6" or, for anything
 * else, a plain list. (Level 7 is always a range with one step missing.)
 */
export function describeSteps(steps) {
  const biggest = Math.max(...steps);
  const missing = [];
  for (let step = 1; step <= biggest; step++) if (!steps.includes(step)) missing.push(step);
  if (!missing.length) return t("duel.steps_range", { max: biggest });
  if (missing.length === 1) return t("duel.steps_except", { max: biggest, skip: missing[0] });
  return steps.join(", ");
}

/** Points for a won match: a little for every safe total landed on, plus a bonus for the win. */
export const LANDING_POINTS = (level) => level + 1;
export const WIN_POINTS = (level) => 8 * (level + 1);

/** Did this step land on a safe total (one the opponent can no longer beat)? */
export function isLanding(entry, lose) {
  return lose[entry.total] === true;
}

/** "1 · 12 · 23 … 89 · 100": a long list of totals, shortened to its two ends. */
export function listText(totals, head = 5, tail = 2) {
  if (totals.length <= head + tail + 1) return totals.join(" · ");
  return `${totals.slice(0, head).join(" · ")} … ${totals.slice(-tail).join(" · ")}`;
}

/**
 * The explanation shown after a match: a division for a plain race, the
 * shifted version for the misère game, the list for a step set.
 * @returns {{key: string, vars: object}}
 */
export function explanation(rules) {
  const gap = Math.max(...rules.steps) + 1;
  const list = listText(safeTotals(rules));
  const { target } = rules;
  if (rules.kind === "race") {
    const rest = target % gap;
    return { key: rest === 0 ? "duel.explain_race_zero" : "duel.explain_race", vars: { target, gap, q: Math.floor(target / gap), r: rest, list } };
  }
  if (rules.kind === "misere") {
    const base = target - 1;
    const rest = base % gap;
    return { key: rest === 0 ? "duel.explain_misere_zero" : "duel.explain_misere", vars: { target, base, gap, q: Math.floor(base / gap), r: rest, list } };
  }
  return { key: "duel.explain_set", vars: { target, steps: describeSteps(rules.steps), list } };
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

export function render(container) {
  let rules = null;
  let match = null;
  let lose = null;
  let landings = 0;
  let hinted = 0; // hint presses this match; any makes a win "with help"
  let showSafe = 0; // 0 none, 1 the last few safe totals, 2 all of them
  let note = null;
  let result = null;
  let waitingForStart = false;
  let cpuTimer = null;
  let field = null;

  const shell = gameShell({
    gameKey: GAME_KEY,
    emoji: "🎲",
    titleKey: "duel.title",
    taglineKey: "duel.tagline",
    introKey: "duel.intro",
    autoAdvance: false,
    onLevelChange: () => startMatch(),
  });

  const stage = el("div.kmg-stage.kmg-duel");
  shell.slots.extraSlot.append(
    stage,
    expander(t("duel.how_to_heading"), raw("div", markdown(t("duel.how_to_body")))),
    recordedCaption(),
  );

  function startMatch() {
    clearTimeout(cpuTimer);
    rules = makeRules(getLevel(GAME_KEY));
    lose = analyse(rules).lose;
    match = newMatch(rules, "me");
    landings = 0;
    hinted = 0;
    showSafe = 0;
    result = null;
    waitingForStart = rules.choose;
    note = { icon: "🎲", text: rules.choose ? t("duel.choose_note") : t("duel.your_turn_first") };
    paint();
    if (!waitingForStart) beginTurn();
  }

  function chooseStarter(first) {
    if (!waitingForStart) return;
    waitingForStart = false;
    match = newMatch(rules, first);
    note = { icon: first === "me" ? "🎲" : CPU_EMOJI, text: t(first === "me" ? "duel.you_start" : "duel.cpu_starts") };
    sound.playTap();
    paint();
    beginTurn();
  }

  function beginTurn() {
    if (match.winner) return;
    if (match.turn === "cpu") {
      cpuTimer = setTimeout(() => {
        const step = cpuStep(match);
        if (step == null) return;
        const entry = playStep(match, step);
        sound.playTap();
        note = { icon: CPU_EMOJI, text: t("duel.cpu_said", { step, total: entry.total }) };
        afterStep();
      }, 900);
    }
  }

  function childStep(step) {
    if (!match || match.winner || match.turn !== "me" || waitingForStart) return;
    const total = match.total;
    if (!legalSteps(rules, total).includes(step)) {
      note = { icon: "🚫", text: illegalText() };
      sound.playIncorrect();
      paint();
      return;
    }
    const entry = playStep(match, step);
    const landed = isLanding(entry, lose);
    if (landed) landings += 1;
    sound.playTap();
    note = landed
      ? { icon: "✨", text: t("duel.landed", { total: entry.total }) }
      : { icon: "🎲", text: t("duel.you_said", { total: entry.total }) };
    afterStep();
  }

  function illegalText() {
    const legal = legalSteps(rules, match.total);
    if (!legal.length) return t("duel.no_move");
    if (rules.kind !== "set") {
      return t("duel.illegal_range", { low: match.total + Math.min(...legal), high: match.total + Math.max(...legal) });
    }
    return t("duel.illegal_steps", { steps: describeSteps(rules.steps) });
  }

  function afterStep() {
    if (match.winner) {
      endMatch();
      return;
    }
    paint();
    beginTurn();
  }

  function endMatch() {
    clearTimeout(cpuTimer);
    const level = getLevel(GAME_KEY);
    const won = match.winner === "me";
    const logQuestion = t("duel.log_question", { target: rules.target, steps: stepsText() });
    let earned = 0;
    if (won) {
      // Looking at the safe totals is allowed, but it halves what the win pays.
      const full = landings * LANDING_POINTS(level) + WIN_POINTS(level);
      earned = awardablePoints(GAME_KEY, level, hinted ? Math.round(full / 2) : full);
      if (earned > 0) addScore(earned);
      bigCelebration();
      confetti({ count: 90 });
      sound.playFanfare();
    } else {
      sound.playTimeUp();
    }
    settleAnswer({
      gameKey: GAME_KEY,
      level,
      questionText: logQuestion,
      studentAnswer: won ? t("duel.log_won", { hints: hinted }) : t("duel.log_lost"),
      correctAnswer: t("duel.log_won", { hints: 0 }),
      isCorrect: won,
      points: earned,
      adaptLevel: false,
      score: false,
    });
    if (won && level >= 5 && hinted === 0 && recordFeat("duel_hard")) {
      announceNewBadges();
      saveCurrentProfile();
    }
    // A win that needed the hint stays on the level; the next one without it moves up.
    adaptAfterGame(GAME_KEY, won ? (hinted ? "draw" : "win") : "loss");
    result = { won, earned };
    saveCurrentProfile();
    paint();
  }

  // --- painting -------------------------------------------------------------

  function safeSet() {
    const all = safeTotals(rules);
    if (showSafe === 0) return new Set();
    return new Set(showSafe === 1 ? all.slice(-3) : all);
  }

  function track() {
    const { target } = rules;
    const safe = safeSet();
    const owner = new Map(match.history.map((entry) => [entry.total, entry.who]));
    if (target <= 40) {
      const grid = el("div.kmg-duel-cells", { role: "img", "aria-label": t("duel.track_label", { total: match.total, target }) });
      for (let n = 1; n <= target; n++) {
        const cls = [
          owner.get(n) === "me" ? ".is-mine" : owner.get(n) === "cpu" ? ".is-theirs" : "",
          n === match.total ? ".is-now" : "",
          safe.has(n) ? ".is-safe" : "",
          n === target ? ".is-goal" : "",
        ].join("");
        grid.append(el(`span.kmg-duel-cell${cls}`, { text: n === target ? (rules.misere ? "☠️" : "🏁") : String(n) }));
      }
      return grid;
    }
    const bar = el("div.kmg-duel-bar", { role: "img", "aria-label": t("duel.track_label", { total: match.total, target }) });
    bar.append(el("span.kmg-duel-fill", { style: { width: `${(match.total / target) * 100}%` } }));
    for (const n of safe) bar.append(el("span.kmg-duel-mark", { style: { left: `${(n / target) * 100}%` }, title: String(n) }));
    bar.append(el("span.kmg-duel-goal", { text: rules.misere ? "☠️" : "🏁" }));
    return bar;
  }

  function historyNode() {
    const me = Array.from(equippedAvatarEmoji())[0];
    const row = el("ol.kmg-duel-history", { "aria-label": t("duel.history_label") });
    for (const entry of match.history.slice(-8)) {
      row.append(
        el(`li.kmg-duel-move${entry.who === "me" ? ".is-mine" : ".is-theirs"}`, {}, [
          el("span.kmg-duel-who", { text: entry.who === "me" ? me : CPU_EMOJI }),
          el("span.kmg-duel-step", { text: `+${entry.step}` }),
          el("span.kmg-duel-total", { text: String(entry.total) }),
        ]),
      );
    }
    return match.history.length ? row : null;
  }

  function entryNode() {
    const myTurn = match.turn === "me" && !match.winner && !waitingForStart;
    if (!myTurn) return null;
    const legal = legalSteps(rules, match.total);
    if (rules.steps.length <= BUTTON_STEPS) {
      const row = el("div.kmg-duel-steps", { role: "group", "aria-label": t("duel.pick_step"), style: { "--kmg-duel-steps": String(rules.steps.length) } });
      for (const step of rules.steps) {
        row.append(
          el("button.kmg-btn.kmg-btn-primary.kmg-duel-stepbtn", {
            type: "button",
            disabled: !legal.includes(step),
            dataset: { step },
            "aria-label": t("duel.step_aria", { step, total: match.total + step }),
            onClick: () => childStep(step),
          }, [el("strong", { text: `+${step}` }), el("small", { text: `→ ${match.total + step}` })]),
        );
      }
      return row;
    }
    field = numberField({
      label: t("duel.say_label"),
      onSubmit: () => submitTyped(),
    });
    return el("div.kmg-duel-typed", {}, [
      el("p.kmg-duel-range", {
        text: t("duel.range_hint", { low: match.total + Math.min(...legal), high: match.total + Math.max(...legal) }),
      }),
      field.node,
      el("button.kmg-btn.kmg-btn-primary.kmg-btn-big.kmg-duel-say", { type: "button", text: t("duel.say_button"), onClick: () => submitTyped() }),
    ]);
  }

  function submitTyped() {
    const value = field?.value();
    if (value == null) return;
    childStep(value - match.total);
  }

  function hintNode() {
    if (match.winner || waitingForStart) return null;
    const all = safeTotals(rules);
    const lines = [];
    if (showSafe >= 1) {
      const shown = (showSafe === 1 ? all.slice(-3) : all).join(" · ");
      lines.push(el("p.kmg-duel-hinttext", { text: t(showSafe === 1 ? "duel.hint_last" : "duel.hint_all", { list: shown, target: rules.target }) }));
    }
    return el("div.kmg-duel-hint", {}, [
      ...lines,
      el("button.kmg-btn.kmg-btn-ghost.kmg-duel-hintbtn", {
        type: "button",
        text: t(showSafe === 0 ? "duel.hint_button" : "duel.hint_more_button"),
        disabled: showSafe >= 2,
        onClick: () => {
          showSafe += 1;
          hinted += 1;
          sound.playTap();
          paint();
        },
      }),
    ]);
  }

  function starterNode() {
    if (!waitingForStart) return null;
    const me = Array.from(equippedAvatarEmoji())[0];
    return el("div.kmg-duel-starter", { role: "group", "aria-label": t("duel.choose_label") }, [
      el("button.kmg-btn.kmg-btn-primary.kmg-btn-big.kmg-duel-first", { type: "button", text: `${me} ${t("duel.i_start")}`, onClick: () => chooseStarter("me") }),
      el("button.kmg-btn.kmg-btn-primary.kmg-btn-big.kmg-duel-second", { type: "button", text: `${CPU_EMOJI} ${t("duel.cpu_start")}`, onClick: () => chooseStarter("cpu") }),
    ]);
  }

  function paint() {
    clear(stage);
    shell.picker.refresh();
    const me = Array.from(equippedAvatarEmoji())[0];
    const rule = rules.misere ? "duel.rule_misere" : "duel.rule_race";
    append(
      stage,
      el("p.kmg-duel-rule", {
        text: t(rule, { target: rules.target, steps: stepsText() }),
      }),
      el("div.kmg-duel-score", {}, [
        el("span.kmg-chip", { text: `${me} ${t("duel.you")}` }),
        el("span.kmg-duel-now", { "aria-live": "polite" }, [
          el("strong", { text: String(match.total) }),
          el("small", { text: ` / ${rules.target}` }),
        ]),
        el("span.kmg-chip", { text: `${CPU_EMOJI} ${t("duel.computer")}` }),
      ]),
      track(),
      historyNode(),
      // The latest news sits between the counter and the keys, where a phone's
      // screen still shows it - not below the number pad.
      note ? el("div.kmg-banner.kmg-banner-info.kmg-duel-note", { role: "status" }, [
        el("span.kmg-banner-icon", { text: note.icon }),
        el("span.kmg-banner-body", { text: note.text }),
      ]) : null,
      !match.winner && match.turn === "cpu" ? el("p.kmg-duel-status", { text: t("duel.cpu_thinking") }) : null,
      starterNode(),
      entryNode(),
      hintNode(),
    );
    if (result) {
      const { key, vars } = explanation(rules);
      append(
        stage,
        el(`div.kmg-banner.${result.won ? "kmg-banner-ok" : "kmg-banner-info"}.kmg-duel-result`, {}, [
          el("span.kmg-banner-icon", { text: result.won ? "🏆" : CPU_EMOJI }),
          el("span.kmg-banner-body", {
            text: result.won
              ? `${t(hinted ? "duel.won_help" : "duel.won")} ${t("duel.points", { points: result.earned })}`
              : t("duel.lost"),
          }),
        ]),
        el("div.kmg-duel-explain", {}, [el("strong", { text: t("duel.explain_heading") }), el("p", { text: t(key, vars) })]),
        climbInvite(GAME_KEY, () => startMatch()),
        el("div.kmg-actions", {}, [
          el("button.kmg-btn.kmg-btn-primary.kmg-btn-big.kmg-duel-again", { type: "button", text: t("duel.again_button"), onClick: () => startMatch() }),
        ]),
      );
      if (result.won && result.earned > 0) {
        const anchor = stage.querySelector(".kmg-duel-result");
        if (anchor) floatPoints(anchor, `+${result.earned}`);
      }
    }
  }

  const stepsText = () => describeSteps(rules.steps);

  container.append(shell.root);
  startMatch();

  return () => {
    clearTimeout(cpuTimer);
    shell.destroy();
  };
}
