import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../lib/prisma'

console.log('DB URL:', process.env.DATABASE_URL?.substring(0, 50))

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    const user = await prisma.user.create({
      data: { name, email, password: hashed, roomCode }
    })

    return NextResponse.json({ success: true, userId: user.id })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
