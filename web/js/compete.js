/**
 * Competition Mode - the engine, with no DOM in it.
 *
 * The app is a static site with nowhere to run a server (see SESSIONS.md,
 * session 6: "no server, no third party" was the whole point of moving to
 * GitHub Pages). That rules out a classic realtime multiplayer backend - no
 * websocket relay, no matchmaking service, no account system - so "compete
 * with someone on the other side of the world" has to mean something a
 * static host can actually do.
 *
 * The trick used here: a race is just data. `newRace()` builds one (a level
 * and a list of questions), each player who takes it appends their own
 * result, and the whole thing round-trips through a short URL-safe code -
 * `encodeChallenge()` / `decodeChallenge()`. Sending that code *is* sending
 * the invite: paste it in a text, an email, a chat, AirDrop it, whatever -
 * no account, no server, no third party ever sees it. The same object also
 * works with zero networking at all: pass the device around the table and
 * call `makeParticipant()` again for each player, which is what the "local
 * party" mode in the page does.
 *
 * Questions are transmitted as `[a, b, op]` triples rather than as rendered
 * text/answer/options: it is the smallest possible encoding, the answer and
 * the display string are both pure functions of the triple
 * (`questionAnswer` / `questionText`), and there is nothing in a triple that
 * needs escaping. `decodeChallenge` never trusts what it is given - a code
 * can be hand-edited or simply corrupted in transit - so every field is
 * range-checked before anything derived from it reaches the page.
 */

import { choice, randInt } from "./rng.js";

export const RACE_SECONDS = 15; // per question, exactly what was asked for
export const RACE_LENGTH = 8;
export const MAX_QUESTIONS = 20; // decode() bound, not a knob a player sees
export const MAX_PARTICIPANTS = 12; // keeps a forwarded chain's code a sane length
export const MAX_NAME_LENGTH = 24;
export const MAX_LEVEL = 5;

export const RACE_MAX_POINTS = 100; // answered instantly
export const RACE_MIN_POINTS = 10; // answered correctly right at the buzzer
const MAX_OPERAND = 999;
const MAX_PRODUCT = 5000; // keeps a hostile/corrupt code from asking "483 x 917"

const OPERATORS = ["+", "-", "x", ":"];

// ---------------------------------------------------------------------------
// Question generation (host side - never has to be reproduced, only shipped)
// ---------------------------------------------------------------------------

function clampLevel(level) {
  const n = Math.round(Number(level));
  return Math.max(0, Math.min(MAX_LEVEL, Number.isFinite(n) ? n : 0));
}

/**
 * Operand ranges per level. Typed answers rather than Bliksemronde's
 * multiple choice, so there are no distractors to generate - just a range
 * per operator, growing the way every other game's levels do.
 */
function levelRanges(level) {
  const table = [
    { ops: ["+", "-"], add: [1, 10] },
    { ops: ["+", "-", "x"], add: [2, 15], mul: [2, 6] },
    { ops: ["+", "-", "x"], add: [5, 25], mul: [3, 9] },
    { ops: ["+", "-", "x", ":"], add: [10, 40], mul: [3, 12], div: [2, 9] },
    { ops: ["+", "-", "x", ":"], add: [15, 60], mul: [4, 15], div: [3, 11] },
    { ops: ["+", "-", "x", ":"], add: [30, 99], mul: [6, 20], div: [4, 13] },
  ];
  return table[clampLevel(level)];
}

function generateTriple(level) {
  const r = levelRanges(level);
  const op = choice(r.ops);
  if (op === "+") return [randInt(...r.add), randInt(...r.add), "+"];
  if (op === "-") {
    let a = randInt(...r.add);
    let b = randInt(...r.add);
    if (a < b) [a, b] = [b, a];
    return [a, b, "-"];
  }
  if (op === "x") return [randInt(...r.mul), randInt(...r.mul), "x"];
  // ":" - a is the quotient (the actual answer), b the divisor; the question
  // shown is their product divided by b, so the result is always a whole
  // number without needing to reverse-engineer one.
  return [randInt(...r.div), randInt(...r.div), ":"];
}

export function generateRaceQuestions(level, count = RACE_LENGTH) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(generateTriple(level));
  return out;
}

// ---------------------------------------------------------------------------
// Pure question helpers - work identically whether the triple was just
// generated or arrived over the wire in a decoded challenge.
// ---------------------------------------------------------------------------

export function questionAnswer(a, b, op) {
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "x") return a * b;
  return a; // ":"
}

export function questionText(a, b, op) {
  if (op === "+") return `${a} + ${b}`;
  if (op === "-") return `${a} − ${b}`;
  if (op === "x") return `${a} × ${b}`;
  return `${a * b} : ${b}`;
}

