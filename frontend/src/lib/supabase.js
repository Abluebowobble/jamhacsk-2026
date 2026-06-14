import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

if (!url || !anonKey) {
  // Fail loud and clear instead of a cryptic createClient throw on white screen.
  throw new Error(
    'Missing Supabase config. Copy frontend/.env.example to frontend/.env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
}

export const supabase = createClient(url, anonKey)
