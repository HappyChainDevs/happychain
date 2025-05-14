import type { Address, Hex } from "@happy.tech/common"
import { pad, toHex } from "viem"
import { describe, expect, test } from "vitest"
import { getAddressERC1967 } from "../getAddressERC1967"

describe("getAddressERC1967", () => {
    const SALT: Hex = pad(toHex(0))
    const SALT2: Hex = pad(toHex(1))
    const OWNER: Address = pad("0xdead", { size: 20 })
    const OWNER2: Address = pad("0xbeef", { size: 20 })

    const IMPLEMENTATION_ADDRESS: Address = "0x5615dEB798BB3E4dFa0139dFa1b3D433Cc23b72f"
    const FACTORY_ADDRESS: Address = "0x2e234DAe75C793f67A35089C9d99245E1C58470b"

    const EXP_ADDR_SALT1_OWNER1: Address = "0x9E7567EcA36d658900B724D8ebA79e6eE692C3e4" // salt + owner
    const EXP_ADDR_SALT1_OWNER2: Address = "0x6932693Cd87ac2379dD7bbB491a7a88e72cF6416" // salt + owner2
    const EXP_ADDR_SALT2_OWNER1: Address = "0xf5c6Ad0BF25CDe468ecC146263E7eCfC36cF1003" // salt2 + owner

    test("predicts same address as ScrappyAccountFactory for initial deployment (salt1 + owner1)", async () => {
        const predicted = getAddressERC1967(SALT, OWNER, IMPLEMENTATION_ADDRESS, FACTORY_ADDRESS)
        expect(predicted).toBe(EXP_ADDR_SALT1_OWNER1)
    })

    test("predicts same address as ScrappyAccountFactory for different owner with same salt (salt1 + owner2)", async () => {
        const predicted = getAddressERC1967(SALT, OWNER2, IMPLEMENTATION_ADDRESS, FACTORY_ADDRESS)
        expect(predicted).toBe(EXP_ADDR_SALT1_OWNER2)
    })

    test("predicts same address as ScrappyAccountFactory for same owner with different salt (salt2 + owner1)", async () => {
        const predicted = getAddressERC1967(SALT2, OWNER, IMPLEMENTATION_ADDRESS, FACTORY_ADDRESS)
        expect(predicted).toBe(EXP_ADDR_SALT2_OWNER1)
    })
})
