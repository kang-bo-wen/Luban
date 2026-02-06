export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Entropy Reverse
            </h1>
            <p className="text-xl text-gray-300">
              Mode 1: Deconstruction - 物体拆解可视化游戏
            </p>
          </div>

          {/* 开始游戏按钮 */}
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg p-8 mb-8 text-center">
            <h2 className="text-3xl font-bold mb-4">🎮 开始游戏</h2>
            <p className="text-lg mb-6">上传图片，AI识别物体，然后递归拆解到自然材料</p>
            <a
              href="/deconstruct"
              className="inline-block bg-white text-purple-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition"
            >
              🚀 开始拆解
            </a>
          </div>

          {/* Status Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 mb-8 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-semibold">服务器运行中</h2>
            </div>
            <p className="text-gray-300 mb-4">
              后端API已就绪，使用阿里云通义千问AI驱动
            </p>

            {/* API Endpoints */}
            <div className="space-y-3">
              <div className="bg-black/30 rounded p-3">
                <code className="text-sm text-green-300">POST /api/identify</code>
                <p className="text-xs text-gray-400 mt-1">图片识别 - 上传图片识别物体</p>
              </div>
              <div className="bg-black/30 rounded p-3">
                <code className="text-sm text-blue-300">POST /api/deconstruct</code>
                <p className="text-xs text-gray-400 mt-1">物体拆解 - 递归拆解物体到原材料</p>
              </div>
            </div>
          </div>

          {/* Quick Test */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 mb-8 border border-white/20">
            <h2 className="text-2xl font-semibold mb-4">🧪 快速测试</h2>
            <p className="text-gray-300 mb-4">
              打开浏览器开发者工具（F12），在Console中运行：
            </p>
            <div className="bg-black/50 rounded p-4 overflow-x-auto">
              <pre className="text-sm text-green-300">
{`fetch('/api/deconstruct', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ itemName: '智能手机' })
})
.then(r => r.json())
.then(data => console.log(data))`}
              </pre>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <div className="text-3xl mb-3">🖼️</div>
              <h3 className="text-lg font-semibold mb-2">图片识别</h3>
              <p className="text-sm text-gray-300">
                AI识别上传图片中的物体
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <div className="text-3xl mb-3">🔍</div>
              <h3 className="text-lg font-semibold mb-2">递归拆解</h3>
              <p className="text-sm text-gray-300">
                逐层拆解到自然原材料
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
              <div className="text-3xl mb-3">🌳</div>
              <h3 className="text-lg font-semibold mb-2">可视化树</h3>
              <p className="text-sm text-gray-300">
                交互式树状图展示构成
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-yellow-500/10 backdrop-blur-lg rounded-lg p-6 border border-yellow-500/30">
            <h3 className="text-lg font-semibold mb-3 text-yellow-300">⚠️ 配置提醒</h3>
            <p className="text-sm text-gray-300 mb-2">
              在测试API之前，请确保：
            </p>
            <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
              <li>已创建 <code className="bg-black/30 px-2 py-1 rounded">.env.local</code> 文件</li>
              <li>已填入通义千问 API Key</li>
              <li>已重启开发服务器</li>
            </ul>
            <p className="text-xs text-gray-400 mt-3">
              查看 <a href="https://github.com/your-repo" className="text-blue-400 hover:underline">README.md</a> 了解详细配置步骤
            </p>
          </div>

          {/* Footer */}
          <div className="text-center mt-12 text-gray-400 text-sm">
            <p>Hackathon Project - Powered by Next.js & 阿里云通义千问</p>
          </div>
        </div>
      </div>
    </main>
  );
}
