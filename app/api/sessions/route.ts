import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET: List all sessions for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessions = await prisma.deconstructionSession.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        rootObjectName: true,
        rootObjectIcon: true,
        rootObjectImage: true,
        createdAt: true,
        updatedAt: true,
        lastAccessedAt: true
      }
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: '获取历史记录失败' },
      { status: 500 }
    )
  }
}

// POST: Create new session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, treeData, promptSettings, knowledgeCache, nodePositions, identificationResult, rootObjectName, rootObjectIcon, rootObjectImage } = body

    // Validate required fields
    if (!title || !treeData || !rootObjectName) {
      return NextResponse.json(
        { error: '缺少必要字段' },
        { status: 400 }
      )
    }

    const newSession = await prisma.deconstructionSession.create({
      data: {
        userId: session.user.id,
        title,
        rootObjectName,
        rootObjectIcon: rootObjectIcon || null,
        rootObjectImage: rootObjectImage || null,
        treeData,
        promptSettings: promptSettings || null,
        knowledgeCache: knowledgeCache || null,
        nodePositions: nodePositions || null,
        identificationResult: identificationResult || null
      }
    })

    return NextResponse.json(
      { session: newSession },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: '保存会话失败' },
      { status: 500 }
    )
  }
}
