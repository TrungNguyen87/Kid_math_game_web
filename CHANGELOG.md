# Changelog

All notable changes to this project are documented in this file.
The format is loosely based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added (round 18 - groep 8 levels, reading games, arcade games, learning bites, and a level passport)

The request: more levels and more kinds of play, up to **groep 8** of the
Dutch basisschool, for the maths *and* for reading; more interactive and
creative games (micro-learning, a flying game, a Mario-style jumping game) to
make children play and read more; and a log of the easy levels a child has
finished, so they stop replaying them - in a way that feels like
encouragement to go higher.

**Groep 8 levels (6 and 7) in every game**

- `MAX_LEVEL` is 7 for every game (`state.js`); Tafel Monster's special
  level-6 ceiling is gone. Level 6 is *Kampioen (groep 8)*, level 7
  *Legende (groep 8)*; the picker marks them with a dashed purple border and
  the badge shows 🎓. Eight levels fit on one row at 360px.
- New content at levels 6-7 for all twelve maths games: Tafel (squares of
  11-25, three-digit × one-digit, long division), Breuken (fraction ×
  fraction; unlike denominators such as 1/3 + 1/4), Meten (m², m³, dm³ = 1 l,
  decimal amounts; hours/minutes to minutes/seconds; small units back to big
  ones with a decimal answer), Procenten (part as a percentage, 21% btw,
  percentage increase/decrease, a year of interest), X-Mysterie (x on both
  sides, brackets, "two numbers together", a system with a coefficient),
  Meetkunde (circles with π = 3,14 and a new `circleSvg` visual, litres in a
  tank, surface area), Verhoudingen (sharing in a ratio, 1 : 25 000 maps in
  km, speed from minutes, recipes, m/s to km/h), Getallen (order of
  operations, rounding, negative × and :, powers, cubes and roots),
  Bliksemronde, Getallenjacht (cubes, factors of 96/120, multiples of 6 and 8,
  primes 50-99), Logica Lab (×2+k and growing sequences, cubes, a three-step
  balance, a mirrored magic square) and Code Kraker (all nine digits, then a
  five-digit code).
- `MASTER_LEVEL` (5) keeps every promise that was made at the old top: the
  mythic rewards still unlock at level 5, and the "level 5" and Reken Meester
  badges still mean level 5. Raising the ceiling moved no one's goal.

**Reading and language games** (content in `web/js/reading-data.js`)

- 🔍 **Leesdetective** - a short text and three questions about it. Levels
  0-1 are built from templates (a pet, a day out); levels 2-7 are 24
  hand-written texts in both languages (stories, a letter, instructions, news,
  an opinion piece, an advert). Every question names its **reading skill**
  (find it in the text, order, pointing words, cause, signal words, word
  meaning, main idea, fact or opinion, between the lines, purpose of the
  text), and a wrong answer explains that skill.
- 🧙 **Woordenschat Wizard** - picture words, opposites, synonyms, the
  word that fits, harder words, and at groep 8 *uitdrukkingen* and
  *spreekwoorden* (idioms and proverbs in English). 106 items per language.
- 🌪️ **Spellingstorm** - Dutch: d/t by lengthening, ei/ij and au/ou, one
  letter or two, -ig/-lijk/-heid/-tie, loan words, present-tense d/t/dt,
  past tense and participles with *'t kofschip*, and the groep 8 traps
  (*gebeurd/gebeurt*, *word jij* / *wordt hij*, *geverfd*). English:
  digraphs, magic e, tricky words, suffixes, homophones, and words adults
  misspell. 96 items per language; a wrong answer shows that level's rule.
- A **words read** counter (texts count once, when first shown), a lifetime
  count of reading questions right, and a new daily **reading quest**.

**Arcade games** (`web/js/arcade.js` plus a world per game)

- 🐦 **Fladdervogel** - tap to flap through gates with three openings; fly
  through the right answer. 🦸 **Sprongheld** - a runner that jumps up into
  the block with the right answer (a coin pops out), and from level 1 over a
  spiky slime after every row. The hero is the child's equipped character.
- Both have a **Sums / Words & spelling** switch, three lives, twelve
  questions a run, a combo multiplier, a personal record, and adapt their
  level once per run like the timed games. A wrong answer costs no life -
  crashing does - so reading calmly pays.
- The physics are plain data and a pure `step()`, so the Node tests fly and
  run them. The canvas is sized from the room actually left under the
  question, and on a phone on its side the question moves beside the
  playfield.

**Leerhapjes / Learning Bites** (`#/leerhapjes`, `bites.js`, `bites-data.js`)

- 24 one-minute lessons (12 maths, 12 language, groep 6-8): one idea, one
  worked example, three questions. 2 of 3 right puts the card in the album
  (15 coins), 3 of 3 makes it gold (+5); the **bite of the day** adds 10.
  Each pays once. Repeating is always possible and pays nothing.

**Finished levels: logged, and turned into an invitation**

- A dated **mastery log** (`state.masteryLog`) of every level a child
  levels up out of, and a one-off **mastery bonus** (10 + 5 × level coins,
  a gift like quest coins, never score). Sliding down and climbing back
  through the same level pays nothing again.
- The **level picker** marks mastered levels with a green ✓. Sitting on a
  mastered level shows a **nudge**: "you've mastered this level - on level N
  you earn coins again, plus a bonus when you master it", with a one-tap
  "Go to level N" button.
- The home page's **next challenge** card (`progress.js`) names the best
  next step: climb off a mastered level, the new groep 8 levels, a game never
  tried (reading first), or the lowest game. A **level passport** stamps
  every mastered level per game; tiles show one pip per level.
- The parent dashboard's new **mastered levels and reading** panel: levels
  mastered per game, a dated log, words read, reading questions right and
  bites collected.

**Everything else**

- Menu and home tiles grouped (Rekenen, Snel & slim, Taal & lezen, Arcade,
  Meer). Six new hero illustrations.
- 10 more badges (21 → 31): groep 8, legend, 10 and 40 levels mastered,
  25 reading questions right, 1,000 and 5,000 words read, arcade hero,
  5 bites and the full album. 7 more rewards (132 → 139), four of them only
  for level 6 or 7.
- Quests: the reading quest; the arcade games count for the speed quest;
  the reading games can be the featured game.
- Uitleg: groep 8 maths, reading strategies, idioms, spelling rules, arcade.
- Title, manifest and page description now say groep 6, 7 & 8 and reading.
- 271 new translation keys per language (816 → 1087), NL and EN.
- `web/sw.js` `PRECACHE`: 11 new files (61).

Tests:

- **`tests/web/test_mastery.mjs`** (19): levels 0-7 everywhere; the
  mastery bonus paid once, in coins not score, and **not farmable** by
  sliding up and down; manual picks master nothing; `nextPayingLevel`; the
  next-challenge priority; the passport; the round-18 fields surviving a
  reload; a pre-round-18 profile getting an undated log rebuilt; mythic items
  still at level 5 and the groep 8 items at 6/7; the new badges; the reading
  quest ignoring non-paying answers; Getallenjacht's groep 8 rules hitting
  exactly what their label says.
- **`tests/web/test_reading.mjs`** (13): every spelling, vocabulary, text,
  question and bite checked for an answer, distinct options, both languages
  and no HTML-breaking characters; template texts containing the right answer
  and never a wrong one; three questions per text and its words counted once;
  the bite of the day stable all day; a bite paying each reward once.
- **`tests/web/test_arcade.mjs`** (12): an autopilot scores 12/12 without a
  crash at every level of both games (every right answer is reachable); a
  wrong opening costs no life; falls and slimes do, and a run always ends;
  one answer per gate or row; a row never starts above the last slime.
- **`test_logic.mjs`**: generators run at levels 0-7 (and the three reading
  games join the shared contract); groep 8 algebra answers checked by
  substitution; circle answers recomputed from the picture; the two Tafel
  "max 6" tests rewritten for "every game max 7".
- **`smoke.mjs`**: 23 routes; the practice nudge after the replay scenario
  (mastered 0 and 1 marked, one tap to level 2); tile pips, next challenge and
  passport; the dashboard's mastery table; Leesdetective answered from the
  text (three questions about one text, its words counted once); a groep 8
  spelling mistake explaining 't kofschip; both arcade games' question *and*
  playfield on screen at 360x640, 390x844 and 844x390 with the longest
  questions; a Fladdervogel run ending by itself; the Sprongheld canvas
  animating, stopping and being left mid-run cleanly; a bite of the day paying
  30 coins once and staying gold after a reload.
- **`pages-sim.mjs`**: the new routes under the Pages sub-path (23).

Verified: `npm test` 167/167 (118 before); `npm run lint`; `node --check` on
all 53 files under `web/js`; `npm run check:precache` 61/61; `npm run
test:smoke` against a freshly started `node server.js`; `npm run test:pages`;
the deploy workflow's `BUILD_ID` stamp and `check_precache.py` re-run on a
scratch copy of `web/` and `tools/`. Proved to fail without the fix, then
restored: the not-farmable mastery bonus, the row spacing, the stable bite of
the day, the Getallenjacht prime label, the reading quest guard, and (smoke)
the arcade sizing at 360x640.

### Fixed (round 18 - found while building and testing this round)

None of these reached a child: each was in this round's own new code (or its
tests) and was fixed before committing. They are listed because each one is a
kind of mistake worth recognising next time.

