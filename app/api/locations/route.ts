// File 1: app/api/locations/route.ts
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('location')
      .select('*')
      .order('location_id', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      data: data || []
    })
  } catch (error) {
    console.error('GET /api/locations error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch locations',
        details: error
      },
      { status: 500 }
    )
  }
}

