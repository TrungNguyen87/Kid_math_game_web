/**
 * Meetkunde Meesters - perimeter, area, compound shapes, volume and angles.
 * Ported from pages/08_Meetkunde_Meesters.py.
 *
 * Levels 6-7 (round 18) are groep 8: the circle (circumference and area with
 * pi = 3.14, so the answer is a decimal), how many litres fit in a tank
 * measured in cm, and the surface area of a box.
 */
import { getLanguage, t } from "../i18n.js";
import { choice, coinFlip, randInt, range } from "../rng.js";
import { circleSvg, cuboidSvg, rectangleSvg, triangleSvg } from "../visuals.js";
import { formatDecimal, typedAnswerGame } from "./common.js";

/** The value of pi groep 8 works with. */
export const PI = 3.14;

const GAME_KEY = "meetkunde";
const UNIT = "cm";

export function generate(level) {
  if (level >= 6) return groep8Problem(level);
  let text;
  let answer;
  let unitSuffix;
  let visual;
  let angles = null;

  if (level === 0 || level === 1) {
    const hi = level === 0 ? 6 : 12;
    const w = randInt(2, hi);
    const h = randInt(2, hi);
    if (coinFlip()) {
      text = t("meetkunde.q_perimeter", { w, h, unit: UNIT });
      answer = 2 * (w + h);
      unitSuffix = UNIT;
    } else {
      text = t("meetkunde.q_area_rect", { w, h, unit: UNIT });
      answer = w * h;
      unitSuffix = `${UNIT}²`;
    }
    visual = { kind: "rect", w, h };
  } else if (level === 2) {
    // An even height keeps base x height / 2 a whole number.
    const heightVal = choice(range(2, 13, 2));
    const base = randInt(2, 15);
    text = t("meetkunde.q_area_triangle", { base, height: heightVal, unit: UNIT });
    answer = (base * heightVal) / 2;
    unitSuffix = `${UNIT}²`;
    visual = { kind: "triangle", base, height: heightVal };
  } else if (level === 3) {
    const h = randInt(2, 10);
    const w1 = randInt(2, 10);
    const w2 = randInt(2, 10);
    text = t("meetkunde.q_area_compound", { w1, w2, h, unit: UNIT });
    answer = (w1 + w2) * h;
    unitSuffix = `${UNIT}²`;
    visual = { kind: "compound", w1, w2, h };
  } else if (level === 4) {
    const l = randInt(2, 10);
    const w = randInt(2, 10);
    const h = randInt(2, 10);
    text = t("meetkunde.q_volume", { l, w, h, unit: UNIT });
    answer = l * w * h;
    unitSuffix = `${UNIT}³`;
    visual = { kind: "cuboid", l, w, h };
  } else {
    const shape = choice(["triangle", "quadrilateral"]);
    const total = shape === "triangle" ? 180 : 360;
    const n = shape === "triangle" ? 3 : 4;

    // Pick the missing angle FIRST, then split what is left over the given
    // angles. Sampling the given angles and hoping the remainder is sensible
    // can leave a triangle asking for a negative third angle.
    const missing = randInt(20, 100);
    let remaining = total - missing;
    const given = [];
    for (let i = 0; i < n - 1; i++) {
      const slotsLeft = n - 1 - i;
      if (slotsLeft === 1) {
        given.push(remaining);
      } else {
        // Leave at least 20 degrees for each angle still to come.
        const lo = Math.max(20, remaining - 140 * (slotsLeft - 1));
        const hi = Math.min(140, remaining - 20 * (slotsLeft - 1));
        const pick = randInt(lo, Math.max(lo, hi));
        given.push(pick);
        remaining -= pick;
      }
    }

    text = t("meetkunde.q_angle", {
      shape: t(`meetkunde.shape_${shape}`),
      total,
      given: given.join(" + "),
    });
    answer = missing;
    unitSuffix = "°";
    // Kept on the problem so the angle sum can be checked without parsing it
    // back out of translated text.
    angles = { shape, total, given };
    visual = shape === "triangle" ? { kind: "triangle", base: 12, height: 8 } : { kind: "rect", w: 10, h: 8 };
  }

  return {
    text,
    answer,
    unitSuffix,
    visual,
    angles,
    answerLabel: unitSuffix === "°" ? t("meetkunde.answer_label_deg") : t("meetkunde.answer_label"),
  };
}

