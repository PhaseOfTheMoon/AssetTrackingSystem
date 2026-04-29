// app/api/staff/get-by-email/route.ts
// Looks up a staff member by their email address. Used during login to check if the user is registered and their approval status.
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
    const { email, microsoftUserId } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Look up staff by email
    const { data: staff, error } = await supabase
      .from('Staff')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      // If staff not found, return null (not an error - might need registration)
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

    // Check registration status
    if (staff.status === 'pending') {
      return NextResponse.json({
        success: false,
        staff: null,
        message: 'pending',
        error: 'Your registration is pending admin approval. Please wait for confirmation.'
      })
    }

    if (staff.status === 'rejected') {
      return NextResponse.json({
        success: false,
        staff: null,
        message: 'rejected',
        error: 'Your registration was rejected. Please contact administrator.'
      })
    }

    // If approved and microsoft_user_id is null, update it (first login)
    if (staff.status === 'approved' && !staff.microsoft_user_id && microsoftUserId) {
      const { data: updatedStaff, error: updateError } = await supabase
        .from('Staff')
        .update({
          microsoft_user_id: microsoftUserId,
          updated_dt: new Date().toISOString()
        })
        .eq('staff_id', staff.staff_id)
        .select()
        .single()

      if (updateError) {
        // Logs only the message string, not the full error object which may expose DB internals
        console.error('Error updating microsoft_user_id:', { message: updateError.message })
        // Continue with original staff data even if update fails
      } else {
        // Use updated staff data
        return NextResponse.json({
          success: true,
          staff: updatedStaff,
          message: 'First login - Microsoft ID captured'
        })
      }
    }

    // Return staff data if approved
    if (staff.status === 'approved') {
      return NextResponse.json({
        success: true,
        staff
      })
    }

    // Unknown status
    return NextResponse.json({
      success: false,
      staff: null,
      error: 'Invalid account status. Please contact administrator.'
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
