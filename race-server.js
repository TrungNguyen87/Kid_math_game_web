/**
 * WebSocket transport for the Race Mode room engine.
 *
 * The app itself is a static site with nowhere to run a server in
 * production (GitHub Pages, see docs/DEPLOYMENT.md) - this only runs when
 * the app is self-hosted with `npm start`/`node server.js`. It does not
 * touch anything `deploy-pages.yml` uploads (that workflow publishes the
 * `web/` folder only), so it cannot break the GitHub Pages deploy; it
 * exists for households/classrooms that do run their own server and want
 * a join-code race that keeps working even if a player's browser can't
 * make a direct WebRTC connection to the others (see
 * `web/js/webrtc-race-client.js` for the connection that needs no server
 * at all, and works on the published GitHub Pages site).
 *
 * The room state machine itself - `waiting -> countdown -> in_round ->
 * round_recap -> finished`, `createRoom`/`joinRoom`/`handleMessage`/... -
 * lives in `web/js/race-room-engine.js` now, framework-agnostic so the
 * WebRTC client can run the exact same logic in the browser. This file only
 * adds the `ws` wiring around it.
 */
import { WebSocketServer } from "ws";
import { RaceRoomManager as BaseRaceRoomManager } from "./web/js/race-room-engine.js";

export class RaceRoomManager extends BaseRaceRoomManager {
  attachWebSocketServer(server) {
    this.wss = new WebSocketServer({ server, path: "/ws/race" });

    this.wss.on("connection", (ws) => {
      let currentRoomCode = null;
      let currentPlayerId = null;

      ws.on("message", (raw) => {
        try {
          const data = JSON.parse(raw.toString());
          this.handleMessage(ws, data, (roomCode, playerId) => {
            currentRoomCode = roomCode;
            currentPlayerId = playerId;
          });
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
        }
      });

      ws.on("close", () => {
        if (currentRoomCode && currentPlayerId) {
          this.handlePlayerDisconnect(currentRoomCode, currentPlayerId);
        }
      });

      ws.on("error", () => {
        /* the close handler above covers cleanup */
      });
    });
  }
}
