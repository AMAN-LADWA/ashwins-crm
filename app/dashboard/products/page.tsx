'use client'

import { useEffect, useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

type Product = {
  id: string
  sku: string
  name: string
  category: string | null
  price: number
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [form, setForm] = useState({ sku: '', name: '', category: '', price: '' })
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchProducts = async () => {
    const res = await fetch('/api/v1/products')
    const data = await res.json()
    setProducts(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [])

  const handleCreate = async () => {
    await fetch('/api/v1/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, price: parseFloat(form.price) })
    })
    setOpen(false)
    setForm({ sku: '', name: '', category: '', price: '' })
    await fetchProducts()
  }

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)

    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws) as any[]

    const products = rows.map(row => ({
      sku: String(row['SKU'] || row['sku'] || ''),
      name: String(row['Name'] || row['name'] || ''),
      category: String(row['Category'] || row['category'] || ''),
      price: parseFloat(row['Price'] || row['price'] || 0),
    })).filter(p => p.sku && p.name)

    const res = await fetch('/api/v1/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(products)
    })
    const data = await res.json()
    alert(`Imported ${data.count} products`)
    await fetchProducts()
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-2">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleExcelImport}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
              {importing ? 'Importing...' : '↑ Import Excel'}
            </Button>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>+ New Product</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Product</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1">
                  <Label>SKU *</Label>
                  <Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Price *</Label>
                  <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={!form.sku || !form.name || !form.price}>
                  Add Product
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="text-gray-500">No products yet. Add one or import from Excel.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">SKU</th>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-left p-3 font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-gray-600 font-mono">{product.sku}</td>
                  <td className="p-3 font-medium">{product.name}</td>
                  <td className="p-3 text-gray-600">{product.category || '—'}</td>
                  <td className="p-3">₹{product.price.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Excel format: columns SKU, Name, Category, Price
      </p>
    </div>
  )
}