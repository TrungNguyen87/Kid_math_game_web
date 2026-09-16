/**
 * Racewedstrijd / Race Challenge - the competition page.
 *
 * Three ways to race, all built on the same {v, q, lv, p} object from
 * compete.js (see that file for why it looks the way it does - the short
 * version: this app has nowhere to run a server, so a "race" has to be
 * something that survives being copy-pasted):
 *
 *   1. Solo - start a race, see your own score.
 *   2. Local party - after finishing, hand the device to the next player
 *      (`addLocalPlayer`); their run appends to the same race in memory,
 *      no encoding involved.
 *   3. Across a network or the world - "Challenge someone" turns the race
 *      into a link/code (`shareSection`); opening that link decodes it
 *      back into the same object with everyone's runs already in it.
 *
 * Only the person actually using *this* device and profile
 * (`isPrimaryRun`) feeds their answers through settleAnswer() - real score,
 * coins, the log, badges. Everyone else in the race (a guest typed in for
 * local pass-and-play, or names arriving inside a decoded challenge) is
 * just data for the comparison screen, never written into this device's
 * saved profile.
 */
import { t, tMd } from "../i18n.js";
import { el, raw, clear, append } from "../dom.js";
import {
  RACE_SECONDS,
  RACE_LENGTH,
  MAX_LEVEL,
  newRace,
  questionText,
  questionAnswer,
  racePoints,
  makeParticipant,
  rankParticipants,
  fastestPerQuestion,
  encodeChallenge,
  decodeChallenge,
  extractChallengeCode,
  buildChallengeUrl,
} from "../compete.js";
import { countdownRingSvg } from "../visuals.js";
import { pageHeader, numberField, statRow } from "../ui.js";
import { levelLabel } from "../ui-bits.js";
import { state } from "../state.js";
import { settleAnswer } from "../gameflow.js";
import { bigCelebration, confetti, floatPoints, toast } from "../fx.js";
import { getGameIllustration } from "../illustrations.js";
import * as sound from "../sound.js";

const GAME_KEY = "compete";
const DEFAULT_LEVEL = 2;
const LEVEL_PREF_KEY = "kmg.compete.level";
const FEEDBACK_DELAY_MS = { correct: 900, wrong: 1400 };

// A remembered difficulty preference, deliberately separate from the
// curriculum's per-game state.levels: a race's difficulty is not part of
// GAME_KEYS, and state.applyProfile() rebuilds state.levels from exactly
// that fixed list on every profile switch, which would silently drop
// anything stored under a "compete" key. A tiny localStorage pref (the same
// trick bliksem.js uses for its own best-score record) avoids that entirely.
function readPreferredLevel() {
  try {
    const n = Number(localStorage.getItem(LEVEL_PREF_KEY));
    return Number.isFinite(n) ? Math.max(0, Math.min(MAX_LEVEL, n)) : DEFAULT_LEVEL;
  } catch {
    return DEFAULT_LEVEL;
  }
}
function writePreferredLevel(level) {
  try {
    localStorage.setItem(LEVEL_PREF_KEY, String(level));
  } catch {
    /* the preference just will not survive a reload */
  }
}

