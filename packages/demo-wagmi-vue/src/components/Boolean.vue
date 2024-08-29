<script setup lang="ts">
defineProps<{ bool: boolean }>()
</script>

<template>
    <span :class="bool ? 'text-green-500' : 'text-red-500'">{{ bool }}</span>
</template>
