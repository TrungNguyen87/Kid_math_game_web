/**
 * Turbokart / Turbo Kart (round 19) - a kart race in the spirit of the
 * classic kart racers, where every gate across the road is a question.
 *
 * The kart drives by itself; the child steers between three lanes (tap the
 * lane you want, or use the arrow keys). Each gate is three boost pads with
 * an answer on each: drive over the right one for a turbo boost, over a
 * wrong one and you splash into mud and slow down. From level 1 a banana
 * peel lies somewhere between two gates - steer round it or spin out. Three
 * right answers in a row earn a star: a few seconds of extra speed with
 * bananas bouncing off.
 *
 * Three computer karts race along. They never steer or answer; they simply
 * drive at their own speed, set so that answering everything right wins
 * the race, most right is a podium, and mostly wrong finishes last - the
 * place is a readable summary of how the run went. There are no lives: the
 * race always ends at the finish line after twelve gates.
 *
 * The road is drawn in pseudo-3D (one perspective divide per strip), but the
 * world is one-dimensional: positions along the track plus a lane. As in
 * the other arcade games, step() is a pure function of (world, dt, input),
 * and tests/web/test_arcade.mjs races it with an autopilot.
 */
import { QUESTIONS_PER_RUN, arcadeGame, fitText } from "../arcade.js";

const GAME_KEY = "kart";

export const WIDTH = 400;
export const HEIGHT = 460;
const HORIZON = 150;
/** Base speed in metres per second. */
export const BASE_SPEED = 30;
/** Lateral lane centres, in road half-widths. */
export const LANES = [-0.62, 0, 0.62];
const STEER_SPEED = 4.2;
/** Seconds between two gates at the base speed: more reading time at the low levels. */
export const readingTime = (level) => [9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5][Math.max(0, Math.min(7, level))];
export const gapFor = (level) => BASE_SPEED * readingTime(level);
const START_RUN = 150;
const VIEW = 230;
const CAM_BACK = 6;
const PERSPECTIVE = 25;
/** How much faster (or slower) each computer kart is than the base speed. */
export const RIVALS = [
  { factor: 1.06, emoji: "🐙", color: "#7e57c2" },
  { factor: 1.02, emoji: "🦊", color: "#fb8c00" },
  { factor: 0.96, emoji: "🐢", color: "#43a047" },
];
export const STAR_STREAK = 3;
const END_DELAY_S = 1.6;

export function createWorld({ level = 0, nextQuestion, maxQuestions = QUESTIONS_PER_RUN, hero = "🧑", readyText = "👆", lang = "nl" }) {
  const gap = gapFor(level);
  const read = readingTime(level);
  return {
    level,
    gap,
    // Effects last a share of the time between gates, so a boost is worth
    // the same at every level.
    boostS: 0.18 * read,
    mudS: 0.13 * read,
    spinS: 1.0,
    starS: 0.45 * read,
    phase: "ready",
    pos: 0,
    speed: 0,
    lane: 1,
    x: LANES[1],
    boost: 0,
    mud: 0,
    spin: 0,
    star: 0,
    streak: 0,
    gates: [],
    bananas: [],
    rivals: RIVALS.map((r, i) => ({ ...r, pos: 0, x: LANES[i], wobble: i * 1.7 })),
    finishAt: START_RUN + (maxQuestions - 1) * gap + gap * 0.6,
    maxQuestions,
    spawned: 0,
    resolved: 0,
    question: null,
    nextQuestion,
    hero,
    readyText,
    speedUnit: lang === "en" ? "km/h" : "km/u",
    time: 0,
    finished: false,
    place: null,
    endTimer: null,
    effects: [],
    hudVersion: 0,
  };
}

