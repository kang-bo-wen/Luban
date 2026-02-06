// app/api/deconstruct/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { callQwenText, getDeconstructionPrompt } from '@/lib/ai-client';
import { DeconstructionResponse } from '@/types/graph';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemName, parentContext } = body;

    // Validate input
    if (!itemName || typeof itemName !== 'string') {
      return NextResponse.json(
        { error: 'itemName is required and must be a string' },
        { status: 400 }
      );
    }

    // Generate the prompt
    const prompt = getDeconstructionPrompt(itemName, parentContext);

    // Call Qwen Text API
    const text = await callQwenText(prompt);

    // Clean up markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse the JSON response
    let deconstructionData: DeconstructionResponse;
    try {
      deconstructionData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanedText);
      return NextResponse.json(
        { error: 'Failed to parse AI response', details: cleanedText },
        { status: 500 }
      );
    }

    // Validate the response structure
    if (!deconstructionData.parent_item || !Array.isArray(deconstructionData.parts)) {
      return NextResponse.json(
        { error: 'Invalid response structure from AI', data: deconstructionData },
        { status: 500 }
      );
    }

    return NextResponse.json(deconstructionData);
  } catch (error) {
    console.error('Error in deconstruct API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
