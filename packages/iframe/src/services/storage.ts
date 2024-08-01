import { createStorage } from '@happychain/common'
import type { HappyUser } from '@happychain/core'

type StorageSchema = { 'cached-user': HappyUser | null }

export const storage = createStorage<StorageSchema>('happychain')
