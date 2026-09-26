/**
 * Pretparkbaas / Park Tycoon (round 19) - build your own theme park, one
 * attraction at a time, with money maths.
 *
 * In the spirit of the tycoon games children build in block worlds: a park
 * that stays, grows, and is theirs. Every "day" eight visitors come to the
 * gate, each with a question about money, time or numbers in the park
 * (change from a tenner, a family ticket, rides per hour, a discount, the
 * profit of the ice-cream stall, how many days until the rollercoaster has
 * paid for itself). A right answer is a happy visitor who pays park money;
 * a wrong one gets the sum worked out on screen - that explanation is the
 * micro-lesson, and it uses the numbers of the question just asked.
 *
 * Park money (💰) is the park's own money, never the reward shop's coins:
 * the shop's coins still come only from points, through the same
 * level-replay guard as every other game. The park is built with it:
 * twelve attractions, each paying a little more for every happy visitor
 * afterwards - and the bigger blueprints only unlock after a good day at a
 * higher level. Visitors also pay more entrance at a higher level, and only
 * half on a level already mastered: in this game, climbing is literally how
 * the park grows.
 *
 * Everything the park is (money, attractions, days) lives in state.park and
 * is saved with the rest of the profile.
 */
import { getLanguage, t } from "../i18n.js";
import { choice, randInt, shuffle } from "../rng.js";
import { el, clear, append, raw } from "../dom.js";
import { markdown } from "../markdown.js";
import {
  canEarnAtLevel,
  emitChange,
  getLevel,
  recordFeat,
  saveCurrentProfile,
  state,
} from "../state.js";
import { adaptAfterRound, announceNewBadges, settleAnswer } from "../gameflow.js";
import { climbInvite, expander, gameShell, recordedCaption, statRow } from "../ui.js";
import { randomPraise } from "../ui-bits.js";
import { bigCelebration, confetti, floatPoints, toast } from "../fx.js";
import * as sound from "../sound.js";

const GAME_KEY = "park";
export const VISITORS_PER_DAY = 8;
/** A day with at least this many happy visitors counts as "a good day" for the blueprints. */
export const GOOD_DAY = 6;

/**
 * The attractions, cheapest first. `income` is what every happy visitor pays
 * extra once it is built; `minLevel` is the level of a good day needed
 * before its blueprint unlocks.
 */
export const ATTRACTIONS = [
  { id: "candy", emoji: "🍭", price: 20, income: 1, minLevel: 0, anim: "bob" },
  { id: "carousel", emoji: "🎠", price: 50, income: 2, minLevel: 0, anim: "spin" },
  { id: "darts", emoji: "🎯", price: 90, income: 3, minLevel: 1, anim: "pulse" },
  { id: "boats", emoji: "🚣", price: 140, income: 4, minLevel: 1, anim: "sway" },
  { id: "circus", emoji: "🎪", price: 220, income: 6, minLevel: 2, anim: "pulse" },
  { id: "wheel", emoji: "🎡", price: 320, income: 8, minLevel: 2, anim: "spin" },
  { id: "train", emoji: "🚂", price: 450, income: 10, minLevel: 3, anim: "sway" },
  { id: "ghost", emoji: "👻", price: 600, income: 13, minLevel: 3, anim: "bob" },
  { id: "coaster", emoji: "🎢", price: 800, income: 16, minLevel: 4, anim: "bob" },
  { id: "flume", emoji: "🌊", price: 1000, income: 20, minLevel: 5, anim: "sway" },
  { id: "castle", emoji: "🏰", price: 1300, income: 25, minLevel: 6, anim: "pulse" },
  { id: "rocket", emoji: "🚀", price: 1700, income: 30, minLevel: 7, anim: "bob" },
];
export const ATTRACTION_MAP = Object.fromEntries(ATTRACTIONS.map((a) => [a.id, a]));

/** Entrance per happy visitor: more at a higher level. */
export const ticketFor = (level) => 4 + 2 * level;

/**
 * Park money one happy visitor brings: the entrance plus every built
 * attraction's extra - halved (rounded up) on a level already mastered.
 */
