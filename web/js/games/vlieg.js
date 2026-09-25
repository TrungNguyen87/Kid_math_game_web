/**
 * Fladdervogel / Flutter Bird (round 18) - a flying game in the spirit of
 * the tap-to-flap classics, where every gate is a question.
 *
 * Tap (or press space) to flap. Each gate has three openings, each with an
 * answer on it; fly through the right one. Flying into a wall or the ground
 * costs one of three lives. A wrong opening costs no life - it just earns
 * nothing and breaks the combo - so the danger is the flying, and the
 * reading is where the points are.
 *
 * Everything the bird and the gates do is in createWorld()/step(), plain
 * data and a pure function, so tests/web/test_arcade.mjs can fly the bird
 * with an autopilot and check that every right answer is reachable.
 */
import { LIVES, QUESTIONS_PER_RUN, arcadeGame, fitText } from "../arcade.js";

const GAME_KEY = "vlieg";

export const WIDTH = 360;
export const HEIGHT = 540;
export const GROUND = 480;
export const BIRD_X = 96;
export const BIRD_R = 15;
export const GATE_W = 64;
const GRAVITY = 1150;
export const FLAP_V = -340;
const MAX_FALL = 520;
const INVULNERABLE_S = 1.4;
const END_DELAY_S = 0.8;

/** The three openings in every gate, top to bottom, and the walls between them. */
export const LANES = [
  { top: 24, bottom: 136 },
  { top: 184, bottom: 296 },
  { top: 344, bottom: 456 },
];
export const WALLS = [
  [0, 24],
  [136, 184],
  [296, 344],
  [456, GROUND],
];

/** Pixels per second the gates move - a little faster every level. */
export const speedFor = (level) => 105 + 11 * level;
/** Extra run-up before the next gate: more reading time at the low levels. */
export const spawnGapFor = (level) => Math.max(90, 230 - 18 * level);

export function createWorld({ level = 0, nextQuestion, maxQuestions = QUESTIONS_PER_RUN, hero = "🐦", readyText = "👆" }) {
  return {
    readyText,
    level,
    speed: speedFor(level),
    spawnGap: spawnGapFor(level),
    bird: { x: BIRD_X, y: 250, vy: 0 },
    gates: [],
    question: null,
    lives: LIVES,
    invulnerable: 0,
    phase: "ready",
    spawned: 0,
    resolved: 0,
    maxQuestions,
    nextQuestion,
    hero,
    time: 0,
    endTimer: null,
    effects: [],
    hudVersion: 0,
  };
}

function spawnGate(world, x) {
  const question = world.nextQuestion();
  world.gates.push({
    x,
    question,
    answerIndex: question.options.indexOf(question.answer),
    resolved: false,
    picked: null,
  });
  world.spawned += 1;
}

/** The first gate not yet flown through - the one the HUD question is about. */
function upcoming(world) {
  return world.gates.find((gate) => !gate.resolved) ?? null;
}

function hitsWall(bird, gate) {
  const left = gate.x - GATE_W / 2;
  const right = gate.x + GATE_W / 2;
  const nearestX = Math.max(left, Math.min(bird.x, right));
  return WALLS.some(([top, bottom]) => {
    const nearestY = Math.max(top, Math.min(bird.y, bottom));
    return (bird.x - nearestX) ** 2 + (bird.y - nearestY) ** 2 < BIRD_R * BIRD_R;
  });
}

function loseLife(world, events) {
  world.lives -= 1;
  world.invulnerable = INVULNERABLE_S;
  events.push({ type: "crash" });
  world.hudVersion += 1;
}

