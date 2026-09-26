/**
 * The arcade games (round 18): Fladdervogel (a flying game) and Sprongheld
 * (a jumping runner). Both are ordinary levelled games underneath - every
 * gate or row of blocks is a question, answered by flying through or
 * jumping into the right answer - so they pay points, respect the
 * level-replay guard, count towards quests and adapt their level once per
 * run, exactly like the timed games.
 *
 * This module holds what the two share:
 *   - arcadeQuestion(): a question in "sums" mode (the Bliksemronde
 *     generator) or "words" mode (spelling and vocabulary from the reading
 *     games), always with exactly three short options;
 *   - arcadeGame(): the page - the start screen with its mode switch, the
 *     canvas and its sizing, the requestAnimationFrame loop, the HUD, the
 *     scoring and the results screen.
 *
 * Each game supplies only its world: createWorld(), step() and draw(). The
 * world is plain data and step() is a pure function of (world, dt, input),
 * so the physics - can the right gap always be reached, does a bump count
 * once - is tested in Node (tests/web/test_arcade.mjs) without a browser.
 */
import { getLanguage, t } from "./i18n.js";
import { el, clear, append } from "./dom.js";
import { sample, shuffle } from "./rng.js";
import { addScore, awardablePoints, getLevel, recordFeat, saveCurrentProfile, state } from "./state.js";
import { adaptAfterRound, announceNewBadges, settleAnswer } from "./gameflow.js";
import { climbInvite, gameShell, recordedCaption, statRow } from "./ui.js";
import { equippedAvatarEmoji } from "./rewards.js";
import { bigCelebration, confetti, floatPoints } from "./fx.js";
import { generateProblem as mathProblem } from "./games/bliksem.js";
import { spellingQuestion } from "./games/spelling.js";
import { vocabQuestion } from "./games/woorden.js";
import * as sound from "./sound.js";

/** Questions per run. A run also ends when the lives are gone. */
export const QUESTIONS_PER_RUN = 12;
export const LIVES = 3;
// A run of right answers multiplies the points, like Bliksemronde.
const COMBO_STEPS = [1, 1, 2, 2, 3];
/** Options longer than this do not fit a gap or a block. */
const MAX_OPTION_CHARS = 13;

const MODE_KEY = "kmg.arcade.mode";

export function readMode() {
  try {
    return localStorage.getItem(MODE_KEY) === "words" ? "words" : "sums";
  } catch {
    return "sums";
  }
}

function writeMode(mode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* the choice just won't survive a reload */
  }
}

/**
 * One arcade question: { text, answer, options } with exactly three
 * distinct, short string options, one of them the answer.
 * @param {number} level
 * @param {"sums"|"words"} mode
 * @param {string} [lang]
 */
export function arcadeQuestion(level, mode, lang = getLanguage()) {
  if (mode === "words") {
    for (let attempt = 0; attempt < 12; attempt++) {
      const q = Math.random() < 0.55 ? spellingQuestion(level, lang) : vocabQuestion(level, lang);
      const wrong = q.options.filter((o) => o !== q.answer);
      const options = shuffle([q.answer, ...sample(wrong, 2)]);
      if (options.every((o) => o.length <= MAX_OPTION_CHARS)) {
        return { text: q.text, answer: q.answer, options };
      }
    }
    // Every level has short spelling words to fall back on.
    const q = spellingQuestion(Math.min(level, 4), lang);
    return { text: q.text, answer: q.answer, options: shuffle([...q.options]).slice(0, 3) };
  }
  const p = mathProblem(level);
  const wrong = p.options.filter((o) => o !== p.answer);
  return {
    text: `${p.text} = ?`,
    answer: String(p.answer),
    options: shuffle([p.answer, ...sample(wrong, 2)]).map(String),
  };
}

/** The first emoji of the equipped character - a compound avatar like 🐉⚔️ is two. */
export function heroEmoji() {
  const emoji = equippedAvatarEmoji();
  try {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return [...segmenter.segment(emoji)][0]?.segment ?? emoji;
  } catch {
    return Array.from(emoji)[0] ?? "🧑";
  }
}

/** Colours the canvas takes from the current theme, read once per run. */
function themeColors() {
  const style = getComputedStyle(document.documentElement);
  const read = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
  return {
    accent: read("--orange", "#ff7043"),
    accentDark: read("--orange-dark", "#e64a19"),
    amber: read("--amber", "#ffb300"),
    dark: window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
  };
}

