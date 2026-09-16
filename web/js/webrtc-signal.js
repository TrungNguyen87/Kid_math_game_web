/**
 * WebRTC "manual signaling" for Race Mode's Direct connection mode.
 *
 * The published GitHub Pages site has nowhere to run the join-code room
 * server `race-server.js` needs (see docs/DEPLOYMENT.md and SESSIONS.md) -
 * so online play there cannot go through a server at all. Two browsers on
 * the same wifi/LAN can still open a direct `RTCDataChannel` to each other
 * with WebRTC, but *establishing* that connection normally needs a
 * signaling server of its own, to carry the SDP offer/answer handshake
 * before the peer connection exists to carry anything itself.
 *
 * This app has no server to be that carrier, so the two players are: one
 * device creates an offer and shows it (as text and a QR code - see
 * `qrcode.js`); the other reads it, creates an answer, and shows that back.
 * Once the host applies the answer, ICE has everything it needs and the
 * data channel opens on its own.
 *
 * Deliberately no STUN/TURN server is configured (`iceServers: []`): the
 * whole point of this mode is two devices that can already reach each other
 * on a local network, and a "host" candidate (the device's own LAN address)
 * is exactly what that needs. Reaching for a public STUN server would add a
 * dependency on an external service this app otherwise has none of, and it
 * would also pull in server-reflexive candidates that only bloat the
 * offer/answer blob without helping two devices that are already on the
 * same subnet find each other.
 */

const ICE_GATHERING_TIMEOUT_MS = 4000;
const DATA_CHANNEL_LABEL = "race";
const MAX_BLOB_LENGTH = 20000; // generous; a LAN-only, host-candidate-only offer is normally well under 2000 chars

function assertWebRtcSupported() {
  if (typeof RTCPeerConnection === "undefined") {
    throw new Error("webrtc_unsupported");
  }
}

function newPeerConnection() {
  assertWebRtcSupported();
  return new RTCPeerConnection({ iceServers: [] });
}

/** ICE gathering for host-only candidates is normally done in well under a
 *  second; the timeout is a safety net so a browser that never reaches
 *  "complete" (rather than one that just takes a while) cannot hang the
 *  whole flow - whatever candidates gathered by then are used as-is. */
function waitForIceGatheringComplete(pc) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      pc.removeEventListener("icegatheringstatechange", onChange);
      clearTimeout(timer);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === "complete") finish();
    };
    pc.addEventListener("icegatheringstatechange", onChange);
    const timer = setTimeout(finish, ICE_GATHERING_TIMEOUT_MS);
  });
}

/** Host side: open a peer connection, create the data channel, and produce
 *  a complete (post-ICE-gathering) offer. */
export async function createHostOffer() {
  const pc = newPeerConnection();
  const channel = pc.createDataChannel(DATA_CHANNEL_LABEL, { ordered: true });
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIceGatheringComplete(pc);
  return { pc, channel, description: pc.localDescription };
}

/** Guest side: given the host's offer, open a peer connection and produce a
 *  complete answer. The data channel the host created arrives asynchronously
 *  via the `datachannel` event - `channelPromise` resolves with it. */
export function createGuestAnswer(offerDescription) {
  const pc = newPeerConnection();
  const channelPromise = new Promise((resolve) => {
    pc.addEventListener("datachannel", (event) => resolve(event.channel), { once: true });
  });
  const description = (async () => {
    await pc.setRemoteDescription(offerDescription);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIceGatheringComplete(pc);
    return pc.localDescription;
  })();
  return { pc, channelPromise, description };
}

/** Host side, once the guest's answer blob has been pasted/scanned in. */
export async function applyGuestAnswer(pc, answerDescription) {
  await pc.setRemoteDescription(answerDescription);
}

// ---------------------------------------------------------------------------
// Signal blobs - the offer/answer, base64url-encoded so they are one
// copy-pasteable line of text and, where they fit, a QR code (qrcode.js).
// ---------------------------------------------------------------------------

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64url) {
  const padded = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const b64 = padded + "===".slice((padded.length + 3) % 4);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

const ROOM_CODE_RE = /^[A-Z0-9]{4,8}$/;

export function encodeSignalBlob({ type, code, settings, description }) {
  const payload = { v: 1, t: type, code, sdp: { type: description.type, sdp: description.sdp } };
  if (settings) payload.settings = settings;
  return toBase64Url(JSON.stringify(payload));
}

/**
 * Decode and range-check a pasted/scanned offer or answer blob. Every field
 * is treated as hostile input - a blob can be hand-edited, truncated by
 * whatever it was pasted through, or simply not a blob this app produced -
 * exactly the same posture the old challenge-link `decodeChallenge` took
 * (see CHANGELOG round 9), because this is the same kind of "arbitrary text
 * a player typed in" surface.
 * @returns {{ok: true, code: string, settings: object|null, description: RTCSessionDescriptionInit} | {ok: false, error: string}}
 */
export function decodeSignalBlob(text, expectedType) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return { ok: false, error: "empty" };
  if (trimmed.length > MAX_BLOB_LENGTH) return { ok: false, error: "too_long" };

  let obj;
  try {
    obj = JSON.parse(fromBase64Url(trimmed));
  } catch {
    return { ok: false, error: "malformed" };
  }
  if (!obj || typeof obj !== "object") return { ok: false, error: "malformed" };
  if (obj.v !== 1) return { ok: false, error: "version" };
  if (obj.t !== expectedType) return { ok: false, error: "wrong_type" };
  if (typeof obj.code !== "string" || !ROOM_CODE_RE.test(obj.code)) return { ok: false, error: "code" };

  const sdp = obj.sdp;
  if (!sdp || typeof sdp.sdp !== "string" || sdp.type !== expectedType) return { ok: false, error: "sdp" };
  if (sdp.sdp.length < 10 || sdp.sdp.length > MAX_BLOB_LENGTH || !sdp.sdp.startsWith("v=0")) {
    return { ok: false, error: "sdp" };
  }

  let settings = null;
  if (expectedType === "offer") {
    const raw = obj.settings && typeof obj.settings === "object" ? obj.settings : {};
    settings = {
      category: typeof raw.category === "string" ? raw.category : "bliksem",
      rounds: Number.isFinite(Number(raw.rounds)) ? Number(raw.rounds) : 10,
      level: Number.isFinite(Number(raw.level)) ? Number(raw.level) : 2,
    };
  }

  return { ok: true, code: obj.code, settings, description: { type: sdp.type, sdp: sdp.sdp } };
}

export const _internal = { toBase64Url, fromBase64Url, MAX_BLOB_LENGTH };
