/**
 * Racewedstrijd / Race Challenge - the race mode page.
 *
 * Two ways to race, both genuinely side by side rather than one person at a
 * time:
 *
 *   1. Online with a code (`web/race-server.js`, self-hosted only) - the
 *      host creates a room and gets a short join code; up to
 *      race-logic.js's MAX_PLAYERS people anywhere can join with it, and
 *      everyone answers the same synchronized question at once. Only the
 *      score bar is visible across devices (nobody can see another
 *      player's screen), so it updates live as each player answers.
 *   2. Together on this device - up to MAX_PLAYERS players share one
 *      screen, each with their own card and choice grid, answering the
 *      same question in parallel.
 *
 * Every question is multiple choice: a tap on a `.kmg-choice` button *is*
 * the submission, exactly like Bliksemronde - there is no separate "check"
 * step to click through. `race-logic.js` also mixes in more than one kind
 * of question (`category`): lightning arithmetic, times tables, fractions,
 * percentages, or a shuffled mix of all four.
 *
 * Only the player on *this* device and profile (`isPrimaryRun` for local
 * play, or simply "me" online) feeds answers through settleAnswer() - real
 * score, coins, the log, badges. Every other racer is comparison data only,
 * never written into this device's saved profile.
 */
import { t, tMd } from "../i18n.js";
import { el, raw, clear, append } from "../dom.js";
import {
  ROUND_SECONDS,
  ROUND_CHOICES,
  DEFAULT_ROUNDS,
  MAX_LEVEL,
  MIN_PLAYERS_ONLINE,
  MAX_PLAYERS,
  CATEGORIES,
  generateRaceQuestions,
  racePoints,
  rankPlayers,
  cleanPlayerName,
} from "../race-logic.js";
import { pageHeader } from "../ui.js";
import { levelLabel } from "../ui-bits.js";
import { state } from "../state.js";
import { settleAnswer } from "../gameflow.js";
import { bigCelebration, confetti, toast } from "../fx.js";
import { getGameIllustration } from "../illustrations.js";
import * as sound from "../sound.js";

const GAME_KEY = "compete";
const DEFAULT_LEVEL = 2;
const LEVEL_PREF_KEY = "kmg.compete.level";
const CATEGORY_PREF_KEY = "kmg.compete.category";

