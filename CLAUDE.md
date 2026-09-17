# Working on this repository

Standing instructions for every session, set by the project owner. They apply
whether or not the current request repeats them.

## Always, every session

1. **Read `SESSIONS.md` and `CHANGELOG.md` before writing any code.** They are
   the project's memory. `CHANGELOG.md` says *what changed*; `SESSIONS.md` says
   *why, what was learned, and what turned out to be wrong* — including fixes
   that looked right and were not. Several sessions have been saved a wasted
   round by the "Still open" section of the previous one.
2. **Update both before committing**, in the same commit as the code:
   - a `### Fixed`/`### Added` block at the top of `CHANGELOG.md`'s
     `[Unreleased]`, numbered as the next *round*;
   - a new `## Session N` entry at the top of `SESSIONS.md` (below the header
     rule), numbered as the next *session*. Note the numbers are offset:
     session 13 wrote CHANGELOG round 14.

   Write what was *decided and why*, what was *found along the way*, how it was
   verified, and what is *still open*. A list of touched files is not a session
   entry.
3. **Verify before committing**, and say plainly in the changelog what was run:

   ```
   npm test              # Node unit tests
   npm run lint          # syntax check of the three entry points
   npm run check:precache # every web/ file is in the service worker PRECACHE
   npm start &           # then, in another shell:
   npm run test:smoke    # real-browser pass over all routes and both race modes
   ```

   A change under `web/` that adds or removes a file must keep
   `web/sw.js`'s `PRECACHE` list in step, or `check:precache` fails the deploy.

## Deployment

`.github/workflows/deploy-pages.yml` publishes **`web/` only**, on pushes to
`main` touching `web/**`. A push to a feature branch does not deploy; the live
deploy happens when the branch merges. Its only two real steps are the
`BUILD_ID` stamp into `web/sw.js` and `tools/check_precache.py` — both can be
re-run locally against a scratch copy of `web/` and `tools/` to test the deploy
without pushing, which is what every session has done.

Nothing outside `web/` reaches the published site, so `server.js`,
`race-server.js` and `tests/` cannot break it. Race Mode's *online* play needs
`race-server.js` and therefore only works self-hosted (`npm start`); *local*
("together on this device") mode needs no server and is the one that always
works.

## Things that have already cost a session

- **A touch test at a desktop viewport is not a phone test.** Playwright's
  `hasTouch: true` gives you touch events; it does not give you the phone's
  *layout*. Use `isMobile: true` with a phone-sized viewport for anything about
  how the app behaves on a phone. A multi-touch fix passed at 1280x900 while
  the phone stayed unusable, because the second player's card was below the
  fold — see `SESSIONS.md` session 13.
- **Prove a regression test fails without the fix.** Revert the change, re-run,
  confirm it fails for the right reason, restore. Two sessions have caught a
  false-pass test this way.
- **The browser renders wrong rather than throwing.** Node tests catch none of
  this class of bug; the smoke test and a screenshot catch it.
- **Playwright is not a project dependency.** In a container with a
  pre-installed browser, run the smoke test with `NODE_PATH=$(npm root -g)` and,
  if `chromium.launch()` reports a missing executable, a temporary
  `executablePath: "/opt/pw-browsers/chromium"`. Do not commit that path.
