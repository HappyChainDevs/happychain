import { config, EIP1193ProviderProxy } from '@happychain/core'

import { eip1193ProviderBus } from '../services/eventBus'

export const eip1193Provider = new EIP1193ProviderProxy(eip1193ProviderBus, config)
