import type { GameState } from "./game"

// --- Guest actions sent to host via relay ---
export type GuestAction =
  | { kind: "roll" }
  | { kind: "select-die"; index: number }
  | { kind: "deselect-die"; index: number }
  | { kind: "bank" }

// --- WebSocket messages ---
export type WSMessage =
  // Room lifecycle
  | { type: "room:created"; roomCode: string }
  | { type: "room:joined"; roomCode: string; hostName: string }
  | { type: "room:player-joined"; guestName: string }
  | { type: "room:player-left"; playerId: "host" | "guest" }
  | { type: "room:player-reconnected"; playerId: "host" | "guest" }
  | { type: "room:error"; message: string }
  | { type: "room:closed" }
  // Game state sync (host → guest)
  | { type: "game:state-sync"; state: GameState }
  // Guest actions (guest → host)
  | { type: "game:action"; action: GuestAction }
  // Heartbeat
  | { type: "ping" }
  | { type: "pong" }

export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting"
