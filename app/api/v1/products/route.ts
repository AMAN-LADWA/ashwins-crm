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

    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(products)
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

    if (Array.isArray(body)) {
      const results = await Promise.all(
        body.map(item =>
          prisma.product.upsert({
            where: { sku_storeId: { sku: item.sku, storeId: item.storeId ?? '' } },
            update: { name: item.name, category: item.category, price: item.price },
            create: {
              sku: item.sku,
              name: item.name,
              category: item.category,
              price: item.price,
              storeId: item.storeId ?? null,
            }
          })
        )
      )
      return NextResponse.json({ count: results.length })
    }

    const product = await prisma.product.create({ data: body })
    return NextResponse.json(product, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}