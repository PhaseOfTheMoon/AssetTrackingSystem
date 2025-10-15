// File 2: app/api/assets/[asset_id]/route.ts
import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { asset_id: string } }
) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('asset')
      .update({
        name: body.name,
        model: body.model,
        description: body.description,
        condition: parseInt(body.condition) || 0,
        location_id: body.location_id,
        department_id: body.department_id,
        category: body.category,
        created_dt: new Date().toISOString(),
        updated_dt: new Date().toISOString()
      })
      .eq('asset_id', params.asset_id)
      .select()

    if (error) throw error

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('PUT /api/assets/[asset_id] error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update asset',
        details: error
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { asset_id: string } }
) {
  try {
    const { error } = await supabase
      .from('asset')
      .delete()
      .eq('asset_id', params.asset_id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Asset deleted successfully' })
  } catch (error) {
    console.error('DELETE /api/assets/[asset_id] error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to delete asset',
        details: error
      },
      { status: 500 }
    )
  }
}