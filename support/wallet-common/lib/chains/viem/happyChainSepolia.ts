import { chainConfig } from "viem/op-stack"
import { happyChainSepoliaDefinition as addChainDefinition } from "../definitions/happyChainSepolia"
import type { Chain } from "./type"

/**
 * Contract Info can be found here:
 * https://testnet.happy.tech
 */
const rollup = {
    genesis: {
        l1: {
            hash: "0xad219f44b6f42109bcee851324ffb8eee31f961e7c1b20abd7327b9c9ff6c1ba",
            number: 7881778,
        },
        l2: {
            hash: "0x7f0e4f446e556f11b692334dcb3659b899085e7264414619d80b071a099577a3",
            number: 0,
        },
        l2_time: 1741715688,
        system_config: {
            batcherAddr: "0xd5c190fe1ac0a49464b81e739f8485cd3422d359",
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
    batch_inbox_address: "0x8263582501d656e733054dea5aad6eb5eebc61a2",
    deposit_contract_address: "0x03425626ab831ba7af5318564fb333c034208695",
    l1_system_config_address: "0xe49e82879252aa00450d9ef098ea4a7f1905e6a1",
    protocol_versions_address: "0x0000000000000000000000000000000000000000",
    da_challenge_contract_address: "0x0000000000000000000000000000000000000000",
}

const sourceId = rollup.l1_chain_id

const contracts = {
    AddressManager: "0xfE220348BE5e496947c52D299A5B5eDC2D34B49D",
    AnchorStateRegistry: "0x2f030B39187435c5fCA60A3002e335B8de9f579C",
    AnchorStateRegistryProxy: "0xC4A598ee7fDC2c7CC03D15Ad875cfEd590685537",
    DelayedWETH: "0x66cc877591ca6B3dD9fabBD930c25c508ADf10C5",
    DelayedWETHProxy: "0x351AFe0541efE5bF784182cC2AE6aC26571f7A2E",
    DisputeGameFactory: "0x20B168142354Cee65a32f6D8cf3033E592299765",
    DisputeGameFactoryProxy: "0x1D1b3B561f54244b1Bb63b06a3aeca34d4dfcE58",
    L1CrossDomainMessenger: "0x094e6508ba9d9bf1ce421fff3dE06aE56e67901b",
    L1CrossDomainMessengerProxy: "0x3885e9B1dd6f1d7EC3BeB4Ec4De5CfED441A606e",
    L1ERC721Bridge: "0x5C4F5e749A61a9503c4AAE8a9393e89609a0e804",
    L1ERC721BridgeProxy: "0xe0488992D683e223381068334E2F388a7F29AE93",
    L1StandardBridge: "0xb7900B27Be8f0E0fF65d1C3A4671e1220437dd2b",
    L1StandardBridgeProxy: "0xc03a54D274c322426b6D20de3f10a404cccdA8a1",
    L2OutputOracle: "0x19652082F846171168Daf378C4fD3ee85a0D4A60",
    L2OutputOracleProxy: "0x1ED0f79061D340eF6e7B8A8dCA77c1C1B0Ad90B1",
    Mips: "0xc110798897D64570159Fdeb746D3F4cE46e0dC44",
    OptimismMintableERC20Factory: "0x39Aea2Dd53f2d01c15877aCc2791af6BDD7aD567",
    OptimismMintableERC20FactoryProxy: "0xAF0A2E4958c4386E60bed3e2bb6BBc2999a7f9C3",
    OptimismPortal: "0xbdD90485FCbcac869D5b5752179815a3103d8131",
    OptimismPortal2: "0xfcbb237388CaF5b08175C9927a37aB6450acd535",
    OptimismPortalProxy: "0x03425626AB831BA7aF5318564fb333C034208695",
    PreimageOracle: "0x9f26795B4b35C247ccf8C18c272B177027f09AdF",
    ProtocolVersions: "0xfbfD64a6C0257F613feFCe050Aa30ecC3E3d7C3F",
    ProtocolVersionsProxy: "0xd8016225e6797Ba3Db8F7d92c550c70307E43932",
    ProxyAdmin: "0xec55286bf423915A7A763cb5A14E16cde075a0A0",
    SafeProxyFactory: "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2",
    SafeSingleton: "0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552",
    SuperchainConfig: "0x068E44eB31e111028c41598E4535be7468674D0A",
    SuperchainConfigProxy: "0x3F98D31d084086Fd9Fe0E3A54e53a27172c40454",
    SystemConfig: "0x67866A5052E5302aaD08e9f352331fd8622eB6DC",
    SystemConfigProxy: "0xe49E82879252aa00450d9eF098eA4A7f1905e6A1",
    SystemOwnerSafe: "0xcD76cDC43901f21cCb6A94C8056eE5d7B80C31fB",
} as const

/**
 * HappyChain testnet whose L1 is the Ethereum Sepolia testnet.
 *
 * Type: {@link Chain}
 */
export const happyChainSepolia: Chain = {
    ...chainConfig,
    id: Number(addChainDefinition.chainId),
    name: addChainDefinition.chainName,
    nativeCurrency: addChainDefinition.nativeCurrency,
    rpcUrls: {
        default: {
            http: addChainDefinition.rpcUrls.filter((a) => a.startsWith("https")),
            webSocket: addChainDefinition.rpcUrls.filter((a) => a.startsWith("ws")),
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
}
