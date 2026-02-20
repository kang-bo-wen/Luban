'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'

interface SessionItem {
  id: string
  title: string
  rootObjectName: string
  rootObjectIcon: string | null
  rootObjectImage: string | null
  createdAt: string
  updatedAt: string
}

export default function Sidebar() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)

  // 获取会话列表
  useEffect(() => {
    if (status === 'authenticated' && isOpen) {
      fetchSessions()
    }
  }, [status, isOpen])

  const fetchSessions = async () => {
    setIsLoadingSessions(true)
    try {
      const response = await fetch('/api/sessions')
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('获取会话列表失败:', error)
    } finally {
      setIsLoadingSessions(false)
    }
  }

  // 关闭侧边栏（点击外部或按 ESC）
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  // 路由变化时关闭侧边栏
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  if (status === 'loading') {
    return null
  }

  if (status === 'unauthenticated') {
    return null
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('确定要删除这个拆解记录吗？')) return

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId))
      }
    } catch (error) {
      console.error('删除会话失败:', error)
      alert('删除失败，请重试')
    }
  }

  return (
    <>
      {/* 汉堡菜单按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-40 p-3 bg-gray-900/80 hover:bg-gray-900 rounded-lg backdrop-blur-sm transition-all"
        aria-label="打开菜单"
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* 遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-gray-900 text-white z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* 头部 */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Break It Down
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="关闭菜单"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* 用户信息 */}
            {session?.user && (
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-lg font-bold">
                  {session.user.email?.[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {session.user.email}
                  </p>
                  <p className="text-xs text-gray-400">已登录</p>
                </div>
              </div>
            )}
          </div>

          {/* 新建按钮 */}
          <div className="p-4 border-b border-gray-800">
            <button
              onClick={() => {
                // 清除所有本地存储数据
                localStorage.removeItem('deconstructionTree');
                localStorage.removeItem('identificationResult');
                localStorage.removeItem('imagePreview');
                localStorage.removeItem('knowledgeCache');
                localStorage.removeItem('nodePositions');

                // 如果当前在拆解页面，使用 window.location 强制刷新
                if (pathname === '/deconstruct' || pathname.startsWith('/deconstruct?')) {
                  window.location.href = '/deconstruct';
                } else {
                  // 否则使用 router 导航
                  router.push('/deconstruct');
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors bg-blue-600 hover:bg-blue-700 text-white"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="font-medium">新建拆解</span>
            </button>
          </div>

          {/* 历史记录列表 */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">拆解历史</h3>
            {isLoadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-gray-400">加载中...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                暂无历史记录
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setIsOpen(false); // 关闭侧边栏
                      router.push(`/deconstruct?sessionId=${item.id}`);
                    }}
                    className="group relative bg-gray-800 hover:bg-gray-750 rounded-lg p-3 cursor-pointer transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {/* 图标或图片 */}
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-xl">
                        {item.rootObjectIcon || '📦'}
                      </div>

                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(item.updatedAt).toLocaleDateString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>

                      {/* 删除按钮 */}
                      <button
                        onClick={(e) => handleDeleteSession(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600/20 rounded transition-all"
                        title="删除"
                      >
                        <svg
                          className="w-4 h-4 text-red-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 底部 */}
          <div className="p-4 border-t border-gray-800">
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-600/20 text-red-400 hover:text-red-300 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="font-medium">退出登录</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
