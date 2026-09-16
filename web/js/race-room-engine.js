/**
 * Race Mode - the authoritative room engine, with no transport wired in.
 *
 * This is the same state machine that used to live directly in
 * `race-server.js` (`waiting -> countdown -> in_round -> round_recap ->
 * finished`), pulled out so it can run in two places instead of one:
 *
 *   - Node, behind a WebSocket, for a self-hosted server
 *     (`race-server.js` re-adds `attachWebSocketServer()` around this class).
 *   - The browser, behind an `RTCDataChannel`, for the WebRTC "direct"
 *     connection mode (`webrtc-race-client.js`) - the host's own tab runs a
 *     `RaceRoomManager` instance locally and calls `handleMessage()` exactly
 *     like a server would, just with a peer connection instead of a socket.
 *
 * `handleMessage(ws, msg, registerContext)` never assumes anything about
 * `ws` beyond `ws.send(payloadString)` and `ws.readyState === 1` (open) -
 * that is what makes both transports work against the same code without a
 * fork. Everything else is keyed off `msg.roomCode`/`msg.playerId`, not off
 * which connection a message arrived on.
 *
 * A room holds any number of players from MIN_PLAYERS_ONLINE up to
 * MAX_PLAYERS (2..6 today) - not a fixed two - because a *race* is meant to
 * have more than one opponent. Every round is broadcast to every player at
 * once, so a client can show everyone's progress side by side.
 */
import {
  generateRaceProblem,
  racePoints,
  rankPlayers,
  generateRoomCode,
  cleanPlayerName,
  ROUND_SECONDS,
  MIN_PLAYERS_ONLINE,
  MAX_PLAYERS,
} from "./race-logic.js";

function generatePlayerId() {
  return "p_" + Math.random().toString(36).slice(2, 10);
}

const OPEN = 1; // WebSocket.OPEN's numeric value - true for a real socket and for the fake ones the WebRTC client hands in.

export class RaceRoomManager {
  constructor() {
    this.rooms = new Map();
    // Clean stale rooms every 10 minutes so an abandoned lobby doesn't sit
    // in memory forever. Harmless (just never fires) for a browser-hosted
    // manager that only ever holds the one room its own tab created.
    const interval = setInterval(() => this.cleanupStaleRooms(), 10 * 60 * 1000);
    if (interval.unref) interval.unref();
  }

