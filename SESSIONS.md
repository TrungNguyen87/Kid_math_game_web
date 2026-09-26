# Session log

A record of each working session on this project: what was asked, what was
actually done, what was found along the way, and what is still open.

The CHANGELOG says *what changed*. This file says *why, and what we learned* —
including the things that turned out to be wrong, so the next session doesn't
rediscover them.

---

## Session 17 — 25 September 2026

**Branch:** `claude/game-levels-gameplay-expansion-68mtch`

### Asked

1. Read the changelog and memory first.
2. More levels and more variety, including **groep 8** of the Dutch
   basisschool - "and do that also for the reading games".
3. More kinds of interactive games that make children play and read more;
   something creative, possibly micro-learning. Flappy-bird and Mario-style
   jumping games were given as examples.
4. Log the easy levels a child has finished so they don't keep playing them,
   in a way that makes them *want* to play a higher level.
5. Test everything so the GitHub deploy runs smoothly; save the changelog
   and memory before committing.

### Read first: there were no reading games

The request says "also for the reading games", but the app had none - twelve
maths games only. Read as "build reading games, and give them groep 8 levels
too", which is also the only reading that makes item 3 ("read more") possible.

### Decided: one level scale, 0-7, for every game

Groep 8 became levels 6 (*Kampioen*) and 7 (*Legende*) in every game, not a
separate mode or a second set of games: the adaptive levelling, the picker,
the replay guard and the rewards all work unchanged, and a child in groep 8
simply keeps climbing. Tafel Monster's old special level 6 disappears into
the common scale (its "monster" content is now everyone's level 6), so
`getMaxLevel()` has no special case left - it is kept as a function so the
next game with its own ceiling is one line, and so nothing slides back to a
shared constant (session 16's lesson).

**The trap in raising a ceiling is every promise made at the old one.** The
mythic rewards were gated at `MAX_LEVEL` and the "level 5" and Reken Meester
badges checked `MAX_LEVEL`. Left alone, raising it to 7 would silently have
moved a child's mythic savings goal from level 5 to level 7. `MASTER_LEVEL`
(5) now names the old top, and everything promised there stays there. The
test `raising the top level moved no existing goal` pins it. The one thing
that *did* get further away on purpose is the ultra 3D Champion, whose rule
is "every game at its true max" - that is now 17 games at 7. It is the
capstone; see Still open.

### Decided: "log the finished levels" = a passport, a nudge and a bonus

Round 15 already stopped a mastered level from paying. What was missing was
the child being *told*, and being pointed somewhere better. Three pieces:

- **A dated mastery log** (`state.masteryLog`), written in `clearLevel()` -
  the one place a level is ever marked done, and only on a real,
  streak-earned level-up (session 14's rule, untouched). Old profiles get the
  log rebuilt from their cleared levels, undated ("earlier").
- **A one-off mastery bonus**, 10 + 5 × level coins, paid in `clearLevel()`
  only when the level is newly added. It rewards climbing, and it cannot be
  farmed by sliding down two wrong answers and climbing back up: the set can
  only gain a level once. Proven by the "cannot be farmed" test failing with
  the one guard line removed. Like quest coins it is a gift, never score, so
  the buddy stays honest.
- **Visible everywhere a child looks**: green ✓ on mastered levels in the
  picker; a nudge on a mastered level ("on level N you earn coins again")
  with a one-tap button; tile pips; a home-page *next challenge* card
  (climb > groep 8 > an untried game, reading first > the lowest game); a
  level passport of stamps; and a mastery panel for parents.

The nudge lives in `levelPicker()`, so every game - including all five new
ones - got it without a line of game code.

### Decided: reading content is data, and each language gets its own

Reading content (`reading-data.js`) is kept out of `i18n-data.js`: the i18n
file is interface strings with identical keys; spelling in Dutch (d/t, ei/ij,
't kofschip) and English (homophones, silent letters) are different subjects,
so each language has its own lists. Only the 24 reading texts are parallel
translations. The spelling tip keys (`spelling.tip_0..7`) deliberately hold
*different rules* in each language under the same key.

Every reading question names its reading skill and a wrong answer teaches
that skill - the micro-learning inside the game. The texts grow from 40 to
~90 words and from "find it in the text" to purpose, argument and
inference, roughly following the groep 5-8 begrijpend-lezen line.

### Decided: arcade games are levelled games with a canvas on top

Fladdervogel and Sprongheld are in `GAME_KEYS`, pay through
`awardablePoints()`, go through `settleAnswer()` and adapt once per run via
`adaptAfterRound()` - so the replay guard, quests, badges and the log all
apply. **A wrong answer costs no life; crashing does.** Losing a life for a
wrong answer would punish reading slowly, the opposite of the goal. The world
of each game is plain data and a pure `step()`, which is what made it
possible to test "every right answer is reachable" with an autopilot.

### Decided: micro-learning as a card album

Leerhapjes: 24 one-minute lessons (one idea, one example, three questions).
Collecting cards in an album is the motivation; coins pay once per card,
once for gold, and +10 for the bite of the day. Not a levelled game on
purpose - it is the thing to do in five minutes.

### Found along the way

- **The bite of the day moved during the day.** It was picked among the
  bites not yet collected; collecting any other bite shrank that pool and
  changed the pick, taking the promised +10 with it. A Node test written for
  "pays once" failed (20 coins instead of 30) and exposed it. Fixed by picking
  among the bites open *at the start of the day* (a card keeps its
  first-collected date for that).
- **Sprongheld spawned a row above the previous row's slime** when a child
  bumped a row's first block early. Found reading my own code; the autopilot
  test then also failed with the old spawn rule, so it was a real gameplay
  bug, not a cosmetic one.
- **The arcade canvas overflowed small and landscape phones.** At 390x844 it
  looked fine; measuring 360x640, 375x667 and 844x390 showed the playfield's
  bottom off screen with a three-line word question, and the question gone
  off the top in landscape. The cause was a fixed 170px budget for everything
  above the canvas. It now measures the room, reserves three lines for the
  question, and puts the question beside the canvas on a short landscape
  screen. The smoke test checks all three shapes and fails against the old
  sizing. **Measure with the keyboard, not a click:** a Playwright click on
  the canvas scrolls it into view first and hides exactly the overflow being
  looked for (my first measurements were wrong because of it).
- **Adding a primary button can hijack a test.** The smoke test clicked
  `.kmg-btn-primary` `.first()` to check an answer; the new nudge button sits
  earlier in the DOM, so on a mastered level the test clicked "Go to level 2"
  instead. Scoped to `.kmg-actions`. Same family as session 16's "a second
  instance can make an assertion vacuous": I also gave the dashboard's new
  tables their own class, because reusing `.kmg-logtable` would have made the
  smoke test's "the answer log has rows" pass even with an empty log.
- **`pages-sim.mjs` has its own route list.** It kept testing 17 routes
  while the app had 23; now listed next to a note to keep it in step.
- **Existing invariant tests caught deliberate changes**, which is the point
  of running them over all levels: algebra's "only level 5 has two unknowns"
  and meetkunde's "every answer is a whole number" failed at 7 and 6. They
  were rewritten to state the new rules precisely (and gained independent
  checks: substitution into the equation, π recomputed from the picture), not
  loosened.
- `choice(pools[level])` in Logica Lab and `LEVEL_RULES[level]` in Code
  Kraker would have thrown on level 6. Any generator that indexes by level
  must grow with `MAX_LEVEL`; the generator fuzz over 0-7 is what guards it.

### Verification

- `npm test`: 167/167 (118 before; +19 mastery, +13 reading, +12 arcade, +5
  in test_logic).
- Revert-to-fail, per CLAUDE.md: the mastery-bonus guard, the Sprongheld row
  spacing, the bite of the day, the Getallenjacht prime range and the reading
  quest guard each failed their test with the fix removed and passed once
  restored; the smoke arcade-fit check failed against the old sizing (canvas
  bottom 664px in a 640px screen).
- `npm run lint`; `node --check` on all 53 files under `web/js`;
  `npm run check:precache` 61/61.
- `npm start` + `npm run test:smoke` on a freshly started server: 23 routes
  and every scenario, old and new.
- `npm run test:pages`: 23 routes under `/Kid_math_game_web/`, stamped cache,
  offline reload.
- The workflow's two real steps (`sed` BUILD_ID stamp, `check_precache.py`)
  re-run on a scratch copy of `web/` and `tools/`: both pass, 61 files.
  `deploy-pages.yml` untouched.
- A sweep of all 23 routes in NL and EN, phone size, dark mode, with a
  seeded groep 8 player and every expander open: no `null`/`undefined`/`NaN`,
  no untranslated key, no unfilled placeholder, no sideways scroll.
- Screenshots checked by eye: home (desktop, phone, EN dark), every new page
  at phone size, both arcade games running at 360x640, 390x844 and 844x390,
  a Leerhapje lesson, Tafel's eight-level picker at 390px.

### Still open

- **The content is a first draft by a non-teacher.** 24 texts, 96 spelling
  and 106 vocabulary items per language, 24 bites: every item has an
  unambiguous answer by construction and by test, but none has been checked
  against the Cito/doorstroomtoets level by a groep 8 teacher, and the
  English lists were not reviewed by a native-speaking teacher. The texts are
  the most valuable thing to have a teacher read.
- **Numbers without telemetry**, like every round: the mastery bonus
  (10 + 5 × level, up to 175 coins per game), bite coins (15/5/10), arcade
  speeds and gaps. The autopilot proves reachability, not how hard it *feels*
  to a nine-year-old; watch a child play Sprongheld at level 7 before tuning.
- **The ultra 3D Champion is much further away**: every one of 17 games at
  level 7, plus every other reward. Deliberate (it is the capstone), but if
  a parent says it is unreachable, the rule to revisit is
  `allGamesAtTrueMax()`.
- **A child who had maxed a game sees 5/7 now, and its 👑 is gone** until
  they reach 7. The next-challenge card turns that into "groep 8 levels are
  waiting", but there is no one-time "new levels!" announcement.
- **Deploy day re-rolls one daily quest**: the variety slot went from three
  to four quests, so `hash % 4` can pick a different third quest than a child
  saw that morning. Completed quests stay recorded; worst case one quest
  changes once.
- **Arcade games draw the hero as an emoji** on the canvas. On a device
  without a colour emoji font it is a box inside the white head circle; the
  bird in Fladdervogel is drawn with shapes and has no such dependency.
- Each flap/jump plays the tap sound. Fine at normal volume; if parents find
  it noisy, `handleEvent("action")` in `arcade.js` is the one line.
- Still carried over from session 16: the GitHub Actions Node 20 deprecation
  warning (actions not bumped - no way to confirm the right tags from here).

---

## Session 16 — 24 September 2026

**Branch:** `claude/polish-expand-features-mienaa`

### Asked

1. Read the changelog and memory first.
2. Debug and fix every small error; polish and optimise the code.
3. Improve visual quality and add more content: something more attractive to
   encourage children to keep learning. More gifts, characters and rewards,
   and a better reward system.
4. Add a feedback email address: nxtrung87@gmail.com.
5. Test everything, make sure the GitHub deploy runs smoothly, and save the
   changelog and memory before committing.

### Found first: the small bugs were all "renders wrong", none "throws"

Before touching features, every route was opened in a real browser, as a
seeded player with some progress, at desktop in Dutch and at phone size in
English in dark mode, and the rendered text was scanned for
`null`/`undefined`/`NaN`/untranslated keys plus sideways overflow. The whole
list is in CHANGELOG round 17 "Fixed". Three are worth remembering:

- **The home tiles printed "null"** for every game already played. That is
  session 6's exact bug (`Node.append(null)` stringifies), fixed then with
  `dom.js`'s `append()`, back in a spot that never used the helper. Nothing
  threw and no test looked at the tile text, so it shipped for many rounds.
  The smoke test now checks tile text after a game has been played.
- **Tafel Monster is the one game with 7 levels**, and three separate places
  assumed 6 (0-5): the home tile ("6/5", 120% bar), the overall %, and the
  level picker's fixed 6-column grid. When something looks off only for
  Tafel, check for a hard-coded `MAX_LEVEL`, not `getMaxLevel(game)`.
- **`server.js` hides 404s.** Its `app.get('*all')` fallback returns
  `index.html` with a 200 for any unknown path. That is right for hash
  routes, but it meant `index.html`'s `apple-touch-icon` → a non-existent
  `icon-180.png` was invisible to every smoke run, while GitHub Pages (no
  fallback) returned a real 404. **This is why `npm run test:pages` now
  exists**: it stamps a copy of `web/` exactly as the workflow does and
  serves it statically under `/Kid_math_game_web/`, the way Pages does.
  Proven by putting the old icon path back: `test:pages` fails with the 404
  while `curl` against `server.js` still says 200.

Also found: README and `docs/DEPLOYMENT.md` gave the live URL as
`…/Kids_Math_Games/`. The Pages deploy log's own environment URL (read
through the GitHub Actions API) is
`https://trungnguyen87.github.io/Kid_math_game_web/`. README also still
described the long-gone Streamlit front-end, and `i18n-data.js` claimed to be
generated by a tool that no longer exists. Fixed, so the next reader is not
sent looking for `utils/i18n.py`.

### Decided: rewards for coming back and for progress, not just more to buy

The shop had 80 items and a coin balance. What it lacked was a reason to come
back *tomorrow* and anything showing progress other than a number. So besides
52 more items, four systems, each chosen for a different kind of motivation:

- **A buddy that grows (Rekie).** Visible, emotional proof of how much has
  been learned. It grows on `totalScore` specifically, the one number that
  only rises for answers that actually paid, so it cannot be farmed.
- **Daily quests + a treasure chest.** A reason to come back each day and to
  mix games up (one slot is always variety, one names a featured game).
- **Colour themes.** Session 14 left open that gifts don't *do* anything.
  Themes are the first reward that changes the app itself, which is what
  children show their friends. They re-point the accent tokens (`--orange`,
  `--orange-dark`, `--amber`, the page washes) under `:root[data-theme]`,
  since nearly every coloured thing in `app.css` is built from those.
- **A savings goal.** Turns "I have 212 coins" into "I'm 66% of the way to
  the unicorn", in the sidebar on every page.

### Decided: none of it is a side door round the level-replay guard

Rounds 15-16 made an already-cleared level pay nothing. A quest counting
*any* correct answer would reopen that: replay easy questions, finish "answer
10 correctly", collect 20 coins. So **quests only move on answers with
`pointsAwarded > 0`** (`quests.js recordQuestProgress()`), which is the first
test in `test_progression.mjs`, proven to fail with that one line removed.
The smoke test's replay scenario now also asserts today's quest record is
byte-identical before and after the replay answer.

Related rule: **quest and chest coins are a gift, not score.**
`grantBonusCoins()` moves `coins` only. Round 12 made coins and score move
1:1 in `addScore()`, and that stays true for answers; it is just no longer
true that coins = score − spent. Nothing in the code relied on that equality
(checked). Keeping score answer-only is what keeps the buddy honest.

The play-day streak, by contrast, counts *any* answered question: it measures
showing up to practise, it pays nothing, and it only feeds badges.

### Decided: dates, randomness and the chest

- **Local calendar day, not UTC**, for quests and the streak
  (`state.dayKey()`). A UTC day flips at 01:00/02:00 in the Netherlands, in
  the middle of a late homework session. `previousDayKey()` steps back in
  calendar terms so DST days cannot skip one (tested on both 2026 DST dates).
- **Quests are a pure function of the date** (FNV-1a hash), the same for
  every profile and never re-rolled by a reload.
- **The chest is not a loot box.** Treasures are never for sale, no real
  money exists anywhere, and every chest is guaranteed to hold something new
  (uniform among the *unfound* treasures, never a duplicate) until the
  collection is complete. The randomness is only *which* new treasure.
- **The ultra 3D Champion now also needs every theme and treasure**, because
  its rule is "every other reward unlocked" and those are rewards now. That
  means at least 12 days of finished quests on top of everything else.
  Deliberate: it is the capstone. Revisit if a parent finds it too far.

### Decided: existing profiles must not get a surprise

A profile saved before this round has no `buddySeenStage`. Defaulting it to 0
would celebrate "Rekie grew!" on the next answer for points earned weeks ago.
`applyProfile()` sets it to -1 and `buddy.js syncBuddyStage()` resolves that
to the stage the score already earned, silently (a state-change listener, so
it resolves before any answer). Proven: default it to 0 instead and the
old-profile test fails.

### Found along the way

- **The smoke test's "exactly one equipped card" broke**, correctly: the free
  Classic theme is equipped too. Worse, the check before it ("some card is
  equipped after buying a character") would now pass even if no character
  were equipped. Both are scoped to `#kmg-rewards-avatar`. Worth remembering:
  adding a second instance of a thing (here, a second equippable category)
  can turn an existing assertion vacuous without failing it.
- **`pkill -f "node server.js"` kills the shell that runs it**, since the
  pattern also matches that shell's own command line. Use
  `pkill -f "^node server\.js$"`.
- **The deploy workflow warns that its actions target Node 20** and are
  being forced to run on Node 24 (`actions/checkout@v4`,
  `configure-pages@v5`, `upload-pages-artifact@v3` → `upload-artifact@v4`,
  `deploy-pages@v4`). Every run still succeeds. The versions were *not*
  bumped: there was no way to confirm from this environment which newer tags
  exist, and a wrong tag breaks the deploy outright, which is worse than a
  warning. See "Still open".

### Verification

- `npm test`: 118/118 (93 existing + 25 in the new `test_progression.mjs`).
- Revert-to-fail, per CLAUDE.md: three Node tests (quest guard, chest
  no-duplicates, silent buddy sync) and three smoke checks (tile `null`,
  Tafel "/6", picker on one row) each failed with its fix reverted and passed
  again once restored; `test:pages` failed on the reintroduced icon path.
- `npm run lint`; `node --check` on all 42 files under `web/js`.
- `npm run check:precache`: 50/50 (`buddy.js`, `quests.js` added to
  `PRECACHE`).
- `npm start` + `npm run test:smoke` on a freshly restarted server: all 17
  routes and every scenario, including the new phone-sized `progression` one.
- `npm run test:pages`: the stamped site under the Pages sub-path, with
  17 routes, 12 linked files/icons, cache `kmg-<BUILD_ID>`, and an offline
  reload.
- The workflow's two real steps (`sed` `BUILD_ID` stamp, `check_precache.py`)
  re-run on a scratch copy of `web/` and `tools/`: both pass, 50 files.
- Screenshots checked by eye: home and shop at 1280 (light) and 390 (dark,
  Ocean theme); all 7 themes × light/dark on a game page; a correct answer
  with its praise line and the buddy hatching; the chest ready to open.

### Still open

- **The numbers are judgement calls with no telemetry**: quest targets and
  rewards (20-35 coins, chest 40, 100 once all treasures are found) and the
  buddy thresholds (60 … 12,000 points). Same caveat as round 7's pricing.
  They are constants at the top of `quests.js` and `buddy.js`.
- **Race Mode counts towards quests like any game**, and a race pays up to
  100 points a question, so the points quests finish quickly in a race. Not
  a loophole (those points really were earned), but it makes "points" quests
  easy on race days.
- **GitHub Actions' Node 20 deprecation warning** (above). Bump the four
  actions to their Node-24 majors once the correct tags are confirmed,
  ideally on a branch with a `workflow_dispatch` run before merging.
- **Newer emoji** (🪁 🪄 🦩 🪐 🦪, and the existing 🥷) are Unicode 12-13 and
  may show as boxes on a very old tablet. Not seen here; ask for the device
  and OS first if a report comes in.
- The dashboard's rewards panel shows the *current* player's numbers even
  when the table is filtered to another child. It says whose they are.
- `server.js`'s catch-all still returns 200 for missing files. That is right
  for the app itself, but it is why `test:pages` exists. Don't treat a clean
  `test:smoke` as proof that every referenced file exists.

---

## Session 15 — 18 September 2026

**Branch:** `claude/reward-points-special-chars-ai1rp5`

### Asked

1. Session 14's easy-level reward guard should apply to every level, not
   just Warm-up and Easy (0-1).
2. Test everything before committing, and make sure it will run smoothly
   once deployed via GitHub Pages.

### Decided: track *which* levels a game has cleared, not *whether* it has
left the easy tier

Session 14's `easyLevelCleared` was a single boolean per game - true once a
game had ever leveled past level 1, false otherwise - which only made sense
because there was one boundary to cross. Generalizing to "every level" needs
a set, not a boolean: `state.clearedLevels[gameKey]` is now the actual set
of levels that game has leveled all the way through. `canEarnAtLevel()`
becomes a plain set-membership check with no special-cased cutoff at all.

One consequence worth stating plainly because it was not asked for
explicitly but follows directly from "the level being left behind is what
gets cleared": a game's own **top** level (`MAX_LEVEL`, or Tafel Monster's 6)
can never be cleared this way, because there is no higher level to level up
into - `clearLevel()` is only ever called with the level a child just left,
and nobody ever "leaves" the top by leveling further. So the hardest content
in any game keeps paying no matter how many times it's played, which is the
right behavior on reflection: reaching the ceiling is not "replaying
something easier", it is still the hardest thing available. Added a test for
this specifically (`a game's own top level never gets cleared...`) so a
future session does not read the lack of a top-level cap as an oversight.

### Kept: clearing still only happens on real leveling, never on a manual pick

Session 14's actual hard-won lesson - `clearLevel()` (renamed from
`graduateIfCrossedEasyTier()`) must only be called from `registerAttempt()`'s
streak logic and `adaptAfterRound()`, never from `setLevel()` itself -
carried over unchanged, because the reasoning behind it (the smoke test's
own "reset to level 0" trick uses a manual level-picker round-trip) applies
at every level, not just the old easy/hard boundary. Re-verified with a
renamed but otherwise identical regression test
(`a manual level pick across a level boundary does not clear it`).

### Verification

- `npm test` (93/93) - the round-15 easy-tier tests were rewritten rather
  than added to: one now levels a throwaway key through 0, 1 *and* 2 and
  checks all three become unpayable replays (proving the guard is not
  limited to the first two levels), a new one confirms a game's own top
  level survives 50 more correct answers still paying, and the manual-pick
  and reload-persistence tests were carried over under the new API names.
  Reverted the fix (reintroduced a hardcoded `level > 1` early return in
  `canEarnAtLevel`) and confirmed the two behavioural tests fail - one
  because level 2 stayed payable after being leveled through, the other
  because a reloaded profile's cleared level-2 flag was ignored - then
  restored the real fix and re-ran clean.
- `npm run lint`, plus `find web/js -name "*.js" | xargs -n1 node --check`
  on every file `npm run lint` itself does not reach (session 8's finding,
  still the right thing to re-check any time a page/game module changes).
- `npm run check:precache` - 48/48 files, unchanged, since this round only
  edited existing files.
- `npm start` + `npm run test:smoke` - all 17 routes and every existing
  scenario clean, including the renamed `rewards:level-replay` scenario
  (was `rewards:easy-replay`) - its actual behaviour did not need to change,
  since a level-0 replay was always one true instance of the general rule;
  only the comments and the note/log labels were updated so they stop
  implying the guard is easy-level-specific.
- The deploy workflow's two real steps (`BUILD_ID` stamp, `check_precache.py`)
  re-run locally against a scratch copy of `web/` and `tools/` - both pass,
  48 files, unchanged. `deploy-pages.yml` itself untouched, and nothing
  outside `web/` (the test suite) reaches the live GitHub Pages deploy.

### Still open

- Same caveats round 15 already left: no telemetry behind exactly how many
  correct answers "clearing" a level should take (it is whatever
  `LEVEL_UP_STREAK`/`adaptAfterRound`'s ratio already were, unchanged by
  this round), and no parent-facing UI shows which levels have been cleared
  per game - only the inline "already earned coins for this level" note at
  the moment it applies.

---

## Session 14 — 18 September 2026

**Branch:** `claude/reward-points-special-chars-ai1rp5`

### Asked

1. Add a function so a child cannot earn more reward points by staying at an
   easy level: the easy level should only pay out the first time, a replay
   should not earn extra points.
2. Design and add more special characters to encourage reaching higher
   levels, plus more stickers, plus whatever other special gifts seemed
   worth adding.

### Decided: "the easy level" is Warm-up and Easy (levels 0-1), and "first
time" means "until the child actually levels out of it"

Neither phrase is defined anywhere in the app, so both needed a concrete
reading before writing any code. "Easy level" was read as the two tiers the
app's own vocabulary already calls easy - `common.difficulty_warmup` and
`common.difficulty_easy` (`ui-bits.js`'s `DIFFICULTY_KEYS`) - rather than
just level 0, since a level-1 grind is barely harder. "First time" was read
as "the first honest pass through that tier, ending when the child's own
streak earns a real level-up out of it" rather than, say, "the very first
correct answer ever" (too punitive - a child needs several easy-level
correct answers just to reach the level-up streak) or a calendar day (round
7/8 already tried a *daily* cap for a different problem and round 12 removed
it after finding it silently discarded earnings - re-read before reaching
for a time-based cap again). Landing on "graduates once, permanently, per
game" ties the guard to the same signal the leveling system already uses,
so no new session/day bookkeeping was needed at all.

### Decided: score and coins both stop, not just coins

`addScore()` (`state.js`) has always moved `totalScore` and `coins` together
1:1, on purpose (round 12's reasoning: coins are the same lifetime number as
score, just spendable) - so the guard sits in front of that one call rather
than trying to let score through while blocking coins. A "replay" answer
still updates the streak, the level, `questionsAnswered` and badges through
the normal `registerAttempt()`/`countAttemptOnly()` path - those measure
practice and progress, which a replay genuinely is - only the payout itself
is skipped.

### Found along the way: the natural hook point graduated a game on a manual
level-picker click, and the project's own smoke test caught it before this
shipped

The obvious place to mark "graduated out of the easy tier" was inside
`setLevel()`, since every level change - automatic or manual - passes through
it. First version did exactly that: compare the level before and after
inside `setLevel()`, mark the flag if the game crossed from ≤1 to >1.
`npm test` passed immediately. `npm run test:smoke` did not - it hung for 30
seconds and crashed on a locator timeout waiting for an affordable reward
card that could no longer exist.

The cause: the smoke test's own reward-shop scenario resets a game to a known
level-0 state before scripting six correct answers, by clicking the level
picker to level 2 and then back to 0 (`tests/web/smoke.mjs`, predates this
session - the comment there says *why*: "two clicks to different levels
always land on the second one"). That round-trip alone - a manual pick, nine
questions before a single one had even been answered - satisfied "crossed
from an easy level to a non-easy level", so by the time the script started
answering questions the game had already been marked graduated, and the six
correct answers that followed paid nothing. The reward shop then had no
affordable card at all, and the test hung waiting for one.

This is worth being glad about rather than annoyed by: it is exactly the
class of bug a Node unit test cannot see (state.js's own functions behaved
exactly as written) but a real page interacting with real UI controls
catches immediately, which is the entire reason this project keeps a browser
smoke test at all. The fix was to stop treating "any level change" as the
signal and use the actual signal instead: `graduateIfCrossedEasyTier()` is
now called only from inside `registerAttempt()`'s streak-based level-up and
`gameflow.js`'s `adaptAfterRound()` - the two places a level-up is *earned*,
never from `setLevel()` itself, which a level-picker click, a
`onLevelChange` reset, or a parent/older sibling poking around all also call.
Added a Node test that pins this distinction down directly - a bare
`setLevel()` round-trip across the boundary must never graduate a game - and
confirmed it fails against the `setLevel()`-based version before the fix and
passes after, the same discipline the multi-touch test used in session 12.

### Decided: characters/stickers grow within the existing tiers, gifts are a
new third collection, not a new tier

"Higher levels" is already how epic/legendary/mythic are gated (level 3, 4,
and `MAX_LEVEL` respectively); adding more items at those same gates was
enough to make "more to reach for at a higher level" true without inventing
a new gating dimension (e.g. "N games at level 5") that would need new state
functions and new tests to trust. The one deliberately *un*touched tier is
ultra - round 8's comment says "exactly one item lives here" and that
reasoning still holds, so nothing was added there.

"Special gifts" became a third `category` (`"gift"`) in `REWARD_DEFS` rather
than folding into stickers, specifically because `web/js/pages/rewards.js`'s
`section()`/`rewardCard()` functions were already written generically enough
(only `category === "avatar"` gets special-cased, for the equip button) that
a new category needed zero new rendering code - just one more entry in the
page's `CATEGORIES` list. Worth remembering as a pattern: that genericity was
a round-7/8 decision, not something added for this session, and it is
exactly what made "add a whole new kind of reward" a five-minute change
instead of a new page.

### Verification

- `npm test` (92/92, up from 85 - 7 new: the easy-level guard's behaviour,
  its manual-pick-does-not-graduate regression, a reload round-trip, plus
  reward-catalog id-uniqueness/translation-coverage/gift-collection checks).
- `find web/js -name "*.js" | xargs -n1 node --check` on every file, not just
  the three `npm run lint` reaches - session 8 already flagged that a
  dynamically-imported page module can carry a syntax error straight through
  `npm run lint` undetected.
- `npm run check:precache` (48/48, unchanged list - this round only edited
  existing files).
- `npm start` + `npm run test:smoke`: all 17 routes and every existing
  scenario, plus a new `rewards:easy-replay` scenario that forces tafel back
  to level 0 after it has already graduated for real, answers correctly, and
  checks score, coins and the feedback banner all agree nothing was paid.
  Reverted-and-confirmed-failing twice over, per the project's own
  discipline: the Node tests against the `setLevel()`-based first attempt,
  and the smoke scenario against a build with `awardablePoints()` bypassed
  in `settleAnswer()` (reported all three wrong signals: no practice note,
  score 50→55, coins 10→15).
- The deploy workflow's two real steps (`BUILD_ID` stamp, `check_precache.py`)
  re-run locally against a scratch copy of `web/` and `tools/` - both pass,
  48 files, unchanged. `deploy-pages.yml` itself untouched.

### Still open

- The easy-level guard is a one-way, per-game, per-profile flag with no UI of
  its own - a parent cannot see "which games have graduated" anywhere, and
  there is no way to reset it short of clearing the whole profile. Fine for
  what was asked (stop the farming), but a future session adding "why can't
  I earn coins here" messaging beyond the inline practice note should know
  the flag exists and where (`state.easyLevelCleared`).
- `EASY_LEVEL_MAX` (1) and the exact reward-tier costs/gates are this
  session's judgement call, same caveat round 7 already left about
  `DAILY_COIN_CAP` and tier pricing: there is no telemetry behind either
  number, just a plausible reading of the request.
- The new "gift" category reuses stickers' pure-collectible behaviour
  exactly (no equip button, just unlock-and-display) - if a future request
  wants gifts to *do* something distinct from a sticker, that behaviour does
  not exist yet.

---

## Session 13 — 17 September 2026

**Branch:** `claude/eager-albattani-543f9g`

### Asked

1. Read the memory and the changelog first.
2. Multi-touch in local competition mode is **still** not working on a real
   phone - only one person can touch the screen at a time. Make it possible
   for both to touch at once, because that is fairer.
3. Test the deployment on GitHub, and always save the changelog and the
   memory - in this session and every later one.

### Decided: reproduce on a phone before touching anything, because round 12 already "fixed" this

Round 12 (CHANGELOG round 13) added a `pointerdown` handler to the local
race's answer buttons and shipped a regression test that passed. The user
says it still fails on their phone. Two possibilities: the fix was wrong, or
the test was measuring something the phone does not do. So the first move was
not to write code but to re-run round 12's own check **in a phone context**
(`isMobile: true`, 390x844, deviceScaleFactor 3) rather than the 1280x900
`hasTouch: true` desktop context it actually shipped with.

It failed instantly, and the reason was not an event at all:

```
layout: [ { y: 691, inViewport: true,  cardTop: 520, cardBottom: 870 },
          { y: 1055, inViewport: false, cardTop: 884, cardBottom: 1234 } ]
vh: 844, scrollHeight: 1298
events: pointerdown card 0 ... ; pointerdown card -1 (nothing there)
```

**Player 2's card starts 40px below the bottom of the screen.** The arena's
`repeat(auto-fit, minmax(15rem, 1fr))` fits exactly one column under ~600px,
so the cards stack; above them sit the page heading (68px) and the
"how this works" intro (294px), still rendered during play. The second
child's card is not hard to reach - it is not on the screen. Round 12's fix
was correct and necessary; it just could not be the whole answer, and at
1280x900 the two cards sit side by side so the check never saw the problem.

**The lesson worth keeping: a touch test at a desktop viewport is not a
phone test.** `hasTouch: true` gives you touch events; `isMobile: true` plus
a phone-sized viewport gives you the layout the child is actually looking at.
The bug lived entirely in the second one.

### Decided: fix the layout first, then harden the event path anyway

Layout, in order of how much room each freed:

- Hide the page heading and the intro while the play view is up
  (`setRacePlaying()` in `compete.js`) - about 430px back, and nobody reads
  "how this works" mid-race.
- `body.kmg-racing` so the stylesheet can also take back `.kmg-main`'s 5rem
  of bottom padding. That padding is an *ancestor's*, so the arena cannot
  ask for it from its own selector - hence a body class rather than
  something scoped to the arena. It is removed in the page's cleanup
  function too, or it would survive navigating away mid-race.
- A fixed two-column grid at phone widths, with compact card/question/button
  sizing. Two, three, four and all six players now fit on one 390x844 screen.
- A short viewport (landscape phone) gets the same compaction but a single
  row of `--kmg-race-players` columns - there width is plentiful and height
  is not, so wrapping onto a second row is exactly wrong.
- The freed space goes to the buttons, capped: a choice button goes from
  77x48 to about 77x144 on an iPhone 12. Two children jabbing at one phone
  want big targets more than they want whitespace.

Then the event path, as defence against the parts of this that Chromium on
Linux cannot demonstrate:

- `touch-action: none` on the local arena and its buttons, plus no text
  selection and no long-press callout. A second finger landing while the
  first is down must never be reinterpreted as a pan or a pinch-zoom, since
  that is what suppresses or cancels the second player's events. This is only
  safe *because* the arena now fits the screen - with the old stacked layout
  it would have trapped scrolling instead.
- A third input path: one `touchstart` listener on `document` that walks
  `changedTouches`. When several touches land in the same input frame a
  browser may deliver a **single** `touchstart` carrying all of them,
  dispatched at the first touch's target - a per-button listener on the other
  player's card would then never fire at all, and neither would one on a
  shared ancestor if a finger landed outside it. Document level plus
  `changedTouches` is the only arrangement that sees every finger.

Answering is idempotent per player per round (`localAnsweredThisRound`), so
a tap arriving as `touchstart`, `pointerdown` *and* a synthesized `click` is
still one answer. That guard is what makes three overlapping paths safe.

### Found along the way: `el()` has never been able to set a CSS custom property

Setting `--kmg-race-players` from JS did nothing. `dom.js`'s `el()` did
`Object.assign(node.style, value)`, and a CSS variable is not a
`CSSStyleDeclaration` field - `Object.assign` puts a plain JS property on the
style object and the page never hears about it. Verified directly in a
browser: `Object.assign(n.style, {"--x": "4"})` leaves
`getComputedStyle(n).getPropertyValue("--x")` empty, while
`n.style.setProperty("--x", "4")` works.

This is not new and it is not only mine: **every `--kmg-cols` in the codebase
had been silently falling back to its CSS default** since it was introduced.
`ui.js`, `games/common.js` and `games/logica.js` all ask for three columns
when a question has more than four options, and all of them rendered two.
(`getallenjacht`'s hunt grid was the lucky one - its 5 matched the CSS
fallback of 5, so it looked right by coincidence.) Fixed in `el()` by routing
`--*` through `setProperty()`. Measured the newly-three-column grids at 320,
360 and 390px: smallest button 90x138, comfortably over the 44px minimum, so
this corrects the layout without shrinking anything below a usable target.

Worth remembering as a pattern: **a silent no-op is the worst kind of bug in
a hand-rolled helper.** Nothing threw, nothing logged, and the CSS fallback
made every page look plausible. The only reason it surfaced is that this
time the fallback (2) was wrong for the new use.

### Verification

- The rebuilt `compete:local:multitouch` scenario in `tests/web/smoke.mjs`
  now runs in a phone context and asserts three things together: every
  player's answer button inside the viewport, the play view not scrolling,
  and a simultaneous two-finger CDP `Input.dispatchTouchEvent` registering
  both answers. Plus a second pass with `click` and `pointerdown` swallowed
  at the capture phase, which proves the `touchstart` path works on its own
  rather than being shadowed - the same "would this test pass with the fix
  reverted?" discipline session 12 established.
- Confirmed it fails against the previous commit: reverted `compete.js` and
  `app.css` to `HEAD` and re-ran - all four assertions fired, naming the
  off-screen card and 1298px of content in an 844px screen.
- `npm test` (85/85), `npm run lint`, `npm run check:precache` (48/48,
  unchanged file list), `npm run test:smoke` against `node server.js` - all
  17 routes, both race modes, service worker and offline reload clean.
- Beyond the suite, measured at 320x568, 360x640, 390x844, 844x390 landscape
  and 768x1024, with 2, 3, 4 and 6 players: every answer button inside the
  viewport, nothing scrolling, no button under 44px in any combination.
- Deploy: `deploy-pages.yml` untouched; its two real steps (`BUILD_ID` stamp
  via `sed`, `tools/check_precache.py`) re-run locally against a scratch copy
  of `web/` and `tools/` - both pass, 48 files as before. Note the workflow
  only fires on pushes to `main` under `web/**`, so a branch push does not
  deploy; the live deploy happens when this branch merges.

### Notes for running the browser tests in this environment

`playwright` is not a project dependency (`smoke.mjs` resolves it via
`createRequire` and says so plainly if missing). `npm install -g playwright`
installs a version whose expected Chromium build does not match the one
pre-installed at `/opt/pw-browsers`, so a bare `chromium.launch()` fails with
"Executable doesn't exist". Two things make it run:
`NODE_PATH=$(npm root -g)` so `createRequire` finds the global package, and
launching with `executablePath: "/opt/pw-browsers/chromium"`. The committed
test is deliberately left without that path - it is an environment quirk, not
something CI should carry.

### Still open

- **The `touch-action: none` and `touchstart` additions are defence, not
  demonstrated fixes.** The demonstrated bug was the layout, and that is
  proved both ways. Chromium on Linux dispatches a separate `pointerdown`
  per touch point and never coalesced `changedTouches` in any run here, so
  the gesture-suppression and coalescing cases could not be reproduced -
  they are guarded against because iOS Safari and WebKit are where those
  behaviours actually bite, and there is no WebKit-on-a-real-phone in this
  environment. If a future session sees this reported again, get the phone's
  browser and OS version first: that is the missing variable.
- The `dom.js` custom-property fix changes some choice grids from two
  columns to the three their call sites always asked for. Measured as safe
  at 320px, but it is a visible change to games nobody complained about -
  if a grid looks wrong somewhere unexpected, this is the change to look at.
- `.kmg-race-arena.is-local` carries `touch-action: none`, which is only
  correct while the arena fits the screen. Anything that adds height to a
  player card (a hint line, an avatar, a longer question) needs the
  no-scroll assertion in the smoke test re-checked, not just the layout
  eyeballed - that assertion is what keeps the two rules consistent.

---

## Session 12 — 17 September 2026

**Branch:** `claude/upbeat-bardeen-em98oa`

### Asked

1. Local ("together on this device") Race Mode does not support multi-touch,
   so two people cannot actually play at the same time on one screen. Fix it.
2. Reward points reset every day; kids cannot collect enough to buy what they
   want. Keep track of their reward points so they can buy favourite items
   later, and keep track of their collection too.
3. Test everything, confirm the GitHub Pages deploy path is clean, save the
   changelog and memory before committing.

### Decided: the actual bug is "only the first finger gets a click", not the app's event wiring being absent

Read the code before assuming anything was missing: local Race Mode's answer
buttons (`runLocalRound()` in `web/js/pages/compete.js`) already handle two
players independently in the *logic* - separate `buttons` arrays, separate
`localAnsweredThisRound` entries per `playerIndex`, nothing global gets
locked by one player's answer. The gap was one level lower: both buttons
only listened for `click`, and a touch browser's mouse-compatibility layer
only ever synthesizes `click` for the *first* touch point active in a
multi-touch gesture - a real, documented platform behaviour (this is why
Pointer Events exist at all: each active pointer gets its own independent
`pointerdown`/`pointerup`, not filtered down to "whichever finger was
first"). Two children tapping two different cards at the same instant would
silently drop one of the two taps, which is exactly "does not support multi
touch". Fix: also listen on `pointerdown`, filtering out a non-primary mouse
button (so a stray right-click cannot submit an answer) but deliberately
*not* filtering on `isPrimary` - filtering to the primary pointer is the
mistake that would have reintroduced the same bug, since only one concurrent
touch is ever primary. `onClick` stays, for mouse and keyboard/assistive-tech
activation; `handleLocalAnswer()`'s existing "already answered" guard makes
receiving both events for the same tap harmless.

### Found along the way: a synthetic PointerEvent cannot prove this fix, and almost shipped a false-pass test

First attempt at a regression test dispatched
`new PointerEvent("pointerdown", {pointerType: "touch"})` via
`element.dispatchEvent()` from inside `page.evaluate()`, on two buttons in
one call. It passed - including with the fix *reverted* (verified by
temporarily deleting the `onPointerdown` handler and re-running). Chromium
turns out to still synthesize a compatibility `click` from a script-dispatched
touch `pointerdown`, regardless of whether another finger is already "down"
elsewhere - because a JS-dispatched event never enters the browser's actual
touch/gesture pipeline that real hardware input goes through, so none of the
real multi-touch bookkeeping (or its "first finger only" limitation) applies
to it either way. A test that passes whether or not the bug is present is
worse than no test, so it was not shipped as-is.

The fix: `context.newCDPSession(page)` and the low-level CDP
`Input.dispatchTouchEvent`, sending both touch points down in the *same*
call - this goes through Chromium's real touch input pipeline, the same one
real hardware drives. Re-ran the revert-and-confirm check against this
version: with the fix removed, neither card registers an answer (real
simultaneous touch input does not even get a compatibility click for the
first point, let alone the second - consistent with "not supported" being
worse than "only one player's tap works"); with the fix present, both
register immediately, since `pointerdown` needs no click synthesis at all.
Confirmed stable over several repeated runs before trusting it. Landed as
`tests/web/smoke.mjs`'s `compete:local:multitouch` scenario, in its own
`hasTouch: true` browser context so the rest of the smoke test's shared
`context`/`page` (used by all seventeen routes) is not affected by turning
touch emulation on.

### Decided: the reward "reset" was the daily coin cap discarding earnings, not a persistence bug

Read `state.js`/`rewards.js`/`pages/rewards.js` fully before touching
anything: `coins` and `unlockedRewards` were already saved with the rest of
the profile in `localStorage` and restored on every reload, never reset by
any automatic (non-parent-initiated) code path - round 7/8's design already
intended exactly what was asked for here. The actual mechanism behind "resets
every day": `DAILY_COIN_CAP` (300) capped how many coins could be *earned*
per calendar day, and once hit, every further correct answer for the rest of
that day paid score but zero coins - the balance simply stopped moving until
the next day, invisibly, with no message explaining why. To a child (or a
parent watching) that reads exactly like "the reward resets every day", and
at 300/day even perfect daily play needs 27 days for the 8000-coin ultra
item - "cannot collect enough points" is a predictable outcome of that
design, not a bug report about something crashing.

Round 7's own reasoning for the cap (stop one long session from clearing the
whole shop) is still in the CHANGELOG/this file for the next session to read
before re-adding something like it - but the request this time was explicit
and direct: keep track of reward points so they can be spent later, full
stop. Removed the cap rather than raising the number, since round 7 already
flagged "there is no telemetry to confirm this number" and any new fixed
cap would just relocate the identical complaint to a different threshold.
`addScore()` now grants coins 1:1 with points, same as `totalScore`, forever
- the same lifetime-number treatment `totalScore` already gets, extended to
the currency that is actually meant to be saved up. Tiered pricing is
untouched; only the earning side changed.

### Found along the way: Node has no `localStorage`, so this suite could not previously prove a profile round-trips

Wanted a regression test that a saved profile's coins and collection survive
a reload, to pin down the actual claim in the request. `state.js` wraps
every `localStorage` call in try/catch specifically so it degrades
gracefully when there is none (its own module comment says Safari private
mode) - which also means `saveCurrentProfile()`/`applyProfile()` are
silent no-ops in this Node test environment (`typeof localStorage ===
"undefined"` here), and nothing in the existing suite had ever exercised
that pair together. A tiny in-memory `localStorage` shim, installed on
`globalThis` for the duration of one test and restored afterward, was
enough to exercise the real save-then-reload path for the first time in
this suite. Worth remembering as a pattern if a future session needs to test
anything else that goes through `saveCurrentProfile()`/`applyProfile()`.

### Verification

- `npm test` - 85 Node tests (same count: two daily-cap tests removed, two
  coin-persistence tests added). `npm run lint`. `npm run check:precache`
  (48/48 files, unchanged - only JS/CSS/i18n content changed, not the file
  list).
- `npm run test:smoke` against `node server.js`, twice at the end (once
  right after landing the fix, once as a final pass before committing): all
  17 routes, the reward shop earning-and-unlocking flow (now with no
  daily-cap strip to check), the existing sequential local-race play-through
  to a results screen, the new `compete:local:multitouch` scenario, and the
  online two-browser race - all clean.
- The deploy workflow's two real steps (`BUILD_ID` stamp via `sed`,
  `tools/check_precache.py`) re-run locally against a scratch copy of `web/`
  and `tools/`, exactly as sessions 7, 9 and 11 did - both pass unchanged.
  `deploy-pages.yml` itself was not touched, and everything edited this
  session that lives outside `web/` (the two test files) cannot affect the
  live Pages deploy at all, which only uploads `web/`.

### Still open

- `DAILY_COIN_CAP` no longer exists, so a future session should not
  reintroduce a *different* one to solve some other pacing complaint without
  first checking whether the actual problem is a cap discarding earnings
  (as it was here) versus something else - re-read this entry first.
- The multi-touch fix is scoped to local Race Mode's answer buttons only,
  since that is the one place on this shared-screen app where two people
  are ever expected to touch the screen at once. No other page needed the
  same treatment.

---

## Session 11 — 16 September 2026

**Branch:** `claude/webrtc-rollback-c3tjyq`

### Asked

Session 10's WebRTC "Direct connection" race mode was judged too complex.
Roll back to the previous commit version, safely, without breaking the
GitHub Pages deployment.

### Decided: revert the merge, don't rewrite history

`main` already had session 10's PR (#6, merge commit `8b449e9`) merged in,
so simply resetting this branch to before it would have thrown away shared,
published history and forced a rewrite of `main` to match - risky for a
change whose only goal is "make the code simpler again," and unnecessary:
`git revert -m 1 8b449e9` produces the same resulting tree (the merge's own
diff was exactly PR #6's diff, nothing else landed on `main` afterward) as
an ordinary, additive commit. It's itself trivially revertible if the
decision changes again, and it doesn't touch anyone else's clone or force a
`git pull --rebase` on collaborators.

### Verified nothing depended on what was removed

Before trusting the revert, checked whether anything committed after
`8b449e9` referenced the WebRTC files - nothing had (this branch was cut
directly from `main`'s tip), so the revert applied with zero conflicts.
After it: `npm test` (85 tests, back to round 10's count exactly), `npm run
lint`, and `python3 tools/check_precache.py` (48/48 files, also back to
round 10's count) all pass unchanged. `web/js/pages/compete.js`'s online
mode is back to a single WebSocket `RaceClient` flow with no "connection
method" choice - grepped the whole page afterward for any leftover
`Direct`/`webrtc`/`qrcode` reference and found none. `deploy-pages.yml`
itself was never touched by session 10 or this revert, so the two things
that actually gate a live deploy (the `BUILD_ID` stamp and the precache
check) were re-run locally exactly as the workflow runs them, unchanged in
behavior from round 10.

### Still open

- Race Mode's online play is, once again, self-hosted-only
  (`npm start`) - the same limitation session 9 and session 10 both
  documented. If a future session wants online play back on the published
  GitHub Pages site, session 10's approach (this file, above the line) and
  its CHANGELOG entry are still there in full via `git show 8b449e9` even
  though the code itself is reverted - worth reading before re-attempting
  the same design rather than re-deriving it from scratch.

---

## Session 9 — 16 September 2026

**Branch:** `claude/race-mode-multiplayer-wwy40y`

### Asked

Read the memory, changelog and example code in the sibling `Trung-Nguyen`
project first (a related repo with a further-along version of this same
app, including a real online "Competitie" mode with join codes and a
WebSocket server). Then fix Race Mode here: today it only plays one person
at a time, there's no join code, there's no side-by-side compete mode,
there's no need for a "check" button, and it should be a race with more
than one kind of game. Merge that redesign into this repo, verify the
GitHub Actions workflow still runs cleanly, and save the changelog/memory.

### Decided: reference, not reuse - `Trung-Nguyen`'s server is 2-player only

`Trung-Nguyen/server-multiplayer.js` and its `competitie.js` page are a
good proof that a join-code room engine works here, but they are hardcoded
to exactly two players (`room.players[0]`/`[1]`, `p1`/`p2` everywhere) -
reasonable for a head-to-head "Competitie", wrong for something called a
*race*, which reads as more than one opponent. `race-server.js` and
`race-logic.js` here generalize every one of those spots to a `players`
array of `MIN_PLAYERS_ONLINE`..`MAX_PLAYERS` (2..6): `joinRoom`'s capacity
check, the round-end-early check (`answeredCount >= connectedCount`), the
recap and finish broadcasts, and the results screen and breakdown table on
the client - all loop over the array instead of naming two slots. Porting
straight would have shipped the same one-opponent ceiling under a new name.

Also fixed, not carried over: `Trung-Nguyen`'s REST fallback route matches
`req.body.action` against `'start'/'answer'/'rematch'`, but its own client
posts `req.body.type` as `'start_game'/'submit_answer'/'rematch'` - the
fallback silently never matches. Here the REST `/action` route and the
WebSocket handler share one `handleMessage(ws, msg)` keyed on `type`, so
there's only one shape to keep in sync, not two.

### Decided: a real join code needs a real server, and that's still fine here

Round 8's "challenge code" (`web/js/compete.js`, now deleted) was a
finished race's results, base64url-encoded into a link for someone else to
try *afterwards* - not a code anyone could join *before* a race starts,
and never simultaneous. That's what "no join code" and "no side-by-side"
actually meant: the old design was asynchronous by construction. A live
lobby with a real join code needs something authoritative to keep everyone
synchronized, which a static site cannot do by itself - so this is the one
feature in the app that genuinely needs a server, same conclusion
`Trung-Nguyen` reached. The same escape hatch applies: `deploy-pages.yml`
uploads the `web/` folder only, `race-server.js`/`server.js` live outside
it, so online play simply doesn't exist on the live GitHub Pages site and
nothing about the deploy is at risk - verified by re-running the workflow's
two real steps (`BUILD_ID` stamp, `check_precache.py`) locally against the
new file set. Local (same-device) mode needs no server at all and is the
one that actually works for everyone, always - it's listed first in the UI
for that reason. Online mode fails soft: a `fetch`/`WebSocket` call against
a GitHub Pages origin just errors, and the page shows
`compete.server_unavailable` pointing at Local mode instead of hanging.

### Decided: multiple choice removes the check button *and* enables categories

"No need for a check button" and "multiple types of games" turned out to be
the same fix. The old race used a typed numeric answer (`numberField` +
"Controleer"), which only works for a category whose answer is a plain
number - a fraction category's answer ("3/4") can't go through a number
pad. Switching every category to multiple choice (`makeChoices`, four
options including the answer, ported from `Trung-Nguyen`'s
`competition-logic.js`) fixes both at once: a tap *is* the submission
(exactly how Bliksemronde already works, so this isn't a new pattern for
the app), and it unblocks `breuken`/`procenten` as real categories
alongside the original arithmetic mix and a new `tafels` category.

One thing kept different from `Trung-Nguyen` on purpose: their
`competition-logic.js` hardcodes `"{pct}% van {base}"` - Dutch text with no
English counterpart, in an app whose i18n discipline (`utils/i18n.py` as
single source of truth, key-parity tests) is otherwise strict about never
doing that. The percentage category here returns a `textKey`/`textVars`
pair instead of pre-built text, resolved through the normal `t()` table
(`race.pct_of`, both languages) - the one new i18n key this round needed
beyond rewriting the existing 44 `compete.*` keys for the new flow.

### Decided: local and online results share one shape, on purpose

Local (same-device) and online results used to look like they'd need
separate rendering code - one is computed client-side from arrays kept in
the page, the other arrives as a server broadcast. Built the local side to
assemble the exact same `{stats, roundHistory}` shape the server already
sends (`id`/`name`/`score`/`correctCount`/`avgSpeed` per player,
`round`/`question`/`results`/`roundWinners` per question) purely so
`renderResultsScreen()` and the breakdown table could be one function
instead of two near-duplicates. Worth remembering as a pattern: when a
server event and a client computation describe the same real-world thing,
shaping the client side to match the wire format is usually less code than
letting them drift into two formats plus a translation step.

### Verification

- `npm test` - 85 Node tests pass, including the rewritten race-mode suite
  (every category valid at every level, `makeChoices` always unique and
  includes the answer, `rankPlayers` generalized past two players, the
  percentage category's `textKey` instead of hardcoded text) and the
  existing i18n key-parity tests (every rewritten `compete.*` key and the
  new `race.pct_of` key checked NL/EN placeholder-for-placeholder).
- `python3 tools/check_precache.py` - 48/48 files, after swapping
  `./js/compete.js` for `./js/race-logic.js` in `web/sw.js`.
- `tests/web/smoke.mjs` run against `node server.js` end to end: a full
  5-question local race played to the results screen with 2 side-by-side
  player cards, and a genuine online round-trip - one browser page creates
  a room, a second page joins with the code from a shared link, the host's
  lobby updates live when the guest joins, the host starts the race, both
  pages reach the same round, and the host's recap reflects the guest's
  answer. This is the first time this app's multiplayer path has been
  exercised as two real browser contexts talking through a real server
  in a test, rather than asserted from a single page.
- The GitHub Actions workflow itself was re-run locally, not just read:
  copied `web/` and `tools/` to a scratch directory, ran the exact `sed`
  `BUILD_ID` stamp and `check_precache.py` commands `deploy-pages.yml`
  runs, both passed. `server.js`/`race-server.js`/`package.json` sit
  outside `web/`, so `upload-pages-artifact` never touches them.

### Still open

- Online mode only works self-hosted (`npm start`), not on the published
  GitHub Pages site - by design (see above), but worth restating so a
  future session doesn't "fix" it by trying to add a server to Pages,
  which doesn't run arbitrary server code.
- `race-server.js` keeps rooms in memory with no persistence - a server
  restart mid-race loses it. Fine for a household/classroom's own server,
  not something to build a tournament feature on top of without revisiting.
- No rate limiting or room-code collision back-pressure beyond "retry until
  the code is free" - acceptable at the scale this app runs at.

---

## Session 8 — 16 September 2026

**Branch:** `claude/multiplayer-competition-mode-ipv44p`

### Asked

Add a competition mode: multiplayer children can compete with others,
locally on the same network or with people anywhere in the world. Points go
to whoever answers faster; a wrong answer is worth nothing. Each question
gets 15 seconds. Be creative if there's a better way. Save the changelog and
memory, and test everything against the GitHub deploy path.

### Decided: no live cross-device match, and why that's not a cop-out

"Same network or anywhere in the world" reads like a request for a realtime
multiplayer backend - a websocket relay, a matchmaking step, maybe accounts.
This app has nowhere to run one: round 6 (below) moved it to GitHub Pages
specifically to get *rid* of a server, and that reasoning does not stop
being true because a new feature would be more convenient with one. Standing
up even a small relay would mean a second free-tier account, a second
dashboard, and a second thing that can go down - exactly the operational
weight the whole platform move was designed to avoid, for a feature a child
uses a few times a week.

WebRTC without a relay was the other option actually considered: two
browsers *can* talk directly once connected, but getting to "connected" still
needs a signalling exchange (SDP offer/answer, ICE candidates) that has to
travel somewhere before the peer connection exists - which is the same
problem restated, not solved, unless it is done by hand (read a code off one
screen, type it into the other). That is a real design, but it is a
same-room, same-sitting feature wearing a "works anywhere in the world"
label, and it would have been the most fragile part of the app by far,
un-debuggable in this sandbox (no two real devices, and UDP for STUN is not
guaranteed through the proxy here anyway).

The reframe: a race does not need to be *live* to be a real competition -
it needs the same questions and a fair, comparable score. So a race became
data (`{questions, level, participants}`), sending a challenge became
base64url-encoding that data into a link, and "anywhere in the world" turned
into "wherever you'd already send a text". Playing it back-to-back in the
same room (pass the device, `web/js/pages/compete.js`'s "add a local
player") and playing it days apart with an ocean between you are the *same
code path* - only whether the round-trip happens through memory or through
a copy-pasted link differs. That symmetry is the part worth being pleased
with; it was not the first idea (the first idea was the WebRTC one above).

### Decided: typed triples over rendered questions, and why `decodeChallenge` is adversarial

Two encoding choices made the resulting link short and the decoder simple to
get right:

- Questions travel as `[a, b, op]`, not as `{text, answer, options}`. The
  display string and the correct answer are both pure functions of the
  triple (`questionText` / `questionAnswer` in `compete.js`), so nothing
  needs to agree with anything else, and there is no rendered HTML in the
  payload to worry about.
- The race uses typed numeric answers (`numberField`, same as eight of the
  other games) instead of Bliksemronde's four-option multiple choice, purely
  so there are no distractors to generate and ship - one less thing in the
  link, one less thing that could be inconsistent between the person who
  made the challenge and the person opening it.

A challenge code is untrusted input the moment it can be hand-edited or
pasted from anywhere, so `decodeChallenge` never trusts a field: version,
question count, every operand and operator, every participant's name
length, elapsed time and score are all range-checked, and anything outside
range returns `null` for the whole race rather than a partially-trusted
object. This is not paranoia for its own sake - `web/js/compete.js`'s
comment on `sanitizeRace` says so, but the concrete failure mode is a
crafted link handing the page a 999999ms answer time or a "483 x 917"
question that breaks the layout. The Node tests spend more lines on this
(seven `decodeChallenge` tests, several looping over a dozen-plus malformed
variants each) than on the happy path, on purpose.

One thing this is *not*: participant names are never rendered as HTML
anywhere in the page (`el(..., {text: ...})` only, never `raw()`/`{html:}`),
because a challenge's `p[].n` field is exactly the kind of untrusted string
that would otherwise be an XSS vector in a link a child might open. A test
(`decodeChallenge treats a name that looks like markup as plain text...`)
pins this down at the engine boundary; the page's job is just to keep
honouring it as text.

### Decided: difficulty is a `localStorage` preference, not a `state.levels` entry

The race's difficulty picker looks like `levelPicker()`/`getLevel`/
`setLevel` from `ui.js`/`state.js`, and the first draft used them directly -
until `applyProfile()` turned out to rebuild `state.levels` from exactly the
fixed `GAME_KEYS` array on every profile switch (`state.js`), silently
dropping anything stored under a `"compete"` key that isn't in that list.
Adding `"compete"` to `GAME_KEYS` was the other way out, but that array also
drives the badge conditions (`playedAllGames`, `allLevelsMaxed`) and the home
page's overall-progress bar - a race's difficulty is not curriculum mastery,
and folding it in would have made both of those measure something they
shouldn't. Ended up doing what Bliksemronde already does for its own
best-score record: a small dedicated `localStorage` key
(`kmg.compete.level`), read/written directly, same trick, same file
(`compete.js`'s comment says so explicitly for the next person who reaches
for `setLevel` here).

The NAV entry correspondingly has no `game` key, so it does not get a home
tile with a level bar it would give stale numbers for - just a normal nav
link plus a manual button on the home page next to rewards/uitleg/dashboard.

### Decided: only the local player's own run touches real score/coins/log

A finished race can have several participants (a local pass-and-play guest,
or names that arrived inside a decoded challenge). Only the one actually
playing on this device and profile goes through `settleAnswer()` - real
score, coins, the log, badges, exactly like every other game. Everyone else
is display-only data for the results screen, never written into this
device's saved profile. This was a deliberate boundary, not an oversight:
a guest playing pass-and-play has typed a name, not logged in, and should
not need to - and a name arriving inside someone else's challenge link is
not a profile on this device at all.

### Done

- **`web/js/compete.js`** (new) - the engine: level-scaled question
  generation, `racePoints()` (100 instant, 10 at the 15s buzzer, 0 for
  wrong/timeout), `newRace`/`makeParticipant`/`rankParticipants`/
  `fastestPerQuestion`, and `encodeChallenge`/`decodeChallenge`/
  `extractChallengeCode`/`buildChallengeUrl`. No DOM - imports only
  `rng.js`.
- **`web/js/pages/compete.js`** (new) - the page, phases intro → racing →
  done: start-a-race / incoming-challenge-preview / paste-a-code, the
  per-question clock (own `requestAnimationFrame` loop, stopped in the
  cleanup the router calls, same shape as `bliksem.js`'s), the
  leaderboard/head-to-head/per-question-breakdown tables, and the share
  panel (clipboard with an `execCommand` fallback, `navigator.share` where
  available, "add a local player").
- **`web/js/nav.js`**, **`web/js/pages/home.js`** - a `#/compete` route (no
  `game` key - see above) and a home-page link.
- **`web/js/illustrations.js`** - `competeIllustration()`, two rockets
  racing a waving checkered flag past a stopwatch, registered in
  `ILLUSTRATIONS`.
- **`web/js/i18n-data.js`** - `nav.compete`, `game.compete.name`, 44
  `compete.*` keys, both languages, key-parity and placeholder-parity tests
  both pass (609 keys total, up from 563).
- **`web/css/app.css`** - one new section, deliberately built from existing
  classes (`.kmg-card`, `.kmg-table`, `.kmg-levelpicker`, `.kmg-timedhead`)
  rather than new chrome.
- **`web/sw.js`** - both new files added to `PRECACHE`; `tools/check_precache.py`
  passes (48 files).
- Tests: 17 new Node tests in `tests/web/test_logic.mjs` (92 total, up from
  75), and a new Playwright scenario in `tests/web/smoke.mjs` covering the
  `compete` route in the full route sweep, the per-question clock actually
  ticking and stopping on navigate-away, a full 8-question race reaching the
  results/share screen, and - the one that actually exercises the
  serverless design end to end - opening the exact challenge link the app
  generated in a fresh navigation and confirming it decodes back into a live
  "you've been challenged" screen.

### Found along the way

`npm run lint` (`node --check server.js web/js/main.js`) does not reach a
dynamically-imported page module at all, so it would have stayed green even
with a syntax error in `pages/compete.js`. Ran `node --check` across every
file under `web/js` by hand as a result; worth remembering that `npm run
lint` alone is not sufficient evidence a new page module parses.

`server.js` needs `npm install` before it will boot (`express` is a real
dependency, not vendored) - unsurprising, but worth noting since this
session's sandbox started without `node_modules/` and the first attempt to
run the dev server for the smoke test failed on that rather than on
anything about this feature.

### Still open

- The `localStorage`-only route means a challenge code's length grows with
  both question count (fixed at 8) and participant count (capped at 12 in
  `decodeChallenge`) - fine for a text message or a chat link, but a long
  forwarded chain could hit length limits on some older SMS gateways or
  QR-code readers if either were ever used to carry it instead of a plain
  URL. Not a problem observed, just a ceiling this design has that a server
  would not.
- No UI for a parent to see race history on the dashboard - a finished race
  currently only exists in the page's own memory and, if shared, inside the
  link itself. The *local* player's own answers do land in the normal
  per-question log (same as any other game), just not as a race summary.
- Levels 3-5 introduce division; the smoke test's full-race run stays at
  level 0 (addition/subtraction only) specifically so a straightforward text
  parse of the question can't be thrown off by an edge case - the Node tests
  are what actually cover every operator at every level.

---

## Session 7 — 15 September 2026

**Branch:** `claude/reward-difficulty-characters-bbdk1u`

### Asked

1. Make the reward shop harder: a child was collecting every character and
   sticker in a single day, and unlocking the special ones should need a
   certain level as well as more points.
2. Add more characters and stickers, including special anime-style
   characters that cost more, and a rare 3D character only reachable after
   finishing everything.
3. A parent-visible activity/results log with at least 10 days of history
   that survives a page refresh.
4. Test everything at the end and confirm the GitHub deployment path is
   still clean.

### Decided: a coin cap, not just higher prices

Raising prices alone does not fix "cleared in one day", because the
underlying problem is that a long single session can earn thousands of
points. `state.js` now caps *spendable* coins at `DAILY_COIN_CAP` (300) per
calendar day - score, streaks, levels and badges stay uncapped, since those
are achievement, not currency. That is what turns "the shop" from a
one-sitting problem into a genuinely multi-week one, on top of higher
individual prices.

The other half of "a certain level" is `highestLevelReached()`: rare tier
and up now also check the child's best level across every game, independent
of coins. A locked card says which of the two - level or coins - is still
missing, in that priority order, rather than only ever showing a price.

### Decided: original characters, not licensed ones

Luffy (One Piece) was the example given, but a real franchise character's
name and likeness are trademarked/copyrighted; reproducing them - even as
emoji-and-name reward cards in a personal project - is not something to
build. The **mythic** tier delivers the same feeling (rare, anime-styled,
expensive, unlocked late) with original characters instead: Dragon Blade
Hero, Star Ninja, Galaxy Guardian, and matching stickers. Worth saying
plainly here so a future session does not "fix" this by adding the real
names back in.

### Decided: a real 3D reward, kept dependency-free

The one **ultra** item (`avatar_3d_champion`, gated on `requiresMastery`:
every game at its own true max - `allGamesAtTrueMax()`, not the shared
level-5 constant - and every other reward already unlocked) renders as an
actual rotating cube: six `.kmg-cube-face` divs, `transform-style:
preserve-3d`, one `@keyframes` rule. No Three.js, no new dependency - this
app's whole architecture is "no build step, no framework", and the existing
confetti/charts are hand-rolled for the same reason. It freezes on
`prefers-reduced-motion` for free, via the global rule every other animation
already obeys.

### Done

- **`web/js/rewards.js`**: catalog grown from 21 items to 49 (26 characters,
  23 stickers) across seven tiers; `minLevel` and `requiresMastery` gates;
  `lockReason()` so the UI can explain *why* something is locked, not just
  *that* it is.
- **`web/js/state.js`**: `DAILY_COIN_CAP`, `coinsEarnedToday`/`coinsEarnedDay`
  (persisted, UTC-day rollover), `highestLevelReached()`,
  `allGamesAtTrueMax()`.
- **`web/js/pages/rewards.js`** + **`web/css/app.css`**: tier ribbons, a
  daily-coins strip with its own progress bar, lock-reason messages, and the
  3D cube for the capstone card.
- **`web/js/log.js`**: `trimToBudget()` guarantees `MIN_RETENTION_DAYS` (14)
  survive regardless of the row-count budget - only older rows are trimmed
  to fit it.
- **`web/js/pages/dashboard.js`**: a new daily-activity table (date,
  players, sessions, questions, accuracy, minutes, points), newest first,
  next to the existing charts and raw log.
- **~50 new i18n keys**, NL and EN, hand-added: `utils/i18n.py` and its
  generator are gone from this repo (removed in an earlier session), so
  `web/js/i18n-data.js` is now the source of truth and was edited directly.
- Tests: 13 new Node tests (daily cap and its day-rollover, level/mastery
  gating on `unlockReward`, `trimToBudget`'s retention guarantee) and three
  new Playwright smoke checks (the daily-cap strip renders a number, a
  mythic-tier card shows a lock reason rather than a buy button, and a
  dashboard reload keeps both the raw log and the new activity table).

### Found along the way

**Testing this by hand-editing localStorage races the app's own autosave.**
`main.js` saves the current profile on `pagehide` and on
`visibilitychange`, so injecting a profile into localStorage on an
already-booted page and then calling `page.reload()` loses the injection:
the outgoing page's unload handler fires first, using its own stale
in-memory state, and overwrites what was just written. Seeding through
Playwright's `context.addInitScript()` (which runs before the app's own
boot code, on every navigation) avoids it for a first load - but then
itself becomes the trap on a *second* reload in the same test, since it
reseeds the original data every time. The fix used here: mutate state
in-page, then re-render with a client-side hash round-trip
(`location.hash = "#/home"` then back) instead of `reload()`, since the
router re-renders on `hashchange` without tearing down the document.
Worth remembering for any future test that pokes at localStorage mid-test.

**`npm test`/`check:precache`/`test:smoke` are not part of the GitHub Pages
deploy workflow** - `.github/workflows/deploy-pages.yml` only runs
`tools/check_precache.py`. Nothing here changed that, but it means the full
test suite (75 Node tests, precache check, 16-route Playwright smoke test)
is a local/manual discipline, not a CI gate - all three were run by hand
this session and are clean.

### Still open

- `DAILY_COIN_CAP` (300) and the tier costs are one set of numbers that
  felt right against this session's estimate of how fast a child earns
  coins; there is no telemetry to confirm it against, so a parent finding it
  too slow or too fast is a config change (`state.js`, `rewards.js`), not a
  redesign.
- No UI for a parent to adjust the daily cap - it is a constant in code.
  Fine for now, a real setting if this project ever gets a settings page.
- The dashboard's daily-activity table has no row cap of its own; on a
  device played on for years it will eventually be as long as the number of
  days ever played (the raw per-question table already caps at 200 shown
  rows, which is where this could follow if it ever becomes a problem).

---

## Session 6 — 10 September 2026

**Branch:** `claude/game-deployment-platform-4sln0n`

### Asked

1. Streamlit may not be a good deployment target for interactive, visual,
   animated games. Find a better **free** hosting option that is easy for kids
   to reach and easy to deploy.
2. Migrate all the games to it, improving interaction, animation and
   visualisation along the way.
3. Write a detailed step-by-step deployment guide.

### Decided: GitHub Pages, and a static client-side app

The platform question and the architecture question turned out to be the same
question. The reason Streamlit hurts here is not that its hosting is bad — it
is that **every tap is a server round-trip**, and these games are now animated
and timed. The countdowns had to be faked with `st.fragment(run_every=1)`: one
round-trip per second, stepping a whole second at a time, with the answer
buttons deliberately placed outside the fragment because a rerun landing
between render and click would swallow the tap. That is a lot of care spent
working around the platform rather than on the game.

So the fix is not "host Streamlit somewhere better". It is to make the app
client-side, at which point the hosting question answers itself: any static
host will do, and the cheapest, simplest one is the GitHub the code is already
on.

Cloudflare Pages and Netlify were the real alternatives and would both work.
GitHub Pages won on one specific ground: **it needs nothing new.** No second
account, no second dashboard, no second set of credentials to lose. For a
project maintained in evenings that beats CDN benchmarks. It is also free
without qualification here, because the repository is public.

Three consequences worth stating plainly, since they were the actual decision:

- **No cold start.** Streamlit Community Cloud sleeps an idle app; a child
  opening a bookmark after school would get "this app has gone to sleep".
- **It works offline.** A service worker precaches everything, so the games work
  in the car and at a grandparent's house. This was not possible before at all.
- **Results stop being a server file.** That is a real trade, not a pure win —
  see below.

### Done

**All twelve games, plus home, the explainer and the parent dashboard**, ported
to `web/` as plain ES modules. No build step, no framework, no bundler: what is
in the repository is what the browser runs. Question generators, level curves,
scoring, badges, adaptive difficulty and both languages were ported unchanged —
the Node test suite exists mostly to prove that.

**`utils/i18n.py` stayed the source of truth for copy.** `tools/gen_i18n.py`
parses it with `ast` (no Streamlit import needed) and emits
`web/js/i18n-data.js`, refusing to run if a key exists in one language and not
the other. That is what stopped 473 strings drifting between two front-ends
during the port.

**The interaction work is where the platform move actually pays.** The number
pad is the clearest example: `st.number_input` renders a small desktop spinner
that, on a tablet, summons the OS keyboard over the visual and the question. A
purpose-built pad in the calculator layout children already know is not a
nicer version of that — it is the thing that makes a tablet usable at all.
Similarly: correct answers auto-advance so a child in flow never hunts for
"next" (wrong ones deliberately do not — that is the one moment they need to
read); the fraction explorer is now the pizza itself, tapped slice by slice;
Number Hunt restyles one tile per tap instead of rebuilding twenty buttons.

**Animation and sound got the upgrade the CSS-only version could not have.**
Canvas confetti with gravity and tumble, bursting from the button the child
tapped. A full-screen level-up card, because the old toast was being missed.
Web Audio effects generated at the instant of the tap, including a correct
answer arpeggio that climbs a step for every answer in the streak — a small
thing a child notices within about four answers. All of it still honours
`prefers-reduced-motion`, on every single visual.

**The dashboard charts are hand-written SVG**, which removed pandas and Altair
from the payload. Both are single-measure charts, so both use one hue rather
than a categorical palette — a rainbow of game colours would imply a
distinction that is not in the data. The two hues were checked against the
light and dark surfaces for contrast and lightness rather than picked by eye.

### Found along the way

**Two bugs a test suite would not have caught, both found by looking.**

The first: at phone width, a semi-transparent overlay covered the entire app
and swallowed every tap. The nav scrim's `display: block` inside a
`@media (max-width: 900px)` block silently overrode the built-in
`[hidden] { display: none }`. It was invisible in the desktop screenshots and
the app still *rendered* correctly on a phone — it just could not be used.
Found by noticing that a mobile screenshot looked washed out. The smoke test
now hit-tests the first control at phone width and clicks it, so this class of
bug fails loudly next time.

The second: `Node.append(null)` prints the literal word "null". A conditional
child written as `condition ? el(...) : null` renders as text, because
`append()` stringifies its arguments. It was sitting under the streak counter
in the sidebar on every screenshot. Fixed with a filtering `append()` helper.

Both are worth remembering as a pattern: **the browser will happily render
something wrong rather than throw.** The Node tests caught none of it; a
screenshot caught both.

**A third, smaller one:** headless Chromium will not screenshot at an exact
small size — `--window-size` below ~500px and `--force-device-scale-factor`
below 0.5 are both clamped. Rather than add Pillow for three icons,
`tools/png_tool.py` crops and box-downscales PNGs with nothing but `zlib` and
`struct`.

### The trade being made, stated plainly

**Results are now per device.** The Streamlit version wrote
`logs/all_sessions_log.csv` on the server: one shared history, wiped on every
redeploy. Browser storage is better in three ways — it survives redeploys, it
survives being offline, and no child's data ever leaves their device — and
worse in one: a tablet and a laptop keep separate histories.

The CSV export is therefore prominent on the dashboard rather than at the
bottom, and its columns are byte-identical to the ones `utils/gamelog.py`
wrote, so an old export and a new one open side by side.

This also settles most of `docs/PLATFORM_ROADMAP.md` section 6 for free: no
server, no third party, no analytics, no external fonts or CDNs on any page a
child sees. Worth noting for the roadmap: the classroom platform will still
need a real backend, and nothing here blocks that — the generators, level curve
and objective map are still portable logic, and a static front-end can talk to
an API whenever one exists.

### Still open

- **The Streamlit app was deliberately not deleted.** `app.py`, `pages/` and
  `utils/` still run, and `utils/i18n.py` is still the source of truth for
  copy. Delete the Streamlit half once the web version has been used for a few
  weeks and nothing turns out to be missing — that is a decision to make on
  evidence, not on migration day.
- **Pages has to be switched on once by hand:** Settings → Pages → Source =
  *GitHub Actions*. It cannot be done from a workflow. `docs/DEPLOYMENT.md` §4
  walks through it.
- The parent dashboard shows the last 200 attempts in its table; everything
  older is in the CSV. If a parent ever wants to scroll further, that becomes a
  paging question.
- No per-device sync, by design. If the roadmap's classroom platform happens,
  that is where it belongs — not bolted onto the static app.

---

## Session 5 — 9 September 2026

**Branch:** `claude/edu-gaming-platform-plan-2e69e7`

### Asked

1. A development plan and roadmap for a bigger, teacher-facing classroom
   platform: multiple pupil accounts, logged and analysed play, per-child
   development roadmaps, and teacher-built exams — for a teacher with no
   software skills. With milestones and pauses for feedback and brainstorm.
2. Whether animation is possible with Streamlit and the current stack.
3. Find and fix small bugs so deployment runs cleanly.
4. More games — logic games suited to groep 6/7, and fast-response games.
5. Always add a changelog and a session log.

### Done

**1. Classroom platform plan** — `docs/PLATFORM_ROADMAP.md`, and published as
a shareable page for the conversation with the teacher.

Seven phases, six checkpoints, roughly 20 weeks to a pilot review. The
checkpoints are the substance: each one ends in a decision the *teacher*
makes, not a status update. Checkpoint 2 is a login dry run with five
children where the developer is not allowed to help; Checkpoint 4 compares
the mastery model against the teacher's own judgement of six pupils they know
well; Checkpoint 5 is the teacher building an exam alone while the developer
watches in silence.

Three things in the plan are worth carrying forward even if the rest is cut:

- **The learning-objective map is the keystone.** Today a log line records
  which *game* was played. Until it records which *objective* was practised,
  none of the analysis, recommendation or exam features are possible. It is
  the first real piece of work and it needs the teacher in the room.
- **The speed games make a second axis possible.** Accuracy says whether a
  child *can*; response time says whether they can *without thinking*. Both
  are recorded now. A child who is accurate but slow needs different work
  from one who is fast but sloppy, and few classroom tools show a teacher
  both.
- **Privacy is a blocking dependency, not a later chore.** This is data about
  identifiable children in a Dutch school. The plan refuses to start Phase 1
  before the AVG questions have written answers — controller vs. processor,
  verwerkersovereenkomst, DPIA, EU hosting, retention, parental access.

The plan also states plainly that Streamlit is unlikely to hold thirty
concurrent pupils, and schedules that decision — with a load test — at
Checkpoint 5, rather than letting it be discovered when a lesson falls over.

**2. Animation** — yes, and quite a lot of it, with no new dependency.

Two mechanisms, both pure CSS:

- Global keyframes and helper classes in a new `utils/anim.py`, injected once
  per run alongside the existing custom CSS.
- A `<style>` block embedded inside each generated SVG in `utils/visuals.py`,
  with class names scoped to that one render.

Every visual now builds itself rather than appearing complete: pizza slices
fill one at a time, dot arrays pop in row by row, bars grow from zero, clock
hands sweep round, shapes draw their own outline, the balance scale rocks and
settles. Question cards slide up; correct answers pop, wrong ones shake;
level-ups and badges fire confetti.

Four things learned that the next session should not have to rediscover:

- **Streamlit rebuilds the DOM for a markdown block on every rerun**, so a CSS
  animation attached to it restarts from 0% each time. That is what makes all
  of this work without JavaScript — and JavaScript was not an option anyway,
  because Streamlit strips `<script>` out of markdown HTML.
- **Inline SVG shares the page's global CSS scope.** Two pizzas on one page
  with a shared `.slice` class animate each other. Every class and element id
  is therefore prefixed with a per-render unique id, and there is a test for
  it.
- **A CSS `transform` silently replaces an SVG `transform` attribute.** The
  rectangle's height label carries `transform="rotate(90 ...)"`; animating it
  with `translateY` tipped it flat. Labels animate opacity only.
- **Confetti has to be queued, exactly like the sound effects.** A game
  triggers it right before `st.rerun()`, and `st.rerun()` throws away the
  current render before the browser sees it. It is stashed in session state
  and fired on the next run.

Everything is disabled under `prefers-reduced-motion`, showing the finished
picture instead of the movement.

**3. Bugs** — seven fixed. None of them were crashes; the app rendered
cleanly at every level in both languages before this session started. They
were *wrong answers*, which is worse, because a child cannot tell the
difference between a bug and being wrong.

- **Meten is Weten level 2 asked questions with wrong answers.** Decimal
  conversions used `round(value * factor)`, so "0,25 cm = ... mm" expected 2
  (Python rounds 2.5 to even) and "0,75 cm" expected 8. About 6% of level-2
  questions. The true answers were not even typeable in the whole-number
  input.
- **Breuken Baas punished a child for simplifying.** "1/2 + 2/4" expects 4/4;
  a child who worked it out and then reduced to 1/1 — the thing we teach them
  to do — was marked wrong. Grading now cross-multiplies.
- **Meetkunde Meesters could ask for a negative angle.** A rejection-sampling
  loop fell through after 30 tries using the last *rejected* draw.
- `requirements.txt` allowed Streamlit `>=1.37`, but the dashboard needs
  `>=1.49` for `st.dataframe(width="stretch")` — a fresh deploy resolving an
  older version would have crashed on the parent dashboard.
- `use_container_width` is deprecated and slated for removal.
- Verhoudingen could ask about a journey of "3 hours and 0 minutes".
- `speed_diagram_svg` had a hardcoded English "in" and a fixed element id
  that collides if two diagrams share a page.

**How they were found** matters more than the list. Rendering every page at
every level in both languages found *nothing*. Fuzzing the generators and
checking invariants against independently computed answers found all of them.
That approach is now committed as `tests/test_app.py` — 23 tests, runnable
with plain `python tests/test_app.py`.

**4. Four new games**, taking the app from 8 to 12:

| Game | Kind | What it actually trains |
|---|---|---|
| ⚡ Bliksemronde | Speed | Automaticity — recall without calculation |
| 🎯 Getallenjacht | Speed | Number properties from the recognition side |
| 🧠 Logica Lab | Logic | Pattern-finding, deduction, invalid inference |
| 🔐 Code Kraker | Logic | Elimination reasoning, no arithmetic at all |

Design notes worth keeping:

- **The timed games use `st.fragment(run_every=1)` for the clock, with the
  answer buttons outside the fragment.** A button inside an auto-rerunning
  fragment is a race: the rerun can land between the render and the tap, and
  the tap is lost.
- **Timed games adapt their level once per round, not per answer.** Inside a
  60-second round, three quick correct answers are often just three easy
  draws; 9-of-10 across a whole round is a much more honest signal.
- **Logica Lab's if/then questions generate the invalid converse half the
  time** ("All cats are fast; Sofie is fast; is Sofie a cat?"). Answering
  "yes" every time scores 50%, which is the point — that inference is the
  classic slip at this age.
- **Code Kraker's bulls-and-cows scoring is tested against a reference
  implementation over all 4096 secret/guess pairs.** The naive version counts
  a repeated digit twice, and the clues then contradict each other — which a
  child *will* notice, and will reasonably conclude the game is broken.

A shared `utils/gameflow.py` now holds the post-answer sequence the new games
use. The original eight keep their inline version on purpose, so this round's
diff stays reviewable.

### Findings the next session should know

- The app has no crash-level bugs left that this session could find; every
  page renders at every level in both languages, and the 23 tests pass.
- The bugs that ship here are *arithmetic* bugs. Any new question generator
  should get an invariant test that computes the answer a second, independent
  way — not just a "does it render" check.
- `logs/` is still an ephemeral filesystem. Profiles and history survive
  restarts only while the host keeps the disk; the download buttons remain
  the only reliable copy. The roadmap's Phase 1 replaces this with a real
  database and should be done before any classroom pilot.
- `utils/i18n.py` is now 459 keys and about 900 lines. It is still fine as a
  single dict, but if it doubles again it should move to per-language files.

### Still open

- The platform roadmap is a proposal. Nothing in it is built, and Checkpoint 1
  is meant to make it shorter.
- No load test has been run. The claim that Streamlit will struggle with 30
  concurrent pupils is reasoning, not measurement, and the roadmap treats it
  as a question to answer rather than a fact.
- The learning-objective map does not exist yet. It needs the teacher.
- No CI. The tests are committed and runnable but nothing runs them
  automatically on push.

---

## Sessions 1–4 (summarised)

Reconstructed from the CHANGELOG; these predate this file.

- **Session 1** — Adaptive difficulty levels 1–5 for the original four games,
  harder question types aimed at groep 6/7, session logging to CSV, the parent
  dashboard, the player-name field, the NL/EN language switcher, and the
  sidebar session-progress widget.
- **Session 2** — The manual level picker, the inline-SVG visualisation
  library, the interactive fraction explorer, and four new games for the end
  of groep 7 / middle of groep 8: Het X-Mysterie, Meetkunde Meesters,
  Verhoudingen & Snelheid, Getallen Universum.
- **Session 3** — Fixes: the navigation menu now follows the language toggle
  (moved from filename-based pages to an explicit `st.navigation` router); the
  player name actually persists; Tafel Monster's hint no longer gives away the
  answer; more interactive explorers; the cheat sheet extended to all eight
  games.
- **Session 4** — Persistent player profiles, milestone badges, synthesized
  sound effects, a gentler warm-up level 0, and "why" tips on wrong answers.
