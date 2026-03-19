import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase/server'
// Verifies the request has a valid login session and the required role before allowing access
import { validateSession } from '@/lib/apiAuth'
// Schema validation library — ensures the request body only contains expected fields and formats
import { z } from 'zod'

// Defines which fields are allowed to be updated
// staff_id is required to identify the record; all other fields are optional
// .strict() blocks any extra fields (e.g. 'role', 'status') from being passed in,
// preventing privilege escalation attacks like sending { "staff_id": "S001", "role": "admin" }
const updateStaffSchema = z.object({
  staff_id: z.string().max(20),
  name: z.string().max(100).optional(),
  email: z.string().email().max(100).optional(),
  mobile_no: z.string().max(20).optional(),
  department_id: z.string().max(50).optional(),
}).strict()

export async function POST(request: NextRequest) {
  // Checks the user is logged in and has 'admin' role — returns 401/403 and exits if not
  const authResult = await validateSession('admin')
  if (!authResult.authorized) return authResult.response

  try {
    const body = await request.json()

    // Validates the body through the schema — prevents arbitrary DB fields from being overwritten
    const parsed = updateStaffSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // staff_id is used in .eq() to target the correct record; remaining fields go into the update
    const { staff_id, ...updateFields } = parsed.data

    // Update staff member
    const { data: staff, error } = await supabase
      .from('Staff')
      .update({
        // Spreads only the Zod-validated fields — guarantees only allowed fields are written to the DB
        ...updateFields,
        updated_dt: new Date().toISOString()
      })
      .eq('staff_id', staff_id)
      .select()
      .single()

    if (error) {
      // Logs only the message string, not the full error object which may expose DB internals
      console.error('Error updating staff:', { message: error.message })
      return NextResponse.json(
        { error: 'Failed to update staff member' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      staff
    })

  } catch (error: any) {
    // error?.message safely accesses the message — if error is null/undefined it won't crash
    console.error('Update staff error:', { message: error?.message })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
