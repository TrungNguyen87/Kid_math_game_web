/**
 * Round 18: the arcade games, Fladdervogel (flying) and Sprongheld
 * (jumping); round 19 added Lavatoren (climbing) and Turbokart (racing). Their worlds are plain data and step() is a pure function, so
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
const toren = await import("../../web/js/games/toren.js");
const kart = await import("../../web/js/games/kart.js");

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
// Lavatoren (round 19)
// ---------------------------------------------------------------------------

/**
 * Climb the tower: wait `readFor(world)` seconds on each new question (the
 * time a child spends reading), then jump to the lane `pick(world)` returns.
 */
function climb(world, { readFor, pick, maxSeconds = 600 }) {
  const events = { answers: [], crashes: 0, over: 0, checkpoints: [], summit: 0, jumps: 0 };
  toren.step(world, DT, { action: true });
  let waited = 0;
  let current = null;
  for (let frame = 0; frame < maxSeconds * 60 && world.phase !== "over"; frame++) {
    let input = {};
    if (world.next && !world.anim) {
      if (world.next !== current) {
        current = world.next;
        waited = 0;
      }
      waited += DT;
      if (waited >= readFor(world)) input = { action: true, lane: pick(world) };
    }
    for (const event of toren.step(world, DT, input)) {
      if (event.type === "answer") events.answers.push(event);
      else if (event.type === "crash") events.crashes += 1;
      else if (event.type === "over") events.over += 1;
      else if (event.type === "checkpoint") events.checkpoints.push(event.floor);
      else if (event.type === "summit") events.summit += 1;
      else if (event.type === "action") events.jumps += 1;
    }
  }
  return events;
}

test("Lavatoren: a child who takes 60% of the reading budget on every floor reaches the summit at every level, never caught by the lava", () => {
  for (const level of LEVELS) {
    for (const mode of ["sums", "words"]) {
      const world = toren.createWorld({ level, nextQuestion: () => arcade.arcadeQuestion(level, mode, "nl") });
      const events = climb(world, { readFor: () => toren.readingBudget(level) * 0.6, pick: (w) => w.next.answerIndex });
      assert.equal(events.summit, 1, `level ${level} ${mode}: no summit`);
      assert.equal(world.floor, toren.TOP_FLOOR);
      assert.equal(events.answers.length, toren.TOP_FLOOR, "one answer per floor");
      assert.ok(events.answers.every((a) => a.correct));
      assert.equal(events.crashes, 0, `level ${level}: caught by the lava`);
      assert.deepEqual(events.checkpoints, [3, 6, 9]);
      assert.equal(events.over, 1);
      assert.equal(world.lives, arcade.LIVES);
    }
  }
});

test("Lavatoren: the reading budget shrinks with the level, and the lava rises one floor per budget", () => {
  for (let level = 1; level <= 7; level++) assert.ok(toren.readingBudget(level) < toren.readingBudget(level - 1));
  for (const level of LEVELS) {
    assert.ok(Math.abs(toren.lavaSpeedFor(level) * toren.readingBudget(level) - toren.FLOOR_H) < 1e-9);
  }
});

test("Lavatoren: a wrong platform crumbles and costs no life - the hero drops back and a new question comes for the same floor", () => {
  const world = toren.createWorld({ level: 0, nextQuestion: fixedQuestion(0) });
  toren.step(world, DT, { action: true });
  const first = world.next;
  const answers = [];
  const runFrames = (input, frames) => {
    for (let i = 0; i < frames; i++) {
      for (const event of toren.step(world, DT, i === 0 ? input : {})) if (event.type === "answer") answers.push(event);
    }
  };
  runFrames({ action: true, lane: 2 }, 120); // wrong: the answer is lane 0
  assert.equal(answers.length, 1);
  assert.equal(answers[0].correct, false);
  assert.equal(answers[0].picked, "c");
  assert.equal(world.floor, 0, "no floor gained");
  assert.equal(world.lives, arcade.LIVES, "a wrong answer costs no life");
  assert.notEqual(world.next, first, "a fresh question for the same floor");
  assert.equal(world.next.floor, 1);
  runFrames({ action: true, lane: 0 }, 60);
  assert.equal(answers.length, 2);
  assert.equal(answers[1].correct, true);
  assert.equal(world.floor, 1);
});

test("Lavatoren: taps during a jump are ignored - one answer per jump", () => {
  const world = toren.createWorld({ level: 3, nextQuestion: fixedQuestion(1) });
  toren.step(world, DT, { action: true });
  const answers = [];
  // Hammer every lane on every frame for two seconds.
  for (let i = 0; i < 120; i++) {
    for (const event of toren.step(world, DT, { action: true, lane: i % 3 })) if (event.type === "answer") answers.push(event);
  }
  // Each jump takes 0.5 s and a wrong one another 0.45 s to fall back:
  // in 2 s there is room for only a handful of answers, never one per frame.
  assert.ok(answers.length >= 2 && answers.length <= 4, `${answers.length} answers in 2 s`);
});

