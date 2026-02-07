// lib/ai-client.ts
/**
 * AI Client for Entropy Reverse Project
 * Supports: Custom AI API (OpenAI-compatible) or Alibaba Cloud Qwen
 */

// 检查是否使用自定义AI接口
const useCustomAI = !!process.env.AI_BASE_URL && !!process.env.AI_API_KEY;

// 自定义AI配置
const AI_BASE_URL = process.env.AI_BASE_URL;
const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL_VISION = process.env.AI_MODEL_VISION || 'gpt-4-vision-preview';
const AI_MODEL_TEXT = process.env.AI_MODEL_TEXT || 'gpt-4';

// 阿里云通义千问配置
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
const DASHSCOPE_TEXT_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

// 验证配置（延迟到运行时）
function validateConfig() {
  if (!useCustomAI && !DASHSCOPE_API_KEY) {
    throw new Error('Please configure either custom AI (AI_BASE_URL + AI_API_KEY) or DASHSCOPE_API_KEY');
  }
}

/**
 * 调用自定义AI视觉模型（OpenAI兼容格式）
 */
async function callCustomVision(imageBase64: string, prompt: string): Promise<string> {
  const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL_VISION,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
          ]
        }
      ],
      max_tokens: 1000,
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Custom AI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 调用自定义AI文本模型（OpenAI兼容格式）
 */
async function callCustomText(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90秒超时

  try {
    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL_TEXT,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that returns responses in JSON format.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Custom AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('AI API request timeout (90s)');
    }
    throw error;
  }
}

/**
 * 调用通义千问视觉模型
 */
async function callQwenVision(imageBase64: string, prompt: string): Promise<string> {
  const response = await fetch(DASHSCOPE_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-vl-plus',
      input: {
        messages: [
          {
            role: 'user',
            content: [
              { text: prompt },
              { image: `data:image/jpeg;base64,${imageBase64}` }
            ]
          }
        ]
      },
      parameters: {
        result_format: 'message'
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Qwen API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.output?.choices?.[0]?.message?.content?.[0]?.text) {
    return data.output.choices[0].message.content[0].text;
  }

  throw new Error('Invalid response format from Qwen API');
}

/**
 * 调用通义千问文本模型
 */
async function callQwenText(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90秒超时

  try {
    const response = await fetch(DASHSCOPE_TEXT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-plus',
        input: {
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that returns responses in JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        parameters: {
          result_format: 'message',
          temperature: 0.8
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Qwen API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.output?.choices?.[0]?.message?.content) {
      return data.output.choices[0].message.content;
    }

    throw new Error('Invalid response format from Qwen API');
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Qwen API request timeout (90s)');
    }
    throw error;
  }
}

/**
 * 统一的视觉API调用接口
 */
export async function callVisionAPI(imageBase64: string, prompt: string): Promise<string> {
  validateConfig();
  if (useCustomAI) {
    console.log('Using custom AI vision model:', AI_MODEL_VISION);
    return callCustomVision(imageBase64, prompt);
  } else {
    console.log('Using Qwen vision model');
    return callQwenVision(imageBase64, prompt);
  }
}

/**
 * 统一的文本API调用接口
 */
export async function callTextAPI(prompt: string): Promise<string> {
  validateConfig();
  if (useCustomAI) {
    console.log('Using custom AI text model:', AI_MODEL_TEXT);
    return callCustomText(prompt);
  } else {
    console.log('Using Qwen text model');
    return callQwenText(prompt);
  }
}

/**
 * System prompt for image identification
 */
export const IDENTIFICATION_PROMPT = `识别图片中的主要物体，返回JSON格式（中文）：

{
  "name": "具体名称（如'iPhone 15 Pro'而非'手机'）",
  "category": "类别（如'电子产品'、'交通工具'、'家具'）",
  "brief_description": "客观描述（2-3句话，包含材料、功能）"
}

要求：准确、具体、客观，使用专业中文。`;

/**
 * Generate system prompt for deconstruction
 * @param currentItem - The item to deconstruct
 * @param parentContext - Optional parent context for better understanding
 */
export function getDeconstructionPrompt(currentItem: string, parentContext?: string): string {
  const contextNote = parentContext ? `\nContext: This item is part of "${parentContext}".` : '';

  return `Role: You are a manufacturing and materials expert analyzing product composition and supply chains.

Task: Break down "${currentItem}" into its constituent components or materials (one level only).${contextNote}

CRITICAL CONSTRAINTS:
1. Maximum decomposition depth: 6 levels total
2. Final leaf nodes MUST be from the Basic Elements List below
3. Be LESS detailed - skip minor components, focus on major materials
4. When close to basic elements, jump directly to them (don't over-decompose)

BASIC ELEMENTS LIST (Final Leaf Nodes MUST be from this list):
🌿 Organic/Biological:
- Wood (木材)
- Cotton/Fiber (棉/植物纤维)
- Natural Rubber (天然橡胶)
- Biomass (生物质/食物)

🛢️ Fossil/Chemical:
- Crude Oil (原油)
- Coal (煤炭)

💎 Minerals/Metals:
- Iron Ore (铁矿石)
- Copper Ore (铜矿石)
- Bauxite (铝土矿)
- Silica Sand (硅砂/石英)
- Gold (金)
- Lithium (锂)

💧 Basic Elements:
- Water (水)
- Clay/Stone (黏土/石头)

DECOMPOSITION STRATEGY (Maximum 6 levels):

Level 1 - ASSEMBLED PRODUCTS:
→ Break into 3-5 major functional components only
→ Example: "Smartphone" → Display, Battery, Circuit board, Housing

Level 2-3 - MAJOR COMPONENTS:
→ Break into main material types (skip minor parts)
→ Example: "Display" → Glass, Plastic frame, Metal connectors

Level 4-5 - MATERIALS:
→ Identify the material category
→ Example: "Glass" → Silica Sand, Soda ash (from Clay/Stone)
→ Example: "Plastic" → Crude Oil

Level 6 - BASIC ELEMENTS:
→ MUST be from the Basic Elements List above
→ Mark is_raw_material = true

IMPORTANT RULES:
1. Use Chinese for all names and descriptions (中文输出)
2. Be LESS precise - combine similar materials, skip minor components
3. When you reach a material that's 1-2 steps from basic elements, jump directly
4. NEVER exceed 6 levels of decomposition
5. Final nodes MUST match the Basic Elements List exactly
6. Skip chemical synthesis steps - go straight to basic elements

EXAMPLES:

✓ "塑料瓶" → 塑料 → 原油 (2 levels, good!)
✓ "玻璃窗" → 玻璃 → 硅砂 (2 levels, good!)
✓ "钢架" → 钢材 → 铁矿石, 煤炭 (2 levels, good!)
✓ "电路板" → PCB基板, 铜线, 焊料 → (next level: 硅砂, 铜矿石, etc.)

❌ "塑料瓶" → 聚乙烯树脂 → 聚合物颗粒 → 精炼石油 → 原油 (TOO DETAILED!)

Output Format: JSON only (Chinese names and descriptions).
{
  "parent_item": "${currentItem}",
  "parts": [
    {
      "name": "组件或材料名称（中文）",
      "description": "功能或特性（中文）",
      "is_raw_material": true or false
    }
  ]
}`;
}
