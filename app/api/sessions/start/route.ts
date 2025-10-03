import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { microsoftUserId, staffId, loginLocation } = await request.json()

    if (!microsoftUserId || !staffId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create new session record
    const { data: session, error } = await supabase
      .from('sessions')
      .insert([
        {
          staff_id: staffId,
          login_location: loginLocation || 'Unknown',
          status: 'active'
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating session:', error)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      session
    })

  } catch (error) {
    console.error('Session start error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
