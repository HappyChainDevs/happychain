import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
// import { getAnalytics } from "firebase/analytics";

// See: https://firebase.google.com/docs/web/learn-more#config-object

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGE_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    // analytics disabled currently, but might be useful later
    // measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig)
// TODO: enable for analytics or delete
// const analytics = getAnalytics(app);

// Initialize Firebase Authentication and get a reference to the service

export const firebaseAuth = getAuth(firebaseApp)
