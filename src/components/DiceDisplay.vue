<template>
  <div class="dice-container">
    <div class="dice-grid">
      <div
        v-for="(die, index) in dice"
        :key="index"
        @click="$emit('toggle-die-selection', index)"
        class="die-container"
        :class="{
          selected: die.selected && !die.locked,
          locked: die.locked,
          shaking: isRolling && !die.locked,
        }"
        :title="
          die.locked
            ? t('dieIsLocked')
            : die.selected
            ? t('dieIsSelected')
            : t('clickToSelect')
        "
      >
        <div class="die" :class="`die-${die.value}`">
          <template v-if="die.value === 1">
            <div class="dot center"></div>
          </template>
          <template v-else-if="die.value === 2">
            <div class="dot top-left"></div>
            <div class="dot bottom-right"></div>
          </template>
          <template v-else-if="die.value === 3">
            <div class="dot top-left"></div>
            <div class="dot center"></div>
            <div class="dot bottom-right"></div>
          </template>
          <template v-else-if="die.value === 4">
            <div class="dot top-left"></div>
            <div class="dot top-right"></div>
            <div class="dot bottom-left"></div>
            <div class="dot bottom-right"></div>
          </template>
          <template v-else-if="die.value === 5">
            <div class="dot top-left"></div>
            <div class="dot top-right"></div>
            <div class="dot center"></div>
            <div class="dot bottom-left"></div>
            <div class="dot bottom-right"></div>
          </template>
          <template v-else-if="die.value === 6">
            <div class="dot top-left"></div>
            <div class="dot top-right"></div>
            <div class="dot middle-left"></div>
            <div class="dot middle-right"></div>
            <div class="dot bottom-left"></div>
            <div class="dot bottom-right"></div>
          </template>
        </div>
        <div v-if="die.locked" class="locked-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from "vue"
import { useI18n } from "../i18n"

interface Die {
  value: number
  selected: boolean
  locked: boolean
}

const props = defineProps({
  dice: {
    type: Array as () => Die[],
    required: true,
  },
  isRolling: {
    type: Boolean,
    default: false,
  },
})

defineEmits(["toggle-die-selection"])

const { t } = useI18n()
</script>

<style scoped>
.dice-container {
  margin: 2rem 0;
}

.dice-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
  max-width: 500px;
  margin: 0 auto;
}

.die-container {
  position: relative;
  aspect-ratio: 1/1;
  cursor: pointer;
  perspective: 600px;
  transition: transform 0.2s ease;
}

.die-container:hover:not(.locked) {
  transform: translateY(-5px);
}

.die {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: white;
  border-radius: 10%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
}

.die-container.selected .die {
  background-color: var(--color-accent-light);
  box-shadow: 0 0 10px var(--color-accent);
}

.die-container.locked .die {
  background-color: var(--color-primary-light);
}

.locked-icon {
  position: absolute;
  top: -8px;
  right: -8px;
  color: var(--color-primary);
  background: white;
  border-radius: 50%;
  padding: 2px;
  z-index: 10;
}

.dot {
  position: absolute;
  width: 18%;
  height: 18%;
  border-radius: 50%;
  background-color: #333;
}

.center {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.top-left {
  top: 20%;
  left: 20%;
}

.top-right {
  top: 20%;
  right: 20%;
}

.middle-left {
  top: 50%;
  left: 20%;
  transform: translateY(-50%);
}

.middle-right {
  top: 50%;
  right: 20%;
  transform: translateY(-50%);
}

.bottom-left {
  bottom: 20%;
  left: 20%;
}

.bottom-right {
  bottom: 20%;
  right: 20%;
}

.shaking {
  animation: shake 0.5s infinite;
}

@keyframes shake {
  0% {
    transform: translate(0, 0) rotate(0deg);
  }
  10% {
    transform: translate(-1px, -1px) rotate(-1deg);
  }
  20% {
    transform: translate(1px, -1px) rotate(1deg);
  }
  30% {
    transform: translate(-1px, 1px) rotate(0deg);
  }
  40% {
    transform: translate(1px, 1px) rotate(1deg);
  }
  50% {
    transform: translate(-1px, -1px) rotate(-1deg);
  }
  60% {
    transform: translate(1px, -1px) rotate(0deg);
  }
  70% {
    transform: translate(-1px, 1px) rotate(-1deg);
  }
  80% {
    transform: translate(-1px, -1px) rotate(1deg);
  }
  90% {
    transform: translate(1px, 1px) rotate(0deg);
  }
  100% {
    transform: translate(0, 0) rotate(-1deg);
  }
}
</style>