function isValidTriple(triple) {
  if (!Array.isArray(triple) || triple.length !== 3) return false;
  const [a, b, op] = triple;
  if (!Number.isInteger(a) || !Number.isInteger(b)) return false;
  if (a < 0 || a > MAX_OPERAND || b < 0 || b > MAX_OPERAND) return false;
  if (!OPERATORS.includes(op)) return false;
  if (op === ":" && b < 1) return false;
  if ((op === "x" || op === ":") && a * b > MAX_PRODUCT) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Scoring - the whole point: faster is worth more, wrong is worth nothing.
// ---------------------------------------------------------------------------

/**
 * @param {boolean} isCorrect
 * @param {number} elapsedMs  time from the question appearing to the answer
 * @returns {number} 0 for a wrong or timed-out answer; otherwise a score
 *   that falls linearly from RACE_MAX_POINTS (answered instantly) down to
 *   RACE_MIN_POINTS (answered correctly right as the clock hit zero) - never
 *   fully zero for a correct answer, so only *being wrong* costs everything.
 */
export function racePoints(isCorrect, elapsedMs) {
  if (!isCorrect) return 0;
  const seconds = Math.max(0, Math.min(RACE_SECONDS, elapsedMs / 1000));
  const fraction = 1 - seconds / RACE_SECONDS;
  return Math.round(RACE_MIN_POINTS + (RACE_MAX_POINTS - RACE_MIN_POINTS) * fraction);
}

// ---------------------------------------------------------------------------
// The race object - {v, q, lv, p} - and its participants.
// ---------------------------------------------------------------------------

export function newRace(level, count = RACE_LENGTH) {
  return { v: 1, q: generateRaceQuestions(level, count), lv: clampLevel(level), p: [] };
}

/**
 * Turn one player's answers into the compact participant record the race
 * object carries. `results` is `[{isCorrect, elapsedMs, points}, ...]`, one
 * per question, in order.
 */
export function makeParticipant(name, results) {
  const n = String(name ?? "").trim().slice(0, MAX_NAME_LENGTH) || "Player";
  const r = results.map(({ isCorrect, elapsedMs, points }) => [
    isCorrect ? 1 : 0,
    Math.max(0, Math.round(elapsedMs)),
    Math.max(0, Math.round(points)),
  ]);
  const t = r.reduce((sum, row) => sum + row[2], 0);
  return { n, r, t };
}

/** Ranked standings, highest score first; ties go to whoever set it first. */
export function rankParticipants(participants) {
  return participants
    .map((participant, index) => ({ participant, index }))
    .sort((a, b) => b.participant.t - a.participant.t || a.index - b.index)
    .map(({ participant, index }, i) => ({ ...participant, index, rank: i + 1 }));
}

/** Per question, who answered it correctly the fastest (or null). */
export function fastestPerQuestion(race) {
  return race.q.map((_, qi) => {
    let best = null;
    race.p.forEach((participant, pi) => {
      const row = participant.r[qi];
      if (!row) return;
      const [correct, ms] = row;
      if (correct && (best === null || ms < best.ms)) best = { participantIndex: pi, ms };
    });
    return best;
  });
}

// ---------------------------------------------------------------------------
// Sharing - a race round-trips through a URL-safe string with nothing but
// the browser's own base64 and no server ever in the loop.
// ---------------------------------------------------------------------------

function toBase64Url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeChallenge(race) {
  const bytes = new TextEncoder().encode(JSON.stringify(race));
  return toBase64Url(bytes);
}

/**
 * Decode and *validate* a challenge code. Untrusted input by construction -
 * it travels through a URL or gets pasted in by hand - so nothing here is
 * assumed: a malformed or hand-edited code returns null rather than handing
 * the page a race object with, say, a 4-billion-millisecond answer time or
 * a question array a screen can't render.
 */
export function decodeChallenge(code) {
  if (typeof code !== "string" || !code.trim()) return null;
  let data;
  try {
    const bytes = fromBase64Url(code.trim());
    data = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  return sanitizeRace(data);
}

function sanitizeRace(data) {
  if (!data || typeof data !== "object" || data.v !== 1) return null;
  if (!Array.isArray(data.q) || data.q.length < 1 || data.q.length > MAX_QUESTIONS) return null;

  const q = [];
  for (const triple of data.q) {
    if (!isValidTriple(triple)) return null;
    q.push([triple[0], triple[1], triple[2]]);
  }

  const lv = clampLevel(data.lv);
  const rawParticipants = Array.isArray(data.p) ? data.p : [];
  if (rawParticipants.length > MAX_PARTICIPANTS) return null;

  const p = [];
  for (const entry of rawParticipants) {
    if (!entry || typeof entry !== "object" || typeof entry.n !== "string") return null;
    if (!Array.isArray(entry.r) || entry.r.length !== q.length) return null;

    const r = [];
    for (const row of entry.r) {
      if (!Array.isArray(row) || row.length !== 3) return null;
      const [correct, ms, pts] = row;
      if (correct !== 0 && correct !== 1) return null;
      if (!Number.isFinite(ms) || ms < 0 || ms > RACE_SECONDS * 1000 + 2000) return null;
      if (!Number.isFinite(pts) || pts < 0 || pts > RACE_MAX_POINTS) return null;
      r.push([correct, Math.round(ms), Math.round(pts)]);
    }
    const fallbackTotal = r.reduce((sum, row) => sum + row[2], 0);
    const t = Number.isFinite(entry.t) ? Math.max(0, Math.round(entry.t)) : fallbackTotal;
    p.push({ n: entry.n.trim().slice(0, MAX_NAME_LENGTH) || "Player", r, t });
  }

  return { v: 1, q, lv, p };
}

/** Pull `?c=<code>` out of a raw `location.hash` string, or null. */
export function extractChallengeCode(hash) {
  const qIndex = String(hash ?? "").indexOf("?");
  if (qIndex === -1) return null;
  return new URLSearchParams(hash.slice(qIndex + 1)).get("c");
}

/** A shareable absolute URL for this challenge, built off the current page. */
export function buildChallengeUrl(baseHref, code) {
  const url = new URL(baseHref);
  url.hash = `/compete?c=${code}`;
  return url.toString();
}
