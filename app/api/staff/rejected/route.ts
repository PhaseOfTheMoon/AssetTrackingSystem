import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch all rejected staff
    const { data: rejectedStaff, error } = await supabase
      .from('staff')
      .select('*')
      .eq('status', 'rejected')
      .order('created_dt', { ascending: false })

    if (error) {
      console.error('Error fetching rejected staff:', error)
      return NextResponse.json(
        { error: 'Failed to fetch rejected staff' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      staff: rejectedStaff || []
    })

  } catch (error) {
    console.error('Get rejected staff error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
