/**
 * Tafeltactiek / Times Tactics (round 19) - a strategy board game against
 * the computer, built on the times tables. (It is the classroom "product
 * game": two paper clips on a strip of factors, and a board of products.)
 *
 * The board holds every product of two factors (1-6 at level 0, up to 1-10
 * at level 7). Two clips sit on the factor strip. On your turn you move ONE
 * clip to another factor, and then claim the square with the two clips'
 * product - but only if you get the sum right. Get three (or four) squares
 * in a row before the computer does.
 *
 * The strategy is where the thinking is: you pick the square you want, then
 * work out which factor gets you there ("I want 24, the other clip is on 6,
 * so I move to 4") - division, in the service of winning. And every move
 * changes what your opponent can reach next, so a strong player looks one
 * move ahead. The computer's strength grows with the level: at level 0 it
 * mostly moves at random, from level 1 it blocks, and from level 4 it also
 * avoids handing you a winning move.
 *
 * A wrong answer does not claim the square - the turn simply passes, and
 * the right answer is shown. A win masters the level; two losses in a row
 * step it down (gameflow.js adaptAfterGame()).
 */
import { t } from "../i18n.js";
import { shuffle } from "../rng.js";
import { el, clear, append, raw } from "../dom.js";
import { markdown } from "../markdown.js";
import { addScore, awardablePoints, getLevel, recordFeat, saveCurrentProfile } from "../state.js";
import { adaptAfterGame, announceNewBadges, settleAnswer } from "../gameflow.js";
import { climbInvite, expander, gameShell, recordedCaption } from "../ui.js";
import { equippedAvatarEmoji } from "../rewards.js";
import { bigCelebration, confetti, floatPoints } from "../fx.js";
import * as sound from "../sound.js";

const GAME_KEY = "tactiek";
export const CPU_EMOJI = "🤖";

/**
 * Per level: the factors on the strip, the board shape, how many in a row
 * win, how many answer options, and the computer's strength - the chance it
 * just plays a random move, whether it blocks your wins, and whether it
 * looks one move ahead.
 */
export const LEVEL_RULES = {
  0: { lo: 1, hi: 6, rows: 3, cols: 6, need: 3, options: 3, random: 0.6, block: false, lookahead: false },
  1: { lo: 1, hi: 6, rows: 3, cols: 6, need: 3, options: 3, random: 0.35, block: true, lookahead: false },
  2: { lo: 1, hi: 7, rows: 5, cols: 5, need: 4, options: 3, random: 0.4, block: true, lookahead: false },
  3: { lo: 1, hi: 7, rows: 5, cols: 5, need: 4, options: 3, random: 0.25, block: true, lookahead: false },
  4: { lo: 1, hi: 9, rows: 6, cols: 6, need: 4, options: 4, random: 0.2, block: true, lookahead: true },
  5: { lo: 1, hi: 9, rows: 6, cols: 6, need: 4, options: 4, random: 0.1, block: true, lookahead: true },
  6: { lo: 1, hi: 9, rows: 6, cols: 6, need: 4, options: 4, random: 0.04, block: true, lookahead: true },
  7: { lo: 1, hi: 10, rows: 6, cols: 7, need: 4, options: 4, random: 0, block: true, lookahead: true },
};

// ---------------------------------------------------------------------------
// Rules (pure, tested in tests/web/test_puzzles.mjs)
// ---------------------------------------------------------------------------

/** Every product of two factors in lo..hi, smallest first. */
export function boardNumbers(lo, hi) {
  const set = new Set();
  for (let a = lo; a <= hi; a++) for (let b = lo; b <= hi; b++) set.add(a * b);
  return [...set].sort((x, y) => x - y);
}

