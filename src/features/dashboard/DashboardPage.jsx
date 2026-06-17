import { useQuery } from '@tanstack/react-query'
import { Users, Package, FileText, MapPin, TrendingUp, DollarSign } from 'lucide-react'
import { dashboardApi } from '@/api'
import { PageHeader } from '@/components/layout'
import { StatCard, Card, CardHeader, Spinner, Empty } from '@/components/ui'
import { formatCurrency, formatNumber } from '@/lib/utils'

export default function DashboardPage() {
  const { data: res, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.getSummary().then(r => r.data.data),
    staleTime: 1000 * 60 * 10,
  })

  const summary = res
  const maxSales = Math.max(...(summary?.monthlySales?.map(m => m.totalSales) ?? [1]))

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your organisation's performance."
        breadcrumbs={[{ label: 'Dashboard' }]}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Users"
              value={formatNumber(summary?.totalUsers ?? 0)}
              subtext={`${summary?.activeUsers ?? 0} active`}
              icon={<Users className="w-5 h-5" />}
              color="brand"
            />
            <StatCard
              label="Total Items"
              value={formatNumber(summary?.totalItems ?? 0)}
              subtext={`${summary?.activeItems ?? 0} active`}
              icon={<Package className="w-5 h-5" />}
              color="green"
            />
            <StatCard
              label="Total Invoices"
              value={formatNumber(summary?.totalInvoices ?? 0)}
              icon={<FileText className="w-5 h-5" />}
              color="amber"
            />
            <StatCard
              label="Total Revenue"
              value={formatCurrency(summary?.totalRevenue ?? 0)}
              icon={<DollarSign className="w-5 h-5" />}
              color="brand"
            />
          </div>

          {/* Secondary row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <StatCard
              label="Locations"
              value={formatNumber(summary?.totalLocations ?? 0)}
              icon={<MapPin className="w-5 h-5" />}
              color="green"
            />
          </div>

          {/* Monthly sales chart */}
          <Card>
            <CardHeader
              title="Monthly Revenue"
              description="Paid invoices over the last 12 months"
              action={<TrendingUp className="w-4 h-4 text-gray-400" />}
            />
            {summary?.monthlySales?.length ? (
              <div className="flex items-end gap-2 h-48">
                {summary.monthlySales.map((m, i) => {
                  const height = maxSales > 0 ? (m.totalSales / maxSales) * 100 : 0
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <p className="font-semibold">{formatCurrency(m.totalSales)}</p>
                        <p className="text-gray-300">{m.invoiceCount} invoices</p>
                      </div>
                      {/* Bar */}
                      <div className="w-full bg-gray-100 rounded-t-md relative flex items-end" style={{ height: '160px' }}>
                        <div
                          className="w-full bg-brand-500 rounded-t-md transition-all duration-500 group-hover:bg-brand-600"
                          style={{ height: `${Math.max(height, 2)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{m.monthName}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <Empty title="No sales data yet" description="Revenue data will appear here once invoices are paid." />
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
