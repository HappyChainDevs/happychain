import { type Chain, defineChain } from "viem"
import { chainConfig } from "viem/op-stack"
import { happyChainSepolia as addChainDefinition } from "../definitions/happyChainSepolia"

/**
 * Contract Info can be found here:
 * https://happy-testnet-sepolia.hub.caldera.xyz/
 */
const rollup = {
    genesis: {
        l1: {
            hash: "0xc0dfd09b5df4009ff438a4a6c1eb3a20998d9fc793b8463c44f1bcf6f26f057a",
            number: 6463877,
        },
        l2: {
            hash: "0x3f7968a4715ac3c24dc0efc060eb7e423b39367629496e6b8a8b088968d01898",
            number: 0,
        },
        l2_time: 1723165536,
        system_config: {
            batcherAddr: "0x942beb01c2a3ec7be65d3751e30ed24941401433",
            overhead: "0x0000000000000000000000000000000000000000000000000000000000000834",
            scalar: "0x01000000000000000000000000000000000000000000000000000000000a31c2",
            gasLimit: 30000000,
        },
    },
    block_time: 2,
    max_sequencer_drift: 3600,
    seq_window_size: 21600,
    channel_timeout: 300,
    l1_chain_id: 11155111,
    l2_chain_id: 216,
    regolith_time: 0,
    canyon_time: 0,
    delta_time: 0,
    ecotone_time: 0,
    fjord_time: 0,
    batch_inbox_address: "0x5fd05339f23ff076b4a764ce003ca50f3ca19ccd",
    deposit_contract_address: "0x3d31ac8e7a248856896338c12db34960852672da",
    l1_system_config_address: "0xab66f34d63b942b0f923958b2a063fa5c9d80471",
    protocol_versions_address: "0x0000000000000000000000000000000000000000",
    da_challenge_contract_address: "0x0000000000000000000000000000000000000000",
}

const sourceId = rollup.l1_chain_id

const contracts = {
    AddressManager: "0x743c41E06e61A003DaAb8c63E9082304948D8Ab4",
    AnchorStateRegistry: "0xB06D20BBBe8CF571D7D4bA125f1e170dEa99a067",
    AnchorStateRegistryProxy: "0x8a1F9Ff5f36E68cBD9fd483059C104152b5F4C83",
    DelayedWETH: "0x5196c30E9f95B3C7BA9a554E4927EC1D6BBC8C55",
    DelayedWETHProxy: "0x058987BA3Eef5e264480f9501a34F0551f6e848a",
    DisputeGameFactory: "0x638731a0Bd4140Ee45a4334AC95a48702300CC1A",
    DisputeGameFactoryProxy: "0x66aEE6Cdc0E6002c0898a5F6F803171F3d2E204f",
    L1CrossDomainMessenger: "0xD6f58C208D48E2b8E6F8D325257B61494039Bc12",
    L1CrossDomainMessengerProxy: "0xd376952933386C77630C16C7c6682Ab3ca11186a",
    L1ERC721Bridge: "0x68175477D3e20548509c5c35339831f3654cc9BF",
    L1ERC721BridgeProxy: "0x4c94687D1C891D15e11B0360e5344A310A056Ce5",
    L1StandardBridge: "0x1D81B66aDe1bA648e972684Cb037567e2B80F666",
    L1StandardBridgeProxy: "0xBbd1316AB254290F46043A22312Df1B3fb90Ec53",
    L2OutputOracle: "0x5ac1f56782Ac4F96881F7F7B68E3c72e21472089",
    L2OutputOracleProxy: "0xbd94B5174833791d06E3c4289c20cA6b69081F62",
    Mips: "0xEffDac66add3a5Afb0a473642291E02725fDb844",
    OptimismMintableERC20Factory: "0x01FE8eB0C7aE246c1580071e15061C6975cA0916",
    OptimismMintableERC20FactoryProxy: "0x08aE59A33d73FD686F570A0fAA9A3f502DB2282C",
    OptimismPortal: "0xdB52f0A813194785399d618C5E9867c0C3A0b4Ae",
    OptimismPortal2: "0xB488792e1Adaa125674377d0F9EF53DF8268F298",
    OptimismPortalProxy: "0x3d31ac8e7a248856896338c12DB34960852672Da",
    PreimageOracle: "0x53C99b7EB9108e993bdAE5953F024815e564A93a",
    ProtocolVersions: "0xB45A442A979e54754d70EB7874d7b662C3D40b0a",
    ProtocolVersionsProxy: "0xC0264f9F3a5f2523B2644161cd312Bc19f1F6083",
    ProxyAdmin: "0x8870D9Cee9A5faACc2eD4bCf51EAC4Dd631f5Afc",
    SafeProxyFactory: "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2",
    SafeSingleton: "0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552",
    SuperchainConfig: "0x6a4e9C2A6435121Bf5ef15A2f7bCE63997f5f822",
    SuperchainConfigProxy: "0x2F94a4624A76aE54D6AC14F458aA23831c618374",
    SystemConfig: "0x6F84e8a83c25Ee4959868C3C4167b4730c74Ec78",
    SystemConfigProxy: "0xAb66f34D63B942b0f923958B2a063fA5C9d80471",
    SystemOwnerSafe: "0x0317afD14531280DA75353faf36309074043888D",
} as const

/**
 * HappyChain testnet whose L1 is the Ethereum Sepolia Testnet.
 */
export const happyChainSepolia: Chain = defineChain({
    ...chainConfig,
    id: Number(addChainDefinition.chainId),
    name: addChainDefinition.chainName,
    nativeCurrency: addChainDefinition.nativeCurrency,
    rpcUrls: {
        default: {
            http: addChainDefinition.rpcUrls.filter((a) => a.startsWith("https")),
            ws: addChainDefinition.rpcUrls.filter((a) => a.startsWith("ws")),
        },
    },
    blockExplorers: {
        default: {
            name: `${addChainDefinition.chainName} Explorer`,
            url: addChainDefinition.blockExplorerUrls[0],
        },
    },
    contracts: {
        ...chainConfig.contracts,
        disputeGameFactory: {
            [sourceId]: {
                address: contracts.DisputeGameFactoryProxy,
            },
        },
        l2OutputOracle: {
            [sourceId]: {
                address: contracts.L2OutputOracleProxy,
            },
        },
        multicall3: {
            address: "0xca11bde05977b3631167028862be2a173976ca11",
            blockCreated: 4286263,
        },
        portal: {
            [sourceId]: {
                address: contracts.OptimismPortalProxy,
            },
        },
        l1StandardBridge: {
            [sourceId]: {
                address: contracts.L1StandardBridgeProxy,
            },
        },
    },
    sourceId,
})
