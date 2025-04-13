<template>
  <div
    class="dice-face"
    :class="[`dice-${value}`, { 'is-spinning': isSpinning }]"
  >
    <!-- Dice dot layouts -->
    <div v-if="value === 1" class="dot center-dot"></div>

    <template v-else-if="value === 2">
      <div class="dot top-left"></div>
      <div class="dot bottom-right"></div>
    </template>

    <template v-else-if="value === 3">
      <div class="dot top-left"></div>
      <div class="dot center-dot"></div>
      <div class="dot bottom-right"></div>
    </template>

    <template v-else-if="value === 4">
      <div class="dot top-left"></div>
      <div class="dot top-right"></div>
      <div class="dot bottom-left"></div>
      <div class="dot bottom-right"></div>
    </template>

    <template v-else-if="value === 5">
      <div class="dot top-left"></div>
      <div class="dot top-right"></div>
      <div class="dot center-dot"></div>
      <div class="dot bottom-left"></div>
      <div class="dot bottom-right"></div>
    </template>

    <template v-else-if="value === 6">
      <div class="dot top-left"></div>
      <div class="dot top-right"></div>
      <div class="dot middle-left"></div>
      <div class="dot middle-right"></div>
      <div class="dot bottom-left"></div>
      <div class="dot bottom-right"></div>
    </template>

    <div v-else class="text-center">{{ value }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  value: number
  isSpinning?: boolean
}>()
</script>

<style scoped>
.dice-face {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
  border-radius: 15%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.dice-face:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 10px rgba(0, 0, 0, 0.25), inset 0 -1px 0 rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.is-spinning {
  animation: roll 0.75s ease-out;
}

@keyframes roll {
  0% {
    transform: translateY(-15px);
    opacity: 0.5;
  }
  50% {
    transform: translateY(5px) scale(1.1);
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.dot {
  position: absolute;
  width: 20%;
  height: 20%;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #ff4d6d 0%, #c9184a 100%);
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.4),
    inset 0 -1px 2px rgba(0, 0, 0, 0.3);
}

/* Dot positions */
.top-left {
  top: 15%;
  left: 15%;
}

.top-right {
  top: 15%;
  right: 15%;
}

.middle-left {
  top: 50%;
  left: 15%;
  transform: translateY(-50%);
}

.middle-right {
  top: 50%;
  right: 15%;
  transform: translateY(-50%);
}

.center-dot {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.bottom-left {
  bottom: 15%;
  left: 15%;
}

.bottom-right {
  bottom: 15%;
  right: 15%;
}
</style>
