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

  const orders = await prisma.order.findMany({
    include: {
      lead: { select: { name: true, phone: true } },
      quotation: { select: { totalAmount: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json(orders)
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const order = await prisma.order.create({
    data: {
      leadId: body.leadId,
      quotationId: body.quotationId || null,
      totalAmount: body.totalAmount,
      storeId: body.storeId || null,
      notes: body.notes || null,
      status: 'CONFIRMED',
    }
  })

  // Update lead status to WON
  await prisma.lead.update({
    where: { id: body.leadId },
    data: { status: 'WON' }
  })

  return NextResponse.json(order, { status: 201 })
}