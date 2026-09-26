/**
 * The one place the menu is defined.
 *
 * app.py built this list with st.Page(...) so the sidebar could be rebuilt
 * from t() on every rerun and follow the NL/EN toggle. Same idea here: labels
 * are keys, resolved at render time, so switching language relabels the menu
 * without a reload.
 *
 * The route paths match the url_path values app.py used, so a link a parent
 * bookmarked on the Streamlit version still lands on the right game here.
 *
 * `load` is a dynamic import: each game is fetched the first time it is
 * opened, so a child on school wifi downloads one game, not thirteen.
 */
export const NAV = [
  { path: "home", key: "nav.home", icon: "🎮", group: "start", load: () => import("./pages/home.js") },
  // Micro-lessons sit right under Start: the thing to suggest to a child who
  // only has five minutes. Not a levelled game, so no `game` key.
  { path: "leerhapjes", key: "nav.leerhapjes", icon: "🍪", group: "start", load: () => import("./pages/leerhapjes.js") },
  // The star road (round 19): what mastering levels has earned, and what the
  // next level up is worth. Not a game either.
  { path: "sterrenpad", key: "nav.sterrenpad", icon: "🌟", group: "start", load: () => import("./pages/sterrenpad.js") },

  // Arithmetic games, in the order a school year meets them.
  { path: "tafel", key: "nav.tafel", icon: "✖️", group: "reken", game: "tafel", load: () => import("./games/tafel.js") },
  { path: "breuken", key: "nav.breuken", icon: "🍕", group: "reken", game: "breuken", load: () => import("./games/breuken.js") },
  { path: "meten", key: "nav.meten", icon: "📏", group: "reken", game: "meten", load: () => import("./games/meten.js") },
  { path: "procenten", key: "nav.procenten", icon: "💯", group: "reken", game: "procenten", load: () => import("./games/procenten.js") },
  { path: "algebra", key: "nav.algebra", icon: "🕵️", group: "reken", game: "algebra", load: () => import("./games/algebra.js") },
  { path: "meetkunde", key: "nav.meetkunde", icon: "📐", group: "reken", game: "meetkunde", load: () => import("./games/meetkunde.js") },
  { path: "verhoudingen", key: "nav.verhoudingen", icon: "🚗", group: "reken", game: "verhoudingen", load: () => import("./games/verhoudingen.js") },
  { path: "getallen", key: "nav.getallen", icon: "🔢", group: "reken", game: "getallen", load: () => import("./games/getallen.js") },

  // Speed and logic games are grouped after the arithmetic ones, so the menu
  // reads as "practise, then play with what you practised".
  { path: "bliksemronde", key: "nav.bliksem", icon: "⚡", group: "denk", game: "bliksem", load: () => import("./games/bliksem.js") },
  { path: "getallenjacht", key: "nav.jacht", icon: "🎯", group: "denk", game: "jacht", load: () => import("./games/jacht.js") },
  { path: "logica", key: "nav.logica", icon: "🧠", group: "denk", game: "logica", load: () => import("./games/logica.js") },
  { path: "code", key: "nav.code", icon: "🔐", group: "denk", game: "code", load: () => import("./games/code.js") },

  // Reading and language (round 18).
  { path: "lezen", key: "nav.lezen", icon: "🔍", group: "taal", game: "lezen", load: () => import("./games/lezen.js") },
  { path: "woorden", key: "nav.woorden", icon: "🧙", group: "taal", game: "woorden", load: () => import("./games/woorden.js") },
  { path: "spelling", key: "nav.spelling", icon: "🌪️", group: "taal", game: "spelling", load: () => import("./games/spelling.js") },

  // Arcade games (round 18): sums or words, played by flying and jumping.
  { path: "fladdervogel", key: "nav.vlieg", icon: "🐦", group: "arcade", game: "vlieg", load: () => import("./games/vlieg.js") },
  { path: "sprongheld", key: "nav.sprong", icon: "🦸", group: "arcade", game: "sprong", load: () => import("./games/sprong.js") },
  // Round 19: an obstacle-tower climb and a kart race.
  { path: "lavatoren", key: "nav.toren", icon: "🌋", group: "arcade", game: "toren", load: () => import("./games/toren.js") },
  { path: "turbokart", key: "nav.kart", icon: "🏎️", group: "arcade", game: "kart", load: () => import("./games/kart.js") },

  // Puzzles and strategy (round 19): think a few moves ahead.
  { path: "rekendoku", key: "nav.doku", icon: "🧩", group: "puzzel", game: "doku", load: () => import("./games/doku.js") },
  { path: "tafeltactiek", key: "nav.tactiek", icon: "♟️", group: "puzzel", game: "tactiek", load: () => import("./games/tactiek.js") },
  { path: "pretparkbaas", key: "nav.park", icon: "🎡", group: "puzzel", game: "park", load: () => import("./games/park.js") },

  // No `game` key on purpose: it is not part of the curriculum (GAME_KEYS),
  // so it does not affect badges or the home page's overall-level bar, and a
  // home tile would show a level/progress bar this page has no use for. It
  // still gets a home-page link, next to rewards/uitleg/dashboard below.
  { path: "compete", key: "nav.compete", icon: "🏁", group: "more", load: () => import("./pages/compete.js") },

  { path: "rewards", key: "nav.rewards", icon: "🎁", group: "more", load: () => import("./pages/rewards.js") },
  { path: "uitleg", key: "nav.uitleg", icon: "📖", group: "more", load: () => import("./pages/uitleg.js") },
  // Kept last on purpose - the parent-facing page.
  { path: "dashboard", key: "nav.dashboard", icon: "📊", group: "more", load: () => import("./pages/dashboard.js") },
];

/** Menu sections, in order; "start" has no heading of its own. */
export const NAV_GROUPS = ["start", "reken", "denk", "taal", "arcade", "puzzel", "more"];

export const DEFAULT_ROUTE = "home";

export function findRoute(path) {
  return NAV.find((entry) => entry.path === path) || null;
}

/** Only the entries that are actual games (used by the home page tiles). */
export const GAME_NAV = NAV.filter((entry) => entry.game);
