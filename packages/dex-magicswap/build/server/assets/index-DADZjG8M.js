import SafeEventEmitter from '@metamask/safe-event-emitter';
import { defineChain, getAddress } from 'viem';
import { chainConfig } from 'viem/op-stack';
import 'react';
import { atomWithReducer } from 'jotai/utils';
import { getDefaultStore } from 'jotai/vanilla';
import 'neverthrow';
import define from 'preact-custom-element';
import { jsxs, Fragment, jsx } from 'preact/jsx-runtime';
import { clsx } from 'clsx';
import { useState, useEffect } from 'preact/hooks';
import { createStore, announceProvider } from 'mipd';
import { atom } from 'jotai';

const config = {
  iframePath: "http://localhost:5160"
};

const devnet$1 = {
  chainName: "localhost",
  rpcUrls: ["http://127.0.0.1:8545", "ws://127.0.0.1:8545"],
  nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
  chainId: "0x7a69"
  // 31337
};

const happyChainSepolia = {
  chainName: "HappyChain Sepolia",
  rpcUrls: ["https://happy-testnet-sepolia.rpc.caldera.xyz/http", "wss://happy-testnet-sepolia.rpc.caldera.xyz/ws"],
  nativeCurrency: { name: "HappyChain", symbol: "HAPPY", decimals: 18 },
  chainId: "0xd8",
  blockExplorerUrls: ["https://happy-testnet-sepolia.explorer.caldera.xyz"],
  opStack: true
};
const rollup = {
  genesis: {
    l1: {
      hash: "0xc0dfd09b5df4009ff438a4a6c1eb3a20998d9fc793b8463c44f1bcf6f26f057a",
      number: 6463877
    },
    l2: {
      hash: "0x3f7968a4715ac3c24dc0efc060eb7e423b39367629496e6b8a8b088968d01898",
      number: 0
    },
    l2_time: 1723165536,
    system_config: {
      batcherAddr: "0x942beb01c2a3ec7be65d3751e30ed24941401433",
      overhead: "0x0000000000000000000000000000000000000000000000000000000000000834",
      scalar: "0x01000000000000000000000000000000000000000000000000000000000a31c2",
      gasLimit: 3e7
    }
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
  da_challenge_contract_address: "0x0000000000000000000000000000000000000000"
};
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
  SystemOwnerSafe: "0x0317afD14531280DA75353faf36309074043888D"
};
const sourceId = rollup.l1_chain_id;
defineChain({
  ...chainConfig,
  id: Number(happyChainSepolia.chainId),
  name: happyChainSepolia.chainName,
  nativeCurrency: happyChainSepolia.nativeCurrency,
  rpcUrls: {
    default: {
      http: happyChainSepolia.rpcUrls.filter((a) => a.startsWith("https")),
      ws: happyChainSepolia.rpcUrls.filter((a) => a.startsWith("ws"))
    }
  },
  blockExplorers: {
    default: {
      name: `${happyChainSepolia.chainName} Explorer`,
      url: happyChainSepolia.blockExplorerUrls[0]
    }
  },
  contracts: {
    ...chainConfig.contracts,
    disputeGameFactory: {
      [sourceId]: {
        address: contracts.DisputeGameFactoryProxy
      }
    },
    l2OutputOracle: {
      [sourceId]: {
        address: contracts.L2OutputOracleProxy
      }
    },
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 4286263
    },
    portal: {
      [sourceId]: {
        address: contracts.OptimismPortalProxy
      }
    },
    l1StandardBridge: {
      [sourceId]: {
        address: contracts.L1StandardBridgeProxy
      }
    }
  },
  sourceId
});

const defaultChain$1 = happyChainSepolia;

var AuthState = /* @__PURE__ */ ((AuthState2) => {
  AuthState2["Disconnected"] = "unauthenticated";
  AuthState2["Connecting"] = "loading";
  AuthState2["Connected"] = "authenticated";
  return AuthState2;
})(AuthState || {});

const eip1193PermissionsMethods = [
  // https://ethereum.org/en/developers/docs/apis/json-rpc/
  "eth_accounts",
  // https://eips.ethereum.org/EIPS/eip-1102
  "eth_requestAccounts",
  // https://eips.ethereum.org/EIPS/eip-2255
  "wallet_requestPermissions",
  // https://docs.metamask.io/wallet/reference/wallet_revokepermissions/
  "wallet_revokePermissions"
];
const eip1193PermissionsMethodsSet = new Set(eip1193PermissionsMethods);
function isPermissionsRequest(args) {
  return eip1193PermissionsMethodsSet.has(args.method);
}

