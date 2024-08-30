<script setup lang="ts">
defineProps<{ bool: boolean }>()
</script>

<template>
    <div :class="bool ? 'text-green-500' : 'text-red-500'">{{ bool }}</div>
</template>
