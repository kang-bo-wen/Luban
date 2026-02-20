import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callTextAPI } from '@/lib/ai-client';

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
      console.log(`知识卡片请求失败，${delay}ms后重试 (${i + 1}/${maxRetries})...`);

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export async function POST(request: NextRequest) {
  // 检查认证
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { parentName, parentDescription, children } = await request.json();

    if (!parentName || !children || children.length === 0) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 构建知识卡片提示词
    const childrenList = children.map((c: any, idx: number) =>
      `${idx + 1}. ${c.name}${c.isRawMaterial ? ' (原材料)' : ''}: ${c.description}`
    ).join('\n');

    const prompt = `生成"${parentName}"的制造流程卡片，使用以下组成部分：

${childrenList}

返回JSON格式（严格遵守格式，不要添加markdown代码块）：
{
  "title": "${parentName}制造流程",
  "doc_number": "PROC-${Date.now().toString().slice(-6)}",
  "steps": [
    {
      "step_number": 1,
      "action_title": "步骤标题（3-5字）",
      "description": "步骤描述（15-25字）",
      "parameters": [
        {"label": "核心材料", "value": "具体材料名"},
        {"label": "主要参数", "value": "温度/压力等"}
      ],
      "ai_image_prompt": "Technical drawing of [action], vintage blueprint style, detailed engineering lines, white background"
    }
  ]
}

要求：
1. 生成1-5个步骤，按制造顺序排列
2. 每个步骤的action_title要简洁（如"材料准备"、"组装焊接"、"质检封装"）
3. description说明该步骤的具体操作，可以详细一点，但是不超过100字**必须在描述中原封不动地使用上述组成部分的名称**（如"${children[0]?.name}"等）
4. parameters列出1-2个关键参数或材料，label必须使用"核心材料"或"主要参数"，value填写具体内容（优先使用上述组成部分的名称）
5. ai_image_prompt用英文描述该步骤的技术图纸风格提示词
6. 直接返回JSON，不要包含\`\`\`json标记`;

    // 使用重试机制调用AI API
    const content = await retryWithBackoff(() => callTextAPI(prompt));

    // 清理可能的markdown代码块标记
    const cleanedContent = content.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

    // 解析JSON
    const jsonData = JSON.parse(cleanedContent);

    return NextResponse.json(jsonData);
  } catch (error: any) {
    console.error('知识卡片生成错误:', error);

    // 返回更详细的错误信息
    const errorMessage = error.message || '知识卡片生成失败';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
