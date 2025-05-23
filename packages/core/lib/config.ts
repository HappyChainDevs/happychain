/**
 * Shared configuration between the SDK and the iframe.
 */
export const config = {
    iframePath: import.meta.env.HAPPY_IFRAME_URL || "http://localhost:5160",
}

/** Box to hold the chainId loaded with {@link loadHappyWallet}. */
export const chain = {
    id: 0xdeadbeef,
}
