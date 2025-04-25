// import { waitForCondition } from "@happy.tech/wallet-common"
// import { getDefaultStore } from "jotai"
// import { type Address, hexToNumber, stringToHex } from "viem"
// import type { UserOperationReceipt } from "viem/account-abstraction"
// import { getBalanceQueryKey } from "wagmi/query"
// import { getCurrentChain } from "#src/state/chains"
// import { type ExtendedSmartAccountClient, getSmartAccountClient } from "#src/state/smartAccountClient"
// import { getUser, userAtom } from "#src/state/user"
// import { type UserOpInfo, UserOpStatus, userOpsRecordAtom } from "#src/state/userOpsHistory"
// import { queryClient } from "#src/tanstack-query/config"

// const store = getDefaultStore()

// async function monitorUserOpsOnLoad() {
//     const user = store.get(userAtom)
//     if (!user) return
//     await waitForCondition(() => getSmartAccountClient())
//     const pendingOps = store.get(userOpsRecordAtom)[user.address]?.filter((op) => op.status === UserOpStatus.Pending)
//     if (!pendingOps || pendingOps.length === 0) return
//     for (const userOpDetails of pendingOps) {
//         void monitorPendingUserOp(user.address, userOpDetails)
//     }
// }

// Monitor existing pending userOps on load or whenever the user changes
// if (store.get(userAtom)) void monitorUserOpsOnLoad()
// store.sub(userAtom, () => void monitorUserOpsOnLoad())

/**
 * Adds the userOp info to the atom for the given user, replacing an existing userOp with the same
 * hash if one already exists.
 */
// function addUserOp(address: Address, newOp: UserOpInfo) {
//     store.set(userOpsRecordAtom, (userOpsRecord: Record<Address, UserOpInfo[]>) => {
//         const userOps = userOpsRecord[address] || []
//         const index = userOps.findIndex((op) => op.userOpHash === newOp.userOpHash)
//         return {
//             ...userOpsRecord,
//             [address]:
//                 index < 0 //
//                     ? [newOp, ...userOps]
//                     : userOps.toSpliced(index, 1, newOp),
//         }
//     })
// }

// export function addPendingUserOp(address: Address, userOpInfo: Omit<UserOpInfo, "status">, monitor = true) {
//     const userOp = { ...userOpInfo, status: UserOpStatus.Pending }
//     addUserOp(address, userOp)
//     if (monitor) void monitorPendingUserOp(address, userOp)
// }

// export function markUserOpAsConfirmed(address: Address, value: bigint, receipt: UserOperationReceipt) {
//     addUserOp(address, {
//         userOpHash: receipt.userOpHash,
//         value,
//         userOpReceipt: receipt,
//         status: UserOpStatus.Success,
//     })
// }

// export function markUserOpAsFailed(address: Address, userOpInfo: Omit<UserOpInfo, "status">) {
//     addUserOp(address, { ...userOpInfo, status: UserOpStatus.Failure })
// }

/**
 * Monitors a UserOperation until it's included in a block.
 * Unlike regular transactions, we can't track intermediate states.
 * UserOperations are either pending in the mempool of the bundler or included in a block.
 * If the UserOperation fails or gets stuck, we'll never receive a receipt.
 *
 * @param address - Smart account address of the user
 * @param userOpInfo - The UserOperation details to monitor
 */
// async function monitorPendingUserOp(address: Address, userOpInfo: UserOpInfo) {
//     try {
//         const smartAccountClient = (await getSmartAccountClient()) as ExtendedSmartAccountClient
//         const receipt = await smartAccountClient.waitForUserOperationReceipt({
//             hash: userOpInfo.userOpHash,
//             // TODO decrease when boops land — heuristic and can still in theory produce wrong results
//             timeout: 120_000,
//         })

//         markUserOpAsConfirmed(address, userOpInfo.value, receipt)

//         // Refetch balances for associated assets
//         queryClient.invalidateQueries({
//             queryKey: getBalanceQueryKey({
//                 address: getUser()?.address,
//                 chainId: hexToNumber(stringToHex(getCurrentChain().chainId)),
//             }),
//         })
//     } catch (_) {
//         markUserOpAsFailed(address, userOpInfo)
//     }
// }
