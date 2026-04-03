import { ref } from "vue"
import type { GameState } from "../types/game"
import type { WSMessage, GuestAction, ConnectionState } from "../types/multiplayer"

export function useMultiplayer() {
  const connectionState = ref<ConnectionState>("disconnected")
  const roomCode = ref<string | null>(null)
  const role = ref<"host" | "guest" | null>(null)
  const opponentName = ref<string | null>(null)
  const error = ref<string | null>(null)

  let ws: WebSocket | null = null
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null
  let reconnectAttempts = 0
  let reconnectParams: { code: string; playerRole: "host" | "guest"; name: string } | null = null

  // --- Callbacks ---
  type Callback<T> = (data: T) => void
  let onStateSyncCb: Callback<GameState> | null = null
  let onGuestActionCb: Callback<GuestAction> | null = null
  let onPlayerJoinedCb: Callback<string> | null = null
  let onPlayerLeftCb: Callback<void> | null = null
  let onPlayerReconnectedCb: Callback<void> | null = null

  function onStateSync(cb: Callback<GameState>) { onStateSyncCb = cb }
  function onGuestAction(cb: Callback<GuestAction>) { onGuestActionCb = cb }
  function onPlayerJoined(cb: Callback<string>) { onPlayerJoinedCb = cb }
  function onPlayerLeft(cb: Callback<void>) { onPlayerLeftCb = cb }
  function onPlayerReconnected(cb: Callback<void>) { onPlayerReconnectedCb = cb }

  // --- WebSocket connection ---
  function connectWebSocket(code: string, playerRole: "host" | "guest", name: string) {
    reconnectParams = { code, playerRole, name }
    connectionState.value = reconnectAttempts > 0 ? "reconnecting" : "connecting"
    error.value = null

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/api/ws?room=${code}&role=${playerRole}&name=${encodeURIComponent(name)}`

    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      connectionState.value = "connected"
      reconnectAttempts = 0
      startHeartbeat()
    }

    ws.onmessage = (event) => {
      let msg: WSMessage
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }
      handleMessage(msg)
    }

    ws.onclose = () => {
      stopHeartbeat()
      if (connectionState.value === "connected") {
        // Unexpected close — try to reconnect
        attemptReconnect()
      } else {
        connectionState.value = "disconnected"
      }
    }

    ws.onerror = () => {
      // onclose will fire after this
    }
  }

  function handleMessage(msg: WSMessage) {
    switch (msg.type) {
      case "room:created":
        roomCode.value = msg.roomCode
        break
      case "room:joined":
        roomCode.value = msg.roomCode
        opponentName.value = msg.hostName
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
      case "pong":
        // Heartbeat acknowledged
        break
    }
  }

  // --- Heartbeat ---
  function startHeartbeat() {
    stopHeartbeat()
    heartbeatInterval = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }))
      }
    }, 15000)
  }

  function stopHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
  }

  // --- Reconnection ---
  function attemptReconnect() {
    if (!reconnectParams || reconnectAttempts >= 3) {
      connectionState.value = "disconnected"
      error.value = "Unable to reconnect"
      return
    }

    reconnectAttempts++
    const delay = Math.pow(2, reconnectAttempts - 1) * 1000 // 1s, 2s, 4s
    connectionState.value = "reconnecting"

    setTimeout(() => {
      if (reconnectParams && connectionState.value === "reconnecting") {
        connectWebSocket(reconnectParams.code, reconnectParams.playerRole, reconnectParams.name)
      }
    }, delay)
  }

  // --- Public actions ---
  async function createRoom(playerName: string): Promise<string> {
    const res = await fetch("/api/rooms", { method: "POST" })
    const data = await res.json() as { roomCode: string }
    const code = data.roomCode

    role.value = "host"
    roomCode.value = code
    connectWebSocket(code, "host", playerName)

    return code
  }

  async function joinRoom(code: string, playerName: string): Promise<void> {
    role.value = "guest"
    roomCode.value = code.toUpperCase()
    connectWebSocket(code.toUpperCase(), "guest", playerName)
  }

  function sendGameState(state: GameState) {
    if (ws?.readyState === WebSocket.OPEN && role.value === "host") {
      ws.send(JSON.stringify({ type: "game:state-sync", state }))
    }
  }

  function sendAction(action: GuestAction) {
    if (ws?.readyState === WebSocket.OPEN && role.value === "guest") {
      ws.send(JSON.stringify({ type: "game:action", action }))
    }
  }

  function disconnect() {
    stopHeartbeat()
    reconnectParams = null
    reconnectAttempts = 0
    if (ws) {
      ws.onclose = null // prevent reconnect attempt
      ws.close()
      ws = null
    }
    connectionState.value = "disconnected"
    roomCode.value = null
    role.value = null
    opponentName.value = null
  }

  return {
    // State
    connectionState,
    roomCode,
    role,
    opponentName,
    error,

    // Actions
    createRoom,
    joinRoom,
    sendGameState,
    sendAction,
    disconnect,

    // Event registration
    onStateSync,
    onGuestAction,
    onPlayerJoined,
    onPlayerLeft,
    onPlayerReconnected,
  }
}