  cleanupStaleRooms() {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      if (now - room.createdAt > 3 * 60 * 60 * 1000) {
        if (room.timer) clearTimeout(room.timer);
        this.rooms.delete(code);
      }
    }
  }

  /** Shared by the WS handler, the REST `/action` fallback endpoint, and the
   *  WebRTC data channel's onmessage handler. */
  handleMessage(ws, msg, registerContext) {
    switch (msg.type) {
      case "ping":
        ws?.send(JSON.stringify({ type: "pong" }));
        break;

      case "create_room": {
        const room = this.createRoom(msg.playerName, msg.settings);
        const player = room.players[0];
        player.ws = ws || null;
        registerContext?.(room.code, player.id);
        ws?.send(
          JSON.stringify({
            type: "room_created",
            roomCode: room.code,
            playerId: player.id,
            settings: room.settings,
            players: this.sanitizePlayers(room),
          }),
        );
        break;
      }

      // The client creates/joins a room over REST first (a synchronous
      // response is simpler than racing a WS round-trip), then opens the
      // socket and attaches it to the player it already has an id for -
      // rather than sending create_room/join_room again and minting a
      // second, orphaned room.
      case "attach": {
        const room = this.rooms.get(msg.roomCode);
        if (!room) return;
        const player = room.players.find((p) => p.id === msg.playerId);
        if (!player) return;
        player.ws = ws;
        player.connected = true;
        registerContext?.(room.code, player.id);
        break;
      }

      case "join_room": {
        const result = this.joinRoom(msg.roomCode, msg.playerName);
        if (result.error) {
          ws?.send(JSON.stringify({ type: "error", message: result.error }));
          return;
        }
        const { room, player } = result;
        player.ws = ws || null;
        registerContext?.(room.code, player.id);

        ws?.send(
          JSON.stringify({
            type: "room_joined",
            roomCode: room.code,
            playerId: player.id,
            settings: room.settings,
            status: room.status,
            players: this.sanitizePlayers(room),
          }),
        );

        this.broadcast(room, {
          type: "player_joined",
          newPlayerName: player.name,
          players: this.sanitizePlayers(room),
        });
        break;
      }

      case "start_game": {
        const room = this.rooms.get(msg.roomCode);
        if (!room) return;
        if (room.hostId !== msg.playerId) {
          ws?.send(JSON.stringify({ type: "error", message: "Alleen de maker kan de race starten." }));
          return;
        }
        if (room.players.length < MIN_PLAYERS_ONLINE) {
          ws?.send(JSON.stringify({ type: "error", message: "Wachten op meer spelers..." }));
          return;
        }
        this.startGame(room);
        break;
      }

      case "submit_answer": {
        const room = this.rooms.get(msg.roomCode);
        if (!room) return;
        this.recordAnswer(room, msg.playerId, msg.answer);
        break;
      }

      case "rematch": {
        const room = this.rooms.get(msg.roomCode);
        if (!room) return;
        this.resetGameForRematch(room);
        break;
      }
    }
  }

  createRoom(hostName, settings = {}) {
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();

    const hostId = generatePlayerId();
    const cleanSettings = {
      category: settings.category || "bliksem",
      rounds: Math.min(15, Math.max(5, Number(settings.rounds) || 10)),
      level: Math.min(5, Math.max(0, Number(settings.level) || 2)),
    };

    const hostPlayer = {
      id: hostId,
      name: cleanPlayerName(hostName, "Speler 1"),
      isHost: true,
      score: 0,
      correctCount: 0,
      totalResponseTime: 0,
      connected: true,
      ws: null,
    };

    const room = {
      code,
      hostId,
      createdAt: Date.now(),
      settings: cleanSettings,
      players: [hostPlayer],
      status: "waiting", // waiting | countdown | in_round | round_recap | finished
      questions: [],
      currentRoundIndex: 0,
      roundStartTime: 0,
      roundAnswers: {},
      roundHistory: [],
      timer: null,
      events: [],
    };

    this.rooms.set(code, room);
    return room;
  }

  joinRoom(rawCode, guestName) {
    const code = (rawCode || "").trim().toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return { error: "Racecode niet gevonden. Controleer de code." };
    if (room.status !== "waiting" && room.status !== "finished") {
      return { error: "Deze race is al begonnen!" };
    }

    const trimmedName = cleanPlayerName(guestName, `Speler ${room.players.length + 1}`);
    const existing = room.players.find((p) => p.name === trimmedName && !p.connected);
    if (existing) {
      existing.connected = true;
      return { room, player: existing };
    }

    if (room.players.length >= MAX_PLAYERS) {
      return { error: `Deze race zit vol (maximaal ${MAX_PLAYERS} spelers).` };
    }

    const guestPlayer = {
      id: generatePlayerId(),
      name: trimmedName,
      isHost: false,
      score: 0,
      correctCount: 0,
      totalResponseTime: 0,
      connected: true,
      ws: null,
    };

    room.players.push(guestPlayer);
    return { room, player: guestPlayer };
  }

  sanitizePlayers(room) {
    return room.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      score: p.score,
      correctCount: p.correctCount,
      connected: p.connected,
    }));
  }

  broadcast(room, data) {
    const payload = JSON.stringify(data);
    room.events.push({ id: room.events.length + 1, data, timestamp: Date.now() });
    for (const player of room.players) {
      if (player.ws && player.ws.readyState === OPEN) {
        player.ws.send(payload);
      }
    }
  }

  handlePlayerDisconnect(roomCode, playerId) {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.connected = false;
      player.ws = null;
      this.broadcast(room, {
        type: "player_left",
        playerId,
        playerName: player.name,
        players: this.sanitizePlayers(room),
      });
    }
  }

  startGame(room) {
    if (room.timer) clearTimeout(room.timer);

    room.questions = [];
    for (let i = 0; i < room.settings.rounds; i++) {
      room.questions.push(generateRaceProblem(room.settings.category, room.settings.level));
    }

    room.currentRoundIndex = 0;
    room.roundHistory = [];
    room.players.forEach((p) => {
      p.score = 0;
      p.correctCount = 0;
      p.totalResponseTime = 0;
    });

    room.status = "countdown";
    let countdown = 3;

    this.broadcast(room, { type: "countdown_started", totalRounds: room.settings.rounds });

    const stepCountdown = () => {
      if (countdown > 0) {
        this.broadcast(room, { type: "countdown_tick", count: countdown });
        countdown--;
        room.timer = setTimeout(stepCountdown, 1000);
      } else {
        this.broadcast(room, { type: "countdown_tick", count: 0 }); // GO!
        room.timer = setTimeout(() => this.startNextRound(room), 1000);
      }
    };
    stepCountdown();
  }

  startNextRound(room) {
    if (room.currentRoundIndex >= room.questions.length) {
      this.finishGame(room);
      return;
    }

    const problem = room.questions[room.currentRoundIndex];
    room.status = "in_round";
    room.roundStartTime = Date.now();
    room.roundAnswers = {};

    this.broadcast(room, {
      type: "round_started",
      roundIndex: room.currentRoundIndex,
      totalRounds: room.questions.length,
      question: {
        text: problem.text,
        textKey: problem.textKey || null,
        textVars: problem.textVars || null,
        options: problem.options,
      },
      duration: ROUND_SECONDS,
      players: this.sanitizePlayers(room),
    });

    if (room.timer) clearTimeout(room.timer);
    room.timer = setTimeout(() => this.endRound(room), (ROUND_SECONDS + 0.3) * 1000);
  }

  recordAnswer(room, playerId, answer) {
    if (room.status !== "in_round") return;
    if (room.roundAnswers[playerId]) return; // already answered this round

    const elapsedMs = Date.now() - room.roundStartTime;
    const problem = room.questions[room.currentRoundIndex];
    const isCorrect = String(answer) === String(problem.answerDisplay);
    const points = racePoints(isCorrect, elapsedMs);

    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.score += points;
      if (isCorrect) player.correctCount++;
      player.totalResponseTime += elapsedMs / 1000;
    }

    room.roundAnswers[playerId] = { answer, elapsedMs, isCorrect, points };

    this.broadcast(room, {
      type: "player_answered",
      playerId,
      playerName: player ? player.name : "",
      isCorrect,
      points,
    });

    const connectedCount = room.players.filter((p) => p.connected).length;
    if (Object.keys(room.roundAnswers).length >= connectedCount) {
      if (room.timer) clearTimeout(room.timer);
      room.timer = setTimeout(() => this.endRound(room), 700);
    }
  }

  endRound(room) {
    if (room.status !== "in_round") return;
    if (room.timer) clearTimeout(room.timer);

    room.status = "round_recap";
    const problem = room.questions[room.currentRoundIndex];

    const results = room.players.map((p) => {
      const ans = room.roundAnswers[p.id] || { answer: "—", elapsedMs: ROUND_SECONDS * 1000, isCorrect: false, points: 0 };
      return { id: p.id, name: p.name, ...ans };
    });
    const bestPoints = Math.max(0, ...results.map((r) => r.points));
    const roundWinners = bestPoints > 0 ? results.filter((r) => r.points === bestPoints).map((r) => r.name) : [];

    room.roundHistory.push({
      round: room.currentRoundIndex + 1,
      question: problem.text,
      textKey: problem.textKey || null,
      textVars: problem.textVars || null,
      correctAnswer: problem.answerDisplay,
      results,
      roundWinners,
    });

    this.broadcast(room, {
      type: "round_recap",
      roundIndex: room.currentRoundIndex,
      correctAnswer: problem.answerDisplay,
      results,
      players: this.sanitizePlayers(room),
    });

    room.currentRoundIndex++;
    room.timer = setTimeout(() => this.startNextRound(room), 2800);
  }

  finishGame(room) {
    room.status = "finished";
    if (room.timer) clearTimeout(room.timer);

    const ranked = rankPlayers(room.players);
    const winner = ranked[0];
    const isTie = ranked.length > 1 && ranked[1].score === winner.score;

    const stats = ranked.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      correctCount: p.correctCount,
      avgSpeed: p.correctCount > 0 ? (p.totalResponseTime / room.questions.length).toFixed(1) : "—",
      rank: p.rank,
    }));

    this.broadcast(room, {
      type: "game_finished",
      winnerName: isTie ? null : winner.name,
      totalRounds: room.questions.length,
      stats,
      roundHistory: room.roundHistory,
      players: this.sanitizePlayers(room),
    });
  }

  resetGameForRematch(room) {
    if (room.timer) clearTimeout(room.timer);
    room.status = "waiting";
    this.broadcast(room, {
      type: "rematch_ready",
      players: this.sanitizePlayers(room),
      settings: room.settings,
    });
  }
}
