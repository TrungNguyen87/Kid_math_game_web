/**
 * Round 18: the arcade games, Fladdervogel (flying) and Sprongheld
 * (jumping). Their worlds are plain data and step() is a pure function, so
 * the physics can be played here without a browser.
 *
 * The question that matters most for a child: is the right answer always
 * reachable? An autopilot that only knows where the right answer is flies
 * or runs a whole run at every level, and must get all twelve right without
 * crashing. Then the rules: a wrong answer costs no life, a crash does, one
 * answer per gate or row, and a run always ends.
 *
 * Run with: npm test
 */
import test from "node:test";
import assert from "node:assert/strict";

const { setLanguage } = await import("../../web/js/i18n.js");
const { TRANSLATIONS } = await import("../../web/js/i18n.js");
const arcade = await import("../../web/js/arcade.js");
const vlieg = await import("../../web/js/games/vlieg.js");
const sprong = await import("../../web/js/games/sprong.js");

const DT = 1 / 60;
const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7];

/** A fixed question with the answer at `index` (0 top/left .. 2). */
const fixedQuestion = (index) => () => {
  const options = ["a", "b", "c"];
  return { text: "?", answer: options[index], options };
};

/** Run a world until "over" (or a frame cap), collecting events. */
function play(game, world, controller, maxSeconds = 300) {
  const events = { answers: [], crashes: 0, over: 0 };
  game.step(world, DT, { action: true }); // the first tap starts the run
  for (let frame = 0; frame < maxSeconds * 60 && world.phase !== "over"; frame++) {
    for (const event of game.step(world, DT, { action: controller(world) })) {
      if (event.type === "answer") events.answers.push(event);
      else if (event.type === "crash") events.crashes += 1;
      else if (event.type === "over") events.over += 1;
    }
  }
  return events;
}

/** Fladdervogel autopilot: hold the height of the right opening. */
function flyToAnswer(world) {
  const gate = world.gates.find((g) => !g.resolved);
  const lane = gate ? vlieg.LANES[gate.answerIndex] : vlieg.LANES[1];
  return world.bird.y > (lane.top + lane.bottom) / 2 + 8 && world.bird.vy > -50;
}

