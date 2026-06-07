import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const data = await req.json()
    const match = await prisma.match.update({
      where: { id: parseInt(params.id) },
      data
    })
    // Trigger Pusher real-time update
    try {
      const Pusher = require('pusher')
      const pusher = new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER,
        useTLS: true,
      })
      await pusher.trigger(`session-${match.sessionId}`, 'match-updated', match)
    } catch(e) {}
    return NextResponse.json(match)
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const match = await prisma.match.findUnique({ where: { id: parseInt(params.id) } })
    await prisma.match.delete({ where: { id: parseInt(params.id) } })
    try {
      const Pusher = require('pusher')
      const pusher = new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER,
        useTLS: true,
      })
      if (match) await pusher.trigger(`session-${match.sessionId}`, 'match-deleted', { id: match.id })
    } catch(e) {}
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}