import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../lib/auth'
import { prisma } from '../../lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const sessions = await prisma.openPlay.findMany({
      where: { ownerId: (session.user as any).id },
      include: { players: true, matches: true },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(sessions)
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { name, location, date } = await req.json()
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const openPlay = await prisma.openPlay.create({
      data: { name, location, date, roomCode, ownerId: (session.user as any).id }
    })
    return NextResponse.json(openPlay)
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