class GenericProviderRpcError extends Error {
  code;
  data;
  constructor(errObj) {
    super(errObj.message);
    this.code = errObj.code;
    this.data = errObj.data;
    this.stack = void 0;
  }
}
class EIP1193UserRejectedRequestError extends GenericProviderRpcError {
  constructor(errObj) {
    super({
      code: 4001 /* UserRejectedRequest */,
      message: errObj?.message || "User Rejected Request",
      data: errObj?.data || "User Rejected Request"
    });
  }
}

var Msgs = /* @__PURE__ */ ((Msgs2) => {
  Msgs2["RequestDisplay"] = "request-display";
  Msgs2["InjectedWalletConnected"] = "injected-wallet:connected";
  Msgs2["MirrorPermissions"] = "injected-wallet:mirror-permissions";
  Msgs2["IframeInit"] = "iframe-init";
  Msgs2["ModalToggle"] = "modal-toggle";
  Msgs2["UserChanged"] = "user-changed";
  Msgs2["AuthStateChanged"] = "auth-state-changed";
  Msgs2["InjectedWalletRequestConnect"] = "injected-wallet:requestConnect";
  Msgs2["RequestPermissionless"] = "request:permissionless";
  Msgs2["PermissionCheckRequest"] = "permission-check:request";
  Msgs2["RequestResponse"] = "request:response";
  Msgs2["PermissionCheckResponse"] = "permission-check:response";
  Msgs2["ProviderEvent"] = "provider:event";
  Msgs2["PopupApprove"] = "popup:approve";
  Msgs2["PopupReject"] = "popup:reject";
  return Msgs2;
})(Msgs || {});
var ModalStates = /* @__PURE__ */ ((ModalStates2) => {
  ModalStates2["Login"] = "login-modal";
  ModalStates2["Send"] = "send-modal";
  return ModalStates2;
})(ModalStates || {});

const safeList = /* @__PURE__ */ new Set([
  // happychain methods
  "happy_user",
  // => returns the current connected user if permissions are granted and user is connected
  // standard methods
  "eth_accounts",
  "eth_blobBaseFee",
  "eth_blockNumber",
  "eth_call",
  "eth_chainId",
  "eth_coinbase",
  "eth_estimateGas",
  "eth_feeHistory",
  "eth_gasPrice",
  "eth_getBalance",
  "eth_getBlockByHash",
  "eth_getBlockByNumber",
  "eth_getBlockReceipts",
  "eth_getBlockTransactionCountByHash",
  "eth_getBlockTransactionCountByNumber",
  "eth_getCode",
  "eth_getFilterChanges",
  "eth_getFilterLogs",
  "eth_getLogs",
  "eth_getProof",
  "eth_getStorageAt",
  "eth_getTransactionByBlockHashAndIndex",
  "eth_getTransactionByBlockNumberAndIndex",
  "eth_getTransactionByHash",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_getUncleByBlockHashAndIndex",
  "eth_getUncleByBlockNumberAndIndex",
  "eth_getUncleCountByBlockHash",
  "eth_getUncleCountByBlockNumber",
  "eth_getWork",
  "eth_hashrate",
  "eth_maxPriorityFeePerGas",
  "eth_mining",
  "eth_newBlockFilter",
  "eth_newFilter",
  "eth_newPendingTransactionFilter",
  "eth_protocolVersion",
  "eth_sendRawTransaction",
  "eth_submitHashrate",
  "eth_submitWork",
  "eth_subscribe",
  "eth_syncing",
  "eth_uninstallFilter",
  "eth_unsubscribe",
  "net_listening",
  "net_peerCount",
  "net_version",
  "wallet_getPermissions",
  // https://eips.ethereum.org/EIPS/eip-2255
  "wallet_revokePermissions",
  // https://github.com/MetaMask/metamask-improvement-proposals/blob/main/MIPs/mip-2.md
  "web3_clientVersion",
  "web3_sha3"
]);
const interactiveList = /* @__PURE__ */ new Set([
  "wallet_watchAsset",
  // https://eips.ethereum.org/EIPS/eip-747 // probably safe
  "wallet_scanQRCode",
  // https://github.com/ethereum/EIPs/issues/945
  "wallet_registerOnboarding"
  // metamask onboarding, maybe we can do something with this too?
]);
const unsafeList = /* @__PURE__ */ new Set([
  // permissions
  "eth_requestAccounts",
  // https://eips.ethereum.org/EIPS/eip-1102
  "wallet_requestPermissions",
  // https://eips.ethereum.org/EIPS/eip-2255
  // wallet settings
  "wallet_addEthereumChain",
  // https://eips.ethereum.org/EIPS/eip-3085
  "wallet_switchEthereumChain",
  // https://eips.ethereum.org/EIPS/eip-3326
  "wallet_updateEthereumChain",
  // https://eips.ethereum.org/EIPS/eip-2015
  // signing methods
  "eth_signTransaction",
  "personal_sign",
  // https://eips.ethereum.org/EIPS/eip-191
  "eth_sign",
  "eth_signTypedData",
  "eth_signTypedData_v1",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
  // send transactions
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  // cryptography
  "eth_decrypt",
  "eth_getEncryptionPublicKey"
]);
const permissionsLists = /* @__PURE__ */ new Map([
  ["unsafe", unsafeList],
  // requires approvals
  ["interactive", interactiveList],
  //
  ["safe", safeList]
  // does not require approvals
]);

