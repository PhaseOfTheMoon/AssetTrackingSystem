import { NextRequest, NextResponse } from 'next/server';
import { getAiProvider } from '@/lib/ai/aiFactory';
import { saveAssessment } from '@/lib/supabase/assessmentService';

const payloadSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
  assetId: z.string().uuid('Invalid Asset ID'),
  locationId: z.string().uuid('Invalid Location ID'),
  userId: z.string().uuid().optional().nullable(),
  mimeType: z.string().optional(),
}).strict();

export async function POST(request: NextRequest) {
  console.log('ENV CHECK:', {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    geminiKey: !!process.env.GEMINI_API_KEY,
  });

  try {
    const body = await request.json();
    const validatedData = payloadSchema.parse(body);

    if (!image || !assetId || !locationId) {
      return NextResponse.json(
        { error: 'Missing required fields: image, assetId, locationId' },
        { status: 400 }
      );
    }

    const ai = getAiProvider();
    const aiResult = await ai.assessAssetCondition(image, mimeType);

    const savedAssessment = await saveAssessment(
      {
        asset_id: assetId,
        location_id: locationId,
        condition_status: aiResult.condition,
        maintenance_needed: aiResult.maintenanceNeeded,
        priority: aiResult.priority,
        ai_response: aiResult.fullResponse,
        assessed_by: userId || null,
      },
      image
    );

    return NextResponse.json({
      success: true,
      assessment: {
        id: savedAssessment.id,
        condition: aiResult.condition,
        maintenanceNeeded: aiResult.maintenanceNeeded,
        priority: aiResult.priority,
        issues: aiResult.issues,
        assessedAt: savedAssessment.assessed_dt,
      },
    });

  } catch (error) {
    // Handle invalid/unrecognised asset images 
    // Return 422 Unprocessable Entity so the frontend can show a friendly message
    // without treating it as a server crash.
    if (error instanceof Error && error.message.startsWith('INVALID_ASSET:')) {
      const detail = error.message.replace('INVALID_ASSET: ', '');
      return NextResponse.json(
        {
          error: 'Invalid asset image',
          detail,
          acceptedAssets: [
            'Chair', 'Table', 'Whiteboard', 'Laptop',
            'Desktop computer', 'Monitor', 'CPU', 'Mouse', 'Keyboard',
          ],
        },
        { status: 422 }
      );
    }

    console.error('Assessment API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process assessment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}