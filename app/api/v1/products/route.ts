import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' }
  })
  return NextResponse.json(products)
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Bulk upsert from Excel import
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

  // Single product create
  const product = await prisma.product.create({ data: body })
  return NextResponse.json(product, { status: 201 })
}