function waitForCondition(callback, maxPollTimeMs = 3e4, pollIntervalMs = 50) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const pollForCondition = () => {
      if (callback()) {
        return resolve(true);
      }
      if (Date.now() - start > maxPollTimeMs) {
        return reject();
      }
      setTimeout(pollForCondition, pollIntervalMs);
    };
    pollForCondition();
  });
}

const __vite_import_meta_env__ = {"BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "SSR": true};
const env = __vite_import_meta_env__ ?? process.env;
["test", "production"].some((mode) => mode === env.MODE);
const noop = () => {
};
const silentLogger = { log: noop, warn: noop, error: noop };

var EventBusMode = /* @__PURE__ */ ((EventBusMode2) => {
  EventBusMode2["IframePort"] = "messagechannel:port1";
  EventBusMode2["AppPort"] = "messagechannel:port2";
  EventBusMode2["Broadcast"] = "broadcastchannel";
  EventBusMode2["Forced"] = "forced";
  return EventBusMode2;
})(EventBusMode || {});
class EventBus {
  constructor(config) {
    this.config = config;
    config.logger ??= silentLogger;
    switch (config.mode) {
      case "forced" /* Forced */:
        this.registerPortListener(config.port);
        break;
      case "broadcastchannel" /* Broadcast */:
        this.registerPortListener(new BroadcastChannel(config.scope));
        break;
      case "messagechannel:port1" /* IframePort */: {
        const mc = new MessageChannel();
        this.registerPortListener(mc.port1);
        const message = `happychain:${config.scope}:init`;
        config.target.postMessage(message, "*", [mc.port2]);
        break;
      }
      case "messagechannel:port2" /* AppPort */: {
        addEventListener("message", (e) => {
          const message = `happychain:${config.scope}:init`;
          if (e.data === message) {
            this.registerPortListener(e.ports[0]);
          }
        });
        break;
      }
    }
  }
  handlerMap = /* @__PURE__ */ new Map();
  port = null;
  registerPortListener(_port) {
    this.port = _port;
    this.port.onmessage = (event) => {
      if (event.data.scope !== this.config.scope) {
        return;
      }
      for (const fn of this.handlerMap.get(event.data.type) ?? []) {
        try {
          fn(event.data.payload);
        } catch (e) {
          this.config.onError?.(e);
        }
      }
    };
    this.port.onmessageerror = (event) => {
      const onError = this.config.onError ?? this.config.logger?.warn;
      onError?.(event);
    };
    this.config.logger?.log(
      `[EventBus] Port initialized ${this.config.mode}=>${this.config.scope}`,
      location.origin
    );
  }
  /** Remove event handler. */
  off(key, handler) {
    this.handlerMap.get(key)?.delete(handler);
    if (this.handlerMap.get(key)?.size === 0) {
      this.handlerMap.delete(key);
    }
  }
  /** Register Event handler. */
  on(key, handler) {
    const prev = this.handlerMap.get(key) ?? /* @__PURE__ */ new Set();
    this.handlerMap.set(key, prev.add(handler));
    return () => this.off(key, handler);
  }
  /** Emit event. */
  async emit(key, payload) {
    if (!this.port) {
      this.config.logger?.warn(
        `[EventBus] Port not initialized ${this.config.mode}=>${this.config.scope}`,
        location.origin
      );
      try {
        await waitForCondition(() => Boolean(this.port), 3e4, 50);
        this.port.postMessage({
          scope: this.config.scope,
          type: key,
          payload
        });
        return true;
      } catch {
        this.config.logger?.error("Failed to submit request", key, payload);
        return false;
      }
    }
    this.port.postMessage({
      scope: this.config.scope,
      type: key,
      payload
    });
    return Boolean(this.port);
  }
  /** Register event handler that will be removed after the first invocation. */
  once(key, handler) {
    const handleOnce = (payload) => {
      handler(payload);
      this.off(key, handleOnce);
    };
    this.on(key, handleOnce);
  }
  /** Remove all event handlers. */
  clear() {
    this.handlerMap.forEach((handlers, key) => {
      for (const handler of handlers) {
        this.off(key, handler);
      }
    });
  }
}

const what = Array().concat(
  Array.from(permissionsLists.get("safe") ?? []),
  Array.from(permissionsLists.get("interactive") ?? []),
  Array.from(permissionsLists.get("safe") ?? [])
);
const happyMethods = new Set(what.filter((a) => a.startsWith("happy_")));
function requestPayloadIsHappyMethod(payload) {
  return happyMethods.has(payload.method);
}

function createStorage(prefix = "") {
  const makeKey = (key) => prefix ? `${prefix}:${key}` : key;
  return {
    get(key) {
      const data = localStorage.getItem(makeKey(key));
      if (data === "undefined") {
        return void 0;
      }
      if (data !== null) {
        return JSON.parse(data);
      }
      return void 0;
    },
    set(key, value) {
      localStorage.setItem(makeKey(key), JSON.stringify(value));
    },
    remove(key) {
      localStorage.removeItem(makeKey(key));
    },
    clear() {
      localStorage.clear();
    }
  };
}

const store$1 = getDefaultStore();
function atomWithCompare(initialValue, areEqual) {
  return atomWithReducer(initialValue, (prev, next) => {
    if (areEqual(prev, next)) {
      return prev;
    }
    return next;
  });
}
function atomIsWriteable(atom) {
  return Boolean(atom && typeof atom === "object" && "read" in atom && "write" in atom);
}
function isCallback(value) {
  return typeof value === "function";
}
function accessorsFromAtom(atom) {
  return {
    getValue: () => store$1.get(atom),
    setValue: (next) => {
      if (!atomIsWriteable(atom)) {
        throw new Error("Atom is not writeable");
      }
      if (isCallback(next)) {
        store$1.set(atom, next(store$1.get(atom)));
      } else {
        store$1.set(atom, next);
      }
    }
  };
}

defineChain({
  id: 216,
  name: "HappyChain Testnet",
  nativeCurrency: {
    name: "Happy",
    symbol: "HAPPY",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ["https://happy-testnet-sepolia.rpc.caldera.xyz/http"],
      webSocket: ["wss://happy-testnet-sepolia.rpc.caldera.xyz/ws"]
    }
  },
  testnet: true
});

