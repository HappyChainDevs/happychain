<script setup lang="ts">
import { useAccount, useConnections } from "@wagmi/vue"
import BooleanDisplay from "./Boolean.vue"
import Container from "./Container.vue"

const { isConnected, isDisconnected, isReconnecting, isConnecting } = useAccount()
const connections = useConnections()
</script>

<template>
    <Container title="Wagmi Status">
        <!-- Connected Providers -->
        <ul>
            <li v-for="connection in connections">Connected: {{ connection.connector.name }}</li>
        </ul>

        <!-- General Connection Status -->
        <ul>
            <li class="grid grid-cols-2">
                <div>Connected:</div>
                <BooleanDisplay :bool="isConnected" />
            </li>
            <li class="grid grid-cols-2">
                <div>Disconnected:</div>
                <BooleanDisplay :bool="isDisconnected" />
            </li>
            <li class="grid grid-cols-2">
                <div>Connecting:</div>
                <BooleanDisplay :bool="isConnecting" />
            </li>
            <li class="grid grid-cols-2">
                <div>Reconnecting:</div>
                <BooleanDisplay :bool="isReconnecting" />
            </li>
        </ul>
    </Container>
</template>