/** A fresh match for `level`. */
export function newMatch(level, rng = Math.random) {
  const rules = LEVEL_RULES[Math.max(0, Math.min(7, level))];
  const numbers = boardNumbers(rules.lo, rules.hi);
  const factors = [];
  for (let f = rules.lo; f <= rules.hi; f++) factors.push(f);
  const a = factors[Math.floor(rng() * factors.length)];
  let b = factors[Math.floor(rng() * factors.length)];
  if (b === a) b = factors[(factors.indexOf(a) + 1) % factors.length];
  return {
    level,
    rules,
    numbers,
    factors,
    owner: Array(numbers.length).fill(null),
    clips: [a, b],
    turn: "me",
    winner: null,
    winLine: [],
    last: null,
  };
}

/** All moves open to whoever moves next: move clip 0 or 1 to a factor whose product is still free. */
export function legalMoves(match) {
  const moves = [];
  for (const clip of [0, 1]) {
    for (const factor of match.factors) {
      if (factor === match.clips[clip]) continue;
      const product = factor * match.clips[1 - clip];
      const index = match.numbers.indexOf(product);
      if (index !== -1 && match.owner[index] == null) moves.push({ clip, factor, product, index });
    }
  }
  return moves;
}

/** The winning line through `index` for `who`, or [] if claiming it wins nothing. */
export function lineThrough(match, index, who) {
  const { rows, cols, need } = match.rules;
  const r0 = Math.floor(index / cols);
  const c0 = index % cols;
  const mine = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols && (r * cols + c === index || match.owner[r * cols + c] === who);
  for (const [dr, dc] of [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]) {
    const line = [index];
    for (let k = 1; mine(r0 + dr * k, c0 + dc * k); k++) line.push((r0 + dr * k) * cols + c0 + dc * k);
    for (let k = 1; mine(r0 - dr * k, c0 - dc * k); k++) line.unshift((r0 - dr * k) * cols + c0 - dc * k);
    if (line.length >= need) return line;
  }
  return [];
}

/**
 * Make a move for whoever's turn it is. `correct` says whether the product
 * was answered right: only then is the square claimed. Returns the move's
 * result and updates the match (turn, winner, draw).
 */
export function playMove(match, move, correct = true) {
  const who = match.turn;
  match.clips[move.clip] = move.factor;
  match.last = { ...move, who, correct };
  if (correct) {
    match.owner[move.index] = who;
    const line = lineThrough(match, move.index, who);
    if (line.length) {
      match.winner = who;
      match.winLine = line;
      return match.last;
    }
  }
  match.turn = who === "me" ? "cpu" : "me";
  // No move left for the next player (or a full board): a draw.
  if (!legalMoves(match).length) match.winner = "draw";
  return match.last;
}

/** Does `who` have a move right now that wins on the spot? */
function hasWinningMove(match, who) {
  return legalMoves(match).some((move) => lineThrough(match, move.index, who).length > 0);
}

/** How promising a square is for `who`: its best partial line, counted in own squares. */
function potential(match, index, who) {
  const { rows, cols, need } = match.rules;
  const r0 = Math.floor(index / cols);
  const c0 = index % cols;
  let best = 0;
  for (const [dr, dc] of [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]) {
    // Every window of `need` cells along this direction that contains the square.
    for (let shift = 0; shift < need; shift++) {
      let own = 0;
      let blocked = false;
      for (let k = 0; k < need; k++) {
        const r = r0 + dr * (k - shift);
        const c = c0 + dc * (k - shift);
        if (r < 0 || r >= rows || c < 0 || c >= cols) {
          blocked = true;
          break;
        }
        const o = match.owner[r * cols + c];
        if (o === who) own += 1;
        else if (o != null) blocked = true;
      }
      if (!blocked) best = Math.max(best, own);
    }
  }
  return best;
}

/**
 * The computer's move. Always takes a win; blocks one of yours if its level
 * says so; from level 4 avoids moves that leave you a winning reply; and
 * otherwise builds towards its own line while getting in the way of yours.
 * At the low levels it often just plays something random.
 */