function createUUID$1() {
  return crypto.randomUUID();
}

function promiseWithResolvers() {
  let resolve;
  let reject;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return { promise, resolve, reject };
}

class BasePopupProvider extends SafeEventEmitter {
  constructor(windowId) {
    super();
    this.windowId = windowId;
  }
  // === FIELDS ==================================================================================
  inFlightRequests = /* @__PURE__ */ new Map();
  timer = null;
  static POPUP_FEATURES = (
    //
    ["width=400", "height=800", "popup=true", "toolbar=0", "menubar=0"].join(",")
  );
  // === PUBLIC INTERFACE ========================================================================
  /**
   * Sends an EIP-1193 request to the provider.
   */
  async request(args) {
    const key = createUUID$1();
    const { promise, resolve, reject } = promiseWithResolvers();
    const requiresApproval = await this.requiresUserApproval(args) && await this.requestExtraPermissions(args);
    const popup = requiresApproval ? this.openPopupAndAwaitResponse(key, args, this.windowId, config.iframePath) : this.handlePermissionless(key, args);
    this.trackRequest(key, { resolve, reject, popup });
    return promise;
  }
  /**
   * The subclasses must make sure that this method gets called whenever the popup answers a
   * request.
   */
  handleRequestResolution(data) {
    const req = this.inFlightRequests.get(data.key);
    if (!req) {
      console.warn("handleRequestResolution: no request found for key", data.key);
      return;
    }
    const { resolve, reject, popup } = req;
    this.inFlightRequests.delete(data.key);
    popup?.close();
    if (data.error) reject(new GenericProviderRpcError(data.error));
    else resolve(data.payload);
  }
  // === PRIVATE METHODS =========================================================================
  /**
   * Opens a popup window for the user request approval process.
   */
  openPopupAndAwaitResponse(key, args, windowId, baseUrl) {
    const url = new URL("request", baseUrl);
    const opts = {
      windowId,
      key,
      args: btoa(JSON.stringify(args))
    };
    const searchParams = new URLSearchParams(opts).toString();
    const popup = window.open(`${url}?${searchParams}`, "_blank", BasePopupProvider.POPUP_FEATURES);
    return popup ?? void 0;
  }
  /**
   * Adds a request to the set of in-flight requests. The request is associated with a unique
   * key and will be tracked until it is either resolved or rejected. If the request involves a
   * popup, the popup is also periodically checked for closure.
   */
  trackRequest(requestKey, { resolve, reject, popup }) {
    this.inFlightRequests.set(requestKey, { resolve, reject, popup });
    if (!popup || this.timer) return;
    this.timer = setInterval(() => {
      let withPopups = 0;
      for (const [k, req] of this.inFlightRequests) {
        if (!req.popup) continue;
        if (req.popup.closed) {
          req.reject(new EIP1193UserRejectedRequestError());
          this.inFlightRequests.delete(k);
        } else {
          withPopups++;
        }
      }
      if (this.timer && withPopups === 0) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }, 100);
  }
}

