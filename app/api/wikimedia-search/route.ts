// app/api/wikimedia-search/route.ts
/**
 * Pixabay Image Search API
 * Searches for images on Pixabay and returns the best match
 */

import { NextRequest, NextResponse } from 'next/server';

interface PixabaySearchResult {
  id: number;
  pageURL: string;
  user: string;
  largeImageURL: string;
  webformatURL: string;
  previewURL: string;
}

/**
 * Search Pixabay for images
 * @param searchTerm - The search term (English or Chinese)
 * @param limit - Number of results to return (default: 1)
 */
async function searchPixabay(searchTerm: string, limit: number = 1): Promise<PixabaySearchResult[]> {
  try {
    const apiKey = process.env.PIXABAY_API_KEY?.trim();

    if (!apiKey) {
      console.error('❌ PIXABAY_API_KEY is not configured');
      return [];
    }

    // Pixabay API endpoint
    const apiUrl = 'https://pixabay.com/api/';

    // Pixabay requires per_page to be between 3 and 200
    const perPage = Math.max(3, Math.min(200, limit));

    const params = new URLSearchParams({
      key: apiKey,
      q: searchTerm,
      per_page: String(perPage),
      page: '1',
      image_type: 'photo',
      safesearch: 'true'
    });

    const fullUrl = `${apiUrl}?${params}`;

    const response = await fetch(fullUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Pixabay API error:', response.status, errorText);
      throw new Error(`Pixabay API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.hits || !Array.isArray(data.hits)) {
      return [];
    }

    // Return only the requested number of results
    return (data.hits as PixabaySearchResult[]).slice(0, limit);
  } catch (error) {
    console.error('❌ Pixabay search error:', error);
    return [];
  }
}

/**
 * POST /api/wikimedia-search
 * Request body: { searchTerm: string }
 * Response: { imageUrl: string | null, thumbnail: string | null, photographer?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { searchTerm } = await request.json();

    if (!searchTerm || typeof searchTerm !== 'string') {
      return NextResponse.json(
        { error: 'Invalid search term' },
        { status: 400 }
      );
    }

    const results = await searchPixabay(searchTerm, 1);

    if (results.length === 0) {
      return NextResponse.json({
        imageUrl: null,
        thumbnail: null
      });
    }

    const bestMatch = results[0];

    return NextResponse.json({
      imageUrl: bestMatch.largeImageURL,
      thumbnail: bestMatch.webformatURL,
      photographer: bestMatch.user
    });
  } catch (error: any) {
    console.error('Pixabay search API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
