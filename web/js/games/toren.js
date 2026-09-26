/**
 * Lavatoren / Lava Tower (round 19) - an obstacle-tower climb in the spirit
 * of the "the floor is lava" towers children know from block-building
 * games, where every floor is a question.
 *
 * Three brick platforms float above the hero, each with an answer on it.
 * Tap the one with the right answer (or press 1, 2, 3 / the arrow keys) and
 * the hero jumps up onto it: one floor higher. Jump onto a wrong one and it
 * crumbles - the hero drops back to where they stood and a new question
 * appears for the same floor. Meanwhile the lava keeps rising. A wrong
 * answer never costs a life by itself; it costs *time*, and the lava is
 * what takes lives. Every third floor is a checkpoint that cools the lava
 * back down, and floor 12 is the summit.
 *
 * The lava's speed is set per level from a reading budget: at level 0 a
 * child has about 16 seconds per floor before the lava gains on them, at
 * level 7 about 7. tests/web/test_arcade.mjs climbs the tower with an
 * autopilot that takes most of that budget to "read" and checks it reaches
 * the summit without ever being caught.
 *
 * Like Fladdervogel and Sprongheld, the world is plain data and step() is
 * a pure function of (world, dt, input).
 */
import { LIVES, arcadeGame, fitText } from "../arcade.js";

const GAME_KEY = "toren";

export const WIDTH = 360;
export const HEIGHT = 540;
/** Height between two floors, in world pixels. */
export const FLOOR_H = 110;
/** The summit: the run is won on reaching this floor. */
export const TOP_FLOOR = 12;
/** Every third floor is a checkpoint. */
export const CHECKPOINT_EVERY = 3;
// Three platforms between the walls (14px on the left, 32px on the right).
export const LANE_X = [68, 171, 274];
export const PLATFORM_W = 96;
const PLATFORM_H = 20;
/** Where the lava starts, and where it drops back to after catching the hero or at a checkpoint. */
export const LAVA_START = 1.8 * FLOOR_H;
export const LAVA_RESET = 1.8 * FLOOR_H;
const JUMP_S = 0.5;
const FALL_S = 0.45;
const JUMP_ARC = 46;
const INVULNERABLE_S = 1.6;
const END_DELAY_S = 1.4;
/** Where the hero's floor sits on the screen. */
const BASE_Y = HEIGHT - 140;

/** Seconds of reading per floor before the lava gains on the hero. */
export const readingBudget = (level) => [16, 14, 12, 11, 10, 9, 8, 7][Math.max(0, Math.min(7, level))];
/** Lava speed in world pixels per second. */
export const lavaSpeedFor = (level) => FLOOR_H / readingBudget(level);

/**
 * Which lane a tap at x (world coordinates) means: the nearest platform.
 * (Not the thirds of the canvas - the platforms sit between walls of
 * different widths, so a tap on the right platform's left edge would
 * otherwise land in the middle third.)
 */
export function laneAt(x) {
  let best = 0;
  for (let i = 1; i < LANE_X.length; i++) if (Math.abs(x - LANE_X[i]) < Math.abs(x - LANE_X[best])) best = i;
  return best;
}

export function createWorld({ level = 0, nextQuestion, hero = "🧑", readyText = "👆" }) {
  return {
    level,
    lavaSpeed: lavaSpeedFor(level),
    phase: "ready",
    floor: 0,
    lane: 1,
    climber: { x: LANE_X[1], h: 0 },
    anim: null,
    // The floor above the hero: its question and its three platforms.
    next: null,
    // Solid platforms already climbed, one per floor: { floor, lane, checkpoint }.
    path: [],
    lava: -LAVA_START,
    lives: LIVES,
    invulnerable: 0,
    resolved: 0,
    correct: 0,
    question: null,
    nextQuestion,
    hero,
    readyText,
    cam: 0,
    time: 0,
    endTimer: null,
    summit: false,
    effects: [],
    hudVersion: 0,
  };
}

function spawnQuestion(world) {
  const question = world.nextQuestion();
  world.next = {
    floor: world.floor + 1,
    question,
    answerIndex: question.options.indexOf(question.answer),
    platforms: question.options.map((option, lane) => ({ lane, option, bornAt: world.time })),
  };
  world.question = question;
  world.hudVersion += 1;
}

