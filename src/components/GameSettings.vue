<template>
  <Teleport to="body">
    <div
      v-if="showSettings"
      class="settings-modal-overlay"
      @click="closeSettings"
    >
      <div class="game-panel settings-modal" @click.stop>
        <div class="settings-modal-header">
          <h2>{{ t("settings") }}</h2>
          <button @click="closeSettings">×</button>
        </div>
        <div class="p-6">
          <div class="mb-2">
            <h3 class="text-lg font-medium mb-4">
              {{ t("display") }}
            </h3>
            <div class="flex items-center justify-between mb-4">
              <span>{{ t("darkMode") }}</span>
              <button
                @click="toggleDarkMode"
                class="p-2 rounded-lg font-semibold transition-all duration-200 game-icon-button"
              >
                {{ isDark ? "☀️" : "🌙" }}
              </button>
            </div>
            <div class="flex items-center justify-between mb-6">
              <span>{{ t("language") }}</span>
              <button
                @click="toggleLanguage"
                class="p-2 rounded-lg font-semibold transition-all duration-200 game-icon-button"
              >
                {{ isEnglish ? "🇫🇷" : "🇬🇧" }}
              </button>
            </div>

            <h3 class="text-lg font-medium mb-4">
              {{ t("sound") }}
            </h3>
            <label class="block mb-2">
              {{ t("soundEffectsVolume") }}
            </label>
            <div class="flex items-center gap-3">
              <span>🔈</span>
              <input
                type="range"
                min="0"
                max="100"
                :value="soundVolume"
                class="volume-slider"
                @input="
                  updateSoundVolume(($event.target as HTMLInputElement).value)
                "
              />
              <span>🔊</span>
            </div>
            <div class="volume-value">{{ soundVolume }}%</div>

            <div class="text-center mt-6">
              <BaseButton
                @click="testSound"
                variant="secondary"
                :label="t('testSound')"
              />
            </div>
          </div>
        </div>
        <div class="settings-modal-footer">
          <BaseButton
            @click="closeSettings"
            variant="secondary"
            :label="t('close')"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { defineEmits } from "vue"
import { useI18n } from "../i18n"
import { useDark, useToggle } from "@vueuse/core"
import BaseButton from "./BaseButton.vue"

defineProps({
  showSettings: Boolean,
  isEnglish: Boolean,
  soundVolume: {
    type: Number,
    default: 50,
  },
})

const isDark = useDark()
const toggleDark = useToggle(isDark)
const emit = defineEmits([
  "update:showSettings",
  "toggleLanguage",
  "update:soundVolume",
  "testSound",
])

const { t } = useI18n()

const closeSettings = () => {
  emit("update:showSettings", false)
  document.body.classList.remove("modal-open")
}

const toggleDarkMode = () => {
  toggleDark()
}

const toggleLanguage = () => {
  emit("toggleLanguage")
}

const updateSoundVolume = (value: string | number) => {
  emit(
    "update:soundVolume",
    typeof value === "string" ? parseInt(value, 10) : value
  )
}

const testSound = () => {
  emit("testSound")
}
</script>

<style scoped>
.settings-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.settings-modal {
  width: 90%;
  max-width: 450px;
  overflow: hidden;
}

.settings-modal-header {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings-modal-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.settings-modal-header button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0 0.5rem;
  line-height: 1;
}

.volume-slider {
  width: 100%;
  height: 8px;
  background-color: var(--color-border);
  border-radius: 4px;
  appearance: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background-color: var(--color-accent);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.volume-value {
  text-align: center;
  margin-top: 0.5rem;
  font-weight: 500;
}

.settings-modal-footer {
  padding: 1rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
}

/* Add this to body when modal is open to prevent scrolling */
:global(.modal-open) {
  overflow: hidden;
}
</style>
