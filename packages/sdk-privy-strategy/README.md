# Privy Social Account Providers

> To be consumed exclusively by the frame

This package provides the logic used for Privy social accounts (google login) login

Create an account at [Privy Dashboard](https://dashboard.privy.io) and get your appID to fill in the .env file: `VITE_PRIVY_APP_ID=`

Make sure `PrivyProvider` is setup in main.tsx within the iframe

```tsx
<PrivyProvider
    appId={import.meta.env.VITE_PRIVY_APP_ID}
    config={{ embeddedWallets: { createOnLogin: 'users-without-wallets' } }}
>
    <HappyAccountProvider>
        <RouterProvider router={router} />
    </HappyAccountProvider>
</PrivyProvider>
```
