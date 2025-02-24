export const isHexString = (str: string): str is `0x${string}` => str.startsWith("0x")
