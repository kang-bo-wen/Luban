# ModelScope 部署指南

## 快速部署步骤

### 1. 准备环境变量

在 ModelScope Space 设置中配置以下环境变量：

```bash
# 数据库连接（使用你现有的 Neon 数据库）
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# NextAuth 配置
NEXTAUTH_URL=https://your-space-name.modelscope.cn
NEXTAUTH_SECRET=生成一个随机密钥（运行: openssl rand -base64 32）

# AI API 配置（选择一个）
# 方式1: 阿里云通义千问
DASHSCOPE_API_KEY=your_dashscope_key

# 方式2: 自定义 AI API
AI_BASE_URL=https://your-api.com/v1
AI_API_KEY=your_key
AI_MODEL_VISION=gemini-3-flash-preview
AI_MODEL_TEXT=gemini-3-flash-preview

# Pixabay 图片搜索
PIXABAY_API_KEY=your_pixabay_key
```

### 2. 在 ModelScope 创建 Space

1. 登录 [ModelScope](https://modelscope.cn)
2. 点击 "创建 Space"
3. 选择 "Docker" 类型
4. 填写基本信息：
   - Space 名称：break-it-down（或你喜欢的名称）
   - 可见性：公开
   - 硬件：CPU Basic（免费）

### 3. 连接 GitHub 仓库

1. 在 Space 设置中，选择 "从 Git 仓库导入"
2. 输入仓库地址：`https://github.com/kang-bo-wen/BreakItDown.git`
3. 选择分支：`kang`
4. 点击 "导入"

### 4. 配置环境变量

1. 进入 Space 设置
2. 找到 "环境变量" 部分
3. 添加上面列出的所有环境变量
4. 保存配置

### 5. 部署

1. 点击 "重新构建" 按钮
2. 等待构建完成（约 5-10 分钟）
3. 构建成功后，Space 会自动启动
4. 访问你的 Space URL

### 6. 验证部署

访问以下页面确认部署成功：

- [ ] 首页：`https://your-space.modelscope.cn`
- [ ] 注册页面：`https://your-space.modelscope.cn/register`
- [ ] 登录页面：`https://your-space.modelscope.cn/login`
- [ ] 拆解页面：`https://your-space.modelscope.cn/deconstruct`

## 常见问题

### Q: 构建失败，提示 Prisma 错误
A: 确保 `DATABASE_URL` 环境变量已正确配置

### Q: 应用启动后无法访问
A: 检查端口是否为 7860（ModelScope 标准端口）

### Q: 数据库连接失败
A: 确保 Neon 数据库允许外部连接，检查连接字符串是否包含 `?sslmode=require`

### Q: AI API 调用失败
A: 检查 API 密钥是否正确，确认 API 配额是否充足

## 本地测试 Docker 构建

在部署前，可以本地测试 Docker 构建：

```bash
# 构建镜像
docker build -t break-it-down .

# 运行容器（需要配置环境变量）
docker run -p 7860:7860 \
  -e DATABASE_URL="your_database_url" \
  -e NEXTAUTH_URL="http://localhost:7860" \
  -e NEXTAUTH_SECRET="your_secret" \
  -e AI_BASE_URL="your_ai_url" \
  -e AI_API_KEY="your_ai_key" \
  -e PIXABAY_API_KEY="your_pixabay_key" \
  break-it-down

# 访问 http://localhost:7860
```

## 性能优化建议

1. **启用 Next.js 缓存**：已在 Dockerfile 中配置
2. **使用 CDN**：ModelScope 自动提供
3. **数据库连接池**：Neon 自动管理
4. **会话缓存**：已在代码中实现

## 监控和日志

- 在 ModelScope Space 控制台查看应用日志
- 监控数据库使用情况（Neon 控制台）
- 检查 AI API 调用次数和配额

## 更新部署

当代码更新后：

1. 推送代码到 GitHub
2. 在 ModelScope Space 点击 "重新构建"
3. 等待构建完成
4. 应用会自动重启

## 技术支持

如遇到问题，可以：
1. 查看 ModelScope Space 日志
2. 检查 GitHub Issues
3. 联系技术支持

---

**祝部署顺利！🚀**
