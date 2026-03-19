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
    const { staffId } = await request.json()

    if (!staffId) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      )
    }

    // Fetch assets assigned to this staff member
    // Join staff_asset with asset table to get full asset details
    const { data: assignments, error } = await supabase
      .from('StaffAsset')
      .select(`
        id,
        staff_id,
        asset_id,
        created_dt,
        asset:asset_id (
          asset_id,
          name,
          model,
          description,
          condition,
          category
        )
      `)
      .eq('staff_id', staffId)
      .order('created_dt', { ascending: false })

    if (error) {
      // Logs only the message string, not the full error object which may expose DB internals
      console.error('Error fetching assets:', { message: error.message })
      return NextResponse.json(
        { error: 'Failed to fetch assets' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      assets: assignments
    })

  } catch (error: any) {
    // error?.message safely accesses the message — if error is null/undefined it won't crash
    console.error('Get assets error:', { message: error?.message })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
