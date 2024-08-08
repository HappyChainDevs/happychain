import type { HappyUser } from '@happychain/js'
import { createContext } from 'react'

export const HappyContext = createContext<HappyUser | null>(null)
