<template>
  <div class="actions grid grid-cols-2 gap-4 mt-6 max-w-md mx-auto">
    <button
      @click="$emit('roll-dice')"
      class="roll-button w-full p-4 text-lg font-bold text-white rounded-lg"
      :class="{
        'opacity-50 cursor-not-allowed': isRolling || !canRoll,
      }"
      :disabled="isRolling || !canRoll"
      :title="rollButtonTooltip"
    >
      <span class="flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {{ t("rollDice") }}
      </span>
    </button>
    <button
      @click="$emit('bank-points')"
      class="bank-button w-full p-4 text-lg font-bold text-white rounded-lg"
      :class="{
        'opacity-50 cursor-not-allowed': !canBank || isRolling,
        'qualification-needed': needsQualification,
      }"
      :disabled="!canBank || isRolling"
      :title="bankButtonTooltip"
    >
      <span class="flex items-center justify-center">
        {{ t("keepScore")
        }}<!-- {{ needsQualification ? t("needPoints", [qualificationScore]) : "" }} -->
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from "vue"
import { useI18n } from "../i18n"

const props = defineProps({
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

const needsQualification = !props.isQualified
</script>

<style scoped>
.roll-button {
  background-color: var(--color-primary);
  transition: all 0.3s ease;
}

.roll-button:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.bank-button {
  background-color: var(--color-accent);
  transition: all 0.3s ease;
}

.bank-button:hover:not(:disabled) {
  background-color: var(--color-accent-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.qualification-needed {
  position: relative;
  overflow: hidden;
}

.qualification-needed:before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background-color: var(--color-warning, #ffb627);
}
</style>
