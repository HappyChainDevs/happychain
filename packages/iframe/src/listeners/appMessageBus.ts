import { Msgs } from "@happychain/sdk-shared"
import { appMessageBus } from "../services/eventBus"

// Request App Origin Update on load
appMessageBus.emit(Msgs.OriginRequest, undefined)
