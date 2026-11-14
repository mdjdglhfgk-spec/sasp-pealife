const SUPABASE_URL = 'https://evvqedgiwwbsmbfwdibw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2dnFlZGdpd3dic21iZndkaWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NjQwMTYsImV4cCI6MjExMDI0MDAxNn0.fKtWH4OEKa720gqlwQRgrJHs4VWq8v-6R0lnEiXE8UE'; // <-- Remplacez par votre clé

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: window.sessionStorage, // Utilise sessionStorage (s'efface à la fermeture de l'onglet)
        autoRefreshToken: false,        // Ne rafraîchit pas le token en arrière-plan
        persistSession: true            // Garde la session active pendant la navigation
    }
});