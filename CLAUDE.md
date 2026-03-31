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

- Le configurazioni del progetto per Firebase e Supabase risiedono nel file `.env.local` (che non viene mai caricato su repository pubblici).
- **Controllo Accessi:** La lista delle email ammesse (`VITE_ALLOWED_EMAILS`) si trova tra le variabili d'ambiente.
- **Pannello Admin:** L'amministratore del progetto accede automaticamente al pannello di gestione. Per assegnare il ruolo di admin a uno sviluppatore o professore, usa: `node scripts/set-admin.mjs <tuamail> <service-account.json>`.
- Prima di ogni modifica ai componenti principali (`Dashboard.jsx`, `UploadModal.jsx`) verifica che la build locale funzioni con `npm run build`.
