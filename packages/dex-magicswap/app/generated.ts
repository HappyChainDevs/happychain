import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ERC1155
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const erc1155Abi = [
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'operator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'approved', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'ApprovalForAll',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Paused',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'previousAdminRole',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      {
        name: 'newAdminRole',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
    ],
    name: 'RoleAdminChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'RoleGranted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32', indexed: true },
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'RoleRevoked',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'operator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'ids',
        internalType: 'uint256[]',
        type: 'uint256[]',
        indexed: false,
      },
      {
        name: 'values',
        internalType: 'uint256[]',
        type: 'uint256[]',
        indexed: false,
      },
    ],
    name: 'TransferBatch',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'operator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: false },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'TransferSingle',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'value', internalType: 'string', type: 'string', indexed: false },
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: true },
    ],
    name: 'URI',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Unpaused',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DEFAULT_ADMIN_ROLE',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MINTER_ROLE',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PAUSER_ROLE',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'id', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'accounts', internalType: 'address[]', type: 'address[]' },
      { name: 'ids', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'balanceOfBatch',
    outputs: [{ name: '', internalType: 'uint256[]', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'burn',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'ids', internalType: 'uint256[]', type: 'uint256[]' },
      { name: 'values', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    name: 'burnBatch',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'role', internalType: 'bytes32', type: 'bytes32' }],
    name: 'getRoleAdmin',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'index', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getRoleMember',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'role', internalType: 'bytes32', type: 'bytes32' }],
    name: 'getRoleMemberCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'hasRole',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'operator', internalType: 'address', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'ids', internalType: 'uint256[]', type: 'uint256[]' },
      { name: 'amounts', internalType: 'uint256[]', type: 'uint256[]' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'mintBatch',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'renounceRole',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'role', internalType: 'bytes32', type: 'bytes32' },
      { name: 'account', internalType: 'address', type: 'address' },
    ],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'ids', internalType: 'uint256[]', type: 'uint256[]' },
      { name: 'amounts', internalType: 'uint256[]', type: 'uint256[]' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'safeBatchTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'approved', internalType: 'bool', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'uri',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ERC20
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const erc20Abi = [
  {
    type: 'event',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'spender', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
    name: 'Transfer',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'decimals',
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSupply',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'sender', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ERC721
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const erc721Abi = [
  {
    type: 'event',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'spender', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'operator', type: 'address', indexed: true },
      { name: 'approved', type: 'bool', indexed: false },
    ],
    name: 'ApprovalForAll',
  },
  {
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
    name: 'Transfer',
  },
  {
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getApproved',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'operator', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: 'owner', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'id', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'index', type: 'uint256' }],
    name: 'tokenByIndex',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    name: 'tokenByIndex',
    outputs: [{ name: 'tokenId', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSupply',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'sender', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'tokeId', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'payable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MagicSwapV2Router
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const magicSwapV2RouterAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_factory', internalType: 'address', type: 'address' },
      { name: '_WETH', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'error', inputs: [], name: 'MagicSwapV2InvalidPath' },
  { type: 'error', inputs: [], name: 'MagicSwapV2WrongAmountADeposited' },
  { type: 'error', inputs: [], name: 'MagicSwapV2WrongAmountBDeposited' },
  { type: 'error', inputs: [], name: 'MagicSwapV2WrongAmountDeposited' },
  { type: 'error', inputs: [], name: 'MagicSwapV2WrongAmounts' },
  { type: 'error', inputs: [], name: 'UniswapV2RouterExcessiveInputAmount' },
  { type: 'error', inputs: [], name: 'UniswapV2RouterExpired' },
  { type: 'error', inputs: [], name: 'UniswapV2RouterInsufficientAAmount' },
  { type: 'error', inputs: [], name: 'UniswapV2RouterInsufficientBAmount' },
  {
    type: 'error',
    inputs: [],
    name: 'UniswapV2RouterInsufficientOutputAmount',
  },
  { type: 'error', inputs: [], name: 'UniswapV2RouterInvalidPath' },
  {
    type: 'error',
    inputs: [],
    name: 'UniswapV2RouterOnlyAcceptETHViaFallbackFromWETHContract',
  },
  { type: 'error', inputs: [], name: 'UnsupportedNft' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'pair',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'vault',
        internalType: 'struct IMagicSwapV2Router.NftVaultLiquidityData',
        type: 'tuple',
        components: [
          {
            name: 'token',
            internalType: 'contract INftVault',
            type: 'address',
          },
          { name: 'collection', internalType: 'address[]', type: 'address[]' },
          { name: 'tokenId', internalType: 'uint256[]', type: 'uint256[]' },
          { name: 'amount', internalType: 'uint256[]', type: 'uint256[]' },
        ],
        indexed: false,
      },
    ],
    name: 'NFTLiquidityAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'pair',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'vault',
        internalType: 'struct IMagicSwapV2Router.NftVaultLiquidityData',
        type: 'tuple',
        components: [
          {
            name: 'token',
            internalType: 'contract INftVault',
            type: 'address',
          },
          { name: 'collection', internalType: 'address[]', type: 'address[]' },
          { name: 'tokenId', internalType: 'uint256[]', type: 'uint256[]' },
          { name: 'amount', internalType: 'uint256[]', type: 'uint256[]' },
        ],
        indexed: false,
      },
    ],
    name: 'NFTLiquidityRemoved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'pair',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'vaultA',
        internalType: 'struct IMagicSwapV2Router.NftVaultLiquidityData',
        type: 'tuple',
        components: [
          {
            name: 'token',
            internalType: 'contract INftVault',
            type: 'address',
          },
          { name: 'collection', internalType: 'address[]', type: 'address[]' },
          { name: 'tokenId', internalType: 'uint256[]', type: 'uint256[]' },
          { name: 'amount', internalType: 'uint256[]', type: 'uint256[]' },
        ],
        indexed: false,
      },
      {
        name: 'vaultB',
        internalType: 'struct IMagicSwapV2Router.NftVaultLiquidityData',
        type: 'tuple',
        components: [
          {
            name: 'token',
            internalType: 'contract INftVault',
            type: 'address',
          },
          { name: 'collection', internalType: 'address[]', type: 'address[]' },
          { name: 'tokenId', internalType: 'uint256[]', type: 'uint256[]' },
          { name: 'amount', internalType: 'uint256[]', type: 'uint256[]' },
        ],
        indexed: false,
      },
    ],
    name: 'NFTNFTLiquidityAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'pair',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'vaultA',
        internalType: 'struct IMagicSwapV2Router.NftVaultLiquidityData',
        type: 'tuple',
        components: [
          {
            name: 'token',
            internalType: 'contract INftVault',
            type: 'address',
          },
          { name: 'collection', internalType: 'address[]', type: 'address[]' },
          { name: 'tokenId', internalType: 'uint256[]', type: 'uint256[]' },
          { name: 'amount', internalType: 'uint256[]', type: 'uint256[]' },
        ],
        indexed: false,
      },
      {
        name: 'vaultB',
        internalType: 'struct IMagicSwapV2Router.NftVaultLiquidityData',
        type: 'tuple',
        components: [
          {
            name: 'token',
            internalType: 'contract INftVault',
            type: 'address',
          },
          { name: 'collection', internalType: 'address[]', type: 'address[]' },
          { name: 'tokenId', internalType: 'uint256[]', type: 'uint256[]' },
          { name: 'amount', internalType: 'uint256[]', type: 'uint256[]' },
        ],
        indexed: false,
      },
    ],
    name: 'NFTNFTLiquidityRemoved',
  },
  {
    type: 'function',
    inputs: [],
    name: 'BURN_ADDRESS',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ONE',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'WETH',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tokenA', internalType: 'address', type: 'address' },
      { name: 'tokenB', internalType: 'address', type: 'address' },
      { name: 'amountADesired', internalType: 'uint256', type: 'uint256' },
      { name: 'amountBDesired', internalType: 'uint256', type: 'uint256' },
      { name: 'amountAMin', internalType: 'uint256', type: 'uint256' },
      { name: 'amountBMin', internalType: 'uint256', type: 'uint256' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'addLiquidity',
    outputs: [
      { name: 'amountA', internalType: 'uint256', type: 'uint256' },
      { name: 'amountB', internalType: 'uint256', type: 'uint256' },
      { name: 'liquidity', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amountTokenDesired', internalType: 'uint256', type: 'uint256' },
      { name: 'amountTokenMin', internalType: 'uint256', type: 'uint256' },
      { name: 'amountETHMin', internalType: 'uint256', type: 'uint256' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'addLiquidityETH',
    outputs: [
      { name: 'amountToken', internalType: 'uint256', type: 'uint256' },
      { name: 'amountETH', internalType: 'uint256', type: 'uint256' },
      { name: 'liquidity', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_vault',
        internalType: 'struct IMagicSwapV2Router.NftVaultLiquidityData',
        type: 'tuple',
        components: [
          {
            name: 'token',
            internalType: 'contract INftVault',
            type: 'address',
          },
          { name: 'collection', internalType: 'address[]', type: 'address[]' },
          { name: 'tokenId', internalType: 'uint256[]', type: 'uint256[]' },
          { name: 'amount', internalType: 'uint256[]', type: 'uint256[]' },
        ],
      },
      { name: '_tokenB', internalType: 'address', type: 'address' },
      { name: '_amountBDesired', internalType: 'uint256', type: 'uint256' },
      { name: '_amountBMin', internalType: 'uint256', type: 'uint256' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'addLiquidityNFT',
    outputs: [
      { name: 'amountA', internalType: 'uint256', type: 'uint256' },
      { name: 'amountB', internalType: 'uint256', type: 'uint256' },
      { name: 'lpAmount', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_vault',
        internalType: 'struct IMagicSwapV2Router.NftVaultLiquidityData',
        type: 'tuple',
        components: [
          {
            name: 'token',
            internalType: 'contract INftVault',
            type: 'address',
          },
          { name: 'collection', internalType: 'address[]', type: 'address[]' },
          { name: 'tokenId', internalType: 'uint256[]', type: 'uint256[]' },
          { name: 'amount', internalType: 'uint256[]', type: 'uint256[]' },
        ],
      },
      { name: '_amountETHMin', internalType: 'uint256', type: 'uint256' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'addLiquidityNFTETH',
    outputs: [
      { name: 'amountToken', internalType: 'uint256', type: 'uint256' },
      { name: 'amountETH', internalType: 'uint256', type: 'uint256' },
      { name: 'lpAmount', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_vaultA',
        internalType: 'struct IMagicSwapV2Router.NftVaultLiquidityData',
        type: 'tuple',
        components: [
          {
            name: 'token',
            internalType: 'contract INftVault',
            type: 'address',
          },
          { name: 'collection', internalType: 'address[]', type: 'address[]' },
          { name: 'tokenId', internalType: 'uint256[]', type: 'uint256[]' },
          { name: 'amount', internalType: 'uint256[]', type: 'uint256[]' },
        ],
      },
      {
        name: '_vaultB',
        internalType: 'struct IMagicSwapV2Router.NftVaultLiquidityData',
        type: 'tuple',
        components: [
          {
            name: 'token',
            internalType: 'contract INftVault',
            type: 'address',
          },
          { name: 'collection', internalType: 'address[]', type: 'address[]' },
          { name: 'tokenId', internalType: 'uint256[]', type: 'uint256[]' },
          { name: 'amount', internalType: 'uint256[]', type: 'uint256[]' },
        ],
      },
      { name: '_amountAMin', internalType: 'uint256', type: 'uint256' },
      { name: '_amountBMin', internalType: 'uint256', type: 'uint256' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'addLiquidityNFTNFT',
    outputs: [
      { name: 'amountA', internalType: 'uint256', type: 'uint256' },
      { name: 'amountB', internalType: 'uint256', type: 'uint256' },
      { name: 'lpAmount', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_collection', internalType: 'address[]', type: 'address[]' },
      { name: '_tokenId', internalType: 'uint256[]', type: 'uint256[]' },
      { name: '_amount', internalType: 'uint256[]', type: 'uint256[]' },
      { name: '_vault', internalType: 'contract INftVault', type: 'address' },
      { name: '_to', internalType: 'address', type: 'address' },
    ],
    name: 'depositVault',
    outputs: [
      { name: 'amountMinted', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'factory',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amountOut', internalType: 'uint256', type: 'uint256' },
      { name: 'reserveIn', internalType: 'uint256', type: 'uint256' },
      { name: 'reserveOut', internalType: 'uint256', type: 'uint256' },
      { name: 'pair', internalType: 'address', type: 'address' },
    ],
    name: 'getAmountIn',
    outputs: [{ name: 'amountIn', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amountIn', internalType: 'uint256', type: 'uint256' },
      { name: 'reserveIn', internalType: 'uint256', type: 'uint256' },
      { name: 'reserveOut', internalType: 'uint256', type: 'uint256' },
      { name: 'pair', internalType: 'address', type: 'address' },
    ],
    name: 'getAmountOut',
    outputs: [{ name: 'amountOut', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amountOut', internalType: 'uint256', type: 'uint256' },
      { name: 'path', internalType: 'address[]', type: 'address[]' },
    ],
    name: 'getAmountsIn',
    outputs: [
      { name: 'amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amountIn', internalType: 'uint256', type: 'uint256' },
      { name: 'path', internalType: 'address[]', type: 'address[]' },
    ],
    name: 'getAmountsOut',
    outputs: [
      { name: 'amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amountA', internalType: 'uint256', type: 'uint256' },
      { name: 'reserveA', internalType: 'uint256', type: 'uint256' },
      { name: 'reserveB', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'quote',
    outputs: [{ name: 'amountB', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'pure',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tokenA', internalType: 'address', type: 'address' },
      { name: 'tokenB', internalType: 'address', type: 'address' },
      { name: 'liquidity', internalType: 'uint256', type: 'uint256' },
      { name: 'amountAMin', internalType: 'uint256', type: 'uint256' },
      { name: 'amountBMin', internalType: 'uint256', type: 'uint256' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'removeLiquidity',
    outputs: [
      { name: 'amountA', internalType: 'uint256', type: 'uint256' },
      { name: 'amountB', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'liquidity', internalType: 'uint256', type: 'uint256' },
      { name: 'amountTokenMin', internalType: 'uint256', type: 'uint256' },
      { name: 'amountETHMin', internalType: 'uint256', type: 'uint256' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'removeLiquidityETH',
    outputs: [
      { name: 'amountToken', internalType: 'uint256', type: 'uint256' },
      { name: 'amountETH', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'liquidity', internalType: 'uint256', type: 'uint256' },
      { name: 'amountTokenMin', internalType: 'uint256', type: 'uint256' },
      { name: 'amountETHMin', internalType: 'uint256', type: 'uint256' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
      { name: 'approveMax', internalType: 'bool', type: 'bool' },
      { name: 'v', internalType: 'uint8', type: 'uint8' },
      { name: 'r', internalType: 'bytes32', type: 'bytes32' },
      { name: 's', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'removeLiquidityETHWithPermit',
    outputs: [
      { name: 'amountToken', internalType: 'uint256', type: 'uint256' },
      { name: 'amountETH', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_vault',
        internalType: 'struct IMagicSwapV2Router.NftVaultLiquidityData',
        type: 'tuple',
        components: [
          {
            name: 'token',
            internalType: 'contract INftVault',
            type: 'address',
          },
          { name: 'collection', internalType: 'address[]', type: 'address[]' },
          { name: 'tokenId', internalType: 'uint256[]', type: 'uint256[]' },
          { name: 'amount', internalType: 'uint256[]', type: 'uint256[]' },
        ],
      },
      { name: '_tokenB', internalType: 'address', type: 'address' },
      { name: '_lpAmount', internalType: 'uint256', type: 'uint256' },
      { name: '_amountAMin', internalType: 'uint256', type: 'uint256' },
      { name: '_amountBMin', internalType: 'uint256', type: 'uint256' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_deadline', internalType: 'uint256', type: 'uint256' },
      { name: '_swapLeftover', internalType: 'bool', type: 'bool' },
    ],
    name: 'removeLiquidityNFT',
    outputs: [
      { name: 'amountA', internalType: 'uint256', type: 'uint256' },
      { name: 'amountB', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_vault',
        internalType: 'struct IMagicSwapV2Router.NftVaultLiquidityData',
        type: 'tuple',
        components: [
          {
            name: 'token',
            internalType: 'contract INftVault',
            type: 'address',
          },
          { name: 'collection', internalType: 'address[]', type: 'address[]' },
          { name: 'tokenId', internalType: 'uint256[]', type: 'uint256[]' },
          { name: 'amount', internalType: 'uint256[]', type: 'uint256[]' },
        ],
      },
      { name: '_lpAmount', internalType: 'uint256', type: 'uint256' },
      { name: '_amountTokenMin', internalType: 'uint256', type: 'uint256' },
      { name: '_amountETHMin', internalType: 'uint256', type: 'uint256' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_deadline', internalType: 'uint256', type: 'uint256' },
      { name: '_swapLeftover', internalType: 'bool', type: 'bool' },
    ],
    name: 'removeLiquidityNFTETH',
    outputs: [
      { name: 'amountToken', internalType: 'uint256', type: 'uint256' },
      { name: 'amountETH', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_vaultA',
        internalType: 'struct IMagicSwapV2Router.NftVaultLiquidityData',
        type: 'tuple',
        components: [
          {
            name: 'token',
            internalType: 'contract INftVault',
            type: 'address',
          },
          { name: 'collection', internalType: 'address[]', type: 'address[]' },
          { name: 'tokenId', internalType: 'uint256[]', type: 'uint256[]' },
          { name: 'amount', internalType: 'uint256[]', type: 'uint256[]' },
        ],
      },
      {
        name: '_vaultB',
        internalType: 'struct IMagicSwapV2Router.NftVaultLiquidityData',
        type: 'tuple',
        components: [
          {
            name: 'token',
            internalType: 'contract INftVault',
            type: 'address',
          },
          { name: 'collection', internalType: 'address[]', type: 'address[]' },
          { name: 'tokenId', internalType: 'uint256[]', type: 'uint256[]' },
          { name: 'amount', internalType: 'uint256[]', type: 'uint256[]' },
        ],
      },
      { name: '_lpAmount', internalType: 'uint256', type: 'uint256' },
      { name: '_amountAMin', internalType: 'uint256', type: 'uint256' },
      { name: '_amountBMin', internalType: 'uint256', type: 'uint256' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'removeLiquidityNFTNFT',
    outputs: [
      { name: 'amountA', internalType: 'uint256', type: 'uint256' },
      { name: 'amountB', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tokenA', internalType: 'address', type: 'address' },
      { name: 'tokenB', internalType: 'address', type: 'address' },
      { name: 'liquidity', internalType: 'uint256', type: 'uint256' },
      { name: 'amountAMin', internalType: 'uint256', type: 'uint256' },
      { name: 'amountBMin', internalType: 'uint256', type: 'uint256' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
      { name: 'approveMax', internalType: 'bool', type: 'bool' },
      { name: 'v', internalType: 'uint8', type: 'uint8' },
      { name: 'r', internalType: 'bytes32', type: 'bytes32' },
      { name: 's', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'removeLiquidityWithPermit',
    outputs: [
      { name: 'amountA', internalType: 'uint256', type: 'uint256' },
      { name: 'amountB', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amountOut', internalType: 'uint256', type: 'uint256' },
      { name: 'path', internalType: 'address[]', type: 'address[]' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'swapETHForExactTokens',
    outputs: [
      { name: 'amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_collection', internalType: 'address[]', type: 'address[]' },
      { name: '_tokenId', internalType: 'uint256[]', type: 'uint256[]' },
      { name: '_amount', internalType: 'uint256[]', type: 'uint256[]' },
      { name: '_path', internalType: 'address[]', type: 'address[]' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'swapETHForNft',
    outputs: [
      { name: 'amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amountOutMin', internalType: 'uint256', type: 'uint256' },
      { name: 'path', internalType: 'address[]', type: 'address[]' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'swapExactETHForTokens',
    outputs: [
      { name: 'amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amountIn', internalType: 'uint256', type: 'uint256' },
      { name: 'amountOutMin', internalType: 'uint256', type: 'uint256' },
      { name: 'path', internalType: 'address[]', type: 'address[]' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'swapExactTokensForETH',
    outputs: [
      { name: 'amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amountIn', internalType: 'uint256', type: 'uint256' },
      { name: 'amountOutMin', internalType: 'uint256', type: 'uint256' },
      { name: 'path', internalType: 'address[]', type: 'address[]' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'swapExactTokensForTokens',
    outputs: [
      { name: 'amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_collection', internalType: 'address[]', type: 'address[]' },
      { name: '_tokenId', internalType: 'uint256[]', type: 'uint256[]' },
      { name: '_amount', internalType: 'uint256[]', type: 'uint256[]' },
      { name: '_amountOutMin', internalType: 'uint256', type: 'uint256' },
      { name: '_path', internalType: 'address[]', type: 'address[]' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'swapNftForETH',
    outputs: [
      { name: 'amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_collectionIn', internalType: 'address[]', type: 'address[]' },
      { name: '_tokenIdIn', internalType: 'uint256[]', type: 'uint256[]' },
      { name: '_amountIn', internalType: 'uint256[]', type: 'uint256[]' },
      { name: '_collectionOut', internalType: 'address[]', type: 'address[]' },
      { name: '_tokenIdOut', internalType: 'uint256[]', type: 'uint256[]' },
      { name: '_amountOut', internalType: 'uint256[]', type: 'uint256[]' },
      { name: '_path', internalType: 'address[]', type: 'address[]' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'swapNftForNft',
    outputs: [
      { name: 'amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_collection', internalType: 'address[]', type: 'address[]' },
      { name: '_tokenId', internalType: 'uint256[]', type: 'uint256[]' },
      { name: '_amount', internalType: 'uint256[]', type: 'uint256[]' },
      { name: '_amountOutMin', internalType: 'uint256', type: 'uint256' },
      { name: '_path', internalType: 'address[]', type: 'address[]' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'swapNftForTokens',
    outputs: [
      { name: 'amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amountOut', internalType: 'uint256', type: 'uint256' },
      { name: 'amountInMax', internalType: 'uint256', type: 'uint256' },
      { name: 'path', internalType: 'address[]', type: 'address[]' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'swapTokensForExactETH',
    outputs: [
      { name: 'amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amountOut', internalType: 'uint256', type: 'uint256' },
      { name: 'amountInMax', internalType: 'uint256', type: 'uint256' },
      { name: 'path', internalType: 'address[]', type: 'address[]' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'swapTokensForExactTokens',
    outputs: [
      { name: 'amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_collection', internalType: 'address[]', type: 'address[]' },
      { name: '_tokenId', internalType: 'uint256[]', type: 'uint256[]' },
      { name: '_amount', internalType: 'uint256[]', type: 'uint256[]' },
      { name: '_amountInMax', internalType: 'uint256', type: 'uint256' },
      { name: '_path', internalType: 'address[]', type: 'address[]' },
      { name: '_to', internalType: 'address', type: 'address' },
      { name: '_deadline', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'swapTokensForNft',
    outputs: [
      { name: 'amounts', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_collection', internalType: 'address[]', type: 'address[]' },
      { name: '_tokenId', internalType: 'uint256[]', type: 'uint256[]' },
      { name: '_amount', internalType: 'uint256[]', type: 'uint256[]' },
      { name: '_vault', internalType: 'contract INftVault', type: 'address' },
      { name: '_to', internalType: 'address', type: 'address' },
    ],
    name: 'withdrawVault',
    outputs: [
      { name: 'amountBurned', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'receive', stateMutability: 'payable' },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// UniswapV2Pair
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const uniswapV2PairAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'spender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount0',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'amount1',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
    ],
    name: 'Burn',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'observationCardinalityNextOld',
        internalType: 'uint16',
        type: 'uint16',
        indexed: false,
      },
      {
        name: 'observationCardinalityNextNew',
        internalType: 'uint16',
        type: 'uint16',
        indexed: false,
      },
    ],
    name: 'IncreaseObservationCardinalityNext',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount0',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'amount1',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Mint',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'sender',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount0In',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'amount1In',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'amount0Out',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'amount1Out',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
    ],
    name: 'Swap',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'reserve0',
        internalType: 'uint112',
        type: 'uint112',
        indexed: false,
      },
      {
        name: 'reserve1',
        internalType: 'uint112',
        type: 'uint112',
        indexed: false,
      },
    ],
    name: 'Sync',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Transfer',
  },
  {
    type: 'function',
    inputs: [],
    name: 'BASIS_POINTS',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MINIMUM_LIQUIDITY',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PERMIT_TYPEHASH',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'TOKEN0_DECIMALS',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'spender', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'to', internalType: 'address', type: 'address' }],
    name: 'burn',
    outputs: [
      { name: 'amount0', internalType: 'uint256', type: 'uint256' },
      { name: 'amount1', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', internalType: 'uint8', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'factory',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getReserves',
    outputs: [
      { name: '_reserve0', internalType: 'uint112', type: 'uint112' },
      { name: '_reserve1', internalType: 'uint112', type: 'uint112' },
      { name: '_blockTimestampLast', internalType: 'uint32', type: 'uint32' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_observationCardinalityNext',
        internalType: 'uint16',
        type: 'uint16',
      },
    ],
    name: 'increaseObservationCardinalityNext',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_token0', internalType: 'address', type: 'address' },
      { name: '_token1', internalType: 'address', type: 'address' },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'lastPrice',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'to', internalType: 'address', type: 'address' }],
    name: 'mint',
    outputs: [{ name: 'liquidity', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'nonces',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'observationCardinality',
    outputs: [{ name: '', internalType: 'uint16', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'observationCardinalityNext',
    outputs: [{ name: '', internalType: 'uint16', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'observationIndex',
    outputs: [{ name: '', internalType: 'uint16', type: 'uint16' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'observations',
    outputs: [
      { name: 'blockTimestamp', internalType: 'uint32', type: 'uint32' },
      { name: 'priceCumulative', internalType: 'uint256', type: 'uint256' },
      { name: 'initialized', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'secondsAgos', internalType: 'uint32[]', type: 'uint32[]' },
    ],
    name: 'observe',
    outputs: [
      {
        name: 'priceCumulatives',
        internalType: 'uint256[]',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'spender', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
      { name: 'v', internalType: 'uint8', type: 'uint8' },
      { name: 'r', internalType: 'bytes32', type: 'bytes32' },
      { name: 's', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'permit',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'to', internalType: 'address', type: 'address' }],
    name: 'skim',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amount0Out', internalType: 'uint256', type: 'uint256' },
      { name: 'amount1Out', internalType: 'uint256', type: 'uint256' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: '', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'swap',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'sync',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'token0',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'token1',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc1155Abi}__
 */
export const useReadErc1155 = /*#__PURE__*/ createUseReadContract({
  abi: erc1155Abi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"DEFAULT_ADMIN_ROLE"`
 */
export const useReadErc1155DefaultAdminRole =
  /*#__PURE__*/ createUseReadContract({
    abi: erc1155Abi,
    functionName: 'DEFAULT_ADMIN_ROLE',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"MINTER_ROLE"`
 */
export const useReadErc1155MinterRole = /*#__PURE__*/ createUseReadContract({
  abi: erc1155Abi,
  functionName: 'MINTER_ROLE',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"PAUSER_ROLE"`
 */
export const useReadErc1155PauserRole = /*#__PURE__*/ createUseReadContract({
  abi: erc1155Abi,
  functionName: 'PAUSER_ROLE',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"balanceOf"`
 */
export const useReadErc1155BalanceOf = /*#__PURE__*/ createUseReadContract({
  abi: erc1155Abi,
  functionName: 'balanceOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"balanceOfBatch"`
 */
export const useReadErc1155BalanceOfBatch = /*#__PURE__*/ createUseReadContract(
  { abi: erc1155Abi, functionName: 'balanceOfBatch' },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"getRoleAdmin"`
 */
export const useReadErc1155GetRoleAdmin = /*#__PURE__*/ createUseReadContract({
  abi: erc1155Abi,
  functionName: 'getRoleAdmin',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"getRoleMember"`
 */
export const useReadErc1155GetRoleMember = /*#__PURE__*/ createUseReadContract({
  abi: erc1155Abi,
  functionName: 'getRoleMember',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"getRoleMemberCount"`
 */
export const useReadErc1155GetRoleMemberCount =
  /*#__PURE__*/ createUseReadContract({
    abi: erc1155Abi,
    functionName: 'getRoleMemberCount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"hasRole"`
 */
export const useReadErc1155HasRole = /*#__PURE__*/ createUseReadContract({
  abi: erc1155Abi,
  functionName: 'hasRole',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"isApprovedForAll"`
 */
export const useReadErc1155IsApprovedForAll =
  /*#__PURE__*/ createUseReadContract({
    abi: erc1155Abi,
    functionName: 'isApprovedForAll',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"paused"`
 */
export const useReadErc1155Paused = /*#__PURE__*/ createUseReadContract({
  abi: erc1155Abi,
  functionName: 'paused',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"supportsInterface"`
 */
export const useReadErc1155SupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: erc1155Abi,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"uri"`
 */
export const useReadErc1155Uri = /*#__PURE__*/ createUseReadContract({
  abi: erc1155Abi,
  functionName: 'uri',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc1155Abi}__
 */
export const useWriteErc1155 = /*#__PURE__*/ createUseWriteContract({
  abi: erc1155Abi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"burn"`
 */
export const useWriteErc1155Burn = /*#__PURE__*/ createUseWriteContract({
  abi: erc1155Abi,
  functionName: 'burn',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"burnBatch"`
 */
export const useWriteErc1155BurnBatch = /*#__PURE__*/ createUseWriteContract({
  abi: erc1155Abi,
  functionName: 'burnBatch',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"grantRole"`
 */
export const useWriteErc1155GrantRole = /*#__PURE__*/ createUseWriteContract({
  abi: erc1155Abi,
  functionName: 'grantRole',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"mint"`
 */
export const useWriteErc1155Mint = /*#__PURE__*/ createUseWriteContract({
  abi: erc1155Abi,
  functionName: 'mint',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"mintBatch"`
 */
export const useWriteErc1155MintBatch = /*#__PURE__*/ createUseWriteContract({
  abi: erc1155Abi,
  functionName: 'mintBatch',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"pause"`
 */
export const useWriteErc1155Pause = /*#__PURE__*/ createUseWriteContract({
  abi: erc1155Abi,
  functionName: 'pause',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"renounceRole"`
 */
export const useWriteErc1155RenounceRole = /*#__PURE__*/ createUseWriteContract(
  { abi: erc1155Abi, functionName: 'renounceRole' },
)

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"revokeRole"`
 */
export const useWriteErc1155RevokeRole = /*#__PURE__*/ createUseWriteContract({
  abi: erc1155Abi,
  functionName: 'revokeRole',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"safeBatchTransferFrom"`
 */
export const useWriteErc1155SafeBatchTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: erc1155Abi,
    functionName: 'safeBatchTransferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"safeTransferFrom"`
 */
export const useWriteErc1155SafeTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: erc1155Abi,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"setApprovalForAll"`
 */
export const useWriteErc1155SetApprovalForAll =
  /*#__PURE__*/ createUseWriteContract({
    abi: erc1155Abi,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"unpause"`
 */
export const useWriteErc1155Unpause = /*#__PURE__*/ createUseWriteContract({
  abi: erc1155Abi,
  functionName: 'unpause',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc1155Abi}__
 */
export const useSimulateErc1155 = /*#__PURE__*/ createUseSimulateContract({
  abi: erc1155Abi,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"burn"`
 */
export const useSimulateErc1155Burn = /*#__PURE__*/ createUseSimulateContract({
  abi: erc1155Abi,
  functionName: 'burn',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"burnBatch"`
 */
export const useSimulateErc1155BurnBatch =
  /*#__PURE__*/ createUseSimulateContract({
    abi: erc1155Abi,
    functionName: 'burnBatch',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"grantRole"`
 */
export const useSimulateErc1155GrantRole =
  /*#__PURE__*/ createUseSimulateContract({
    abi: erc1155Abi,
    functionName: 'grantRole',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"mint"`
 */
export const useSimulateErc1155Mint = /*#__PURE__*/ createUseSimulateContract({
  abi: erc1155Abi,
  functionName: 'mint',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"mintBatch"`
 */
export const useSimulateErc1155MintBatch =
  /*#__PURE__*/ createUseSimulateContract({
    abi: erc1155Abi,
    functionName: 'mintBatch',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"pause"`
 */
export const useSimulateErc1155Pause = /*#__PURE__*/ createUseSimulateContract({
  abi: erc1155Abi,
  functionName: 'pause',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"renounceRole"`
 */
export const useSimulateErc1155RenounceRole =
  /*#__PURE__*/ createUseSimulateContract({
    abi: erc1155Abi,
    functionName: 'renounceRole',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"revokeRole"`
 */
export const useSimulateErc1155RevokeRole =
  /*#__PURE__*/ createUseSimulateContract({
    abi: erc1155Abi,
    functionName: 'revokeRole',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"safeBatchTransferFrom"`
 */
export const useSimulateErc1155SafeBatchTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: erc1155Abi,
    functionName: 'safeBatchTransferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"safeTransferFrom"`
 */
export const useSimulateErc1155SafeTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: erc1155Abi,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"setApprovalForAll"`
 */
export const useSimulateErc1155SetApprovalForAll =
  /*#__PURE__*/ createUseSimulateContract({
    abi: erc1155Abi,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc1155Abi}__ and `functionName` set to `"unpause"`
 */
export const useSimulateErc1155Unpause =
  /*#__PURE__*/ createUseSimulateContract({
    abi: erc1155Abi,
    functionName: 'unpause',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc1155Abi}__
 */
export const useWatchErc1155Event = /*#__PURE__*/ createUseWatchContractEvent({
  abi: erc1155Abi,
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc1155Abi}__ and `eventName` set to `"ApprovalForAll"`
 */
export const useWatchErc1155ApprovalForAllEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: erc1155Abi,
    eventName: 'ApprovalForAll',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc1155Abi}__ and `eventName` set to `"Paused"`
 */
export const useWatchErc1155PausedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: erc1155Abi,
    eventName: 'Paused',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc1155Abi}__ and `eventName` set to `"RoleAdminChanged"`
 */
export const useWatchErc1155RoleAdminChangedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: erc1155Abi,
    eventName: 'RoleAdminChanged',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc1155Abi}__ and `eventName` set to `"RoleGranted"`
 */
export const useWatchErc1155RoleGrantedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: erc1155Abi,
    eventName: 'RoleGranted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc1155Abi}__ and `eventName` set to `"RoleRevoked"`
 */
export const useWatchErc1155RoleRevokedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: erc1155Abi,
    eventName: 'RoleRevoked',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc1155Abi}__ and `eventName` set to `"TransferBatch"`
 */
export const useWatchErc1155TransferBatchEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: erc1155Abi,
    eventName: 'TransferBatch',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc1155Abi}__ and `eventName` set to `"TransferSingle"`
 */
export const useWatchErc1155TransferSingleEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: erc1155Abi,
    eventName: 'TransferSingle',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc1155Abi}__ and `eventName` set to `"URI"`
 */
export const useWatchErc1155UriEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: erc1155Abi,
    eventName: 'URI',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc1155Abi}__ and `eventName` set to `"Unpaused"`
 */
export const useWatchErc1155UnpausedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: erc1155Abi,
    eventName: 'Unpaused',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc20Abi}__
 */
export const useReadErc20 = /*#__PURE__*/ createUseReadContract({
  abi: erc20Abi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"allowance"`
 */
export const useReadErc20Allowance = /*#__PURE__*/ createUseReadContract({
  abi: erc20Abi,
  functionName: 'allowance',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"balanceOf"`
 */
export const useReadErc20BalanceOf = /*#__PURE__*/ createUseReadContract({
  abi: erc20Abi,
  functionName: 'balanceOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"decimals"`
 */
export const useReadErc20Decimals = /*#__PURE__*/ createUseReadContract({
  abi: erc20Abi,
  functionName: 'decimals',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"name"`
 */
export const useReadErc20Name = /*#__PURE__*/ createUseReadContract({
  abi: erc20Abi,
  functionName: 'name',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"symbol"`
 */
export const useReadErc20Symbol = /*#__PURE__*/ createUseReadContract({
  abi: erc20Abi,
  functionName: 'symbol',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"totalSupply"`
 */
export const useReadErc20TotalSupply = /*#__PURE__*/ createUseReadContract({
  abi: erc20Abi,
  functionName: 'totalSupply',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc20Abi}__
 */
export const useWriteErc20 = /*#__PURE__*/ createUseWriteContract({
  abi: erc20Abi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"approve"`
 */
export const useWriteErc20Approve = /*#__PURE__*/ createUseWriteContract({
  abi: erc20Abi,
  functionName: 'approve',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"transfer"`
 */
export const useWriteErc20Transfer = /*#__PURE__*/ createUseWriteContract({
  abi: erc20Abi,
  functionName: 'transfer',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"transferFrom"`
 */
export const useWriteErc20TransferFrom = /*#__PURE__*/ createUseWriteContract({
  abi: erc20Abi,
  functionName: 'transferFrom',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc20Abi}__
 */
export const useSimulateErc20 = /*#__PURE__*/ createUseSimulateContract({
  abi: erc20Abi,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"approve"`
 */
export const useSimulateErc20Approve = /*#__PURE__*/ createUseSimulateContract({
  abi: erc20Abi,
  functionName: 'approve',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"transfer"`
 */
export const useSimulateErc20Transfer = /*#__PURE__*/ createUseSimulateContract(
  { abi: erc20Abi, functionName: 'transfer' },
)

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc20Abi}__ and `functionName` set to `"transferFrom"`
 */
export const useSimulateErc20TransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: erc20Abi,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc20Abi}__
 */
export const useWatchErc20Event = /*#__PURE__*/ createUseWatchContractEvent({
  abi: erc20Abi,
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc20Abi}__ and `eventName` set to `"Approval"`
 */
export const useWatchErc20ApprovalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: erc20Abi,
    eventName: 'Approval',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc20Abi}__ and `eventName` set to `"Transfer"`
 */
export const useWatchErc20TransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: erc20Abi,
    eventName: 'Transfer',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc721Abi}__
 */
export const useReadErc721 = /*#__PURE__*/ createUseReadContract({
  abi: erc721Abi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc721Abi}__ and `functionName` set to `"balanceOf"`
 */
export const useReadErc721BalanceOf = /*#__PURE__*/ createUseReadContract({
  abi: erc721Abi,
  functionName: 'balanceOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc721Abi}__ and `functionName` set to `"getApproved"`
 */
export const useReadErc721GetApproved = /*#__PURE__*/ createUseReadContract({
  abi: erc721Abi,
  functionName: 'getApproved',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc721Abi}__ and `functionName` set to `"isApprovedForAll"`
 */
export const useReadErc721IsApprovedForAll =
  /*#__PURE__*/ createUseReadContract({
    abi: erc721Abi,
    functionName: 'isApprovedForAll',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc721Abi}__ and `functionName` set to `"name"`
 */
export const useReadErc721Name = /*#__PURE__*/ createUseReadContract({
  abi: erc721Abi,
  functionName: 'name',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc721Abi}__ and `functionName` set to `"ownerOf"`
 */
export const useReadErc721OwnerOf = /*#__PURE__*/ createUseReadContract({
  abi: erc721Abi,
  functionName: 'ownerOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc721Abi}__ and `functionName` set to `"symbol"`
 */
export const useReadErc721Symbol = /*#__PURE__*/ createUseReadContract({
  abi: erc721Abi,
  functionName: 'symbol',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc721Abi}__ and `functionName` set to `"tokenByIndex"`
 */
export const useReadErc721TokenByIndex = /*#__PURE__*/ createUseReadContract({
  abi: erc721Abi,
  functionName: 'tokenByIndex',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc721Abi}__ and `functionName` set to `"tokenURI"`
 */
export const useReadErc721TokenUri = /*#__PURE__*/ createUseReadContract({
  abi: erc721Abi,
  functionName: 'tokenURI',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link erc721Abi}__ and `functionName` set to `"totalSupply"`
 */
export const useReadErc721TotalSupply = /*#__PURE__*/ createUseReadContract({
  abi: erc721Abi,
  functionName: 'totalSupply',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc721Abi}__
 */
export const useWriteErc721 = /*#__PURE__*/ createUseWriteContract({
  abi: erc721Abi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc721Abi}__ and `functionName` set to `"approve"`
 */
export const useWriteErc721Approve = /*#__PURE__*/ createUseWriteContract({
  abi: erc721Abi,
  functionName: 'approve',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc721Abi}__ and `functionName` set to `"safeTransferFrom"`
 */
export const useWriteErc721SafeTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: erc721Abi,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc721Abi}__ and `functionName` set to `"setApprovalForAll"`
 */
export const useWriteErc721SetApprovalForAll =
  /*#__PURE__*/ createUseWriteContract({
    abi: erc721Abi,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link erc721Abi}__ and `functionName` set to `"transferFrom"`
 */
export const useWriteErc721TransferFrom = /*#__PURE__*/ createUseWriteContract({
  abi: erc721Abi,
  functionName: 'transferFrom',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc721Abi}__
 */
export const useSimulateErc721 = /*#__PURE__*/ createUseSimulateContract({
  abi: erc721Abi,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc721Abi}__ and `functionName` set to `"approve"`
 */
export const useSimulateErc721Approve = /*#__PURE__*/ createUseSimulateContract(
  { abi: erc721Abi, functionName: 'approve' },
)

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc721Abi}__ and `functionName` set to `"safeTransferFrom"`
 */
export const useSimulateErc721SafeTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: erc721Abi,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc721Abi}__ and `functionName` set to `"setApprovalForAll"`
 */
export const useSimulateErc721SetApprovalForAll =
  /*#__PURE__*/ createUseSimulateContract({
    abi: erc721Abi,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link erc721Abi}__ and `functionName` set to `"transferFrom"`
 */
export const useSimulateErc721TransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: erc721Abi,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc721Abi}__
 */
export const useWatchErc721Event = /*#__PURE__*/ createUseWatchContractEvent({
  abi: erc721Abi,
})

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc721Abi}__ and `eventName` set to `"Approval"`
 */
export const useWatchErc721ApprovalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: erc721Abi,
    eventName: 'Approval',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc721Abi}__ and `eventName` set to `"ApprovalForAll"`
 */
export const useWatchErc721ApprovalForAllEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: erc721Abi,
    eventName: 'ApprovalForAll',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link erc721Abi}__ and `eventName` set to `"Transfer"`
 */
export const useWatchErc721TransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: erc721Abi,
    eventName: 'Transfer',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__
 */
export const useReadMagicSwapV2Router = /*#__PURE__*/ createUseReadContract({
  abi: magicSwapV2RouterAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"BURN_ADDRESS"`
 */
export const useReadMagicSwapV2RouterBurnAddress =
  /*#__PURE__*/ createUseReadContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'BURN_ADDRESS',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"ONE"`
 */
export const useReadMagicSwapV2RouterOne = /*#__PURE__*/ createUseReadContract({
  abi: magicSwapV2RouterAbi,
  functionName: 'ONE',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"WETH"`
 */
export const useReadMagicSwapV2RouterWeth = /*#__PURE__*/ createUseReadContract(
  { abi: magicSwapV2RouterAbi, functionName: 'WETH' },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"factory"`
 */
export const useReadMagicSwapV2RouterFactory =
  /*#__PURE__*/ createUseReadContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'factory',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"getAmountIn"`
 */
export const useReadMagicSwapV2RouterGetAmountIn =
  /*#__PURE__*/ createUseReadContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'getAmountIn',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"getAmountOut"`
 */
export const useReadMagicSwapV2RouterGetAmountOut =
  /*#__PURE__*/ createUseReadContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'getAmountOut',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"getAmountsIn"`
 */
export const useReadMagicSwapV2RouterGetAmountsIn =
  /*#__PURE__*/ createUseReadContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'getAmountsIn',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"getAmountsOut"`
 */
export const useReadMagicSwapV2RouterGetAmountsOut =
  /*#__PURE__*/ createUseReadContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'getAmountsOut',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"quote"`
 */
export const useReadMagicSwapV2RouterQuote =
  /*#__PURE__*/ createUseReadContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'quote',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__
 */
export const useWriteMagicSwapV2Router = /*#__PURE__*/ createUseWriteContract({
  abi: magicSwapV2RouterAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"addLiquidity"`
 */
export const useWriteMagicSwapV2RouterAddLiquidity =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'addLiquidity',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"addLiquidityETH"`
 */
export const useWriteMagicSwapV2RouterAddLiquidityEth =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'addLiquidityETH',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"addLiquidityNFT"`
 */
export const useWriteMagicSwapV2RouterAddLiquidityNft =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'addLiquidityNFT',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"addLiquidityNFTETH"`
 */
export const useWriteMagicSwapV2RouterAddLiquidityNfteth =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'addLiquidityNFTETH',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"addLiquidityNFTNFT"`
 */
export const useWriteMagicSwapV2RouterAddLiquidityNftnft =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'addLiquidityNFTNFT',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"depositVault"`
 */
export const useWriteMagicSwapV2RouterDepositVault =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'depositVault',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"removeLiquidity"`
 */
export const useWriteMagicSwapV2RouterRemoveLiquidity =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'removeLiquidity',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"removeLiquidityETH"`
 */
export const useWriteMagicSwapV2RouterRemoveLiquidityEth =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'removeLiquidityETH',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"removeLiquidityETHWithPermit"`
 */
export const useWriteMagicSwapV2RouterRemoveLiquidityEthWithPermit =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'removeLiquidityETHWithPermit',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"removeLiquidityNFT"`
 */
export const useWriteMagicSwapV2RouterRemoveLiquidityNft =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'removeLiquidityNFT',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"removeLiquidityNFTETH"`
 */
export const useWriteMagicSwapV2RouterRemoveLiquidityNfteth =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'removeLiquidityNFTETH',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"removeLiquidityNFTNFT"`
 */
export const useWriteMagicSwapV2RouterRemoveLiquidityNftnft =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'removeLiquidityNFTNFT',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"removeLiquidityWithPermit"`
 */
export const useWriteMagicSwapV2RouterRemoveLiquidityWithPermit =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'removeLiquidityWithPermit',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapETHForExactTokens"`
 */
export const useWriteMagicSwapV2RouterSwapEthForExactTokens =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapETHForExactTokens',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapETHForNft"`
 */
export const useWriteMagicSwapV2RouterSwapEthForNft =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapETHForNft',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapExactETHForTokens"`
 */
export const useWriteMagicSwapV2RouterSwapExactEthForTokens =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapExactETHForTokens',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapExactTokensForETH"`
 */
export const useWriteMagicSwapV2RouterSwapExactTokensForEth =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapExactTokensForETH',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapExactTokensForTokens"`
 */
export const useWriteMagicSwapV2RouterSwapExactTokensForTokens =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapExactTokensForTokens',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapNftForETH"`
 */
export const useWriteMagicSwapV2RouterSwapNftForEth =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapNftForETH',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapNftForNft"`
 */
export const useWriteMagicSwapV2RouterSwapNftForNft =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapNftForNft',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapNftForTokens"`
 */
export const useWriteMagicSwapV2RouterSwapNftForTokens =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapNftForTokens',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapTokensForExactETH"`
 */
export const useWriteMagicSwapV2RouterSwapTokensForExactEth =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapTokensForExactETH',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapTokensForExactTokens"`
 */
export const useWriteMagicSwapV2RouterSwapTokensForExactTokens =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapTokensForExactTokens',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapTokensForNft"`
 */
export const useWriteMagicSwapV2RouterSwapTokensForNft =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapTokensForNft',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"withdrawVault"`
 */
export const useWriteMagicSwapV2RouterWithdrawVault =
  /*#__PURE__*/ createUseWriteContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'withdrawVault',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__
 */
export const useSimulateMagicSwapV2Router =
  /*#__PURE__*/ createUseSimulateContract({ abi: magicSwapV2RouterAbi })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"addLiquidity"`
 */
export const useSimulateMagicSwapV2RouterAddLiquidity =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'addLiquidity',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"addLiquidityETH"`
 */
export const useSimulateMagicSwapV2RouterAddLiquidityEth =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'addLiquidityETH',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"addLiquidityNFT"`
 */
export const useSimulateMagicSwapV2RouterAddLiquidityNft =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'addLiquidityNFT',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"addLiquidityNFTETH"`
 */
export const useSimulateMagicSwapV2RouterAddLiquidityNfteth =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'addLiquidityNFTETH',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"addLiquidityNFTNFT"`
 */
export const useSimulateMagicSwapV2RouterAddLiquidityNftnft =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'addLiquidityNFTNFT',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"depositVault"`
 */
export const useSimulateMagicSwapV2RouterDepositVault =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'depositVault',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"removeLiquidity"`
 */
export const useSimulateMagicSwapV2RouterRemoveLiquidity =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'removeLiquidity',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"removeLiquidityETH"`
 */
export const useSimulateMagicSwapV2RouterRemoveLiquidityEth =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'removeLiquidityETH',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"removeLiquidityETHWithPermit"`
 */
export const useSimulateMagicSwapV2RouterRemoveLiquidityEthWithPermit =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'removeLiquidityETHWithPermit',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"removeLiquidityNFT"`
 */
export const useSimulateMagicSwapV2RouterRemoveLiquidityNft =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'removeLiquidityNFT',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"removeLiquidityNFTETH"`
 */
export const useSimulateMagicSwapV2RouterRemoveLiquidityNfteth =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'removeLiquidityNFTETH',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"removeLiquidityNFTNFT"`
 */
export const useSimulateMagicSwapV2RouterRemoveLiquidityNftnft =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'removeLiquidityNFTNFT',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"removeLiquidityWithPermit"`
 */
export const useSimulateMagicSwapV2RouterRemoveLiquidityWithPermit =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'removeLiquidityWithPermit',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapETHForExactTokens"`
 */
export const useSimulateMagicSwapV2RouterSwapEthForExactTokens =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapETHForExactTokens',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapETHForNft"`
 */
export const useSimulateMagicSwapV2RouterSwapEthForNft =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapETHForNft',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapExactETHForTokens"`
 */
export const useSimulateMagicSwapV2RouterSwapExactEthForTokens =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapExactETHForTokens',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapExactTokensForETH"`
 */
export const useSimulateMagicSwapV2RouterSwapExactTokensForEth =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapExactTokensForETH',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapExactTokensForTokens"`
 */
export const useSimulateMagicSwapV2RouterSwapExactTokensForTokens =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapExactTokensForTokens',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapNftForETH"`
 */
export const useSimulateMagicSwapV2RouterSwapNftForEth =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapNftForETH',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapNftForNft"`
 */
export const useSimulateMagicSwapV2RouterSwapNftForNft =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapNftForNft',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapNftForTokens"`
 */
export const useSimulateMagicSwapV2RouterSwapNftForTokens =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapNftForTokens',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapTokensForExactETH"`
 */
export const useSimulateMagicSwapV2RouterSwapTokensForExactEth =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapTokensForExactETH',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapTokensForExactTokens"`
 */
export const useSimulateMagicSwapV2RouterSwapTokensForExactTokens =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapTokensForExactTokens',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"swapTokensForNft"`
 */
export const useSimulateMagicSwapV2RouterSwapTokensForNft =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'swapTokensForNft',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `functionName` set to `"withdrawVault"`
 */
export const useSimulateMagicSwapV2RouterWithdrawVault =
  /*#__PURE__*/ createUseSimulateContract({
    abi: magicSwapV2RouterAbi,
    functionName: 'withdrawVault',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link magicSwapV2RouterAbi}__
 */
export const useWatchMagicSwapV2RouterEvent =
  /*#__PURE__*/ createUseWatchContractEvent({ abi: magicSwapV2RouterAbi })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `eventName` set to `"NFTLiquidityAdded"`
 */
export const useWatchMagicSwapV2RouterNftLiquidityAddedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: magicSwapV2RouterAbi,
    eventName: 'NFTLiquidityAdded',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `eventName` set to `"NFTLiquidityRemoved"`
 */
export const useWatchMagicSwapV2RouterNftLiquidityRemovedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: magicSwapV2RouterAbi,
    eventName: 'NFTLiquidityRemoved',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `eventName` set to `"NFTNFTLiquidityAdded"`
 */
export const useWatchMagicSwapV2RouterNftnftLiquidityAddedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: magicSwapV2RouterAbi,
    eventName: 'NFTNFTLiquidityAdded',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link magicSwapV2RouterAbi}__ and `eventName` set to `"NFTNFTLiquidityRemoved"`
 */
export const useWatchMagicSwapV2RouterNftnftLiquidityRemovedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: magicSwapV2RouterAbi,
    eventName: 'NFTNFTLiquidityRemoved',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__
 */
export const useReadUniswapV2Pair = /*#__PURE__*/ createUseReadContract({
  abi: uniswapV2PairAbi,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"BASIS_POINTS"`
 */
export const useReadUniswapV2PairBasisPoints =
  /*#__PURE__*/ createUseReadContract({
    abi: uniswapV2PairAbi,
    functionName: 'BASIS_POINTS',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"DOMAIN_SEPARATOR"`
 */
export const useReadUniswapV2PairDomainSeparator =
  /*#__PURE__*/ createUseReadContract({
    abi: uniswapV2PairAbi,
    functionName: 'DOMAIN_SEPARATOR',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"MINIMUM_LIQUIDITY"`
 */
export const useReadUniswapV2PairMinimumLiquidity =
  /*#__PURE__*/ createUseReadContract({
    abi: uniswapV2PairAbi,
    functionName: 'MINIMUM_LIQUIDITY',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"PERMIT_TYPEHASH"`
 */
export const useReadUniswapV2PairPermitTypehash =
  /*#__PURE__*/ createUseReadContract({
    abi: uniswapV2PairAbi,
    functionName: 'PERMIT_TYPEHASH',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"TOKEN0_DECIMALS"`
 */
export const useReadUniswapV2PairToken0Decimals =
  /*#__PURE__*/ createUseReadContract({
    abi: uniswapV2PairAbi,
    functionName: 'TOKEN0_DECIMALS',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"allowance"`
 */
export const useReadUniswapV2PairAllowance =
  /*#__PURE__*/ createUseReadContract({
    abi: uniswapV2PairAbi,
    functionName: 'allowance',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"balanceOf"`
 */
export const useReadUniswapV2PairBalanceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: uniswapV2PairAbi,
    functionName: 'balanceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"decimals"`
 */
export const useReadUniswapV2PairDecimals = /*#__PURE__*/ createUseReadContract(
  { abi: uniswapV2PairAbi, functionName: 'decimals' },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"factory"`
 */
export const useReadUniswapV2PairFactory = /*#__PURE__*/ createUseReadContract({
  abi: uniswapV2PairAbi,
  functionName: 'factory',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"getReserves"`
 */
export const useReadUniswapV2PairGetReserves =
  /*#__PURE__*/ createUseReadContract({
    abi: uniswapV2PairAbi,
    functionName: 'getReserves',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"lastPrice"`
 */
export const useReadUniswapV2PairLastPrice =
  /*#__PURE__*/ createUseReadContract({
    abi: uniswapV2PairAbi,
    functionName: 'lastPrice',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"name"`
 */
export const useReadUniswapV2PairName = /*#__PURE__*/ createUseReadContract({
  abi: uniswapV2PairAbi,
  functionName: 'name',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"nonces"`
 */
export const useReadUniswapV2PairNonces = /*#__PURE__*/ createUseReadContract({
  abi: uniswapV2PairAbi,
  functionName: 'nonces',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"observationCardinality"`
 */
export const useReadUniswapV2PairObservationCardinality =
  /*#__PURE__*/ createUseReadContract({
    abi: uniswapV2PairAbi,
    functionName: 'observationCardinality',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"observationCardinalityNext"`
 */
export const useReadUniswapV2PairObservationCardinalityNext =
  /*#__PURE__*/ createUseReadContract({
    abi: uniswapV2PairAbi,
    functionName: 'observationCardinalityNext',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"observationIndex"`
 */
export const useReadUniswapV2PairObservationIndex =
  /*#__PURE__*/ createUseReadContract({
    abi: uniswapV2PairAbi,
    functionName: 'observationIndex',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"observations"`
 */
export const useReadUniswapV2PairObservations =
  /*#__PURE__*/ createUseReadContract({
    abi: uniswapV2PairAbi,
    functionName: 'observations',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"observe"`
 */
export const useReadUniswapV2PairObserve = /*#__PURE__*/ createUseReadContract({
  abi: uniswapV2PairAbi,
  functionName: 'observe',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"symbol"`
 */
export const useReadUniswapV2PairSymbol = /*#__PURE__*/ createUseReadContract({
  abi: uniswapV2PairAbi,
  functionName: 'symbol',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"token0"`
 */
export const useReadUniswapV2PairToken0 = /*#__PURE__*/ createUseReadContract({
  abi: uniswapV2PairAbi,
  functionName: 'token0',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"token1"`
 */
export const useReadUniswapV2PairToken1 = /*#__PURE__*/ createUseReadContract({
  abi: uniswapV2PairAbi,
  functionName: 'token1',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"totalSupply"`
 */
export const useReadUniswapV2PairTotalSupply =
  /*#__PURE__*/ createUseReadContract({
    abi: uniswapV2PairAbi,
    functionName: 'totalSupply',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link uniswapV2PairAbi}__
 */
export const useWriteUniswapV2Pair = /*#__PURE__*/ createUseWriteContract({
  abi: uniswapV2PairAbi,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"approve"`
 */
export const useWriteUniswapV2PairApprove =
  /*#__PURE__*/ createUseWriteContract({
    abi: uniswapV2PairAbi,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"burn"`
 */
export const useWriteUniswapV2PairBurn = /*#__PURE__*/ createUseWriteContract({
  abi: uniswapV2PairAbi,
  functionName: 'burn',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"increaseObservationCardinalityNext"`
 */
export const useWriteUniswapV2PairIncreaseObservationCardinalityNext =
  /*#__PURE__*/ createUseWriteContract({
    abi: uniswapV2PairAbi,
    functionName: 'increaseObservationCardinalityNext',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"initialize"`
 */
export const useWriteUniswapV2PairInitialize =
  /*#__PURE__*/ createUseWriteContract({
    abi: uniswapV2PairAbi,
    functionName: 'initialize',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"mint"`
 */
export const useWriteUniswapV2PairMint = /*#__PURE__*/ createUseWriteContract({
  abi: uniswapV2PairAbi,
  functionName: 'mint',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"permit"`
 */
export const useWriteUniswapV2PairPermit = /*#__PURE__*/ createUseWriteContract(
  { abi: uniswapV2PairAbi, functionName: 'permit' },
)

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"skim"`
 */
export const useWriteUniswapV2PairSkim = /*#__PURE__*/ createUseWriteContract({
  abi: uniswapV2PairAbi,
  functionName: 'skim',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"swap"`
 */
export const useWriteUniswapV2PairSwap = /*#__PURE__*/ createUseWriteContract({
  abi: uniswapV2PairAbi,
  functionName: 'swap',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"sync"`
 */
export const useWriteUniswapV2PairSync = /*#__PURE__*/ createUseWriteContract({
  abi: uniswapV2PairAbi,
  functionName: 'sync',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"transfer"`
 */
export const useWriteUniswapV2PairTransfer =
  /*#__PURE__*/ createUseWriteContract({
    abi: uniswapV2PairAbi,
    functionName: 'transfer',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"transferFrom"`
 */
export const useWriteUniswapV2PairTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: uniswapV2PairAbi,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link uniswapV2PairAbi}__
 */
export const useSimulateUniswapV2Pair = /*#__PURE__*/ createUseSimulateContract(
  { abi: uniswapV2PairAbi },
)

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"approve"`
 */
export const useSimulateUniswapV2PairApprove =
  /*#__PURE__*/ createUseSimulateContract({
    abi: uniswapV2PairAbi,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"burn"`
 */
export const useSimulateUniswapV2PairBurn =
  /*#__PURE__*/ createUseSimulateContract({
    abi: uniswapV2PairAbi,
    functionName: 'burn',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"increaseObservationCardinalityNext"`
 */
export const useSimulateUniswapV2PairIncreaseObservationCardinalityNext =
  /*#__PURE__*/ createUseSimulateContract({
    abi: uniswapV2PairAbi,
    functionName: 'increaseObservationCardinalityNext',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"initialize"`
 */
export const useSimulateUniswapV2PairInitialize =
  /*#__PURE__*/ createUseSimulateContract({
    abi: uniswapV2PairAbi,
    functionName: 'initialize',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"mint"`
 */
export const useSimulateUniswapV2PairMint =
  /*#__PURE__*/ createUseSimulateContract({
    abi: uniswapV2PairAbi,
    functionName: 'mint',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"permit"`
 */
export const useSimulateUniswapV2PairPermit =
  /*#__PURE__*/ createUseSimulateContract({
    abi: uniswapV2PairAbi,
    functionName: 'permit',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"skim"`
 */
export const useSimulateUniswapV2PairSkim =
  /*#__PURE__*/ createUseSimulateContract({
    abi: uniswapV2PairAbi,
    functionName: 'skim',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"swap"`
 */
export const useSimulateUniswapV2PairSwap =
  /*#__PURE__*/ createUseSimulateContract({
    abi: uniswapV2PairAbi,
    functionName: 'swap',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"sync"`
 */
export const useSimulateUniswapV2PairSync =
  /*#__PURE__*/ createUseSimulateContract({
    abi: uniswapV2PairAbi,
    functionName: 'sync',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"transfer"`
 */
export const useSimulateUniswapV2PairTransfer =
  /*#__PURE__*/ createUseSimulateContract({
    abi: uniswapV2PairAbi,
    functionName: 'transfer',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `functionName` set to `"transferFrom"`
 */
export const useSimulateUniswapV2PairTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: uniswapV2PairAbi,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link uniswapV2PairAbi}__
 */
export const useWatchUniswapV2PairEvent =
  /*#__PURE__*/ createUseWatchContractEvent({ abi: uniswapV2PairAbi })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `eventName` set to `"Approval"`
 */
export const useWatchUniswapV2PairApprovalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: uniswapV2PairAbi,
    eventName: 'Approval',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `eventName` set to `"Burn"`
 */
export const useWatchUniswapV2PairBurnEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: uniswapV2PairAbi,
    eventName: 'Burn',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `eventName` set to `"IncreaseObservationCardinalityNext"`
 */
export const useWatchUniswapV2PairIncreaseObservationCardinalityNextEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: uniswapV2PairAbi,
    eventName: 'IncreaseObservationCardinalityNext',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `eventName` set to `"Mint"`
 */
export const useWatchUniswapV2PairMintEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: uniswapV2PairAbi,
    eventName: 'Mint',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `eventName` set to `"Swap"`
 */
export const useWatchUniswapV2PairSwapEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: uniswapV2PairAbi,
    eventName: 'Swap',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `eventName` set to `"Sync"`
 */
export const useWatchUniswapV2PairSyncEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: uniswapV2PairAbi,
    eventName: 'Sync',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link uniswapV2PairAbi}__ and `eventName` set to `"Transfer"`
 */
export const useWatchUniswapV2PairTransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: uniswapV2PairAbi,
    eventName: 'Transfer',
  })
