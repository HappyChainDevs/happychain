import { useMediaQuery } from "./useMediaQuery"

type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl"
// https://tailwindcss.com/docs/screens
const lookupTable = {
    sm: "(min-width: 640px)",
    md: "(min-width: 768px)",
    lg: "(min-width: 1024px)",
    xl: "(min-width: 1280px)",
    "2xl": "(min-width: 1536px)",
}
export function useBreakpoint(breakpoint: Breakpoint) {
    return useMediaQuery(lookupTable[breakpoint])
}
