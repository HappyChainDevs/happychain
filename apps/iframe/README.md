# HappyChain Iframe

The iframe package has multiple purposes

-   Handles social login and injected wallets
-   Handles submitting and signing of JSON-RPC requests
-   Loads and displays the wallet within the dApp
-   Parses and displays approval requests to the user


# 🌱 Project Setup: Environment Variables (Firebase + Web3Auth)

This document guides you step by step to correctly configure the environment variables needed to deploy the iframe
---

## 🔐 1. Configure Firebase

### 1.1 Create a Firebase Project

First, create a new project in [Firebase](https://console.firebase.google.com/).

### 1.2 Enable Authentication

Within the project, enable the authentication module:

- Go to **Authentication > Sign-in method**
- Enable the following providers:
  - **Email/Password**
  - **Google**


### 1.3 Add Authorized Domains

In the **authentication settings**, add the domain where you will deploy the iframe to the list of authorized domains.


### 1.4 Create a Web Application

Now, create a **web application** within the Firebase project to obtain the necessary credentials:

- Go to **Project settings > General**
- In the **Your apps** section, create a new app of type **Web**

You will obtain the necessary credentials for the environment variables.

---

## ⚙️ 2. Firebase Environment Variables

Assign the values obtained when creating the Firebase web application:

```env
VITE_FIREBASE_API_KEY_LOCAL=<your_api_key>
VITE_FIREBASE_AUTH_DOMAIN_LOCAL=<your_auth_domain>
VITE_FIREBASE_PROJECT_ID_LOCAL=<your_project_id>
VITE_FIREBASE_STORAGE_BUCKET_LOCAL=<your_storage_bucket>
VITE_FIREBASE_MESSAGE_SENDER_ID_LOCAL=<your_sender_id>
VITE_FIREBASE_APP_ID_LOCAL=<your_app_id>
```

(You might want to use the `STAGING` or `PROD` suffixes instead of `LOCAL` if you're trying to use/simulate these
environments.)

# 🔗 Web3Auth Configuration

Follow these steps to configure Web3Auth and connect it with Firebase as a custom provider.

---

## 1. Create Web3Auth Project

1. Go to [https://web3auth.io/](https://web3auth.io/) and create an account or sign in.
2. Create a new project with the following configuration:

- **Environment:** Select either Sapphire Devnet for development or Sapphire Mainnet for production environments
- **Product:** MPC Core Kit  
- **Platform Type:** Web Application  
- **Chain Type:** EVM Based Chain

---

## 2. Create a Custom Verifier

Once the project is created, add a **Custom Verifier** with this configuration:

### 🛠️ Verifier Details

- **Type:** Custom Provider  
- **JWKS Endpoint:**  
  `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`
- **JWT Verifier ID:**  
  `sub`

### ✅ Custom Validations

```json
{
  "iss": "https://securetoken.google.com/<firebase-project-id>",
  "aud": "<firebase-project-id>"
}
```

Make sure to replace <firebase-project-id> with your actual Firebase project ID.

---

## 3. Configure Web3Auth Environment Variables

After setting up your Web3Auth project and custom verifier, you need to configure the following environment variables:

```env
# Web3Auth Client ID obtained from your Web3Auth project dashboard
VITE_WEB3AUTH_CLIENT_ID_LOCAL=<your_client_id>

# Network environment (sapphire_devnet for development, sapphire_mainnet for production)
VITE_WEB3AUTH_NETWORK_LOCAL=<sapphire_devnet|sapphire_mainnet>

# Verifier ID from your custom verifier configuration
VITE_WEB3AUTH_VERIFIER_LOCAL=<your_verifier_name>
```