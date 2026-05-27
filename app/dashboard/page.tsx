'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

type Stats = {
  leadsByStatus: { status: string; count: number }[]
  recentOrders: { id: string; lead: { name: string }; totalAmount: number; status: string; createdAt: string }[]
  totalRevenue: number
  totalOrders: number
  totalLeads: number
  conversionRate: number
}

const STATUS_COLORS: Record<string, string> = {
  NEW: '#94a3b8',
  CONTACTED: '#fbbf24',
  QUOTED: '#a78bfa',
  WON: '#34d399',
  LOST: '#f87171',
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#60a5fa',
  IN_PRODUCTION: '#fbbf24',
  READY: '#a78bfa',
  DISPATCHED: '#fb923c',
  INSTALLED: '#34d399',
  CANCELLED: '#f87171',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const [leadsRes, ordersRes] = await Promise.all([
        fetch('/api/v1/leads'),
        fetch('/api/v1/orders'),
      ])
      const [leads, orders] = await Promise.all([leadsRes.json(), ordersRes.json()])

      const leadsList = Array.isArray(leads) ? leads : []
      const ordersList = Array.isArray(orders) ? orders : []

      // Lead funnel
      const statusCounts: Record<string, number> = {}
      for (const lead of leadsList) {
        statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1
      }
      const leadsByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

      // Revenue
      const totalRevenue = ordersList
        .filter((o: any) => o.status !== 'CANCELLED')
        .reduce((sum: number, o: any) => sum + o.totalAmount, 0)

      const wonLeads = leadsList.filter((l: any) => l.status === 'WON').length
      const conversionRate = leadsList.length > 0 ? Math.round((wonLeads / leadsList.length) * 100) : 0

      setStats({
        leadsByStatus,
        recentOrders: ordersList.slice(0, 5),
        totalRevenue,
        totalOrders: ordersList.length,
        totalLeads: leadsList.length,
        conversionRate,
      })
      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) return <div className="p-8 text-gray-500">Loading dashboard...</div>
  if (!stats) return null

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: stats.totalLeads },
          { label: 'Total Orders', value: stats.totalOrders },
          { label: 'Conversion Rate', value: `${stats.conversionRate}%` },
          { label: 'Total Revenue', value: `Rs.${stats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
        ].map(kpi => (
          <div key={kpi.label} className="border rounded-lg p-4 bg-white">
            <p className="text-sm text-gray-500">{kpi.label}</p>
            <p className="text-2xl font-bold mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lead funnel bar chart */}
        <div className="border rounded-lg p-4 bg-white">
          <h2 className="text-sm font-semibold mb-4 text-gray-700">Lead Funnel</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.leadsByStatus}>
              <XAxis dataKey="status" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stats.leadsByStatus.map((entry, index) => (
                  <Cell key={index} fill={STATUS_COLORS[entry.status] || '#60a5fa'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lead status pie chart */}
        <div className="border rounded-lg p-4 bg-white">
          <h2 className="text-sm font-semibold mb-4 text-gray-700">Lead Status Breakdown</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats.leadsByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                {stats.leadsByStatus.map((entry, index) => (
                  <Cell key={index} fill={STATUS_COLORS[entry.status] || '#60a5fa'} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent orders */}
      <div className="border rounded-lg bg-white">
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold text-gray-700">Recent Orders</h2>
        </div>
        {stats.recentOrders.length === 0 ? (
          <p className="p-4 text-gray-500 text-sm">No orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">Customer</th>
                <th className="text-left p-3 font-medium">Amount</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map(order => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{order.lead.name}</td>
                  <td className="p-3">Rs.{order.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium`}
                      style={{ backgroundColor: ORDER_STATUS_COLORS[order.status] + '22', color: ORDER_STATUS_COLORS[order.status] }}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500">{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}