import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase/server'
// Verifies the request has a valid login session and the required role before allowing access
import { validateSession } from '@/lib/apiAuth'
// Schema validation library — ensures the request body only contains expected fields and formats
import { z } from 'zod'

// Only allows staff_id — .strict() rejects any extra fields sent in the request body
const approveStaffSchema = z.object({
  staff_id: z.string().max(20)
}).strict()

export async function POST(request: NextRequest) {
  // Checks the user is logged in and has 'admin' role — returns 401/403 and exits if not
  const authResult = await validateSession('admin')
  if (!authResult.authorized) return authResult.response

  try {
    const body = await request.json()

    // Validates the body — ensures staff_id is a valid string and no extra fields are passed
    const parsed = approveStaffSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Use only the validated staff_id to prevent unexpected data reaching the database
    const { staff_id } = parsed.data

    // Update staff status to 'approved'
    const { data: updatedStaff, error } = await supabase
      .from('Staff')
      .update({
        status: 'approved',
        updated_dt: new Date().toISOString()
      })
      .eq('staff_id', staff_id)
      .select()
      .single()

    if (error) {
      // Logs only the message string, not the full error object which may expose DB internals
      console.error('Error approving staff:', { message: error.message })
      return NextResponse.json(
        { error: 'Failed to approve staff member' },
        { status: 500 }
      )
    }

    if (!updatedStaff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Staff member approved successfully',
      staff: updatedStaff
    })

  } catch (error: any) {
    // error?.message safely accesses the message — if error is null/undefined it won't crash
    console.error('Approve staff error:', { message: error?.message })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
