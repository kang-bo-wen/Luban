# 使用 Node.js 18 镜像
FROM node:18-slim

# 安装 OpenSSL（Prisma 需要）
RUN apt-get update -y && apt-get install -y openssl

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm install

# 复制所有文件
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

# 构建应用
RUN npm run build

# 暴露端口（ModelScope 使用 7860）
EXPOSE 7860

# 设置环境变量
ENV PORT=7860
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

# 启动应用
CMD ["npm", "start"]