function spawnGate(world) {
  const question = world.nextQuestion();
  const d = START_RUN + world.spawned * world.gap;
  world.gates.push({ d, question, answerIndex: question.options.indexOf(question.answer), resolved: false, picked: null });
  // From level 1 a banana lies halfway to the next gate, in a random lane.
  if (world.level >= 1 && world.spawned < world.maxQuestions - 1) {
    world.bananas.push({ d: d + world.gap / 2, lane: Math.floor(Math.random() * 3), hit: false });
  }
  world.spawned += 1;
}

function upcoming(world) {
  return world.gates.find((gate) => !gate.resolved) ?? null;
}

/** The lane the kart is closest to right now. */
export function currentLane(world) {
  let best = 0;
  for (let i = 1; i < LANES.length; i++) if (Math.abs(world.x - LANES[i]) < Math.abs(world.x - LANES[best])) best = i;
  return best;
}

/** 1 + how many computer karts are ahead. */
export function placeOf(world) {
  return 1 + world.rivals.filter((r) => r.pos > world.pos).length;
}

function targetSpeed(world) {
  if (world.finished) return BASE_SPEED * 0.4;
  let factor = 1;
  if (world.spin > 0) factor = 0.3;
  else if (world.mud > 0) factor = 0.6;
  else if (world.boost > 0) factor = 1.45;
  if (world.star > 0 && world.spin <= 0) factor = Math.max(factor, 1.3);
  return BASE_SPEED * factor;
}

/**
 * Advance the world by `dt` seconds.
 * @param {{action?: boolean, tap?: {x: number}, steer?: number, lane?: number}} input
 * @returns {Array<{type: string}>} "action", "answer", "crash", "powerup", "finish", "over"
 */
