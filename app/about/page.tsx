'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function About() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      }
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          className="max-w-4xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* 返回按钮 */}
          <motion.div variants={itemVariants} className="mb-8">
            <Link href="/">
              <motion.button
                className="px-6 py-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg hover:bg-white/20 transition-all duration-300 flex items-center gap-2"
                whileHover={{ scale: 1.05, x: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>←</span>
                <span>返回首页</span>
              </motion.button>
            </Link>
          </motion.div>

          {/* 标题 */}
          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"
          >
            关于 Break It Down
          </motion.h1>

          {/* 项目简介 */}
          <motion.div
            variants={itemVariants}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-8 mb-8 border border-white/20"
          >
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
              <span>🎯</span>
              <span>项目简介</span>
            </h2>
            <p className="text-lg text-gray-300 leading-relaxed">
              Break It Down 是一个创新的交互式可视化项目，旨在通过 AI 技术帮助用户理解复杂物体的构成。
              我们将任何物体逐层拆解，直至最基本的原材料，让您以全新的视角认识身边的事物。
            </p>
          </motion.div>

          {/* 核心理念 */}
          <motion.div
            variants={itemVariants}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-8 mb-8 border border-white/20"
          >
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
              <span>💡</span>
              <span>核心理念</span>
            </h2>
            <div className="space-y-4 text-gray-300">
              <p className="text-lg leading-relaxed">
                <strong className="text-white">熵逆转</strong> -
                在物理学中，熵代表系统的混乱程度。我们的项目反其道而行之，
                将复杂的成品"逆向"拆解为简单的原材料，让混乱回归有序。
              </p>
              <p className="text-lg leading-relaxed">
                这不仅是一个技术展示，更是一种思维方式：
                <strong className="text-purple-300">从复杂到简单，从表象到本质</strong>。
              </p>
            </div>
          </motion.div>

          {/* 功能特性 */}
          <motion.div
            variants={itemVariants}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-8 mb-8 border border-white/20"
          >
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <span>✨</span>
              <span>功能特性</span>
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-black/30 rounded-lg p-6">
                <div className="text-4xl mb-3">🖼️</div>
                <h3 className="text-xl font-semibold mb-2">AI 图片识别</h3>
                <p className="text-sm text-gray-400">
                  上传图片，AI 自动识别物体类型和名称
                </p>
              </div>
              <div className="bg-black/30 rounded-lg p-6">
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="text-xl font-semibold mb-2">递归拆解</h3>
                <p className="text-sm text-gray-400">
                  逐层拆解物体，直至最基本的原材料
                </p>
              </div>
              <div className="bg-black/30 rounded-lg p-6">
                <div className="text-4xl mb-3">🌳</div>
                <h3 className="text-xl font-semibold mb-2">交互式可视化</h3>
                <p className="text-sm text-gray-400">
                  树状图展示，支持拖拽、缩放、查看详情
                </p>
              </div>
            </div>
          </motion.div>

          {/* 技术栈 */}
          <motion.div
            variants={itemVariants}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-8 mb-8 border border-white/20"
          >
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <span>🛠️</span>
              <span>技术栈</span>
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-black/30 rounded-lg p-4">
                <span className="text-2xl">⚛️</span>
                <div>
                  <div className="font-semibold">Next.js 15 + React 19</div>
                  <div className="text-sm text-gray-400">现代化前端框架</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-black/30 rounded-lg p-4">
                <span className="text-2xl">🤖</span>
                <div>
                  <div className="font-semibold">AI 大模型</div>
                  <div className="text-sm text-gray-400">智能识别与拆解</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-black/30 rounded-lg p-4">
                <span className="text-2xl">🎨</span>
                <div>
                  <div className="font-semibold">React Flow</div>
                  <div className="text-sm text-gray-400">交互式图形可视化</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-black/30 rounded-lg p-4">
                <span className="text-2xl">✨</span>
                <div>
                  <div className="font-semibold">Framer Motion</div>
                  <div className="text-sm text-gray-400">流畅动画效果</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 使用场景 */}
          <motion.div
            variants={itemVariants}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-8 mb-8 border border-white/20"
          >
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
              <span>🎓</span>
              <span>使用场景</span>
            </h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-purple-400 mt-1">▸</span>
                <span><strong>教育学习</strong>：帮助学生理解物品的构成和制造过程</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-400 mt-1">▸</span>
                <span><strong>产品设计</strong>：分析竞品的材料和结构组成</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-400 mt-1">▸</span>
                <span><strong>环保意识</strong>：了解产品的原材料来源，培养可持续发展意识</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-400 mt-1">▸</span>
                <span><strong>趣味探索</strong>：满足好奇心，探索日常物品的"内在世界"</span>
              </li>
            </ul>
          </motion.div>

          {/* 开始体验 CTA */}
          <motion.div
            variants={itemVariants}
            className="text-center"
          >
            <Link href="/deconstruct">
              <motion.button
                className="px-12 py-5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl font-bold text-xl shadow-2xl hover:shadow-purple-500/50 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                🚀 立即开始体验
              </motion.button>
            </Link>
          </motion.div>

          {/* Footer */}
          <motion.div
            variants={itemVariants}
            className="text-center mt-12 text-gray-500 text-sm"
          >
            <p>Break It Down © 2024 · Powered by AI</p>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
