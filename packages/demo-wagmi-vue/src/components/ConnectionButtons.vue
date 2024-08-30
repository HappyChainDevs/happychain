<script setup lang="ts">
import type { Connector } from '@wagmi/vue'
import { useAccount, useConnect, useDisconnect } from '@wagmi/vue'
import Button from './Button.vue';
import Container from './Container.vue';

const { isConnected, isDisconnected } = useAccount()
const { connect, connectors } = useConnect()
const { disconnect } = useDisconnect()
</script>

<template>
    <Container title="Actions">
        <div class="grid grid-cols-2 gap-4">
            <Button @click="connect({ connector: connectors[0] })" :disabled="isConnected">
                Connect
            </Button>

            <Button @click="disconnect" :disabled="isDisconnected">
                Disconnect
            </Button>

            <!-- Only visible if { multiInjectedProviderDiscovery: true } in wagmi config  -->
            <Button v-if="connectors.length > 1"
                v-for="connector in connectors.filter((a: Connector) => a.id !== 'happyProvider')"
                @click="connect({ connector })">
                {{ connector.name }}
            </Button>
        </div>
    </Container>
</template>
