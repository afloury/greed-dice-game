import { createApp } from "vue"
import { createPinia } from "pinia"
import "./style.css"
import App from "./App.vue"
import router from "./router"
import { VueFire } from "vuefire"
import { firebaseApp } from "./utils/firebase.ts"

const app = createApp(App)
const pinia = createPinia()
app.use(VueFire, {
  // imported above but could also just be created here
  firebaseApp,
  modules: [
    // we will see other modules later on
    // VueFireAuth(),
  ],
})

app.use(pinia)
app.use(router)
app.mount("#app")
