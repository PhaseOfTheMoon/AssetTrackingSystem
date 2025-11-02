// app/api/assets/[asset_id]/route.ts
import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { asset_id: string } }
) {
  try {
    const body = await request.json()

    console.log('Updating asset:', params.asset_id, 'with data:', body)

    // Prepare update object
    const updateObject: any = {
      updated_dt: new Date().toISOString()
    }

    // Only include fields that are provided
    if (body.name) updateObject.name = body.name
    if (body.model) updateObject.model = body.model
    if (body.description !== undefined) updateObject.description = body.description
    if (body.condition) updateObject.condition = body.condition // Keep as string
    if (body.location_id) updateObject.location_id = body.location_id
    if (body.department_id) updateObject.department_id = body.department_id
    if (body.category) updateObject.category = body.category

    const { data, error } = await supabase
      .from('asset')
      .update(updateObject)
      .eq('asset_id', params.asset_id)
      .select()

    if (error) {
      console.error('Supabase update error:', error)
      throw error
    }

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

    if (error) {
      console.error('Supabase delete error:', error)
      throw error
    }

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