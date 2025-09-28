import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // First, let's check if environment variables are loaded
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log('Environment check:')
    console.log('URL exists:', !!supabaseUrl)
    console.log('Key exists:', !!supabaseKey)
    console.log('URL value:', supabaseUrl)
    console.log('Key preview:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'not found')

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        message: 'Environment variables not configured',
        debug: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      }, { status: 500 })
    }

    // Test the connection by trying to access Supabase
    const { data, error } = await supabase
      .from('users') // This table might not exist yet, but it tests the connection
      .select('count')
      .limit(1)

    console.log('Supabase response:', { data, error })

    if (error) {
      // If it's a "table doesn't exist" error, that's actually fine - connection works
      if (error.message.includes('relation "public.users" does not exist') ||
          error.message.includes('Could not find the table') ||
          error.code === 'PGRST205') {
        return NextResponse.json({
          success: true,
          message: 'Supabase connection successful! (Users table not created yet)',
          connection: 'working',
          note: 'database tables create later'
        })
      }

      // Log the actual error for debugging
      console.error('Supabase error details:', error)
      return NextResponse.json({
        success: false,
        message: 'Supabase query error',
        error: error.message,
        debug: error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful!',
      connection: 'working',
      data
    })

  } catch (error) {
    console.error('Supabase connection error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to connect to Supabase',
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: error
    }, { status: 500 })
  }
}