<script setup lang="ts">
import { useAccount } from '@wagmi/vue'
import Container from './Container.vue';
import SelectArrow from './SelectArrow.vue';

// SDK
import { useHappyChain } from '../sdk'
const { user } = useHappyChain()

// wagmi
const { address } = useAccount()
</script>

<template>
    <Container title="User">
        <div class="grid grid-cols-2 grid-rows-2 grid-flow-row m4">
            <div class="col-span-2 row-span-2 flex items-center cursor-default"
                :class="{'hover:bg-theme-highlight hover:text-black': address}">
                <SelectArrow v-if="address" />
                Address: {{ address }}
            </div>
            <div class="cursor-default" :class="{'hover:bg-theme-highlight hover:text-black': user }">
                Name: {{ user?.name }}
            </div>
            <div class="row-span-3 flex justify-end items-center">
                <img class="object-contain h-16 shadow-theme-sm" v-if="user" :src="user.avatar" />
            </div>
            <div class="cursor-default" :class="{'hover:bg-theme-highlight hover:text-black': user }">
                Provider: {{ user?.provider }}
            </div>
            <div class="cursor-default" :class="{'hover:bg-theme-highlight hover:text-black': user }">
                Connection Type: {{ user?.type }}
            </div>
        </div>
    </Container>
</template>
