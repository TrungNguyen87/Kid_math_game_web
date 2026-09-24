# Reken Spelletjes voor Groep 6 & 7

Twelve maths games for Dutch primary-school children aged roughly 9–11, in
Dutch and English, with six difficulty levels each and a dashboard for parents.

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

Plus **📖 Uitleg Concepten**, a reference a child can open mid-game, and
**📊 Ouder Dashboard** — accuracy per game, questions per day, the full log and
a CSV export.

Every game starts at a gentle warm-up level and gets harder after three correct
answers in a row, easier after two wrong ones. A child can also just tap the
level they want.

## Why keep coming back

Every correct answer pays coins for the **reward shop**: 49 characters, 46
stickers, 18 special gifts and 7 colour themes that recolour the whole app.
Tap 🎯 on an item to make it your savings goal; the sidebar then shows how
close you are.

On top of that:

- **Rekie, the maths buddy**, hatches from an egg and grows through eight
  stages into a cosmic dragon as the lifetime score rises.
- **Three daily quests** (a bit of effort, a bit of skill, a bit of variety),
  each paying bonus coins. Finish all three and the day's **treasure chest**
  opens: more coins plus one of 12 treasures that can never be bought.
- A **days-in-a-row** streak and **21 badges**.

None of it can be farmed: an already-cleared level pays no coins, and quest
progress only counts answers that actually earned points.

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
npm test                 # Node logic tests: generators, scoring, levels, rewards, quests, i18n parity
npm run lint             # syntax check of the entry points
npm run check:precache   # every shipped file is in the service worker's cache list
npm start &              # then:
npm run test:smoke       # real Chromium: every route, gameplay, rewards, both race modes, phone, offline
npm run test:pages       # the deploy-stamped site served like GitHub Pages: sub-path, real 404s, offline
```

The logic tests run each question generator several hundred times per level,
because the bugs worth catching are the ones that need an unlucky draw: a
triangle whose third angle comes out negative, a division that does not divide,
a fraction the child cannot type into a whole-number box.

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
