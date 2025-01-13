import { Hono } from "hono"
import { zValidator } from '@hono/zod-validator'

import type { Hex } from "viem"

import { walletClient } from './utils/config'
import { DeployAccountSchema, HappyTxSchema } from './utils/schema'

const app = new Hono()

// Routes
app.post('/deployAccount', zValidator('json', DeployAccountSchema), async (c) => {
  const { factoryAddress, salt } = c.req.valid('json')
  // Implementation will be added later
  return c.json({ 
    success: true, 
    message: `Deployment initiated with factory ${factoryAddress} and salt ${salt}` 
  })
})

app.post('/submitHappyTx', zValidator('json', HappyTxSchema), async (c) => {
  const { encodedTx } = c.req.valid('json')
  const hash = await walletClient.sendTransaction({
    to: '0xabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd',
    value: 0n,
    data: encodedTx as Hex,
  })
  return c.json({ 
    success: true, 
    txHash: hash 
  })
})

export default app
