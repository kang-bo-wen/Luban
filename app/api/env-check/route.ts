// app/api/env-check/route.ts
/**
 * Environment Variables Check Endpoint
 * 用于检查环境变量是否正确配置
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== Environment Check Endpoint Called ===');
    console.log('PIXABAY_API_KEY exists:', !!process.env.PIXABAY_API_KEY);
    console.log('All env keys:', Object.keys(process.env).filter(k =>
      k.includes('PIXABAY') || k.includes('AI_') || k.includes('DASHSCOPE')
    ));

    const envStatus = {
      PIXABAY_API_KEY: !!process.env.PIXABAY_API_KEY,
      PIXABAY_API_KEY_LENGTH: process.env.PIXABAY_API_KEY?.length || 0,
      PIXABAY_API_KEY_PREFIX: process.env.PIXABAY_API_KEY?.substring(0, 8) || 'NOT_SET',

      AI_BASE_URL: !!process.env.AI_BASE_URL,
      AI_API_KEY: !!process.env.AI_API_KEY,
      AI_MODEL_VISION: process.env.AI_MODEL_VISION || 'NOT_SET',
      AI_MODEL_TEXT: process.env.AI_MODEL_TEXT || 'NOT_SET',

      DASHSCOPE_API_KEY: !!process.env.DASHSCOPE_API_KEY,

      NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
      VERCEL_ENV: process.env.VERCEL_ENV || 'NOT_SET',

      // 添加所有环境变量的键名列表（用于调试）
      ALL_ENV_KEYS: Object.keys(process.env).filter(k =>
        !k.includes('PASSWORD') && !k.includes('SECRET') && !k.includes('TOKEN')
      ).sort(),
    };

    return NextResponse.json({
      success: true,
      message: '环境变量检查成功',
      status: envStatus,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (error: any) {
    console.error('Environment check error:', error);
    return NextResponse.json({
      success: false,
      message: '环境变量检查失败',
      error: error.message,
      timestamp: new Date().toISOString(),
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  }
}
