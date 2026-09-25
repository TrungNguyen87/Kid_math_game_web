/**
 * Leerhapjes / Learning Bites - one-minute lessons (round 18).
 *
 * Three views on one page: the album (every bite as a card, collected ones
 * in colour, gold ones shining, plus the bite of the day), a lesson (one
 * idea, one example), and its three-question check. The rules - what a card
 * needs and what it pays - are in bites.js.
 *
 * Deliberately not a levelled game: a bite is small enough to finish while
 * the pasta boils, and the point is the idea, not a streak. That is what
 * makes it the thing to suggest to a child who "only has five minutes".
 */
import { getLanguage, t, tMd } from "../i18n.js";
import { el, clear, raw, append } from "../dom.js";
import { markdown } from "../markdown.js";
import { shuffle } from "../rng.js";
import { BITES, BITE_MAP } from "../bites-data.js";
import {
  BITE_COINS,
  DAILY_BONUS,
  PASS_MARK,
  biteOfTheDay,
  biteStars,
  collectedCount,
  finishBite,
  goldCount,
} from "../bites.js";
import { addWordsRead } from "../state.js";
import { wordCount } from "../reading-data.js";
import { pageHeader } from "../ui.js";
import { getGameIllustration } from "../illustrations.js";
import { announceNewBadges } from "../gameflow.js";
import { bigCelebration, confetti, toast } from "../fx.js";
import * as sound from "../sound.js";

const FILTERS = ["all", "math", "taal"];

/** Stars for a card: ☆ not yet, ⭐ collected, 🌟 gold. */
const starText = (stars) => (stars >= 2 ? "🌟🌟" : stars === 1 ? "⭐" : "☆");

