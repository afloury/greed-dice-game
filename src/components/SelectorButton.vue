<template>
  <div :class="containerClass">
    <BaseButton
      v-for="item in items"
      :key="item.value"
      @click="$emit('update:selected', item.value)"
      :label="item.text"
      :variant="selectedValue === item.value ? 'primary' : 'secondary'"
      :size="direction === 'col' ? 'lg' : 'sm'"
      :disabled="disabled"
      :selected="selectedValue === item.value"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import BaseButton from "./BaseButton.vue"

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
