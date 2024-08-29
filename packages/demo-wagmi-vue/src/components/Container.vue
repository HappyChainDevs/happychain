<script setup lang="ts">
defineProps<{ title?: string, shadow?: boolean }>()
</script>

<template>
  <div class="bg-theme-bg text-white text-thin px-1 pb-2 pt-3 relative" :class="{'shadow-theme': shadow}">
    <div class="border-4 border-double border-white p-4">
      <div class="absolute top-0 left-0 right-0">
        <div v-if="title" class="bg-theme-bg mx-auto w-min whitespace-nowrap px-1 my-1 text-center">{{ title }}</div>
      </div>

      <slot />
    </div>
  </div>
</template>
