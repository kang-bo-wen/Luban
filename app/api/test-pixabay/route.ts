import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.PIXABAY_API_KEY?.trim();

  const diagnostics = {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    apiKeyFirst10: apiKey?.substring(0, 10) || 'N/A',
    apiKeyLast10: apiKey?.substring(apiKey.length - 10) || 'N/A',
    hasNewlines: apiKey?.includes('\n') || false,
    hasCarriageReturns: apiKey?.includes('\r') || false,
    apiKeyCharCodes: apiKey ? Array.from(apiKey).slice(0, 20).map(c => c.charCodeAt(0)) : []
  };

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: 'PIXABAY_API_KEY not configured',
      diagnostics
    });
  }

  try {
    const testUrl = `https://pixabay.com/api/?key=${apiKey}&q=test&per_page=3`;
    const response = await fetch(testUrl);
    const data = await response.json();

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      diagnostics,
      response: data
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      diagnostics
    });
  }
}
