/**
 * "What happens after an answer", in one place - the port of
 * utils/gameflow.py.
 *
 * In the Streamlit app only the four newest games used settle_answer(); the
 * original eight each carried their own inline copy of the same ~40 lines.
 * On this side every game goes through here, so scoring, logging, levelling,
 * badges and the celebration all behave identically no matter which game a
 * child is playing.
 */
import { checkNewBadges } from "./badges.js";
import { checkBuddyGrowth } from "./buddy.js";
import { chestReady, recordQuestProgress } from "./quests.js";
import { goalJustBecameReady } from "./rewards.js";
import { STAR_TIERS, starsForLevel, totalStars } from "./starroad.js";
import { logAttempt } from "./log.js";
import { t } from "./i18n.js";
import {
  GROEP8_LEVEL,
  MIN_LEVEL,
  READING_GAMES,
  addScore,
  addWordsRead,
  awardablePoints,
  clearLevel,
  countAttemptOnly,
  getLevel,
  getMaxLevel,
  registerAttempt,
  resetStreak,
  saveCurrentProfile,
  setLevel,
  state,
  touchPlayDay,
} from "./state.js";
import * as sound from "./sound.js";
import { bigCelebration, confetti, levelUpOverlay, toast } from "./fx.js";
import { levelLabel } from "./ui-bits.js";

/**
 * Record and react to one answered question.
 *
 * @param {object} options
 * @param {string} options.gameKey
 * @param {number} options.level
 * @param {string} options.questionText
 * @param {*} options.studentAnswer
 * @param {*} options.correctAnswer
 * @param {boolean} options.isCorrect
 * @param {number} options.points
 * @param {boolean} [options.adaptLevel=true]  false inside a timed round: a
 *   child answers a dozen questions in 60 seconds, and letting the difficulty
 *   climb three times mid-round would change the game under their feet.
 *   Those games adapt once, at the end, via adaptAfterRound().
 * @param {boolean} [options.score=true]  false for games that award their own
 *   points (a speed bonus, or a deduction game paying out only when the code
 *   is finally cracked).
 * @param {Element} [options.burstFrom]  element to fire the confetti out of.
 * @param {number} [options.wordsRead=0]  words in the text this question was
 *   about (reading games) - feeds the "words read" counter.
 * @returns {{leveledUp: boolean, leveledDown: boolean, pointsAwarded: number}}
 *   pointsAwarded is `points` reduced by the level-replay guard (see
 *   awardablePoints() in state.js) when `score` is true, or `points`
 *   unchanged when the caller already applied that guard itself (score:
 *   false, e.g. a timed game's own bonus scoring).
 */
export function settleAnswer({
  gameKey,
  level,
  questionText,
  studentAnswer,
  correctAnswer,
  isCorrect,
  points,
  adaptLevel = true,
  score = true,
  burstFrom = null,
  wordsRead = 0,
}) {
  // A game that scores its own points (score: false) has already run its
  // gained amount through awardablePoints() before calling this - gating it
  // again here would be a no-op at best. Only the common path needs it.
  const pointsAwarded = score ? awardablePoints(gameKey, level, points) : points;

  logAttempt({
    gameKey,
    gameName: t(`game.${gameKey}.name`),
    level,
    question: questionText,
    studentAnswer,
    correctAnswer,
    isCorrect,
    points: pointsAwarded,
  });

  let leveledUp = false;
  let leveledDown = false;
  let bonus = 0;
  if (adaptLevel) {
    ({ leveledUp, leveledDown, masteryBonus: bonus } = registerAttempt(gameKey, isCorrect));
  } else {
    // Still count the question and mark the game as tried, so the session
    // stats and the "explorer" badge stay honest - just without moving the
    // difficulty.
    countAttemptOnly(gameKey, isCorrect);
  }

  if (READING_GAMES.has(gameKey)) {
    if (isCorrect) state.readCorrect += 1;
    if (wordsRead > 0) addWordsRead(wordsRead);
  }

  if (isCorrect) {
    if (score && pointsAwarded > 0) addScore(pointsAwarded);
    sound.playCorrect(state.streaks);
    if (burstFrom) {
      const rect = burstFrom.getBoundingClientRect();
      confetti({ x: rect.left + rect.width / 2, y: rect.top, count: 34 });
    }
  } else {
    resetStreak();
    sound.playIncorrect();
  }

  if (leveledUp) {
    celebrateLevelUp(gameKey, bonus);
  } else if (leveledDown) {
    toast(t("common.level_down", { level: getLevel(gameKey) }), "💪");
  }

  // The longer-term rewards (round 17): today counts towards the play-day
  // streak whatever the answer, while quests only move on points actually
  // paid (see quests.js for why).
  touchPlayDay();
  const finishedQuests = recordQuestProgress({ gameKey, isCorrect, pointsAwarded });
  for (const quest of finishedQuests) {
    toast(t("quests.done_toast", { quest: questLabel(quest), coins: quest.reward }), "📜", 4200);
    sound.playBadge();
  }
  // The chest lives on the home page; say so the moment it unlocks, or a
  // child mid-game has no way of knowing it is waiting for them.
  if (finishedQuests.length && chestReady()) toast(t("quests.chest_ready_toast"), "🧰", 6000);
  const grown = checkBuddyGrowth();
  if (grown) {
    // After the level-up card if both happen on the same answer, not on top of it.
    setTimeout(() => {
      levelUpOverlay(t("buddy.grew_title"), t(grown.key), grown.emoji);
      sound.playFanfare();
    }, leveledUp ? 1900 : 250);
  }
  if (goalJustBecameReady()) {
    toast(t("goal.ready_toast"), "🎯", 5000);
  }

  announceNewBadges();
  saveCurrentProfile();
  return { leveledUp, leveledDown, pointsAwarded };
}

