import { NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })
    const session = await prisma.openPlay.findUnique({
      where: { roomCode: code },
      include: { players: true, owner: { select: { name: true } } }
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    return NextResponse.json(session)
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { code, name } = await req.json()
    if (!code || !name) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    const session = await prisma.openPlay.findUnique({
      where: { roomCode: code },
      include: { players: true }
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    const existing = session.players.find(p => p.name.toLowerCase() === name.toLowerCase())
    if (existing) return NextResponse.json({ sessionId: session.id, playerId: existing.id })
    const player = await prisma.player.create({
      data: { name, level: 'intermediate', sessionId: session.id }
    })
    return NextResponse.json({ sessionId: session.id, playerId: player.id })
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}