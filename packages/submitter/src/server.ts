import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { prettyJSON } from 'hono/pretty-json'
import { createPublicClient, createWalletClient } from 'viem'
import type { HappyTx } from './types'

const app = new Hono()

// Middleware
app.use('*', cors())
app.use('*', prettyJSON())

// Error handling
app.notFound((c) => c.json({ message: 'Not Found', ok: false }, 404))

// Health check
app.get('/health', (c) => c.text('OK'))

// Submit endpoint
app.post('/submit', async (c) => {
  try {
    const happyTx = await c.req.json<HappyTx>()
    const entrypointAddress = process.env.HAPPY_ENTRYPOINT_ADDRESS as `0x${string}`
    const rpcUrl = process.env.RPC_URL

    if (!rpcUrl) {
      return c.json({ ok: false, error: 'RPC_URL not set' }, 500)
    }
    if (!entrypointAddress) {
      return c.json({ ok: false, error: 'HAPPY_ENTRYPOINT_ADDRESS not set' }, 500)
    }

    // Initialize viem clients with default http transport
    const publicClient = createPublicClient()
    const walletClient = createWalletClient({ rpcUrl })

    // Submit transaction
    const hash = await walletClient.writeContract({
      address: entrypointAddress,
      abi: [
        'function handleOps(tuple(address account, uint32 gasLimit, uint32 executeGasLimit, address dest, address paymaster, uint256 value, uint256 nonce, uint256 maxFeePerGas, int256 submitterFee, bytes callData, bytes paymasterData, bytes validatorData, bytes extraData)[] ops) external'
      ],
      functionName: 'handleOps',
      args: [[happyTx]]
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    return c.json({
      ok: true,
      txHash: receipt.transactionHash
    })

  } catch (error) {
    console.error('Error submitting transaction:', error)
    return c.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

export default app