const cssStyles = ":host{all:unset!important}iframe{top:0;right:0;margin:1rem;position:fixed;overflow:hidden;transition:0s;border-radius:.75rem;transition-timing-function:ease-out;&.closed{&.disconnected{height:0;width:0}&.connected{height:4rem;width:12rem}}&.open{&.connected{height:32rem;width:24rem}}&.connecting{height:4rem;margin:1rem;transition:0s;width:12rem}&.modal{border-radius:0;height:100dvh;margin:0;padding:0;transition:0s;width:100dvw}}@media (max-width: 640px){iframe{margin:0rem;&.connected.open{max-height:80vh;width:90vh}}}";

function createUUID() {
  return crypto.randomUUID();
}

const store = createStore();
class InjectedWalletHandler extends SafeEventEmitter {
  constructor(config) {
    super();
    this.config = config;
    config.msgBus.on(Msgs.InjectedWalletRequestConnect, this.handleProviderConnectionRequest.bind(this));
  }
  localConnection;
  isConnected() {
    return Boolean(this.localConnection);
  }
  async request(args) {
    if (!this.localConnection) {
      throw new Error("Can not make request through local connection");
    }
    if (requestPayloadIsHappyMethod(args)) {
      throw new Error("Injected providers can't yet make happy_ requests");
    }
    const response = await this.localConnection.provider.request(args);
    if (isPermissionsRequest(args)) {
      this.proxyPermissions({ request: args, response });
    }
    return response;
  }
  proxyPermissions(params) {
    void this.config.msgBus.emit(Msgs.MirrorPermissions, params);
  }
  /** Injected Wallet Handlers */
  async handleProviderDisconnectionRequest() {
    void this.config.msgBus.emit(Msgs.InjectedWalletConnected, { rdns: void 0, address: void 0 });
    this.localConnection = void 0;
  }
  async handleProviderConnectionRequest({ rdns }) {
    if (!rdns) {
      return this.handleProviderDisconnectionRequest();
    }
    try {
      const providerDetails = store.findProvider({ rdns });
      if (!providerDetails) {
        return this.handleProviderDisconnectionRequest();
      }
      providerDetails.provider.on("accountsChanged", (accounts) => {
        this.emit("accountsChanged", accounts);
        if (!accounts.length) {
          return this.handleProviderDisconnectionRequest();
        }
        const [address2] = accounts;
        this.config.msgBus.emit(Msgs.InjectedWalletConnected, { rdns, address: address2 });
      });
      providerDetails.provider.on("chainChanged", (chainId) => this.emit("chainChanged", chainId));
      providerDetails.provider.on(
        "connect",
        (connectInfo) => this.emit("connect", connectInfo)
      );
      providerDetails.provider.on("disconnect", (error) => this.emit("disconnect", error));
      providerDetails.provider.on("message", (message) => this.emit("message", message));
      const [address] = await providerDetails.provider.request({ method: "eth_requestAccounts" });
      this.localConnection = providerDetails;
      void this.config.msgBus.emit(Msgs.InjectedWalletConnected, { rdns, address });
    } catch {
      void this.handleProviderDisconnectionRequest();
    }
  }
}

