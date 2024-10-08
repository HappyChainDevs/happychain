import { double } from "./funcs"
export { double }

export function triple(n: number) {
    return n * 3
}

// @ts-ignore
// self.onconnect = () => {
//     console.log({ double, triple })
//     self.postMessage("ok")
// }