- **The bite of the day could change during the day.** It was picked among
  the bites not yet collected, so collecting any other bite shrank the pool
  and moved the pick - and the promised +10 - to a different bite. It now
  picks among the bites open at the start of the day. Caught by a Node test
  before it shipped.
- **Sprongheld could spawn a row of blocks right above the previous row's
  slime** after an early bump on a row's first block, so jumping the slime
  bumped a block by accident. The next row now starts clear of both.
- **Getallenjacht's "primes between 50 and 99" rule** would also have
  counted 41, 43 and 47 (in the grid's range) as targets.
- **The arcade canvas overflowed small and landscape phones**: a fixed 170px
  budget for the question let a three-line word question push the
  playfield's bottom off a 360x640 screen, and a phone on its side lost the
  question off the top. Now measured, with three lines reserved and a
  side-by-side layout for short landscape screens.
- The smoke test's `.kmg-btn-primary` "first" selector would have clicked the
  new nudge button instead of the answer check; it is now scoped to the
  action bar.

### Fixed (round 17 - small bugs found by auditing every page, plus stale docs)

Found by opening every route in a real browser (desktop NL, phone EN in dark
mode) with a seeded profile and scanning the rendered text, rather than by
reading code. None of these threw an error; every one rendered wrong.

- **Every home tile of an already-played game ended in the word "null".**
  `home.js` built its tiles with `tile.append(..., tried ? null : badge)`,
  and `Node.append()` prints a `null` child as text. This is the exact bug
  session 6 fixed with `dom.js`'s `append()` helper, back in a spot that
  never used the helper. The tiles now use `append()`.
- **Tafel Monster's tile read "Level 6/5" with its bar at 120%**, and the
  home page's overall-progress percentage could pass 100%, because both
  assumed every game stops at `MAX_LEVEL` (5). Tafel goes to 6. Both now use
  `getMaxLevel(game)`. Maxed games also get a small 👑 on their tile.
- **Tafel Monster's level picker wrapped its "6" onto a second row.** The
  picker was a fixed six-column grid. It now sets one column per level
  (`--kmg-levels`, which only works since round 14's `el()` fix).
- **`index.html`'s `apple-touch-icon` pointed at `icons/icon-180.png`, which
  does not exist.** It 404s on GitHub Pages; `server.js` masked it by
  answering every unknown path with `index.html` and a 200, so no test ever
  saw it. It now points at `icon-256.png` (iOS scales it). A new
  `npm run test:pages` check (see below) catches this class of bug.
- **The home page announced "your name is saved" on every visit**, not just
  when the name changed. It now only appears when the player changes.
- **The first-visit Start button sat at the very bottom of the home page.**
  It is now directly under the name box.
- `adaptAfterRound()` compared against `MAX_LEVEL` instead of the game's own
  maximum. Harmless today (only the speed games call it, and they stop at 5),
  but wrong the moment a game with its own maximum used it.
- The name label pointed at `for=""`; it now labels its input.
- **README and `docs/DEPLOYMENT.md` gave the wrong live URL**
  (`…/Kids_Math_Games/`). The deploy log's own environment URL is
  `https://trungnguyen87.github.io/Kid_math_game_web/`; all links corrected.
  README also still described a Streamlit front-end and `utils/i18n.py` that
  were removed long ago, and `i18n-data.js`'s header said "GENERATED FILE -
  do not edit", naming a generator that no longer exists. All corrected:
  `i18n-data.js` is the hand-edited source of truth.

### Added (round 17 - a buddy that grows, daily quests and a treasure chest, colour themes, a savings goal, 52 more rewards, 13 more badges, a feedback email)

The request was to make learning more attractive: more gifts, characters and
rewards, and a better reward system. The shop already had plenty to *buy*;
what it lacked was reasons to come back tomorrow and things that show
progress beyond a coin balance. Everything below follows one rule: none of it
may become a way around the level-replay guard (rounds 15-16).

- **Rekie, the maths buddy** (`web/js/buddy.js`): hatches from an egg and
  grows through 8 stages into a cosmic dragon (🥚 🐣 🦎 🐲 🐉 and three glowing
  dragon forms), shown on the home page with a speech bubble and a progress
  bar. It grows on `totalScore`, which only rises for answers that actually
  paid, so it cannot be fed by replays, bonus coins or spending. Growth is
  announced once per stage with a full-screen card. Profiles saved before
  this round start at the stage their score already earned, silently.
- **Daily quests and a treasure chest** (`web/js/quests.js`): three small
  quests a day, one from each slot (effort: answer 10-15 right or earn 80-150
  points; skill: 5 or 8 in a row, or 40 points in a speed game; variety:
  points in 3-4 different games, or 5 right in *today's featured game*).
  Each pays 20-35 bonus coins; all three unlock the day's chest: 40 coins plus
  one **treasure**. The day's quests are a pure function of the local date.
  **Quests only move on answers that paid points**, so a replay at a cleared
  level can never finish a quest and pay out.
- **Treasures**: a 12-item collection that is never for sale (`cost: null`,
  `chestOnly`). Each chest holds one the child does not have yet, every
  unfound one equally likely, never a duplicate; once all are found a chest
  pays 100 coins instead. Unfound treasures show as a dark silhouette.
- **Colour themes**: a new shop category that *does* something: equip one
  and the whole app recolours (Classic Orange (free), Ocean, Forest, Candy
  Shop, Outer Space, Rainbow, Royal Gold), with separate light and dark
  variants. Implemented by re-pointing the accent tokens under
  `:root[data-theme]`; `rewards.js` `applyTheme()` also tints the browser
  chrome.
- **A savings goal**: tap 🎯 on any item in the shop to save up for it. It
  shows in the sidebar (with a mini bar), on the home page and in the shop's
  balance box; a toast says when it becomes buyable, and buying it clears it.
- **A days-in-a-row streak**, counted on the child's local calendar day.
- **52 more rewards** (80 → 132): 13 characters (49 total, incl. two new
  original Mythic heroes, Sakura Samurai and Nebula Phoenix), 12 stickers
  (46), 8 gifts (18), 7 themes, 12 treasures.
- **13 more badges** (8 → 21): 20 in a row; 3, 7 and 30 days in a row; first
  quest; first and tenth chest; 10 and 30 rewards collected; 1,000 and 5,000
  points; Rekie becomes a dragon; level 3 in every game. The home page shows
  "N of 21 earned" and lists earned badges first.
- **16 rotating praise lines** under every correct answer in the typed and
  logic games, so the 20th correct answer doesn't get the same banner as the
  first.
- **The shop**: a jump bar to each collection, items you can buy right now
  shown in full colour with a green ring and "Buy now!" (instead of dimmed
  like everything locked), a shorter "Buy · 40 🪙" button that no longer
  wraps, and no duplicate price line.
- **The phone top bar shows coins** next to the score.
- **Parent dashboard**: a "rewards and motivation" panel (days in a row,
  quests and chests, collection, buddy stage) that also explains the two
  rules that keep it honest.
- **Feedback email: nxtrung87@gmail.com** — a "✉️ Idea or bug? Email us"
  link in the menu, a feedback card on the home page and on the dashboard
  (a `mailto:` link with subject and a short prompt filled in; nothing is sent
  unless someone presses send), and a Feedback section in the README.
- The shell batches the several state changes one answer fires into one
  sidebar repaint (`queueMicrotask`), and `applyProfile()`/`clearAllProfiles()`
  now share one `resetPlayerFields()` instead of two copies that could drift.
- 160 new translation keys per language (656 → 816), NL and EN.
- `web/sw.js` `PRECACHE`: `buddy.js` and `quests.js` added (50 files).

Tests:

- **`tests/web/test_progression.mjs`** (25 new Node tests, 118 total): local
  day and DST arithmetic; the play-day streak; bonus coins not touching score;
  quests deterministic, every quest reachable, reset daily, paying once;
  **a non-paying answer never moves a quest**; featured/speed/games/streak
  quests; chest gating, once a day, no duplicate treasures across all 12, the
  all-found prize; treasures unbuyable at any coins/level; themes (equip,
  switch, CSS block per theme); savings goal; buddy stages and one-time
  announcement; every new field surviving a save/reload; a pre-round-17
  profile loading with defaults and no surprise announcement;
  `clearAllProfiles()` resetting the new fields; new badges; copy for every
  constructed key; the feedback `mailto:`.
- **`tests/web/smoke.mjs`**: Tafel's picker on one row; home tiles free of
  `null`/`undefined`/`NaN` and counting Tafel out of 6; today's quest progress
  unchanged by the level-replay answer; and a new phone-sized `progression`
  scenario (buddy and three quests render, no chest before the quests are
  done, the chest pays 40 coins and a treasure and stays opened after a
  reload, a bought theme recolours the app and survives a reload, a pinned goal
  shows in the sidebar and survives a reload, no sideways scroll, the feedback
  link is present). The two "exactly one equipped card" checks are now scoped
  to the characters section: the free theme is equipped too, so an unscoped
  check would have passed even with no character equipped.
- **`npm run test:pages`** (`tests/web/pages-sim.mjs`, new): stamps a temp
  copy of `web/` exactly as the deploy workflow does, serves it statically
  under `/Kid_math_game_web/` with real 404s (no fallback), and opens every
  route, checks every linked file and manifest icon, the stamped
  service-worker cache name, and an offline reload.
- Proved to fail without the fix: the quest guard, the no-duplicate chest and
  the silent buddy sync (each reverted, one Node test failed for the right
  reason, restored); the home-tile, Tafel "/6" and picker-row smoke checks
  (reverted both fixes: three failures, "…Warming-upnullnull" among them);
  `test:pages` (put `icon-180.png` back: a 404, while `server.js` still
  answered 200).
- Verified: `npm test` (118/118), `npm run lint`, `node --check` on all 42
  files under `web/js`, `npm run check:precache` (50/50), `npm start` +
  `npm run test:smoke` (all 17 routes and every scenario clean),
  `npm run test:pages` (clean), and the deploy workflow's two real steps
  (`BUILD_ID` stamp, `check_precache.py`) re-run on a scratch copy of `web/`
  and `tools/`. `deploy-pages.yml` itself is untouched; every recent run on
  `main` succeeded (checked via the Actions API).

### Changed (round 16 - the level-replay guard now covers every level, not just Warm-up/Easy)

**Round 15's guard only stopped a child farming Warm-up and Easy (levels
0-1); every other level still paid coins on every replay.** The request was
"for all levels, not just 0 and 1" - the guard is now the same rule applied
uniformly: any level pays reward coins/score the first time a child levels
all the way through it, and a later replay of that same level (a slip back
down, or picking it again from the level picker) pays nothing more,
whichever level it is.

- **`state.js`**: `EASY_LEVEL_MAX` and the single per-game
  `easyLevelCleared` boolean are gone. `state.clearedLevels` now tracks, per
  game, the actual *set* of levels a child has leveled all the way through
  (a `Set` per game key, serialized to a sorted array when a profile is
  saved and restored the same way `unlockedRewards` already is).
  `canEarnAtLevel()` checks that set directly instead of comparing against a
  fixed cutoff. `graduateIfCrossedEasyTier(gameKey, fromLevel, toLevel)` is
  replaced by the simpler `clearLevel(gameKey, level)`, called with exactly
  the level being left behind - still only from the automatic leveling paths
  (`registerAttempt()`'s streak logic, `adaptAfterRound()` in
  `gameflow.js`), never from a manual `setLevel()` call, for the same reason
  round 15 found the hard way (see its own entry above).
- **The one level this can never gate in practice is a game's own top level**
  (`MAX_LEVEL`, or Tafel Monster's 6): there is nowhere higher to level up
  into, so `clearLevel()` never fires for it and it always pays - a child who
  has reached the hardest content in a game is still doing the hardest
  content, not replaying something easier. This was true by construction
  once the guard became "the level being left behind", not something added
  as a special case.
- **`common.practice_no_bonus`** (both languages) no longer says "this easy
  level" - it now reads "this level", since the note now shows up at any
  level the guard applies to, not just Warm-up/Easy.

- Tests: the Node tests from round 15 are rewritten for the general case -
  leveling through 0, 1 *and* 2 in one test and confirming all three become
  unpayable replays afterwards (not just the two "easy" ones), a new test
  that a game's own top level keeps paying after 50 more correct answers
  there, and the manual-pick and reload-persistence tests carried over with
  the renamed API. Confirmed the two behavioural tests fail against a build
  with the old `level > 1` cutoff reintroduced, and pass again once removed.
  `tests/web/smoke.mjs`'s reward-shop scenario (renamed
  `rewards:level-replay`) is unchanged in what it exercises - level 0 was
  already a valid case of the general rule - just renamed and re-commented
  to stop implying the guard is easy-level-specific.
- Verified: `npm test` (93/93), `npm run lint`,
  `find web/js -name "*.js" | xargs -n1 node --check`, `npm run
  check:precache` (48/48, unchanged), `npm start` + `npm run test:smoke`
  (all 17 routes and every scenario clean), and the deploy workflow's two
  real steps re-run locally against a scratch copy of `web/` and `tools/`.
  `deploy-pages.yml` itself is untouched, and nothing outside `web/`
  (the test suite) reaches the live GitHub Pages deploy.

### Added (round 15 - the easy level only pays out once, plus a "Special Gifts" collection and 31 new characters/stickers)

**A child could sit at the easiest questions forever and coins would keep
coming.** Warm-up and Easy (levels 0-1) now pay reward coins/score the first
time a game is worked through - exactly enough to level up and out of them -
but once that has happened, coming back to an easy level again (a slip back
down after two wrong answers, or picking it again on purpose from the level
picker) still counts for practice and progress, just no more coins. Levels
2 and up are never touched by this: the guard only ever applies to the two
tiers a child can answer almost without thinking.

- **`state.js`**: `EASY_LEVEL_MAX` (1), a per-game `easyLevelCleared` flag
  persisted with the rest of the profile (same as levels/badges/coins),
  `canEarnAtLevel()`/`awardablePoints()` to check it, and
  `graduateIfCrossedEasyTier(gameKey, fromLevel, toLevel)` to set it.
  Deliberately **not** wired into `setLevel()` itself - see "found along the
  way" below for why that first attempt broke the reward shop's own smoke
  test. It is called only from the two places a level-up is actually earned:
  `registerAttempt()`'s streak logic and `adaptAfterRound()`
  (`gameflow.js`), never from a manual level-picker click.
- **`gameflow.js`**: `settleAnswer()` runs `points` through `awardablePoints()`
  before crediting anything (when `score: true`) and now returns the actual
  `pointsAwarded`, so the log and the parent dashboard show what was really
  paid out, not the nominal amount. The three games that score their own
  points before calling `settleAnswer()` with `score: false`
  (`bliksem.js`, `jacht.js`, `code.js`) gate their own `addScore()` calls the
  same way, and skip the "+N" popup entirely when the guard pays nothing -
  a floating "+0" would read as a bug rather than a rule.
- **`common.js`** (the 8 typed-answer games) and **`logica.js`** now show a
  short practice note (`common.practice_no_bonus`, both languages) alongside
  the normal correct-answer feedback whenever the guard reduced the payout,
  so a child (or a parent watching) sees *why* the coins didn't move instead
  of it looking broken.

**Found along the way: the first version of this graduated every game the
moment its level picker was clicked past Easy, not just when a real streak
earned it - and the project's own smoke test caught it.** The natural-looking
place to mark "graduated" was inside `setLevel()` itself, since that is what
both an automatic level-up and a manual level-picker click both call. But the
reward-shop smoke test scenario forces a game back to level 0 via two
level-picker clicks (`0 -> 2 -> 0`) to get a clean, predictable state before
scripting six correct answers - and that manual round-trip alone satisfied
"leveled past Easy, then back down", permanently blocking the very first
honest coin payout the scenario needed. Re-ran `npm run test:smoke` after the
first version and watched it hang on a 30-second timeout waiting for an
affordable reward card that could no longer exist. The fix: graduation is now
set by `graduateIfCrossedEasyTier()`, called only from the two *automatic*
leveling paths (`registerAttempt()`, `adaptAfterRound()`) - never from
`setLevel()` directly - so browsing the level picker, or a parent/older
sibling trying a harder level for fun, can never cost a child their first
real payout. A Node test pins this down directly
(`a manual level pick across the easy-tier boundary does not graduate the
game`), confirmed to fail against the first version before the fix and pass
after.

**A "Special Gifts" collection, plus 10 more characters and 11 more
stickers**, at the higher levels the request specifically asked to
encourage. The reward catalog was 49 items (26 characters, 23 stickers)
across 7 tiers; it is now 80 (36 characters, 34 stickers, and a new **10-item
Special Gifts** collection - trophies, medals and keepsakes rather than a
character or a sticker) across the same tiers and the same level/mastery
gates, so the shop's "how special is this" reading stays consistent across
all three collections. New characters and stickers are spread across every
tier from Uncommon through Mythic (two new Mythic characters -
"Tsunami Blade Master" and "Frostfang Wolf Spirit" - and two new Mythic
stickers, continuing the original-anime-hero design from round 8; no real
franchise characters, same reasoning as before). `web/js/pages/rewards.js`
needed no new rendering logic at all - its `CATEGORIES` list and generic
`section()`/`rewardCard()` functions already treat any category as "unlock
with coins, gated by tier/level/mastery", so "gift" slotted in as a third
entry next to "avatar" and "sticker".

- Tests: two new Node tests directly exercise the easy-level guard's actual
  behaviour (pays out once, blocks a replay after a real graduation, and
  specifically that a manual level pick never graduates on its own) plus a
  reload round-trip proving `easyLevelCleared` survives a saved profile
  exactly like levels and coins do; a reward-catalog test that every id is
  unique and every `nameKey` resolves to a real translation in both
  languages (this would have caught a copy-paste mistake in the 31 new
  entries); a new browser scenario in `tests/web/smoke.mjs`
  (`rewards:easy-replay`) that forces tafel back to level 0 after the
  existing reward-shop scenario already graduated it for real, answers one
  more correct question, and asserts the score, the coins, and the feedback
  banner all agree that nothing extra was paid. All three new checks were
  reverted-and-confirmed-failing before landing: the state.js tests against
  the first (`setLevel()`-based) version of the guard, and the smoke
  scenario against a build with the guard's `awardablePoints()` call bypassed
  entirely (it reported all three: no practice note, score 50→55, coins
  10→15).
- Verified: `npm test` (92/92, up from 85), `npm run lint`,
  `find web/js -name "*.js" | xargs -n1 node --check` (every dynamically
  imported page/game module parses - `npm run lint` alone does not reach
  them, per session 8's note), `npm run check:precache` (48/48 files,
  unchanged list - no files were added or removed), `npm start` +
  `npm run test:smoke` (all 17 routes, every existing scenario, and the new
  `rewards:easy-replay` scenario, all clean), and the deploy workflow's two
  real steps (`BUILD_ID` stamp, `check_precache.py`) re-run locally against a
  scratch copy of `web/` and `tools/`. `deploy-pages.yml` itself is
  untouched.

### Fixed (round 14 - local Race Mode multi-touch, on an actual phone this time)

**Round 13's multi-touch fix was real but incomplete, and the check that
passed it was run at the wrong screen size.** On a 390x844 phone, local
("together on this device") Race Mode laid the player cards out in a single
column - `.kmg-race-arena`'s `repeat(auto-fit, minmax(15rem, 1fr))` fits one
column below about 600px - underneath the page's own heading and its "how
this works" intro, which together are about 430px tall. Player 1's card ran
from y=520 to y=870; **player 2's card started at y=884, below the bottom of
an 844px screen.** No amount of correct event handling helps a button that is
not on the screen: the second child had to scroll to their own card, and once
they did, the first child's was gone. That is the literal shape of "only one
person can touch the screen at a time", and it survived round 13 untouched
because round 13's regression check ran in a 1280x900 desktop context with
`hasTouch: true` bolted on - a width where the two cards sit side by side
and everything already worked.

Reproduced first, then fixed:

- **The page's chrome gets out of the way during a race.** `compete.js` now
  hides the page heading and the intro block while the play view is up, and
  sets `body.kmg-racing` so the stylesheet can also reclaim `.kmg-main`'s
  5rem of bottom padding (an ancestor the arena cannot reach from its own
  selector). Both come back on the setup and results screens and when
  leaving the page mid-race.
- **The arena is a fixed two-column grid at phone widths**, with compact
  card padding, question and button sizing, instead of the wrapping
  `auto-fit` default. Two, three, four, even all six players fit on one
  390x844 screen with nothing to scroll. A short viewport (landscape phone)
  gets the same compaction plus a single row of `--kmg-race-players`
  columns, since there width is the plentiful dimension and height is not.
- **The leftover screen goes to the buttons.** Each card stretches into the
  space the intro used to occupy, up to a cap, so a choice button on an
  iPhone 12 is about 77x144 CSS px rather than 77x48. Bigger targets are the
  whole point when two children are jabbing at one phone at once.
- **`touch-action: none` on the local arena and its buttons**, plus no text
  selection and no long-press callout, so a second finger landing while the
  first is still down cannot be reinterpreted by the browser as a pan or a
  pinch-zoom (which is what suppresses or cancels the events the second
  player's tap rides on). This is only safe because the arena now fits the
  screen - there is nothing inside it left to scroll past.
- **A third input path: one `touchstart` listener on `document`** that walks
  `changedTouches` and submits for every finger that landed on a choice
  button. When several touches arrive in the same input frame a browser is
  allowed to deliver a *single* `touchstart` carrying all of them, dispatched
  at the first touch's target - a listener on the other player's button would
  never fire at all. `click` (mouse, keyboard, assistive tech) and round 13's
  `pointerdown` both stay; answering is idempotent per player per round, so a
  tap arriving three ways is still one answer.

**`el()` could not set CSS custom properties at all** (`web/js/dom.js`). A
CSS variable is not a `CSSStyleDeclaration` field, so
`Object.assign(node.style, {"--kmg-cols": "3"})` quietly set a plain JS
property on the style object and changed nothing on the page. Every
`--kmg-cols` in the codebase had been silently falling back to its CSS
default since it was introduced, which is why a 5- or 6-option choice grid
rendered as two columns where `ui.js`, `games/common.js` and `games/logica.js`
all ask for three. Custom properties now go through `setProperty()`. Measured
the newly-three-column grids at 320, 360 and 390px wide: the smallest button
is 90x138, comfortably over the 44px minimum target. (`getallenjacht`'s
5-column hunt grid is unaffected - its value matched the CSS fallback.)

- Tests: `tests/web/smoke.mjs`'s `compete:local:multitouch` scenario is
  rebuilt around a real phone context (390x844, `isMobile`) instead of a
  desktop viewport, and now checks the three things that have to hold
  together - every player's answer button on screen, the play view not
  scrolling, and a genuinely simultaneous two-finger CDP
  `Input.dispatchTouchEvent` registering both answers - plus a second pass
  with `click` and `pointerdown` suppressed at the capture phase, so the
  `touchstart` path is proved to carry its own weight rather than being
  shadowed by the other two. Confirmed by reverting `compete.js` and
  `app.css` to the previous commit and re-running: all four assertions fail,
  naming the off-screen card and the 1298px-of-content-in-an-844px-screen
  directly.
- Verified: `npm test` (85/85), `npm run lint`, `npm run check:precache`
  (48/48 files, unchanged file list), `npm run test:smoke` against
  `node server.js` (17 routes, both race modes, the new phone multi-touch
  checks, service worker and offline reload - all clean), and the deploy
  workflow's two real steps (`BUILD_ID` stamp, `check_precache.py`) re-run
  locally against a scratch copy of `web/` and `tools/`. Beyond the suite:
  the fix was measured at 320x568, 360x640, 390x844, 844x390 landscape and
  768x1024, with 2, 3, 4 and 6 players, checking in each case that every
  answer button is inside the viewport, that nothing scrolls, and that no
  button falls below 44px. `deploy-pages.yml` is untouched.

### Fixed (round 13 - local Race Mode multi-touch, reward coins no longer capped per day)

**Two players tapping two different cards on one shared tablet at the same
instant could lose a tap.** Local ("together on this device") Race Mode
answered each `.kmg-choice` button on a `click` event. A touch browser only
ever synthesizes a mouse-compatibility `click` for the *first* finger it
sees in a multi-touch gesture - a real platform limitation, not a bug in
this app's event wiring alone - so a genuinely simultaneous second tap on a
different player's card could silently do nothing, which is what "no multi
touch support" actually meant. `web/js/pages/compete.js`'s local-race answer
buttons now also listen on `pointerdown`, which the Pointer Events spec
fires once per active touch point independently of any other finger already
down elsewhere on the screen - exactly the mechanism built to solve this
class of problem. `handleLocalAnswer()` already guarded on "this player
already answered", so also receiving the `click` that follows for whichever
finger the browser treats as primary is harmless; the `onClick` handler is
left in place for mouse and keyboard/assistive-tech activation.

Proving this needed more than Playwright's default `.click()`, which
dispatches ordinary mouse events - sequential taps already worked before
this fix, so a test built on them would not have caught the bug. A
JS-dispatched `PointerEvent("pointerdown", {pointerType: "touch"})` turned
out not to prove it either: Chromium synthesizes a compatibility `click`
from a script-dispatched touch pointerdown regardless of whether a second
finger is already down, so that approach passed even with the fix reverted
- a false-pass that would have made the test worse than none. The real
regression check (`tests/web/smoke.mjs`, `compete:local:multitouch`) uses a
dedicated `hasTouch: true` browser context and the low-level CDP
`Input.dispatchTouchEvent`, sending both touch points down in one call
through Chromium's actual touch input pipeline - confirmed, by temporarily
reverting the fix and re-running, to fail exactly as expected when the bug
is present and pass once it is fixed.

**Reward coins no longer reset or get discarded day to day.** `state.js`
capped *spendable* coins at 300 earned per calendar day since round 8, to
stop one long session from clearing the whole shop. In practice that cap
silently discarded every point earned past it for the rest of that day -
score kept climbing, but the reward balance simply stopped moving until the
next day - which is what read as "the reward resets every day" and left a
child unable to save up enough for the pricier tiers. `DAILY_COIN_CAP`,
`coinsEarnedToday`/`coinsEarnedDay` and `remainingDailyCoins()` are removed;
`addScore()` now grants coins 1:1 with points, same as `totalScore`, with no
cap and nothing ever rolled back. The reward shop's "coins earned today"
progress strip is removed along with it (`web/js/pages/rewards.js`, the
`rewards.daily_cap_*` i18n keys, the `.kmg-reward-daily*` CSS) since there is
no longer a daily limit for it to show. The unlocked collection
(`unlockedRewards`) and the coin balance itself were already persisted
correctly across days before this change - saved with the rest of the
player's profile in `localStorage`, restored on every reload - so nothing
needed fixing there; verified with a new Node test that round-trips a
profile with coins and an unlocked item through `saveCurrentProfile()` /
`applyProfile()` via an in-memory `localStorage` shim (Node itself has none,
which is also why no existing test in this suite exercised that path
before). Tiered pricing (40 to 8000 coins) is unchanged - only the earning
side, not the goal itself.

- Tests: `tests/web/test_logic.mjs`'s daily-cap tests are replaced with one
  that grants a single 10,000-point haul and confirms it is banked in full,
  and one that round-trips coins and the collection through a save/reload
  with no day-based reset (85 tests total, unchanged count - two removed,
  two added). `tests/web/smoke.mjs` drops the now-gone daily-cap strip
  assertion and adds the `compete:local:multitouch` scenario described above.
- Verified: `npm test` (85/85), `npm run lint`, `npm run check:precache`
  (48/48 files), `npm run test:smoke` against `node server.js` (all 17
  routes plus every scripted scenario, including the new multi-touch check),
  and the deploy workflow's two real steps (`BUILD_ID` stamp,
  `check_precache.py`) re-run locally against a scratch copy of `web/` -
  all clean. `deploy-pages.yml` itself is untouched, and nothing outside
  `web/` (server.js, race-server.js, the test suite) reaches the live
  GitHub Pages deploy at all.

### Reverted (round 12 - roll back the WebRTC Direct connection mode)

**Round 11's Direct connection mode (manual SDP offer/answer, QR codes, a
`RaceRoomManager` running inside the host's own tab) is reverted in full,**
by reverting merge commit `8b449e9` (`git revert -m 1`, a clean revert with
no conflicts, not a history rewrite). It worked and was verified against a
GitHub-Pages-shaped static server, but the handshake - offer text or QR,
paste an answer back, wait for ICE - was judged too complex a flow to keep
in an app aimed at a child's parent setting up a race, versus the round 10
alternative of just running a self-hosted server. See SESSIONS.md session
11 for the full reasoning.

- Removed: `web/js/webrtc-signal.js`, `web/js/webrtc-race-client.js`,
  `web/js/qrcode.js`, `web/js/race-room-engine.js`, the "📶 Direct" /
  "🖧 Via a server" connection-method choice in `web/js/pages/compete.js`,
  the 26 `compete.*` i18n keys it added, its `web/css/app.css` rules, and
  its four entries in `web/sw.js`'s precache list.
- Restored: `race-server.js`'s `RaceRoomManager` (previously split out into
  `race-room-engine.js`), and `web/js/pages/compete.js`'s online mode as a
  single WebSocket `RaceClient` flow, same as round 10 - self-hosted
  (`npm start`) only, same as before round 11 existed.
- Verified after the revert: `npm test` (85 Node tests, the round 10
  baseline count), `npm run lint`, `python3 tools/check_precache.py`
  (48/48 files, matching round 10), and the deploy workflow's two real
  steps (`BUILD_ID` stamp, `check_precache.py`) run locally - all pass with
  no changes needed, since nothing landed on top of round 11 to depend on
  it. `deploy-pages.yml` itself is untouched.

### Changed (round 10 - Race Mode redesign: real multiplayer, side by side, no check button)

**Round 9's race worked, but it was still one person at a time** - a solo
run, or a finished race forwarded as a link for the next person to try
afterwards, never simultaneously. Racing someone meant waiting for their
turn. This round replaces that with an actual race: several players answer
the *same* question at the *same* time, side by side, either online through
a short join code or together on one shared device - and every answer is a
single tap, because a multiple-choice question doesn't need a separate
"check" step (the rest of the app already made this move once, in
Bliksemronde).

- **A real join code, not a finished-results code.** The old "challenge
  code" only existed *after* a race was over - it was someone's completed
  run, forwarded for the next person to beat asynchronously. The new code is
  issued the moment a race is *created*: a host opens a room, gets a 5-char
  code, and anyone who enters it (or opens the matching link) joins a live
  lobby before a single question is asked.
- **Side by side, for real.** Locally, up to `MAX_PLAYERS` (6) people share
  one device, each with their own card and choice grid, answering the same
  question in parallel - not pass-the-device-after-your-turn. Online, every
  device shows a live scoreboard strip that updates the instant *any* player
  answers, not only once the race is over.
- **No check button.** Every category now generates a multiple-choice
  question (`options`, four choices including the answer); tapping one *is*
  the submission. The old typed-number-plus-"Controleer"-button flow is
  gone, same as Bliksemronde never had one.
- **More than one kind of game in a single race.** `category` picks what a
  round draws from - lightning arithmetic (the original mix), times tables,
  fraction addition, percentage-of, or a shuffled mix of all four - so a
  10-question race can move between game types round to round instead of
  being arithmetic-only.

**Why a real server, and why that's still fine for a GitHub Pages app.**
Side-by-side *online* play needs something authoritative keeping everyone's
clock and question in sync - that can't be done by mailing a finished
result back and forth. `race-server.js` is a small room manager (WebSocket
first, REST polling as a fallback for a network that blocks the socket
upgrade) mounted into `server.js`. It only runs when the app is
self-hosted (`npm start`) - `deploy-pages.yml` uploads the `web/` folder
only, so this never touches the live GitHub Pages deploy and can't break
it (verified: the workflow's two real steps, stamping `BUILD_ID` into
`web/sw.js` and `tools/check_precache.py`, both still pass). On GitHub
Pages itself, online play's `fetch`/`WebSocket` calls simply fail and the
page says so (`compete.server_unavailable`) rather than hanging - Local
mode needs no server at all and always works.

- **`web/js/race-logic.js`** replaces `web/js/compete.js` - the engine, no
  DOM: per-category question generators (`generateRaceProblem`,
  `makeChoices` for the multiple-choice distractors), `racePoints()`
  (unchanged scoring curve, 100 down to 10, wrong is always 0),
  `generateRoomCode`, `cleanPlayerName`, `rankPlayers` (now for any number
  of players, not just two). The old `encodeChallenge`/`decodeChallenge`
  base64url machinery is gone with the flow it supported.
- **`race-server.js`** (new) - the room engine: `waiting → countdown →
  in_round → round_recap → finished`, generalized to a `players` array of
  any length (`MIN_PLAYERS_ONLINE` 2 to `MAX_PLAYERS` 6) rather than a fixed
  pair, broadcasting every round and recap to everyone in the room.
- **`web/js/pages/compete.js`** rewritten: mode tabs (🌐 online with a code /
  📱 together on this device), the online create/join lobby, the local
  roster editor, the synchronized countdown, the side-by-side race arena,
  and a results screen (summary cards + per-question breakdown table) shared
  by both modes since they now build the exact same `{stats, roundHistory}`
  shape.
- 44 `compete.*` i18n keys rewritten for the new flow (both languages), plus
  one new `race.pct_of` key so the percentage category's "20% van 40" /
  "20% of 40" connector word stays translated rather than hardcoded.
- `package.json` gained the `ws` dependency; `web/sw.js`'s precache list
  swapped `./js/compete.js` for `./js/race-logic.js`.
- Tests: `tests/web/test_logic.mjs`'s race-mode suite was rewritten for the
  new engine (every category valid at every level, `makeChoices` always
  returns 4 unique options including the answer, `rankPlayers` generalized
  past two players, the percentage category's `textKey`/`textVars` instead
  of a hardcoded word). `tests/web/smoke.mjs` now plays a full local
  side-by-side race to the results screen, and - the part that actually
  proves the online mode works - opens a second browser page, joins a real
  room with the code the first page generated, and confirms both players
  reach the same round and the host's recap reflects the guest's answer too.

### Added (round 9 - Racewedstrijd / Race Challenge, a competition mode)

**A new way to play that is not solo any more.** `#/compete` adds a speed
race - a fixed set of questions, 15 seconds each, faster correct answers
worth more points (100 down to 10 as the clock runs out) and a wrong or
timed-out answer worth nothing - built to be played three ways, all from the
same page:

- **Solo**, against the clock, same as any timed game here.
- **Locally, on one device.** After finishing, "add a local player" hands the
  same question set to whoever is sitting next to you (a name, no profile
  switch), and the results screen becomes a live leaderboard as each person
  takes a turn.
- **With anyone, anywhere.** "Challenge someone" turns the finished race into
  a short link and a plain-text code. Opening that link - on the same wifi,
  texted across the world, it makes no difference - decodes the identical
  question set and shows a head-to-head result once the second person
  finishes, with a running leaderboard if a third, fourth, ... person plays
  it too.

**Why this could be built at all without a backend:** this app has nowhere
to run one (see round 6 below and SESSIONS.md session 6 - GitHub Pages,
static files, "no server, no third party" was the point of moving here). A
live cross-device match needs a relay server or at least a signalling
step for WebRTC, neither of which fits that. The way around it: a race is
just data - `{questions, level, participants}` - so *sending the invite* can
just be sending that data, base64url-encoded into the link itself
(`web/js/compete.js`: `encodeChallenge` / `decodeChallenge`). No account, no
server ever sees a challenge, nothing is stored anywhere but the devices
actually playing. `decodeChallenge` treats every field as hostile - a link
can be hand-edited or arrive truncated - and range-checks the whole payload
(question count, operand size, timing, score, participant count and name
length) before any of it reaches the page, rather than trusting what a URL
says.

Questions are transmitted as `[a, b, op]` triples, not as rendered text or
multiple-choice options: the display string and the answer are both pure
functions of the triple (`questionText` / `questionAnswer`), so there is
nothing to keep in sync and nothing that needs escaping. A typed numeric
answer (the same `numberField` every other game uses) replaces
Bliksemronde's multiple choice for the same reason - four distractors would
have to travel in every link for no benefit.

Only the player actually using this device and profile has their answers go
through `settleAnswer()` - real score, coins, the log, badges, same as any
other game. Everyone else in a race (a locally-added guest, or a name that
arrived inside a decoded challenge) is comparison data only, never written
into this device's saved profile - deliberately: a quick race with a friend
should not need them to have an account on your tablet.

- **`web/js/compete.js`** - the engine, no DOM: question generation per
  level (0-5, typed answers rather than Bliksemronde's multiple choice),
  `racePoints()`, `newRace`/`makeParticipant`/`rankParticipants`/
  `fastestPerQuestion`, and the encode/decode/validate pair above.
- **`web/js/pages/compete.js`** - the page: start a race, an incoming
  challenge preview (with a "paste a code" fallback for whenever a link
  does not survive whatever it was sent through), the per-question
  15-second clock (its own `requestAnimationFrame` loop, stopped on the way
  out exactly like Bliksemronde's), the finished/leaderboard screen, and the
  share panel (clipboard, `navigator.share` where available, and the local
  pass-and-play flow).
- New illustration (`competeIllustration` in `illustrations.js`), 46 new
  i18n keys (`nav.compete`, `game.compete.name`, 44 `compete.*` keys, both
  languages), a home-page link next to rewards/uitleg/dashboard, and a new
  CSS section reusing `.kmg-card`/`.kmg-table`/`.kmg-levelpicker` rather than
  inventing new chrome.
- Deliberately **not** part of `GAME_KEYS`: it does not affect badges or the
  home page's overall-level bar, and its difficulty is remembered as its own
  `localStorage` preference (`kmg.compete.level`) rather than through the
  profile's `state.levels`, because `applyProfile()` rebuilds `state.levels`
  from exactly the fixed `GAME_KEYS` list on every profile switch - the same
  reason Bliksemronde keeps its own best-score key instead of using the
  profile system for it.
- Tests: 17 new Node tests in `tests/web/test_logic.mjs` (question validity
  across all six levels, the scoring curve's edges, encode/decode
  round-tripping, and a battery of adversarial `decodeChallenge` cases - bad
  version, malformed/out-of-range triples, too many questions, mismatched or
  impossible participant data, an over-long name, a name containing markup,
  non-Latin1 characters); a full Playwright scenario in `tests/web/smoke.mjs`
  that starts a race, proves the per-question clock ticks and resets, plays
  an entire race to the results screen, and - the part that actually proves
  the serverless design works - navigates to the exact challenge link the
  app generated and confirms it decodes back into a live "you've been
  challenged" screen.

### Added (round 8 - harder rewards, more characters, daily activity log)

**A dedicated child could clear the entire reward shop in one sitting - the
shop is now built so that cannot happen.** Three changes, stacked:

- **A daily coin cap.** `state.js` now caps *spendable* coins at 300 earned
  per calendar day (`DAILY_COIN_CAP`); score, streaks, levels and badges are
  never capped, only the shop's currency. The reward shop shows a "coins
  earned today" strip with its own progress bar, and a plain message once
  the day's coins are spent ("come back tomorrow for more").
- **Level gates, not just coin gates.** Rare tier and up now also require
  the child to have actually reached a certain level in some game
  (`highestLevelReached()`), so "collect enough points" and "get good
  enough" both matter, exactly as asked. A locked card explains which of the
  two is still missing instead of only showing a price.
- **Steeper, longer tiers.** Existing tiers cost more (common 30 to 40,
  legendary 1000 to 1500, ...), and two new tiers sit above legendary:
  **mythic** (original anime-style heroes - "Dragon Blade Hero", "Star
  Ninja", "Galaxy Guardian" and matching stickers, 3000 coins, needs a maxed
  game) and **ultra**, a single capstone item gated on `requiresMastery`:
  every game at its own true max level (Tafel Monster's level 6 included -
  see `allGamesAtTrueMax()`) *and* every other reward in the shop already
  unlocked. At the cap and with nothing else to grind, the full catalog now
  takes weeks of daily play rather than one long session.
  (Real franchise characters such as Luffy are trademarked, so the "special
  anime character" tier is a set of original characters in that spirit
  rather than a copy of one.)

**The catalog itself nearly tripled**: 11 characters and 10 stickers became
26 and 23, spread across seven tiers (common through ultra) instead of five,
each card now showing a tier ribbon so the shop reads as "how special is
this" at a glance.

**The ultra item is a real rotating 3D cube**, not a flat emoji - six CSS
faces with `transform-style: preserve-3d`, no library and no new dependency,
consistent with how every other animation in this app is hand-rolled. It
freezes on `prefers-reduced-motion` exactly like everything else.

### Added (round 8 - parent dashboard activity log)

**A new "Daily activity log" table** on the parent dashboard
(`web/js/pages/dashboard.js`) summarises every day at a glance - sessions,
questions, accuracy, minutes played, coins earned, and which child played,
newest first - next to the existing per-question log and charts.

**History now survives more than "usually".** The attempt log
(`web/js/log.js`) already lived in localStorage and already survived a
refresh; what changed is that at least 14 days of it (`MIN_RETENTION_DAYS`)
can no longer be trimmed away by the row-count budget, only rows older than
that window can be - a guarantee instead of a coincidence of how much a
child happens to play. The dashboard caption says so explicitly.

### Added (round 7 - reward shop)

**Coins earned by playing can now be spent.** Every correct answer already
paid score; it now also pays coins (the same amount), shown in the sidebar
next to the score and streak. A new **🎁 Beloningswinkel / Reward Shop** page
(`web/js/pages/rewards.js`, catalog in `web/js/rewards.js`) lets a child spend
those coins on 11 characters and 10 stickers, tiered from 30 to 1000 coins so
the first unlock happens fast and the rarest is a multi-session goal.
Unlocking a character equips it immediately, replacing the 🧑 shown next to
the player's name everywhere in the app; a child can switch between any
already-unlocked character at any time. Every item - locked or not - stays
visible with its price and how close the child is, on purpose: the shop
doubles as a collection to show a parent, not just a list of what's already
owned. Coins, unlocks and the equipped character are saved with the rest of
the player's profile (localStorage, same as score and badges - nothing new
leaves the device).

### Added (round 6 - static web app, GitHub Pages, PWA)

**The whole app now runs in the browser.** A new `web/` folder holds a static
front-end with all twelve games, ported from the Streamlit pages, deployed to
GitHub Pages. No build step, no framework, no bundler: plain HTML, one CSS
file and ES modules, so what is in the repository is exactly what the browser
runs.

*Why:* Streamlit re-runs the whole Python script on every tap and streams the
result back, which put the network inside the loop of an animated, timed game.
The countdowns had to be faked with `st.fragment(run_every=1)` (one round-trip
per second, stepping a whole second at a time) and the answer buttons had to
sit outside that fragment or a rerun would swallow the tap. Streamlit Community
Cloud also sleeps an idle app, so a child opening a bookmark after school gets
a cold start instead of a game. The reasoning and the alternatives considered
are written up in `docs/DEPLOYMENT.md`.

- **Deployment** - `.github/workflows/deploy-pages.yml` publishes `web/` on every
  push to `main`. Free, no second account, no server, no cold start. Full
  click-by-click setup, update, custom-domain and troubleshooting guide in
  **`docs/DEPLOYMENT.md`**.
- **Works offline** - a service worker precaches the whole app, so after one
  visit every game works with no network at all. Installable to a tablet's home
  screen as a PWA (`manifest.webmanifest`, app icons including a maskable one).
  The cache is named after the commit SHA, stamped in at deploy time, so a new
  deploy invalidates it exactly once instead of stranding a child on an old
  copy.

### Improved interaction (the point of the move)

- **Answers are instant.** No round-trip between a tap and the response.
- **On-screen number pad**, in the calculator layout children already know
  (7-8-9 / 4-5-6 / 1-2-3 / 0). `st.number_input` rendered a small desktop
  spinner that, on a tablet, summoned the OS keyboard over the visual and the
  question.
- **Real-time clocks.** The timed games run a `requestAnimationFrame` loop
  against a deadline, so the countdown ring sweeps at the screen's refresh rate
  instead of stepping once a second - and the "answered in 1.2s" speed bonus
  now measures the child rather than the wifi.
- **A correct answer auto-advances** after a beat, so a child in flow never
  hunts for "next". A wrong answer does not: that is the one moment they need
  time to read what the answer should have been.
- **Multiple choice is tappable cards**, and the right answer is revealed in
  place after a wrong pick rather than only named in a sentence underneath.
- **The fraction explorer is the pizza itself** - tap a slice to fill or empty
  it and watch the fraction, decimal and percentage move together. It used to
  be two sliders and a server round-trip per drag.
- **Code Kraker takes digit taps** into slots instead of a column of dropdowns:
  four taps rather than four select-and-scroll gestures, which matters when a
  child gets nine guesses.
- **Number Hunt restyles one tile per tap** instead of rebuilding all twenty
  buttons, so the grid keeps up with a child who is going fast.
- **Home page is game tiles**, each showing that game's level and progress bar,
  instead of a markdown bullet list.

### Improved animation and sound

- **Canvas confetti with real physics** - gravity, drag and tumble, bursting
  from the button the child actually tapped. The CSS version could only drop
  divs in straight lines.
- **A full-screen level-up card**, because a small toast was being missed.
- **Floating "+15" points** out of the button that earned them.
- **Web Audio sound effects**, synthesized in the browser at the instant of the
  tap: a rising arpeggio for a correct answer that climbs a step for every
  answer in the current streak, a fanfare for a level-up, a sparkle for a
  badge, a tick over the last five seconds of a timed round. The Streamlit
  version had to build a WAV file byte by byte in Python and base64 it into a
  hidden autoplay tag.
- **Dark mode**, because homework happens after dinner in winter.
- The whole SVG visual library was ported with its animations intact, including
  the per-render class scoping and the `prefers-reduced-motion` escape hatch on
  every single visual.

### Improved visualisation

- **The parent dashboard's charts are hand-drawn SVG** - no pandas, no Altair.
  A horizontal bar chart for accuracy per game, sorted so the hardest game is
  at the top; a column chart for questions per day with only the peak labelled.
  Both have hover tooltips, keyboard-focusable marks and a "show the numbers"
  table. The two chart colours were validated against the light and dark
  surfaces (contrast and lightness band) rather than picked by eye.
- **Every badge is shown**, the unearned ones dimmed, so a child can see what
  there is left to win.

### Changed

- **Results now live on the child's device**, in browser storage, instead of a
  CSV on the server. Better in three ways - it survives redeploys (the old one
  did not), it survives being offline, and no child's data leaves the machine -
  and worse in one: a tablet and a laptop keep separate histories. The
  dashboard's CSV export is therefore prominent, and its columns are identical
  to the ones `utils/gamelog.py` wrote, so old and new exports open side by
  side. This also settles most of the privacy questions in
  `docs/PLATFORM_ROADMAP.md` section 6 for free: no server, no third party, no
  analytics, no external fonts or CDNs on a page a child sees.
- `utils/i18n.py` remains the single source of truth for copy in both
  languages. `web/js/i18n-data.js` is generated from it by `tools/gen_i18n.py`,
  which refuses to run if a key exists in one language and not the other.
  14 new keys were added for the web-only UI (473 total).

### Fixed

- **The nav scrim covered the whole app at phone width.** Its `display: block`
  inside a `@media (max-width: 900px)` block silently overrode the built-in
  `[hidden] { display: none }`, so on every phone and tablet a semi-transparent
  overlay sat on top of the game and swallowed every tap. Found by looking at a
  screenshot, not by a test - so the browser smoke test now hit-tests the first
  control at phone width and clicks it.
- **`Node.append(null)` printed the word "null" on the page.** `append()`
  stringifies its arguments, so a conditional child written as
  `condition ? el(...) : null` rendered as text. It was visible under the
  streak counter in the sidebar. Added a filtering `append()` helper in
  `web/js/dom.js` and used it at the three sites with conditional children.

### Tests

- `tests/web/test_logic.mjs` - 62 tests run under `node --test`. Every question
  generator is exercised several hundred times per level and checked against
  the rule it has to keep: divisions divide exactly, "simplify" answers really
  are in lowest terms, angles sum to 180 or 360 with no angle below 20 degrees,
  long division's remainder is smaller than its divisor, one-decimal answers
  have one decimal, every multiple-choice question contains its own answer,
  Mastermind never counts a repeated digit twice, and every Number Hunt round
  is winnable without tapping the whole grid. Plus NL/EN key parity, matching
  placeholders per key, and SVG well-formedness.
- `tests/web/smoke.mjs` - a real Chromium pass over all 15 routes, checking for
  console errors, playing a question through the number pad, confirming it
  reaches the dashboard, switching language, watching a countdown actually
  tick, checking the phone layout is tappable and does not scroll sideways, and
  reloading with the network off.
- `tools/check_precache.py` - compares the service worker's precache list
  against the files on disk in both directions. CI runs it before every deploy,
  because a file missing from that list works perfectly in testing and then
  404s offline, in front of a child.

### Added (round 5 - animation, logic & speed games, classroom plan)
- **Animation layer** (`utils/anim.py` + animated SVGs in `utils/visuals.py`).
  Pure CSS keyframes and inline-SVG animation - no new dependency and no
  JavaScript (Streamlit strips `<script>` from markdown anyway):
  - Every visual now *builds itself*: pizza slices fill one at a time, dot
    arrays pop in row by row, percent/tape/ratio bars grow from zero, clock
    hands sweep round to the time, the number line's markers drop in, hop
    arcs draw in counting order, rectangles and triangles draw their own
    outline before the fill washes in, the cuboid assembles face by face,
    and the balance scale rocks and settles level.
  - Each question arrives in an animated card that slides up with a single
    light sweep, so it is obvious the question changed even when the new one
    looks like the old one.
  - Correct answers pop a green banner; wrong ones shake a red one. Level-ups
    and new badges fire a CSS confetti burst, queued the same way sounds are
    (rendering it before `st.rerun()` would throw it away).
  - The sidebar score box pops and shows `+N` only on the runs where the
    score actually went up, and the level badge pops only when the level
    actually changed.
  - Class names and element ids are scoped per render, so two visuals on one
    page cannot animate each other, and **everything is switched off under
    `prefers-reduced-motion`** - the finished picture shows immediately
    instead.
- **Four new games**, taking the app from 8 to 12:
  - ⚡ **Bliksemronde / Lightning Round** - a 60-second speed round with four
    answer buttons, a combo multiplier and a speed bonus for answering inside
    3 seconds. The clock is an `st.fragment(run_every=1)` so it ticks without
    rebuilding the answer buttons under the child's finger.
  - 🎯 **Getallenjacht / Number Hunt** - a timed grid hunt: tap every multiple,
    prime, square or digit-sum match before the clock runs out, with three
    lives and a bonus for clearing the grid. Trains number *properties* from
    the recognition side.
  - 🧠 **Logica Lab / Logic Lab** - reasoning rather than calculating: number
    and shape sequences, odd-one-out, if/then statements (including the
    invalid converse, the classic slip at this age), a who-has-what deduction
    grid, symbol balance puzzles and magic squares.
  - 🔐 **Code Kraker / Code Breaker** - Mastermind with digits. Pure
    elimination reasoning, scored on how few guesses it took.
  All four have 6 levels, full NL/EN translation, session logging, badges and
  the level picker, and are wired into the navigation, the home page and the
  cheat sheet.
- **`utils/gameflow.py`** - the shared "what happens after an answer" sequence
  (log, adapt, score, feedback, toast, badges, save). The timed games adapt
  their level **once per round** instead of per answer: inside a 60-second
  round, three quick correct answers are just three easy draws, whereas
  9-of-10 for a whole round really does mean "too easy".
- **Cheat sheet** gained three new sections: logical thinking & patterns,
  cracking codes, and faster mental maths (the 9-times trick, divisibility
  by 3 and 4, what a prime is).
- **`tests/test_app.py`** - 23 regression tests, runnable with plain
  `python tests/test_app.py` or with pytest. They check translation parity
  and that no `t()` call references an undefined key; that every page renders
  at every level in both languages; the maths behind each bug fixed below;
  Mastermind scoring against a reference implementation over all 4096
  secret/guess pairs; that generated sequences actually follow the rule they
  claim; that Number Hunt's targets match its stated rule; and that generated
  SVG is well-formed and properly scoped.
- **`docs/PLATFORM_ROADMAP.md`** - a phased development plan for turning the
  app into a classroom platform (pupil accounts, live class view, per-child
  development tracking, teacher-built exams), with six checkpoints where the
  teacher decides rather than the developer reports. Includes the honest
  assessment that Streamlit is unlikely to hold thirty concurrent pupils and
  schedules that decision, with a load test, at Checkpoint 5.

### Fixed (round 5)
- **Meten is Weten level 2 gave mathematically wrong answers.** Decimal
  conversions used `round(value * factor)`, so "0,25 cm = ... mm" expected
  **2** (Python rounds 2.5 to even) and "0,75 cm = ... mm" expected **8**.
  Both are wrong, and the true answers - 2.5 and 7.5 - could not have been
  typed into the whole-number input anyway. Level 2 now offers only decimal
  steps that convert to a whole number of the smaller unit. The question also
  went through an f-string that bypassed the translation system, so Dutch
  showed "0.5 cm" instead of "0,5 cm"; it now uses the template and a
  language-aware decimal separator.
- **Breuken Baas marked a correctly simplified answer wrong.** Grading
  compared the literal numerator/denominator pair, so on "1/2 + 2/4" a child
  who worked it out and then simplified 4/4 to 1/1 - exactly what we teach
  them to do - was told they were wrong. Grading now cross-multiplies and
  accepts any equal fraction, and when the expected answer is not in lowest
  terms the feedback shows the simplified form beside it.
- **Meetkunde Meesters could ask for a negative angle.** The missing-angle
  generator rejection-sampled up to 30 times and then fell through using
  whatever the last *rejected* draw was - for a triangle, that can be
  "95 + 95 = 180, what is the third angle?" with -10 as the expected answer.
  It now picks the missing angle first and splits the remainder, which is
  correct by construction (verified over 200,000 trials).
- **`requirements.txt` allowed a Streamlit too old to run the app.** The floor
  was `>=1.37`, but the parent dashboard's `st.dataframe(width="stretch")`
  needs `>=1.49`; older versions reject the string outright. Bumped, with the
  reason written next to it.
- Replaced `use_container_width`, which Streamlit has deprecated and will
  remove, with `width="stretch"`.
- Verhoudingen & Snelheid level 5 could ask how far a train travels "in 3
  hours and 0 minutes".
- `speed_diagram_svg` had a hardcoded English "in" between the distance and
  the time (so Dutch read "120 km in 2 uur" with an English joiner), and used
  a fixed `id="arrow"` for its arrowhead marker, which collides if two speed
  diagrams ever share a page.
- The home page's level overview split the games into two rows, which with 12
  games left the labels too narrow to read; it now lays out four per row.

### Added (round 4 - fun & difficulty-range improvements)
- **Persistent player profiles.** Score, levels, and badges are now saved
  to disk per player name (`logs/player_profiles.json`) and restored the
  next time that name is entered - a kid no longer starts from zero every
  time they open the app (`utils/profiles.py`).
- **Milestone badges**: questions-answered tiers (10/50/100), streak
  badges (5/10 in a row), "tried every game", "reached level 5", and
  "level 5 in every game" - shown on the home page and toasted the moment
  they're earned (`utils/badges.py`).
- **Sound effects** for correct/incorrect answers - short tones synthesized
  on the fly (no external audio files or network calls) via a hidden
  autoplay `<audio>` tag, with a sidebar toggle to turn them off
  (`utils/sound.py`).
- **A gentler "Warm-up" level (0)** below the existing 1-5 scale in every
  game, for kids who find even the current easiest level too hard. The
  adaptive system still levels a confident kid up out of it within 3
  correct answers.
- **"Why" tips on wrong answers**: a short, game-specific strategy
  reminder now shows next to "the answer was X" instead of just the
  correction on its own.

### Fixed (round 3)
- **Menu now actually follows the language toggle.** Switched from
  Streamlit's filename-based `pages/` auto-discovery to an explicit
  `st.navigation`/`st.Page` router in `app.py`, rebuilt from `t()` on every
  rerun - previously the sidebar menu always showed the Dutch filenames
  regardless of the NL/EN toggle. This also makes page order explicit, so
  the Parent Dashboard is now always the last item instead of sitting in
  the middle of the list.
- **Player name now actually saves.** Streamlit clears a widget's
  session-state entry whenever that widget isn't rendered on the current
  page, so binding `player_name` directly to the home page's `text_input`
  key meant it was wiped the instant you navigated to a game. The durable
  value now lives in its own session-state key, re-seeded into the widget
  every time the home page runs; the sidebar also shows "Playing as: ..."
  on every page so it's clear the name was saved.
- **Tafel Monster's hint no longer gives away the answer.** For
  missing-factor/division questions, the old hint drew an accurate a×b
  dot grid, so counting one side of it read off the missing factor
  directly. It now shows a skip-counting number line for the known
  factor with the product flagged as a target - the child still has to
  count the hops themselves (`utils/visuals.py: skip_count_svg`).
- **More interactive visuals.** Breuken Baas's fraction explorer now uses
  draggable sliders instead of number inputs; Procenten Puzzel and
  Meetkunde Meesters gained their own slider-driven live explorers
  (percent bar; rectangle width/height with live perimeter & area).
- **Cheat sheet (Uitleg Concepten) now covers all 8 games**, not just the
  original 4 - added NL/EN explanations for equations (X-Mysterie),
  geometry, ratios/speed, and negative numbers/long arithmetic.
- Hardcoded Dutch text that ignored the language toggle: percentage
  visual captions ("van"/"korting"), speed-diagram units ("uur"/"km/u"),
  and shape-label words baked into `utils/visuals.py` (basis/hoogte/totaal,
  and the cuboid width label using the Dutch "b" abbreviation even in
  English).
- Breuken Baas's "simplify as far as possible" question could generate a
  fraction that wasn't actually fully reduced (e.g. asking to simplify to
  2/4 instead of 1/2); the numerator is now always coprime with the target
  denominator.
- Clicking the already-active level button reset that game's
  adaptive-difficulty streak counters for no reason.
- "Clear all history" on the Parent Dashboard didn't clear the current
  session's in-memory log (so answered questions kept reappearing in the
  table) and its confirmation message was immediately wiped by the rerun
  that followed it; both are fixed.

