'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Lead = { id: string; name: string; phone: string }
type Quotation = { id: string; totalAmount: number; lead: { name: string } }
type Order = {
  id: string
  status: string
  totalAmount: number
  notes: string | null
  createdAt: string
  lead: { name: string; phone: string }
  quotation: { totalAmount: number } | null
}

const statusColors: Record<string, string> = {
  CONFIRMED: 'bg-blue-100 text-blue-700',
  IN_PRODUCTION: 'bg-yellow-100 text-yellow-700',
  READY: 'bg-purple-100 text-purple-700',
  DISPATCHED: 'bg-orange-100 text-orange-700',
  INSTALLED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    leadId: '',
    quotationId: '',
    totalAmount: '',
    notes: '',
  })

  const fetchAll = async () => {
    const [oRes, lRes, qRes] = await Promise.all([
      fetch('/api/v1/orders'),
      fetch('/api/v1/leads'),
      fetch('/api/v1/quotations'),
    ])
    const [o, l, q] = await Promise.all([oRes.json(), lRes.json(), qRes.json()])
    setOrders(Array.isArray(o) ? o : [])
    setLeads(Array.isArray(l) ? l : [])
    setQuotations(Array.isArray(q) ? q : [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const handleQuotationSelect = (quotationId: string) => {
    const q = quotations.find(q => q.id === quotationId)
    setForm({ ...form, quotationId, totalAmount: q ? String(q.totalAmount) : form.totalAmount })
  }

  const handleCreate = async () => {
    await fetch('/api/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        totalAmount: parseFloat(form.totalAmount),
      })
    })
    setOpen(false)
    setForm({ leadId: '', quotationId: '', totalAmount: '', notes: '' })
    await fetchAll()
  }

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/v1/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    await fetchAll()
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>+ New Order</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
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
              <div className="space-y-1">
                <Label>Quotation (optional)</Label>
                <Select value={form.quotationId} onValueChange={handleQuotationSelect}>
                  <SelectTrigger><SelectValue placeholder="Link a quotation" /></SelectTrigger>
                  <SelectContent>
                    {quotations.map(q => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.lead.name} — Rs.{q.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Total Amount *</Label>
                <Input
                  type="number"
                  value={form.totalAmount}
                  onChange={e => setForm({ ...form, totalAmount: e.target.value })}
                  placeholder="Auto-filled from quotation"
                />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={!form.leadId || !form.totalAmount}
              >
                Create Order
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500">No orders yet.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">Customer</th>
                <th className="text-left p-3 font-medium">Amount</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Notes</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Update</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{order.lead.name}</td>
                  <td className="p-3">Rs.{order.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500 text-xs">{order.notes || '—'}</td>
                  <td className="p-3 text-gray-500">{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="p-3">
                    <Select value={order.status} onValueChange={v => handleStatusChange(order.id, v)}>
                      <SelectTrigger className="w-36 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                        <SelectItem value="IN_PRODUCTION">In Production</SelectItem>
                        <SelectItem value="READY">Ready</SelectItem>
                        <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                        <SelectItem value="INSTALLED">Installed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
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