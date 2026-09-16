# Session log

A record of each working session on this project: what was asked, what was
actually done, what was found along the way, and what is still open.

The CHANGELOG says *what changed*. This file says *why, and what we learned* —
including the things that turned out to be wrong, so the next session doesn't
rediscover them.

---

## Session 10 — 16 September 2026

**Branch:** `claude/webrtc-manual-signaling-8xon1v`

### Asked

Implement "Method 1: WebRTC via Manual Signaling" for Race Mode - a host
generates an SDP offer (shown as a QR code or copyable string), a guest
reads it and produces an answer the same way, and the two browsers connect
directly over a data channel, with no signaling server and no cloud service
involved anywhere. Then save the changelog/memory, and test all of it
against a GitHub-Pages-shaped deployment to make sure it actually runs
smoothly there.

### Decided: this is the answer to session 9's "still open", not a new feature bolted on

Session 9 built a real join-code race and then wrote, in its own "still
open" section, that online play "only works self-hosted... by design",
worth restating "so a future session doesn't 'fix' it by trying to add a
server to Pages, which doesn't run arbitrary server code." That framing was
correct as far as it went, but it assumed the only way to have a live,
synchronized room was a server relaying messages - true for a room with up
to six players (round 10's actual design point), but not true for exactly
two players who can reach each other on the same network, which is what
this task asked for. WebRTC's own ICE layer does the "find each other"
part; only the handshake needs a third party, and a third party is
avoidable if the two players carry the handshake themselves.

### Decided: run `RaceRoomManager` in the browser instead of writing a second room engine

The temptation was to write a lighter, 2-player-only state machine for
Direct mode, since it never needs more than a host and one guest. Didn't:
`race-server.js`'s `RaceRoomManager` already only touched `ws.send()` and
`ws.readyState`, never anything WebSocket-specific, except in the one
method that opens the socket server. Split that method out
(`web/js/race-room-engine.js` keeps the class, `race-server.js` re-adds the
method via a subclass) and the *exact same authoritative room logic* now
runs inside the host's own tab for Direct mode - a loopback "socket" for
the host's own player, the real `RTCDataChannel` for the guest. This is
also why `web/js/pages/compete.js` needed no changes at all to its lobby,
countdown, round, recap or results rendering: those functions only ever
depended on a `{send(msg), stop()}` client and `type`-tagged events, which
a `WebRtcHostClient`/`WebRtcGuestClient` produces identically to the
existing `RaceClient`. Two connection methods, one set of screens.

### Found: a chicken-and-egg ordering bug the manual-signaling flow made unavoidable to hit

First working version of `WebRtcGuestClient.readOffer()` waited for the
`ondatachannel` event *before* returning the answer blob to show the guest
- reasoning that "the answer isn't useful until the channel exists." That
is backwards: the channel cannot exist until the *host* has the answer and
applies it, and the host cannot have the answer until the guest produces
it. The guest hung forever on "Connecting..." with no error, because
nothing had actually failed - it was correctly waiting for an event that
could only fire after a step that was itself waiting on this one. Fixed by
having `readOffer()` return as soon as its own local description (the
answer) is ready, and moving the wait for the data channel into
`joinRoom()`, which only runs after the answer has had a chance to reach
the host. Found by testing two real pages end to end rather than by
reading the code - the pause line ("await ICE gathering, then return") read
correct in isolation on both ends; it was the combination that deadlocked.

### Found: a QR round-trip test catches an alignment-pattern bug that "does it look like a QR code" would not

The QR encoder is adapted from Kazuhiko Arase's `qrcode-generator` (fetched
and trimmed, not retyped from memory - see the CHANGELOG entry for why that
distinction mattered here). Structural checks (finder patterns present,
timing pattern alternates, size matches the version formula) all passed on
the first working version, including for a plain visual eyeball check of
the rendered SVG. The independent round-trip decode test written alongside
it - unmask, walk the data region, Reed-Solomon syndrome check - failed
immediately, but only for versions with an alignment pattern (version 1,
which has none, round-tripped fine). The bug: the *test's* reserved-module
predicate marked a whole 5x5 zone around every alignment-pattern candidate
position, including ones the real encoder skips because they overlap a
finder pattern - so the test was reserving modules the encoder had actually
used for data, and reading garbage there. Worth remembering past this one
bug: "renders something that looks right" and "is byte-correct" are
different claims for anything spec-shaped (a codec, a checksum, a binary
format), and only the second one is checkable without a second, real-world
decoder (a phone camera, in this case, which this session had no way to
drive). The round-trip test is the substitute for that phone.

