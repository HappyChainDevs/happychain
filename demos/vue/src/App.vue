<script setup lang="ts">
import ChainStatus from "./components/ChainStatus.vue"
import ConnectionButtons from "./components/ConnectionButtons.vue"
import Container from "./components/Container.vue"
import UserStatus from "./components/UserStatus.vue"
import WagmiStatus from "./components/WagmiStatus.vue"
</script>

<template>


  <connect-button />

  <div class="flex items-center justify-center min-h-dvh">
    <Container title="HappyChain" class="min-w-96 p-8" :shadow="true">

      <!-- Interactive Actions -->
      <ConnectionButtons />

      <!-- Wagmi Connection Status -->
      <WagmiStatus />

      <!-- User Details -->
      <UserStatus />

      <!-- Connected Chain Details -->
      <ChainStatus />

    </Container>
  </div>
</template>