export function step(world, dt, input = {}) {
  const events = [];
  if (world.phase === "over") return events;
  world.time += dt;
  for (const effect of world.effects) effect.age += dt;
  world.effects = world.effects.filter((effect) => effect.age < 1);

  if (world.phase === "ready") {
    if (input.action) {
      world.phase = "play";
      // Every gate exists from the start: the question for the first one is
      // up while the kart is still getting going.
      while (world.spawned < world.maxQuestions) spawnGate(world);
      world.question = upcoming(world)?.question ?? null;
      world.hudVersion += 1;
      events.push({ type: "action" });
    }
    return events;
  }

  // Steering: tap a lane (the thirds of the screen), or step left/right.
  if (!world.finished) {
    let lane = world.lane;
    if (input.lane != null) lane = input.lane;
    else if (input.steer) lane += Math.sign(input.steer);
    else if (input.tap) lane = input.tap.x < WIDTH / 3 ? 0 : input.tap.x < (2 * WIDTH) / 3 ? 1 : 2;
    lane = Math.max(0, Math.min(2, lane));
    if (lane !== world.lane) {
      world.lane = lane;
      events.push({ type: "action" });
    }
  }
  const tx = LANES[world.lane];
  const dx = tx - world.x;
  const move = STEER_SPEED * dt * (world.spin > 0 ? 0.3 : 1);
  world.x = Math.abs(dx) <= move ? tx : world.x + Math.sign(dx) * move;

  // Speed eases towards what the kart is doing now.
  for (const key of ["boost", "mud", "spin", "star"]) world[key] = Math.max(0, world[key] - dt);
  const target = targetSpeed(world);
  const rate = target > world.speed ? 2.2 : 3.5;
  world.speed += (target - world.speed) * Math.min(1, dt * rate);
  const before = world.pos;
  world.pos += world.speed * dt;

  for (const rival of world.rivals) {
    const cruise = BASE_SPEED * rival.factor;
    // They pull away from the start line over a couple of seconds too.
    rival.speed = (rival.speed ?? 0) + (cruise - (rival.speed ?? 0)) * Math.min(1, dt * 2.2);
    rival.pos += rival.speed * dt;
    rival.x = LANES[1] + Math.sin(world.time * 0.6 + rival.wobble) * 0.55;
  }

  // Gates: the pad under the kart when it crosses the line is the answer.
  for (const gate of world.gates) {
    if (gate.resolved || gate.d > world.pos) continue;
    gate.resolved = true;
    const lane = currentLane(world);
    gate.picked = lane;
    world.resolved += 1;
    const isCorrect = lane === gate.answerIndex;
    events.push({ type: "answer", correct: isCorrect, question: gate.question, picked: gate.question.options[lane] });
    if (isCorrect) {
      world.boost = world.boostS;
      world.mud = 0;
      world.streak += 1;
      world.effects.push({ kind: "text", text: "TURBO!", good: true, age: 0 });
      if (world.streak % STAR_STREAK === 0) {
        world.star = world.starS;
        world.effects.push({ kind: "text", text: "⭐", good: true, age: 0 });
        events.push({ type: "powerup" });
      }
    } else {
      world.mud = world.mudS;
      world.boost = 0;
      world.streak = 0;
      world.effects.push({ kind: "text", text: "💦", good: false, age: 0 });
    }
    world.hudVersion += 1;
  }

  // Bananas: in the kart's lane when it drives over one.
  for (const banana of world.bananas) {
    if (banana.hit || banana.d > world.pos || banana.d <= before) continue;
    if (Math.abs(world.x - LANES[banana.lane]) < 0.33) {
      banana.hit = true;
      if (world.star > 0) {
        world.effects.push({ kind: "text", text: "⭐", good: true, age: 0 });
      } else {
        world.spin = world.spinS;
        world.boost = 0;
        world.effects.push({ kind: "text", text: "🍌", good: false, age: 0 });
        events.push({ type: "crash" });
      }
    }
  }

  const next = upcoming(world)?.question ?? null;
  if (next !== world.question) {
    world.question = next;
    world.hudVersion += 1;
  }

  // Place is live; it is fixed the moment the kart crosses the finish.
  const place = world.finished ? world.place : placeOf(world);
  if (place !== world.shownPlace) {
    world.shownPlace = place;
    world.hudVersion += 1;
  }
  if (!world.finished && world.pos >= world.finishAt) {
    world.finished = true;
    world.place = placeOf(world);
    world.shownPlace = world.place;
    world.endTimer = END_DELAY_S;
    world.hudVersion += 1;
    events.push({ type: "finish", place: world.place });
  } else if (world.finished) {
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

/** Perspective for a point `dz` metres in front of the camera: 1 at the camera, 0 at the horizon. */
const persp = (dz) => PERSPECTIVE / (PERSPECTIVE + Math.max(0, dz));
const screenY = (p) => HORIZON + (HEIGHT - HORIZON) * p;
const ROAD_HALF = 270;
const screenX = (lateral, p) => WIDTH / 2 + lateral * ROAD_HALF * p;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function quad(ctx, x1, y1, w1, x2, y2, w2, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1 - w1, y1);
  ctx.lineTo(x1 + w1, y1);
  ctx.lineTo(x2 + w2, y2);
  ctx.lineTo(x2 - w2, y2);
  ctx.closePath();
  ctx.fill();
}

function drawRoad(ctx, world, dark) {
  const cam = world.pos - CAM_BACK;
  const SEG = 6;
  const first = Math.floor(cam / SEG) * SEG;
  for (let d = first + Math.ceil(VIEW / SEG) * SEG; d >= first; d -= SEG) {
    const near = Math.max(0, d - cam);
    const far = d + SEG - cam;
    if (far <= 0) continue;
    const p1 = persp(near);
    const p2 = persp(far);
    const y1 = screenY(p1);
    const y2 = screenY(p2);
    const stripe = Math.floor(d / SEG) % 2 === 0;
    // Grass, kerb, road, lane marks.
    ctx.fillStyle = stripe ? (dark ? "#1b5e20" : "#7cb342") : dark ? "#2e7d32" : "#8bc34a";
    ctx.fillRect(0, y2, WIDTH, y1 - y2 + 1);
    quad(ctx, WIDTH / 2, y1, ROAD_HALF * p1 * 1.12, WIDTH / 2, y2, ROAD_HALF * p2 * 1.12, stripe ? "#e53935" : "#fafafa");
    quad(ctx, WIDTH / 2, y1, ROAD_HALF * p1, WIDTH / 2, y2, ROAD_HALF * p2, dark ? (stripe ? "#424242" : "#484848") : stripe ? "#757575" : "#7d7d7d");
    if (stripe) {
      for (const edge of [-0.31, 0.31]) {
        quad(ctx, screenX(edge, p1), y1, 3.5 * p1, screenX(edge, p2), y2, 3.5 * p2, "rgba(255,255,255,0.8)");
      }
    }
  }
  // The finish line, chequered.
  const fz = world.finishAt - cam;
  if (fz > 0 && fz < VIEW) {
    const p1 = persp(fz);
    const p2 = persp(fz + 4);
    const cells = 10;
    for (let i = 0; i < cells; i++) {
      const l1 = -1 + (2 * i) / cells;
      const l2 = -1 + (2 * (i + 1)) / cells;
      for (let row = 0; row < 2; row++) {
        const pa = row === 0 ? p1 : persp(fz + 2);
        const pb = row === 0 ? persp(fz + 2) : p2;
        ctx.fillStyle = (i + row) % 2 ? "#212121" : "#fafafa";
        ctx.beginPath();
        ctx.moveTo(screenX(l1, pa), screenY(pa));
        ctx.lineTo(screenX(l2, pa), screenY(pa));
        ctx.lineTo(screenX(l2, pb), screenY(pb));
        ctx.lineTo(screenX(l1, pb), screenY(pb));
        ctx.closePath();
        ctx.fill();
      }
    }
    // The arch over it.
    const top = screenY(p1) - 120 * p1;
    ctx.fillStyle = "#e53935";
    ctx.fillRect(screenX(-1.15, p1) - 6 * p1, top, 12 * p1, screenY(p1) - top);
    ctx.fillRect(screenX(1.15, p1) - 6 * p1, top, 12 * p1, screenY(p1) - top);
    ctx.fillRect(screenX(-1.15, p1), top, screenX(1.15, p1) - screenX(-1.15, p1), 24 * p1);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${Math.max(8, 20 * p1)}px "Baloo 2", system-ui, sans-serif`;
    ctx.fillText("FINISH", WIDTH / 2, top + 12 * p1);
  }
}

function drawScenery(ctx, world, dark) {
  // Roadside trees every 40 m, alternating sides, far to near.
  const cam = world.pos - CAM_BACK;
  const first = Math.ceil(cam / 40) * 40;
  for (let d = first + 240; d >= first; d -= 40) {
    const dz = d - cam;
    if (dz <= 1 || dz > VIEW) continue;
    const p = persp(dz);
    for (const side of [-1, 1]) {
      const x = screenX(side * (1.5 + ((d / 40) % 3) * 0.25), p);
      const y = screenY(p);
      const s = p * 1.3;
      ctx.fillStyle = "#6d4c41";
      ctx.fillRect(x - 4 * s, y - 26 * s, 8 * s, 26 * s);
      ctx.fillStyle = dark ? "#1b5e20" : (d / 40) % 2 ? "#2e7d32" : "#388e3c";
      ctx.beginPath();
      ctx.moveTo(x, y - 90 * s);
      ctx.lineTo(x - 30 * s, y - 22 * s);
      ctx.lineTo(x + 30 * s, y - 22 * s);
      ctx.closePath();
      ctx.fill();
    }
  }
}

const PAD_COLORS = ["#29b6f6", "#ffca28", "#ec407a"];

function drawGate(ctx, world, gate, dark) {
  const dz = gate.d - (world.pos - CAM_BACK);
  if (dz <= 0 || dz > VIEW) return;
  const p1 = persp(dz);
  const p2 = persp(dz + 7);
  gate.question.options.forEach((option, i) => {
    const lane = LANES[i];
    let color = PAD_COLORS[i];
    if (gate.resolved) color = i === gate.answerIndex ? "#66bb6a" : i === gate.picked ? "#795548" : "rgba(120,120,120,0.6)";
    // The pad: a flat strip across the lane with a chevron.
    const half = 0.27;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(screenX(lane - half, p1), screenY(p1));
    ctx.lineTo(screenX(lane + half, p1), screenY(p1));
    ctx.lineTo(screenX(lane + half, p2), screenY(p2));
    ctx.lineTo(screenX(lane - half, p2), screenY(p2));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.moveTo(screenX(lane - 0.12, p1), screenY(p1));
    ctx.lineTo(screenX(lane, p2), screenY(p2));
    ctx.lineTo(screenX(lane + 0.12, p1), screenY(p1));
    ctx.closePath();
    ctx.fill();
    if (gate.resolved) return;
    // The answer on a sign above the pad.
    const w = 150 * p1;
    const h = 44 * p1;
    const cx = screenX(lane, p1);
    const top = screenY(p1) - 70 * p1;
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(cx - 2 * p1, top + h, 4 * p1, screenY(p1) - top - h);
    ctx.fillStyle = dark ? "#fff8e1" : "#ffffff";
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, 4 * p1);
    roundRect(ctx, cx - w / 2, top, w, h, 10 * p1);
    ctx.fill();
    ctx.stroke();
    if (p1 > 0.16) {
      ctx.fillStyle = "#3e2723";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      fitText(ctx, option, cx, top + h / 2 + 1, w - 8 * p1, Math.max(9, Math.round(30 * p1)), 7);
    }
  });
}

function drawBanana(ctx, world, banana) {
  if (banana.hit) return;
  const dz = banana.d - (world.pos - CAM_BACK);
  if (dz <= 0 || dz > VIEW) return;
  const p = persp(dz);
  ctx.font = `${Math.max(8, 44 * p)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("🍌", screenX(LANES[banana.lane], p), screenY(p));
}

function drawKart(ctx, x, y, s, body, driver, { flames = false, star = false, spin = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (spin) ctx.rotate(Math.sin(spin * 18) * 0.5);
  if (star) {
    ctx.fillStyle = "rgba(255,235,59,0.45)";
    ctx.beginPath();
    ctx.ellipse(0, -22, 60, 42, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (flames) {
    ctx.fillStyle = "#ff9100";
    for (const fx of [-20, 20]) {
      ctx.beginPath();
      ctx.moveTo(fx - 7, 2);
      ctx.lineTo(fx, 22 + Math.random() * 10);
      ctx.lineTo(fx + 7, 2);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Wheels
  ctx.fillStyle = "#212121";
  roundRect(ctx, -44, -18, 16, 22, 5);
  ctx.fill();
  roundRect(ctx, 28, -18, 16, 22, 5);
  ctx.fill();
  // Body
  ctx.fillStyle = body;
  roundRect(ctx, -34, -30, 68, 30, 10);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  roundRect(ctx, -34, -8, 68, 8, 4);
  ctx.fill();
  // Driver's head: an emoji on a light disc.
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.arc(0, -40, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `24px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.fillText(driver, 0, -39);
  ctx.restore();
}

export function draw(ctx, world, colors) {
  const dark = colors.dark;
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, dark ? "#0d1b3e" : "#4fc3f7");
  sky.addColorStop(1, dark ? "#283593" : "#e1f5fe");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HORIZON + 1);
  // Mountains, drifting a little with the distance travelled.
  ctx.fillStyle = dark ? "#1a237e" : "#90a4ae";
  const drift = (world.pos * 0.05) % 160;
  for (let i = -1; i < 5; i++) {
    const mx = i * 160 - drift;
    ctx.beginPath();
    ctx.moveTo(mx, HORIZON);
    ctx.lineTo(mx + 80, HORIZON - 60 - (i % 2) * 22);
    ctx.lineTo(mx + 160, HORIZON);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = dark ? "#fff9c4" : "#fff176";
  ctx.beginPath();
  ctx.arc(WIDTH - 70, 52, 20, 0, Math.PI * 2);
  ctx.fill();

  drawRoad(ctx, world, dark);
  drawScenery(ctx, world, dark);

  // Far to near: gates, bananas, the rivals ahead.
  const cam = world.pos - CAM_BACK;
  const things = [
    ...world.gates.map((gate) => ({ d: gate.d, draw: () => drawGate(ctx, world, gate, dark) })),
    ...world.bananas.map((banana) => ({ d: banana.d, draw: () => drawBanana(ctx, world, banana) })),
    ...world.rivals.map((rival) => ({
      d: rival.pos,
      draw: () => {
        const dz = rival.pos - cam;
        if (dz <= CAM_BACK * 0.6 || dz > VIEW) return;
        const p = persp(dz);
        drawKart(ctx, screenX(rival.x, p), screenY(p), p * 1.24, rival.color, rival.emoji);
      },
    })),
  ].sort((a, b) => b.d - a.d);
  for (const thing of things) thing.draw();

  // The player's kart, a little in front of the camera.
  const p = persp(CAM_BACK);
  drawKart(ctx, screenX(world.x, p), screenY(p), p * 1.24, colors.accent, world.hero, {
    flames: world.boost > 0 || world.star > 0,
    star: world.star > 0,
    spin: world.spin > 0 ? world.spin : 0,
  });

  // Effects float up from the kart.
  for (const effect of world.effects) {
    ctx.globalAlpha = Math.max(0, 1 - effect.age);
    ctx.fillStyle = effect.good ? "#ffeb3b" : "#ffccbc";
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 4;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 30px "Baloo 2", system-ui, sans-serif`;
    const y = screenY(p) - 90 - effect.age * 50;
    ctx.strokeText(effect.text, screenX(world.x, p), y);
    ctx.fillText(effect.text, screenX(world.x, p), y);
    ctx.globalAlpha = 1;
  }

  // Place and speed, top left, in a pill as wide as its text.
  ctx.font = `800 18px "Baloo 2", system-ui, sans-serif`;
  const place = world.shownPlace ?? placeOf(world);
  const label = `🏁 ${place}/4 · ${Math.round(world.speed * 3.6)} ${world.speedUnit}`;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  roundRect(ctx, 10, 10, ctx.measureText(label).width + 22, 34, 12);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 20, 28);

  if (world.phase === "ready") {
    ctx.fillStyle = dark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.8)";
    roundRect(ctx, 40, 190, WIDTH - 80, 60, 16);
    ctx.fill();
    ctx.fillStyle = dark ? "#fff" : "#3e2723";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, world.readyText, WIDTH / 2, 220, WIDTH - 100, 24);
  }
}

/** Keys: the arrows (or a/d) steer one lane, 1/2/3 pick a lane, space starts. */
export function keyInput(key) {
  if (key === "ArrowLeft" || key === "a") return { steer: -1 };
  if (key === "ArrowRight" || key === "d") return { steer: 1 };
  const lanes = { 1: 0, 2: 1, 3: 2 };
  if (key in lanes) return { lane: lanes[key] };
  return key === " " || key === "Enter" || key === "ArrowUp" ? {} : null;
}

export const render = arcadeGame({
  gameKey: GAME_KEY,
  emoji: "🏎️",
  width: WIDTH,
  height: HEIGHT,
  maxWidth: 520,
  createWorld,
  step,
  draw,
  keyInput,
  lives: false,
  hudExtra: (world) => (world.phase === "play" ? [`🏁 ${world.shownPlace ?? placeOf(world)}/4`] : []),
  result: (world) => {
    const place = world.place ?? placeOf(world);
    const medal = ["🥇", "🥈", "🥉", "🏁"][place - 1] ?? "🏁";
    return {
      icon: medal,
      key: `kart.result_${place}`,
      vars: {},
      feat: place === 1 ? "kart_first" : null,
      good: place <= 3,
    };
  },
});
