import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const lead = await prisma.lead.update({
    where: { id: params.id },
    data: {
      status: body.status,
      lostReason: body.lostReason,
      lostNote: body.lostNote,
    }
  })
  return NextResponse.json(lead)
}