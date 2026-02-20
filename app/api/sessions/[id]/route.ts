import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET: Load specific session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const deconstructionSession = await prisma.deconstructionSession.findUnique({
      where: { id }
    })

    if (!deconstructionSession) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 })
    }

    // Verify ownership
    if (deconstructionSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update last accessed time
    await prisma.deconstructionSession.update({
      where: { id },
      data: { lastAccessedAt: new Date() }
    })

    return NextResponse.json({ session: deconstructionSession })
  } catch (error) {
    console.error('Error loading session:', error)
    return NextResponse.json(
      { error: '加载会话失败' },
      { status: 500 }
    )
  }
}

// PUT: Update session (auto-save)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, treeData, promptSettings, knowledgeCache, identificationResult } = body

    // Check if session exists and user owns it
    const existingSession = await prisma.deconstructionSession.findUnique({
      where: { id }
    })

    if (!existingSession) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 })
    }

    if (existingSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update session
    const updatedSession = await prisma.deconstructionSession.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(treeData && { treeData }),
        ...(promptSettings !== undefined && { promptSettings }),
        ...(knowledgeCache !== undefined && { knowledgeCache }),
        ...(identificationResult !== undefined && { identificationResult }),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ session: updatedSession })
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: '更新会话失败' },
      { status: 500 }
    )
  }
}

// DELETE: Delete session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if session exists and user owns it
    const existingSession = await prisma.deconstructionSession.findUnique({
      where: { id }
    })

    if (!existingSession) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 })
    }

    if (existingSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete session
    await prisma.deconstructionSession.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { error: '删除会话失败' },
      { status: 500 }
    )
  }
}
