<template>
  <div class="actions grid grid-cols-2 gap-4 mt-6 max-w-md mx-auto">
    <BaseButton
      @click="$emit('roll-dice')"
      variant="secondary"
      :disabled="isRolling || !canRoll"
      :tooltip="rollButtonTooltip"
    >
      <RollIcon />
      {{ t("rollDice") }}
    </BaseButton>
    <BaseButton
      @click="$emit('bank-points')"
      variant="primary"
      :disabled="!canBank || isRolling"
      :label="t('keepScore')"
      :tooltip="bankButtonTooltip"
    >
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import { defineEmits } from "vue"
import { useI18n } from "../i18n"
import BaseButton from "./BaseButton.vue"
import RollIcon from "./icons/RollIcon.vue"

defineProps({
  isRolling: Boolean,
  canRoll: Boolean,
  isFirstRoll: Boolean,
  canBank: Boolean,
  currentTurnScore: Number,
  potentialScore: Number,
  rollButtonTooltip: String,
  bankButtonTooltip: String,
  isQualified: {
    type: Boolean,
    default: true,
  },
  qualificationScore: {
    type: Number,
    default: 1000,
  },
})

defineEmits(["roll-dice", "bank-points"])

const { t } = useI18n()
</script>

<style scoped></style>
