// app/api/identify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { callQwenVision, IDENTIFICATION_PROMPT } from '@/lib/ai-client';
import { IdentificationResponse } from '@/types/graph';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    // Validate input
    if (!imageFile) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      );
    }

    // Convert image to base64
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Call Qwen Vision API
    const text = await callQwenVision(base64Image, IDENTIFICATION_PROMPT);

    // Clean up markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse the JSON response
    let identificationData: IdentificationResponse;
    try {
      identificationData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanedText);
      return NextResponse.json(
        { error: 'Failed to parse AI response', details: cleanedText },
        { status: 500 }
      );
    }

    // Validate the response structure
    if (!identificationData.name || !identificationData.category) {
      return NextResponse.json(
        { error: 'Invalid response structure from AI', data: identificationData },
        { status: 500 }
      );
    }

    return NextResponse.json(identificationData);
  } catch (error) {
    console.error('Error in identify API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
