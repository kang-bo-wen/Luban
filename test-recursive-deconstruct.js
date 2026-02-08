// test-recursive-deconstruct.js
// 递归拆解测试脚本 - 演示完整的物体拆解过程

const API_BASE = 'http://localhost:3000';

// 存储完整的拆解树
const deconstructionTree = {
  nodes: [],
  edges: []
};

// 递归拆解函数
async function deconstructItem(itemName, parentContext = null, depth = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}🔍 正在拆解: ${itemName}`);

  try {
    const response = await fetch(`${API_BASE}/api/deconstruct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemName,
        parentContext
      })
    });

    if (!response.ok) {
      console.error(`${indent}❌ API错误: ${response.status}`);
      return;
    }

    const data = await response.json();
    console.log(`${indent}✅ 找到 ${data.parts.length} 个组成部分\n`);

    // 处理每个部分
    for (const part of data.parts) {
      const partIndent = '  '.repeat(depth + 1);

      if (part.is_raw_material) {
        // 到达原材料 - 终止条件
        console.log(`${partIndent}🌿 ${part.name} (原材料)`);
        console.log(`${partIndent}   描述: ${part.description}`);
        console.log(`${partIndent}   ✋ 拆解终止 - 这是自然物质\n`);
      } else {
        // 继续递归拆解
        console.log(`${partIndent}📦 ${part.name}`);
        console.log(`${partIndent}   描述: ${part.description}`);
        console.log(`${partIndent}   ⬇️  继续拆解...\n`);

        // 递归调用，传入父级上下文
        await deconstructItem(part.name, itemName, depth + 1);
      }
    }

    console.log(`${indent}✓ ${itemName} 拆解完成\n`);
  } catch (error) {
    console.error(`${indent}❌ 错误:`, error.message);
  }
}

// 主测试函数
async function runTest() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     Break It Down - 递归拆解测试                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const testItems = [
    '智能手机',
    // '咖啡杯',
    // '汽车'
  ];

  for (const item of testItems) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`开始拆解: ${item}`);
    console.log('='.repeat(60) + '\n');

    await deconstructItem(item);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`${item} 完整拆解完成！`);
    console.log('='.repeat(60) + '\n');

    // 等待一下再测试下一个物体
    if (testItems.indexOf(item) < testItems.length - 1) {
      console.log('等待3秒后测试下一个物体...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n✅ 所有测试完成！');
}

// 运行测试
runTest().catch(console.error);
