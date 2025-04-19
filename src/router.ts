import { createRouter, createWebHistory } from "vue-router"
import GameMenu from "./pages/GameMenu.vue"
import GameBoard from "./pages/GameBoard.vue"
import WebRTCPlayground from "./pages/Playground.vue"

const routes = [
  { path: "/", component: GameMenu },
  { path: "/game/:code?", component: GameBoard },
  { path: "/playground", component: WebRTCPlayground },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