/**
 * Draw `text` centred at (x, y), shrinking the font until it fits `maxWidth`.
 */
export function fitText(ctx, text, x, y, maxWidth, size = 22, min = 11) {
  let px = size;
  ctx.font = `800 ${px}px "Baloo 2", system-ui, sans-serif`;
  while (px > min && ctx.measureText(text).width > maxWidth) {
    px -= 1;
    ctx.font = `800 ${px}px "Baloo 2", system-ui, sans-serif`;
  }
  ctx.fillText(text, x, y);
}

/** The flap/jump keys every arcade game understands. */
function defaultKeyInput(key) {
  return key === " " || key === "ArrowUp" || key === "w" || key === "Enter" ? {} : null;
}

/**
 * Build an arcade game page.
 *
 * The input handed to step() each frame is `{ action, tap, lane, steer }`:
 * `action` is true on any tap or game key this frame, `tap` is where the
 * canvas was touched (in the world's own coordinates), and `lane` / `steer`
 * come from a game's own keys (spec.keyInput). A game reads what it needs;
 * Fladdervogel and Sprongheld only ever look at `action`.
 *
 * @param {object} spec
 * @param {string} spec.gameKey
 * @param {string} spec.emoji
 * @param {number} spec.width   logical canvas width
 * @param {number} spec.height  logical canvas height
 * @param {Function} spec.createWorld ({ level, nextQuestion, hero }) => world
 * @param {Function} spec.step        (world, dt, input) => events[]
 * @param {Function} spec.draw        (ctx, world, colors) => void
 * @param {Function} [spec.keyInput]  (key) => partial input, or null to ignore the key
 * @param {boolean} [spec.lives=true] false for a game without lives (a race)
 * @param {Function} [spec.hudExtra]  (world) => extra HUD strings, shown first
 * @param {Function} [spec.result]    (world, {correct, asked}) => {icon, key,
 *   vars, feat} | null - the game's own line on the results screen, and the
 *   one-off feat (state.recordFeat) it earned, if any
 */