function readPref(key, fallback, valid) {
  try {
    const v = localStorage.getItem(key);
    return valid(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function writePref(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* the preference just will not survive a reload */
  }
}
function readLevelPref() {
  const n = Number(readPref(LEVEL_PREF_KEY, DEFAULT_LEVEL, (v) => Number.isFinite(Number(v))));
  return Math.max(0, Math.min(MAX_LEVEL, n));
}
function readCategoryPref() {
  return readPref(CATEGORY_PREF_KEY, "bliksem", (v) => CATEGORIES.includes(v));
}

/** A question's display text, resolving the localized form when the
 *  category (procenten) hands back a key + vars instead of raw text. */
function questionDisplayText(q) {
  const base = q.textKey ? t(q.textKey, q.textVars) : q.text;
  return `${base} = ?`;
}

function medal(rank) {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : String(rank);
}

async function copyToClipboard(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

/** WebSocket client for the online room, with REST polling as a fallback
 *  for a network that blocks the socket upgrade. */
class RaceClient {
  constructor(onEvent) {
    this.onEvent = onEvent;
    this.ws = null;
    this.roomCode = null;
    this.playerId = null;
    this.polling = null;
    this.lastEventId = 0;
  }

  connect(onOpen, onError) {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    try {
      this.ws = new WebSocket(`${protocol}//${location.host}/ws/race`);
      this.ws.onopen = () => onOpen?.();
      this.ws.onmessage = (event) => {
        try {
          this.onEvent(JSON.parse(event.data));
        } catch {
          /* ignore a malformed frame rather than crash the page */
        }
      };
      this.ws.onerror = (e) => {
        onError?.(e);
        this.startPolling();
      };
      this.ws.onclose = () => {
        if (this.roomCode) this.startPolling();
      };
    } catch (e) {
      onError?.(e);
      this.startPolling();
    }
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
      return;
    }
    if (!this.roomCode) return;
    fetch(`/api/rooms/${this.roomCode}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: this.playerId, ...msg }),
    }).catch(() => {});
  }

  startPolling() {
    if (this.polling) return;
    this.polling = setInterval(async () => {
      if (!this.roomCode) return;
      try {
        const res = await fetch(`/api/rooms/${this.roomCode}?since=${this.lastEventId}`);
        if (!res.ok) return;
        const data = await res.json();
        for (const ev of data.events || []) {
          this.lastEventId = Math.max(this.lastEventId, ev.id);
          this.onEvent(ev.data);
        }
      } catch {
        /* try again next tick */
      }
    }, 800);
  }

  stop() {
    if (this.polling) clearInterval(this.polling);
    if (this.ws) this.ws.close();
    this.polling = null;
    this.ws = null;
  }
}

export function render(container) {
  const root = el("section.kmg-compete");
  const viewSetup = el("div.kmg-race-setup");
  const viewPlay = el("div.kmg-race-play");
  const viewResults = el("div.kmg-race-results");
  viewPlay.hidden = true;
  viewResults.hidden = true;

  root.append(
    pageHeader("compete.title", {
      subtitleKey: "compete.subtitle",
      emoji: "🏁",
      illustration: getGameIllustration("compete"),
    }),
    raw("div.kmg-intro", tMd("compete.intro")),
    viewSetup,
    viewPlay,
    viewResults,
  );
  container.append(root);

  // --- shared setup state --------------------------------------------------

  let mode = "online"; // "online" | "local"
  let onlineTab = "create"; // "create" | "join"
  let onlineScreen = "form"; // "form" | "lobby"
  let selectedCategory = readCategoryPref();
  let selectedRounds = DEFAULT_ROUNDS;
  let selectedLevel = readLevelPref();

  let initialJoinCode = "";
  try {
    const hash = window.location.hash || "";
    const qIndex = hash.indexOf("?");
    if (qIndex !== -1) {
      initialJoinCode = (new URLSearchParams(hash.slice(qIndex)).get("race") || "").trim().toUpperCase();
    }
  } catch {
    /* ignore a malformed hash */
  }
  if (initialJoinCode) onlineTab = "join";

  // --- local (same device) match state --------------------------------------

  let localNames = [state.playerName || t("compete.you_label"), ""];
  let localQuestions = [];
  let localResults = [];
  let localQIndex = 0;
  let localAnsweredThisRound = new Set();
  let localRoundStartTime = 0;
  let localRoundEnded = false;
  let localTimerInterval = null;
  let localAdvanceTimeout = null;
  let localCountdownInterval = null;

  // --- online match state ---------------------------------------------------

  let client = null;
  let myPlayerId = null;
  let isHost = false;
  let roomCode = "";
  let players = [];
  let currentQuestion = null;
  let myAnswered = false;
  let answeredIds = new Set();
  let refreshScoreStrip = null;
  let onlineTimerInterval = null;

  // ---------------------------------------------------------------------
  // Shared setup widgets
  // ---------------------------------------------------------------------

  function levelChooser(onChange) {
    const row = el("div.kmg-levelrow");
    const badge = el("div.kmg-level-badge", {
      text: `⭐ ${t("common.level")} ${selectedLevel}/${MAX_LEVEL} — ${levelLabel(selectedLevel)}`,
    });
    for (let lvl = 0; lvl <= MAX_LEVEL; lvl++) {
      row.append(
        el(`button.kmg-levelbtn${lvl === selectedLevel ? ".is-current" : ""}`, {
          type: "button",
          text: String(lvl),
          title: levelLabel(lvl),
          "aria-pressed": String(lvl === selectedLevel),
          onClick: () => {
            if (lvl === selectedLevel) return;
            selectedLevel = lvl;
            writePref(LEVEL_PREF_KEY, lvl);
            sound.playTap();
            onChange();
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

  function categoryChooser(onChange) {
    const row = el("div.kmg-race-segmented");
    CATEGORIES.forEach((cat) => {
      row.append(
        el(`button.kmg-race-segment-btn${cat === selectedCategory ? ".is-active" : ""}`, {
          type: "button",
          text: t(`compete.cat_${cat}`),
          onClick: () => {
            if (cat === selectedCategory) return;
            selectedCategory = cat;
            writePref(CATEGORY_PREF_KEY, cat);
            sound.playTap();
            onChange();
          },
        }),
      );
    });
    return el("div.kmg-race-field", {}, [el("label", { text: t("compete.category_label") }), row]);
  }

  function roundsChooser(onChange) {
    const row = el("div.kmg-race-segmented");
    ROUND_CHOICES.forEach((n) => {
      row.append(
        el(`button.kmg-race-segment-btn${n === selectedRounds ? ".is-active" : ""}`, {
          type: "button",
          text: t("compete.rounds_option", { n }),
          onClick: () => {
            if (n === selectedRounds) return;
            selectedRounds = n;
            sound.playTap();
            onChange();
          },
        }),
      );
    });
    return el("div.kmg-race-field", {}, [el("label", { text: t("compete.rounds_label") }), row]);
  }

  function scoringNote() {
    return el("div.kmg-banner.kmg-banner-ok", {}, [
      el("span.kmg-banner-icon", { text: "⚡" }),
      el("span.kmg-banner-body", { text: t("compete.scoring_rule_reminder") }),
    ]);
  }

  // ---------------------------------------------------------------------
  // Mode tabs
  // ---------------------------------------------------------------------

  function renderSetup() {
    clear(viewSetup);
    const tabs = el("div.kmg-race-mode-tabs", {}, [
      el(`button.kmg-race-mode-tab${mode === "online" ? ".is-active" : ""}`, {
        type: "button",
        text: t("compete.mode_online"),
        onClick: () => {
          mode = "online";
          renderSetup();
        },
      }),
      el(`button.kmg-race-mode-tab${mode === "local" ? ".is-active" : ""}`, {
        type: "button",
        text: t("compete.mode_local"),
        onClick: () => {
          mode = "local";
          renderSetup();
        },
      }),
    ]);
    viewSetup.append(tabs);

    if (mode === "online") {
      if (onlineScreen === "lobby" && roomCode) renderOnlineLobby();
      else renderOnlineForm();
    } else {
      renderLocalSetup();
    }
  }

  // ---------------------------------------------------------------------
  // Online: create / join
  // ---------------------------------------------------------------------

  function renderOnlineForm() {
    const card = el("div.kmg-card.kmg-race-card");
    const subtabs = el("div.kmg-race-subtabs", {}, [
      el(`button.kmg-btn.kmg-btn-sm${onlineTab === "create" ? ".kmg-btn-primary" : ".kmg-btn-ghost"}`, {
        type: "button",
        text: t("compete.create_room_tab"),
        onClick: () => {
          onlineTab = "create";
          renderSetup();
        },
      }),
      el(`button.kmg-btn.kmg-btn-sm${onlineTab === "join" ? ".kmg-btn-primary" : ".kmg-btn-ghost"}`, {
        type: "button",
        text: t("compete.join_room_tab"),
        onClick: () => {
          onlineTab = "join";
          renderSetup();
        },
      }),
    ]);
    card.append(subtabs);

    if (onlineTab === "create") {
      const nameInput = el("input.kmg-textinput", {
        type: "text",
        value: state.playerName || "",
        placeholder: t("compete.your_name"),
        maxlength: "24",
      });
      const createBtn = el("button.kmg-btn.kmg-btn-primary.kmg-btn-big", {
        type: "button",
        text: t("compete.create_room_btn"),
        onClick: () => createOnlineRoom(nameInput.value),
      });
      card.append(
        el("div.kmg-race-field", {}, [el("label", { text: t("compete.your_name") }), nameInput]),
        categoryChooser(renderSetup),
        roundsChooser(renderSetup),
        levelChooser(renderSetup),
        scoringNote(),
        createBtn,
      );
    } else {
      const nameInput = el("input.kmg-textinput", {
        type: "text",
        value: state.playerName || "",
        placeholder: t("compete.your_name"),
        maxlength: "24",
      });
      const codeInput = el("input.kmg-textinput", {
        type: "text",
        value: initialJoinCode,
        placeholder: t("compete.enter_code_placeholder"),
        maxlength: "8",
        style: {
          fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
          fontSize: "1.3rem",
          fontWeight: "800",
          letterSpacing: "0.15rem",
          textTransform: "uppercase",
        },
      });
      const errorNode = el("div.kmg-banner.kmg-banner-bad", { hidden: true });
      const joinBtn = el("button.kmg-btn.kmg-btn-primary.kmg-btn-big", {
        type: "button",
        text: t("compete.join_room_btn"),
        onClick: () => {
          errorNode.hidden = true;
          const code = codeInput.value.trim().toUpperCase();
          if (!code) {
            errorNode.textContent = t("compete.join_error_missing_code");
            errorNode.hidden = false;
            return;
          }
          joinOnlineRoom(code, nameInput.value, (message) => {
            errorNode.textContent = message;
            errorNode.hidden = false;
          });
        },
      });
      card.append(
        el("div.kmg-race-field", {}, [el("label", { text: t("compete.your_name") }), nameInput]),
        el("div.kmg-race-field", {}, [el("label", { text: t("compete.room_code_label") }), codeInput]),
        errorNode,
        joinBtn,
      );
    }

    viewSetup.append(card);
  }

  function setupClient() {
    if (client) client.stop();
    client = new RaceClient((event) => handleOnlineEvent(event));
    client.roomCode = roomCode;
    client.playerId = myPlayerId;
    client.connect(() => client.send({ type: "attach", roomCode, playerId: myPlayerId }));
  }

  async function createOnlineRoom(hostName) {
    try {
      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: hostName || state.playerName,
          settings: { category: selectedCategory, rounds: selectedRounds, level: selectedLevel },
        }),
      });
      if (!res.ok) throw new Error("bad status");
      const data = await res.json();
      myPlayerId = data.playerId;
      roomCode = data.roomCode;
      isHost = true;
      players = data.players || [];
      setupClient();
      onlineScreen = "lobby";
      sound.playTap();
      renderSetup();
    } catch {
      toast(t("compete.server_unavailable"), "⚠️", 5000);
    }
  }

  async function joinOnlineRoom(code, guestName, onError) {
    try {
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: code, playerName: guestName || state.playerName }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        onError(errData.error || t("compete.invalid_code"));
        return;
      }
      const data = await res.json();
      myPlayerId = data.playerId;
      roomCode = data.roomCode;
      isHost = false;
      players = data.players || [];
      setupClient();
      onlineScreen = "lobby";
      sound.playTap();
      renderSetup();
    } catch {
      onError(t("compete.server_unavailable"));
    }
  }

  function renderOnlineLobby() {
    const card = el("div.kmg-card.kmg-race-card");
    const shareUrl = `${window.location.origin}${window.location.pathname}#/compete?race=${roomCode}`;

    const copyCodeBtn = el("button.kmg-btn.kmg-btn-ghost.kmg-btn-sm", {
      type: "button",
      text: t("compete.copy_code_btn"),
      onClick: async () => {
        if (await copyToClipboard(roomCode)) toast(t("compete.copied_toast"), "📋", 1800);
      },
    });
    const copyLinkBtn = el("button.kmg-btn.kmg-btn-ghost.kmg-btn-sm", {
      type: "button",
      text: t("compete.copy_link_btn"),
      onClick: async () => {
        if (await copyToClipboard(shareUrl)) toast(t("compete.copied_toast"), "📋", 1800);
      },
    });

    const playersList = el("div.kmg-race-players-status");
    players.forEach((p) => {
      playersList.append(
        el(`div.kmg-race-player-pill${p.id === myPlayerId ? ".is-me" : ""}`, {
          text: `${p.isHost ? "🟢" : "🔵"} ${p.name}${p.id === myPlayerId ? ` (${t("compete.you_label")})` : ""}`,
        }),
      );
    });

    const actionArea = el("div.kmg-race-action-area");
    if (isHost) {
      const ready = players.length >= MIN_PLAYERS_ONLINE;
      actionArea.append(
        el("button.kmg-btn.kmg-btn-primary.kmg-btn-big", {
          type: "button",
          disabled: !ready,
          text: ready ? t("compete.start_btn") : t("compete.waiting_for_players"),
          onClick: () => client.send({ type: "start_game", roomCode, playerId: myPlayerId }),
        }),
      );
    } else {
      actionArea.append(
        el("div.kmg-banner.kmg-banner-info", {}, [
          el("span.kmg-banner-icon", { text: "⏳" }),
          el("span.kmg-banner-body", {
            text: t("compete.waiting_for_host", { name: players.find((p) => p.isHost)?.name || "?" }),
          }),
        ]),
      );
    }

    card.append(
      el("h3", { text: t("compete.share_code_title") }),
      el("p.kmg-sub", { text: t("compete.share_code_desc") }),
      el("div.kmg-race-code-display", {}, [el("div.kmg-race-big-code", { text: roomCode })]),
      el("div.kmg-race-code-actions", {}, [copyCodeBtn, copyLinkBtn]),
      el("h4", { text: t("compete.players_heading") }),
      playersList,
      actionArea,
    );
    viewSetup.append(card);
  }

  function handleOnlineEvent(msg) {
    if (!msg || !msg.type) return;
    switch (msg.type) {
      case "player_joined":
      case "player_left": {
        players = msg.players || players;
        sound.playTap();
        if (onlineScreen === "lobby" && viewPlay.hidden) renderSetup();
        break;
      }
      case "countdown_started": {
        viewSetup.hidden = true;
        viewResults.hidden = true;
        viewPlay.hidden = false;
        renderCountdown(3);
        break;
      }
      case "countdown_tick": {
        renderCountdown(msg.count);
        break;
      }
      case "round_started": {
        currentQuestion = msg.question;
        players = msg.players || players;
        answeredIds = new Set();
        myAnswered = false;
        renderOnlineRound(msg);
        break;
      }
      case "player_answered": {
        answeredIds.add(msg.playerId);
        if (msg.playerId !== myPlayerId) sound.playTap();
        refreshScoreStrip?.();
        break;
      }
      case "round_recap": {
        clearInterval(onlineTimerInterval);
        players = msg.players || players;
        renderOnlineRecap(msg);
        break;
      }
      case "game_finished": {
        renderOnlineFinished(msg);
        break;
      }
      case "rematch_ready": {
        players = msg.players || players;
        onlineScreen = "lobby";
        viewPlay.hidden = true;
        viewResults.hidden = true;
        viewSetup.hidden = false;
        renderSetup();
        break;
      }
    }
  }

  function renderCountdown(count) {
    clear(viewPlay);
    sound.playTap();
    viewPlay.append(
      el("div.kmg-race-countdown", {}, [
        el("div.kmg-race-cd-text", { text: t("compete.countdown_ready") }),
        el("div.kmg-race-cd-num", { text: count > 0 ? String(count) : t("compete.countdown_go") }),
      ]),
    );
  }

  function scoreboardPills() {
    return players.map((p) =>
      el(`div.kmg-race-scorepill${p.id === myPlayerId ? ".is-me" : ""}`, {}, [
        el("span", { text: `${p.id === myPlayerId ? "🟢" : "🔵"} ${p.name}` }),
        el("span", { text: `${p.score} pt` }),
        answeredIds.has(p.id) ? el("span", { text: "✅" }) : null,
      ]),
    );
  }

  function renderOnlineRound(msg) {
    clearInterval(onlineTimerInterval);
    clear(viewPlay);

    const indicator = el("div.kmg-race-round-indicator", {
      text: t("compete.round_indicator", { current: msg.roundIndex + 1, total: msg.totalRounds }),
    });
    const timerBar = el("div.kmg-race-timerbar");
    const timerFill = el("div.kmg-race-timerfill");
    timerBar.append(timerFill);

    const scoreStrip = el("div.kmg-race-scorestrip");
    refreshScoreStrip = () => {
      clear(scoreStrip);
      append(scoreStrip, ...scoreboardPills());
    };
    refreshScoreStrip();

    const questionNode = el("div.kmg-question.is-in", {}, [
      el("span.kmg-question-emoji", { text: "🏁" }),
      el("span.kmg-question-text", { text: questionDisplayText(currentQuestion) }),
    ]);

    const feedbackNode = el("div.kmg-race-feedback");
    const choiceGrid = el("div.kmg-choices", { style: { "--kmg-cols": "2" } });
    const buttons = [];
    currentQuestion.options.forEach((opt) => {
      const btn = el("button.kmg-choice", {
        type: "button",
        text: opt,
        onClick: () => {
          if (myAnswered) return;
          myAnswered = true;
          buttons.forEach((b) => (b.disabled = true));
          btn.classList.add("is-selected");
          answeredIds.add(myPlayerId);
          refreshScoreStrip();
          client.send({ type: "submit_answer", roomCode, playerId: myPlayerId, answer: opt });
          feedbackNode.textContent = t("compete.you_answered_badge");
          sound.playTap();
        },
      });
      buttons.push(btn);
      choiceGrid.append(btn);
    });

    append(viewPlay, el("div.kmg-race-play-header", {}, [indicator, timerBar]), scoreStrip, questionNode, choiceGrid, feedbackNode);

    const startTime = Date.now();
    onlineTimerInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const fraction = Math.max(0, 1 - elapsed / msg.duration);
      timerFill.style.width = `${fraction * 100}%`;
      if (fraction <= 0.25) timerFill.classList.add("is-urgent");
      if (elapsed >= msg.duration) clearInterval(onlineTimerInterval);
    }, 100);
  }

  function renderOnlineRecap(msg) {
    const mine = msg.results.find((r) => r.id === myPlayerId);
    refreshScoreStrip?.();

    const feedbackNode = viewPlay.querySelector(".kmg-race-feedback");
    if (!mine || !feedbackNode) return;

    if (mine.isCorrect) sound.playCorrect(0);
    else sound.playIncorrect();

    clear(feedbackNode);
    feedbackNode.append(
      mine.isCorrect
        ? el("span.kmg-msg-ok", { text: t("compete.correct_feedback", { points: mine.points }) })
        : el("span.kmg-msg-bad", {
            text: mine.answer === "—"
              ? t("compete.timeout_feedback", { answer: msg.correctAnswer })
              : t("compete.wrong_feedback", { answer: msg.correctAnswer }),
          }),
    );

    settleAnswer({
      gameKey: GAME_KEY,
      level: selectedLevel,
      questionText: currentQuestion ? questionDisplayText(currentQuestion) : "",
      studentAnswer: mine.answer,
      correctAnswer: msg.correctAnswer,
      isCorrect: mine.isCorrect,
      points: mine.points,
      adaptLevel: false,
      score: true,
    });
  }

  function renderOnlineFinished(msg) {
    clearInterval(onlineTimerInterval);
    viewPlay.hidden = true;
    viewResults.hidden = false;
    clear(viewResults);
    renderResultsScreen(msg.stats, msg.roundHistory, msg.totalRounds, {
      onRematch: () => client.send({ type: "rematch", roomCode, playerId: myPlayerId }),
      onNewRace: () => {
        client?.stop();
        client = null;
        roomCode = "";
        players = [];
        onlineScreen = "form";
        viewResults.hidden = true;
        viewSetup.hidden = false;
        renderSetup();
      },
    });
  }

  // ---------------------------------------------------------------------
  // Local (same device) roster & race
  // ---------------------------------------------------------------------

  function renderLocalSetup() {
    const card = el("div.kmg-card.kmg-race-card");
    const rosterWrap = el("div.kmg-race-players-row");

    const paintRoster = () => {
      clear(rosterWrap);
      localNames.forEach((name, i) => {
        const input = el("input.kmg-textinput", {
          type: "text",
          value: name,
          placeholder: t("compete.player_name_placeholder", { n: i + 1 }),
          maxlength: "24",
        });
        input.addEventListener("input", (e) => (localNames[i] = e.target.value));
        const row = el("div.kmg-race-player-row", {}, [
          el("span", { text: i === 0 ? "🟢" : "🔵" }),
          input,
        ]);
        if (i > 0) {
          row.append(
            el("button.kmg-race-remove-btn", {
              type: "button",
              text: "✕",
              "aria-label": t("compete.remove_player_label", { n: i + 1 }),
              onClick: () => {
                localNames.splice(i, 1);
                paintRoster();
              },
            }),
          );
        }
        rosterWrap.append(row);
      });
    };
    paintRoster();

    const addBtn = el("button.kmg-btn.kmg-btn-ghost.kmg-btn-sm", {
      type: "button",
      text: t("compete.add_player_btn"),
      onClick: () => {
        if (localNames.length >= MAX_PLAYERS) return;
        localNames.push("");
        paintRoster();
      },
    });

    const startBtn = el("button.kmg-btn.kmg-btn-primary.kmg-btn-big", {
      type: "button",
      text: t("compete.start_btn"),
      onClick: startLocalRace,
    });

    card.append(
      el("h3", { text: t("compete.local_players_heading") }),
      el("p.kmg-sub", { text: t("compete.local_players_body") }),
      rosterWrap,
      addBtn,
      categoryChooser(renderSetup),
      roundsChooser(renderSetup),
      levelChooser(renderSetup),
      scoringNote(),
      startBtn,
    );
    viewSetup.append(card);
  }

  function stopLocalTimers() {
    if (localTimerInterval) clearInterval(localTimerInterval);
    if (localAdvanceTimeout) clearTimeout(localAdvanceTimeout);
    if (localCountdownInterval) clearInterval(localCountdownInterval);
    localTimerInterval = null;
    localAdvanceTimeout = null;
    localCountdownInterval = null;
  }

  function startLocalRace() {
    stopLocalTimers();
    localNames = localNames.map((n, i) => cleanPlayerName(n, i === 0 ? state.playerName || t("compete.you_label") : `Speler ${i + 1}`));
    localQuestions = generateRaceQuestions(selectedCategory, selectedLevel, selectedRounds);
    localResults = localNames.map(() => []);
    localQIndex = 0;

    viewSetup.hidden = true;
    viewResults.hidden = true;
    viewPlay.hidden = false;

    let count = 3;
    clear(viewPlay);
    sound.playTap();
    const cdNode = el("div.kmg-race-cd-num", { text: String(count) });
    viewPlay.append(
      el("div.kmg-race-countdown", {}, [el("div.kmg-race-cd-text", { text: t("compete.countdown_ready") }), cdNode]),
    );
    localCountdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        sound.playTap();
        cdNode.textContent = String(count);
      } else if (count === 0) {
        sound.playFanfare();
        cdNode.textContent = t("compete.countdown_go");
      } else {
        clearInterval(localCountdownInterval);
        localCountdownInterval = null;
        runLocalRound();
      }
    }, 900);
  }

  function runLocalRound() {
    stopLocalTimers();
    if (localQIndex >= localQuestions.length) {
      finishLocalRace();
      return;
    }

    const problem = localQuestions[localQIndex];
    localAnsweredThisRound = new Set();
    localRoundEnded = false;
    localRoundStartTime = performance.now();
    clear(viewPlay);

    const indicator = el("div.kmg-race-round-indicator", {
      text: t("compete.round_indicator", { current: localQIndex + 1, total: localQuestions.length }),
    });
    const timerBar = el("div.kmg-race-timerbar");
    const timerFill = el("div.kmg-race-timerfill");
    timerBar.append(timerFill);

    const cards = localNames.map((name, pi) => {
      const total = localResults[pi].reduce((s, r) => s + r.points, 0);
      const feedbackNode = el("div.kmg-race-feedback");
      const choiceGrid = el("div.kmg-choices", { style: { "--kmg-cols": "2" } });
      const buttons = [];
      problem.options.forEach((opt) => {
        const btn = el("button.kmg-choice", {
          type: "button",
          text: opt,
          onClick: () => handleLocalAnswer(pi, opt, problem, btn, feedbackNode, buttons),
          // Two (or more) players tap two different cards on this one shared
          // screen at the same instant. A touch browser only synthesizes a
          // "click" from the first finger it sees in a multi-touch gesture,
          // so without this the second (and any later) player's tap would
          // silently do nothing. pointerdown fires once per touch point,
          // independently of any other finger already down elsewhere on the
          // screen, so every player's own card registers its own tap.
          // handleLocalAnswer() already guards on "this player already
          // answered", so also getting the click that follows (for whichever
          // finger the browser treats as primary) is harmless.
          onPointerdown: (event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            handleLocalAnswer(pi, opt, problem, btn, feedbackNode, buttons);
          },
        });
        buttons.push(btn);
        choiceGrid.append(btn);
      });
      return el(`div.kmg-race-player-card${pi === 0 ? ".is-me" : ""}`, {}, [
        el("div.kmg-race-card-head", {}, [
          el("strong", { text: `${pi === 0 ? "🟢" : "🔵"} ${name}` }),
          el("span.kmg-race-scoretag", { text: `${total} pt` }),
        ]),
        el("div.kmg-question.is-in", {}, [el("span.kmg-question-text", { text: questionDisplayText(problem) })]),
        choiceGrid,
        feedbackNode,
      ]);
    });

    append(viewPlay, el("div.kmg-race-play-header", {}, [indicator, timerBar]), el("div.kmg-race-arena", {}, cards));

    localTimerInterval = setInterval(() => {
      if (localRoundEnded) {
        clearInterval(localTimerInterval);
        return;
      }
      const elapsed = (performance.now() - localRoundStartTime) / 1000;
      const fraction = Math.max(0, 1 - elapsed / ROUND_SECONDS);
      timerFill.style.width = `${fraction * 100}%`;
      if (fraction <= 0.25) timerFill.classList.add("is-urgent");
      if (elapsed >= ROUND_SECONDS) {
        clearInterval(localTimerInterval);
        handleLocalTimeout(problem);
      }
    }, 100);
  }

  function handleLocalAnswer(playerIndex, chosen, problem, buttonEl, feedbackNode, myButtons) {
    if (localRoundEnded || localAnsweredThisRound.has(playerIndex)) return;

    const elapsedMs = performance.now() - localRoundStartTime;
    const isCorrect = String(chosen) === String(problem.answerDisplay);
    const points = racePoints(isCorrect, elapsedMs);
    localResults[playerIndex].push({ isCorrect, elapsedMs, points, answer: chosen });
    localAnsweredThisRound.add(playerIndex);

    myButtons.forEach((b) => (b.disabled = true));
    clear(feedbackNode);
    if (isCorrect) {
      sound.playCorrect(0);
      buttonEl.classList.add("is-right");
      feedbackNode.append(el("span.kmg-msg-ok", { text: t("compete.correct_feedback", { points }) }));
    } else {
      sound.playIncorrect();
      buttonEl.classList.add("is-wrong");
      feedbackNode.append(el("span.kmg-msg-bad", { text: t("compete.wrong_feedback", { answer: problem.answerDisplay }) }));
    }

    if (playerIndex === 0) {
      settleAnswer({
        gameKey: GAME_KEY,
        level: selectedLevel,
        questionText: questionDisplayText(problem),
        studentAnswer: chosen,
        correctAnswer: problem.answerDisplay,
        isCorrect,
        points,
        adaptLevel: false,
        score: true,
      });
    }

    if (localAnsweredThisRound.size >= localNames.length) {
      localRoundEnded = true;
      if (localTimerInterval) clearInterval(localTimerInterval);
      localAdvanceTimeout = setTimeout(() => {
        localQIndex++;
        runLocalRound();
      }, 1100);
    }
  }

  function handleLocalTimeout(problem) {
    if (localRoundEnded) return;
    localRoundEnded = true;
    sound.playTimeUp();

    localNames.forEach((_, pi) => {
      if (localAnsweredThisRound.has(pi)) return;
      localResults[pi].push({ isCorrect: false, elapsedMs: ROUND_SECONDS * 1000, points: 0, answer: "—" });
      localAnsweredThisRound.add(pi);
      const cards = viewPlay.querySelectorAll(".kmg-race-player-card");
      const feedbackNode = cards[pi]?.querySelector(".kmg-race-feedback");
      const buttons = cards[pi]?.querySelectorAll(".kmg-choice");
      buttons?.forEach((b) => (b.disabled = true));
      if (feedbackNode) {
        clear(feedbackNode);
        feedbackNode.append(el("span.kmg-msg-bad", { text: t("compete.timeout_feedback", { answer: problem.answerDisplay }) }));
      }
    });

    localAdvanceTimeout = setTimeout(() => {
      localQIndex++;
      runLocalRound();
    }, 1300);
  }

  function finishLocalRace() {
    stopLocalTimers();
    viewPlay.hidden = true;
    viewResults.hidden = false;
    clear(viewResults);

    const stats = localNames.map((name, pi) => {
      const results = localResults[pi];
      const correctResults = results.filter((r) => r.isCorrect);
      return {
        id: String(pi),
        name,
        score: results.reduce((s, r) => s + r.points, 0),
        correctCount: correctResults.length,
        avgSpeed: correctResults.length
          ? (correctResults.reduce((s, r) => s + r.elapsedMs, 0) / correctResults.length / 1000).toFixed(1)
          : "—",
      };
    });

    const roundHistory = localQuestions.map((q, idx) => {
      const results = localNames.map((name, pi) => ({ id: String(pi), name, ...(localResults[pi][idx] || {}) }));
      const bestPoints = Math.max(0, ...results.map((r) => r.points || 0));
      const roundWinners = bestPoints > 0 ? results.filter((r) => r.points === bestPoints).map((r) => r.name) : [];
      return {
        round: idx + 1,
        question: q.text,
        textKey: q.textKey,
        textVars: q.textVars,
        correctAnswer: q.answerDisplay,
        results,
        roundWinners,
      };
    });

    renderResultsScreen(stats, roundHistory, localQuestions.length, {
      onRematch: startLocalRace,
      onNewRace: () => {
        viewResults.hidden = true;
        viewSetup.hidden = false;
        renderSetup();
      },
    });
  }

  // ---------------------------------------------------------------------
  // Shared results screen (both online and local hand this the same shape)
  // ---------------------------------------------------------------------

  function renderResultsScreen(stats, roundHistory, totalRounds, actions) {
    const ranked = rankPlayers(stats);
    const winner = ranked[0];
    const isTie = ranked.length > 1 && ranked[1].score === winner.score;

    if (!isTie) bigCelebration();
    else confetti();

    const banner = el("div.kmg-race-winner-banner", {}, [
      el("div.kmg-race-winner-trophy", { text: "🏆" }),
      el("h2.kmg-race-winner-title", {
        text: isTie ? t("compete.tie_banner") : t("compete.winner_banner", { name: winner.name, score: winner.score }),
      }),
      el("p.kmg-sub", { text: t("compete.scoring_rule_reminder") }),
    ]);

    const summaryGrid = el(
      "div.kmg-race-summary-grid",
      {},
      ranked.map((p) =>
        el(`div.kmg-card.kmg-race-summary-card${p.rank === 1 ? ".is-leader" : ""}`, {}, [
          el("div.kmg-race-medal", { text: medal(p.rank) }),
          el("strong", { text: p.name }),
          el("div.kmg-race-summary-score", { text: String(p.score) }),
          el("div.kmg-sub", { text: t("compete.stat_score") }),
          el("div.kmg-race-stat-line", { text: `${t("compete.stat_correct")}: ${p.correctCount}/${totalRounds}` }),
          el("div.kmg-race-stat-line", { text: `${t("compete.stat_avgtime")}: ${p.avgSpeed}s` }),
        ]),
      ),
    );

    const tableCard = el("div.kmg-card", {}, [
      el("h3", { text: t("compete.perquestion_heading") }),
      breakdownTable(roundHistory),
    ]);

    const actionsRow = el("div.kmg-actions", {}, [
      el("button.kmg-btn.kmg-btn-primary.kmg-btn-big", { type: "button", text: t("compete.rematch_btn"), onClick: actions.onRematch }),
      el("button.kmg-btn.kmg-btn-ghost", { type: "button", text: t("compete.new_race_button"), onClick: actions.onNewRace }),
      el("a.kmg-btn.kmg-btn-ghost", { href: "#/", text: t("compete.home_btn") }),
    ]);

    viewResults.append(banner, summaryGrid, tableCard, actionsRow);
  }

  function breakdownTable(roundHistory) {
    if (!roundHistory.length) return el("p.kmg-sub", { text: "" });
    const names = roundHistory[0].results.map((r) => r.name);
    const table = el("table.kmg-table.kmg-race-table");
    table.append(
      el("thead", {}, [
        el("tr", {}, [
          el("th", { text: "#" }),
          el("th", { text: t("compete.col_question") }),
          el("th", { text: t("compete.col_correct") }),
          ...names.map((n) => el("th", { text: n })),
        ]),
      ]),
      el(
        "tbody",
        {},
        roundHistory.map((row) =>
          el("tr", {}, [
            el("td", { text: String(row.round) }),
            el("td", { text: row.textKey ? t(row.textKey, row.textVars) : row.question }),
            el("td", { text: String(row.correctAnswer) }),
            ...row.results.map((r) =>
              el(`td.${r.isCorrect ? "is-correct" : "is-wrong"}`, {
                text: r.isCorrect ? `✅ ${((r.elapsedMs || 0) / 1000).toFixed(1)}s` : "❌",
              }),
            ),
          ]),
        ),
      ),
    );
    return el("div.kmg-table-scroll", {}, [table]);
  }

  // ---------------------------------------------------------------------

  if (initialJoinCode) mode = "online";
  renderSetup();

  return () => {
    stopLocalTimers();
    if (onlineTimerInterval) clearInterval(onlineTimerInterval);
    if (client) client.stop();
  };
}