test("Lavatoren: never answering lets the lava catch the hero three times, and the run ends", () => {
  for (const level of [0, 7]) {
    const world = toren.createWorld({ level, nextQuestion: fixedQuestion(0) });
    const events = climb(world, { readFor: () => Infinity, pick: () => 0 });
    assert.equal(world.phase, "over");
    assert.equal(events.crashes, arcade.LIVES);
    assert.equal(world.lives, 0);
    assert.equal(events.answers.length, 0);
    assert.equal(events.over, 1);
  }
});

test("Lavatoren: always answering wrong answers every question wrong, gains no floor, and still ends", () => {
  const world = toren.createWorld({ level: 2, nextQuestion: fixedQuestion(1) });
  const events = climb(world, { readFor: () => 1, pick: () => 0 });
  assert.equal(world.phase, "over");
  assert.equal(world.floor, 0);
  assert.ok(events.answers.length > 3 && events.answers.every((a) => !a.correct));
  assert.equal(events.crashes, arcade.LIVES);
});

test("Lavatoren: a checkpoint cools the lava down to a safe distance below the hero", () => {
  const world = toren.createWorld({ level: 7, nextQuestion: fixedQuestion(0) });
  let cooled = null;
  climb(world, {
    readFor: () => 0.1,
    pick: (w) => {
      if (w.floor === 3 && cooled == null) cooled = w.lava;
      return 0;
    },
  });
  assert.ok(cooled != null);
  assert.ok(cooled <= 3 * toren.FLOOR_H - toren.LAVA_RESET + 1e-9, `lava at ${cooled} after the checkpoint`);
});

test("Lavatoren: a tap picks the platform in that third of the tower, and the keys pick lanes", () => {
  assert.equal(toren.laneAt(10), 0);
  assert.equal(toren.laneAt(toren.WIDTH / 2), 1);
  assert.equal(toren.laneAt(toren.WIDTH - 5), 2);
  for (const [lane, x] of toren.LANE_X.entries()) {
    assert.equal(toren.laneAt(x), lane, "a platform's own centre is in its own lane");
    assert.equal(toren.laneAt(x - toren.PLATFORM_W / 2 + 2), lane, "and so is its left edge");
    assert.equal(toren.laneAt(x + toren.PLATFORM_W / 2 - 2), lane, "and its right edge");
  }
  assert.deepEqual(toren.keyInput("1"), { lane: 0 });
  assert.deepEqual(toren.keyInput("ArrowUp"), { lane: 1 });
  assert.deepEqual(toren.keyInput("ArrowRight"), { lane: 2 });
  assert.deepEqual(toren.keyInput(" "), {});
  assert.equal(toren.keyInput("x"), null);

  const world = toren.createWorld({ level: 0, nextQuestion: fixedQuestion(2) });
  toren.step(world, DT, { action: true });
  let answer = null;
  for (let i = 0; i < 60 && !answer; i++) {
    for (const event of toren.step(world, DT, i === 0 ? { action: true, tap: { x: toren.WIDTH - 40, y: 100 } } : {})) {
      if (event.type === "answer") answer = event;
    }
  }
  assert.equal(answer?.correct, true, "a tap on the right third jumped to the right platform");
});

// ---------------------------------------------------------------------------
// Turbokart (round 19)
// ---------------------------------------------------------------------------

/** Race: `lanePlan(gate)` picks a lane for each gate; bananas are dodged unless `dodge` is false. */
function race(world, { lanePlan, dodge = true }) {
  const events = { answers: [], crashes: 0, powerups: 0, finish: null, over: 0 };
  kart.step(world, DT, { action: true });
  const plan = new Map();
  for (let frame = 0; frame < 300 * 60 && world.phase !== "over"; frame++) {
    const gate = world.gates.find((g) => !g.resolved);
    let lane = world.lane;
    if (gate) {
      if (!plan.has(gate)) plan.set(gate, lanePlan(gate));
      lane = plan.get(gate);
    }
    if (dodge) {
      const banana = world.bananas.find((b) => !b.hit && b.d > world.pos && b.d - world.pos < 40 && b.lane === lane);
      if (banana) lane = (lane + 1) % 3;
    }
    for (const event of kart.step(world, DT, lane !== world.lane ? { action: true, lane } : {})) {
      if (event.type === "answer") events.answers.push(event);
      else if (event.type === "crash") events.crashes += 1;
      else if (event.type === "powerup") events.powerups += 1;
      else if (event.type === "finish") events.finish = event.place;
      else if (event.type === "over") events.over += 1;
    }
  }
  return events;
}

test("Turbokart: answering everything right wins the race at every level, in sums and in words", () => {
  for (const level of LEVELS) {
    for (const mode of ["sums", "words"]) {
      for (let run = 0; run < 3; run++) {
        const world = kart.createWorld({ level, nextQuestion: () => arcade.arcadeQuestion(level, mode, "en") });
        const events = race(world, { lanePlan: (gate) => gate.answerIndex });
        assert.equal(events.answers.length, arcade.QUESTIONS_PER_RUN, `level ${level}`);
        assert.ok(events.answers.every((a) => a.correct));
        assert.equal(events.crashes, 0, "the autopilot dodges every banana");
        assert.equal(events.finish, 1, `level ${level} ${mode}: finished ${events.finish}`);
        assert.equal(events.powerups, arcade.QUESTIONS_PER_RUN / kart.STAR_STREAK, "a star every three in a row");
        assert.equal(events.over, 1);
      }
    }
  }
});