export function arcadeGame(spec) {
  const { gameKey, emoji, width, height, createWorld, step, draw } = spec;
  const keyInput = spec.keyInput ?? defaultKeyInput;
  const hasLives = spec.lives !== false;

  return function render(container) {
    let phase = "idle"; // idle | running | finished
    let mode = readMode();
    let world = null;
    let rafId = null;
    let lastTime = 0;
    let pendingInput = null;
    let runResult = null;
    let paused = false;
    let hudVersion = -1;
    let colors = null;
    let runLevel = 0;

    // Scoring for the run.
    let correct = 0;
    let asked = 0;
    let combo = 0;
    let runPoints = 0;
    let newRecord = false;

    const shell = gameShell({
      gameKey,
      emoji,
      titleKey: `${gameKey}.title`,
      taglineKey: `${gameKey}.tagline`,
      introKey: `${gameKey}.intro`,
      autoAdvance: false,
      onLevelChange: () => {
        stopLoop();
        phase = "idle";
        paint();
      },
    });

    const stage = el("div.kmg-stage.kmg-arcade");
    shell.slots.extraSlot.append(stage, recordedCaption());

    const bestKey = `kmg.best.${gameKey}`;
    const readBest = () => {
      try {
        return Number(localStorage.getItem(bestKey)) || 0;
      } catch {
        return 0;
      }
    };
    const writeBest = (value) => {
      try {
        localStorage.setItem(bestKey, String(value));
      } catch {
        /* the record just will not survive a reload */
      }
    };

    // --- canvas ---------------------------------------------------------------

    const canvas = el("canvas.kmg-arcade-canvas", {
      role: "img",
      "aria-label": t(`${gameKey}.canvas_label`),
      tabindex: "0",
    });
    const ctx = canvas.getContext("2d");
    let scale = 1;

    const play = el("div.kmg-arcade-play");
    let lastCssWidth = 0;

    /**
     * Fit the canvas to its column and to the height actually left under the
     * question once the game is scrolled to the top - sharp on retina.
     *
     * The first version assumed the question and stats took a fixed 170px.
     * On a 360x640 phone a three-line word question pushed the playfield's
     * bottom off the screen, and on a landscape phone the question went off
     * the top. So the room is measured: the stage's scroll margin (the phone
     * top bar), plus everything above the canvas inside the play area. On a
     * short landscape screen the question sits beside the canvas instead
     * (app.css), and the canvas gets the full height.
     */
    function sizeCanvas() {
      const host = canvas.parentElement;
      if (!host) return;
      const sideBySide = getComputedStyle(play).gridTemplateColumns.trim().split(/\s+/).length > 1;
      const margin = parseFloat(getComputedStyle(stage).scrollMarginTop) || 0;
      const above = sideBySide ? 0 : host.getBoundingClientRect().top - play.getBoundingClientRect().top;
      const room = window.innerHeight - margin - above - 10;
      const available = sideBySide ? play.clientWidth * 0.62 : host.clientWidth || width;
      const maxByHeight = (room * width) / height;
      const cssWidth = Math.floor(Math.max(150, Math.min(available, spec.maxWidth ?? 520, maxByHeight)));
      if (cssWidth === lastCssWidth && canvas.width) return;
      lastCssWidth = cssWidth;
      const cssHeight = (cssWidth * height) / width;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      scale = (cssWidth / width) * dpr;
      if (world) drawFrame();
    }

    function drawFrame() {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, width, height);
      draw(ctx, world, colors);
      if (paused) {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        fitText(ctx, t("arcade.paused"), width / 2, height / 2, width - 40, 26);
      }
    }

    // --- input ----------------------------------------------------------------

    function act(input = {}) {
      if (phase !== "running") return;
      if (paused) {
        paused = false;
        lastTime = performance.now();
        return;
      }
      pendingInput = { ...(pendingInput ?? {}), ...input, action: true };
    }

    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      canvas.focus({ preventScroll: true });
      // Where the tap landed, in the world's own coordinates - the lava
      // tower needs to know which platform was touched, the kart which side.
      const rect = canvas.getBoundingClientRect();
      const tap = rect.width
        ? { x: ((event.clientX - rect.left) / rect.width) * width, y: ((event.clientY - rect.top) / rect.height) * height }
        : null;
      act(tap ? { tap } : {});
    });
    const onKey = (event) => {
      if (phase !== "running") return;
      const input = keyInput(event.key);
      if (!input) return;
      // Space and the arrows would otherwise scroll the page away from the game.
      if (event.target instanceof HTMLInputElement) return;
      event.preventDefault();
      act(input);
    };
    document.addEventListener("keydown", onKey);
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && phase === "running") {
        paused = true;
        drawFrame();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    const onResize = () => sizeCanvas();
    window.addEventListener("resize", onResize);

    // --- the loop -------------------------------------------------------------

    function stopLoop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }

    function frame(now) {
      rafId = requestAnimationFrame(frame);
      // Clamp the step: after a stall (tab switch, slow tablet) one huge dt
      // would teleport the bird through a wall.
      const dt = Math.min(0.034, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      if (!paused) {
        const events = step(world, dt, pendingInput ?? { action: false });
        pendingInput = null;
        for (const event of events) handleEvent(event);
      }
      if (phase !== "running") return;
      drawFrame();
      if (world.hudVersion !== hudVersion) paintHud();
    }

    function startRun() {
      runLevel = getLevel(gameKey);
      correct = 0;
      asked = 0;
      combo = 0;
      runPoints = 0;
      newRecord = false;
      runResult = null;
      paused = false;
      pendingInput = null;
      colors = themeColors();
      const lang = getLanguage();
      world = createWorld({
        level: runLevel,
        nextQuestion: () => arcadeQuestion(runLevel, mode, lang),
        hero: heroEmoji(),
        readyText: t(`${gameKey}.tap_to_start`),
        lang,
      });
      phase = "running";
      lastCssWidth = 0;
      paint();
      // The playfield should be what the child is looking at: scroll first,
      // then size the canvas to the room that leaves.
      stage.scrollIntoView?.({ block: "start" });
      sizeCanvas();
      canvas.focus({ preventScroll: true });
      stopLoop();
      lastTime = performance.now();
      rafId = requestAnimationFrame(frame);
    }

    function handleEvent(event) {
      if (event.type === "answer") scoreAnswer(event);
      else if (event.type === "crash") sound.playIncorrect();
      else if (event.type === "action") sound.playTap();
      else if (event.type === "over") finishRun();
      // Round 19: a checkpoint or a power-up is a small cheer; reaching the
      // summit or the finish line a big one.
      else if (event.type === "checkpoint" || event.type === "powerup") sound.playBadge();
      else if (event.type === "summit" || event.type === "finish") {
        sound.playFanfare();
        bigCelebration();
      }
    }

    function scoreAnswer({ correct: isCorrect, question, picked }) {
      asked += 1;
      let gained = 0;
      if (isCorrect) {
        correct += 1;
        combo += 1;
        const base = 2 * (runLevel + 1);
        const raw = base * COMBO_STEPS[Math.min(combo, COMBO_STEPS.length - 1)];
        // The level-replay guard (state.js canEarnAtLevel()) applies here too.
        gained = awardablePoints(gameKey, runLevel, raw);
        runPoints += gained;
        if (gained > 0) {
          addScore(gained);
          floatPoints(hudQuestion, `+${gained}`);
        }
      } else {
        combo = 0;
      }
      settleAnswer({
        gameKey,
        level: runLevel,
        questionText: question.text,
        studentAnswer: picked ?? "—",
        correctAnswer: question.answer,
        isCorrect,
        points: gained,
        adaptLevel: false,
        score: false,
      });
      world.hudVersion += 1;
    }

    function finishRun() {
      stopLoop();
      phase = "finished";
      if (correct > readBest()) {
        writeBest(correct);
        newRecord = correct > 0;
      }
      if (correct > state.arcadeBest) {
        state.arcadeBest = correct;
        saveCurrentProfile();
      }
      // The game's own verdict (reached the summit, finished first) and the
      // one-off feat that goes with it, before the level decision so a
      // badge it unlocks is celebrated with the run.
      runResult = spec.result?.(world, { correct, asked }) ?? null;
      if (runResult?.feat && recordFeat(runResult.feat)) {
        announceNewBadges();
        saveCurrentProfile();
      }
      sound.playTimeUp();
      // One level decision per run, like the timed games.
      adaptAfterRound(gameKey, correct, asked);
      paint();
    }

    // --- HUD ------------------------------------------------------------------

    const hudQuestion = el("div.kmg-question.is-in.kmg-arcade-question", { "aria-live": "polite" });
    const hudStats = el("div.kmg-arcade-stats");

    function paintHud() {
      hudVersion = world.hudVersion;
      const questionChanged = hudQuestion.dataset.text !== (world.question?.text ?? "");
      hudQuestion.dataset.text = world.question?.text ?? "";
      clear(hudQuestion);
      const q = world.question;
      hudQuestion.append(
        el("span.kmg-question-emoji", { text: emoji }),
        el("span.kmg-question-text", { text: q ? q.text : t("arcade.get_ready") }),
      );
      clear(hudStats);
      const multiplier = COMBO_STEPS[Math.min(combo, COMBO_STEPS.length - 1)];
      for (const extra of spec.hudExtra?.(world) ?? []) {
        hudStats.append(el("span.kmg-arcade-stat.kmg-arcade-stat-extra", { text: extra }));
      }
      if (hasLives) {
        const hearts = "❤️".repeat(Math.max(0, world.lives)) + "🤍".repeat(Math.max(0, LIVES - world.lives));
        hudStats.append(el("span.kmg-arcade-lives", { text: hearts, title: t("arcade.lives") }));
      }
      hudStats.append(
        el("span.kmg-arcade-stat", { text: `✅ ${correct}/${QUESTIONS_PER_RUN}` }),
        el("span.kmg-arcade-stat", { text: `x${multiplier}` }),
        el("span.kmg-arcade-stat", { text: `🌟 ${runPoints}` }),
      );
      // A longer question can make the HUD taller than the reserved space;
      // re-fit (a no-op when nothing moved) so the playfield stays on screen.
      if (questionChanged && canvas.isConnected) sizeCanvas();
    }

    // --- screens --------------------------------------------------------------

    function modeSwitch() {
      const row = el("div.kmg-race-segmented.kmg-arcade-modes", { role: "group", "aria-label": t("arcade.mode_label") });
      for (const [value, labelKey] of [
        ["sums", "arcade.mode_sums"],
        ["words", "arcade.mode_words"],
      ]) {
        row.append(
          el(`button.kmg-race-segment-btn${mode === value ? ".is-active" : ""}`, {
            type: "button",
            text: t(labelKey),
            "aria-pressed": String(mode === value),
            onClick: () => {
              mode = value;
              writeMode(value);
              sound.playTap();
              paint();
            },
          }),
        );
      }
      return row;
    }

    function paintIdle() {
      const best = readBest();
      append(
        stage,
        el("p.kmg-answer-label", { text: t("arcade.mode_label") }),
        modeSwitch(),
        el("div.kmg-intro", {}, [el("p", { text: t(`${gameKey}.how_to`, { questions: QUESTIONS_PER_RUN, lives: LIVES }) })]),
        best
          ? el("div.kmg-banner.kmg-banner-ok", {}, [
              el("span.kmg-banner-icon", { text: "🏆" }),
              el("span.kmg-banner-body", { text: t("arcade.your_record", { best }) }),
            ])
          : null,
        el("button.kmg-btn.kmg-btn-primary.kmg-btn-big", {
          type: "button",
          text: t(`${gameKey}.start_button`),
          onClick: () => startRun(),
        }),
      );
    }

    function paintRunning() {
      clear(play);
      append(
        play,
        hudQuestion,
        hudStats,
        el("div.kmg-arcade-canvaswrap", {}, [canvas]),
        el("div.kmg-arcade-foot", {}, [
          el("p.kmg-caption.kmg-arcade-hint", { text: t(`${gameKey}.controls`) }),
          el("button.kmg-btn.kmg-btn-ghost", {
            type: "button",
            text: t("arcade.stop_button"),
            onClick: () => {
              if (world) world.phase = "over";
              finishRun();
            },
          }),
        ]),
      );
      stage.append(play);
      paintHud();
    }

    function paintFinished() {
      const accuracy = asked ? Math.round((100 * correct) / asked) : 0;
      stage.append(el("h2", { text: t("arcade.run_over") }));
      if (runResult) {
        stage.append(
          el(`div.kmg-banner.${runResult.good ? "kmg-banner-ok" : "kmg-banner-info"}.kmg-arcade-result`, {}, [
            el("span.kmg-banner-icon", { text: runResult.icon }),
            el("span.kmg-banner-body", { text: t(runResult.key, runResult.vars) }),
          ]),
        );
      }
      if (newRecord) {
        bigCelebration();
        stage.append(
          el("div.kmg-banner.kmg-banner-ok", {}, [
            el("span.kmg-banner-icon", { text: "🏆" }),
            el("span.kmg-banner-body", { text: t("arcade.new_record", { best: correct }) }),
          ]),
        );
      }
      stage.append(
        statRow([
          { label: t("arcade.stat_correct"), value: `${correct}/${asked}` },
          { label: t("arcade.stat_accuracy"), value: `${accuracy}%` },
          { label: t("arcade.stat_points"), value: runPoints },
        ]),
      );
      const [icon, key, celebrate] =
        asked === 0
          ? ["🤔", "arcade.praise_none", false]
          : accuracy >= 80
            ? ["🌟", "arcade.praise_high", true]
            : accuracy >= 50
              ? ["👍", "arcade.praise_mid", false]
              : ["💪", "arcade.praise_low", false];
      if (celebrate) confetti({ count: 50 });
      append(
        stage,
        el(`div.kmg-banner.${celebrate ? "kmg-banner-ok" : "kmg-banner-info"}`, {}, [
          el("span.kmg-banner-icon", { text: icon }),
          el("span.kmg-banner-body", { text: t(key) }),
        ]),
        // On an already-mastered level the run paid nothing: say where it would.
        climbInvite(gameKey, () => {
          phase = "idle";
          paint();
        }),
        el("div.kmg-actions", {}, [
          el("button.kmg-btn.kmg-btn-primary", {
            type: "button",
            text: t("arcade.again_button"),
            onClick: () => startRun(),
          }),
          el("button.kmg-btn.kmg-btn-ghost", {
            type: "button",
            text: t("arcade.menu_button"),
            onClick: () => {
              phase = "idle";
              paint();
            },
          }),
        ]),
      );
    }

    function paint() {
      clear(stage);
      shell.picker.refresh();
      if (phase === "idle") paintIdle();
      else if (phase === "running") paintRunning();
      else paintFinished();
    }

    container.append(shell.root);
    paint();

    // The router calls this on the way out: stop the loop and every listener
    // this page added outside its own DOM.
    return () => {
      stopLoop();
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      shell.destroy();
    };
  };
}
