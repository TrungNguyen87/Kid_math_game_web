/**
 * Verhoudingen & Snelheid - ratios, map scale, speed/distance/time, unit
 * prices and multi-step travel problems.
 * Ported from pages/09_Verhoudingen_en_Snelheid.py.
 *
 * Levels 6-7 (round 18) are groep 8: sharing in a ratio, a real map scale
 * (1 : 25 000 and up, answered in km), a speed from minutes rather than
 * hours, scaling a recipe, and metres per second to km/h. All whole numbers.
 */
import { getLanguage, t } from "../i18n.js";
import { choice, coinFlip, gcd, randInt, range } from "../rng.js";
import { ratioBarSvg, speedDiagramSvg } from "../visuals.js";
import { formatEuro, typedAnswerGame } from "./common.js";

const GAME_KEY = "verhoudingen";

export function generate(level) {
  const lang = getLanguage();
  let answerKind = "int";
  let visual = null;
  let text;
  let answer;
  let answerLabel;

  if (level === 0 || level === 1) {
    // A ratio only simplifies cleanly if the two parts are coprime to start
    // with, so redraw until they are.
    const [lo, hi] = level === 0 ? [1, 3] : [2, 6];
    let p = randInt(lo, hi);
    let q = randInt(lo, hi);
    while (gcd(p, q) !== 1) {
      p = randInt(lo, hi);
      q = randInt(lo, hi);
    }
    const factor = level === 0 ? randInt(2, 3) : randInt(2, 6);
    const a = p * factor;
    const b = q * factor;
    text = t("verhoudingen.q_simplify", { a, b, q });
    answer = p;
    answerLabel = t("verhoudingen.answer_label_number");
    visual = ratioBarSvg([a, b], { labels: [String(a), String(b)] });
  } else if (level === 2) {
    const scale = choice([100, 200, 500, 1000, 2000]);
    const mapCm = randInt(2, 20);
    text = t("verhoudingen.q_scale", { scale, map_cm: mapCm });
    answer = Math.floor((mapCm * scale) / 100);
    answerLabel = t("verhoudingen.answer_label_meter");
  } else if (level === 3) {
    const speed = choice(range(20, 121, 10));
    const time = randInt(1, 6);
    const distance = speed * time;
    const subtype = choice(["find_speed", "find_distance", "find_time"]);
    if (subtype === "find_speed") {
      text = t("verhoudingen.q_speed_find_speed", { distance, time });
      answer = speed;
      answerLabel = t("verhoudingen.answer_label_kmh");
      visual = speedDiagramSvg(distance, "km", time, t("units.hour"));
    } else if (subtype === "find_distance") {
      text = t("verhoudingen.q_speed_find_distance", { time, speed });
      answer = distance;
      answerLabel = t("verhoudingen.answer_label_km");
      visual = speedDiagramSvg(speed, t("units.kmh"), time, t("units.hour"));
    } else {
      text = t("verhoudingen.q_speed_find_time", { distance, speed });
      answer = time;
      answerLabel = t("verhoudingen.answer_label_hour");
      visual = speedDiagramSvg(distance, "km", speed, t("units.kmh"));
    }
  } else if (level === 4) {
    answerKind = "euro";
    const pricePerUnit = choice([0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0]);
    const qty = randInt(3, 12);
    const totalPrice = Math.round(pricePerUnit * qty * 100) / 100;
    text = t("verhoudingen.q_unit_price", { qty, total_price: formatEuro(totalPrice, lang) });
    answer = pricePerUnit;
    answerLabel = t("verhoudingen.answer_label_euro");
    visual = ratioBarSvg(Array(qty).fill(1), { labels: Array(qty).fill("?") });
  } else if (level === 6) {
    if (coinFlip()) {
      let p = randInt(1, 5);
      let q = randInt(2, 7);
      while (gcd(p, q) !== 1 || p === q) {
        p = randInt(1, 5);
        q = randInt(2, 7);
      }
      const k = randInt(3, 12);
      const total = (p + q) * k;
      text = t("verhoudingen.q_share", { total, p, q });
      answer = p * k;
      answerLabel = t("verhoudingen.answer_label_number");
      visual = ratioBarSvg([p, q], { labels: [`${p} ${t("verhoudingen.part_word")}`, `${q} ${t("verhoudingen.part_word")}`] });
    } else {
      // cm on the map x scale = cm in reality; / 100 000 = km. Pick the map
      // distance so the answer is a whole number of km.
      const scale = choice([25000, 50000, 100000, 200000]);
      const step = 100000 / gcd(scale, 100000);
      const mapCm = step * randInt(1, Math.max(2, Math.floor(20 / step)));
      text = t("verhoudingen.q_scale_km", { scale: scale.toLocaleString(lang === "nl" ? "nl-NL" : "en-GB"), map_cm: mapCm });
      answer = (mapCm * scale) / 100000;
      answerLabel = t("verhoudingen.answer_label_km");
    }
  } else if (level === 7) {
    const kind = choice(["minutes", "recipe", "ms"]);
    if (kind === "minutes") {
      const speed = choice([36, 45, 48, 60, 72, 90, 120]);
      const minutes = choice([10, 15, 20, 30, 40, 45].filter((m) => (speed * m) % 60 === 0));
      const distance = (speed * minutes) / 60;
      text = t("verhoudingen.q_speed_minutes", { distance, minutes });
      answer = speed;
      answerLabel = t("verhoudingen.answer_label_kmh");
      visual = speedDiagramSvg(distance, "km", minutes, t("units.min_abbr"));
    } else if (kind === "recipe") {
      const people = choice([2, 4, 5, 6]);
      const perPerson = choice([25, 40, 50, 60, 75, 80, 120]);
      let others = randInt(3, 12);
      if (others === people) others += 1;
      text = t("verhoudingen.q_recipe", { people, grams: people * perPerson, others });
      answer = perPerson * others;
      answerLabel = t("verhoudingen.answer_label_gram");
    } else {
      const ms = choice([5, 10, 15, 20, 25, 30]);
      text = t("verhoudingen.q_ms_to_kmh", { ms });
      answer = (ms * 36) / 10;
      answerLabel = t("verhoudingen.answer_label_kmh");
    }
  } else {
    const speed = choice(range(20, 121, 4));
    const time = randInt(1, 4);
    // 15/30/45 only: an "extra" of 0 produced questions reading "... in 3
    // hours and 0 minutes", which is both clumsy and not the multi-step
    // problem this level is meant to be asking.
    const extraMin = choice([15, 30, 45]);
    const distance = Math.floor((speed * (time * 60 + extraMin)) / 60);
    text = t("verhoudingen.q_multi_step", { speed, time, extra_min: extraMin });
    answer = distance;
    answerLabel = t("verhoudingen.answer_label_km");
    visual = speedDiagramSvg(
      `${speed} ${t("units.kmh")}`,
      "",
      `${time}${t("units.hour_abbr")} ${extraMin}${t("units.min_abbr")}`,
      "",
    );
  }

  return {
    text,
    answer,
    answerKind,
    answerLabel,
    visual,
    decimal: answerKind === "euro",
    tolerance: answerKind === "euro" ? 0.005 : null,
    answerDisplay: answerKind === "euro" ? formatEuro(answer, lang) : answer,
  };
}

export const render = typedAnswerGame({
  gameKey: GAME_KEY,
  emoji: "🚗",
  questionEmoji: "🚗",
  okIcon: "🏁",
  badIcon: "🚧",
  tipKey: "verhoudingen.why_tip",
  generate,
  visuals: (problem) => (problem.visual ? [problem.visual] : []),
});
