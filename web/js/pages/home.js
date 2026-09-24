/**
 * Home - who is playing, what there is to play, and how far they have got.
 * Ported from pages/00_Home.py.
 *
 * The Streamlit version listed the games as a markdown bullet list. Here they
 * are tappable tiles carrying each game's own level, which turns the home
 * page from a table of contents into the thing a child actually navigates
 * with - and makes "which ones have I not tried yet" answerable at a glance.
 */
import { t, tMd } from "../i18n.js";
import { el, raw, clear, append } from "../dom.js";
import { GAME_NAV } from "../nav.js";
import {
  GAME_KEYS,
  currentPlayStreak,
  getLevel,
  getMaxLevel,
  profileNames,
  setPlayerName,
  state,
} from "../state.js";
import { BADGE_DEFS, BADGE_EMOJI } from "../badges.js";
import { BUDDY_STAGES, buddyInfo } from "../buddy.js";
import { chestOpenedToday, chestReady, openChest, todaysQuests } from "../quests.js";
import { REWARD_MAP, goalInfo } from "../rewards.js";
import { announceNewBadges, questLabel } from "../gameflow.js";
import { FEEDBACK_EMAIL, feedbackHref, levelLabel } from "../ui-bits.js";
import { pageHeader } from "../ui.js";
import { getGameIllustration } from "../illustrations.js";
import { bigCelebration, confetti, levelUpOverlay, toast } from "../fx.js";
import * as sound from "../sound.js";

const BUDDY_LINES = 8; // buddy.say_1 .. buddy.say_8

/** The home tile path for a game key, so a quest can link straight to it. */
const pathForGame = (gameKey) => GAME_NAV.find((entry) => entry.game === gameKey)?.path;