export function render(container) {
  let filter = "all";
  let view = { kind: "album" };

  const root = el("section.kmg-bites");
  const body = el("div.kmg-bites-body");
  root.append(
    pageHeader("bites.title", {
      subtitleKey: "bites.subtitle",
      emoji: "🍪",
      illustration: getGameIllustration("leerhapjes"),
    }),
    body,
  );

  const lang = () => getLanguage();
  const content = (bite) => bite[lang()];

  function go(next) {
    view = next;
    paint();
    root.scrollIntoView?.({ block: "start" });
  }

  // --- album ------------------------------------------------------------------

  function metaText(bite) {
    return `${t(`bites.subject_${bite.subject}`)} · ${t("bites.groep", { groep: bite.groep })}`;
  }

  function dailyCard() {
    const bite = biteOfTheDay();
    const collected = biteStars(bite.id) > 0;
    return el("div.kmg-card.kmg-bite-daily", {}, [
      el("div.kmg-cardhead", {}, [
        el("h2", { text: `🌟 ${t("bites.daily_heading")}` }),
        collected ? null : el("span.kmg-chip", { text: t("bites.daily_bonus", { coins: DAILY_BONUS }) }),
      ]),
      el("div.kmg-bite-daily-body", {}, [
        el("span.kmg-bite-daily-emoji", { text: bite.emoji, "aria-hidden": "true" }),
        el("div", {}, [
          el("strong", { text: content(bite).title }),
          el("p.kmg-caption", { text: metaText(bite) }),
        ]),
        el("button.kmg-btn.kmg-btn-primary.kmg-bite-start", {
          type: "button",
          text: t("bites.start_button"),
          onClick: () => {
            sound.playTap();
            go({ kind: "lesson", id: bite.id });
          },
        }),
      ]),
    ]);
  }

  function albumCard(bite) {
    const stars = biteStars(bite.id);
    return el(
      `button.kmg-bite-card${stars >= 1 ? ".is-collected" : ""}${stars >= 2 ? ".is-gold" : ""}`,
      {
        type: "button",
        dataset: { bite: bite.id },
        "aria-label": `${content(bite).title} · ${metaText(bite)} · ${starText(stars)}`,
        onClick: () => {
          sound.playTap();
          go({ kind: "lesson", id: bite.id });
        },
      },
      [
        el("span.kmg-bite-card-emoji", { text: bite.emoji, "aria-hidden": "true" }),
        el("span.kmg-bite-card-title", { text: content(bite).title }),
        el("span.kmg-bite-card-meta", { text: metaText(bite) }),
        el("span.kmg-bite-card-stars", { text: starText(stars), "aria-hidden": "true" }),
      ],
    );
  }

  function paintAlbum() {
    const total = BITES.length;
    const have = collectedCount();
    const pct = Math.round((100 * have) / total);
    const filters = el(
      "div.kmg-race-segmented.kmg-bite-filters",
      { role: "group", "aria-label": t("bites.filter_label") },
      FILTERS.map((value) =>
        el(`button.kmg-race-segment-btn${filter === value ? ".is-active" : ""}`, {
          type: "button",
          text: t(`bites.filter_${value}`),
          "aria-pressed": String(filter === value),
          onClick: () => {
            filter = value;
            sound.playTap();
            paint();
          },
        }),
      ),
    );
    const shown = BITES.filter((bite) => filter === "all" || bite.subject === filter);
    append(
      body,
      raw("div.kmg-intro", tMd("bites.intro", { coins: BITE_COINS })),
      dailyCard(),
      el("div.kmg-overall.kmg-bite-progress", {}, [
        el("div.kmg-overall-head", {}, [
          el("strong", { text: t("bites.album_heading") }),
          el("span.kmg-overall-pct", { text: t("bites.album_count", { have, total, gold: goldCount() }) }),
        ]),
        el("div.kmg-progress-bar", {}, [el("div.kmg-progress-fill", { style: { width: `${pct}%` } })]),
      ]),
      filters,
      el("div.kmg-bite-grid", {}, shown.map(albumCard)),
    );
  }

  // --- lesson -------------------------------------------------------------------

  function backButton() {
    return el("button.kmg-btn.kmg-btn-ghost.kmg-bite-back", {
      type: "button",
      text: t("bites.back_button"),
      onClick: () => go({ kind: "album" }),
    });
  }

  function paintLesson(bite) {
    const c = content(bite);
    append(
      body,
      backButton(),
      el("article.kmg-card.kmg-bite-lesson", {}, [
        el("div.kmg-bite-lesson-head", {}, [
          el("span.kmg-bite-lesson-emoji", { text: bite.emoji, "aria-hidden": "true" }),
          el("div", {}, [
            el("h2", { text: c.title }),
            el("p.kmg-caption", { text: `${metaText(bite)} · ${t("bites.one_minute")}` }),
          ]),
        ]),
        raw("div.kmg-prose.kmg-bite-text", markdown(c.body)),
        el("div.kmg-bite-example", {}, [
          el("strong", { text: `💡 ${t("bites.example")} ` }),
          el("span", { text: c.example }),
        ]),
        el("button.kmg-btn.kmg-btn-primary.kmg-btn-big.kmg-bite-quiz-start", {
          type: "button",
          text: t("bites.quiz_button"),
          onClick: () => {
            // Reading the lesson counts as reading - once per time through.
            addWordsRead(wordCount(`${c.body} ${c.example}`));
            sound.playTap();
            startQuiz(bite.id);
          },
        }),
      ]),
    );
  }

  // --- quiz ---------------------------------------------------------------------

  function startQuiz(id) {
    const bite = BITE_MAP[id];
    const questions = content(bite).quiz.map((q) => ({ ...q, options: shuffle([q.a, ...q.w]) }));
    go({ kind: "quiz", id, questions, index: 0, right: 0, picked: null });
  }

  function paintQuiz() {
    const bite = BITE_MAP[view.id];
    const question = view.questions[view.index];
    const answered = view.picked != null;
    const long = question.options.some((o) => o.length > 18);
    const grid = el(`div.kmg-choices${long ? ".is-stacked" : ""}`, { style: { "--kmg-cols": long ? "1" : "3" } });
    for (const option of question.options) {
      const classes = answered
        ? option === question.a
          ? ".is-right"
          : option === view.picked
            ? ".is-wrong"
            : ""
        : "";
      grid.append(
        el(`button.kmg-choice${classes}`, {
          type: "button",
          text: option,
          disabled: answered,
          onClick: () => pick(option),
        }),
      );
    }
    const last = view.index === view.questions.length - 1;
    append(
      body,
      backButton(),
      el("div.kmg-card.kmg-bite-quiz", {}, [
        el("div.kmg-cardhead", {}, [
          el("h2", { text: `${bite.emoji} ${content(bite).title}` }),
          el("span.kmg-chip", { text: t("bites.question_of", { n: view.index + 1, total: view.questions.length }) }),
        ]),
        el("div.kmg-question.is-in", {}, [el("span.kmg-question-text", { text: question.q })]),
        grid,
        answered
          ? el(`div.kmg-banner.${view.picked === question.a ? "kmg-banner-ok" : "kmg-banner-bad"}`, { role: "status" }, [
              el("span.kmg-banner-icon", { text: view.picked === question.a ? "🎉" : "💡" }),
              el("span.kmg-banner-body", {
                text: view.picked === question.a ? t("bites.right") : t("bites.wrong", { answer: question.a }),
              }),
            ])
          : null,
        answered
          ? el("button.kmg-btn.kmg-btn-primary.kmg-bite-next", {
              type: "button",
              text: last ? t("bites.result_button") : t("bites.next_button"),
              onClick: () => (last ? finish() : go({ ...view, index: view.index + 1, picked: null })),
            })
          : null,
      ]),
    );
  }

  function pick(option) {
    if (view.picked != null) return;
    const question = view.questions[view.index];
    const isRight = option === question.a;
    if (isRight) sound.playCorrect();
    else sound.playIncorrect();
    view = { ...view, picked: option, right: view.right + (isRight ? 1 : 0) };
    paint();
  }

  function finish() {
    const result = finishBite(view.id, view.right);
    go({ kind: "result", id: view.id, right: view.right, total: view.questions.length, result });
    if (result.newCard || result.newGold) {
      bigCelebration();
      sound.playFanfare();
    }
    if (result.coins) toast(t("bites.coins_toast", { coins: result.coins }), "🪙", 4200);
    announceNewBadges();
  }

  function paintResult() {
    const bite = BITE_MAP[view.id];
    const { right, total, result } = view;
    const passed = right >= PASS_MARK;
    const message = !passed
      ? t("bites.result_retry")
      : result.newGold
        ? t("bites.result_gold")
        : result.newCard
          ? t("bites.result_card")
          : t("bites.result_again");
    if (passed) confetti({ count: 50 });
    const nextOpen = BITES.find((b) => b.id !== bite.id && biteStars(b.id) === 0);
    append(
      body,
      el("div.kmg-card.kmg-bite-result", {}, [
        el("div.kmg-bite-result-emoji", { text: passed ? bite.emoji : "💪", "aria-hidden": "true" }),
        el("h2", { text: t("bites.result_score", { right, total }) }),
        el("div.kmg-bite-result-stars", { text: starText(biteStars(bite.id)) }),
        el("p", { text: message }),
        result.coins ? el("p.kmg-bite-coins", { text: t("bites.result_coins", { coins: result.coins }) }) : null,
        el("div.kmg-actions", {}, [
          passed && nextOpen
            ? el("button.kmg-btn.kmg-btn-primary", {
                type: "button",
                text: t("bites.next_bite_button"),
                onClick: () => go({ kind: "lesson", id: nextOpen.id }),
              })
            : null,
          el(`button.kmg-btn.${passed && nextOpen ? "kmg-btn-ghost" : "kmg-btn-primary"}`, {
            type: "button",
            text: passed ? t("bites.again_button") : t("bites.retry_button"),
            onClick: () => go({ kind: "lesson", id: bite.id }),
          }),
          el("button.kmg-btn.kmg-btn-ghost", {
            type: "button",
            text: t("bites.album_button"),
            onClick: () => go({ kind: "album" }),
          }),
        ]),
      ]),
    );
  }

  function paint() {
    clear(body);
    if (view.kind === "lesson") paintLesson(BITE_MAP[view.id]);
    else if (view.kind === "quiz") paintQuiz();
    else if (view.kind === "result") paintResult();
    else paintAlbum();
  }

  paint();
  container.append(root);
}
