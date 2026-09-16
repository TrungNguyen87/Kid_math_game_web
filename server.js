import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { RaceRoomManager } from './race-server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json());

const staticPath = path.join(__dirname, 'web');

// Serve static assets from the web directory
app.use(
  express.static(staticPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('sw.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  }),
);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Race Mode online play: a join-code room engine (see race-server.js for why
// this never touches the GitHub Pages deploy). WebSocket is the primary
// transport; the REST routes below are the polling fallback for a client
// that couldn't open one.
const raceRooms = new RaceRoomManager();
raceRooms.attachWebSocketServer(server);

app.post('/api/rooms/create', (req, res) => {
  const { playerName, settings } = req.body || {};
  const room = raceRooms.createRoom(playerName, settings);
  res.json({
    roomCode: room.code,
    playerId: room.players[0].id,
    settings: room.settings,
    players: raceRooms.sanitizePlayers(room),
  });
});

app.post('/api/rooms/join', (req, res) => {
  const { roomCode, playerName } = req.body || {};
  const result = raceRooms.joinRoom(roomCode, playerName);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  const { room, player } = result;
  raceRooms.broadcast(room, {
    type: 'player_joined',
    newPlayerName: player.name,
    players: raceRooms.sanitizePlayers(room),
  });
  res.json({
    roomCode: room.code,
    playerId: player.id,
    settings: room.settings,
    status: room.status,
    players: raceRooms.sanitizePlayers(room),
  });
});

app.get('/api/rooms/:code', (req, res) => {
  const code = (req.params.code || '').toUpperCase();
  const room = raceRooms.rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Race niet gevonden' });
  }
  const since = Number(req.query.since) || 0;
  res.json({
    roomCode: room.code,
    status: room.status,
    players: raceRooms.sanitizePlayers(room),
    settings: room.settings,
    events: room.events.filter((e) => e.id > since),
  });
});

// One shared shape with the WebSocket messages (`type` + payload) so a
// client falling back to polling can reuse exactly the same send() call.
app.post('/api/rooms/:code/action', (req, res) => {
  const code = (req.params.code || '').toUpperCase();
  const room = raceRooms.rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Race niet gevonden' });
  }
  raceRooms.handleMessage(null, { ...req.body, roomCode: code });
  res.json({ ok: true });
});

// Fallback to index.html for client-side routing
app.get('*all', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
