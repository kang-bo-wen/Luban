'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import UserMenu from './UserMenu'

export default function Navigation() {
  const { data: session, status } = useSession()

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🔨</span>
            <span className="text-xl font-bold text-gray-900">Break It Down</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-4">
            {status === 'authenticated' ? (
              <>
                <Link
                  href="/deconstruct"
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
                >
                  开始拆解
                </Link>
                <Link
                  href="/history"
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
                >
                  历史记录
                </Link>
                <UserMenu />
              </>
            ) : status === 'unauthenticated' ? (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  注册
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  )
}