export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { prisma } = await import('@/lib/prisma')
    const { createClient } = await import('@/lib/supabase-server')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const quotation = await prisma.quotation.findUnique({
      where: { id: params.id },
      include: { lead: true }
    })
    if (!quotation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595, 842])
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const { width, height } = page.getSize()

    page.drawText("Ashwin's Furniture", { x: 50, y: height - 50, size: 20, font: boldFont, color: rgb(0.1, 0.1, 0.1) })
    page.drawText('QUOTATION', { x: 450, y: height - 50, size: 16, font: boldFont, color: rgb(0.2, 0.4, 0.8) })
    page.drawLine({ start: { x: 50, y: height - 65 }, end: { x: width - 50, y: height - 65 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })

    page.drawText(`Customer: ${quotation.lead.name}`, { x: 50, y: height - 90, size: 11, font })
    page.drawText(`Phone: ${quotation.lead.phone}`, { x: 50, y: height - 108, size: 11, font })
    page.drawText(`Date: ${new Date().toLocaleDateString('en-IN')}`, { x: 400, y: height - 90, size: 11, font })
    page.drawText(`Ref: ${quotation.id.slice(-8).toUpperCase()}`, { x: 400, y: height - 108, size: 11, font })

    let y = height - 150
    page.drawRectangle({ x: 50, y: y - 5, width: width - 100, height: 20, color: rgb(0.2, 0.4, 0.8) })
    page.drawText('Item', { x: 55, y, size: 10, font: boldFont, color: rgb(1, 1, 1) })
    page.drawText('Qty', { x: 300, y, size: 10, font: boldFont, color: rgb(1, 1, 1) })
    page.drawText('Unit Price', { x: 350, y, size: 10, font: boldFont, color: rgb(1, 1, 1) })
    page.drawText('Discount', { x: 430, y, size: 10, font: boldFont, color: rgb(1, 1, 1) })
    page.drawText('Amount', { x: 500, y, size: 10, font: boldFont, color: rgb(1, 1, 1) })

    const lineItems = quotation.lineItems as Array<{ name: string; qty: number; unitPrice: number; discount: number }>
    y -= 25
    for (const item of lineItems) {
      const discounted = item.unitPrice * (1 - item.discount / 100)
      const amount = discounted * item.qty
      page.drawText(item.name.slice(0, 35), { x: 55, y, size: 10, font })
      page.drawText(String(item.qty), { x: 310, y, size: 10, font })
      page.drawText(`Rs.${item.unitPrice.toLocaleString()}`, { x: 350, y, size: 10, font })
      page.drawText(`${item.discount}%`, { x: 445, y, size: 10, font })
      page.drawText(`Rs.${amount.toLocaleString()}`, { x: 500, y, size: 10, font })
      y -= 20
    }

    y -= 10
    page.drawLine({ start: { x: 350, y }, end: { x: width - 50, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) })
    y -= 18
    if (quotation.transportCost > 0) {
      page.drawText('Transport:', { x: 380, y, size: 10, font })
      page.drawText(`Rs.${quotation.transportCost.toLocaleString()}`, { x: 500, y, size: 10, font })
      y -= 18
    }
    if (quotation.installationCost > 0) {
      page.drawText('Installation:', { x: 380, y, size: 10, font })
      page.drawText(`Rs.${quotation.installationCost.toLocaleString()}`, { x: 500, y, size: 10, font })
      y -= 18
    }
    if (quotation.taxPercent > 0) {
      page.drawText(`Tax (${quotation.taxPercent}%):`, { x: 380, y, size: 10, font })
      y -= 18
    }
    page.drawText('TOTAL:', { x: 380, y, size: 12, font: boldFont })
    page.drawText(`Rs.${quotation.totalAmount.toLocaleString()}`, { x: 490, y, size: 12, font: boldFont, color: rgb(0.2, 0.4, 0.8) })
    page.drawText('Thank you for your business!', { x: 50, y: 50, size: 10, font, color: rgb(0.5, 0.5, 0.5) })

    const pdfBytes = await pdfDoc.save()
    const fileName = `quotation-${quotation.id}.pdf`
    const { error } = await supabase.storage
      .from('quotations')
      .upload(fileName, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: { publicUrl } } = supabase.storage.from('quotations').getPublicUrl(fileName)

    await prisma.quotation.update({
      where: { id: params.id },
      data: { pdfUrl: publicUrl, sentAt: new Date(), status: 'SENT' }
    })

    return NextResponse.json({ pdfUrl: publicUrl })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}