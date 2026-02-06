// lib/ai-client.ts
/**
 * AI Client for Entropy Reverse Project
 * Supports: Alibaba Cloud Qwen (通义千问)
 */

// 阿里云通义千问API配置
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

if (!DASHSCOPE_API_KEY) {
  throw new Error('DASHSCOPE_API_KEY is not defined in environment variables');
}

const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
const DASHSCOPE_TEXT_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

/**
 * 调用通义千问视觉模型（用于图片识别）
 */
export async function callQwenVision(imageBase64: string, prompt: string): Promise<string> {
  const response = await fetch(DASHSCOPE_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-vl-plus', // 或使用 'qwen-vl-max' 获得更好效果
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
 * 调用通义千问文本模型（用于物体拆解）
 */
export async function callQwenText(prompt: string): Promise<string> {
  const response = await fetch(DASHSCOPE_TEXT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-plus', // 或使用 'qwen-max' 获得更好效果
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
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Qwen API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.output?.choices?.[0]?.message?.content) {
    return data.output.choices[0].message.content;
  }

  throw new Error('Invalid response format from Qwen API');
}

/**
 * System prompt for image identification
 */
export const IDENTIFICATION_PROMPT = `Role: You are identifying objects in images for a kids' game.

Task: Look at this image and identify the main object.

Output: Return ONLY a JSON object with these fields:
- name: A specific name (e.g., "iPhone 15 Pro" not just "phone", "Red bicycle" not just "bicycle")
- category: What type of thing it is (e.g., "Electronic", "Vehicle", "Furniture", "Toy")
- brief_description: A detailed description that a 10-year-old can understand (2-3 sentences)

Example outputs:
{
  "name": "iPhone 15 Pro",
  "category": "Electronic",
  "brief_description": "A black smartphone with three cameras on the back. It has a large touchscreen and is made by Apple. People use it to make calls, take photos, and use apps."
}

{
  "name": "Red Mountain Bike",
  "category": "Vehicle",
  "brief_description": "A red bicycle with thick tires for riding on rough trails. It has gears to help you go up hills and hand brakes to stop. The seat can be adjusted for different heights."
}

Remember: Be specific and descriptive, but use simple words that kids understand!

Output Format: JSON only.`;

/**
 * Generate system prompt for deconstruction
 * @param currentItem - The item to deconstruct
 * @param parentContext - Optional parent context for better understanding
 */
export function getDeconstructionPrompt(currentItem: string, parentContext?: string): string {
  const contextNote = parentContext ? `\nContext: This item is part of "${parentContext}".` : '';

  return `Role: You are explaining how things are made to a 10-year-old child in a game.

Task: Break down "${currentItem}" into what it's made of (one level only).${contextNote}

IMPORTANT RULES FOR A 10-YEAR-OLD:
- Use SIMPLE words that kids understand
- NO chemistry words (NO atoms, molecules, compounds, elements, etc.)
- Only use things you can SEE and TOUCH in nature

How to break things down:

1. If it's something BUILT by putting parts together (like a phone, car, or toy):
   → Show all the parts you can take apart
   → Example: "Phone" → Screen, Battery, Buttons, Case

2. If it's a PART of something (like a screen or wheel):
   → Show what materials it's made from
   → Example: "Screen" → Glass, Plastic frame

3. If it's a MATERIAL (like plastic, glass, metal):
   → Jump straight to natural things from nature
   → Example: "Plastic" → Oil from underground, Natural gas
   → Example: "Glass" → Sand from beach, Limestone rocks
   → Example: "Metal" → Metal rocks from mines

NATURAL MATERIALS (things from nature - STOP HERE):
✓ From the ground: Sand, Rocks, Clay, Dirt, Coal, Metal ores (iron rocks, copper rocks, gold rocks)
✓ From plants: Wood, Leaves, Cotton, Bamboo, Tree sap (rubber)
✓ Liquids: Water, Underground oil, Natural gas
✓ From animals: Leather, Wool, Silk

❌ NEVER SAY THESE (too complicated for kids):
- Silicon, Silica, Quartz → Just say "Sand"
- Cellulose, Lignin → Just say "Wood"
- Iron oxide, Ferrous → Just say "Iron ore" or "Iron rocks"
- Sodium carbonate, Calcium → Just say "Limestone" or "Salt rocks"
- Petroleum → Say "Underground oil" or just "Oil"
- ANY chemical names or formulas

EXAMPLES (talk like this):
✓ "Plastic bottle" → Underground oil, Natural gas
✓ "Glass window" → Sand, Limestone rocks
✓ "Steel knife" → Iron ore (iron rocks), Coal
✓ "Paper" → Wood, Water
✓ "Rubber tire" → Tree sap (rubber), Oil
✓ "Concrete" → Sand, Small rocks (gravel), Limestone, Water

Remember: If it comes from nature and a kid can understand it, mark it as RAW_MATERIAL = true

Output Format: JSON only.
{
  "parent_item": "${currentItem}",
  "parts": [
    {
      "name": "Simple name a kid understands",
      "description": "What it does, in simple words",
      "is_raw_material": true or false
    }
  ]
}`;
}
