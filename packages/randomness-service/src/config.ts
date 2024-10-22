import { envBigInt, envHex } from "@happychain/common"

export const config = {
    privateKey: envHex("PRIVATE_KEY"),
    randomContractAddress: envHex("RANDOM_CONTRACT_ADDRESS"),
    precommitDelay: envBigInt("PRECOMMIT_DELAY"),
    postCommitMargin: envBigInt("POST_COMMIT_MARGIN"),
    timeBlock: envBigInt("TIME_BLOCK"),
}
