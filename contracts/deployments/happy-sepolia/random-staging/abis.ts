// This file is auto-generated by `make deploy` in `contracts/Makefile`
import type { Address, UnionToTuple, ObjectFromTuples, MapTuple } from "@happy.tech/common"


const contractToAbi = ({
  "AddressBook": [
    {
      "type": "constructor",
      "inputs": [
        {
          "name": "_owner",
          "type": "address",
          "internalType": "address"
        },
        {
          "name": "_random",
          "type": "address",
          "internalType": "address"
        }
      ],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "owner",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "address",
          "internalType": "address"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "random",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "address",
          "internalType": "address"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "renounceOwnership",
      "inputs": [],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "setRandom",
      "inputs": [
        {
          "name": "_random",
          "type": "address",
          "internalType": "address"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "transferOwnership",
      "inputs": [
        {
          "name": "newOwner",
          "type": "address",
          "internalType": "address"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "event",
      "name": "OwnershipTransferred",
      "inputs": [
        {
          "name": "previousOwner",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "newOwner",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        }
      ],
      "anonymous": false
    },
    {
      "type": "error",
      "name": "OwnableInvalidOwner",
      "inputs": [
        {
          "name": "owner",
          "type": "address",
          "internalType": "address"
        }
      ]
    },
    {
      "type": "error",
      "name": "OwnableUnauthorizedAccount",
      "inputs": [
        {
          "name": "account",
          "type": "address",
          "internalType": "address"
        }
      ]
    }
  ],
  "Random": [
    {
      "type": "constructor",
      "inputs": [
        {
          "name": "_owner",
          "type": "address",
          "internalType": "address"
        },
        {
          "name": "_drandPublicKey",
          "type": "uint256[4]",
          "internalType": "uint256[4]"
        },
        {
          "name": "_drandGenesisTimestampSeconds",
          "type": "uint256",
          "internalType": "uint256"
        },
        {
          "name": "_drandPeriodSeconds",
          "type": "uint256",
          "internalType": "uint256"
        },
        {
          "name": "_precommitDelayBlocks",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "DRAND_DELAY_SECONDS",
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
      "name": "DRAND_GENESIS_TIMESTAMP_SECONDS",
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
      "name": "DRAND_PERIOD_SECONDS",
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
      "name": "DRAND_PK_0",
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
      "name": "DRAND_PK_1",
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
      "name": "DRAND_PK_2",
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
      "name": "DRAND_PK_3",
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
      "name": "DST",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "bytes",
          "internalType": "bytes"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "MIN_PRECOMMIT_TIME_SECONDS",
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
      "name": "PRECOMMIT_DELAY_BLOCKS",
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
      "name": "drandRandomness",
      "inputs": [
        {
          "name": "round",
          "type": "uint64",
          "internalType": "uint64"
        }
      ],
      "outputs": [
        {
          "name": "randomness",
          "type": "bytes32",
          "internalType": "bytes32"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "getDrand",
      "inputs": [
        {
          "name": "round",
          "type": "uint64",
          "internalType": "uint64"
        }
      ],
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
      "name": "getRevealedValue",
      "inputs": [
        {
          "name": "blockNumber",
          "type": "uint128",
          "internalType": "uint128"
        }
      ],
      "outputs": [
        {
          "name": "",
          "type": "uint128",
          "internalType": "uint128"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "nextValidTimestamp",
      "inputs": [
        {
          "name": "timestamp",
          "type": "uint256",
          "internalType": "uint256"
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
      "name": "owner",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "address",
          "internalType": "address"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "postCommitment",
      "inputs": [
        {
          "name": "blockNumber",
          "type": "uint128",
          "internalType": "uint128"
        },
        {
          "name": "commitmentHash",
          "type": "bytes32",
          "internalType": "bytes32"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "postDrand",
      "inputs": [
        {
          "name": "round",
          "type": "uint64",
          "internalType": "uint64"
        },
        {
          "name": "signature",
          "type": "uint256[2]",
          "internalType": "uint256[2]"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "random",
      "inputs": [],
      "outputs": [
        {
          "name": "randomValue",
          "type": "bytes32",
          "internalType": "bytes32"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "randomForTimestamp",
      "inputs": [
        {
          "name": "timestamp",
          "type": "uint256",
          "internalType": "uint256"
        }
      ],
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
      "name": "renounceOwnership",
      "inputs": [],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "revealValue",
      "inputs": [
        {
          "name": "blockNumber",
          "type": "uint128",
          "internalType": "uint128"
        },
        {
          "name": "revealedValue",
          "type": "uint128",
          "internalType": "uint128"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "transferOwnership",
      "inputs": [
        {
          "name": "newOwner",
          "type": "address",
          "internalType": "address"
        }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "unsafeGetDrand",
      "inputs": [
        {
          "name": "round",
          "type": "uint64",
          "internalType": "uint64"
        }
      ],
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
      "name": "unsafeGetRevealedValue",
      "inputs": [
        {
          "name": "blockNumber",
          "type": "uint128",
          "internalType": "uint128"
        }
      ],
      "outputs": [
        {
          "name": "",
          "type": "uint128",
          "internalType": "uint128"
        }
      ],
      "stateMutability": "view"
    },
    {
      "type": "event",
      "name": "CommitmentPosted",
      "inputs": [
        {
          "name": "blockNumber",
          "type": "uint128",
          "indexed": true,
          "internalType": "uint128"
        },
        {
          "name": "commitment",
          "type": "bytes32",
          "indexed": false,
          "internalType": "bytes32"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "DrandRandomnessPosted",
      "inputs": [
        {
          "name": "round",
          "type": "uint64",
          "indexed": true,
          "internalType": "uint64"
        },
        {
          "name": "randomness",
          "type": "bytes32",
          "indexed": false,
          "internalType": "bytes32"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "OwnershipTransferred",
      "inputs": [
        {
          "name": "previousOwner",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "newOwner",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "ValueRevealed",
      "inputs": [
        {
          "name": "blockNumber",
          "type": "uint128",
          "indexed": true,
          "internalType": "uint128"
        },
        {
          "name": "revealedValue",
          "type": "uint128",
          "indexed": false,
          "internalType": "uint128"
        }
      ],
      "anonymous": false
    },
    {
      "type": "error",
      "name": "BNAddFailed",
      "inputs": [
        {
          "name": "input",
          "type": "uint256[4]",
          "internalType": "uint256[4]"
        }
      ]
    },
    {
      "type": "error",
      "name": "CommitmentAlreadyExists",
      "inputs": []
    },
    {
      "type": "error",
      "name": "CommitmentTooLate",
      "inputs": []
    },
    {
      "type": "error",
      "name": "DrandNotAvailable",
      "inputs": [
        {
          "name": "round",
          "type": "uint64",
          "internalType": "uint64"
        }
      ]
    },
    {
      "type": "error",
      "name": "InvalidDSTLength",
      "inputs": [
        {
          "name": "dst",
          "type": "bytes",
          "internalType": "bytes"
        }
      ]
    },
    {
      "type": "error",
      "name": "InvalidFieldElement",
      "inputs": [
        {
          "name": "x",
          "type": "uint256",
          "internalType": "uint256"
        }
      ]
    },
    {
      "type": "error",
      "name": "InvalidPublicKey",
      "inputs": [
        {
          "name": "publicKey",
          "type": "uint256[4]",
          "internalType": "uint256[4]"
        }
      ]
    },
    {
      "type": "error",
      "name": "InvalidReveal",
      "inputs": []
    },
    {
      "type": "error",
      "name": "InvalidSignature",
      "inputs": [
        {
          "name": "publicKey",
          "type": "uint256[4]",
          "internalType": "uint256[4]"
        },
        {
          "name": "message",
          "type": "uint256[2]",
          "internalType": "uint256[2]"
        },
        {
          "name": "signature",
          "type": "uint256[2]",
          "internalType": "uint256[2]"
        }
      ]
    },
    {
      "type": "error",
      "name": "MapToPointFailed",
      "inputs": [
        {
          "name": "noSqrt",
          "type": "uint256",
          "internalType": "uint256"
        }
      ]
    },
    {
      "type": "error",
      "name": "ModExpFailed",
      "inputs": [
        {
          "name": "base",
          "type": "uint256",
          "internalType": "uint256"
        },
        {
          "name": "exponent",
          "type": "uint256",
          "internalType": "uint256"
        },
        {
          "name": "modulus",
          "type": "uint256",
          "internalType": "uint256"
        }
      ]
    },
    {
      "type": "error",
      "name": "NoCommitmentFound",
      "inputs": []
    },
    {
      "type": "error",
      "name": "OwnableInvalidOwner",
      "inputs": [
        {
          "name": "owner",
          "type": "address",
          "internalType": "address"
        }
      ]
    },
    {
      "type": "error",
      "name": "OwnableUnauthorizedAccount",
      "inputs": [
        {
          "name": "account",
          "type": "address",
          "internalType": "address"
        }
      ]
    },
    {
      "type": "error",
      "name": "RevealMustBeOnExactBlock",
      "inputs": []
    },
    {
      "type": "error",
      "name": "RevealedValueNotAvailable",
      "inputs": []
    }
  ]
}
) as const

const aliasToContract = ({
  "AddressBook": "AddressBook",
  "Random": "Random"
}) as const

export const deployment = ({
  "AddressBook": "0x73A07392507134bEc75Eb540feF511d0a96E7836",
  "Random": "0xc7430a97e5E9e0Ee516c558887458F6D48c4F528"
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