/**
 * Check every badge and celebrate the ones just earned. Exported because a
 * few badges are earned outside an answer - buying the tenth reward, opening
 * a chest - and those pages call this directly.
 */
export function announceNewBadges() {
  const newly = checkNewBadges();
  for (const [badgeId, emoji] of newly) {
    toast(t(`badges.${badgeId}.name`), emoji, 4200);
    sound.playBadge();
    confetti({ count: 40 });
  }
  return newly;
}

/** A quest's one-line description, e.g. "Answer 10 questions correctly". */
export function questLabel(quest) {
  const vars = { target: quest.target };
  if (quest.game) vars.game = t(`game.${quest.game}.name`);
  return t(`quests.kind_${quest.kind}`, vars);
}

/**
 * The level-up card, plus - the first time a level is mastered - the one-off
 * mastery bonus, the stars it put on the star road (round 19), and a toast
 * when that reached a new reward there. Shared by the per-answer path,
 * adaptAfterRound() and adaptAfterGame().
 */
function celebrateLevelUp(gameKey, bonus) {
  const newLevel = getLevel(gameKey);
  // A first mastery is exactly when clearLevel() paid a bonus; the level
  // mastered is the one just left behind.
  const stars = bonus > 0 ? starsForLevel(newLevel - 1) : 0;
  const subtitle = bonus > 0
    ? `${levelLabel(newLevel)} · ${t("mastery.bonus_line", { coins: bonus })} · ${t("starroad.earned_line", { stars })}`
    : levelLabel(newLevel);
  levelUpOverlay(t("common.level_up", { level: newLevel }), subtitle, newLevel >= GROEP8_LEVEL ? "🎓" : "⭐");
  sound.playLevelUp();
  bigCelebration();
  if (bonus > 0) {
    toast(t("mastery.toast", { level: newLevel - 1, coins: bonus }), "🏅", 4800);
    const now = totalStars();
    if (STAR_TIERS.some((tier) => tier.stars > now - stars && tier.stars <= now)) {
      toast(t("starroad.tier_ready_toast"), "🌟", 6000);
    }
  }
}

/**
 * Level a timed game up or down once, based on how the whole round went
 * rather than on a streak of individual answers.
 *
 * A round is the natural unit here: 9 of 10 right means "that was too easy"
 * far more reliably than three quick correct answers in a row does, since in
 * a speed game those three can just be three easy draws.
 *
 * @returns {{leveledUp: boolean, leveledDown: boolean, masteryBonus?: number}}
 */
export function adaptAfterRound(gameKey, correct, total, { upRatio = 0.8, downRatio = 0.4 } = {}) {
  if (total <= 0) return { leveledUp: false, leveledDown: false };
  const ratio = correct / total;
  const current = getLevel(gameKey);

  if (ratio >= upRatio && current < getMaxLevel(gameKey)) {
    setLevel(gameKey, current + 1);
    const bonus = clearLevel(gameKey, current);
    celebrateLevelUp(gameKey, bonus);
    announceNewBadges();
    saveCurrentProfile();
    return { leveledUp: true, leveledDown: false, masteryBonus: bonus };
  }
  if (ratio <= downRatio && current > MIN_LEVEL) {
    setLevel(gameKey, current - 1);
    toast(t("common.level_down", { level: getLevel(gameKey) }), "💪");
    saveCurrentProfile();
    return { leveledUp: false, leveledDown: true };
  }
  return { leveledUp: false, leveledDown: false };
}

// Per game: the level the last finished match or puzzle was played at, and
// how many of those in a row were lost there. Session-scoped, like the
// answer streaks in state.js.
const lossRuns = new Map();

/**
 * Level a puzzle or strategy game (round 19) after one finished puzzle,
 * match or day: a win levels up (and masters the level, exactly like a
 * streak does), a draw stays, and two losses in a row at the same level
 * step down. One lost match on its own never costs a level - a close game
 * against the computer is still a good game.
 *
 * @param {string} gameKey
 * @param {"win"|"draw"|"loss"} outcome
 * @returns {{leveledUp: boolean, leveledDown: boolean, masteryBonus?: number}}
 */
export function adaptAfterGame(gameKey, outcome) {
  const level = getLevel(gameKey);
  const run = lossRuns.get(gameKey);
  const losses = run && run.level === level ? run.losses : 0;
  if (outcome === "win") {
    lossRuns.delete(gameKey);
    return adaptAfterRound(gameKey, 1, 1);
  }
  if (outcome === "loss") {
    if (losses + 1 >= 2) {
      lossRuns.delete(gameKey);
      return adaptAfterRound(gameKey, 0, 1);
    }
    lossRuns.set(gameKey, { level, losses: losses + 1 });
  }
  return { leveledUp: false, leveledDown: false };
}