/** Sprongheld autopilot: jump under the right block, and over every slime. */
function runToAnswer(world) {
  const row = world.rows.find((r) => !r.resolved);
  let jump = false;
  if (row) {
    const centre = row.blocks[row.answerIndex].x + sprong.BLOCK_W / 2 - sprong.RUNNER_X;
    if (centre < 30 && centre > -10) jump = true;
  }
  for (const slime of world.obstacles) {
    const distance = slime.x - sprong.RUNNER_X;
    if (distance > 20 && distance < 60) jump = true;
  }
  return jump;
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

test("arcade questions always have three distinct, short options including the answer", () => {
  for (const lang of ["nl", "en"]) {
    setLanguage(lang);
    for (const mode of ["sums", "words"]) {
      for (const level of LEVELS) {
        for (let i = 0; i < 150; i++) {
          const q = arcade.arcadeQuestion(level, mode, lang);
          assert.equal(q.options.length, 3, `${lang} ${mode} ${level}`);
          assert.equal(new Set(q.options).size, 3, JSON.stringify(q));
          assert.ok(q.options.includes(q.answer), JSON.stringify(q));
          assert.ok(q.options.every((o) => typeof o === "string" && o.length > 0 && o.length <= 13), JSON.stringify(q));
          assert.ok(q.text && !/undefined|NaN|\{\w+\}/.test(q.text), q.text);
        }
      }
    }
  }
  setLanguage("nl");
});

test("sums mode asks the Bliksemronde facts and the answer is really right", () => {
  for (const level of LEVELS) {
    for (let i = 0; i < 200; i++) {
      const q = arcade.arcadeQuestion(level, "sums", "nl");
      const m = q.text.match(/^(\d+) ([+−×:]) (\d+) = \?$/);
      assert.ok(m, q.text);
      const [a, op, b] = [Number(m[1]), m[2], Number(m[3])];
      const value = op === "+" ? a + b : op === "−" ? a - b : op === "×" ? a * b : a / b;
      assert.equal(String(value), q.answer, q.text);
    }
  }
});

// ---------------------------------------------------------------------------
// Fladdervogel
// ---------------------------------------------------------------------------

test("Fladdervogel: every right answer is reachable - an autopilot gets 12/12 at every level, without crashing", () => {
  for (const level of LEVELS) {
    for (let run = 0; run < 3; run++) {
      const world = vlieg.createWorld({ level, nextQuestion: () => arcade.arcadeQuestion(level, "sums", "nl") });
      const events = play(vlieg, world, flyToAnswer);
      assert.equal(events.answers.length, arcade.QUESTIONS_PER_RUN, `level ${level}`);
      assert.ok(events.answers.every((a) => a.correct), `level ${level}: a right answer was missed`);
      assert.equal(events.crashes, 0, `level ${level}`);
      assert.equal(events.over, 1);
      assert.equal(world.lives, arcade.LIVES);
    }
  }
});

test("Fladdervogel: flying through a wrong opening is a wrong answer but costs no life", () => {
  const world = vlieg.createWorld({ level: 2, nextQuestion: fixedQuestion(0) });
  // Hold the middle opening while the answer is always the top one.
  const events = play(vlieg, world, (w) => w.bird.y > 240 + 8 && w.bird.vy > -50);
  assert.equal(events.answers.length, arcade.QUESTIONS_PER_RUN);
  assert.ok(events.answers.every((a) => !a.correct && a.picked === "b"));
  assert.equal(events.crashes, 0);
  assert.equal(world.lives, arcade.LIVES);
});

test("Fladdervogel: never flapping loses a life on each fall, and the run ends when the lives are gone", () => {
  const world = vlieg.createWorld({ level: 0, nextQuestion: fixedQuestion(1) });
  const events = play(vlieg, world, () => false, 60);
  assert.equal(world.phase, "over");
  assert.equal(world.lives, 0);
  assert.equal(events.crashes, arcade.LIVES);
  assert.equal(events.over, 1);
});

test("Fladdervogel: a wall crash answers that gate once (wrong), and the bird is briefly protected", () => {
  const world = vlieg.createWorld({ level: 0, nextQuestion: fixedQuestion(1) });
  vlieg.step(world, DT, { action: true });
  // Park the bird inside a wall's height and let the gate come to it.
  let crashes = 0;
  const answers = [];
  for (let frame = 0; frame < 60 * 6 && answers.length === 0; frame++) {
    world.bird.y = 160; // the wall between the top and middle openings
    world.bird.vy = 0;
    for (const event of vlieg.step(world, DT, {})) {
      if (event.type === "crash") crashes += 1;
      if (event.type === "answer") answers.push(event);
    }
  }
  assert.equal(crashes, 1);
  assert.equal(answers.length, 1);
  assert.equal(answers[0].correct, false);
  assert.equal(answers[0].picked, null);
  assert.ok(world.invulnerable > 0, "a short grace period follows a crash");
  assert.equal(world.lives, arcade.LIVES - 1);
});

// ---------------------------------------------------------------------------
// Sprongheld
// ---------------------------------------------------------------------------

test("Sprongheld: every right answer is reachable - an autopilot gets 12/12 at every level, without a crash", () => {
  for (const level of LEVELS) {
    for (let run = 0; run < 2; run++) {
      const world = sprong.createWorld({ level, nextQuestion: () => arcade.arcadeQuestion(level, "words", "en") });
      const events = play(sprong, world, runToAnswer);
      assert.equal(events.answers.length, arcade.QUESTIONS_PER_RUN, `level ${level}`);
      assert.ok(events.answers.every((a) => a.correct), `level ${level}: a right block was missed`);
      assert.equal(events.crashes, 0, `level ${level}: ran into a slime`);
      assert.equal(world.lives, arcade.LIVES);
    }
  }
});

test("Sprongheld: jumping at every block still answers each row only once", () => {
  const world = sprong.createWorld({ level: 0, nextQuestion: fixedQuestion(2) });
  // Jump whenever on the ground: bumps whichever block is overhead first.
  const events = play(sprong, world, (w) => w.runner.onGround);
  assert.equal(events.answers.length, arcade.QUESTIONS_PER_RUN, "exactly one answer per row");
  assert.equal(world.resolved, arcade.QUESTIONS_PER_RUN);
});

test("Sprongheld: level 0 has no slimes, so standing still answers nothing and loses nothing", () => {
  const world = sprong.createWorld({ level: 0, nextQuestion: fixedQuestion(0) });
  const events = play(sprong, world, () => false);
  assert.equal(events.crashes, 0);
  assert.equal(world.lives, arcade.LIVES);
  assert.equal(events.answers.length, arcade.QUESTIONS_PER_RUN);
  assert.ok(events.answers.every((a) => !a.correct && a.picked === null), "running under every row is a miss");
});

test("Sprongheld: from level 1 a slime waits after each row; never jumping loses every life and ends the run", () => {
  const world = sprong.createWorld({ level: 2, nextQuestion: fixedQuestion(0) });
  const events = play(sprong, world, () => false);
  assert.equal(world.phase, "over");
  assert.equal(world.lives, 0);
  assert.equal(events.crashes, arcade.LIVES);
});

test("Sprongheld: a new row never starts above the last row's slime, even after an early bump", () => {
  for (const level of [1, 4, 7]) {
    const world = sprong.createWorld({ level, nextQuestion: fixedQuestion(0) });
    const seen = new Set();
    // Bump the first block of every row as early as possible - the case
    // that used to spawn the next row on top of the previous slime.
    play(sprong, world, (w) => {
      for (const row of w.rows) {
        if (seen.has(row)) continue;
        seen.add(row);
        const slimesBefore = w.obstacles.filter((o) => o.x < row.blocks[0].x);
        for (const slime of slimesBefore) {
          assert.ok(row.blocks[0].x - slime.x >= 200, `level ${level}: row starts ${row.blocks[0].x - slime.x}px after a slime`);
        }
      }
      const row = w.rows.find((r) => !r.resolved);
      if (!row) return false;
      const centre = row.blocks[0].x + sprong.BLOCK_W / 2 - sprong.RUNNER_X;
      return (centre < 30 && centre > -10) || w.obstacles.some((o) => o.x - sprong.RUNNER_X > 20 && o.x - sprong.RUNNER_X < 60);
    });
    assert.ok(seen.size >= arcade.QUESTIONS_PER_RUN);
  }
});

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

test("every arcade string the page builds exists in both languages", () => {
  const keys = [
    "arcade.mode_label", "arcade.mode_sums", "arcade.mode_words", "arcade.your_record", "arcade.new_record",
    "arcade.get_ready", "arcade.lives", "arcade.paused", "arcade.stop_button", "arcade.run_over",
    "arcade.stat_correct", "arcade.stat_accuracy", "arcade.stat_points", "arcade.praise_high",
    "arcade.praise_mid", "arcade.praise_low", "arcade.praise_none", "arcade.again_button", "arcade.menu_button",
  ];
  for (const game of ["vlieg", "sprong"]) {
    keys.push(`${game}.how_to`, `${game}.start_button`, `${game}.controls`, `${game}.tap_to_start`, `${game}.canvas_label`);
  }
  for (const lang of ["nl", "en"]) for (const key of keys) assert.ok(TRANSLATIONS[lang][key], `${lang} ${key}`);
});
