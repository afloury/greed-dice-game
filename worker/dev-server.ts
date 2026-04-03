/**
 * Local Node.js dev server that replicates the Cloudflare Worker + Durable Object
 * behavior for development in environments where workerd doesn't run (e.g. Docker on ARM).
 *
 * Usage: npx tsx worker/dev-server.ts
 */

import { createServer, type IncomingMessage } from "node:http"
import { WebSocketServer, WebSocket } from "ws"

const PORT = 8787

// --- Room state (equivalent to GameRoom Durable Object) ---

interface Room {
  hostName: string | null
  guestName: string | null
  hostWs: WebSocket | null
  guestWs: WebSocket | null
  closeTimeout: ReturnType<typeof setTimeout> | null
}

const rooms = new Map<string, Room>()

function getOrCreateRoom(code: string): Room {
  if (!rooms.has(code)) {
    rooms.set(code, { hostName: null, guestName: null, hostWs: null, guestWs: null, closeTimeout: null })
  }
  return rooms.get(code)!
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// --- HTTP server ---

const server = createServer((req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.url === "/api/rooms" && req.method === "POST") {
    const roomCode = generateRoomCode()
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ roomCode }))
    return
  }

  res.writeHead(404)
  res.end("Not found")
})

// --- WebSocket server ---

const wss = new WebSocketServer({ noServer: true })

server.on("upgrade", (req: IncomingMessage, socket, head) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`)

  if (url.pathname !== "/api/ws") {
    socket.destroy()
    return
  }

  const room = url.searchParams.get("room")?.toUpperCase()
  const role = url.searchParams.get("role")
  const name = url.searchParams.get("name") || "Player"

  if (!room || !role || !name || (role !== "host" && role !== "guest")) {
    socket.destroy()
    return
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    handleConnection(ws, room, role as "host" | "guest", name)
  })
})

function handleConnection(ws: WebSocket, roomCode: string, role: "host" | "guest", name: string) {
  const room = getOrCreateRoom(roomCode)

  // Close old socket for reconnection
  if (role === "host" && room.hostWs) {
    try { room.hostWs.close(1000, "Replaced by reconnection") } catch {}
  } else if (role === "guest" && room.guestWs) {
    try { room.guestWs.close(1000, "Replaced by reconnection") } catch {}
  }

  // Cancel pending close
  if (room.closeTimeout) {
    clearTimeout(room.closeTimeout)
    room.closeTimeout = null
  }

  if (role === "host") {
    room.hostWs = ws
    room.hostName = name
    ws.send(JSON.stringify({ type: "room:created", roomCode }))

    // If guest already connected, notify both
    if (room.guestWs && room.guestWs.readyState === WebSocket.OPEN && room.guestName) {
      ws.send(JSON.stringify({ type: "room:player-joined", guestName: room.guestName }))
      room.guestWs.send(JSON.stringify({ type: "room:player-reconnected", playerId: "host" }))
    }
  } else {
    room.guestWs = ws
    room.guestName = name
    ws.send(JSON.stringify({ type: "room:joined", roomCode, hostName: room.hostName || "Host" }))

    // Notify host
    if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
      room.hostWs.send(JSON.stringify({ type: "room:player-joined", guestName: name }))
    }
  }

  // Handle messages
  ws.on("message", (data) => {
    const message = data.toString()
    let parsed: { type: string }
    try {
      parsed = JSON.parse(message)
    } catch {
      return
    }

    if (parsed.type === "ping") {
      ws.send(JSON.stringify({ type: "pong" }))
      return
    }

    // Relay messages
    if (role === "host" && parsed.type === "game:state-sync") {
      if (room.guestWs?.readyState === WebSocket.OPEN) {
        room.guestWs.send(message)
      }
    } else if (role === "guest" && parsed.type === "game:action") {
      if (room.hostWs?.readyState === WebSocket.OPEN) {
        room.hostWs.send(message)
      }
    }
  })

  // Handle disconnect
  ws.on("close", () => handleDisconnect(room, role))
  ws.on("error", () => handleDisconnect(room, role))
}

function handleDisconnect(room: Room, role: "host" | "guest") {
  const otherWs = role === "host" ? room.guestWs : room.hostWs
  if (otherWs?.readyState === WebSocket.OPEN) {
    otherWs.send(JSON.stringify({ type: "room:player-left", playerId: role }))
  }

  if (role === "host") room.hostWs = null
  else room.guestWs = null

  scheduleClose(room)
}

function scheduleClose(room: Room) {
  if (room.closeTimeout) clearTimeout(room.closeTimeout)

  room.closeTimeout = setTimeout(() => {
    for (const ws of [room.hostWs, room.guestWs]) {
      if (ws?.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: "room:closed" }))
          ws.close(1000, "Room closed due to inactivity")
        } catch {}
      }
    }
    // Clean up room from map
    for (const [code, r] of rooms) {
      if (r === room) { rooms.delete(code); break }
    }
  }, 5 * 60 * 1000)
}

server.listen(PORT, () => {
  console.log(`Game dev server ready on http://localhost:${PORT}`)
})