class SocialWalletHandler extends BasePopupProvider {
  constructor(config) {
    super(config.windowId);
    this.config = config;
    config.msgBus.on(Msgs.UserChanged, (_user) => {
      this.user = _user;
    });
    config.msgBus.on(Msgs.AuthStateChanged, (_authState) => {
      this.authState = _authState;
    });
    config.providerBus.on(Msgs.ProviderEvent, this.handleProviderNativeEvent.bind(this));
    config.providerBus.on(Msgs.RequestResponse, this.handleRequestResolution.bind(this));
    config.providerBus.on(Msgs.PermissionCheckResponse, this.handlePermissionCheck.bind(this));
  }
  // === SETUP ===================================================================================
  inFlightChecks = /* @__PURE__ */ new Map();
  user;
  authState = AuthState.Connecting;
  async handlePermissionCheck(data) {
    const inFlight = this.inFlightChecks.get(data.key);
    if (!inFlight) return;
    if (typeof data.payload === "boolean") {
      inFlight.resolve(data.payload);
    } else {
      inFlight.reject(data.error);
    }
    this.inFlightChecks.delete(data.key);
  }
  handleProviderNativeEvent(data) {
    this.emit(data.payload.event, data.payload.args);
  }
  // === ABSTRACT METHOD IMPLEMENTATION ==========================================================
  isConnected() {
    return true;
  }
  async requiresUserApproval(args) {
    const key = createUUID();
    const { promise, resolve, reject } = promiseWithResolvers();
    this.inFlightChecks.set(key, { resolve, reject });
    void this.config.providerBus.emit(Msgs.PermissionCheckRequest, {
      key,
      windowId: this.config.windowId,
      payload: args,
      error: null
    });
    return promise;
  }
  handlePermissionless(key, args) {
    void this.config.providerBus.emit(Msgs.RequestPermissionless, {
      key,
      windowId: this.config.windowId,
      error: null,
      payload: args
    });
  }
  /**
   * Requests the user to log in, returns true if that succeeded, false if cancelled or failed.
   */
  async requestLogin() {
    void this.config.msgBus.emit(Msgs.RequestDisplay, ModalStates.Login);
    const { promise, resolve } = promiseWithResolvers();
    const key = createUUID();
    const unsubscribeClose = this.config.msgBus.on(Msgs.ModalToggle, (state) => {
      if (state.isOpen) return;
      unsubscribeClose();
      if (state.cancelled) {
        unsubscribeSuccess();
        this.inFlightChecks.delete(key);
        resolve(false);
      }
    });
    const unsubscribeSuccess = this.config.msgBus.on(Msgs.UserChanged, (user) => {
      if (!user) return;
      resolve(true);
      unsubscribeSuccess();
      unsubscribeClose();
    });
    return promise;
  }
  async requestExtraPermissions(args) {
    if (this.user) return true;
    const isConnectionRequest = args.method === "eth_requestAccounts" || args.method === "wallet_requestPermissions" && args.params.find((p) => p.eth_accounts);
    if (this.authState === AuthState.Disconnected) {
      const loggedIn = await this.requestLogin();
      if (!loggedIn) throw new EIP1193UserRejectedRequestError();
    } else if (!this.user) {
      if (isConnectionRequest) return true;
      await this.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }]
      });
    }
    const onlyConnectionRequested = args.method === "eth_requestAccounts" || args.method === "wallet_requestPermissions" && args.params.length === 1 && "eth_accounts" in Object.keys(args.params[0]);
    if (onlyConnectionRequested) return false;
    if (args.method === "wallet_requestPermissions") {
      return await this.requiresUserApproval(args);
    }
    return true;
  }
}

