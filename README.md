# ClassShare — Guida all'installazione

App per condividere file tra studenti di una classe.
**Firebase** per autenticazione e database, **Supabase** per lo storage dei file (gratuito, senza carta).

---

## 1. Configura Firebase

1. Vai su [https://console.firebase.google.com](https://console.firebase.google.com)
2. Apri il progetto `classshare-stevejobs`
3. Vai su **Impostazioni progetto** → la tua app Web → copia le credenziali in `src/firebase.js`

### Servizi già abilitati:
- ✅ Authentication (Email/Password)
- ✅ Firestore Database

---

## 2. Configura Supabase (per i file)

1. Vai su [https://supabase.com](https://supabase.com) → crea account gratuito
2. Clicca **"New project"** → nome `classshare` → scegli una password → **Create project**
3. Vai su **Storage** → **New bucket**
   - Nome: `files`
   - Spunta **"Public bucket"** → **Create bucket**
4. Vai su **Project Settings → API**
   - Copia **Project URL** e **anon public key**
   - Incollali in `src/supabase.js`

---

## 3. Imposta il dominio email

In `src/firebase.js`:
```js
export const ALLOWED_DOMAIN = '@stevejobs.academy'
```

---

## 4. Installa e avvia

```bash
npm install
npm run dev
```

Apri [http://localhost:5173](http://localhost:5173)

---

## 5. Regole Firestore (produzione)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /profiles/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }
    match /files/{fileId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow delete: if request.auth != null &&
        request.auth.uid == resource.data.uploadedBy;
    }
  }
}
```

---

## Struttura file

```
src/
  firebase.js          ← Credenziali Firebase (auth + db)
  supabase.js          ← Credenziali Supabase (storage file)
  App.jsx
  main.jsx
  context/
    AuthContext.jsx
  pages/
    AuthPage.jsx
    Dashboard.jsx
  components/
    UploadModal.jsx
```

---

## Deploy su Vercel

```bash
npm run build
```

Carica la cartella `dist/` su [vercel.com](https://vercel.com) oppure collega il repo GitHub.
