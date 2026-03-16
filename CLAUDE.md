# CLAUDE.md

Questo file configura il comportamento di Claude per il progetto **ClassShare**.

Per le regole complete su stile, struttura, testing, sicurezza e commit, leggi:

→ [AGENTS.md](./AGENTS.md)

---

## Contesto del progetto

ClassShare è una web app React per la condivisione di file tra studenti di un corso.

- **Frontend**: React + Vite
- **Auth + Database**: Firebase (Authentication + Firestore)
- **Storage file**: Supabase Storage
- **Deploy**: Vercel

## Note specifiche per questo progetto

- Le credenziali Firebase e Supabase non vanno mai committate — sono già nel file locale `src/firebase.js` e `src/supabase.js` che ogni sviluppatore configura in autonomia
- La whitelist delle email autorizzate si trova in `src/pages/AuthPage.jsx` nella costante `ALLOWED_EMAILS`
- La password admin del pannello di controllo si trova in `src/pages/AdminPanel.jsx` nella costante `ADMIN_PASSWORD`
- Prima di ogni modifica ai componenti principali (`Dashboard.jsx`, `UploadModal.jsx`) verifica che la build locale funzioni con `npm run build`
