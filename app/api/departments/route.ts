import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('department')
      .select('*')
      .order('department_id', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      data: data || []
    })
  } catch (error) {
    console.error('GET /api/departments error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch departments',
        details: error
      },
      { status: 500 }
    )
  }
}