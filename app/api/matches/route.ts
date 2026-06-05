import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../lib/auth'
import { prisma } from '../../lib/prisma'

// POST create new match
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, teamA, teamB, winScore, mode } = await req.json()

    const match = await prisma.match.create({
      data: {
        sessionId,
        teamA,
        teamB,
        winScore: winScore ?? 11,
        mode: mode ?? 'manual'
      }
    })

    return NextResponse.json(match)
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
