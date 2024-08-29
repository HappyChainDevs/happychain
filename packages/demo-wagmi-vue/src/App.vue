<script setup lang="ts">
import { Connector, useAccount, useConfig, useConnect, useConnections, useDisconnect } from '@wagmi/vue'
import BooleanDisplay from './components/Boolean.vue';
import Button from './components/Button.vue';
import Container from './components/Container.vue';
import { happyConnector } from './wagmi'

// SDK
import { register, useHappyChain } from './sdk/index'

register({
  chain: 'sepolia'
})

const { user } = useHappyChain()

// below here is wagmi
const { address, isConnected, isDisconnected, isReconnecting, isConnecting } = useAccount()
const { disconnect } = useDisconnect()

// TODO: handle: {"method":"wallet_requestPermissions","params":[{"eth_accounts":{}}]}
// this gets called by wagmi and opens a popup. show user selection here to be compatible
// additionally, investigate eth_requestAccounts
const { connect, connectors } = useConnect()
const conn = useConnections()

async function logout() {
  try {

    console.log("disconnecting...")
    const res = await disconnect()
    console.log({ res })
    console.log("disconnected")
  } catch (e) {
    console.log({ e })
  }
}

</script>

<template>
  <div class="flex items-center justify-center min-h-dvh">
    <Container title="HappyChain" class="min-w-96 p-8" :shadow="true">


      <Container title="Actions">
        <div class="grid grid-cols-2 gap-4">
          <Button @click="connect({ connector: connectors[0] })" :disabled="isConnected">
            Connect
          </Button>

          <Button @click="logout" :disabled="!isConnected">
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

      <Container title="Wagmi Status">
        <ul>
          <li v-for="con in conn">{{ con.connector.name }}</li>
        </ul>
        <ul>
          <li class="grid grid-cols-2">
            <div>Connected:</div>
            <div>
              <BooleanDisplay :bool="isConnected" />
            </div>
          </li>
          <li class="grid grid-cols-2">
            <div>Disconnected:</div>
            <div>
              <BooleanDisplay :bool="isDisconnected" />
            </div>
          </li>
          <li class="grid grid-cols-2">
            <div>Connecting:</div>
            <div>
              <BooleanDisplay :bool="isConnecting" />
            </div>
          </li>
          <li class="grid grid-cols-2">
            <div>Reconnecting:</div>
            <div>
              <BooleanDisplay :bool="isReconnecting" />
            </div>
          </li>
        </ul>
      </Container>

      <Container title="User">
        <div class="grid grid-cols-2 grid-rows-2 grid-flow-row m4">
          <div class="col-span-2 row-span-2 flex items-center cursor-default"
            :class="{'hover:bg-theme-highlight hover:text-black': address}">
            <svg height="10" width="10" class="absolute -translate-x-2" v-if="address">
              <polygon points="0,0 0,10 5,5" fill="#fff" />
            </svg>
            Address: {{ address }}
          </div>
          <div class="cursor-default" :class="{'hover:bg-theme-highlight hover:text-black': user }">Name: {{ user?.name
            }}</div>
          <div class="row-span-3 flex justify-end items-center">
            <img class="object-contain h-16 shadow-theme-sm" v-if="user" :src="user.avatar" />
          </div>
          <div class="cursor-default" :class="{'hover:bg-theme-highlight hover:text-black': user }">Provider: {{
            user?.provider
            }}</div>
          <div class="cursor-default" :class="{'hover:bg-theme-highlight hover:text-black': user }">Connection Type: {{
            user?.type }}</div>
        </div>
      </Container>
    </Container>
  </div>
</template>