export function render(container) {
  const root = el("section.kmg-compete");
  const stage = el("div.kmg-stage");

  root.append(
    pageHeader("compete.title", {
      subtitleKey: "compete.subtitle",
      emoji: "🏁",
      illustration: getGameIllustration("compete"),
    }),
    raw("div.kmg-intro", tMd("compete.intro")),
    stage,
  );
  container.append(root);

  // --- state for this page instance ---------------------------------------

  let phase = "intro"; // "intro" | "racing" | "done"
  let race = null;
  let isPrimaryRun = false;
  let runnerName = "";
  let qIndex = 0;
  let runResults = [];
  let lastResult = null; // brief feedback shown between questions
  let deadline = 0;
  let shownAt = 0;
  let rafId = null;
  let lastTickSecond = null;
  let chosenLevel = readPreferredLevel();
  let codeError = false;

  // Reusable nodes - rebuilt in place rather than recreated every repaint,
  // exactly like the ring and pad in bliksem.js/ui.js.
  const ring = el("div.kmg-ringwrap");
  const field = numberField({ label: t("compete.answer_label"), onSubmit: () => trySubmit() });
  const checkBtn = el("button.kmg-btn.kmg-btn-primary.kmg-btn-big", {
    type: "button",
    text: t("compete.check_button"),
    onClick: () => trySubmit(),
  });

  function stopClock() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // --- an incoming challenge link is detected once, on the way in --------

  const codeFromUrl = extractChallengeCode(window.location.hash);
  if (codeFromUrl) {
    const decoded = decodeChallenge(codeFromUrl);
    if (decoded) race = decoded;
    else codeError = true;
  }

  // ---------------------------------------------------------------------
  // Intro / setup
  // ---------------------------------------------------------------------

  function paintIntro() {
    clear(stage);
    if (codeError) {
      stage.append(
        el("div.kmg-banner.kmg-banner-bad", {}, [
          el("span.kmg-banner-icon", { text: "⚠️" }),
          el("span.kmg-banner-body", { text: t("compete.invalid_code") }),
        ]),
      );
    }
    stage.append(race ? challengePreviewCard() : newRaceCard());
    stage.append(pasteCodeCard());
  }

  function levelChooser() {
    const row = el("div.kmg-levelrow");
    const badge = el("div.kmg-level-badge", {
      text: `⭐ ${t("common.level")} ${chosenLevel}/${MAX_LEVEL} — ${levelLabel(chosenLevel)}`,
    });
    for (let lvl = 0; lvl <= MAX_LEVEL; lvl++) {
      row.append(
        el(`button.kmg-levelbtn${lvl === chosenLevel ? ".is-current" : ""}`, {
          type: "button",
          text: String(lvl),
          title: levelLabel(lvl),
          "aria-pressed": String(lvl === chosenLevel),
          onClick: () => {
            if (lvl === chosenLevel) return;
            chosenLevel = lvl;
            writePreferredLevel(lvl);
            sound.playTap();
            paintIntro();
          },
        }),
      );
    }
    return el("div.kmg-levelpicker", {}, [
      el("div.kmg-levelpicker-label", { text: t("common.choose_level") }),
      row,
      badge,
    ]);
  }

  function newRaceCard() {
    return el("div.kmg-card.kmg-compete-card", {}, [
      el("h2", { text: t("compete.setup_heading") }),
      el("p", { text: t("compete.setup_intro", { count: RACE_LENGTH, seconds: RACE_SECONDS }) }),
      levelChooser(),
      el("button.kmg-btn.kmg-btn-primary.kmg-btn-big", {
        type: "button",
        text: t("compete.start_button"),
        onClick: () => {
          race = newRace(chosenLevel, RACE_LENGTH);
          isPrimaryRun = true;
          runnerName = state.playerName || t("compete.you_label");
          sound.playTap();
          beginRun();
        },
      }),
    ]);
  }

  function challengePreviewCard() {
    const ranked = rankParticipants(race.p);
    const top = ranked[0];
    return el("div.kmg-card.kmg-compete-card.kmg-compete-challenge", {}, [
      el("h2", { text: t("compete.challenge_incoming_heading") }),
      el("p", {
        text: t("compete.challenge_incoming_body", { count: race.q.length, players: race.p.length }),
      }),
      top ? el("p.kmg-caption", { text: t("compete.challenge_preview_best", { name: top.n, score: top.t }) }) : null,
      el("p.kmg-caption", { text: `${t("common.level")}: ${levelLabel(race.lv)}` }),
      el("button.kmg-btn.kmg-btn-primary.kmg-btn-big", {
        type: "button",
        text: t("compete.accept_button"),
        onClick: () => {
          isPrimaryRun = true;
          runnerName = state.playerName || t("compete.you_label");
          sound.playTap();
          beginRun();
        },
      }),
      el("button.kmg-btn.kmg-btn-ghost", {
        type: "button",
        text: t("compete.new_race_button"),
        onClick: () => {
          race = null;
          paintIntro();
        },
      }),
    ]);
  }

  function pasteCodeCard() {
    const input = el("input.kmg-textinput", {
      type: "text",
      placeholder: t("compete.code_input_placeholder"),
      "aria-label": t("compete.code_input_label"),
      autocomplete: "off",
    });
    const submitCode = () => {
      const decoded = decodeChallenge(input.value);
      if (!decoded) {
        codeError = true;
        paintIntro();
        return;
      }
      codeError = false;
      race = decoded;
      paintIntro();
    };
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitCode();
      }
    });
    return el("div.kmg-card.kmg-compete-card.kmg-compete-joincard", {}, [
      el("h3", { text: t("compete.have_code_heading") }),
      el("div.kmg-answer", {}, [input]),
      el("button.kmg-btn.kmg-btn-ghost", { type: "button", text: t("compete.join_button"), onClick: submitCode }),
    ]);
  }

  // ---------------------------------------------------------------------
  // Racing
  // ---------------------------------------------------------------------

  function beginRun() {
    stopClock();
    qIndex = 0;
    runResults = [];
    lastResult = null;
    phase = "racing";
    showQuestion();
  }

  function showQuestion() {
    lastResult = null;
    shownAt = performance.now();
    deadline = shownAt + RACE_SECONDS * 1000;
    lastTickSecond = null;
    field.clear();
    paintRacing();
    stopClock();
    rafId = requestAnimationFrame(tick);
  }

  function tick() {
    const remaining = (deadline - performance.now()) / 1000;
    if (remaining <= 0) {
      stopClock();
      submitAnswer(null);
      return;
    }
    ring.innerHTML = countdownRingSvg(remaining, RACE_SECONDS);
    const second = Math.ceil(remaining);
    if (second <= 5 && second !== lastTickSecond) {
      lastTickSecond = second;
      sound.playTick();
    }
    rafId = requestAnimationFrame(tick);
  }

  function trySubmit() {
    if (phase !== "racing" || lastResult) return;
    const value = field.value();
    if (value === null) return; // nothing typed yet - let them keep trying
    submitAnswer(value);
  }

  function submitAnswer(rawValue) {
    stopClock();
    const [a, b, op] = race.q[qIndex];
    const answer = questionAnswer(a, b, op);
    const elapsedMs = Math.min(RACE_SECONDS * 1000, performance.now() - shownAt);
    const isCorrect = rawValue != null && Number(rawValue) === answer;
    const points = racePoints(isCorrect, elapsedMs);
    runResults.push({ isCorrect, elapsedMs, points });
    lastResult = { isCorrect, answer, points, timedOut: rawValue == null };
    field.markResult(isCorrect);

    if (isPrimaryRun) {
      settleAnswer({
        gameKey: GAME_KEY,
        level: race.lv,
        questionText: `${questionText(a, b, op)} = ?`,
        studentAnswer: rawValue,
        correctAnswer: answer,
        isCorrect,
        points,
        adaptLevel: false,
        score: true,
      });
    } else if (isCorrect) {
      sound.playCorrect(0);
    } else {
      sound.playIncorrect();
    }

    if (isCorrect) floatPoints(checkBtn, `+${points}`);
    paintRacing();

    window.setTimeout(
      () => {
        qIndex += 1;
        if (qIndex >= race.q.length) finishRun();
        else showQuestion();
      },
      isCorrect ? FEEDBACK_DELAY_MS.correct : FEEDBACK_DELAY_MS.wrong,
    );
  }

  function paintRacing() {
    clear(stage);

    const scoreSoFar = runResults.reduce((sum, r) => sum + r.points, 0);
    const progress = el("div.kmg-compete-progress", {
      text: t("compete.question_of", { current: qIndex + 1, total: race.q.length }),
    });
    const header = el("div.kmg-timedhead", {}, [
      ring,
      statRow([
        { label: t("compete.stat_score"), value: scoreSoFar },
        { label: t("common.level"), value: levelLabel(race.lv) },
      ]),
    ]);

    const [a, b, op] = race.q[qIndex];
    const questionNode = el("div.kmg-question.is-in", {}, [
      el("span.kmg-question-emoji", { text: "🏁" }),
      el("span.kmg-question-text", { text: `${questionText(a, b, op)} = ?` }),
    ]);

    let banner = null;
    if (lastResult) {
      const icon = lastResult.isCorrect ? "🏁" : lastResult.timedOut ? "⏰" : "💨";
      const message = lastResult.isCorrect
        ? t("compete.correct_feedback", { points: lastResult.points })
        : lastResult.timedOut
          ? t("compete.timeout_feedback", { answer: lastResult.answer })
          : t("compete.wrong_feedback", { answer: lastResult.answer });
      banner = el(`div.kmg-banner.${lastResult.isCorrect ? "kmg-banner-ok" : "kmg-banner-bad"}.kmg-banner-slim`, {}, [
        el("span.kmg-banner-icon", { text: icon }),
        el("span.kmg-banner-body", { text: message }),
      ]);
    }

    field.setDisabled(!!lastResult);
    checkBtn.disabled = !!lastResult;

    append(stage, progress, header, questionNode, banner, field.node, checkBtn);
    if (!lastResult) field.focus();
  }

  // ---------------------------------------------------------------------
  // Finished
  // ---------------------------------------------------------------------

  function finishRun() {
    stopClock();
    const participant = makeParticipant(runnerName, runResults);
    race.p.push(participant);
    const justFinishedIndex = race.p.length - 1;
    phase = "done";
    paintDone();
    sound.playTimeUp();

    const ranked = rankParticipants(race.p);
    if (ranked[0]?.index === justFinishedIndex) {
      confetti({ count: race.p.length > 1 ? 90 : 50 });
      if (race.p.length > 1) bigCelebration();
    }
  }

  function paintDone() {
    clear(stage);
    const me = race.p[race.p.length - 1];
    const correctCount = me.r.filter((row) => row[0] === 1).length;
    const avgMs = me.r.reduce((sum, row) => sum + row[1], 0) / me.r.length;

    stage.append(
      el("h2", { text: t("compete.run_finished_heading") }),
      statRow([
        { label: t("compete.stat_score"), value: me.t },
        { label: t("compete.stat_correct"), value: `${correctCount}/${me.r.length}` },
        { label: t("compete.stat_avgtime"), value: `${(avgMs / 1000).toFixed(1)}s` },
      ]),
    );

    if (race.p.length > 1) stage.append(resultsCompareSection());
    stage.append(shareSection());
    stage.append(
      el("div.kmg-actions", {}, [
        el("button.kmg-btn.kmg-btn-ghost", {
          type: "button",
          text: t("compete.new_race_button"),
          onClick: () => {
            race = null;
            codeError = false;
            phase = "intro";
            paintIntro();
          },
        }),
      ]),
    );
  }

  function resultsCompareSection() {
    const ranked = rankParticipants(race.p);
    const tie = ranked.length > 1 && ranked[0].t === ranked[1].t;
    const winner = ranked[0];

    const wrap = el("div.kmg-compete-results");
    wrap.append(
      tie
        ? el("div.kmg-banner.kmg-banner-info", {}, [
            el("span.kmg-banner-icon", { text: "🤝" }),
            el("span.kmg-banner-body", { text: t("compete.tie_banner") }),
          ])
        : el("div.kmg-banner.kmg-banner-ok", {}, [
            el("span.kmg-banner-icon", { text: "🏆" }),
            el("span.kmg-banner-body", { text: t("compete.winner_banner", { name: winner.n, score: winner.t }) }),
          ]),
    );

    const medal = (rank) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : String(rank));
    const leaderTable = el("table.kmg-table.kmg-compete-leaderboard");
    leaderTable.append(
      el("thead", {}, [
        el("tr", {}, [
          el("th", { text: "#" }),
          el("th", { text: t("compete.col_player") }),
          el("th", { text: t("compete.col_score") }),
          el("th", { text: t("compete.col_correct") }),
        ]),
      ]),
      el(
        "tbody",
        {},
        ranked.map((p) =>
          el(`tr${p.rank === 1 ? ".is-leader" : ""}`, {}, [
            el("td", { text: medal(p.rank) }),
            el("td", { text: p.n }),
            el("td", { text: String(p.t) }),
            el("td", { text: `${p.r.filter((row) => row[0] === 1).length}/${p.r.length}` }),
          ]),
        ),
      ),
    );
    wrap.append(el("div.kmg-table-scroll", {}, [leaderTable]));

    const fastest = fastestPerQuestion(race);
    const perQTable = el("table.kmg-table.kmg-compete-perq");
    perQTable.append(
      el("thead", {}, [
        el("tr", {}, [
          el("th", { text: t("compete.col_question") }),
          ...race.p.map((p) => el("th", { text: p.n })),
        ]),
      ]),
      el(
        "tbody",
        {},
        race.q.map(([a, b, op], qi) =>
          el("tr", {}, [
            el("td", { text: `${questionText(a, b, op)} = ${questionAnswer(a, b, op)}` }),
            ...race.p.map((p, pi) => {
              const row = p.r[qi];
              const correct = row && row[0] === 1;
              const isFastest = fastest[qi]?.participantIndex === pi;
              return el(`td.${correct ? "is-correct" : "is-wrong"}`, {}, [
                el("span", { text: correct ? `✅ ${(row[1] / 1000).toFixed(1)}s` : "❌" }),
                isFastest ? el("span.kmg-compete-fastest", { text: " ⚡" }) : null,
              ]);
            }),
          ]),
        ),
      ),
    );
    wrap.append(el("h3", { text: t("compete.perquestion_heading") }), el("div.kmg-table-scroll", {}, [perQTable]));

    return wrap;
  }

  function shareSection() {
    const code = encodeChallenge(race);
    const url = buildChallengeUrl(window.location.href, code);

    const linkInput = el("input.kmg-textinput.kmg-compete-linkbox", {
      type: "text",
      readOnly: true,
      value: url,
      "aria-label": t("compete.share_heading"),
      onClick: (event) => event.target.select(),
    });
    const codeInput = el("input.kmg-textinput.kmg-compete-codebox", {
      type: "text",
      readOnly: true,
      value: code,
      "aria-label": t("compete.have_code_heading"),
      onClick: (event) => event.target.select(),
    });

    const copy = async (value, input) => {
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        input.select();
        try {
          document.execCommand("copy");
        } catch {
          toast(value, "📋", 4000); // clipboard just will not work here - at least show it
          return;
        }
      }
      toast(t("compete.link_copied"), "📋", 1800);
    };

    const shareButtons = [
      el("button.kmg-btn.kmg-btn-primary", {
        type: "button",
        text: t("compete.copy_link_button"),
        onClick: () => copy(url, linkInput),
      }),
    ];
    if (navigator.share) {
      shareButtons.push(
        el("button.kmg-btn.kmg-btn-ghost", {
          type: "button",
          text: t("compete.share_button"),
          onClick: () => {
            navigator
              .share({ title: t("compete.title"), text: t("compete.share_invite_text", { name: runnerName }), url })
              .catch(() => {});
          },
        }),
      );
    }

    const localName = el("input.kmg-textinput", {
      type: "text",
      placeholder: t("compete.add_local_name_placeholder"),
      maxlength: "24",
    });
    const addLocal = () => {
      const name = localName.value.trim();
      if (!name) {
        localName.focus();
        return;
      }
      isPrimaryRun = false;
      runnerName = name;
      beginRun();
    };
    localName.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addLocal();
      }
    });

    return el("div.kmg-card.kmg-compete-card.kmg-compete-share", {}, [
      el("h3", { text: t("compete.share_heading") }),
      el("p", { text: t("compete.share_body") }),
      el("div.kmg-compete-sharerow", {}, [linkInput, ...shareButtons]),
      el("div.kmg-compete-sharerow", {}, [codeInput]),
      el("h4", { text: t("compete.add_local_heading") }),
      el("p.kmg-caption", { text: t("compete.add_local_body") }),
      el("div.kmg-compete-sharerow", {}, [
        localName,
        el("button.kmg-btn.kmg-btn-ghost", { type: "button", text: t("compete.add_local_button"), onClick: addLocal }),
      ]),
    ]);
  }

  // ---------------------------------------------------------------------

  paintIntro();

  // The router calls this on the way out - without it a mid-race rAF loop
  // would keep ticking against a detached page, exactly the bug bliksem.js's
  // own cleanup exists to avoid.
  return () => stopClock();
}
