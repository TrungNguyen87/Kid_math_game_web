/**
 * "Where should I go next?" (round 18) - the logic behind the home page's
 * next-challenge card and the level passport, kept out of the page so the
 * Node tests can check it.
 *
 * The request behind it: once a child has finished the easy levels, don't
 * let them keep playing those - but make moving up feel like an invitation.
 * The replay guard (state.js canEarnAtLevel()) already stops the coins; this
 * is the other half, pointing at the next thing that *does* pay.
 */
import {
  ARCADE_GAMES,
  GAME_KEYS,
  GROEP8_LEVEL,
  READING_GAMES,
  canEarnAtLevel,
  getLevel,
  getMaxLevel,
  isLevelCleared,
  nextPayingLevel,
  state,
} from "./state.js";

/**
 * The single best next step, in priority order:
 *   1. "climb" - a game sitting on a level already mastered: go up to the
 *      nearest level that still pays.
 *   2. "groep8" - a game at the old top (level 5) that has never been to
 *      groep 8: the new levels are waiting.
 *   3. "new" - a game never tried, reading and arcade games first (they are
 *      the new ones, and reading is what this round wants more of).
 *   4. "lowest" - otherwise, the tried game with the lowest level.
 * @returns {{kind: string, game: string, level: number}}
 */
export function nextChallenge() {
  for (const game of GAME_KEYS) {
    const level = getLevel(game);
    if (!canEarnAtLevel(game, level)) {
      const next = nextPayingLevel(game, level);
      if (next != null) return { kind: "climb", game, level: next };
    }
  }
  for (const game of GAME_KEYS) {
    const level = getLevel(game);
    if (state.gamesTried.has(game) && level === GROEP8_LEVEL - 1 && !isLevelCleared(game, level)) {
      return { kind: "groep8", game, level: GROEP8_LEVEL };
    }
  }
  const untried = GAME_KEYS.filter((game) => !state.gamesTried.has(game));
  const firstNew =
    untried.find((game) => READING_GAMES.has(game)) ?? untried.find((game) => ARCADE_GAMES.has(game)) ?? untried[0];
  if (firstNew) return { kind: "new", game: firstNew, level: getLevel(firstNew) };
  const lowest = [...GAME_KEYS].sort((a, b) => getLevel(a) - getLevel(b))[0];
  return { kind: "lowest", game: lowest, level: getLevel(lowest) };
}

/**
 * The level passport: per game, what each level is - "cleared" (mastered, a
 * stamp), "current" (where the child is now) or "open".
 * @returns {Array<{game: string, cells: string[], cleared: number}>}
 */
export function levelPassport() {
  return GAME_KEYS.map((game) => {
    const current = getLevel(game);
    const cells = [];
    for (let level = 0; level <= getMaxLevel(game); level++) {
      cells.push(isLevelCleared(game, level) ? "cleared" : level === current ? "current" : "open");
    }
    return { game, cells, cleared: cells.filter((c) => c === "cleared").length };
  });
}

/** The mastery log, newest first, for the parent dashboard. */
export function masteryLogNewestFirst() {
  return [...state.masteryLog].sort((a, b) => String(b.at ?? "").localeCompare(String(a.at ?? "")));
}
