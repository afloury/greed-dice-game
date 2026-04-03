import { ref } from "vue"
import type { GameState } from "../types/game"
import type { WSMessage, GuestAction, ConnectionState } from "../types/multiplayer"

const log = (...args: unknown[]) => console.log("[multiplayer]", ...args)

// --- Shared singleton state ---
const connectionState = ref<ConnectionState>("disconnected")
const roomCode = ref<string | null>(null)
const role = ref<"host" | "guest" | null>(null)
const opponentName = ref<string | null>(null)
const error = ref<string | null>(null)

let pc: RTCPeerConnection | null = null
let dc: RTCDataChannel | null = null
let pollInterval: ReturnType<typeof setInterval> | null = null

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
}

// --- Callbacks ---
type Callback<T> = (data: T) => void
let onStateSyncCb: Callback<GameState> | null = null
let onGuestActionCb: Callback<GuestAction> | null = null
let onPlayerJoinedCb: Callback<string> | null = null
let onPlayerLeftCb: Callback<void> | null = null
let onPlayerReconnectedCb: Callback<void> | null = null
let onRoomJoinedCb: Callback<string> | null = null

function onStateSync(cb: Callback<GameState>) { onStateSyncCb = cb }
function onGuestAction(cb: Callback<GuestAction>) { onGuestActionCb = cb }
function onPlayerJoined(cb: Callback<string>) { onPlayerJoinedCb = cb }
function onPlayerLeft(cb: Callback<void>) { onPlayerLeftCb = cb }
function onPlayerReconnected(cb: Callback<void>) { onPlayerReconnectedCb = cb }
function onRoomJoined(cb: Callback<string>) { onRoomJoinedCb = cb }

// --- Message handling ---
function handleMessage(msg: WSMessage) {
  switch (msg.type) {
    case "room:created":
      roomCode.value = msg.roomCode
      break
    case "room:joined":
      roomCode.value = msg.roomCode
      opponentName.value = msg.hostName
      onRoomJoinedCb?.(msg.hostName)
      break
    case "room:player-joined":
      opponentName.value = msg.guestName
      onPlayerJoinedCb?.(msg.guestName)
      break
    case "room:player-left":
      onPlayerLeftCb?.()
      break
    case "room:player-reconnected":
      onPlayerReconnectedCb?.()
      break
    case "room:error":
      error.value = msg.message
      connectionState.value = "disconnected"
      break
    case "room:closed":
      error.value = "Room closed"
      disconnect()
      break
    case "game:state-sync":
      onStateSyncCb?.(msg.state)
      break
    case "game:action":
      onGuestActionCb?.(msg.action)
      break
  }
}

// --- Message queue for when DC isn't open yet ---
let pendingMessages: string[] = []

function flushPending() {
  if (dc?.readyState === "open" && pendingMessages.length > 0) {
    log(`flushing ${pendingMessages.length} pending messages`)
    for (const msg of pendingMessages) {
      dc.send(msg)
    }
    pendingMessages = []
  }
}

// --- DataChannel wiring ---
function wireDataChannel(channel: RTCDataChannel) {
  dc = channel
  log("wireDataChannel called, current readyState:", channel.readyState)

  channel.onopen = () => {
    log("DataChannel OPEN")
    connectionState.value = "connected"
    flushPending()
  }

  channel.onmessage = (event) => {
    let msg: WSMessage
    try {
      msg = JSON.parse(event.data)
    } catch {
      return
    }
    handleMessage(msg)
  }

  channel.onclose = () => {
    log("DataChannel CLOSED")
    if (connectionState.value === "connected") {
      onPlayerLeftCb?.()
    }
    connectionState.value = "disconnected"
  }

  channel.onerror = (e) => {
    log("DataChannel ERROR", e)
  }
}

// --- Wait for ICE gathering to complete so SDP contains all candidates ---
function waitForIceComplete(peerConnection: RTCPeerConnection): Promise<void> {
  return new Promise((resolve) => {
    if (peerConnection.iceGatheringState === "complete") {
      log("ICE gathering already complete")
      resolve()
      return
    }
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        log("ICE candidate:", event.candidate.candidate.substring(0, 60))
      } else {
        log("ICE gathering complete (null candidate)")
        resolve()
      }
    }
    setTimeout(() => {
      log("ICE gathering timeout (10s), state:", peerConnection.iceGatheringState)
      resolve()
    }, 10000)
  })
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

function monitorConnection(peerConnection: RTCPeerConnection) {
  peerConnection.oniceconnectionstatechange = () => {
    log("ICE connection state:", peerConnection.iceConnectionState)
  }
  peerConnection.onconnectionstatechange = () => {
    log("Connection state:", peerConnection.connectionState)
  }
  peerConnection.onsignalingstatechange = () => {
    log("Signaling state:", peerConnection.signalingState)
  }
}

