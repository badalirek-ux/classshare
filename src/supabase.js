// ============================================================
// CONFIGURA SUPABASE QUI
// 1. Vai su https://supabase.com e crea un account gratuito
// 2. Clicca "New project" — dai un nome es. classshare
// 3. Vai su Project Settings > API
// 4. Copia "Project URL" e "anon public key" qui sotto
// 5. Vai su Storage > New bucket
//    - Nome: files
//    - Spunta "Public bucket" → Create bucket
// ============================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://aoiukbfupwkbkzvxppac.supabase.co'       // ← il tuo Project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvaXVrYmZ1cHdrYmt6dnhwcGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MzEyMDEsImV4cCI6MjA4OTAwNzIwMX0.d46YyZ9aWip213jAPi8ksHr_vmFuwjsGsO4pfEzPCWA'  // ← la tua anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Nome del bucket che hai creato su Supabase
export const STORAGE_BUCKET = 'files'