### Added (round 2)
- **Manual level picker.** Every game now shows a row of clickable 1-5
  level buttons at the top (`utils/ui.py: level_control`), so leveling up
  is an explicit, visible action a child (or parent) can take directly -
  on top of the automatic adaptive leveling from round 1, which still runs
  in the background.
- **Visualizations everywhere** (`utils/visuals.py`, pure inline SVG, no
  new dependency): a pizza chart / fraction bar that updates live, a
  percent fill bar, a dot array for multiplication, an analog clock face,
  tape diagrams (bar models) for money and part-whole problems, a ratio
  bar, a balance scale for equations, a number line for negative numbers,
  and labeled rectangle/triangle/cuboid shapes for geometry. Visuals only
  ever show the *given* numbers in a question, never the answer.
- **Interactive fraction explorer** on Breuken Baas: a free-play slider
  section ("🔍 Probeer het zelf uit!") where changing the numerator or
  denominator instantly redraws the pizza and its percentage - exactly the
  "pick a fraction, watch the pizza/percentage change" interaction asked
  for. Tafel Monster also gained an optional "show me a picture" hint
  revealing a dot array for the current problem.
- **4 new games** for the end of groep 7 / middle of groep 8:
  - 🕵️ **Het X-Mysterie** - solving equations for x (one-step through
    two-step, including negative solutions), up to a **2-variable linear
    system** (`x + y = S`, `x - y = D`) at the top level, visualized as a
    balance scale.
  - 📐 **Meetkunde Meesters** - perimeter & area of rectangles, triangle
    area, compound-shape area, cuboid volume, and missing-angle problems
    (triangle/quadrilateral angle sums), each with a labeled shape drawing.
  - 🚗 **Verhoudingen & Snelheid** - simplifying ratios, map scale, speed =
    distance/time (solving for any of the three), unit price, and
    multi-step speed/time word problems.
  - 🔢 **Getallen Universum** - negative number arithmetic on a number
    line, two-digit long multiplication, long division with remainder, and
    decimal multiplication/division.
  All four follow the same pattern as the original games: 5 adaptive +
  manually-selectable levels, full NL/EN translation, and session logging.

