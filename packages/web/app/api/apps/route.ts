import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Get all unique app names from the database
    const apps = await prisma.shortcut.findMany({
      select: {
        app: true,
      },
      distinct: ['app'],
      orderBy: {
        app: 'asc',
      },
    })

    const appNames = apps.map(a => a.app)

    return NextResponse.json({ apps: appNames })
  } catch (error) {
    console.error('Error fetching apps:', error)
    return NextResponse.json(
      { error: 'Failed to fetch apps' },
      { status: 500 }
    )
  }
}