export function render(container) {
  const root = el("section.kmg-home");
  const nameNotice = el("div.kmg-namenotice");
  const tiles = el("div.kmg-tiles");
  const badgeRow = el("div.kmg-badgerow");
  const badgeCount = el("span.kmg-section-count");
  const buddyHost = el("div.kmg-adventure-cell");
  const questHost = el("div.kmg-adventure-cell");
  const goalHost = el("div");

  // --- who is playing -----------------------------------------------------

  const input = el("input.kmg-textinput", {
    id: "kmg-player-name",
    type: "text",
    value: state.playerName,
    maxlength: "40",
    placeholder: t("dash.player_name_placeholder"),
    "aria-label": t("dash.player_name_label"),
    autocomplete: "off",
    // A datalist rather than a dropdown: a returning child picks their name
    // in one tap, a new one just types.
    list: "kmg-known-players",
  });

  const known = profileNames();
  const datalist = el(
    "datalist",
    { id: "kmg-known-players" },
    known.map((name) => el("option", { value: name })),
  );

  function commitName() {
    const before = state.playerName;
    const existed = setPlayerName(input.value);
    // Only a real change of player is news; blurring the field with the same
    // name used to re-announce "your name is saved" on every visit.
    if (state.playerName !== before) paintNotice(existed);
    paintAll();
  }

  function paintAll() {
    paintBuddy();
    paintQuests();
    paintGoal();
    paintTiles();
    paintBadges();
  }

  input.addEventListener("change", commitName);
  input.addEventListener("blur", commitName);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    }
  });

  function paintNotice(justLoaded) {
    clear(nameNotice);
    if (!state.playerName) return;
    const message = justLoaded
      ? t("home.profile_loaded", { name: state.playerName, score: state.totalScore })
      : t("home.player_saved", { name: state.playerName });
    nameNotice.append(
      el("div.kmg-banner.kmg-banner-ok", {}, [
        el("span.kmg-banner-icon", { text: justLoaded ? "🔄" : "✅" }),
        el("span.kmg-banner-body", { text: message }),
      ]),
    );
  }

  // --- game tiles ---------------------------------------------------------

  // --- the buddy ------------------------------------------------------------

  function paintBuddy() {
    clear(buddyHost);
    const info = buddyInfo();
    const name = t("buddy.name");
    const bubble = el("div.kmg-buddy-bubble", { text: t(`buddy.say_${1 + Math.floor(Math.random() * BUDDY_LINES)}`) });
    const figure = el(
      "button.kmg-buddy-figure",
      {
        type: "button",
        "aria-label": `${name} · ${t(info.stage.key)}`,
        // Tapping the buddy makes it bounce and say something else - a tiny
        // bit of play that costs nothing and makes it feel alive.
        onClick: () => {
          bubble.textContent = t(`buddy.say_${1 + Math.floor(Math.random() * BUDDY_LINES)}`);
          figure.classList.remove("is-poked");
          void figure.offsetWidth;
          figure.classList.add("is-poked");
          sound.playTap();
        },
      },
      [
        info.stage.crown ? el("span.kmg-buddy-crown", { text: "👑", "aria-hidden": "true" }) : null,
        el("span.kmg-buddy-emoji", { text: info.stage.emoji, "aria-hidden": "true" }),
      ],
    );
    buddyHost.append(
      el(`div.kmg-card.kmg-buddy.kmg-aura-${info.stage.aura}`, {}, [
        el("div.kmg-cardhead", {}, [
          el("h2", { text: t("buddy.heading") }),
          el("span.kmg-chip", {
            text: t("buddy.stage_of", { stage: info.index + 1, total: BUDDY_STAGES.length }),
          }),
        ]),
        el("div.kmg-buddy-body", {}, [
          figure,
          el("div.kmg-buddy-info", {}, [
            bubble,
            el("strong.kmg-buddy-name", { text: `${name} · ${t(info.stage.key)}` }),
            el("div.kmg-progress-bar", { role: "progressbar", "aria-valuenow": info.pct, "aria-valuemin": 0, "aria-valuemax": 100 }, [
              el("div.kmg-progress-fill", { style: { width: `${info.pct}%` } }),
            ]),
            el("p.kmg-caption", {
              text: info.next ? t("buddy.to_next", { points: info.toNext, name }) : t("buddy.max", { name }),
            }),
          ]),
        ]),
      ]),
    );
  }

  // --- today's quests and the chest -----------------------------------------

  function questRow(quest) {
    const pct = Math.round((100 * quest.progress) / quest.target);
    const gamePath = quest.game ? pathForGame(quest.game) : null;
    const label = el("span.kmg-quest-label", { text: questLabel(quest) });
    return el(`li.kmg-quest${quest.done ? ".is-done" : ""}`, {}, [
      el("span.kmg-quest-icon", { text: quest.done ? "✅" : "📜", "aria-hidden": "true" }),
      el("div.kmg-quest-main", {}, [
        gamePath && !quest.done
          ? el("a.kmg-quest-link", { href: `#/${gamePath}`, onClick: () => sound.playTap() }, [label, " ▶"])
          : label,
        el("div.kmg-quest-bar", {}, [el("span.kmg-quest-fill", { style: { width: `${pct}%` } })]),
      ]),
      el("div.kmg-quest-side", {}, [
        el("span.kmg-quest-reward", { text: t("quests.reward", { coins: quest.reward }) }),
        el("span.kmg-quest-count", { text: `${quest.progress}/${quest.target}` }),
      ]),
    ]);
  }

  function streakChip() {
    const days = currentPlayStreak();
    const text =
      days >= 2 ? t("quests.streak_days", { days }) : days === 1 ? t("quests.streak_one") : t("quests.streak_none");
    return el(`span.kmg-chip.kmg-chip-streak${days >= 2 ? ".is-hot" : ""}`, {
      text: `🔥 ${text}`,
      title: t("quests.streak_best", { days: state.playStreak.best }),
    });
  }

  function chestArea() {
    if (chestOpenedToday()) {
      return el("div.kmg-chest.is-open", {}, [
        el("span.kmg-chest-icon", { text: "🧰", "aria-hidden": "true" }),
        el("span", { text: t("quests.chest_opened") }),
      ]);
    }
    if (chestReady()) {
      return el("div.kmg-chest.is-ready", {}, [
        el("button.kmg-btn.kmg-btn-primary.kmg-btn-big.kmg-chest-btn", {
          type: "button",
          text: t("quests.chest_button"),
          onClick: (event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const result = openChest();
            if (!result) return;
            const treasure = result.treasureId ? REWARD_MAP[result.treasureId] : null;
            const message = treasure
              ? t("quests.chest_found", { treasure: `${treasure.emoji} ${t(treasure.nameKey)}`, coins: result.coins })
              : t("quests.chest_coins_only", { coins: result.coins });
            confetti({ x: rect.left + rect.width / 2, y: rect.top, count: 90 });
            bigCelebration();
            sound.playFanfare();
            levelUpOverlay(t("quests.chest_title"), message, treasure ? treasure.emoji : "🧰");
            toast(message, treasure ? treasure.emoji : "🪙", 5200);
            announceNewBadges();
            paintQuests();
            paintGoal();
            paintBadges();
          },
        }),
      ]);
    }
    return el("div.kmg-chest.is-locked", {}, [
      el("span.kmg-chest-icon", { text: "🔒", "aria-hidden": "true" }),
      el("span", { text: t("quests.chest_locked") }),
    ]);
  }

  function paintQuests() {
    clear(questHost);
    const quests = todaysQuests();
    const allDone = quests.every((q) => q.done);
    questHost.append(
      el("div.kmg-card.kmg-quests", {}, [
        el("div.kmg-cardhead", {}, [el("h2", { text: t("quests.heading") }), streakChip()]),
        el("ul.kmg-questlist", {}, quests.map(questRow)),
        allDone ? el("p.kmg-quests-done", { text: `🎉 ${t("quests.all_done")}` }) : null,
        chestArea(),
        el("p.kmg-caption", { text: t("quests.note") }),
      ]),
    );
  }

  // --- the savings goal -----------------------------------------------------

  function paintGoal() {
    clear(goalHost);
    const info = goalInfo();
    if (!info) {
      goalHost.append(
        el("p.kmg-goal-hint", {}, [
          `🎯 ${t("goal.none")} `,
          el("a", { href: "#/rewards", text: t("goal.go_shop") }),
        ]),
      );
      return;
    }
    const status = info.ready
      ? t("goal.ready")
      : info.reason === "level"
        ? t("goal.need_level", { level: info.def.minLevel })
        : info.reason === "mastery"
          ? t("goal.need_mastery")
          : t("goal.need_coins", { amount: info.remaining });
    goalHost.append(
      el(`a.kmg-card.kmg-goal${info.ready ? ".is-ready" : ""}`, { href: "#/rewards", onClick: () => sound.playTap() }, [
        el("span.kmg-goal-emoji", { text: info.def.emoji, "aria-hidden": "true" }),
        el("div.kmg-goal-main", {}, [
          el("div.kmg-goal-head", {}, [
            el("strong", { text: `${t("goal.heading")}: ${t(info.def.nameKey)}` }),
            el("span.kmg-goal-pct", { text: `${info.pct}%` }),
          ]),
          el("div.kmg-progress-bar", {}, [el("div.kmg-progress-fill", { style: { width: `${info.pct}%` } })]),
          el("span.kmg-caption", { text: `${state.coins} / ${info.def.cost} 🪙 · ${status}` }),
        ]),
      ]),
    );
  }

  // --- game tiles -----------------------------------------------------------

  function paintTiles() {
    clear(tiles);
    for (const entry of GAME_NAV) {
      const level = getLevel(entry.game);
      // Tafel Monster goes to level 6; every other game stops at 5.
      const max = getMaxLevel(entry.game);
      const tried = state.gamesTried.has(entry.game);
      const tile = el("a.kmg-tile", {
        href: `#/${entry.path}`,
        onClick: () => sound.playTap(),
      });
      // append(), not tile.append(): Node.append() prints a null child as the
      // literal word "null", which is exactly what every tile of an
      // already-tried game used to show.
      append(
        tile,
        el("span.kmg-tile-icon", { text: entry.icon }),
        el("span.kmg-tile-body", {}, [
          el("span.kmg-tile-name", { text: t(`game.${entry.game}.name`) }),
          el("span.kmg-tile-meta", { text: `${t("common.level")} ${level}/${max} · ${levelLabel(level)}` }),
        ]),
        // A filled bar per game, so "how far am I in each" is one glance.
        el("span.kmg-tile-bar", {}, [
          el("span.kmg-tile-fill", { style: { width: `${(100 * level) / max}%` } }),
        ]),
        tried ? null : el("span.kmg-tile-new", { text: t("home.tile_new") }),
        level >= max ? el("span.kmg-tile-crown", { text: "👑", title: levelLabel(level) }) : null,
      );
      tiles.append(tile);
    }
  }

  // --- badges -------------------------------------------------------------

  function paintBadges() {
    clear(badgeRow);
    const earned = new Set(state.badges);
    badgeCount.textContent = t("home.badges_count", { earned: earned.size, total: BADGE_DEFS.length });
    if (!earned.size) badgeRow.append(el("p.kmg-caption.kmg-badgerow-note", { text: t("home.badges_none") }));
    // Every badge is shown, the unearned ones greyed out, so a child can see
    // what there is left to win rather than only what they already have.
    // Earned ones first, so a long row still leads with the good news.
    const ordered = [...BADGE_DEFS].sort(([a], [b]) => Number(earned.has(b)) - Number(earned.has(a)));
    for (const [id] of ordered) {
      const has = earned.has(id);
      badgeRow.append(
        el(`span.kmg-badge${has ? ".is-earned" : ""}`, { title: t(`badges.${id}.name`) }, [
          el("span.kmg-badge-emoji", { text: BADGE_EMOJI[id] }),
          el("span.kmg-badge-name", { text: t(`badges.${id}.name`) }),
        ]),
      );
    }
  }

  // --- assembly -----------------------------------------------------------

  // Each game's own maximum, so Tafel Monster's level 6 counts as the 100% it
  // is rather than pushing the total past it.
  const totalLevels = GAME_KEYS.reduce((sum, key) => sum + getLevel(key), 0);
  const maxLevels = GAME_KEYS.reduce((sum, key) => sum + getMaxLevel(key), 0);
  const overallPct = Math.round((100 * totalLevels) / maxLevels);

  // First visit of a session with nothing played yet: a start button that
  // does something worth tapping, right under the name box where a new
  // child is already looking (it used to sit at the very bottom of the page).
  const firstVisit = state.totalScore === 0 && state.questionsAnswered === 0;
  const startRow = firstVisit
    ? el("div.kmg-startrow", {}, [
        el("button.kmg-btn.kmg-btn-primary.kmg-btn-big", {
          type: "button",
          text: t("home.start_button"),
          onClick: (event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            confetti({ x: rect.left + rect.width / 2, y: rect.top, count: 70 });
            sound.playFanfare();
            window.location.hash = "#/tafel";
          },
        }),
      ])
    : null;

  const feedbackCard = el("div.kmg-card.kmg-feedback", {}, [
    el("h2", { text: `✉️ ${t("feedback.heading")}` }),
    el("p", { text: t("feedback.home_text") }),
    el("p", {}, [
      el("a.kmg-btn.kmg-btn-ghost.kmg-feedback-btn", { href: feedbackHref("home"), text: t("feedback.button") }),
      " ",
      el("a.kmg-feedback-address", { href: feedbackHref("home"), text: FEEDBACK_EMAIL }),
    ]),
  ]);

  append(
    root,
    pageHeader("home.title", {
      subtitleKey: "home.subtitle",
      emoji: "🎮",
      illustration: getGameIllustration("home"),
    }),

    el("div.kmg-card.kmg-namecard", {}, [
      el("label.kmg-answer-label", { for: "kmg-player-name", text: t("dash.player_name_label") }),
      input,
      datalist,
      nameNotice,
    ]),
    startRow,

    // The "why come back" row: the buddy that grows, today's quests and the
    // chest, and what the child is saving up for.
    el("div.kmg-adventure", {}, [buddyHost, questHost]),
    goalHost,

    raw("div.kmg-intro", tMd("home.intro")),

    el("div.kmg-overall", {}, [
      el("div.kmg-overall-head", {}, [
        el("strong", { text: t("home.level_overview") }),
        el("span.kmg-overall-pct", { text: `${overallPct}%` }),
      ]),
      el("div.kmg-progress-bar", {}, [
        el("div.kmg-progress-fill", { style: { width: `${overallPct}%` } }),
      ]),
    ]),

    el("h2", { text: t("home.games_heading") }),
    tiles,

    el("div.kmg-section-head", {}, [el("h2", { text: t("home.badges_heading") }), badgeCount]),
    badgeRow,

    el("h2", { text: t("home.about_heading") }),
    raw("div.kmg-intro", tMd("home.about_text")),
    feedbackCard,

    // Extra links that were separate sidebar pages in the Streamlit app.
    el("div.kmg-homelinks", {}, [
      el("a.kmg-btn.kmg-btn-ghost", { href: "#/compete", text: `🏁 ${t("nav.compete")}` }),
      el("a.kmg-btn.kmg-btn-ghost", {
        href: "#/rewards",
        text: `🎁 ${t("nav.rewards")} (${state.coins} 🪙)`,
      }),
      el("a.kmg-btn.kmg-btn-ghost", { href: "#/uitleg", text: `📖 ${t("nav.uitleg")}` }),
      el("a.kmg-btn.kmg-btn-ghost", { href: "#/dashboard", text: `📊 ${t("nav.dashboard")}` }),
    ]),
  );

  paintAll();
  container.append(root);
}
