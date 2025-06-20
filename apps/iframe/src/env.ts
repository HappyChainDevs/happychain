/**
 * Returns the environment variable with the given name but prefixed with `_$DEPLOYMENT` where `$DEPLOYMENT` is the value of the
 * `VITE_DEPLOYMENT` environment variable.
 */
export function deploymentVar(variable: string): string {
    const name = `${variable}_${import.meta.env.VITE_DEPLOYMENT}`
    const value = import.meta.env[name]
    if (import.meta.env.DEV && !value) throw new Error(`Variable ${name} not defined!`)
    return value as string
}
