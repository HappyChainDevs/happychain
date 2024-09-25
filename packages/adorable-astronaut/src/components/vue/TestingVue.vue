<script lang="ts">
import { register } from '@happychain/js'
import { defineBadgeComponent } from "@happychain/ui"

register()
defineBadgeComponent('connect-button')

</script>

<template>
    <div>
        <h1>Hello From Vue</h1>
        <connect-button />
    </div>
</template>
