'use client'

import { useState } from 'react'

interface SaveSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (title: string) => Promise<void>
  defaultTitle?: string
}

export default function SaveSessionModal({
  isOpen,
  onClose,
  onSave,
  defaultTitle = ''
}: SaveSessionModalProps) {
  const [title, setTitle] = useState(defaultTitle)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSave = async () => {
    if (!title.trim()) {
      setError('请输入标题')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      await onSave(title.trim())
      setTitle('')
      onClose()
    } catch (err) {
      setError('保存失败，请重试')
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (!isSaving) {
      setTitle('')
      setError('')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">保存拆解会话</h2>

        <div className="mb-4">
          <label htmlFor="session-title" className="block text-sm font-medium text-gray-700 mb-2">
            会话标题
          </label>
          <input
            id="session-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：iPhone 15 拆解"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSaving}
            autoFocus
          />
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleClose}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            disabled={isSaving}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
