/**
 * Manages a stack of callbacks that preserve UI state across navigation events,
 * enabling seamless back button behavior that restores previous UI states
 * (like keeping menus open) when users navigate backwards through the app.
 *
 * This class maintains a parallel "UI history" that coordinates with browser history.
 *
 * ### Usage Pattern
 * ```typescript
 * // Before navigating away, preserve current UI state
 * const openMenu = () => setMenuVisible(true)
 * navigationStateManager.pushBackCallback(openMenu)
 * router.navigate({ to: '/next-page' })
 *
 * // On back button click, restore previous UI state
 * const handleBack = () => {
 *   const restored = navigationStateManager.popAndExecuteBackCallback()
 *   router.history.back() // Menu will be open when page renders
 * }
 * ```
 *
 * @example
 * // User flow: Home → Menu Open → Permissions → App Details
 * // Back navigation: App Details → Permissions (menu open) → Home (menu open)
 */
class NavigationStateManager {
    private backCallbacks: Array<() => void> = []

    /**
     * Pushes a callback to be executed on the next back navigation.
     * Call this before navigating away to preserve current UI state.
     *
     * @param callback - Function that restores UI state (e.g., () => setMenuOpen(true))
     */
    pushBackCallback(callback: () => void): void {
        this.backCallbacks.push(callback)
    }

    /**
     * Pops and executes the most recent back callback.
     * Call this in back button handlers before calling router.history.back().
     *
     * @returns true if a callback was executed, false if stack was empty
     */
    popAndExecuteBackCallback(): boolean {
        const callback = this.backCallbacks.pop()
        if (callback) {
            callback()
            return true
        }
        return false
    }

    /**
     * Clears all pending callbacks.
     * Call this when reaching terminal routes or when callbacks become stale.
     */
    clear(): void {
        this.backCallbacks = []
    }
}

export const navigationStateManager = new NavigationStateManager()