// --- Public actions ---
async function createRoom(playerName: string): Promise<string> {
  let res: Response
  try {
    res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostName: playerName }),
    })
  } catch (e) {
    error.value = "Cannot reach game server."
    connectionState.value = "disconnected"
    throw e
  }

  if (!res.ok) {
    error.value = `Server error: ${res.status}`
    connectionState.value = "disconnected"
    throw new Error(error.value)
  }

  const data = await res.json() as { roomCode: string }
  const code = data.roomCode
  log("Room created:", code)

  role.value = "host"
  roomCode.value = code
  connectionState.value = "connecting"
  error.value = null

  // Create RTCPeerConnection and DataChannel
  pc = new RTCPeerConnection(RTC_CONFIG)
  monitorConnection(pc)
  dc = pc.createDataChannel("game", { ordered: true })
  wireDataChannel(dc)

  // Generate offer, wait for ICE gathering, use complete SDP
  log("Creating offer...")
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  log("Waiting for ICE gathering...")
  await waitForIceComplete(pc)

  const completeOffer = pc.localDescription!
  log("Offer SDP length:", completeOffer.sdp?.length, "has candidates:", completeOffer.sdp?.includes("a=candidate"))

  // Post complete offer to signaling server
  await fetch(`/api/signal/${code}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hostOffer: completeOffer }),
  })
  log("Offer posted to signaling server")

  // Show waiting screen
  handleMessage({ type: "room:created", roomCode: code })
  connectionState.value = "connected"

  // Poll for guest answer
  pollInterval = setInterval(async () => {
    try {
      const pollRes = await fetch(`/api/signal/${code}`)
      if (!pollRes.ok) return
      const room = await pollRes.json() as {
        guestAnswer: RTCSessionDescriptionInit | null
        guestName: string | null
      }

      if (room.guestAnswer && pc) {
        stopPolling()
        log("Guest answer received, setting remote description...")

        await pc.setRemoteDescription(room.guestAnswer)
        log("Remote description set, connection state:", pc.connectionState, "ice:", pc.iceConnectionState)

        // Navigate host to game immediately
        opponentName.value = room.guestName || "Guest"
        handleMessage({ type: "room:player-joined", guestName: room.guestName || "Guest" })
      }
    } catch (e) {
      log("Poll error:", e)
    }
  }, 2000)

  return code
}

async function joinRoom(code: string, playerName: string): Promise<void> {
  role.value = "guest"
  roomCode.value = code.toUpperCase()
  connectionState.value = "connecting"
  error.value = null

  const upperCode = code.toUpperCase()
  log("Joining room:", upperCode)

  // Get host offer from signaling server
  let signalRes: Response
  try {
    signalRes = await fetch(`/api/signal/${upperCode}`)
  } catch (e) {
    error.value = "Cannot reach game server."
    connectionState.value = "disconnected"
    throw e
  }

  if (!signalRes.ok) {
    error.value = "Room not found"
    connectionState.value = "disconnected"
    throw new Error(error.value)
  }

  const room = await signalRes.json() as {
    hostName: string
    hostOffer: RTCSessionDescriptionInit | null
  }

  if (!room.hostOffer) {
    error.value = "Host hasn't finished setting up. Try again."
    connectionState.value = "disconnected"
    throw new Error(error.value)
  }

  log("Host offer received, SDP length:", (room.hostOffer as any).sdp?.length)

  // Create RTCPeerConnection
  pc = new RTCPeerConnection(RTC_CONFIG)
  monitorConnection(pc)

  // Listen for data channel from host
  pc.ondatachannel = (event) => {
    log("ondatachannel fired!")
    wireDataChannel(event.channel)
  }

  // Set complete host offer
  log("Setting remote description (host offer)...")
  await pc.setRemoteDescription(room.hostOffer)
  log("Remote description set, creating answer...")

  // Create answer, wait for ICE, use complete SDP
  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)
  log("Waiting for ICE gathering...")
  await waitForIceComplete(pc)

  const completeAnswer = pc.localDescription!
  log("Answer SDP length:", completeAnswer.sdp?.length, "has candidates:", completeAnswer.sdp?.includes("a=candidate"))

  // Post complete answer to signaling server
  await fetch(`/api/signal/${upperCode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      guestAnswer: completeAnswer,
      guestName: playerName,
    }),
  })
  log("Answer posted to signaling server")

  // Navigate guest to game — we have the host name from signaling
  opponentName.value = room.hostName
  handleMessage({ type: "room:joined", roomCode: upperCode, hostName: room.hostName })
}

function sendGameState(state: GameState) {
  if (role.value !== "host") return
  const msg = JSON.stringify({ type: "game:state-sync", state })
  if (dc?.readyState === "open") {
    dc.send(msg)
  } else {
    pendingMessages = pendingMessages.filter(m => !m.includes('"game:state-sync"'))
    pendingMessages.push(msg)
  }
}

function sendAction(action: GuestAction) {
  if (role.value !== "guest") return
  const msg = JSON.stringify({ type: "game:action", action })
  if (dc?.readyState === "open") {
    dc.send(msg)
  } else {
    pendingMessages.push(msg)
  }
}

function disconnect() {
  stopPolling()
  pendingMessages = []
  if (dc) {
    try { dc.close() } catch {}
    dc = null
  }
  if (pc) {
    try { pc.close() } catch {}
    pc = null
  }
  connectionState.value = "disconnected"
  roomCode.value = null
  role.value = null
  opponentName.value = null
}

export function useMultiplayer() {
  return {
    connectionState,
    roomCode,
    role,
    opponentName,
    error,
    createRoom,
    joinRoom,
    sendGameState,
    sendAction,
    disconnect,
    onStateSync,
    onGuestAction,
    onPlayerJoined,
    onPlayerLeft,
    onPlayerReconnected,
    onRoomJoined,
  }
}
