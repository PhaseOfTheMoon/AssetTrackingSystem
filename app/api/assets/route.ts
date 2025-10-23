// File 1: app/api/assets/route.ts
import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const start = (page - 1) * limit

    const { count, error: countError } = await supabase
      .from('asset')
      .select('*', { count: 'exact', head: true })

    if (countError) throw countError

    const { data, error } = await supabase
      .from('asset')
      .select('*')
      .order('created_dt', { ascending: false })
      .range(start, start + limit - 1)

    if (error) throw error

    return NextResponse.json({
      data: data || [],
      page,
      limit,
      totalItems: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('GET /api/assets error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch assets',
        details: error
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.asset_id ||!body.name || !body.model || !body.category || !body.location_id || !body.department_id) {
      return NextResponse.json(
        { error: 'Missing required fields: asset id, name, model, category, location_id, department_id' },
        { status: 400 }
      )
    }
    const { data, error } = await supabase
      .from('asset')
      .insert([
        {
          asset_id: body.asset_id,  
          name: body.name,
          model: body.model,
          description: body.description || '',
          condition: parseInt(body.condition) || 0,
          location_id: body.location_id,
          department_id: body.department_id,
          category: body.category,
          created_dt: new Date().toISOString(),
          updated_dt: new Date().toISOString()
        }
      ])
      .select()

    if (error) throw error

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    console.error('POST /api/assets error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create asset',
        details: error
      },
      { status: 500 }
    )
  }
}