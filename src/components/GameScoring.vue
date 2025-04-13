<template>
  <div class="text-center mb-6">
    <h2 class="text-xl font-bold">
      {{ t("scoring") }}
    </h2>
    <div class="grid grid-cols-2 gap-4 text-left max-w-md mx-auto mt-4">
      <div class="text-success p-3 rounded-lg scoring-card">
        <span class="font-medium">{{ t("bankedPoints") }}</span>
        <span class="ml-2 text-xl font-bold">{{ props.currentTurnScore }}</span>
      </div>
      <div class="p-3 rounded-lg scoring-card">
        <span class="font-medium">{{ t("rollScore") }}</span>
        <span class="ml-2 text-xl font-bold">{{
          props.isFirstRoll ? 0 : props.lastRollScore
        }}</span>
      </div>
      <div class="text-accent-secondary p-3 rounded-lg scoring-card">
        <span class="font-medium">{{ t("selected") }}</span>
        <span class="ml-2 text-xl font-bold">{{ props.potentialScore }}</span>
      </div>
      <div class="text-accent p-3 rounded-lg scoring-card">
        <span class="font-medium">{{ t("totalAvailable") }}</span>
        <span class="ml-2 text-xl font-bold">{{
          (props.currentTurnScore || 0) + (props.potentialScore || 0)
        }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from "vue"
import { useI18n } from "../i18n"

const props = defineProps({
  currentTurnScore: {
    type: Number,
    default: 0,
  },
  isFirstRoll: {
    type: Boolean,
    default: true,
  },
  lastRollScore: {
    type: Number,
    default: 0,
  },
  potentialScore: {
    type: Number,
    default: 0,
  },
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
