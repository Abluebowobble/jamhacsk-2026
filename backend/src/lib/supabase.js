import { createClient } from '@supabase/supabase-js'

// Admin client — uses service role key, bypasses RLS entirely.
// Only use on the backend. Never expose this key to the browser.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export default supabaseAdmin
