<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="[
      'game-button cursor-pointer border-1 p-4 rounded-lg transition-all duration-200 hover:bg-[var(--hover-bg)] hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50',
      customClass,
      {
        'game-button-primary font-bold border-2 border-[var(--color-accent)]':
          variant === 'primary',
        'game-button-secondary border-neutral-400': variant === 'secondary',
      },
      {
        '': size === 'sm',
        'w-full text-xl': size === 'lg',
      },
      { '-translate-y-1': selected },
    ]"
    @click="$emit('click', $event)"
    :title="tooltip"
  >
    <span class="flex items-center justify-center">
      <slot>{{ label }}</slot>
    </span>
  </button>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue"

export default defineComponent({
  name: "BaseButton",
  props: {
    label: {
      type: String,
      default: "",
    },
    type: {
      type: String as PropType<"button" | "submit" | "reset">,
      default: "button",
    },
    variant: {
      type: String as PropType<"primary" | "secondary">,
      default: "primary",
    },
    size: {
      type: String as PropType<"sm" | "lg">,
      default: "sm",
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    customClass: {
      type: String,
      default: "",
    },
    selected: {
      type: Boolean,
      default: false,
    },
    tooltip: {
      type: String,
      default: "",
    },
  },
  emits: ["click"],
})
</script>

<style scoped>
.game-button:hover {
  box-shadow: none;
}

.game-button:disabled {
  box-shadow: none;
}

.game-button-primary {
  box-shadow: 0 0 15px rgba(247, 86, 124, 0.5);
}

.game-button-secondary-test {
  box-shadow: 0 0 15px var(--color-neutral-400);
}
</style>
