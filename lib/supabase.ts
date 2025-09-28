import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for our database (can be expanded later)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          microsoft_user_id: string
          role: string
          created_at: string
          last_login: string | null
        }
        Insert: {
          id?: string
          microsoft_user_id: string
          role?: string
          created_at?: string
          last_login?: string | null
        }
        Update: {
          id?: string
          microsoft_user_id?: string
          role?: string
          created_at?: string
          last_login?: string | null
        }
      }
      // Add more tables here as your teammate creates them
    }
  }
}