test("Turbokart: answering everything wrong finishes last - the place reads how the run went", () => {
  for (const level of [0, 4, 7]) {
    const world = kart.createWorld({ level, nextQuestion: () => arcade.arcadeQuestion(level, "sums", "nl") });
    const events = race(world, { lanePlan: (gate) => (gate.answerIndex + 1) % 3 });
    assert.equal(events.answers.length, arcade.QUESTIONS_PER_RUN);
    assert.ok(events.answers.every((a) => !a.correct));
    assert.equal(events.finish, 4);
    assert.equal(events.powerups, 0);
  }
});

test("Turbokart: every gate is answered exactly once, and a race without steering still ends", () => {
  const world = kart.createWorld({ level: 3, nextQuestion: fixedQuestion(1) });
  const events = race(world, { lanePlan: () => 1, dodge: false });
  assert.equal(events.answers.length, arcade.QUESTIONS_PER_RUN);
  assert.equal(world.resolved, arcade.QUESTIONS_PER_RUN);
  assert.ok(events.answers.every((a) => a.correct && a.picked === "b"), "the kart starts in the middle lane");
  assert.equal(events.over, 1);
});

test("Turbokart: level 0 has no bananas; from level 1 a banana in your lane spins you out, unless you carry a star", () => {
  const easy = kart.createWorld({ level: 0, nextQuestion: fixedQuestion(1) });
  kart.step(easy, DT, { action: true });
  assert.equal(easy.bananas.length, 0);

  const world = kart.createWorld({ level: 2, nextQuestion: fixedQuestion(1) });
  kart.step(world, DT, { action: true });
  assert.equal(world.bananas.length, arcade.QUESTIONS_PER_RUN - 1, "one between every two gates");
  // Park the kart in the first banana's lane and drive into it.
  const banana = world.bananas[0];
  world.lane = banana.lane;
  world.x = kart.LANES[banana.lane];
  let crashed = 0;
  for (let i = 0; i < 60 * 30 && !banana.hit; i++) {
    for (const event of kart.step(world, DT, { lane: banana.lane })) if (event.type === "crash") crashed += 1;
  }
  assert.equal(crashed, 1);
  assert.ok(world.spin > 0, "spinning");

  const starred = kart.createWorld({ level: 2, nextQuestion: fixedQuestion(1) });
  kart.step(starred, DT, { action: true });
  const next = starred.bananas[0];
  starred.lane = next.lane;
  starred.x = kart.LANES[next.lane];
  let starCrashes = 0;
  for (let i = 0; i < 60 * 30 && !next.hit; i++) {
    starred.star = 5; // keep the star on
    for (const event of kart.step(starred, DT, { lane: next.lane })) if (event.type === "crash") starCrashes += 1;
  }
  assert.equal(next.hit, true);
  assert.equal(starCrashes, 0, "a star shrugs the banana off");
  assert.equal(starred.spin, 0);
});

test("Turbokart: a right answer is a boost and a wrong one mud, and the steering keys move one lane", () => {
  const world = kart.createWorld({ level: 0, nextQuestion: fixedQuestion(1) });
  kart.step(world, DT, { action: true });
  const first = world.gates[0];
  while (!first.resolved) kart.step(world, DT, {});
  assert.ok(world.boost > 0 && world.mud === 0);
  world.lane = 0;
  world.x = kart.LANES[0];
  const second = world.gates[1];
  while (!second.resolved) kart.step(world, DT, { lane: 0 });
  assert.ok(world.mud > 0 && world.boost === 0);
  assert.deepEqual(kart.keyInput("ArrowLeft"), { steer: -1 });
  assert.deepEqual(kart.keyInput("ArrowRight"), { steer: 1 });
  assert.deepEqual(kart.keyInput("2"), { lane: 1 });
  kart.step(world, DT, { steer: 1 });
  assert.equal(world.lane, 1);
  kart.step(world, DT, { steer: 1 });
  kart.step(world, DT, { steer: 1 });
  assert.equal(world.lane, 2, "steering stops at the edge of the road");
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
  for (const game of ["vlieg", "sprong", "toren", "kart"]) {
    keys.push(`${game}.how_to`, `${game}.start_button`, `${game}.controls`, `${game}.tap_to_start`, `${game}.canvas_label`);
  }
  keys.push("toren.result_top", "toren.result_floor", "kart.result_1", "kart.result_2", "kart.result_3", "kart.result_4");
  for (const lang of ["nl", "en"]) for (const key of keys) assert.ok(TRANSLATIONS[lang][key], `${lang} ${key}`);
});