class HappyProvider extends SafeEventEmitter {
  injectedWalletHandler;
  socialWalletHandler;
  authState = AuthState.Connecting;
  constructor(config) {
    super();
    config.logger?.log("EIP1193Provider Created");
    config.msgBus.on(Msgs.AuthStateChanged, (_authState) => {
      this.authState = _authState;
    });
    this.injectedWalletHandler = new InjectedWalletHandler(config);
    this.registerConnectionHandlerEvents(this.injectedWalletHandler);
    this.socialWalletHandler = new SocialWalletHandler(config);
    this.registerConnectionHandlerEvents(this.socialWalletHandler);
  }
  async request(args) {
    if (this.authState === AuthState.Connecting) {
      await waitForCondition(() => this.authState !== AuthState.Connecting);
    }
    if (this.injectedWalletHandler.isConnected()) {
      return await this.injectedWalletHandler.request(args);
    }
    return await this.socialWalletHandler.request(args);
  }
  /** Simply forward all provider events transparently */
  registerConnectionHandlerEvents(handler) {
    handler.on("accountsChanged", (accounts) => this.emit("accountsChanged", accounts));
    handler.on("chainChanged", (chainId) => this.emit("chainChanged", chainId));
    handler.on("connect", (connectInfo) => this.emit("connect", connectInfo));
    handler.on("disconnect", (error) => this.emit("disconnect", error));
    handler.on("message", (message) => this.emit("message", message));
  }
}

const icon64x64 = "data:image/png;base64,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";

var StorageKey = /* @__PURE__ */ ((StorageKey2) => {
  StorageKey2["HappyUser"] = "happychain:user";
  StorageKey2["Chains"] = "happychain:supported_chains";
  StorageKey2["UserPermissions"] = "happychain:user_permissions";
  return StorageKey2;
})(StorageKey || {});
const storage = createStorage();

const baseUserAtom = atomWithCompare(
  void 0,
  (a, b) => a?.uid === b?.uid
);
const userAtom = atom(
  (get) => get(baseUserAtom),
  (_get, set, newUser) => {
    if (newUser?.address) {
      const formattedUser = formatUser(newUser);
      set(baseUserAtom, formattedUser);
      storage.set(StorageKey.HappyUser, newUser);
    } else {
      set(baseUserAtom, void 0);
      storage.remove(StorageKey.HappyUser);
    }
  }
);
const { getValue: getUser, setValue: setUser } = accessorsFromAtom(userAtom);
function formatUser(user) {
  return {
    ...user,
    address: getAddress(user.address),
    addresses: user.addresses.map(getAddress)
  };
}

function registerListeners(messageBus) {
  const onUserUpdateCallbacks = /* @__PURE__ */ new Set();
  const onModalUpdateCallbacks = /* @__PURE__ */ new Set();
  const onIframeInitCallbacks = /* @__PURE__ */ new Set();
  const onAuthStateUpdateCallbacks = /* @__PURE__ */ new Set();
  messageBus.on(Msgs.UserChanged, (user) => {
    for (const call of onUserUpdateCallbacks) {
      call(user);
    }
  });
  messageBus.on(Msgs.AuthStateChanged, (state) => {
    for (const call of onAuthStateUpdateCallbacks) {
      call(state);
    }
  });
  messageBus.on(Msgs.ModalToggle, ({ isOpen, cancelled }) => {
    for (const call of onModalUpdateCallbacks) {
      call({ isOpen, cancelled });
    }
  });
  messageBus.on(Msgs.IframeInit, (isInit) => {
    for (const call of onIframeInitCallbacks) {
      call(isInit);
    }
  });
  const onUserUpdate = (callback) => {
    onUserUpdateCallbacks.add(callback);
    const currentUser = getUser();
    if (currentUser) {
      void Promise.resolve().then(() => {
        callback(currentUser);
      });
    }
    return () => {
      onUserUpdateCallbacks.delete(callback);
    };
  };
  const onModalUpdate = (callback) => {
    onModalUpdateCallbacks.add(callback);
    return () => {
      onModalUpdateCallbacks.delete(callback);
    };
  };
  const onAuthStateUpdate = (callback) => {
    onAuthStateUpdateCallbacks.add(callback);
    return () => {
      onAuthStateUpdateCallbacks.delete(callback);
    };
  };
  const onIframeInit = (callback) => {
    onIframeInitCallbacks.add(callback);
    return () => {
      onIframeInitCallbacks.delete(callback);
    };
  };
  return {
    onUserUpdate,
    onModalUpdate,
    onAuthStateUpdate,
    onIframeInit
  };
}

