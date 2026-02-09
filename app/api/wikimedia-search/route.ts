// app/api/wikimedia-search/route.ts
/**
 * Pexels Image Search API
 * Searches for images on Pexels and returns the best match
 */

import { NextRequest, NextResponse } from 'next/server';

interface PexelsSearchResult {
  id: number;
  url: string;
  photographer: string;
  src: {
    original: string;
    large: string;
    medium: string;
    small: string;
  };
}

/**
 * Search Pexels for images
 * @param searchTerm - The search term (English or Chinese)
 * @param limit - Number of results to return (default: 1)
 */
async function searchPexels(searchTerm: string, limit: number = 1): Promise<PexelsSearchResult[]> {
  try {
    const apiKey = process.env.PEXELS_API_KEY;

    if (!apiKey) {
      console.error('PEXELS_API_KEY is not configured');
      return [];
    }

    // Pexels API endpoint
    const apiUrl = 'https://api.pexels.com/v1/search';

    const params = new URLSearchParams({
      query: searchTerm,
      per_page: String(limit),
      page: '1'
    });

    const response = await fetch(`${apiUrl}?${params}`, {
      headers: {
        'Authorization': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.photos || !Array.isArray(data.photos)) {
      return [];
    }

    return data.photos as PexelsSearchResult[];
  } catch (error) {
    console.error('Pexels search error:', error);
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

    console.log(`Searching Pexels for: "${searchTerm}"`);

    const results = await searchPexels(searchTerm, 1);

    if (results.length === 0) {
      console.log(`No results found for: "${searchTerm}"`);
      return NextResponse.json({
        imageUrl: null,
        thumbnail: null
      });
    }

    const bestMatch = results[0];
    console.log(`Found image by ${bestMatch.photographer}: ${bestMatch.url}`);

    return NextResponse.json({
      imageUrl: bestMatch.src.large,
      thumbnail: bestMatch.src.medium,
      photographer: bestMatch.photographer
    });
  } catch (error: any) {
    console.error('Pexels search API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
