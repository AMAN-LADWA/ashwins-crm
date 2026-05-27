export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

  const quotations = await prisma.quotation.findMany({
    include: { lead: { select: { name: true, phone: true } } },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json(quotations)
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const lineItems: Array<{ name: string; qty: number; unitPrice: number; discount: number }> = body.lineItems
  const subtotal = lineItems.reduce((sum, item) => {
    const discounted = item.unitPrice * (1 - item.discount / 100)
    return sum + discounted * item.qty
  }, 0)
  const total = subtotal + body.transportCost + body.installationCost
  const totalWithTax = total * (1 + body.taxPercent / 100)

  const quotation = await prisma.quotation.create({
    data: {
      leadId: body.leadId,
      status: 'DRAFT',
      lineItems: body.lineItems,
      transportCost: body.transportCost || 0,
      installationCost: body.installationCost || 0,
      taxPercent: body.taxPercent || 0,
      totalAmount: totalWithTax,
      storeId: body.storeId || null,
    }
  })
  return NextResponse.json(quotation, { status: 201 })
}