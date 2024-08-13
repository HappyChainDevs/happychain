import { createContext } from 'react'

import type { HappyUser } from '@happychain/js'

export const HappyContext = createContext<HappyUser | undefined>(undefined)
