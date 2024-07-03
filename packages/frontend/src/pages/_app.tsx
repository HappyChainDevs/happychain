// =================================================================================================

// import "src/setup"
// import "src/store/setup"

import { NextPage } from "next"
import type { AppProps } from "next/app"
import Head from "next/head"

import { lightTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"

import { setBurnerTestPrivateKey, wagmiConfig } from "src/chain"
import { jotaiDebug } from "src/components/lib/jotaiDebug"
import { useIsHydrated } from "src/hooks/useIsHydrated"

import "@rainbow-me/rainbowkit/styles.css"

// =================================================================================================

/**
 * Make pages in the app conform to this type.
 * See [@link useIsHydrated] for more info on the meaning of the `isHydrated` prop.
 */
export type AppPage = NextPage<{ isHydrated: boolean }>

// =================================================================================================

const queryClient = new QueryClient()

// Use the first test account as the burner account.
setBurnerTestPrivateKey(0)

// =================================================================================================

const MyApp = ({ Component, pageProps }: AppProps) => {
    const isHydrated = useIsHydrated()

    return (
        <>
            <Head>
                <title>My App</title>

                {/* Favicon */}
                {/* <link rel="shortcut icon" href="/favicon.png" /> */}

                {/* Custom Font */}
                {/*<link
                    href="/font/BluuNext-Bold.otf"
                    as="font"
                    type="font/otf"
                    crossOrigin="anonymous"
                />*/}
            </Head>

            <WagmiProvider config={wagmiConfig}>
                <QueryClientProvider client={queryClient}>
                    <RainbowKitProvider theme={lightTheme()}>
                        {jotaiDebug(isHydrated)}
                        <Component {...pageProps} isHydrated={isHydrated} />
                    </RainbowKitProvider>
                </QueryClientProvider>
            </WagmiProvider>
        </>
    )
}

export default MyApp

// =================================================================================================
