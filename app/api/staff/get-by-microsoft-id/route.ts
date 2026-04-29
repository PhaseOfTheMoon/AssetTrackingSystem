// app/api/staff/get-by-microsoft-id/route.ts
// Looks up a staff member using their Microsoft Azure AD user ID. Used after Microsoft OAuth login to find the matching staff record.
import { NextRequest, NextResponse } from 'next/server'
// supabaseAdmin uses the service role key and only runs server-side — credentials are never exposed to the browser
import { supabaseAdmin as supabase } from '@/lib/supabase/server'
// Verifies the request has a valid login session before allowing access
import { validateSession } from '@/lib/apiAuth'

export async function POST(request: NextRequest) {
  // Checks the user is logged in — any authenticated user can call this, returns 401 if not
  const authResult = await validateSession()
  if (!authResult.authorized) return authResult.response

  try {
    const { microsoftUserId } = await request.json()

    if (!microsoftUserId) {
      return NextResponse.json(
        { error: 'Microsoft user ID is required' },
        { status: 400 }
      )
    }

    // Look up staff by Microsoft user ID
    const { data: staff, error } = await supabase
      .from('Staff')
      .select('*')
      .eq('microsoft_user_id', microsoftUserId)
      .single()

    if (error) {
      // If staff not found, return null (not an error - might be first login)
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          staff: null,
          message: 'Staff not found - needs registration'
        })
      }

      // Logs only the message string, not the full error object which may expose DB internals
      console.error('Error fetching staff:', { message: error.message })
      return NextResponse.json(
        { error: 'Failed to fetch staff data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      staff
    })

  } catch (error: any) {
    // error?.message safely accesses the message — if error is null/undefined it won't crash
    console.error('Get staff error:', { message: error?.message })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
