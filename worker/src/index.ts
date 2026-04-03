/**
 * Worker entrypoint — routes HTTP requests to Durable Objects.
 *
 * POST /api/rooms       → Create a new game room, returns { roomCode }
 * GET  /api/ws?room=X&role=host|guest&name=Y → WebSocket upgrade to GameRoom DO
 */
import { GameRoom } from "./game-room"

export { GameRoom }

interface Env {
  GAME_ROOMS: DurableObjectNamespace<GameRoom>
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no ambiguous chars (0/O, 1/I)
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    // Create a new room
    if (url.pathname === "/api/rooms" && request.method === "POST") {
      const roomCode = generateRoomCode()
      return new Response(
        JSON.stringify({ roomCode }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    // WebSocket upgrade to game room
    if (url.pathname === "/api/ws") {
      const room = url.searchParams.get("room")
      const role = url.searchParams.get("role")
      const name = url.searchParams.get("name")

      if (!room || !role || !name) {
        return new Response("Missing room, role, or name parameter", { status: 400 })
      }

      // Route to the Durable Object for this room code
      const id = env.GAME_ROOMS.idFromName(room.toUpperCase())
      const stub = env.GAME_ROOMS.get(id)

      // Forward the request to the DO
      const doUrl = new URL(request.url)
      doUrl.pathname = "/ws"
      doUrl.searchParams.set("room", room.toUpperCase())

      return stub.fetch(new Request(doUrl.toString(), request))
    }

    return new Response("Not found", { status: 404, headers: corsHeaders })
  },
} satisfies ExportedHandler<Env>
