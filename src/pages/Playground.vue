<template>
  <div>Playground</div>
  <pre>{{ myObject }}</pre>
  <BaseButton variant="secondary" @click="updateObject({ test: 'test' })">
    Update Object
  </BaseButton>
</template>

<script setup lang="ts">
import BaseButton from "../components/BaseButton.vue"
import { myObject, updateObject } from "../utils/firebase"
</script>

<style scoped></style>
