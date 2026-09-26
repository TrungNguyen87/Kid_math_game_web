/**
 * Sprongheld / Jump Hero (round 18) - a side-scrolling runner in the spirit
 * of the classic platform games, where every row of blocks is a question.
 *
 * The hero runs by itself; tap (or press space) to jump. Three answer
 * blocks float above the path - jump up into the right one to bump it and
 * pop out a coin. From level 1 a spiky slime waits on the path after every
 * row: jump over it, or lose one of three lives. Bumping a wrong block (or
 * running under all three) earns nothing, but costs no life either.
 *
 * The hero is the child's own equipped character from the reward shop, so
 * buying one changes who runs.
 *
 * As in Fladdervogel, the world is plain data and step() a pure function
 * (tested in tests/web/test_arcade.mjs).
 */
import { LIVES, QUESTIONS_PER_RUN, arcadeGame, fitText } from "../arcade.js";

const GAME_KEY = "sprong";

export const WIDTH = 480;
export const HEIGHT = 300;
export const GROUND = 252;
export const RUNNER_X = 84;
export const RUNNER_W = 34;
export const RUNNER_H = 46;
export const BLOCK_W = 78;
export const BLOCK_H = 40;
/** The underside of the answer blocks - a jump's head reaches it easily. */
export const BLOCK_BOTTOM = GROUND - 104;
export const OBSTACLE_W = 30;
export const OBSTACLE_H = 28;
const GRAVITY = 1700;
export const JUMP_V = -660;
const INVULNERABLE_S = 1.3;
const END_DELAY_S = 0.8;

/** Pixels per second the world scrolls - a little faster every level. */
export const speedFor = (level) => 135 + 12 * level;
/** Distance between the starts of two blocks in a row (never under a jump's length). */
export const blockGapFor = (level) => Math.max(190, Math.round(speedFor(level) * 1.15));
/** Run-up before the next row: more reading time at the low levels. */
export const spawnGapFor = (level) => Math.max(80, 200 - 15 * level);
/** Where the slime waits, measured from the end of the row. */
export const OBSTACLE_AFTER = 150;

export function createWorld({ level = 0, nextQuestion, maxQuestions = QUESTIONS_PER_RUN, hero = "🧑", readyText = "👆" }) {
  return {
    level,
    speed: speedFor(level),
    blockGap: blockGapFor(level),
    spawnGap: spawnGapFor(level),
    runner: { y: GROUND, vy: 0, onGround: true },
    rows: [],
    obstacles: [],
    question: null,
    lives: LIVES,
    invulnerable: 0,
    phase: "ready",
    spawned: 0,
    resolved: 0,
    maxQuestions,
    nextQuestion,
    hero,
    readyText,
    time: 0,
    distance: 0,
    endTimer: null,
    coins: [],
    hudVersion: 0,
  };
}

function spawnRow(world, x) {
  const question = world.nextQuestion();
  const blocks = question.options.map((option, i) => ({ x: x + i * world.blockGap, option, bumpedAt: null }));
  world.rows.push({
    question,
    answerIndex: question.options.indexOf(question.answer),
    blocks,
    resolved: false,
    picked: null,
  });
  // From level 1 a slime waits after the row: something to jump *over*,
  // not into, so the two kinds of jump never compete for the same spot.
  if (world.level >= 1) {
    world.obstacles.push({ x: blocks[blocks.length - 1].x + BLOCK_W + OBSTACLE_AFTER, hit: false });
  }
  world.spawned += 1;
}

function upcoming(world) {
  return world.rows.find((row) => !row.resolved) ?? null;
}

function resolveRow(world, row, index, events) {
  row.resolved = true;
  row.picked = index;
  world.resolved += 1;
  const isCorrect = index === row.answerIndex;
  const picked = index == null ? null : row.question.options[index];
  events.push({ type: "answer", correct: isCorrect, question: row.question, picked });
  if (index != null && isCorrect) {
    const block = row.blocks[index];
    world.coins.push({ x: block.x + BLOCK_W / 2, y: BLOCK_BOTTOM - BLOCK_H, age: 0 });
  }
  if (world.spawned < world.maxQuestions) spawnRow(world, nextRowX(world));
  world.hudVersion += 1;
}

/**
 * Where the next row starts: off screen, and well clear of the row before
 * and of its slime. A bump on the first block resolves a row early, while
 * its slime is still off screen to the right; spawning at a fixed x would
 * then put the next row's blocks right above that slime, where jumping over
 * the slime would bump a block by accident.
 */
export function nextRowX(world) {
  let x = WIDTH + world.spawnGap;
  const lastRow = world.rows[world.rows.length - 1];
  if (lastRow) x = Math.max(x, lastRow.blocks[lastRow.blocks.length - 1].x + BLOCK_W + 200);
  const lastObstacle = world.obstacles[world.obstacles.length - 1];
  if (lastObstacle) x = Math.max(x, lastObstacle.x + 230);
  return x;
}

const overlapsRunner = (left, right) => right > RUNNER_X - RUNNER_W / 2 && left < RUNNER_X + RUNNER_W / 2;

