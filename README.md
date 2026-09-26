# Reken- & Leesspellen voor Groep 6, 7 & 8

Seventeen maths, reading and arcade games for Dutch primary-school children
aged roughly 9–12 (groep 6, 7 and 8), in Dutch and English, with eight
difficulty levels each — the top two at groep 8 level — plus one-minute
learning bites and a dashboard for parents.

**Play:** https://trungnguyen87.github.io/Kid_math_game_web/
*(after the one-time setup in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) §4)*

Free, no account, no ads, nothing to install — and it works offline once
opened. Nothing a child types or answers ever leaves their device.

---

## The games

| | Game | Trains |
|---|---|---|
| ✖️ | **Tafel Monster** | Times tables, missing factors, division, word problems |
| 🍕 | **Breuken Baas** | Adding, subtracting, simplifying and multiplying fractions |
| 📏 | **Meten is Weten** | Units, time intervals, money |
| 💯 | **Procenten Puzzel** | Percentages, fractions and decimals as one idea |
| 🕵️ | **Het X-Mysterie** | Solving equations, up to two unknowns |
| 📐 | **Meetkunde Meesters** | Perimeter, area, volume, angles |
| 🚗 | **Verhoudingen & Snelheid** | Ratios, scale, speed, unit prices |
| 🔢 | **Getallen Universum** | Negative numbers, long multiplication and division, decimals |
| ⚡ | **Bliksemronde** | Instant recall, against a 60-second clock |
| 🎯 | **Getallenjacht** | Number properties, from the recognition side |
| 🧠 | **Logica Lab** | Sequences, odd-one-out, deduction, magic squares |
| 🔐 | **Code Kraker** | Pure elimination reasoning (Mastermind with digits) |
| 🔍 | **Leesdetective** | Reading comprehension: short texts, three questions each, one reading skill per question |
| 🧙 | **Woordenschat Wizard** | Vocabulary: opposites, synonyms, words in context, groep 8 idioms and proverbs |
| 🌪️ | **Spellingstorm** | Spelling: from *hond/hont* to d/t, ’t kofschip and *gebeurd/gebeurt* (English: homophones and tricky words) |
| 🐦 | **Fladdervogel** | Arcade: tap to fly through the gap with the right answer (sums or words) |
| 🦸 | **Sprongheld** | Arcade: a runner who jumps into the block with the right answer (sums or words) |

Plus **🍪 Leerhapjes**, 24 one-minute lessons with a three-question check and a
card album; **📖 Uitleg Concepten**, a reference a child can open mid-game; and
**📊 Ouder Dashboard** — accuracy per game, questions per day, the levels
mastered and when, the full log and a CSV export.

Every game has eight levels, 0-7. Levels 6 and 7 (*Kampioen* and *Legende*)
are groep 8: fractions times fractions, circles, litres, VAT and interest,
the order of operations, negative numbers, argumentative texts, idioms and
verb spelling. A game gets harder after three correct answers in a row, easier
after two wrong ones, and a child can also just tap the level they want.

## Why keep coming back

Every correct answer pays coins for the **reward shop**: 53 characters, 48
stickers, 19 special gifts and 7 colour themes that recolour the whole app —
a few of them only for children who reach groep 8's level 6 or 7.
Tap 🎯 on an item to make it your savings goal; the sidebar then shows how
close you are.

On top of that:

- **Rekie, the maths buddy**, hatches from an egg and grows through eight
  stages into a cosmic dragon as the lifetime score rises.
- **Three daily quests** (a bit of effort, a bit of skill, a bit of variety),
  each paying bonus coins. Finish all three and the day's **treasure chest**
  opens: more coins plus one of 12 treasures that can never be bought.
- A **days-in-a-row** streak and **31 badges**.
- **A level passport**: every level mastered is a stamp. Mastering a level
  pays a one-off bonus, and sitting on a mastered level shows a friendly
  "your next level is waiting" nudge with a one-tap way up. The home page's
  **next challenge** card always names the best next step.
- A **words read** counter, a daily reading quest, and a bite of the day.

None of it can be farmed: a mastered level pays no coins (practice is always
allowed), its bonus pays once, a learning bite pays once, and quest progress
only counts answers that actually earned points.

## How it is built

`web/` is a static site (plain HTML, CSS and ES modules; no build step and no
framework) deployed to GitHub Pages by `.github/workflows/deploy-pages.yml`.
It was ported from an earlier Streamlit version, which has since been removed
from this repository.

`web/js/i18n-data.js` holds every string in Dutch and English and is edited by
hand; a test keeps the two languages in step key for key.

Race Mode's *online* play needs `race-server.js` and so only works
self-hosted (`npm start`); playing together on one device always works.

Why this platform and not Streamlit: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) §1.

## Running it locally

The web app has no build step, but it does need a server, because ES modules
and service workers will not load from a `file://` URL.

```bash
npm install
npm start        # http://127.0.0.1:3000  (also runs the Race Mode server)
```

or, for the static site only:

```bash
python3 -m http.server 8080 --directory web
```

## Tests

```bash
npm test                 # Node logic tests: generators, scoring, levels and mastery, reading content, arcade physics, rewards, quests, i18n parity
npm run lint             # syntax check of the entry points
npm run check:precache   # every shipped file is in the service worker's cache list
npm start &              # then:
npm run test:smoke       # real Chromium: every route, gameplay, rewards, both race modes, phone, offline
npm run test:pages       # the deploy-stamped site served like GitHub Pages: sub-path, real 404s, offline
```

The logic tests run each question generator several hundred times per level,
because the bugs worth catching are the ones that need an unlucky draw: a
triangle whose third angle comes out negative, a division that does not divide,
a fraction the child cannot type into a whole-number box. The arcade games'
physics are pure functions, so an autopilot plays a whole run at every level
in Node to prove every right answer can be reached.

## Documentation

- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — why GitHub Pages, click-by-click
  setup, updating, installing on a child's tablet, troubleshooting.
- **[docs/PLATFORM_ROADMAP.md](docs/PLATFORM_ROADMAP.md)** — the plan for turning
  this into a classroom platform: pupil accounts, objective tracking, exams.
- **[CHANGELOG.md](CHANGELOG.md)** — what changed.
- **[SESSIONS.md](SESSIONS.md)** — why, and what was learned along the way.
- **[CLAUDE.md](CLAUDE.md)** — the working conventions for this repo: read the
  changelog and session log first, update both before committing, and how to
  run the checks and test the deploy.

## Privacy

There is no server and no account. Scores, levels and the answer log live in
the browser's own storage on the child's device. No analytics, no ad tech, no
third-party fonts or CDNs on any page a child sees. The parent dashboard can
export everything as CSV and delete everything with two clicks.

The feedback link is a plain `mailto:` link: it opens the device's own mail
app with a subject filled in, and nothing is sent unless someone presses send.

## Feedback

Ideas, questions, or found a bug? Email **[nxtrung87@gmail.com](mailto:nxtrung87@gmail.com)**.
The app has the same address behind the "✉️" link in the menu, on the home
page and on the parent dashboard.