export function visitorIncome(level, built, practice = false) {
  const full = ticketFor(level) + built.reduce((sum, id) => sum + (ATTRACTION_MAP[id]?.income ?? 0), 0);
  return practice ? Math.ceil(full / 2) : full;
}

/** 1 to 5 stars for the park sign. */
export function parkRating(built) {
  const n = built.length;
  return n >= 10 ? 5 : n >= 7 ? 4 : n >= 4 ? 3 : n >= 2 ? 2 : 1;
}

/** The highest level a good day has been played at (unlocks the blueprints). */
export function blueprintLevel() {
  return state.park.topLevel ?? 0;
}

export function isBlueprintOpen(id) {
  return blueprintLevel() >= (ATTRACTION_MAP[id]?.minLevel ?? 99);
}

export function canBuild(id) {
  const a = ATTRACTION_MAP[id];
  return !!a && !state.park.built.includes(id) && isBlueprintOpen(id) && state.park.cash >= a.price;
}

/** Build an attraction: pay its price in park money. Returns true when built. */
export function build(id) {
  if (!canBuild(id)) return false;
  state.park.cash -= ATTRACTION_MAP[id].price;
  state.park.built.push(id);
  emitChange();
  saveCurrentProfile();
  return true;
}

// ---------------------------------------------------------------------------
// Visitor questions (pure, tested in tests/web/test_puzzles.mjs)
// ---------------------------------------------------------------------------

/** €7, €2.50 / €2,50 - money the way the language writes it. */
export function money(value, lang = getLanguage()) {
  const whole = Math.abs(value - Math.round(value)) < 1e-9;
  const text = whole ? String(Math.round(value)) : value.toFixed(2);
  return `€${lang === "nl" ? text.replace(".", ",") : text}`;
}

/** A plain number with the language's decimal separator. */
export function num(value, lang = getLanguage()) {
  const text = String(Number(value.toFixed(2)));
  return lang === "nl" ? text.replace(".", ",") : text;
}

/** How an answer is shown: money, a percentage, minutes or a plain number. */
export function formatAnswer(value, unit, lang = getLanguage()) {
  if (unit === "money") return money(value, lang);
  if (unit === "percent") return `${num(value, lang)}%`;
  if (unit === "minutes") return `${num(value, lang)} min`;
  return num(value, lang);
}

/**
 * The question kinds each level draws from. Each builds { kind, vars,
 * answer, unit, wrong: [likely mistakes] } - the text and the worked
 * explanation are translations (park.q_<kind>, park.why_<kind>) filled with
 * the same vars.
 */
