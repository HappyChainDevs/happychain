// This file is auto-generated by `make deploy` in `contracts/Makefile`
import type { Address, UnionToTuple, ObjectFromTuples, MapTuple } from "@happy.tech/common"


const contractToAbi = ({
  "HappyCounter": [
    {
      "type": "function",
      "name": "getCount",
      "inputs": [],
      "outputs": [
        {
          "name": "count",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "increment",
      "inputs": [],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "reset",
      "inputs": [],
      "outputs": [],
      "stateMutability": "nonpayable"
    }
  ],
  "MockERC20": [
    {
      "type": "constructor",
      "inputs": [
        {
          "name": "name_",
          "type": "string",
          "internalType": "string"
        },
        {
          "name": "symbol_",
          "type": "string",
          "internalType": "string"
        },
        {
          "name": "decimals_",
          "type": "uint8",
          "internalType": "uint8"
        }
      ],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "allowance",
      "inputs": [
        {
          "name": "owner",
          "type": "address",
          "internalType": "address"
        },
        {
          "name": "spender",
          "type": "address",
          "internalType": "address"
        }
      ],
      "outputs": [
        {
          "name": "",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "approve",
      "inputs": [
        {
          "name": "spender",
          "type": "address",
          "internalType": "address"
        },
        {
          "name": "amount",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "outputs": [
        {
          "name": "",
          "type": "bool",
          "internalType": "bool"
        }
      ],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "balanceOf",
      "inputs": [
        {
          "name": "owner",
          "type": "address",
          "internalType": "address"
        }
      ],
      "outputs": [
        {
          "name": "",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "burn",
      "inputs": [
        {
          "name": "amount",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "decimals",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "uint8",
          "internalType": "uint8"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "domainSeparator",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "bytes32",
          "internalType": "bytes32"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "mint",
      "inputs": [
        {
          "name": "_account",
          "type": "address",
          "internalType": "address"
        },
        {
          "name": "_amount",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "name",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "string",
          "internalType": "string"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "nonces",
      "inputs": [
        {
          "name": "",
          "type": "address",
          "internalType": "address"
        }
      ],
      "outputs": [
        {
          "name": "",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "permit",
      "inputs": [
        {
          "name": "owner",
          "type": "address",
          "internalType": "address"
        },
        {
          "name": "spender",
          "type": "address",
          "internalType": "address"
        },
        {
          "name": "value",
          "type": "uint256",
          "internalType": "uint256"
        },
        {
          "name": "deadline",
          "type": "uint256",
          "internalType": "uint256"
        },
        {
          "name": "v",
          "type": "uint8",
          "internalType": "uint8"
        },
        {
          "name": "r",
          "type": "bytes32",
          "internalType": "bytes32"
        },
        {
          "name": "s",
          "type": "bytes32",
          "internalType": "bytes32"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "symbol",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "string",
          "internalType": "string"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "totalSupply",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "transfer",
      "inputs": [
        {
          "name": "to",
          "type": "address",
          "internalType": "address"
        },
        {
          "name": "amount",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "outputs": [
        {
          "name": "",
          "type": "bool",
          "internalType": "bool"
        }
      ],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "transferFrom",
      "inputs": [
        {
          "name": "from",
          "type": "address",
          "internalType": "address"
        },
        {
          "name": "to",
          "type": "address",
          "internalType": "address"
        },
        {
          "name": "amount",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "outputs": [
        {
          "name": "",
          "type": "bool",
          "internalType": "bool"
        }
      ],
      "stateMutability": "nonpayable"
    },
    {
      "type": "event",
      "name": "Approval",
      "inputs": [
        {
          "name": "owner",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "spender",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "value",
          "type": "uint256",
          "indexed": false,
          "internalType": "uint256"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "Transfer",
      "inputs": [
        {
          "name": "from",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "to",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "value",
          "type": "uint256",
          "indexed": false,
          "internalType": "uint256"
        }
      ],
      "anonymous": false
    }
  ],
  "MockGasBurner": [
    {
      "type": "function",
      "name": "burnGas",
      "inputs": [
        {
          "name": "amount",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    }
  ],
  "MockRevert": [
    {
      "type": "function",
      "name": "intentionalRevert",
      "inputs": [],
      "outputs": [],
      "stateMutability": "pure"
    },
    {
      "type": "function",
      "name": "intentionalRevertDueToGasLimit",
      "inputs": [],
      "outputs": [],
      "stateMutability": "pure"
    },
    {
      "type": "function",
      "name": "intentionalRevertEmpty",
      "inputs": [],
      "outputs": [],
      "stateMutability": "pure"
    },
    {
      "type": "error",
      "name": "CustomErrorMockRevert",
      "inputs": []
    }
  ]
}
) as const

const aliasToContract = ({
  "HappyCounter": "HappyCounter",
  "MockGasBurner": "MockGasBurner",
  "MockRevert": "MockRevert",
  "MockTokenA": "MockERC20",
  "MockTokenB": "MockERC20",
  "MockTokenC": "MockERC20"
}) as const

export const deployment = ({
  "HappyCounter": "0x680B79c3FB4134850eb858E63b680Bd11c03095e",
  "MockGasBurner": "0x71C42CE5ff1F58191E6c4825A9d9BcFdfE825e6a",
  "MockRevert": "0x21538f5D7873c53D59a2b680E8ff4CCEf89229D1",
  "MockTokenA": "0xD2B8a10cE27aDbb951c1334F31C057A99808d507",
  "MockTokenB": "0x3c40E498879dC7831a364C4C24A450222fa6331E",
  "MockTokenC": "0x93BC26A3FD235675889E3C1ad561dbAbBF02950C"
}) as const

export type ContractToAbi = typeof contractToAbi
export type AliasToContract = typeof aliasToContract
export type ContractName = keyof ContractToAbi
export type ContractAlias = keyof AliasToContract
export type Deployment = Record<ContractAlias, Address>

type AliasTuple = UnionToTuple<ContractAlias>
type AbiValuesTuple = MapTuple<MapTuple<AliasTuple, AliasToContract>, ContractToAbi>

export type StaticAbis = ObjectFromTuples<AliasTuple, AbiValuesTuple>

export const abis = {} as StaticAbis

for (const [alias, contractName] of Object.entries(aliasToContract)) {
    // biome-ignore lint/suspicious/noExplicitAny: safe generated code
    // @ts-ignore
    abis[alias as ContractAlias] = contractToAbi[contractName as ContractName] as any
}


