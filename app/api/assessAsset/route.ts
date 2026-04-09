import { NextRequest, NextResponse } from 'next/server';
import { getAiProvider } from '@/lib/ai/aiFactory';

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
    geminiKey: !!process.env.GEMINI_API_KEY,
  });

  try {
    const body = await request.json();
    const { image, assetId, locationId, mimeType } = body;

    if (!image || !assetId || !locationId) {
      return NextResponse.json(
        { error: 'Missing required fields: image, assetId, locationId' },
        { status: 400 }
      );
    }

    const ai = getAiProvider();
    const aiResult = await ai.assessAssetCondition(image, mimeType);

    return NextResponse.json({
      success: true,
      assessment: {
        condition: aiResult.condition,
        maintenanceNeeded: aiResult.maintenanceNeeded,
        priority: aiResult.priority,
        issues: aiResult.issues,
        fullResponse: aiResult.fullResponse,
      },
    });

  } catch (error) {
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