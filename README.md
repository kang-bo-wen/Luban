---
title: Entropy Reverse - Deconstruction
emoji: 🎮
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
license: MIT
tags:
  - AI
  - Game
  - Visualization
  - Next.js
---

# Entropy Reverse - Mode 1: Deconstruction

一个交互式的"Mine & Craft"游戏，通过AI驱动的可视化方式，将现代物体拆解到其自然/元素根源。

## 🎮 项目概述

这是一个为Hackathon比赛开发的创新项目，用户可以：
1. 上传任意物体的图片
2. AI识别物体并创建根节点
3. 点击节点递归拆解，直到达到自然原材料
4. 通过可视化的树状图展示物体的完整构成

## 🛠️ 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **可视化**: React Flow
- **AI**: 阿里云通义千问 (Qwen)
- **动画**: Framer Motion

## 📦 安装步骤

1. 克隆项目并安装依赖：
```bash
npm install
```

2. 配置环境变量：
```bash
cp .env.local.example .env.local
```

3. 在 `.env.local` 中填入你的通义千问 API Key：
```
DASHSCOPE_API_KEY=your_actual_api_key_here
```

获取API Key: https://dashscope.console.aliyun.com/apiKey

4. 启动开发服务器：
```bash
npm run dev
```

5. 打开浏览器访问 http://localhost:3000

## 🧪 测试 API

详细的API测试指南请查看 [API-TESTING.md](./API-TESTING.md)

快速测试:
```bash
# 测试物体拆解
curl -X POST http://localhost:3000/api/deconstruct \
  -H "Content-Type: application/json" \
  -d '{"itemName": "iPhone 15"}'
```

## 🚀 部署到 ModelScope

### 构建生产版本
```bash
npm run build
```

### 启动生产服务器
```bash
npm start
```

## 📁 项目结构

```
entropy-reverse/
├── app/
│   └── api/
│       ├── identify/       # 图片识别API
│       └── deconstruct/    # 物体拆解API
├── lib/
│   └── gemini.ts          # Gemini AI配置和Prompt
├── types/
│   └── graph.ts           # TypeScript类型定义
├── components/            # React组件（待创建）
│   ├── MatterGraph.tsx   # 主可视化组件
│   └── MatterNode.tsx    # 自定义节点组件
└── package.json
```

## 🎯 核心功能

### 1. 图片识别 (Phase 1)
- 用户上传图片
- Gemini识别主要物体
- 创建根节点

### 2. 递归拆解 (Phase 2)
- 点击节点触发AI分析
- 返回直接组成部分
- 自动判断是否为原材料

### 3. 终止条件 (Phase 3)
- 识别自然原材料（木材、水、沙子等）
- 标记为终止节点
- 视觉高亮显示"已收集"

## 🔑 API端点

### POST /api/identify
上传图片并识别物体
```typescript
// Request: FormData with 'image' file
// Response:
{
  "name": "iPhone 15",
  "category": "Electronic",
  "brief_description": "A modern smartphone..."
}
```

### POST /api/deconstruct
拆解物体到组成部分
```typescript
// Request:
{
  "itemName": "iPhone 15",
  "parentContext": "Electronic Device" // optional
}

// Response:
{
  "parent_item": "iPhone 15",
  "parts": [
    {
      "name": "Screen",
      "description": "Display component",
      "is_raw_material": false
    },
    ...
  ]
}
```

## 📝 下一步开发

- [ ] 创建主页面UI
- [ ] 实现图片上传组件
- [ ] 创建React Flow可视化组件
- [ ] 添加节点点击交互
- [ ] 实现动画效果
- [ ] 添加收集进度追踪
- [ ] 优化移动端体验

## 🤝 贡献

这是一个Hackathon项目，欢迎提出建议和改进！

## 📄 许可证

MIT License
# Trigger rebuild
