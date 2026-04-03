/**
 * GameRoom Durable Object — WebSocket relay for multiplayer games.
 *
 * Holds up to 2 connections (host + guest), forwards messages between them.
 * Uses the Hibernation API so the DO sleeps between messages.
 * No game logic — the host client is authoritative.
 */

interface Env {}

export class GameRoom extends CloudflareWorkersModule.DurableObject<Env> {
  private hostName: string | null = null
  private guestName: string | null = null
  private closeTimeout: ReturnType<typeof setTimeout> | null = null

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === "/ws") {
      return this.handleWebSocket(url)
    }

    return new Response("Not found", { status: 404 })
  }

  private handleWebSocket(url: URL): Response {
    const role = url.searchParams.get("role")
    const name = url.searchParams.get("name") || "Player"

    if (role !== "host" && role !== "guest") {
      return new Response("Invalid role", { status: 400 })
    }

    // Check if role is already taken — close old socket for reconnection
    const existingConnections = this.ctx.getWebSockets(role)
    for (const old of existingConnections) {
      try { old.close(1000, "Replaced by reconnection") } catch {}
    }

    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]

    this.ctx.acceptWebSocket(server, [role])

    if (role === "host") {
      this.hostName = name
      server.send(JSON.stringify({ type: "room:created", roomCode: url.searchParams.get("room") || "" }))

      // If guest is already connected, notify both
      const guestSockets = this.ctx.getWebSockets("guest")
      if (guestSockets.length > 0 && this.guestName) {
        server.send(JSON.stringify({ type: "room:player-joined", guestName: this.guestName }))
        for (const gs of guestSockets) {
          gs.send(JSON.stringify({ type: "room:player-reconnected", playerId: "host" }))
        }
      }
    } else {
      this.guestName = name
      server.send(JSON.stringify({
        type: "room:joined",
        roomCode: url.searchParams.get("room") || "",
        hostName: this.hostName || "Host",
      }))

      // Notify host that guest joined
      const hostSockets = this.ctx.getWebSockets("host")
      for (const hs of hostSockets) {
        hs.send(JSON.stringify({ type: "room:player-joined", guestName: name }))
      }
    }

    // Cancel any pending close timeout
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout)
      this.closeTimeout = null
    }

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string") return

    let parsed: { type: string }
    try {
      parsed = JSON.parse(message)
    } catch {
      return
    }

    // Handle heartbeat
    if (parsed.type === "ping") {
      ws.send(JSON.stringify({ type: "pong" }))
      return
    }

    // Determine sender role from tags
    const tags = this.ctx.getTags(ws)
    const senderRole = tags.includes("host") ? "host" : tags.includes("guest") ? "guest" : null
    if (!senderRole) return

    // Relay messages to the other player
    if (senderRole === "host" && parsed.type === "game:state-sync") {
      for (const gs of this.ctx.getWebSockets("guest")) {
        gs.send(message)
      }
    } else if (senderRole === "guest" && parsed.type === "game:action") {
      for (const hs of this.ctx.getWebSockets("host")) {
        hs.send(message)
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    this.handleDisconnect(ws)
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    this.handleDisconnect(ws)
  }

  private handleDisconnect(ws: WebSocket) {
    const tags = this.ctx.getTags(ws)
    const role = tags.includes("host") ? "host" : tags.includes("guest") ? "guest" : null
    if (!role) return

    // Notify the other player
    const otherTag = role === "host" ? "guest" : "host"
    for (const os of this.ctx.getWebSockets(otherTag)) {
      os.send(JSON.stringify({ type: "room:player-left", playerId: role }))
    }

    this.scheduleClose()
  }

  private scheduleClose() {
    if (this.closeTimeout) clearTimeout(this.closeTimeout)

    this.closeTimeout = setTimeout(() => {
      const allSockets = [...this.ctx.getWebSockets("host"), ...this.ctx.getWebSockets("guest")]
      for (const ws of allSockets) {
        try {
          ws.send(JSON.stringify({ type: "room:closed" }))
          ws.close(1000, "Room closed due to inactivity")
        } catch {}
      }
    }, 5 * 60 * 1000) // 5 minutes
  }
}
