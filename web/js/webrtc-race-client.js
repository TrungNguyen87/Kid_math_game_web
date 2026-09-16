/**
 * The two ends of Race Mode's "Direct" connection: a real join-code race
 * with no server, over a single `RTCDataChannel` (see webrtc-signal.js for
 * the manual offer/answer handshake that opens it).
 *
 * Both classes present the exact same shape `web/js/pages/compete.js`
 * already speaks to its server-backed `RaceClient`: a constructor that
 * takes an `onEvent` callback, `send(msg)`, and `stop()`. That is what lets
 * every render function written for the server room (the lobby, the
 * countdown, the round, the recap, the results screen) work unmodified
 * against this connection too - only *how a room gets created and joined*
 * differs, not anything about how it plays out once it has.
 *
 * `WebRtcHostClient` is the interesting half: since there is no server to
 * be authoritative, the host's own tab runs one - a `RaceRoomManager`
 * (race-room-engine.js, the exact class `race-server.js` runs behind a
 * WebSocket) instance with exactly one room and two "connections": a
 * loopback for the host's own player (an object whose `send()` just calls
 * `onEvent` directly, no network involved) and the data channel for the
 * guest. `RaceRoomManager.handleMessage()` only ever needs `ws.send()` and
 * `ws.readyState`, so neither stub has to pretend to be a real WebSocket
 * beyond that.
 */
import { RaceRoomManager } from "./race-room-engine.js";
import {
  createHostOffer,
  createGuestAnswer,
  applyGuestAnswer,
  encodeSignalBlob,
  decodeSignalBlob,
} from "./webrtc-signal.js";

const OPEN = 1;

function loopbackSocket(onEvent) {
  return {
    readyState: OPEN,
    send: (payload) => onEvent(JSON.parse(payload)),
  };
}

function channelSocket(channel) {
  return {
    get readyState() {
      return channel.readyState === "open" ? OPEN : 0;
    },
    send: (payload) => {
      if (channel.readyState === "open") channel.send(payload);
    },
  };
}

export class WebRtcHostClient {
  constructor(onEvent) {
    this.onEvent = onEvent;
    this.manager = new RaceRoomManager();
    this.room = null;
    this.hostId = null;
    this.pc = null;
    this.channel = null;
  }

  /** Creates the room + the WebRTC offer, and returns the blob to show as
   *  text/QR for the guest to read. */
  async createOffer(hostName, settings) {
    this.room = this.manager.createRoom(hostName, settings);
    this.hostId = this.room.players[0].id;
    this.room.players[0].ws = loopbackSocket(this.onEvent);
    this.room.players[0].connected = true;

    const { pc, channel, description } = await createHostOffer();
    this.pc = pc;
    this.channel = channel;

    channel.addEventListener("message", (event) => {
      try {
        this.manager.handleMessage(channelSocket(channel), JSON.parse(event.data));
      } catch {
        /* ignore a malformed frame from the other side rather than crash */
      }
    });
    channel.addEventListener("close", () => this._onGuestGone());

    return {
      roomCode: this.room.code,
      playerId: this.hostId,
      blob: encodeSignalBlob({ type: "offer", code: this.room.code, settings: this.room.settings, description }),
    };
  }

  /** Applies the guest's pasted/scanned answer blob. Resolves once the data
   *  channel is open; the guest introduces itself over it right after (a
   *  `join_room` message), which is what actually adds it to `room.players`
   *  and fires the usual `player_joined` broadcast. */
  async applyAnswerBlob(text) {
    const result = decodeSignalBlob(text, "answer");
    if (!result.ok) return result;
    if (result.code !== this.room.code) return { ok: false, error: "code_mismatch" };

    await applyGuestAnswer(this.pc, result.description);
    await new Promise((resolve, reject) => {
      if (this.channel.readyState === "open") return resolve();
      const timer = setTimeout(() => reject(new Error("connection_timeout")), 15000);
      this.channel.addEventListener(
        "open",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
    return { ok: true };
  }

  _onGuestGone() {
    const guest = this.room?.players.find((p) => p.id !== this.hostId);
    if (guest) this.manager.handlePlayerDisconnect(this.room.code, guest.id);
  }

  send(msg) {
    if (!this.room) return;
    this.manager.handleMessage(loopbackSocket(this.onEvent), { ...msg, roomCode: this.room.code, playerId: this.hostId });
  }

  stop() {
    if (this.room) {
      clearTimeout(this.room.timer);
      this.manager.rooms.delete(this.room.code);
    }
    this.channel?.close();
    this.pc?.close();
  }
}

export class WebRtcGuestClient {
  constructor(onEvent) {
    this.onEvent = onEvent;
    this.pc = null;
    this.channel = null;
    this.channelPromise = null;
  }

  /** Reads the host's offer blob and returns the answer blob to show back
   *  to the host. Deliberately does not wait for the data channel here: it
   *  only opens *after* the host has this answer and applies it, so waiting
   *  for it before returning the answer would be waiting on a step that
   *  cannot happen yet - `joinRoom()` is what waits for the channel. */
  async readOffer(text) {
    const result = decodeSignalBlob(text, "offer");
    if (!result.ok) return result;

    const { pc, channelPromise, description } = createGuestAnswer(result.description);
    this.pc = pc;
    this.channelPromise = channelPromise;
    const answerDescription = await description;

    return {
      ok: true,
      code: result.code,
      settings: result.settings,
      answerBlob: encodeSignalBlob({ type: "answer", code: result.code, description: answerDescription }),
    };
  }

  /** Call once the answer blob has been sent back to the host. Waits for the
   *  host to apply it and the data channel to actually open, then
   *  introduces this player to the host's room. */
  async joinRoom(roomCode, playerName) {
    this.channel = await Promise.race([
      this.channelPromise,
      new Promise((_resolve, reject) => setTimeout(() => reject(new Error("connection_timeout")), 15000)),
    ]);
    this.channel.addEventListener("message", (event) => {
      try {
        this.onEvent(JSON.parse(event.data));
      } catch {
        /* ignore a malformed frame rather than crash the page */
      }
    });

    return new Promise((resolve, reject) => {
      const send = () => {
        this.channel.send(JSON.stringify({ type: "join_room", roomCode, playerName }));
        resolve();
      };
      if (this.channel.readyState === "open") return send();
      const timer = setTimeout(() => reject(new Error("connection_timeout")), 15000);
      this.channel.addEventListener(
        "open",
        () => {
          clearTimeout(timer);
          send();
        },
        { once: true },
      );
    });
  }

  send(msg) {
    if (this.channel && this.channel.readyState === "open") this.channel.send(JSON.stringify(msg));
  }

  stop() {
    this.channel?.close();
    this.pc?.close();
  }
}
