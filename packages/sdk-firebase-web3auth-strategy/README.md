# Firebase + Web3Auth Social Account Providers

> To be consumed exclusively by the frame

This package provides the logic used for Firebase social accounts (google login) along with Web3Auth EVM provider. This takes advantage of the Web3Auth MPC CoreKit.

-   https://github.com/Web3Auth/mpc-core-kit
-   https://web3auth.io/docs/sdk/core-kit/mpc-core-kit

To get started, sign up with a free account on firebase https://console.firebase.google.com/ and create a project. Go to the `Project Settings` and 'Add app'. once the app is created, you should have all required .env variables to get started with firebase auth.

Then sign up for Web3Auth and access the Dashboard: https://dashboard.web3auth.io/ . Create a new Project, and go to 'Custom Authentication' => 'Create Verifier'. use Custom Provider. for Firebase JWKS you can use the endpoint `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com` and use `sub` as the JWT Verifier ID. Create Verifier, and wait for all changes to be updated on the torus network. This may take several minutes.
