import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  define: {
    // This ensures import.meta.env.DEV is properly defined at build time
    // Will be true during development and false in production build
    // "import.meta.env.DEV": JSON.stringify(
    //   process.env.NODE_ENV === "development"
    // ),
  },
})
