/**
 * Local Node.js dev server — signaling server for WebRTC peer-to-peer.
 * Uses an in-memory Map instead of KV.
 *
 * Usage: npx tsx worker/dev-server.ts
 */

import { createServer, type IncomingMessage } from "node:http"

const PORT = 8787

interface RoomSignal {
  hostName: string
  hostOffer: unknown | null
  guestName: string | null
  guestAnswer: unknown | null
  createdAt: number
}

const rooms = new Map<string, RoomSignal>()

// Auto-expire rooms after 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, room] of rooms) {
    if (now - room.createdAt > 5 * 60 * 1000) {
      rooms.delete(key)
    }
  }
}, 30_000)

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = ""
    req.on("data", (chunk: Buffer) => { data += chunk.toString() })
    req.on("end", () => resolve(data))
  })
}

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url || "", `http://${req.headers.host}`)

  // Create room
  if (url.pathname === "/api/rooms" && req.method === "POST") {
    const body = await readBody(req)
    const parsed = body ? JSON.parse(body) : {}
    const roomCode = generateRoomCode()
    rooms.set(roomCode, {
      hostName: parsed.hostName || "Host",
      hostOffer: null,
      guestName: null,
      guestAnswer: null,
      createdAt: Date.now(),
    })
    console.log(`[room] Created ${roomCode} by ${parsed.hostName}`)
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ roomCode }))
    return
  }

  // Signal endpoint
  const signalMatch = url.pathname.match(/^\/api\/signal\/([A-Z0-9]{4,6})$/i)
  if (signalMatch) {
    const roomCode = signalMatch[1].toUpperCase()
    const room = rooms.get(roomCode)

    if (!room) {
      res.writeHead(404, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Room not found" }))
      return
    }

    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(room))
      return
    }

    if (req.method === "POST") {
      const body = JSON.parse(await readBody(req))

      if (body.hostOffer) {
        room.hostOffer = body.hostOffer
        console.log(`[signal] ${roomCode}: host offer posted`)
      }

      if (body.guestAnswer) {
        room.guestAnswer = body.guestAnswer
        room.guestName = body.guestName || "Guest"
        console.log(`[signal] ${roomCode}: guest answer posted by ${room.guestName}`)
      }

      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ ok: true }))
      return
    }
  }

  res.writeHead(404)
  res.end("Not found")
})

server.listen(PORT, () => {
  console.log(`Signaling dev server ready on http://localhost:${PORT}`)
})
