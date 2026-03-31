// ============================================================
// CONFIGURA FIREBASE QUI
// 1. Vai su https://console.firebase.google.com
// 2. Crea un nuovo progetto
// 3. Aggiungi un'app Web
// 4. Copia le credenziali qui sotto
// 5. Abilita Authentication > Email/Password
// 6. Abilita Firestore Database
// 7. Abilita Storage
// ============================================================

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

// Dominio email autorizzato - cambia con il tuo dominio scolastico
export const ALLOWED_DOMAIN = '@stevejobs.academy'
