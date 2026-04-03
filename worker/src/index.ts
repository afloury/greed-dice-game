/**
 * Worker entrypoint — signaling server for WebRTC peer-to-peer.
 *
 * POST /api/rooms              → Create room in KV, returns { roomCode }
 * GET  /api/signal/:room       → Read signaling data (SDP offer/answer)
 * POST /api/signal/:room       → Write signaling data (host offer or guest answer)
 */

interface Env {
  SIGNAL_KV: KVNamespace
}

interface RoomSignal {
  hostName: string
  hostOffer: unknown | null
  guestName: string | null
  guestAnswer: unknown | null
  createdAt: number
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
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

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    // Create a new room
    if (url.pathname === "/api/rooms" && request.method === "POST") {
      const body = await request.json().catch(() => ({})) as { hostName?: string }
      const roomCode = generateRoomCode()
      const room: RoomSignal = {
        hostName: body.hostName || "Host",
        hostOffer: null,
        guestName: null,
        guestAnswer: null,
        createdAt: Date.now(),
      }
      await env.SIGNAL_KV.put(`room:${roomCode}`, JSON.stringify(room), { expirationTtl: 300 })
      return json({ roomCode })
    }

    // Signal endpoint
    const signalMatch = url.pathname.match(/^\/api\/signal\/([A-Z0-9]{4,6})$/i)
    if (signalMatch) {
      const roomCode = signalMatch[1].toUpperCase()
      const key = `room:${roomCode}`

      if (request.method === "GET") {
        const data = await env.SIGNAL_KV.get(key)
        if (!data) return json({ error: "Room not found" }, 404)
        return json(JSON.parse(data))
      }

      if (request.method === "POST") {
        const existing = await env.SIGNAL_KV.get(key)
        if (!existing) return json({ error: "Room not found" }, 404)

        const room: RoomSignal = JSON.parse(existing)
        const body = await request.json() as Partial<RoomSignal>

        if (body.hostOffer) {
          room.hostOffer = body.hostOffer
        }

        if (body.guestAnswer) {
          room.guestAnswer = body.guestAnswer
          room.guestName = body.guestName || "Guest"
        }

        await env.SIGNAL_KV.put(key, JSON.stringify(room), { expirationTtl: 300 })
        return json({ ok: true })
      }
    }

    return new Response("Not found", { status: 404, headers: corsHeaders })
  },
} satisfies ExportedHandler<Env>
