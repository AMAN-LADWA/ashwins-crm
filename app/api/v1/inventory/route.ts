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

    const inventory = await prisma.inventory.findMany({
      include: { product: { select: { name: true, sku: true, category: true } } },
      orderBy: { product: { name: 'asc' } }
    })
    return NextResponse.json(inventory)
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
    const inventory = await prisma.inventory.upsert({
      where: { productId: body.productId },
      update: {
        qtyAvailable: body.qtyAvailable,
        qtyInTransit: body.qtyInTransit || 0,
      },
      create: {
        productId: body.productId,
        qtyAvailable: body.qtyAvailable,
        qtyInTransit: body.qtyInTransit || 0,
        storeId: body.storeId || null,
      }
    })
    return NextResponse.json(inventory)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}