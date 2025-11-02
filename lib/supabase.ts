import { createClient } from '@supabase/supabase-js'

// 1. Find these in your Supabase project settings
const supabaseUrl = 'https://twdhyodkhzxyhtxzfqgp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3ZGh5b2RraHp4eWh0eHpmcWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NzMyMjYsImV4cCI6MjA3NDM0OTIyNn0.NkYF6sbG0_pwnOpFIopRPaZF60ePMN1NHoZhOueHQS8'

// 2. Create and export the client
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
      // Asset table
      asset: {
        Row: {
          asset_id: string
          name: string
          model: string
          description: string
          condition: string
          location_id: string
          department_id: string
          category: string
          created_dt: string
          updated_dt: string
        }
        Insert: {
          asset_id?: number
          name: string
          model: string
          description: string
          condition: string
          location_id: string
          department_id: string
          category: string
          created_dt?: string
          updated_dt?: string
        }
        Update: {
          asset_id?: string
          name?: string
          model?: string
          description?: string
          condition?: string
          location_id?: string
          department_id?: string
          category?: string
          created_dt?: string
          updated_dt?: string
        }
      }
      // Add more tables here as your teammate creates them
    }
  }
}