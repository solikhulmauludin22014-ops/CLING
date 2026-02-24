import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Cek apakah service role key tersedia
const hasServiceRole = Boolean(supabaseUrl && serviceRoleKey && serviceRoleKey !== 'YOUR_SERVICE_ROLE_KEY_HERE')

export const supabaseAdmin = hasServiceRole 
  ? createClient(supabaseUrl!, serviceRoleKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

export const isAdminConfigured = hasServiceRole
