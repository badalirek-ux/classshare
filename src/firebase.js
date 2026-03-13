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
  apiKey: "AIzaSyA1uFxPM0TkmmKVHhJUHnI_wZB5VHacQyA",
  authDomain: "classshare-stevejobs.firebaseapp.com",
  projectId: "classshare-stevejobs",
  storageBucket: "classshare-stevejobs.firebasestorage.app",
  messagingSenderId: "901354552651",
  appId: "1:901354552651:web:9ec15a8294bafd761bfcce"
};

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

// Dominio email autorizzato - cambia con il tuo dominio scolastico
export const ALLOWED_DOMAIN = '@stevejobs.academy'