### Fixed
- Page filenames are now zero-padded (`01_`...`10_`) so Streamlit's
  filename-based nav sorts correctly now that there are 10 pages (`10_`
  used to sort before `1_`-`9_` alphabetically).
- Check/Next buttons on every game now have explicit widget keys.

### Added (round 1)
- **Adaptive difficulty levels (1-5) for every game.** Each game (Tafel Monster,
  Breuken Baas, Meten is Weten, Procenten Puzzel) now starts at an easy level
  and automatically levels up after 3 correct answers in a row, and eases
  back down after 2 wrong answers in a row, so a session gradually ramps up
  in challenge instead of staying flat. A level badge (Makkelijk → Meester /
  Easy → Master) is shown on every game page.
- **New, harder question types**, aimed at Dutch "groep 6 & 7" (ages ~9-11):
  - *Tafel Monster*: missing-factor problems, division facts, two-digit
    multiplication, and word problems, on top of the original tables.
  - *Breuken Baas*: fraction subtraction, simplifying fractions, adding
    fractions with different denominators, and multiplying a fraction by a
    whole number.
  - *Meten is Weten*: decimal unit conversions, mixed-unit addition,
    clock/time calculations (elapsed minutes), and money problems
    (change, total cost).
  - *Procenten Puzzel*: percentage-of-a-number, discount/new-price word
    problems, harder fraction/decimal/percent equivalents (eighths, fifths),
    and reverse-percentage ("what was the original price?") problems.