export function cpuMove(match, rng = Math.random) {
  const moves = legalMoves(match);
  if (!moves.length) return null;
  const { rules } = match;
  const winning = moves.find((move) => lineThrough(match, move.index, "cpu").length);
  if (winning && rng() >= rules.random / 2) return winning;
  if (rng() < rules.random) return moves[Math.floor(rng() * moves.length)];
  let best = null;
  let bestScore = -Infinity;
  for (const move of moves) {
    let score = potential(match, move.index, "cpu") * 10 + potential(match, move.index, "me") * 8 + rng() * 3;
    if (winning && move === winning) score += 10000;
    if (rules.block && lineThrough(match, move.index, "me").length) score += 5000;
    if (rules.lookahead) {
      // Try it: would the child then have a winning reply?
      const trial = { ...match, owner: [...match.owner], clips: [...match.clips], turn: "cpu", winner: null };
      playMove(trial, move, true);
      if (!trial.winner && hasWinningMove(trial, "me")) score -= 3000;
    }
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

/** Answer options for a × b: the product and plausible neighbours from the board. */
export function productOptions(match, a, b, count) {
  const answer = a * b;
  const near = new Set();
  for (const guess of [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, a + b, answer + 1, answer - 1, answer + 10, answer - 10]) {
    if (guess > 0 && guess !== answer) near.add(guess);
  }
  const fromBoard = match.numbers.filter((n) => n !== answer && Math.abs(n - answer) <= Math.max(6, answer * 0.3));
  let pool = [...near].filter((n) => n <= match.numbers[match.numbers.length - 1] + 10);
  pool = shuffle([...new Set([...pool, ...fromBoard])]);
  const wrong = pool.slice(0, count - 1);
  while (wrong.length < count - 1) {
    const extra = answer + wrong.length + 2;
    if (!wrong.includes(extra)) wrong.push(extra);
  }
  return shuffle([answer, ...wrong]);
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

const MOVE_POINTS = (level) => 3 * (level + 1);
const WIN_POINTS = (level) => 10 * (level + 1);

export function render(container) {
  let match = null;
  let pending = null; // the child's chosen move, waiting for the answer
  let options = [];
  let note = null;
  let cpuTimer = null;
  let matchPoints = 0;
  let result = null;

  const shell = gameShell({
    gameKey: GAME_KEY,
    emoji: "♟️",
    titleKey: "tactiek.title",
    taglineKey: "tactiek.tagline",
    introKey: "tactiek.intro",
    autoAdvance: false,
    onLevelChange: () => startMatch(),
  });

  const stage = el("div.kmg-stage.kmg-tactic");
  shell.slots.extraSlot.append(
    stage,
    expander(t("tactiek.how_to_heading"), raw("div", markdown(t("tactiek.how_to_body")))),
    recordedCaption(),
  );

  function startMatch() {
    clearTimeout(cpuTimer);
    match = newMatch(getLevel(GAME_KEY));
    pending = null;
    note = { icon: "♟️", text: t("tactiek.your_turn_first", { need: match.rules.need }) };
    matchPoints = 0;
    result = null;
    paint();
  }

  function choose(clip, factor) {
    if (!match || match.winner || match.turn !== "me" || pending) return;
    if (factor === match.clips[clip]) return;
    const other = match.clips[1 - clip];
    const product = factor * other;
    const index = match.numbers.indexOf(product);
    if (match.owner[index] != null) {
      // Taken: no penalty, just say so and let the child pick again.
      note = { icon: "🚫", text: t("tactiek.taken", { a: factor, b: other, product }) };
      sound.playIncorrect();
      paint();
      return;
    }
    pending = { clip, factor, product, index, other };
    options = productOptions(match, factor, other, match.rules.options);
    note = null;
    sound.playTap();
    paint();
  }

  function answer(value, button) {
    if (!pending) return;
    const move = pending;
    const isCorrect = value === move.product;
    const level = getLevel(GAME_KEY);
    pending = null;
    const { pointsAwarded } = settleAnswer({
      gameKey: GAME_KEY,
      level,
      questionText: `${move.factor} × ${move.other}`,
      studentAnswer: value,
      correctAnswer: move.product,
      isCorrect,
      points: MOVE_POINTS(level),
      adaptLevel: false,
      burstFrom: isCorrect ? button : null,
    });
    matchPoints += pointsAwarded;
    if (isCorrect && pointsAwarded > 0 && button) floatPoints(button, `+${pointsAwarded}`);
    playMove(match, move, isCorrect);
    note = isCorrect
      ? { icon: "✅", text: t("tactiek.claimed", { a: move.factor, b: move.other, product: move.product }) }
      : { icon: "💡", text: t("tactiek.wrong", { a: move.factor, b: move.other, product: move.product }) };
    afterMove();
  }

  function afterMove() {
    if (match.winner) {
      endMatch();
      return;
    }
    paint();
    if (match.turn === "cpu") {
      cpuTimer = setTimeout(() => {
        const move = cpuMove(match);
        if (!move) {
          match.winner = "draw";
          endMatch();
          return;
        }
        const other = match.clips[1 - move.clip];
        playMove(match, move, true);
        sound.playTap();
        note = { icon: CPU_EMOJI, text: t("tactiek.cpu_moved", { a: move.factor, b: other, product: move.product }) };
        if (match.winner) endMatch();
        else paint();
      }, 950);
    }
  }

  function endMatch() {
    clearTimeout(cpuTimer);
    const level = getLevel(GAME_KEY);
    if (match.winner === "me") {
      const bonus = awardablePoints(GAME_KEY, level, WIN_POINTS(level));
      if (bonus > 0) addScore(bonus);
      matchPoints += bonus;
      result = { icon: "🏆", key: "tactiek.won", good: true };
      bigCelebration();
      confetti({ count: 90 });
      sound.playFanfare();
      if (level >= 5 && recordFeat("tactiek_win_hard")) {
        announceNewBadges();
        saveCurrentProfile();
      }
      adaptAfterGame(GAME_KEY, "win");
    } else if (match.winner === "cpu") {
      result = { icon: CPU_EMOJI, key: "tactiek.lost", good: false };
      sound.playTimeUp();
      adaptAfterGame(GAME_KEY, "loss");
    } else {
      result = { icon: "🤝", key: "tactiek.draw", good: false };
      adaptAfterGame(GAME_KEY, "draw");
    }
    saveCurrentProfile();
    paint();
  }

  // --- painting -------------------------------------------------------------

  function boardNode() {
    const { rows, cols } = match.rules;
    const node = el("div.kmg-tactic-board", {
      role: "grid",
      "aria-label": t("tactiek.board_label"),
      style: { "--kmg-tactic-cols": String(cols) },
    });
    const me = equippedAvatarEmoji();
    const win = new Set(match.winLine);
    match.numbers.forEach((number, index) => {
      const owner = match.owner[index];
      const classes = [
        owner === "me" ? ".is-mine" : owner === "cpu" ? ".is-theirs" : "",
        win.has(index) ? ".is-win" : "",
        match.last?.index === index ? ".is-last" : "",
      ].join("");
      node.append(
        el(`div.kmg-tactic-cell${classes}`, { role: "gridcell", title: String(number) }, [
          el("span.kmg-tactic-num", { text: String(number) }),
          owner ? el("span.kmg-tactic-token", { text: owner === "me" ? Array.from(me)[0] : CPU_EMOJI, "aria-hidden": "true" }) : null,
        ]),
      );
    });
    // rows is implied by the numbers; kept in the rules for the win check.
    node.dataset.rows = String(rows);
    return node;
  }

  function strip(clip) {
    const active = match.turn === "me" && !match.winner && !pending;
    return el("div.kmg-tactic-strip", {}, [
      el("span.kmg-tactic-strip-label", { text: t("tactiek.clip_label", { clip: clip === 0 ? "A" : "B" }) }),
      el(
        "div.kmg-tactic-factors",
        {
          style: {
            "--kmg-tactic-factors": String(match.factors.length),
            // On a narrow phone nine or ten factors go on two rows, so every
            // button stays wide enough for a finger.
            "--kmg-tactic-narrow": String(match.factors.length > 7 ? Math.ceil(match.factors.length / 2) : match.factors.length),
          },
        },
        match.factors.map((factor) =>
          el(`button.kmg-tactic-factor${factor === match.clips[clip] ? ".has-clip" : ""}`, {
            type: "button",
            text: String(factor),
            disabled: !active || factor === match.clips[clip],
            "aria-label": t("tactiek.move_aria", { clip: clip === 0 ? "A" : "B", factor }),
            dataset: { clip, factor },
            onClick: () => choose(clip, factor),
          }),
        ),
      ),
    ]);
  }

  function paint() {
    clear(stage);
    shell.picker.refresh();
    const me = equippedAvatarEmoji();
    append(
      stage,
      el("div.kmg-tactic-score", {}, [
        el("span.kmg-chip", { text: `${Array.from(me)[0]} ${t("tactiek.you")}` }),
        el("span.kmg-tactic-vs", { text: t("tactiek.goal", { need: match.rules.need }) }),
        el("span.kmg-chip", { text: `${CPU_EMOJI} ${t("tactiek.computer")}` }),
      ]),
      el("div.kmg-tactic-wrap", {}, [boardNode()]),
      el("div.kmg-tactic-clips", {}, [
        el("p.kmg-tactic-clipsnow", {
          text: t("tactiek.clips_now", { a: match.clips[0], b: match.clips[1] }),
        }),
        strip(0),
        strip(1),
      ]),
    );

    if (pending) {
      const grid = el("div.kmg-choices", { style: { "--kmg-cols": String(match.rules.options) } });
      for (const option of options) {
        const button = el("button.kmg-choice.kmg-tactic-option", {
          type: "button",
          text: String(option),
          onClick: () => answer(option, button),
        });
        grid.append(button);
      }
      stage.append(
        el("div.kmg-card.kmg-tactic-question", { role: "dialog", "aria-label": t("tactiek.question_label") }, [
          el("p.kmg-tactic-question-text", { text: `${pending.factor} × ${pending.other} = ?` }),
          grid,
          el("button.kmg-btn.kmg-btn-ghost.kmg-tactic-cancel", {
            type: "button",
            text: t("tactiek.cancel_button"),
            onClick: () => {
              pending = null;
              paint();
            },
          }),
        ]),
      );
    }

    const status = match.winner
      ? null
      : match.turn === "me"
        ? pending
          ? null
          : t("tactiek.your_turn")
        : t("tactiek.cpu_thinking");
    append(
      stage,
      note
        ? el("div.kmg-banner.kmg-banner-info.kmg-tactic-note", { role: "status" }, [
            el("span.kmg-banner-icon", { text: note.icon }),
            el("span.kmg-banner-body", { text: note.text }),
          ])
        : null,
      status ? el("p.kmg-tactic-status", { text: status }) : null,
    );

    if (result) {
      append(
        stage,
        el(`div.kmg-banner.${result.good ? "kmg-banner-ok" : "kmg-banner-info"}.kmg-tactic-result`, {}, [
          el("span.kmg-banner-icon", { text: result.icon }),
          el("span.kmg-banner-body", { text: `${t(result.key)} ${t("tactiek.points", { points: matchPoints })}` }),
        ]),
        result.key === "tactiek.lost" ? el("p.kmg-caption", { text: t("tactiek.lost_tip") }) : null,
        climbInvite(GAME_KEY, () => startMatch()),
        el("div.kmg-actions", {}, [
          el("button.kmg-btn.kmg-btn-primary.kmg-btn-big", {
            type: "button",
            text: t("tactiek.again_button"),
            onClick: () => startMatch(),
          }),
        ]),
      );
    }
  }

  container.append(shell.root);
  startMatch();

  return () => {
    clearTimeout(cpuTimer);
    shell.destroy();
  };
}