const windowId = createUUID();
const iframeMessageBus = new EventBus({
  mode: EventBusMode.AppPort,
  scope: "happy-chain-dapp-bus"
});
const { onUserUpdate, onModalUpdate, onAuthStateUpdate, onIframeInit } = registerListeners(iframeMessageBus);
let iframeReady = false;
onIframeInit((ready) => {
  iframeReady = ready;
});
let user;
onUserUpdate((_user) => {
  user = _user;
});
function getCurrentUser() {
  if (!iframeReady) {
    console.warn("getCurrentUser was called before happychain-sdk was ready. result will be empty");
  }
  return user;
}
const happyProvider = new HappyProvider({
  iframePath: config.iframePath,
  windowId,
  providerBus: new EventBus({
    mode: EventBusMode.AppPort,
    scope: "happy-chain-eip1193-provider"
  }),
  msgBus: iframeMessageBus
  // Cast to EIP1193 provider for compatibility with Viem/Wagmi.
  // In practice the 'request' functions are compatible, but the types don't line up for now.
});
const happyProviderPublic = happyProvider;
const connect = async () => {
  await happyProvider.request({
    method: "wallet_requestPermissions",
    params: [{ eth_accounts: {} }]
  });
};
const disconnect = async () => {
  await happyProvider.request({
    method: "wallet_revokePermissions",
    params: [{ eth_accounts: {} }]
  });
};
announceProvider({
  info: {
    icon: icon64x64,
    name: "HappyWallet",
    rdns: "tech.happy",
    uuid: createUUID()
  },
  provider: happyProvider
});
const showSendScreen = () => {
  void iframeMessageBus.emit(Msgs.RequestDisplay, ModalStates.Send);
};

function filterUndefinedValues(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v));
}
function onErrorHandler() {
  console.error("HappyChain SDK failed to initialize");
}
function HappyWallet({ windowId, chain, rpcUrl }) {
  const [authState, setAuthState] = useState(AuthState.Connecting);
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => onModalUpdate((state) => setIsOpen(state.isOpen)), []);
  useEffect(() => onAuthStateUpdate(setAuthState), []);
  useEffect(() => {
    const openHandler = () => isOpen && setIsOpen(false);
    document.addEventListener("click", openHandler);
    return () => document.removeEventListener("click", openHandler);
  }, [isOpen]);
  const url = new URL("embed", config.iframePath);
  const searchParams = new URLSearchParams(
    filterUndefinedValues({
      windowId,
      chain,
      "rpc-urls": rpcUrl
    })
  ).toString();
  const connected = authState === AuthState.Connected;
  const connecting = authState === AuthState.Connecting;
  const disconnected = authState === AuthState.Disconnected;
  const classes = {
    // never open while connecting
    open: isOpen && !connecting,
    closed: !isOpen || connecting,
    connected,
    disconnected,
    connecting,
    // show login modal mode when connecting or disconnected
    modal: !connected && isOpen
  };
  const iframePermissions = navigator.userAgent.includes("Firefox") ? "" : "; clipboard-write 'src'";
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("style", { children: cssStyles }),
    /* @__PURE__ */ jsx(
      "iframe",
      {
        title: "happy-iframe",
        onError: onErrorHandler,
        src: `${url.href}?${searchParams}`,
        className: clsx(classes),
        style: { border: "none" },
        allow: iframePermissions
      }
    )
  ] });
}

const defaultOptions = {
  chain: defaultChain$1
};
function register(opts = {}) {
  if (customElements.get("happy-wallet") || document.querySelector("happy-wallet")) {
    return;
  }
  const options = { ...defaultOptions, ...opts };
  if (!options.chain) {
    throw new Error("Missing chain");
  }
  define(HappyWallet, "happy-wallet", [], { shadow: true });
  const wallet = document.createElement("happy-wallet");
  wallet.setAttribute("window-id", windowId);
  if (options.chain) wallet.setAttribute("chain", JSON.stringify(options.chain));
  if (options.rpcUrl)
    wallet.setAttribute("rpc-url", Array.isArray(options.rpcUrl) ? options.rpcUrl.join(",") : options.rpcUrl);
  document.body.appendChild(wallet);
}

const devnet = devnet$1;
const testnet = happyChainSepolia;
const defaultChain = defaultChain$1;

const _chains = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    defaultChain,
    devnet,
    testnet
}, Symbol.toStringTag, { value: 'Module' }));

const chains = { ..._chains };

export { chains, connect, disconnect, getCurrentUser, happyProviderPublic as happyProvider, onModalUpdate, onUserUpdate, register, showSendScreen };