- **More randomization and variety** in every question generator so repeat
  plays rarely look identical, and a session can comfortably run 45+ minutes
  before questions feel repetitive.
- **Session log**: every answered question (game, level, question text,
  child's answer, correct answer, right/wrong, points, timestamp) is
  recorded for the current browser session and appended to
  `logs/all_sessions_log.csv` on disk, so history accumulates across
  multiple play sessions.
- **Parent Dashboard** (new page, "📊 Ouder Dashboard"): summary metrics
  (sessions, questions answered, accuracy, total play time), an accuracy
  chart per game, a questions-per-day chart, a filterable full log table,
  a player-name filter, and CSV download buttons for the full history and
  for just the current session. Includes an (confirmation-gated) option to
  clear stored history.
- **Player name field** on the home page so multiple children's results can
  be told apart in the log/dashboard.
- **Language switcher** (🇳🇱 Nederlands / 🇬🇧 English) in the sidebar on every
  page. All UI text - including every question template, button, and
  feedback message - is pre-translated and switches instantly; no manual
  per-session translation needed.
- **Session progress widget** in the sidebar: elapsed play time vs. a
  45-minute goal, questions answered this session, and running accuracy.
- `requirements.txt` (streamlit, pandas) for reproducible installs/deploys.
- This changelog.

### Changed
- Replaced the old "always show Dutch + small English subtitle" text style
  with a proper single-language UI driven by the language switcher.
- Score-per-correct-answer now scales with difficulty level (10 to 30
  points) instead of a flat 10 points.
- Uitleg Concepten (cheat sheet) gained explanations for the new time,
  money, and percentage-of-a-number topics, and is now fully translated.

### Notes
- On hosting platforms with an ephemeral filesystem, `logs/all_sessions_log.csv`
  persists across sessions during uptime but resets on redeploy/restart —
  use the dashboard's download buttons to keep a permanent copy.
