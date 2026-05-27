'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Lead = { id: string; name: string; phone: string }
type Product = { id: string; sku: string; name: string; price: number }
type LineItem = { name: string; qty: number; unitPrice: number; discount: number }
type Quotation = {
  id: string
  status: string
  totalAmount: number
  pdfUrl: string | null
  createdAt: string
  lead: { name: string; phone: string }
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null)

  const [form, setForm] = useState({
    leadId: '',
    transportCost: '0',
    installationCost: '0',
    taxPercent: '0',
  })
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { name: '', qty: 1, unitPrice: 0, discount: 0 }
  ])

  const fetchAll = async () => {
    const [qRes, lRes, pRes] = await Promise.all([
      fetch('/api/v1/quotations'),
      fetch('/api/v1/leads'),
      fetch('/api/v1/products'),
    ])
    const [q, l, p] = await Promise.all([qRes.json(), lRes.json(), pRes.json()])
    setQuotations(Array.isArray(q) ? q : [])
    setLeads(Array.isArray(l) ? l : [])
    setProducts(Array.isArray(p) ? p : [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const addLineItem = () =>
    setLineItems([...lineItems, { name: '', qty: 1, unitPrice: 0, discount: 0 }])

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  const removeLineItem = (index: number) =>
    setLineItems(lineItems.filter((_, i) => i !== index))

  const selectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    const updated = [...lineItems]
    updated[index] = { ...updated[index], name: product.name, unitPrice: product.price }
    setLineItems(updated)
  }

  const calculateTotal = () => {
    const subtotal = lineItems.reduce((sum, item) => {
      const discounted = item.unitPrice * (1 - item.discount / 100)
      return sum + discounted * item.qty
    }, 0)
    const total = subtotal + parseFloat(form.transportCost || '0') + parseFloat(form.installationCost || '0')
    return total * (1 + parseFloat(form.taxPercent || '0') / 100)
  }

  const handleCreate = async () => {
    await fetch('/api/v1/quotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        transportCost: parseFloat(form.transportCost || '0'),
        installationCost: parseFloat(form.installationCost || '0'),
        taxPercent: parseFloat(form.taxPercent || '0'),
        lineItems,
      })
    })
    setOpen(false)
    setLineItems([{ name: '', qty: 1, unitPrice: 0, discount: 0 }])
    setForm({ leadId: '', transportCost: '0', installationCost: '0', taxPercent: '0' })
    await fetchAll()
  }

  const handleGeneratePdf = async (id: string) => {
    setGeneratingPdf(id)
    const res = await fetch(`/api/v1/quotations/${id}/pdf`, { method: 'POST' })
    const data = await res.json()
    if (data.pdfUrl) window.open(data.pdfUrl, '_blank')
    await fetchAll()
    setGeneratingPdf(null)
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quotations</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>+ New Quotation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Quotation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Lead selector */}
              <div className="space-y-1">
                <Label>Customer (Lead) *</Label>
                <Select value={form.leadId} onValueChange={v => setForm({ ...form, leadId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a lead" /></SelectTrigger>
                  <SelectContent>
                    {leads.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name} — {l.phone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Line items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Line Items</Label>
                  <Button variant="outline" size="sm" onClick={addLineItem}>+ Add Item</Button>
                </div>
                <div className="space-y-2">
                  {lineItems.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-1 items-center">
                      <div className="col-span-4">
                        <Select onValueChange={v => selectProduct(i, v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick product" /></SelectTrigger>
                          <SelectContent>
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Input className="h-8 text-xs" placeholder="Name" value={item.name}
                          onChange={e => updateLineItem(i, 'name', e.target.value)} />
                      </div>
                      <div className="col-span-1">
                        <Input className="h-8 text-xs" type="number" placeholder="Qty" value={item.qty}
                          onChange={e => updateLineItem(i, 'qty', parseInt(e.target.value) || 1)} />
                      </div>
                      <div className="col-span-2">
                        <Input className="h-8 text-xs" type="number" placeholder="Price" value={item.unitPrice}
                          onChange={e => updateLineItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="col-span-1">
                        <Input className="h-8 text-xs" type="number" placeholder="Disc%" value={item.discount}
                          onChange={e => updateLineItem(i, 'discount', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="col-span-1">
                        {lineItems.length > 1 && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500"
                            onClick={() => removeLineItem(i)}>×</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extras */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Transport (Rs.)</Label>
                  <Input type="number" value={form.transportCost}
                    onChange={e => setForm({ ...form, transportCost: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Installation (Rs.)</Label>
                  <Input type="number" value={form.installationCost}
                    onChange={e => setForm({ ...form, installationCost: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Tax (%)</Label>
                  <Input type="number" value={form.taxPercent}
                    onChange={e => setForm({ ...form, taxPercent: e.target.value })} />
                </div>
              </div>

              {/* Total preview */}
              <div className="bg-gray-50 rounded p-3 text-right">
                <span className="text-sm text-gray-500">Estimated Total: </span>
                <span className="text-lg font-bold">Rs.{calculateTotal().toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>

              <Button className="w-full" onClick={handleCreate} disabled={!form.leadId || lineItems.every(i => !i.name)}>
                Create Quotation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading quotations...</p>
      ) : quotations.length === 0 ? (
        <p className="text-gray-500">No quotations yet. Create your first one!</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">Customer</th>
                <th className="text-left p-3 font-medium">Total</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map(q => (
                <tr key={q.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{q.lead.name}</td>
                  <td className="p-3">Rs.{q.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[q.status]}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500">{new Date(q.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="p-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleGeneratePdf(q.id)}
                      disabled={generatingPdf === q.id}>
                      {generatingPdf === q.id ? 'Generating...' : '📄 PDF'}
                    </Button>
                    {q.pdfUrl && (
                      <Button size="sm" variant="ghost" onClick={() => window.open(q.pdfUrl!, '_blank')}>
                        View
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}