### Decided: no STUN/TURN server, and QR is additive, not required

`iceServers: []` on purpose - the brief was two devices on the same
subnet, which only needs "host" candidates (the device's own LAN address),
and skipping STUN keeps the offer/answer blob small enough to comfortably
fit a QR code without ever needing to think about chunking it. The QR code
itself is additive: `blobShareCard` always shows the raw text too, and if
`qrSvg()` throws (a payload larger than a version-40 QR can hold at error
level L, which a `iceServers: []` LAN offer should never actually reach but
the code doesn't assume) the page falls back to text-only rather than
failing the whole flow. Camera *scanning* (as opposed to display) is
narrower still: it only shows a "Scan QR code" button where the browser's
own `BarcodeDetector` exists, which ruled out writing a QR decoder as part
of this session - `encodeQr`/`qrSvg` this session wrote and tested; the
browser (where it can) does the reading.

### Verification

- `npm test` - 99 Node tests, including new coverage for `qrcode.js` (the
  round-trip decode across several versions, one deliberately large enough
  to force a version above 6 so version-info bits get exercised too),
  `race-room-engine.js` (a full room lifecycle driven with fake sockets, no
  transport at all) and `webrtc-signal.js` (blob encode/decode round-trip
  plus adversarial decode cases: wrong blob type, truncated, garbage,
  tampered SDP).
- `python3 tools/check_precache.py` - 52/52 files, after adding the four
  new `web/js/` modules to `web/sw.js`.
- `tests/web/smoke.mjs` run twice, by hand, against two different servers:
  once against `node server.js` (the existing self-hosted setup), and once
  against a bare `python3 -m http.server 8090 --directory web` serving only
  the `web/` folder with **no Node process running at all** - the same
  shape as what `deploy-pages.yml` actually publishes to GitHub Pages. Both
  runs passed clean, including the new Direct-mode test (two real browser
  pages, a real `RTCDataChannel`, a full round played to the recap screen).
  The static-hosting run is the part that actually proves the "zero
  backend" claim rather than trusting it from reading the code - and it is
  also why the *existing* `compete:online` (server-backed) test needed a
  one-line change first, to explicitly pick "Via a server" now that
  Direct is the default connection method.
- Screenshots taken by hand (desktop and 390px mobile) of every step of
  both the create and join flows, against the static server. Caught one
  real bug this way that no logic test would: a bare "null" printed on the
  page between the two steps of the create flow - `directErrorBanner()`
  returns `null` when there is nothing to show, and one of the five spots
  it is used still called the native `Element.append()` instead of this
  app's own null-filtering `append()` helper (`web/js/dom.js`) - the exact
  bug CHANGELOG round 6 already fixed three instances of, in a fourth
  location it hadn't reached yet.

### Still open

- Camera scanning depends on `BarcodeDetector`, which is Chrome/Edge/
  Android-only today (confirmed empirically: not present in the headless
  Chromium this session's own tests run under, which is why smoke.mjs
  drives the Direct handshake by reading the blob text out of the DOM
  rather than exercising the scanner). Firefox and Safari users always have
  the text box and copy/paste, which is by design, not a gap to close -
  but if either ships `BarcodeDetector` later, nothing here needs to change
  to pick it up.
- Direct mode is capped at exactly two players (host + one guest) - the
  manual QR/paste handshake does not scale to round 10's up-to-six-player
  rooms without asking every pair of players to exchange a code, which
  would be a worse experience than it's worth. The "Via a server" method
  still exists specifically for a self-hosted household/classroom that
  wants more than two.
- No STUN fallback means Direct mode is genuinely LAN-only (same wifi/
  subnet) by design, per the brief - it will not connect two devices on
  different networks. That is the "Via a server" method's job, not this
  one's.

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