/** The lava's distance below the hero's feet, in floors (for the gauge). */
export function lavaGap(world) {
  return (world.climber.h - world.lava) / FLOOR_H;
}

function crumble(world, platform, floor) {
  world.effects.push({
    kind: "crumble",
    x: LANE_X[platform.lane],
    h: floor * FLOOR_H,
    vy: 0,
    rot: 0,
    age: 0,
    text: platform.option,
  });
}

function float(world, text, good) {
  world.effects.push({ kind: "text", x: world.climber.x, h: world.climber.h + 70, age: 0, text, good });
}

function startJump(world, lane) {
  const target = world.next;
  world.anim = {
    kind: "jump",
    t: 0,
    dur: JUMP_S,
    lane,
    from: { x: world.climber.x, h: world.climber.h },
    to: { x: LANE_X[lane], h: target.floor * FLOOR_H },
  };
}

/** The hero has landed on platform `lane` of the floor above: answer it. */
function land(world, events) {
  const { lane } = world.anim;
  const target = world.next;
  const isCorrect = lane === target.answerIndex;
  const picked = target.question.options[lane];
  world.resolved += 1;
  events.push({ type: "answer", correct: isCorrect, question: target.question, picked });

  if (isCorrect) {
    world.correct += 1;
    world.floor = target.floor;
    world.lane = lane;
    const checkpoint = world.floor % CHECKPOINT_EVERY === 0 && world.floor < TOP_FLOOR;
    world.path.push({ floor: world.floor, lane, checkpoint, summit: world.floor >= TOP_FLOOR });
    for (const platform of target.platforms) if (platform.lane !== lane) crumble(world, platform, target.floor);
    world.next = null;
    world.anim = null;
    float(world, "✓", true);
    if (world.floor >= TOP_FLOOR) {
      world.summit = true;
      world.question = null;
      world.endTimer = END_DELAY_S;
      events.push({ type: "summit" });
    } else {
      if (checkpoint) {
        // A checkpoint cools the lava: it drops back to a safe distance.
        world.lava = Math.min(world.lava, world.floor * FLOOR_H - LAVA_RESET);
        events.push({ type: "checkpoint", floor: world.floor });
      }
      spawnQuestion(world);
    }
  } else {
    // The wrong platform crumbles under the hero, who drops back down.
    crumble(world, target.platforms[lane], target.floor);
    target.platforms = target.platforms.filter((p) => p.lane !== lane);
    world.anim = {
      kind: "fall",
      t: 0,
      dur: FALL_S,
      lane: world.lane,
      from: { x: world.climber.x, h: world.climber.h },
      to: { x: LANE_X[world.lane], h: world.floor * FLOOR_H },
    };
    float(world, "✗", false);
  }
  world.hudVersion += 1;
}

/**
 * Advance the world by `dt` seconds.
 * @param {{action?: boolean, tap?: {x: number, y: number}, lane?: number}} input
 * @returns {Array<{type: string}>} "action", "answer", "crash", "checkpoint", "summit" and "over"
 */
