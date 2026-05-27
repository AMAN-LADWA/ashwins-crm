export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { prisma } = await import('@/lib/prisma')
    const { createClient } = await import('@/lib/supabase-server')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const order = await prisma.order.update({
      where: { id: params.id },
      data: { status: body.status, notes: body.notes }
    })
    return NextResponse.json(order)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}