const KINDS = {
  // Each builder gets the language, for the amounts written into the question.
  tickets: (lang) => {
    const n = randInt(2, 5);
    const p = randInt(2, 6);
    return { vars: { n, p }, answer: n * p, unit: "money", wrong: [n + p, n * p + p, n * p - p] };
  },
  change10: (lang) => {
    const p = randInt(1, 8);
    return { vars: { p, pay: 10 }, answer: 10 - p, unit: "money", wrong: [10 - p + 1, 10 - p - 1, p] };
  },
  addtwo: (lang) => {
    const a = randInt(2, 9);
    const b = randInt(2, 9);
    return { vars: { a, b }, answer: a + b, unit: "money", wrong: [a + b + 1, a + b - 1, a * b > 30 ? a + b + 10 : a * b] };
  },
  change20: (lang) => {
    const p = randInt(5, 19);
    return { vars: { p, pay: 20 }, answer: 20 - p, unit: "money", wrong: [20 - p + 1, 20 - p - 1, 30 - p] };
  },
  rides: (lang) => {
    const k = choice([4, 5, 6, 8, 10]);
    const rides = randInt(2, 6);
    return { vars: { q: k * rides, k }, answer: rides, unit: "number", wrong: [rides + 1, rides - 1, k] };
  },
  family: (lang) => {
    const a = randInt(6, 12);
    const c = randInt(3, 7);
    const k = randInt(2, 3);
    return { vars: { a, c, k }, answer: 2 * a + k * c, unit: "money", wrong: [a + k * c, 2 * a + c, 2 * (a + c) * k] };
  },
  sugar: (lang) => {
    const p = randInt(1, 7) + 0.5;
    const pay = p < 5 ? 5 : 10;
    return { vars: { p: money(p, lang), pay }, answer: pay - p, unit: "money", wrong: [pay - p + 1, pay - p - 0.5, pay - Math.floor(p)] };
  },
  queue: (lang) => {
    const k = choice([6, 8, 10, 12]);
    const q = k * randInt(2, 5) + randInt(1, k - 1);
    const answer = Math.ceil(q / k);
    return { vars: { q, k }, answer, unit: "number", wrong: [answer - 1, answer + 1, q - k] };
  },
  share: (lang) => {
    const n = randInt(3, 6);
    const each = randInt(4, 12);
    return { vars: { n, total: n * each }, answer: each, unit: "money", wrong: [each + 1, each - 1, n * each - n] };
  },
  perhour: (lang) => {
    const m = choice([2, 3, 4, 5, 6, 10, 12, 15, 20]);
    return { vars: { m }, answer: 60 / m, unit: "number", wrong: [60 / m + 2, 60 / m - 2, m * 6] };
  },
  riders: (lang) => {
    const m = choice([3, 4, 5, 6, 10]);
    const k = choice([8, 10, 12, 20, 24]);
    return { vars: { m, k }, answer: (60 / m) * k, unit: "number", wrong: [(60 / m) * k + k, 60 * k, (60 / m) * k - k] };
  },
  discount: (lang) => {
    const pct = choice([10, 20, 25, 50]);
    // Prices chosen so the discount is a whole number of euros.
    const price = pct === 25 ? 4 * randInt(5, 15) : pct === 50 ? 2 * randInt(8, 25) : 10 * randInt(2, 8);
    const off = (price * pct) / 100;
    return { vars: { p: price, pct }, answer: price - off, unit: "money", wrong: [off, price - pct, price - off + 5] };
  },
  unitprice: (lang) => {
    const n = choice([4, 5, 8, 10]);
    const each = choice([0.5, 1, 1.5, 2, 2.5, 3]);
    return { vars: { n, total: money(n * each, lang) }, answer: each, unit: "money", wrong: [each + 0.5, each * 2, n * each - n] };
  },
  untilclose: (lang) => {
    const close = choice([17, 18, 19]);
    const h = close - randInt(1, 2);
    const m = choice([10, 15, 20, 30, 40, 45, 50]);
    const answer = (close - h) * 60 - m;
    return { vars: { close, now: `${h}:${String(m).padStart(2, "0")}` }, answer, unit: "minutes", wrong: [answer + 60, answer - 10, (close - h) * 100 - m] };
  },
  percentof: (lang) => {
    const pct = choice([10, 20, 25, 40, 50, 75]);
    const n = choice([40, 80, 120, 200, 240, 400]);
    return { vars: { pct, n }, answer: (pct * n) / 100, unit: "number", wrong: [(pct * n) / 100 + 10, n - pct, (pct * n) / 10] };
  },
  ridecard: (lang) => {
    const single = choice([3, 4, 5, 6]);
    const card = 5 * single - choice([2.5, 5]);
    const answer = single - card / 5;
    return { vars: { a: money(single, lang), b: money(card, lang) }, answer, unit: "money", wrong: [5 * single - card, answer + 1, single - card / 10] };
  },
  average: (lang) => {
    const avg = randInt(50, 120);
    const d = [randInt(-15, 15), randInt(-15, 15), randInt(-15, 15)];
    const days = [avg + d[0], avg + d[1], avg + d[2], avg - d[0] - d[1] - d[2]];
    return { vars: { a: days[0], b: days[1], c: days[2], d: days[3] }, answer: avg, unit: "number", wrong: [avg + 5, 4 * avg, avg - 3] };
  },
  profit: (lang) => {
    const n = choice([20, 30, 40, 50]);
    const p = choice([2, 3, 4]);
    const c = choice([0.5, 1, 1.5]);
    return { vars: { n, p: money(p, lang), c: money(c, lang) }, answer: n * (p - c), unit: "money", wrong: [n * p, n * p - c, n * (p + c)] };
  },
  vat: (lang) => {
    const p = choice([100, 200, 300, 400, 500, 1000]);
    return { vars: { p }, answer: (p * 121) / 100, unit: "money", wrong: [p + 21, (p * 21) / 100, p * 1.12] };
  },
  increase: (lang) => {
    const a = choice([50, 100, 200, 400]);
    const pct = choice([10, 20, 25, 50]);
    return { vars: { a, b: (a * (100 + pct)) / 100 }, answer: pct, unit: "percent", wrong: [(a * pct) / 100, pct * 2, 100 + pct] };
  },
  payback: (lang) => {
    const a = choice(ATTRACTIONS.filter((x) => x.price >= 90));
    // A day count that divides the price, so the income per day is whole euros.
    const divisors = [];
    for (let d = 3; d <= 20; d++) if (a.price % d === 0) divisors.push(d);
    const days = choice(divisors);
    return {
      vars: { attraction: a.id, price: a.price, perDay: a.price / days },
      answer: days,
      unit: "number",
      wrong: [days + 2, days - 1, Math.round(a.price / 10)],
    };
  },
  ratio: (lang) => {
    const a = randInt(1, 4);
    const b = randInt(1, 4);
    const unit = choice([10, 20, 25, 50]);
    const total = (a + b) * unit;
    return { vars: { total, a, b }, answer: a * unit, unit: "money", wrong: [b * unit, total / 2, a * 10] };
  },
  mapscale: (lang) => {
    const s = choice([500, 1000, 2000]);
    const cm = randInt(2, 9);
    return { vars: { s, cm }, answer: (cm * s) / 100, unit: "number", wrong: [cm * s, (cm * s) / 1000, (cm * s) / 10] };
  },
};