export function step(world, dt, input = {}) {
  const events = [];
  if (world.phase === "over") return events;
  world.time += dt;
  for (const effect of world.effects) {
    effect.age += dt;
    if (effect.kind === "crumble") {
      effect.vy -= 900 * dt;
      effect.h += effect.vy * dt;
      effect.rot += dt * 3;
    }
  }
  world.effects = world.effects.filter((effect) => effect.age < (effect.kind === "crumble" ? 1.2 : 0.9));

  if (world.phase === "ready") {
    if (input.action) {
      world.phase = "play";
      spawnQuestion(world);
      events.push({ type: "action" });
    }
    return events;
  }

  // Move: a jump up, or a fall back after a crumbling platform.
  if (world.anim) {
    const anim = world.anim;
    anim.t = Math.min(anim.dur, anim.t + dt);
    const p = anim.t / anim.dur;
    world.climber.x = anim.from.x + (anim.to.x - anim.from.x) * p;
    world.climber.h = anim.from.h + (anim.to.h - anim.from.h) * p + (anim.kind === "jump" ? JUMP_ARC * 4 * p * (1 - p) : 0);
    if (anim.t >= anim.dur) {
      world.climber.x = anim.to.x;
      world.climber.h = anim.to.h;
      if (anim.kind === "jump") land(world, events);
      else {
        world.anim = null;
        // Same floor, a fresh question: the lava did not wait.
        spawnQuestion(world);
      }
    }
  } else if (world.next && !world.summit && (input.lane != null || input.tap)) {
    const lane = input.lane != null ? input.lane : laneAt(input.tap.x);
    if (world.next.platforms.some((p) => p.lane === lane)) {
      startJump(world, lane);
      events.push({ type: "action" });
    }
  }

  // The lava rises until the summit is reached.
  world.invulnerable = Math.max(0, world.invulnerable - dt);
  if (!world.summit) {
    world.lava += world.lavaSpeed * dt;
    if (world.lava >= world.climber.h - 2 && world.invulnerable === 0) {
      world.lives -= 1;
      world.invulnerable = INVULNERABLE_S;
      world.lava = world.floor * FLOOR_H - LAVA_RESET;
      events.push({ type: "crash" });
      world.hudVersion += 1;
    }
  }

  // The camera follows the hero up, smoothly.
  world.cam += (world.climber.h - world.cam) * Math.min(1, dt * 5);

  if (world.lives <= 0) {
    world.phase = "over";
    world.question = null;
    events.push({ type: "over" });
  } else if (world.endTimer != null) {
    world.endTimer -= dt;
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

const sy = (world, h) => BASE_Y - (h - world.cam);

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Bright toy-brick colours, one per lane.
const BRICKS = [
  ["#42a5f5", "#1565c0"],
  ["#ab47bc", "#6a1b9a"],
  ["#26a69a", "#00695c"],
];

/** A brick platform with studs on top, and optionally a label. */
function drawBrick(ctx, cx, y, [fill, edge], label = null, alpha = 1, w = PLATFORM_W) {
  ctx.globalAlpha = alpha;
  const left = cx - w / 2;
  ctx.fillStyle = fill;
  roundRect(ctx, left, y, w, PLATFORM_H, 5);
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Studs.
  ctx.fillStyle = fill;
  for (let sx = left + 12; sx < left + w - 6; sx += 19) {
    roundRect(ctx, sx - 5, y - 5, 10, 6, 2);
    ctx.fill();
    ctx.stroke();
  }
  if (label != null) {
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, label, cx, y + PLATFORM_H / 2 + 1, w - 12, 16, 9);
  }
  ctx.globalAlpha = 1;
}

/** The answer sign above a platform - big and readable, like a price tag. */
function drawSign(ctx, cx, y, label, dark, pop) {
  const w = PLATFORM_W - 6;
  const h = 34;
  const top = y - h - 14;
  ctx.save();
  ctx.translate(cx, top + h / 2);
  ctx.scale(pop, pop);
  ctx.fillStyle = dark ? "#fff8e1" : "#ffffff";
  ctx.strokeStyle = "#5d4037";
  ctx.lineWidth = 2.5;
  roundRect(ctx, -w / 2, -h / 2, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#3e2723";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fitText(ctx, label, 0, 1, w - 10, 20, 10);
  ctx.restore();
  // A little post down to the brick.
  ctx.fillStyle = "#8d6e63";
  ctx.fillRect(cx - 2, top + h, 4, 12);
}

function drawHero(ctx, x, feetY, world, colors) {
  if (world.invulnerable > 0 && Math.floor(world.time * 10) % 2 === 0) return;
  const airborne = !!world.anim;
  // Legs
  ctx.fillStyle = "#37474f";
  const spread = airborne ? 5 : 2;
  ctx.fillRect(x - 8 - spread / 2, feetY - 12, 7, 12);
  ctx.fillRect(x + 1 + spread / 2, feetY - 12, 7, 12);
  // Body and cape in the theme colour
  ctx.fillStyle = colors.accent;
  roundRect(ctx, x - 13, feetY - 34, 26, 24, 7);
  ctx.fill();
  ctx.strokeStyle = colors.accentDark;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Arms up while jumping
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 12, feetY - 28);
  ctx.lineTo(x - 19, feetY - (airborne ? 44 : 20));
  ctx.moveTo(x + 12, feetY - 28);
  ctx.lineTo(x + 19, feetY - (airborne ? 44 : 20));
  ctx.stroke();
  // Head: the equipped character on a light disc.
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.arc(x, feetY - 46, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `23px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.fillText(world.hero, x, feetY - 45);
}

function drawLava(ctx, world) {
  const top = sy(world, world.lava);
  if (top > HEIGHT + 20) return;
  // Heat glow above the surface.
  const glow = ctx.createLinearGradient(0, top - 70, 0, top);
  glow.addColorStop(0, "rgba(255,87,34,0)");
  glow.addColorStop(1, "rgba(255,87,34,0.45)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, top - 70, WIDTH, 70);
  // The lava itself, with a wobbling surface.
  const body = ctx.createLinearGradient(0, top, 0, HEIGHT);
  body.addColorStop(0, "#ffca28");
  body.addColorStop(0.18, "#ff7043");
  body.addColorStop(1, "#b71c1c");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, HEIGHT);
  for (let x = 0; x <= WIDTH; x += 12) {
    ctx.lineTo(x, top + Math.sin(x / 26 + world.time * 3) * 4);
  }
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.closePath();
  ctx.fill();
  // Bubbles
  ctx.fillStyle = "rgba(255,241,118,0.8)";
  for (let i = 0; i < 6; i++) {
    const bx = (i * 67 + 23) % WIDTH;
    const phase = (world.time * 0.8 + i * 0.37) % 1;
    const by = top + 18 + (1 - phase) * 40;
    if (by < HEIGHT) {
      ctx.beginPath();
      ctx.arc(bx, by, 3 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** A thermometer on the right: how close the lava is (full = right under you). */
function drawGauge(ctx, world) {
  const gap = Math.max(0, Math.min(1, 1 - lavaGap(world) / 2.4));
  const x = WIDTH - 16;
  const top = 64;
  const h = 150;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, x - 6, top, 12, h, 6);
  ctx.fill();
  const fill = h * gap;
  ctx.fillStyle = gap > 0.7 ? "#ff1744" : gap > 0.4 ? "#ff9100" : "#ffca28";
  roundRect(ctx, x - 4, top + h - fill, 8, Math.max(4, fill), 4);
  ctx.fill();
  ctx.font = `16px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🌋", x, top + h + 14);
}

export function draw(ctx, world, colors) {
  const dark = colors.dark;
  // The sky gets darker and starrier the higher the climb.
  const height = Math.min(1, world.cam / (TOP_FLOOR * FLOOR_H));
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, dark || height > 0.6 ? "#1a1446" : "#5c6bc0");
  sky.addColorStop(1, dark ? "#3a2150" : "#ffab91");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  for (let i = 0; i < 18; i++) {
    const x = (i * 97) % WIDTH;
    const y = (((i * 53 + world.cam * 0.3) % HEIGHT) + HEIGHT) % HEIGHT;
    ctx.fillRect(x, y, 2, 2);
  }

  // Tower walls on both sides, bricks scrolling with the climb.
  ctx.fillStyle = dark ? "#37474f" : "#78909c";
  ctx.fillRect(0, 0, 14, HEIGHT);
  ctx.fillRect(WIDTH - 32, 0, 32, HEIGHT);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1.5;
  const offset = ((world.cam % 24) + 24) % 24;
  for (let y = -24 + offset; y < HEIGHT; y += 24) {
    ctx.strokeRect(0, y, 14, 24);
    ctx.strokeRect(WIDTH - 32, y, 32, 24);
  }

  // The summit, visible from a few floors below.
  const summitY = sy(world, TOP_FLOOR * FLOOR_H);
  if (summitY > -60 && !world.summit) {
    ctx.fillStyle = "#ffd54f";
    roundRect(ctx, WIDTH / 2 - 120, summitY - 8, 240, 12, 5);
    ctx.fill();
    ctx.font = `26px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("🏆", WIDTH / 2, summitY - 12);
  }

  // The ground floor: a wide start pad.
  const groundY = sy(world, 0);
  if (groundY < HEIGHT + 30) drawBrick(ctx, WIDTH / 2 - 9, groundY, ["#8d6e63", "#4e342e"], null, 1, WIDTH - 60);

  // The path climbed so far.
  for (const step of world.path) {
    const y = sy(world, step.floor * FLOOR_H);
    if (y < -40 || y > HEIGHT + 40) continue;
    const colors = step.summit ? ["#ffd54f", "#f57f17"] : step.checkpoint ? ["#66bb6a", "#1b5e20"] : BRICKS[step.lane];
    drawBrick(ctx, LANE_X[step.lane], y, colors);
    if (step.checkpoint || step.summit) {
      // A flag on the checkpoint.
      const fx = LANE_X[step.lane] + PLATFORM_W / 2 - 14;
      ctx.strokeStyle = "#eceff1";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fx, y - 4);
      ctx.lineTo(fx, y - 44);
      ctx.stroke();
      ctx.fillStyle = step.summit ? "#ffd54f" : "#43a047";
      ctx.beginPath();
      ctx.moveTo(fx, y - 44);
      ctx.lineTo(fx - 20, y - 37);
      ctx.lineTo(fx, y - 30);
      ctx.closePath();
      ctx.fill();
    }
  }

  // The floor above: three answer platforms with their signs.
  if (world.next) {
    const y = sy(world, world.next.floor * FLOOR_H);
    for (const platform of world.next.platforms) {
      const age = world.time - platform.bornAt;
      const pop = Math.min(1, 0.6 + age * 2.5);
      drawBrick(ctx, LANE_X[platform.lane], y, BRICKS[platform.lane], null, Math.min(1, 0.3 + age * 3));
      drawSign(ctx, LANE_X[platform.lane], y, platform.option, dark, pop);
    }
  }

  // Crumbling bricks and floating marks.
  for (const effect of world.effects) {
    const y = sy(world, effect.h);
    if (effect.kind === "crumble") {
      ctx.save();
      ctx.translate(effect.x, y);
      ctx.rotate(effect.rot * 0.4);
      ctx.globalAlpha = Math.max(0, 1 - effect.age / 1.2);
      ctx.fillStyle = "#8d6e63";
      for (let i = 0; i < 4; i++) ctx.fillRect(-PLATFORM_W / 2 + i * 26, i % 2 ? 4 : -4, 22, 14);
      ctx.restore();
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = Math.max(0, 1 - effect.age / 0.9);
      ctx.fillStyle = effect.good ? "#69f0ae" : "#ff5252";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `900 32px "Baloo 2", system-ui, sans-serif`;
      ctx.fillText(effect.text, effect.x, y - effect.age * 40);
      ctx.globalAlpha = 1;
    }
  }

  drawHero(ctx, world.climber.x, sy(world, world.climber.h), world, colors);
  drawLava(ctx, world);
  if (world.phase === "play") drawGauge(ctx, world);

  // The floor counter, top left.
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  roundRect(ctx, 20, 12, 112, 30, 12);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `800 17px "Baloo 2", system-ui, sans-serif`;
  ctx.fillText(`🧱 ${world.floor}/${TOP_FLOOR}`, 30, 28);

  if (world.phase === "ready") {
    ctx.fillStyle = dark ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.75)";
    roundRect(ctx, 34, 150, WIDTH - 68, 60, 16);
    ctx.fill();
    ctx.fillStyle = dark ? "#fff" : "#3e2723";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, world.readyText, WIDTH / 2, 180, WIDTH - 90, 24);
  }
  if (world.summit) {
    ctx.fillStyle = "rgba(255,213,79,0.25)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

/** Keys: 1/2/3, a/s/d or the arrows pick a platform; space starts. */
export function keyInput(key) {
  const lanes = { 1: 0, 2: 1, 3: 2, a: 0, s: 1, d: 2, ArrowLeft: 0, ArrowUp: 1, ArrowDown: 1, ArrowRight: 2 };
  if (key in lanes) return { lane: lanes[key] };
  return key === " " || key === "Enter" ? {} : null;
}

export const render = arcadeGame({
  gameKey: GAME_KEY,
  emoji: "🌋",
  width: WIDTH,
  height: HEIGHT,
  maxWidth: 420,
  createWorld,
  step,
  draw,
  keyInput,
  result: (world) =>
    world.summit
      ? { icon: "🏆", key: "toren.result_top", vars: {}, feat: "toren_top", good: true }
      : { icon: "🌋", key: "toren.result_floor", vars: { floor: world.floor, top: TOP_FLOOR }, good: world.floor >= 6 },
});
