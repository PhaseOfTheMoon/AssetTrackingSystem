import { NextResponse } from 'next/server'
// supabaseAdmin uses the service role key and only runs server-side — credentials are never exposed to the browser
import { supabaseAdmin as supabase } from '@/lib/supabase/server'
// Verifies the request has a valid login session and the required role before allowing access
import { validateSession } from '@/lib/apiAuth'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  // Checks the user is logged in and has 'admin' role — returns 401/403 and exits if not
  const authResult = await validateSession('admin')
  if (!authResult.authorized) return authResult.response

  try {
    // Fetch all approved staff
    const { data: approvedStaff, error } = await supabase
      .from('Staff')
      .select('*')
      .eq('status', 'approved')
      .order('created_dt', { ascending: false })

    if (error) {
      // Logs only the message string, not the full error object which may expose DB internals
      console.error('Error fetching approved staff:', { message: error.message })
      return NextResponse.json(
        { error: 'Failed to fetch approved staff' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      staff: approvedStaff || []
    })

  } catch (error: any) {
    // error?.message safely accesses the message — if error is null/undefined it won't crash
    console.error('Get approved staff error:', { message: error?.message })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