/**
 * Groep 8. Level 6: circles. Level 7: litres in a tank measured in cm, and
 * the surface area of a box.
 */
function groep8Problem(level) {
  const lang = getLanguage();
  if (level === 6) {
    const r = randInt(2, 12);
    if (coinFlip()) {
      // Circumference: pi x d - given either the diameter or the radius, so
      // "d = 2 x r" has to be remembered half the time.
      const useDiameter = coinFlip();
      const d = useDiameter ? r : 2 * r;
      const answer = Math.round(PI * d * 100) / 100;
      return {
        text: t(useDiameter ? "meetkunde.q_circle_circ_d" : "meetkunde.q_circle_circ_r", { d, r, unit: UNIT }),
        answer,
        unitSuffix: UNIT,
        visual: { kind: "circle", value: useDiameter ? d : r, show: useDiameter ? "diameter" : "radius" },
        angles: null,
        answerLabel: t("meetkunde.answer_label_decimal"),
        decimal: true,
        tolerance: 0.005,
        answerDisplay: `${formatDecimal(answer, lang)} ${UNIT}`,
      };
    }
    // Area: pi x r x r (always given the radius, the classic slip being d).
    const answer = Math.round(PI * r * r * 100) / 100;
    return {
      text: t("meetkunde.q_circle_area", { r, unit: UNIT }),
      answer,
      unitSuffix: `${UNIT}²`,
      visual: { kind: "circle", value: r, show: "radius" },
      angles: null,
      answerLabel: t("meetkunde.answer_label_decimal"),
      decimal: true,
      tolerance: 0.005,
      answerDisplay: `${formatDecimal(answer, lang)} ${UNIT}²`,
    };
  }
  if (coinFlip()) {
    // Every side a multiple of 10 cm, so the volume is a whole number of litres.
    const l = 10 * randInt(2, 8);
    const w = 10 * randInt(2, 5);
    const h = 10 * randInt(2, 5);
    return {
      text: t("meetkunde.q_tank_litres", { l, w, h }),
      answer: (l * w * h) / 1000,
      unitSuffix: "l",
      visual: { kind: "cuboid", l, w, h },
      angles: null,
      answerLabel: t("meetkunde.answer_label_litres"),
    };
  }
  const l = randInt(2, 10);
  const w = randInt(2, 8);
  const h = randInt(2, 8);
  return {
    text: t("meetkunde.q_surface", { l, w, h, unit: UNIT }),
    answer: 2 * (l * w + l * h + w * h),
    unitSuffix: `${UNIT}²`,
    visual: { kind: "cuboid", l, w, h },
    angles: null,
    answerLabel: t("meetkunde.answer_label"),
  };
}

function visuals(problem) {
  const v = problem.visual;
  if (v.kind === "circle") return [circleSvg(v.value, { unit: UNIT, show: v.show })];
  if (v.kind === "rect") return [rectangleSvg(v.w, v.h, { unit: UNIT })];
  if (v.kind === "triangle") return [triangleSvg(v.base, v.height, { unit: UNIT })];
  if (v.kind === "cuboid") return [cuboidSvg(v.l, v.w, v.h, { unit: UNIT })];
  // A compound shape is shown as its two rectangles side by side, which is
  // exactly the decomposition the question is asking the child to make.
  return [rectangleSvg(v.w1, v.h, { unit: UNIT }), rectangleSvg(v.w2, v.h, { unit: UNIT })];
}

export const render = typedAnswerGame({
  gameKey: GAME_KEY,
  emoji: "📐",
  questionEmoji: "📐",
  okIcon: "🏛️",
  badIcon: "🧱",
  tipKey: "meetkunde.why_tip",
  generate,
  visuals,
});
