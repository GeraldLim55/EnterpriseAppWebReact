import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, CheckCircle, XCircle, Eye, Pencil } from 'lucide-react'
import { salesOrdersApi } from '@/api'
import { PageHeader } from '@/components/layout'
import {
  Button, Badge, Table, Pagination, SearchInput, ConfirmDialog, Card, Empty, Spinner, Modal, Input,
} from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

const STATUS_LABELS = { 0: 'Draft', 1: 'Pending', 2: 'Approved', 3: 'Rejected', 4: 'Cancelled' }
const STATUS_VARIANTS = { 0: 'default', 1: 'info', 2: 'success', 3: 'danger', 4: 'warning' }

function StatusBadge({ status }) {
  return <Badge variant={STATUS_VARIANTS[status]} dot>{STATUS_LABELS[status]}</Badge>
}

export default function SalesOrdersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasMinLevel } = useAuth()
  const isManager = hasMinLevel(60)

  const [filters, setFilters] = useState({ page: 1, pageSize: 20 })
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: res, isLoading } = useQuery({
    queryKey: ['sales-orders', filters],
    queryFn: () => salesOrdersApi.getAll({ ...filters, search: search || undefined }).then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => salesOrdersApi.delete(id),
    onSuccess: () => { toast.success('Sales order deleted'); qc.invalidateQueries({ queryKey: ['sales-orders'] }); setDeleteId(null) },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to delete'),
  })

  const approveMutation = useMutation({
    mutationFn: (id) => salesOrdersApi.approve(id),
    onSuccess: () => { toast.success('Sales order approved — invoice created'); qc.invalidateQueries({ queryKey: ['sales-orders'] }) },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to approve'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => salesOrdersApi.reject(id, reason),
    onSuccess: () => { toast.success('Sales order rejected'); qc.invalidateQueries({ queryKey: ['sales-orders'] }); setRejectTarget(null); setRejectReason('') },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to reject'),
  })

  const orders = res?.data ?? []
  const total = res?.totalCount ?? 0

  const handleSearch = (v) => {
    setSearch(v)
    setFilters(f => ({ ...f, page: 1, search: v || undefined }))
  }

  const columns = [
    { header: 'Order #', key: 'orderNumber', render: row => (
      <button className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
        onClick={() => navigate(`/sales-orders/${row.id}`)}>{row.orderNumber}</button>
    )},
    { header: 'Date', key: 'orderDate', render: row => formatDate(row.orderDate) },
    { header: 'Customer', key: 'customerName' },
    { header: 'Total', key: 'totalAmount', render: row => formatCurrency(row.totalAmount) },
    { header: 'Status', key: 'status', render: row => <StatusBadge status={row.status} /> },
    { header: 'Transferred to', key: 'transferToDocNo', render: row => row.transferToDocNo
      ? <button className="text-brand-600 dark:text-brand-400 hover:underline text-sm"
          onClick={() => navigate(`/${row.transferToDocName === 'IV' ? 'invoices' : 'sales-orders'}/${row.transferToId}`)}>
          {row.transferToDocName} — {row.transferToDocNo}
        </button>
      : <span className="text-gray-400 text-sm">—</span>
    },
    { header: 'Approval', key: 'approval', width: '120px', render: row => (
      <div className="flex items-center gap-1">
        {isManager && row.status === 1 ? (
          <>
            <button
              onClick={() => approveMutation.mutate(row.id)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400"
              title="Approve"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setRejectTarget(row.id); setRejectReason('') }}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
              title="Reject"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </>
        ) : <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>}
      </div>
    )},
    { header: '', key: 'actions', width: '100px', render: row => (
      <div className="flex items-center gap-1 justify-end">
        <button
          onClick={() => navigate(`/sales-orders/${row.id}`)}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300"
          title="View"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
        {(row.status === 0 || row.status === 1) && (
          <button
            onClick={() => navigate(`/sales-orders/${row.id}/edit`)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {(row.status === 0 || row.status === 1) && (
          <button
            onClick={() => setDeleteId(row.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader
        title="Sales Orders"
        action={<Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/sales-orders/create')}>New Sales Order</Button>}
      />
      <Card>
        <div className="p-4 border-b dark:border-gray-700">
          <SearchInput value={search} onChange={handleSearch} placeholder="Search orders or customers..." className="max-w-sm" />
        </div>
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : orders.length === 0 ? (
          <Empty title="No sales orders found" description="Create your first sales order." />
        ) : (
          <>
            <Table columns={columns} data={orders} rowKey={r => r.id} />
            <div className="p-4 border-t dark:border-gray-700">
              <Pagination page={filters.page} pageSize={filters.pageSize}
                totalCount={res?.totalCount ?? 0} totalPages={res?.totalPages ?? 0}
                onPageChange={p => setFilters(f => ({ ...f, page: p }))} />
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Sales Order"
        message="Are you sure you want to delete this sales order? This cannot be undone."
        onConfirm={() => deleteMutation.mutate(deleteId)}
        onClose={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
      />

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Sales Order">
        <div className="space-y-4">
          <Input label="Rejection Reason" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="Enter reason for rejection..." />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={rejectMutation.isPending}
              disabled={!rejectReason.trim()}
              onClick={() => rejectMutation.mutate({ id: rejectTarget, reason: rejectReason })}>
              Reject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
