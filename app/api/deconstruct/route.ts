// app/api/deconstruct/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { callTextAPI, getDeconstructionPrompt } from '@/lib/ai-client';
import { DeconstructionResponse } from '@/types/graph';

// 重试函数
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // 如果是最后一次重试，直接抛出错误
      if (i === maxRetries) {
        break;
      }

      // 计算延迟时间（指数退避）
      const delay = initialDelay * Math.pow(2, i);
      console.log(`拆解请求失败，${delay}ms后重试 (${i + 1}/${maxRetries})...`);

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

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

    // Call Text API with retry logic
    const text = await retryWithBackoff(() => callTextAPI(prompt));

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

    // Search for images on Wikimedia Commons for each part
    const partsWithImages = await Promise.all(
      deconstructionData.parts.map(async (part) => {
        if (!part.searchTerm) {
          return part;
        }

        try {
          const wikimediaResponse = await fetch(`${request.nextUrl.origin}/api/wikimedia-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchTerm: part.searchTerm })
          });

          if (wikimediaResponse.ok) {
            const wikimediaData = await wikimediaResponse.json();
            const imageUrl = wikimediaData.thumbnail || wikimediaData.imageUrl;
            if (imageUrl) {
              console.log(`Found Wikimedia image for "${part.name}" (${part.searchTerm}): ${imageUrl}`);
              return { ...part, imageUrl };
            }
          } else {
            console.warn(`Wikimedia search failed for "${part.name}" (${part.searchTerm})`);
          }
        } catch (wikimediaError) {
          console.error(`Error searching Wikimedia for "${part.name}":`, wikimediaError);
        }

        return part;
      })
    );

    return NextResponse.json({
      ...deconstructionData,
      parts: partsWithImages
    });
  } catch (error) {
    console.error('Error in deconstruct API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
