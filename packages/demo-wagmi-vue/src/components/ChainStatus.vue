<script setup lang="ts">
import { useChainId, useConfig } from "@wagmi/vue"
import Container from "./Container.vue"

const chainId = useChainId()
// custom config details
const config = useConfig()

const currentChain = config.chains.find((chain) => chain.id === chainId.value)
</script>

<template>
    <Container title="Chain Status">
        <div class="grid grid-cols-2 grid-rows-2 grid-flow-row m4">
            <div class="col-span-2 row-span-2 flex items-center cursor-default"
                :class="{'hover:bg-theme-highlight hover:text-black': currentChain}">
                Chain: {{ currentChain?.name }}
            </div>

            <div class="col-span-2 row-span-2 flex items-center cursor-default"
                :class="{'hover:bg-theme-highlight hover:text-black': currentChain}">
                Chain ID: {{ currentChain?.id }}
            </div>

            <div class="col-span-2 row-span-2 flex items-center cursor-default"
                :class="{'hover:bg-theme-highlight hover:text-black': currentChain}">
                Chain ID: {{ currentChain?.id }}
            </div>

        </div>
    </Container>
</template>