/**
 * Advance the world by `dt` seconds.
 * @param {{action?: boolean}} input  action = a jump this frame (only from the ground)
 * @returns {Array<{type: string}>} "action", "crash", "answer" and "over" events
 */
export function step(world, dt, { action = false } = {}) {
  const events = [];
  if (world.phase === "over") return events;
  world.time += dt;
  const runner = world.runner;

  for (const coin of world.coins) coin.age += dt;
  world.coins = world.coins.filter((coin) => coin.age < 0.8);

  if (world.phase === "ready") {
    if (action) {
      world.phase = "play";
      spawnRow(world, WIDTH + 40);
      world.question = upcoming(world)?.question ?? null;
      world.hudVersion += 1;
      events.push({ type: "action" });
    }
    return events;
  }

  if (action && runner.onGround) {
    runner.vy = JUMP_V;
    runner.onGround = false;
    events.push({ type: "action" });
  }
  const headBefore = runner.y - RUNNER_H;
  runner.vy += GRAVITY * dt;
  runner.y += runner.vy * dt;
  if (runner.y >= GROUND) {
    runner.y = GROUND;
    runner.vy = 0;
    runner.onGround = true;
  }
  const headNow = runner.y - RUNNER_H;
  world.invulnerable = Math.max(0, world.invulnerable - dt);

  const move = world.speed * dt;
  world.distance += move;
  for (const row of world.rows) for (const block of row.blocks) block.x -= move;
  for (const obstacle of world.obstacles) obstacle.x -= move;
  for (const coin of world.coins) coin.x -= move;

  // Bump: the head crosses a block's underside on the way up, under it.
  for (const row of world.rows) {
    if (row.resolved) continue;
    const index = row.blocks.findIndex((block) => overlapsRunner(block.x, block.x + BLOCK_W));
    if (index !== -1 && runner.vy < 0 && headBefore > BLOCK_BOTTOM && headNow <= BLOCK_BOTTOM) {
      row.blocks[index].bumpedAt = world.time;
      runner.y = BLOCK_BOTTOM + RUNNER_H;
      runner.vy = 120; // bonk - fall back down
      resolveRow(world, row, index, events);
      continue;
    }
    // Ran under the whole row without bumping anything.
    const last = row.blocks[row.blocks.length - 1];
    if (last.x + BLOCK_W < RUNNER_X - RUNNER_W / 2) resolveRow(world, row, null, events);
  }

  for (const obstacle of world.obstacles) {
    if (obstacle.hit || world.invulnerable > 0) continue;
    const touching = overlapsRunner(obstacle.x - OBSTACLE_W / 2, obstacle.x + OBSTACLE_W / 2) && runner.y > GROUND - OBSTACLE_H;
    if (touching) {
      obstacle.hit = true;
      world.lives -= 1;
      world.invulnerable = INVULNERABLE_S;
      events.push({ type: "crash" });
      world.hudVersion += 1;
    }
  }

  world.rows = world.rows.filter((row) => row.blocks[row.blocks.length - 1].x > -BLOCK_W - 20);
  world.obstacles = world.obstacles.filter((obstacle) => obstacle.x > -OBSTACLE_W);

  const next = upcoming(world)?.question ?? null;
  if (next !== world.question) {
    world.question = next;
    world.hudVersion += 1;
  }

  if (world.lives <= 0) {
    world.phase = "over";
    events.push({ type: "over" });
  } else if (world.resolved >= world.maxQuestions) {
    world.endTimer = (world.endTimer ?? END_DELAY_S) - dt;
    if (world.endTimer <= 0) {
      world.phase = "over";
      events.push({ type: "over" });
    }
  }
  return events;
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHills(ctx, world, dark) {
  ctx.fillStyle = dark ? "#1f3b2c" : "#a5d6a7";
  const span = WIDTH + 200;
  for (let i = 0; i < 3; i++) {
    const x = ((((i * 230 - world.distance * 0.25) % span) + span) % span) - 100;
    ctx.beginPath();
    ctx.ellipse(x, GROUND, 110, 70 + (i % 2) * 20, 0, Math.PI, 0);
    ctx.fill();
  }
}

function drawBlock(ctx, row, index, world, dark) {
  const block = row.blocks[index];
  const bumpAge = block.bumpedAt == null ? null : world.time - block.bumpedAt;
  const lift = bumpAge != null && bumpAge < 0.2 ? Math.sin((bumpAge / 0.2) * Math.PI) * 8 : 0;
  const y = BLOCK_BOTTOM - BLOCK_H - lift;
  const isAnswer = index === row.answerIndex;
  let fill = "#ffb300";
  let edge = "#e65100";
  if (row.resolved && isAnswer) {
    fill = "#81c784";
    edge = "#1b5e20";
  } else if (row.resolved && row.picked === index) {
    fill = "#e57373";
    edge = "#b71c1c";
  } else if (row.resolved) {
    fill = dark ? "#6d4c41" : "#a1887f";
    edge = "#4e342e";
  }
  ctx.fillStyle = fill;
  roundRect(ctx, block.x, y, BLOCK_W, BLOCK_H, 6);
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.stroke();
  // Rivets in the corners, like a real question block.
  ctx.fillStyle = edge;
  for (const [dx, dy] of [
    [5, 5],
    [BLOCK_W - 5, 5],
    [5, BLOCK_H - 5],
    [BLOCK_W - 5, BLOCK_H - 5],
  ]) {
    ctx.beginPath();
    ctx.arc(block.x + dx, y + dy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#3e2723";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fitText(ctx, block.option, block.x + BLOCK_W / 2, y + BLOCK_H / 2 + 1, BLOCK_W - 10, 20);
}

function drawObstacle(ctx, obstacle, world) {
  const x = obstacle.x;
  const squish = 1 + Math.sin(world.time * 8 + x) * 0.06;
  ctx.fillStyle = "#8e24aa";
  ctx.beginPath();
  ctx.ellipse(x, GROUND - (OBSTACLE_H / 2) * squish, OBSTACLE_W / 2, (OBSTACLE_H / 2) * squish, 0, 0, Math.PI * 2);
  ctx.fill();
  // Spikes
  ctx.fillStyle = "#4a148c";
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 6 - 4, GROUND - OBSTACLE_H * squish + 6);
    ctx.lineTo(x + i * 6, GROUND - OBSTACLE_H * squish - 6);
    ctx.lineTo(x + i * 6 + 4, GROUND - OBSTACLE_H * squish + 6);
    ctx.fill();
  }
  // Grumpy eyes
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x - 6, GROUND - 14, 4, 0, Math.PI * 2);
  ctx.arc(x + 6, GROUND - 14, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#212121";
  ctx.beginPath();
  ctx.arc(x - 7, GROUND - 13, 2, 0, Math.PI * 2);
  ctx.arc(x + 5, GROUND - 13, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawRunner(ctx, world, colors) {
  if (world.invulnerable > 0 && Math.floor(world.time * 10) % 2 === 0) return;
  const { runner } = world;
  const left = RUNNER_X - RUNNER_W / 2;
  const top = runner.y - RUNNER_H;
  // Legs: a two-frame run cycle on the ground, tucked in the air.
  ctx.fillStyle = "#37474f";
  const stride = runner.onGround ? Math.sin(world.time * 18) * 5 : 3;
  ctx.fillRect(RUNNER_X - 9 + stride, runner.y - 12, 7, 12);
  ctx.fillRect(RUNNER_X + 2 - stride, runner.y - 12, 7, 12);
  // Body in the theme colour (a cape, really).
  ctx.fillStyle = colors.accent;
  roundRect(ctx, left + 3, top + 18, RUNNER_W - 6, RUNNER_H - 28, 7);
  ctx.fill();
  ctx.strokeStyle = colors.accentDark;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Head: the equipped character, on a light disc so it reads on any sky.
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(RUNNER_X, top + 12, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `24px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.fillText(world.hero, RUNNER_X, top + 13);
}

export function draw(ctx, world, colors) {
  const dark = colors.dark;
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, dark ? "#1a1f3d" : "#81d4fa");
  sky.addColorStop(1, dark ? "#34406b" : "#e1f5fe");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, GROUND);

  // A sun (or moon) and slow hills.
  ctx.fillStyle = dark ? "#fff9c4" : "#ffeb3b";
  ctx.beginPath();
  ctx.arc(WIDTH - 60, 50, 22, 0, Math.PI * 2);
  ctx.fill();
  drawHills(ctx, world, dark);

  // Brick ground with a grass top, scrolling with the run.
  ctx.fillStyle = dark ? "#4e342e" : "#a1664a";
  ctx.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);
  ctx.fillStyle = dark ? "#2e7d32" : "#66bb6a";
  ctx.fillRect(0, GROUND, WIDTH, 8);
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 2;
  const offset = world.distance % 32;
  for (let x = -offset; x < WIDTH; x += 32) {
    ctx.strokeRect(x, GROUND + 10, 32, 18);
    ctx.strokeRect(x + 16, GROUND + 28, 32, 18);
  }

  for (const obstacle of world.obstacles) drawObstacle(ctx, obstacle, world);
  for (const row of world.rows) row.blocks.forEach((_, i) => drawBlock(ctx, row, i, world, dark));

  for (const coin of world.coins) {
    ctx.globalAlpha = Math.max(0, 1 - coin.age / 0.8);
    ctx.fillStyle = "#ffd54f";
    ctx.strokeStyle = "#f57f17";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(coin.x, coin.y - coin.age * 90, 9 * Math.abs(Math.cos(coin.age * 12)) + 2, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawRunner(ctx, world, colors);

  if (world.phase === "ready") {
    ctx.fillStyle = dark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.65)";
    roundRect(ctx, 60, 70, WIDTH - 120, 56, 16);
    ctx.fill();
    ctx.fillStyle = dark ? "#fff" : "#3e2723";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, world.readyText, WIDTH / 2, 98, WIDTH - 150, 24);
  }
}

export const render = arcadeGame({
  gameKey: GAME_KEY,
  emoji: "🦸",
  width: WIDTH,
  height: HEIGHT,
  maxWidth: 720,
  createWorld,
  step,
  draw,
});
