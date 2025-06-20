import { initializeApp } from "firebase/app"
import { indexedDBLocalPersistence, initializeAuth } from "firebase/auth"
import { deploymentVar } from "#src/env"

// See: https://firebase.google.com/docs/web/learn-more#config-object

const firebaseConfig = {
    apiKey: deploymentVar("VITE_FIREBASE_API_KEY"),
    authDomain: deploymentVar("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: deploymentVar("VITE_FIREBASE_PROJECT_ID"),
    storageBucket: deploymentVar("VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: deploymentVar("VITE_FIREBASE_MESSAGE_SENDER_ID"),
    appId: deploymentVar("VITE_FIREBASE_APP_ID"),
}

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig)

// Initialize Firebase Authentication and get a reference to the service
// https://firebase.google.com/docs/auth/web/custom-dependencies
export const firebaseAuth = initializeAuth(firebaseApp, {
    persistence: indexedDBLocalPersistence,
    // No popupRedirectResolver defined. will be defined in signInWithPopup
    popupRedirectResolver: undefined,
})
