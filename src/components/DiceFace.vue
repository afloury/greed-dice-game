<template>
  <div class="dice-face" :class="[`dice-${value}`]">
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
}

.dot {
  position: absolute;
  width: 20%;
  height: 20%;
  border-radius: 50%;
  background-color: currentColor;
  /* Add a subtle shadow to give depth to the dots */
  box-shadow: inset 0 3px 4px rgba(0, 0, 0, 0.3),
    0 0 2px rgba(255, 255, 255, 0.5);
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
