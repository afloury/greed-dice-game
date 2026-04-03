import { createRouter, createWebHistory } from "vue-router"
import GameMenu from "./pages/GameMenu.vue"
import GameBoard from "./pages/GameBoard.vue"
import MultiplayerLobby from "./pages/MultiplayerLobby.vue"
import WebRTCPlayground from "./pages/Playground.vue"

const routes = [
  { path: "/", component: GameMenu },
  { path: "/game", component: GameBoard },
  { path: "/game/:code", component: GameBoard },
  { path: "/lobby", component: MultiplayerLobby },
  { path: "/playground", component: WebRTCPlayground },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