function resolveGate(world, gate, laneIndex, events) {
  gate.resolved = true;
  gate.picked = laneIndex;
  world.resolved += 1;
  const isCorrect = laneIndex === gate.answerIndex;
  const picked = laneIndex == null ? null : gate.question.options[laneIndex];
  events.push({ type: "answer", correct: isCorrect, question: gate.question, picked });
  world.effects.push({ x: world.bird.x, y: world.bird.y - 26, age: 0, text: isCorrect ? "✓" : "✗", good: isCorrect });
  if (world.spawned < world.maxQuestions) spawnGate(world, WIDTH + world.spawnGap + GATE_W / 2);
  world.hudVersion += 1;
}

/**
 * Advance the world by `dt` seconds.
 * @param {object} world
 * @param {number} dt
 * @param {{action?: boolean}} input  action = a flap this frame
 * @returns {Array<{type: string}>} "action", "crash", "answer" and "over" events
 */
export function step(world, dt, { action = false } = {}) {
  const events = [];
  if (world.phase === "over") return events;
  world.time += dt;
  const bird = world.bird;

  // Effects drift with the world whatever the phase.
  for (const effect of world.effects) effect.age += dt;
  world.effects = world.effects.filter((effect) => effect.age < 0.9);

  if (world.phase === "ready") {
    bird.y = 250 + Math.sin(world.time * 3) * 8;
    if (action) {
      world.phase = "play";
      bird.vy = FLAP_V;
      spawnGate(world, WIDTH + 60);
      world.question = upcoming(world)?.question ?? null;
      world.hudVersion += 1;
      events.push({ type: "action" });
    }
    return events;
  }

  if (action) {
    bird.vy = FLAP_V;
    events.push({ type: "action" });
  }
  bird.vy = Math.min(bird.vy + GRAVITY * dt, MAX_FALL);
  bird.y += bird.vy * dt;
  world.invulnerable = Math.max(0, world.invulnerable - dt);

  // The sky is not a wall: bump the head and fall back.
  if (bird.y - BIRD_R < 0) {
    bird.y = BIRD_R;
    bird.vy = Math.max(bird.vy, 0);
  }
  // The ground is: lose a life and pop back up to the middle.
  if (bird.y + BIRD_R >= GROUND) {
    if (world.invulnerable > 0) {
      bird.y = GROUND - BIRD_R;
      bird.vy = FLAP_V * 0.9;
    } else {
      loseLife(world, events);
      bird.y = 250;
      bird.vy = FLAP_V * 0.6;
    }
  }

  for (const gate of world.gates) gate.x -= world.speed * dt;
  for (const effect of world.effects) effect.x -= world.speed * dt;

  for (const gate of world.gates) {
    if (gate.resolved) continue;
    if (world.invulnerable === 0 && hitsWall(bird, gate)) {
      // A crash answers nothing: the gate counts as a wrong answer.
      loseLife(world, events);
      resolveGate(world, gate, null, events);
      continue;
    }
    if (bird.x >= gate.x) {
      const lane = LANES.findIndex((l) => bird.y >= l.top && bird.y <= l.bottom);
      resolveGate(world, gate, lane === -1 ? null : lane, events);
    }
  }
  world.gates = world.gates.filter((gate) => gate.x > -GATE_W);

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

function drawCloud(ctx, x, y, s) {
  ctx.beginPath();
  ctx.arc(x, y, 16 * s, 0, Math.PI * 2);
  ctx.arc(x + 18 * s, y - 8 * s, 20 * s, 0, Math.PI * 2);
  ctx.arc(x + 38 * s, y, 15 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawGate(ctx, gate, dark) {
  const left = gate.x - GATE_W / 2;
  for (const [top, bottom] of WALLS) {
    if (bottom - top <= 0) continue;
    const grad = ctx.createLinearGradient(left, 0, left + GATE_W, 0);
    grad.addColorStop(0, "#2e7d32");
    grad.addColorStop(0.45, "#66bb6a");
    grad.addColorStop(1, "#1b5e20");
    ctx.fillStyle = grad;
    roundRect(ctx, left, top, GATE_W, bottom - top, 6);
    ctx.fill();
    ctx.strokeStyle = "#1b5e20";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  gate.question.options.forEach((option, i) => {
    const lane = LANES[i];
    const cy = (lane.top + lane.bottom) / 2;
    const resolved = gate.resolved;
    const isAnswer = i === gate.answerIndex;
    let fill = dark ? "#fff8e1" : "#ffffff";
    let stroke = "#8d6e63";
    if (resolved && isAnswer) {
      fill = "#c8e6c9";
      stroke = "#2e7d32";
    } else if (resolved && gate.picked === i) {
      fill = "#ffcdd2";
      stroke = "#c62828";
    }
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    roundRect(ctx, gate.x - 56, cy - 19, 112, 38, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#3e2723";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, option, gate.x, cy + 1, 100, 20);
  });
}

function drawBird(ctx, world, colors) {
  const { bird } = world;
  // Blink while invulnerable after a crash.
  if (world.invulnerable > 0 && Math.floor(world.time * 10) % 2 === 0) return;
  const angle = Math.max(-0.5, Math.min(0.9, bird.vy / 600));
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(angle);
  // Body
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.ellipse(0, 0, BIRD_R + 3, BIRD_R, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = colors.accentDark;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Belly
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(2, 6, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wing, flapping
  const flap = Math.sin(world.time * 22) * 6;
  ctx.fillStyle = colors.amber;
  ctx.beginPath();
  ctx.ellipse(-5, flap * 0.4, 9, 5 + Math.abs(flap) * 0.5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Eye
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(8, -5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#212121";
  ctx.beginPath();
  ctx.arc(9.5, -5, 2.4, 0, Math.PI * 2);
  ctx.fill();
  // Beak
  ctx.fillStyle = "#ffb300";
  ctx.beginPath();
  ctx.moveTo(15, -1);
  ctx.lineTo(25, 3);
  ctx.lineTo(15, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function draw(ctx, world, colors) {
  const dark = colors.dark;
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, dark ? "#16213e" : "#8fd3ff");
  sky.addColorStop(1, dark ? "#2d3a66" : "#e3f6ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, GROUND);

  // Slow parallax clouds.
  ctx.fillStyle = dark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.85)";
  for (let i = 0; i < 4; i++) {
    const span = WIDTH + 140;
    const x = ((((i * 131 - world.time * 16) % span) + span) % span) - 70;
    drawCloud(ctx, x, 60 + ((i * 97) % 300), 0.8 + (i % 2) * 0.35);
  }

  for (const gate of world.gates) drawGate(ctx, gate, dark);

  // Ground with moving stripes.
  ctx.fillStyle = dark ? "#3e2f25" : "#8d6e63";
  ctx.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);
  ctx.fillStyle = dark ? "#2e7d32" : "#7cb342";
  ctx.fillRect(0, GROUND, WIDTH, 12);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  const offset = (world.time * world.speed) % 28;
  for (let x = -offset; x < WIDTH; x += 28) ctx.fillRect(x, GROUND + 16, 14, 6);

  drawBird(ctx, world, colors);

  for (const effect of world.effects) {
    ctx.globalAlpha = Math.max(0, 1 - effect.age / 0.9);
    ctx.fillStyle = effect.good ? "#2e7d32" : "#c62828";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 30px "Baloo 2", system-ui, sans-serif`;
    ctx.fillText(effect.text, effect.x, effect.y - effect.age * 40);
    ctx.globalAlpha = 1;
  }

  if (world.phase === "ready") {
    ctx.fillStyle = dark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.6)";
    roundRect(ctx, 40, 150, WIDTH - 80, 60, 16);
    ctx.fill();
    ctx.fillStyle = dark ? "#fff" : "#3e2723";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, world.readyText, WIDTH / 2, 180, WIDTH - 100, 24);
  }
}

export const render = arcadeGame({
  gameKey: GAME_KEY,
  emoji: "🐦",
  width: WIDTH,
  height: HEIGHT,
  maxWidth: 420,
  createWorld,
  step,
  draw,
});