/** Which kinds each level draws from - the groep 6 to groep 8 money line. */
export const LEVEL_KINDS = {
  0: ["tickets", "change10", "addtwo"],
  1: ["tickets", "change20", "rides", "addtwo"],
  2: ["family", "sugar", "queue", "change20"],
  3: ["share", "perhour", "riders", "family"],
  4: ["discount", "unitprice", "untilclose", "riders"],
  5: ["percentof", "ridecard", "average", "discount"],
  6: ["profit", "vat", "increase", "percentof"],
  7: ["payback", "ratio", "mapscale", "profit"],
};

const VISITORS = ["🧒", "👧", "👦", "👩", "👨", "👵", "👴", "🙋", "🧑", "👱"];

/**
 * One visitor's question at `level`: { kind, text, why, answer, unit,
 * options (4 formatted strings), answerText, visitor }.
 */
export function parkQuestion(level, lang = getLanguage()) {
  const kinds = LEVEL_KINDS[Math.max(0, Math.min(7, level))];
  const kind = choice(kinds);
  const q = KINDS[kind](lang);
  const round2 = (v) => Math.round(v * 100) / 100;
  const answer = round2(q.answer);
  const wrong = [...new Set(q.wrong.map(round2))].filter((w) => w > 0 && Math.abs(w - answer) > 1e-9);
  // Top up to three wrong options with near misses.
  for (let step = 1; wrong.length < 3; step++) {
    for (const guess of [answer + step, answer - step]) {
      if (wrong.length < 3 && guess > 0 && !wrong.some((w) => Math.abs(w - guess) < 1e-9)) wrong.push(round2(guess));
    }
  }
  const values = shuffle([answer, ...wrong.slice(0, 3)]);
  const vars = { ...q.vars };
  if (vars.attraction) vars.name = `${ATTRACTION_MAP[vars.attraction].emoji} ${t(`park.a_${vars.attraction}`)}`;
  if (kind === "payback") {
    vars.price = money(q.vars.price, lang);
    vars.perDay = money(q.vars.perDay, lang);
  }
  const whyVars = { ...vars, answer: formatAnswer(answer, q.unit, lang) };
  return {
    kind,
    text: t(`park.q_${kind}`, vars),
    why: t(`park.why_${kind}`, whyVars),
    answer,
    unit: q.unit,
    values,
    options: values.map((v) => formatAnswer(v, q.unit, lang)),
    answerText: formatAnswer(answer, q.unit, lang),
    visitor: choice(VISITORS),
  };
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

const POINTS = (level) => 3 * (level + 1);

export function render(container) {
  let phase = "park"; // park | day | summary
  let dayLevel = 0;
  let visitor = 0;
  let question = null;
  let answered = null; // null | { correct, picked }
  let dayCorrect = 0;
  let dayCash = 0;
  let advanceTimer = null;

  const shell = gameShell({
    gameKey: GAME_KEY,
    emoji: "🎡",
    titleKey: "park.title",
    taglineKey: "park.tagline",
    introKey: "park.intro",
    autoAdvance: false,
    onLevelChange: () => {
      clearTimeout(advanceTimer);
      phase = "park";
      paint();
    },
  });

  const stage = el("div.kmg-stage.kmg-park");
  shell.slots.extraSlot.append(
    stage,
    expander(t("park.how_to_heading"), raw("div", markdown(t("park.how_to_body")))),
    recordedCaption(),
  );

  const practice = () => !canEarnAtLevel(GAME_KEY, getLevel(GAME_KEY));

  function startDay() {
    clearTimeout(advanceTimer);
    phase = "day";
    dayLevel = getLevel(GAME_KEY);
    visitor = 0;
    dayCorrect = 0;
    dayCash = 0;
    nextVisitor();
    stage.scrollIntoView?.({ block: "start", behavior: "smooth" });
  }

  function nextVisitor() {
    clearTimeout(advanceTimer);
    if (visitor >= VISITORS_PER_DAY) {
      endDay();
      return;
    }
    visitor += 1;
    question = parkQuestion(dayLevel);
    answered = null;
    paint();
  }

  function pick(index, button) {
    if (answered) return;
    const correct = Math.abs(question.values[index] - question.answer) < 1e-9;
    answered = { correct, picked: index };
    let income = 0;
    if (correct) {
      dayCorrect += 1;
      income = visitorIncome(dayLevel, state.park.built, !canEarnAtLevel(GAME_KEY, dayLevel));
      state.park.cash += income;
      state.park.visitors += 1;
      dayCash += income;
      if (button) floatPoints(button, `+${money(income)}`);
    }
    settleAnswer({
      gameKey: GAME_KEY,
      level: dayLevel,
      questionText: question.text,
      studentAnswer: question.options[index],
      correctAnswer: question.answerText,
      isCorrect: correct,
      points: POINTS(dayLevel),
      adaptLevel: false,
      burstFrom: correct ? button : null,
    });
    answered.income = income;
    paint();
    // A happy visitor moves on by itself; a wrong answer waits, so the
    // worked explanation can be read.
    if (correct) advanceTimer = setTimeout(() => nextVisitor(), 1300);
  }

  function endDay() {
    phase = "summary";
    state.park.days += 1;
    state.park.bestDay = Math.max(state.park.bestDay, dayCash);
    // A good day at this level opens the blueprints up to it.
    if (dayCorrect >= GOOD_DAY) state.park.topLevel = Math.max(blueprintLevel(), dayLevel);
    saveCurrentProfile();
    if (dayCorrect === VISITORS_PER_DAY) bigCelebration();
    sound.playTimeUp();
    adaptAfterRound(GAME_KEY, dayCorrect, VISITORS_PER_DAY);
    paint();
  }

  function buildNow(id, button) {
    const a = ATTRACTION_MAP[id];
    if (!build(id)) return;
    sound.playFanfare();
    const rect = button?.getBoundingClientRect();
    confetti(rect ? { x: rect.left + rect.width / 2, y: rect.top, count: 60 } : { count: 60 });
    toast(t("park.built_toast", { name: `${a.emoji} ${t(`park.a_${id}`)}`, income: money(a.income) }), a.emoji, 4200);
    let feat = false;
    if (state.park.built.length >= 6) feat = recordFeat("park_6") || feat;
    if (state.park.built.length >= ATTRACTIONS.length) feat = recordFeat("park_all") || feat;
    if (feat) {
      announceNewBadges();
      saveCurrentProfile();
    }
    paint();
  }

  // --- painting -------------------------------------------------------------

  function parkSign() {
    const level = getLevel(GAME_KEY);
    const built = state.park.built;
    const rating = parkRating(built);
    const name = state.playerName ? t("park.name_of", { name: state.playerName }) : t("park.name_default");
    return el("div.kmg-park-sign", {}, [
      el("div.kmg-park-sign-top", {}, [
        el("strong.kmg-park-name", { text: `🎪 ${name}` }),
        el("span.kmg-park-stars", { text: "⭐".repeat(rating) + "☆".repeat(5 - rating), "aria-label": t("park.rating", { stars: rating }) }),
      ]),
      el("div.kmg-park-facts", {}, [
        el("span.kmg-park-cash", { text: `💰 ${money(state.park.cash)}` }),
        el("span.kmg-chip", { text: t("park.fact_built", { built: built.length, total: ATTRACTIONS.length }) }),
        el("span.kmg-chip", { text: t("park.fact_days", { days: state.park.days }) }),
        el("span.kmg-chip", {
          text: t(practice() ? "park.fact_income_practice" : "park.fact_income", {
            income: money(visitorIncome(level, built, practice())),
          }),
        }),
      ]),
    ]);
  }

  function parkMap(interactive) {
    const grid = el("div.kmg-park-map");
    for (const a of ATTRACTIONS) {
      const built = state.park.built.includes(a.id);
      const open = isBlueprintOpen(a.id);
      const affordable = state.park.cash >= a.price;
      const name = t(`park.a_${a.id}`);
      if (built) {
        grid.append(
          el(`div.kmg-park-plot.is-built`, { dataset: { attraction: a.id } }, [
            el(`span.kmg-park-emoji.kmg-park-anim-${a.anim}`, { text: a.emoji, "aria-hidden": "true" }),
            el("span.kmg-park-plot-name", { text: name }),
            el("span.kmg-park-plot-meta", { text: t("park.plot_income", { income: money(a.income) }) }),
          ]),
        );
        continue;
      }
      const days = Math.ceil(a.price / Math.max(1, VISITORS_PER_DAY * a.income));
      const plot = el(`div.kmg-park-plot${open ? "" : ".is-locked"}${open && affordable ? ".is-buildable" : ""}`, { dataset: { attraction: a.id } }, [
        el("span.kmg-park-emoji.is-ghost", { text: open ? a.emoji : "🔒", "aria-hidden": "true" }),
        el("span.kmg-park-plot-name", { text: open ? name : t("park.plot_locked_name") }),
        el("span.kmg-park-plot-meta", {
          text: open ? `${money(a.price)} · +${money(a.income)}` : t("park.plot_locked", { level: a.minLevel }),
        }),
        // From level 5 the card also says how long it takes to pay itself back.
        open && getLevel(GAME_KEY) >= 5 ? el("span.kmg-park-plot-payback", { text: t("park.plot_payback", { days }) }) : null,
      ]);
      if (interactive && open) {
        plot.append(
          el("button.kmg-btn.kmg-btn-primary.kmg-park-build", {
            type: "button",
            text: affordable ? t("park.build_button") : t("park.need_more", { amount: money(a.price - state.park.cash) }),
            disabled: !affordable,
            onClick: (event) => buildNow(a.id, event.currentTarget),
          }),
        );
      }
      grid.append(plot);
    }
    return grid;
  }

  function paintPark() {
    append(
      stage,
      parkSign(),
      practice() ? climbInvite(GAME_KEY, () => paint()) : null,
      el("div.kmg-actions.kmg-park-actions", {}, [
        el("button.kmg-btn.kmg-btn-primary.kmg-btn-big.kmg-park-open", {
          type: "button",
          text: t("park.open_button", { visitors: VISITORS_PER_DAY }),
          onClick: () => startDay(),
        }),
      ]),
      el("h3.kmg-park-heading", { text: t("park.map_heading") }),
      el("p.kmg-caption", { text: t("park.map_caption") }),
      parkMap(true),
    );
  }

  function paintDay() {
    const q = question;
    const walkers = el("div.kmg-park-queue", { "aria-hidden": "true" });
    for (let i = visitor; i < VISITORS_PER_DAY; i++) walkers.append(el("span", { text: VISITORS[i % VISITORS.length] }));
    const grid = el("div.kmg-choices", { style: { "--kmg-cols": "2" } });
    q.options.forEach((option, index) => {
      const classes = answered
        ? Math.abs(q.values[index] - q.answer) < 1e-9
          ? ".is-right"
          : index === answered.picked
            ? ".is-wrong"
            : ""
        : "";
      const button = el(`button.kmg-choice.kmg-park-option${classes}`, {
        type: "button",
        text: option,
        disabled: !!answered,
        onClick: () => pick(index, button),
      });
      grid.append(button);
    });
    append(
      stage,
      el("div.kmg-park-dayhead", {}, [
        el("span.kmg-chip", { text: t("park.visitor_of", { n: visitor, total: VISITORS_PER_DAY }) }),
        el("span.kmg-park-cash", { text: `💰 +${money(dayCash)}` }),
        walkers,
      ]),
      el("div.kmg-question.is-in.kmg-park-question", {}, [
        el("span.kmg-question-emoji.kmg-park-visitor", { text: q.visitor }),
        el("span.kmg-question-text", { text: q.text }),
      ]),
      grid,
    );
    if (answered?.correct) {
      stage.append(
        el("div.kmg-banner.kmg-banner-ok", { role: "status" }, [
          el("span.kmg-banner-icon", { text: "😄" }),
          el("span.kmg-banner-body", {}, [
            el("span.kmg-banner-msg", { text: t("park.happy", { income: money(answered.income) }) }),
            el("span.kmg-banner-tip", { text: randomPraise() }),
          ]),
        ]),
      );
    } else if (answered) {
      stage.append(
        el("div.kmg-banner.kmg-banner-bad", { role: "status" }, [
          el("span.kmg-banner-icon", { text: "💡" }),
          el("span.kmg-banner-body", {}, [
            el("span.kmg-banner-msg", { text: t("park.sad", { answer: q.answerText }) }),
            el("span.kmg-banner-tip.kmg-park-why", { text: q.why }),
          ]),
        ]),
        el("div.kmg-actions", {}, [
          el("button.kmg-btn.kmg-btn-primary", {
            type: "button",
            text: visitor >= VISITORS_PER_DAY ? t("park.close_button") : t("park.next_button"),
            onClick: () => nextVisitor(),
          }),
        ]),
      );
    }
  }

  function paintSummary() {
    const good = dayCorrect >= GOOD_DAY;
    const nextBlueprint = ATTRACTIONS.find((a) => !isBlueprintOpen(a.id));
    append(
      stage,
      el("h2", { text: t("park.day_over", { day: state.park.days }) }),
      statRow([
        { label: t("park.stat_happy"), value: `${dayCorrect}/${VISITORS_PER_DAY}` },
        { label: t("park.stat_cash"), value: money(dayCash) },
        { label: t("park.stat_total"), value: money(state.park.cash) },
      ]),
      el(`div.kmg-banner.${good ? "kmg-banner-ok" : "kmg-banner-info"}`, {}, [
        el("span.kmg-banner-icon", { text: good ? "🎉" : "💪" }),
        el("span.kmg-banner-body", {
          text: good
            ? nextBlueprint && nextBlueprint.minLevel > dayLevel
              ? t("park.summary_good_next", { level: nextBlueprint.minLevel, name: t(`park.a_${nextBlueprint.id}`) })
              : t("park.summary_good")
            : t("park.summary_try", { good: GOOD_DAY }),
        }),
      ]),
      climbInvite(GAME_KEY, () => {
        phase = "park";
        paint();
      }),
      el("div.kmg-actions", {}, [
        el("button.kmg-btn.kmg-btn-primary", {
          type: "button",
          text: t("park.to_park_button"),
          onClick: () => {
            phase = "park";
            paint();
          },
        }),
        el("button.kmg-btn.kmg-btn-ghost", {
          type: "button",
          text: t("park.another_day_button"),
          onClick: () => startDay(),
        }),
      ]),
    );
  }

  function paint() {
    clear(stage);
    shell.picker.refresh();
    if (phase === "day") paintDay();
    else if (phase === "summary") paintSummary();
    else paintPark();
  }

  container.append(shell.root);
  paint();

  return () => {
    clearTimeout(advanceTimer);
    shell.destroy();
  };
}
