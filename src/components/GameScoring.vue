<template>
  <div class="text-center mb-6">
    <h2 class="text-xl font-bold">
      {{ t("scoring") }}
    </h2>
    <div class="grid grid-cols-2 gap-4 text-left max-w-md mx-auto mt-4">
      <div class="text-success p-3 rounded-lg scoring-card">
        <span class="font-medium">{{ t("bankedPoints") }}</span>
        <span class="ml-2 text-xl font-bold">{{ currentTurnScore }}</span>
      </div>
      <div class="p-3 rounded-lg scoring-card">
        <span class="font-medium">{{ t("rollScore") }}</span>
        <span class="ml-2 text-xl font-bold">{{
          isFirstRoll ? 0 : lastRollScore
        }}</span>
      </div>
      <div class="text-accent-secondary p-3 rounded-lg scoring-card">
        <span class="font-medium">{{ t("selected") }}</span>
        <span class="ml-2 text-xl font-bold">{{ potentialScore }}</span>
      </div>
      <div class="text-accent p-3 rounded-lg scoring-card">
        <span class="font-medium">{{ t("totalAvailable") }}</span>
        <span class="ml-2 text-xl font-bold">{{
          currentTurnScore + potentialScore
        }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from "vue"
import { useI18n } from "../i18n"

const props = defineProps({
  currentTurnScore: Number,
  isFirstRoll: Boolean,
  lastRollScore: Number,
  potentialScore: Number,
})

const { t } = useI18n()
</script>

<style scoped>
.scoring-card {
  background-color: rgba(0, 0, 0, 0.15);
  border: 1px solid var(--color-border);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
}
</style>
