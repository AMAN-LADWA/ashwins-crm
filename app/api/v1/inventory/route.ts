import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase-server'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const inventory = await prisma.inventory.findMany({
    include: { product: { select: { name: true, sku: true, category: true } } },
    orderBy: { product: { name: 'asc' } }
  })
  return NextResponse.json(inventory)
}

export async function POST(req: NextRequest) {
  const user = await getUser()
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
}