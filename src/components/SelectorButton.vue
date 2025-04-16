<template>
  <div :class="containerClass">
    <button
      v-for="item in items"
      :key="item.value"
      @click="$emit('update:selected', item.value)"
      :class="[
        'p-4 rounded-lg transition-all duration-200 game-mode-btn',
        selectedValue === item.value
          ? 'game-button-primary font-bold border-2 border-accent shadow-lg transform -translate-y-1'
          : 'game-button-secondary border border-neutral-400',
      ]"
      type="button"
    >
      {{ item.text }}
    </button>
  </div>
  {{ containerClass }}
</template>

<script setup lang="ts">
import { computed } from "vue"

interface SelectorItem {
  value: any
  text: string
}

const props = defineProps<{
  items: SelectorItem[]
  selectedValue: any
  disabled?: boolean
  direction?: string
}>()

const containerClass = computed(() => {
  if (props.direction === "col") return "flex flex-col gap-4"
  if (props.items.length === 3) return "grid grid-cols-3 gap-4"
  return `grid grid-cols-${props.items.length} gap-4` // weirdly not working with 3 items
})
</script>
