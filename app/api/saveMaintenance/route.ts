// app/api/saveMaintenance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      asset_id,
      location_id,
      condition_status,
      maintenance_needed,
      priority,
      feedback,
      ai_response,
      image_base64,   // raw base64 string (no data:image prefix)
      image_mime,     // e.g. 'image/jpeg'
      assessed_by,
    } = body;

    // ── STEP 1: Validate location_id exists (same as assessmentService) ──
    const { data: locationExists, error: locationError } = await supabaseAdmin
      .from('Location')
      .select('location_id')
      .eq('location_id', location_id)
      .single();

    if (locationError || !locationExists) {
      return NextResponse.json({
        success: false,
        error: `Invalid location_id: ${location_id} does not exist`,
      });
    }

    // ── STEP 2: Insert DB record first (no image yet) ──
    const { data: assessment, error: assessmentError } = await supabaseAdmin
      .from('Maintenance')
      .insert({
        asset_id,
        location_id,
        condition_status,
        maintenance_needed,
        priority,
        feedback:         feedback ?? null,
        ai_response:      ai_response ?? null,
        assessed_by:      assessed_by ?? null,
        image_url:        null,
        approval_status:  'pending',
      })
      .select()
      .single();

    if (assessmentError) {
      console.error('DB insert error:', assessmentError.message);
      return NextResponse.json({
        success: false,
        error: `Failed to save assessment: ${assessmentError.message}`,
      });
    }

    console.log('Assessment saved:', assessment.id);

    // ── STEP 3: Upload image AFTER DB insert succeeds (same as assessmentService) ──
    let imageUrl: string | null = null;

    if (maintenance_needed && image_base64) {
      try {
        console.log('Uploading image (maintenance needed)...');
        const buffer = Buffer.from(image_base64, 'base64');
        const ext = image_mime === 'image/png' ? 'png' : image_mime === 'image/webp' ? 'webp' : 'jpg';
        const fileName = `${asset_id}_${Date.now()}.${ext}`;

        const { data: uploadData, error: uploadError } = await supabaseAdmin
          .storage
          .from('AssetImage')
          .upload(fileName, buffer, {
            contentType: image_mime ?? 'image/jpeg',
            upsert: false,
          });

        if (uploadError) {
          console.error('Image upload error:', uploadError);
        } else {
          const { data: urlData } = supabaseAdmin
            .storage
            .from('AssetImage')
            .getPublicUrl(fileName);

          imageUrl = urlData.publicUrl;
          console.log('Image uploaded:', imageUrl);

          // ── STEP 4: Update the record with the image URL ──
          await supabaseAdmin
            .from('Maintenance')
            .update({ image_url: imageUrl })
            .eq('id', assessment.id);
        }
      } catch (err) {
        console.error('Error uploading image:', err);
        // DB record is safe — image upload failure is non-fatal
      }
    }

    // ── STEP 5: Update asset condition (same as assessmentService) ──
    const { error: updateError } = await supabaseAdmin
      .from('Asset')
      .update({
        condition:   condition_status,
        updated_dt:  new Date().toISOString(),
      })
      .eq('asset_id', asset_id);

    if (updateError) {
      console.error('Error updating asset condition:', updateError.message);
    }

    return NextResponse.json({
      success: true,
      assessment: {
        id:                 assessment.id,
        asset_id:           assessment.asset_id,
        location_id:        assessment.location_id,
        condition_status:   assessment.condition_status,
        maintenance_needed: assessment.maintenance_needed,
        priority:           assessment.priority,
        feedback:           assessment.feedback,
        ai_response:        assessment.ai_response,
        image_url:          imageUrl,
        approval_status:    assessment.approval_status,
        assessed_dt:        assessment.assessed_dt,
        assessed_by:        assessment.assessed_by,
        created_dt:         assessment.created_dt,
        updated_dt:         assessment.updated_dt,
      },
    });

  } catch (err: any) {
    console.error('saveMaintenance error:', err);
    return NextResponse.json({ success: false, error: err.message });
  }
}