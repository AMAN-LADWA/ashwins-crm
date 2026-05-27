export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const { prisma } = await import('@/lib/prisma')
    const { createClient } = await import('@/lib/supabase-server')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const leads = await prisma.lead.findMany({
      include: { assignedUser: { select: { name: true } }, store: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(leads)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { prisma } = await import('@/lib/prisma')
    const { createClient } = await import('@/lib/supabase-server')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const lead = await prisma.lead.create({
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email || null,
        source: body.source,
        sourceNote: body.sourceNote || null,
        storeId: body.storeId || null,
        assignedTo: body.assignedTo || null,
      }
    })
    return NextResponse.json(lead, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}