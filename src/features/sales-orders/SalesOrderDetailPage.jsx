import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, FileText, Ban } from 'lucide-react'
import { salesOrdersApi } from '@/api'
import { PageHeader } from '@/components/layout'
import { Button, Badge, Card, Spinner, Empty, Modal, Input, ConfirmDialog } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

const STATUS_LABELS = { 0: 'Draft', 1: 'Pending', 2: 'Approved', 3: 'Rejected', 4: 'Cancelled', 5: 'Void' }
const STATUS_VARIANTS = { 0: 'default', 1: 'info', 2: 'success', 3: 'danger', 4: 'warning', 5: 'default' }

function StatusBadge({ status }) {
  return <Badge variant={STATUS_VARIANTS[status]} dot>{STATUS_LABELS[status]}</Badge>
}

export default function SalesOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasMinLevel } = useAuth()
  const isManager = hasMinLevel(60)

  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showVoidConfirm, setShowVoidConfirm] = useState(false)

  const { data: so, isLoading } = useQuery({
    queryKey: ['sales-order', id],
    queryFn: () => salesOrdersApi.getById(Number(id)).then(r => r.data.data),
    enabled: !!id,
  })

  const submitMutation = useMutation({
    mutationFn: () => salesOrdersApi.submit(Number(id)),
    onSuccess: () => { toast.success('Submitted for approval'); qc.invalidateQueries({ queryKey: ['sales-order', id] }) },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to submit'),
  })

  const approveMutation = useMutation({
    mutationFn: () => salesOrdersApi.approve(Number(id)),
    onSuccess: (res) => {
      const updated = res.data.data
      toast.success(updated?.transferToDocNo ? `Approved — ${updated.transferToDocName} ${updated.transferToDocNo} created` : 'Sales order approved')
      qc.invalidateQueries({ queryKey: ['sales-order', id] })
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to approve'),
  })

  const rejectMutation = useMutation({
    mutationFn: (reason) => salesOrdersApi.reject(Number(id), reason),
    onSuccess: () => {
      toast.success('Sales order rejected')
      qc.invalidateQueries({ queryKey: ['sales-order', id] })
      setShowRejectModal(false)
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to reject'),
  })

  const voidMutation = useMutation({
    mutationFn: () => salesOrdersApi.void(Number(id)),
    onSuccess: () => {
      toast.success('Sales order voided')
      qc.invalidateQueries({ queryKey: ['sales-order', id] })
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      setShowVoidConfirm(false)
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to void'),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!so) return <Empty title="Sales order not found" />

  const canEdit = so.status === 0 || so.status === 1 || (so.status === 2 && !so.transferToDocNo)

  return (
    <div>
      <PageHeader
        title={so.orderNumber}
        breadcrumbs={[{ label: 'Sales Orders', href: '/sales-orders' }, { label: so.orderNumber }]}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={so.status} />
            {so.status === 0 && (
              <Button size="sm" loading={submitMutation.isPending} onClick={() => submitMutation.mutate()}>
                Submit for Approval
              </Button>
            )}
            {isManager && so.status === 1 && (
              <>
                <Button size="sm" variant="success" leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                  loading={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
                  Approve
                </Button>
                <Button size="sm" variant="danger" leftIcon={<XCircle className="w-3.5 h-3.5" />}
                  onClick={() => { setShowRejectModal(true); setRejectReason('') }}>
                  Reject
                </Button>
              </>
            )}
            {isManager && (so.status === 2 || so.status === 4) && !so.transferToDocNo && (
              <Button size="sm" variant="danger" leftIcon={<Ban className="w-3.5 h-3.5" />}
                onClick={() => setShowVoidConfirm(true)}>
                Void
              </Button>
            )}
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => navigate(`/sales-orders/${id}/edit`)}>Edit</Button>
            )}
            <Button size="sm" variant="ghost" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => navigate(-1)}>Back</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main detail */}
        <div className="lg:col-span-2 space-y-5">
          {/* Customer info */}
          <Card>
            <div className="p-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Customer</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Name</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{so.customerName}</dd>
                </div>
                {so.customerEmail && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Email</dt>
                    <dd className="text-gray-900 dark:text-gray-100">{so.customerEmail}</dd>
                  </div>
                )}
                {so.customerPhone && (
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Phone</dt>
                    <dd className="text-gray-900 dark:text-gray-100">{so.customerPhone}</dd>
                  </div>
                )}
                {so.customerAddress && (
                  <div className="col-span-2">
                    <dt className="text-gray-500 dark:text-gray-400">Address</dt>
                    <dd className="text-gray-900 dark:text-gray-100 whitespace-pre-line">{so.customerAddress}</dd>
                  </div>
                )}
              </dl>
            </div>
          </Card>

          {/* Line items */}
          <Card>
            <div className="p-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left pb-2 text-gray-500 dark:text-gray-400 font-medium">Item</th>
                      <th className="text-right pb-2 text-gray-500 dark:text-gray-400 font-medium w-16">Qty</th>
                      <th className="text-right pb-2 text-gray-500 dark:text-gray-400 font-medium w-28">Unit Price</th>
                      <th className="text-right pb-2 text-gray-500 dark:text-gray-400 font-medium w-20">Disc %</th>
                      <th className="text-right pb-2 text-gray-500 dark:text-gray-400 font-medium w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {so.items.map(item => (
                      <tr key={item.id} className="border-b dark:border-gray-700/50">
                        <td className="py-2 pr-2">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{item.itemName}</p>
                          {item.description && <p className="text-gray-500 dark:text-gray-400 text-xs">{item.description}</p>}
                        </td>
                        <td className="py-2 text-right">{item.quantity}</td>
                        <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-2 text-right">{item.discountPercent > 0 ? `${item.discountPercent}%` : '—'}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-4 flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Subtotal</span><span>{formatCurrency(so.subTotal)}</span>
                  </div>
                  {so.discountAmount > 0 && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Discount</span><span>-{formatCurrency(so.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-gray-900 dark:text-gray-100 border-t dark:border-gray-700 pt-1">
                    <span>Total</span><span>{formatCurrency(so.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {so.notes && (
            <Card>
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Notes</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{so.notes}</p>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <div className="p-5 space-y-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Order Date</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(so.orderDate)}</p>
              </div>
              {so.deliveryDate && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Delivery Date</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(so.deliveryDate)}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500 dark:text-gray-400">Status</p>
                <div className="mt-1"><StatusBadge status={so.status} /></div>
              </div>
              {so.rejectionReason && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Rejection Reason</p>
                  <p className="text-red-600 dark:text-red-400">{so.rejectionReason}</p>
                </div>
              )}
            </div>
          </Card>

          {so.transferToDocNo && (
            <Card>
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Transferred to</h3>
                <button
                  className="flex items-center gap-2 text-brand-600 dark:text-brand-400 hover:underline text-sm font-medium"
                  onClick={() => navigate(`/${so.transferToDocName === 'IV' ? 'invoices' : 'sales-orders'}/${so.transferToId}`)}
                >
                  <FileText className="w-4 h-4" />
                  {so.transferToDocName} — {so.transferToDocNo}
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal open={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Sales Order">
        <div className="space-y-4">
          <Input label="Rejection Reason" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="Enter reason for rejection..." />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button variant="danger" loading={rejectMutation.isPending}
              disabled={!rejectReason.trim()}
              onClick={() => rejectMutation.mutate(rejectReason)}>
              Reject
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={showVoidConfirm}
        title="Void Sales Order"
        message="Are you sure you want to void this sales order? It will remain visible but inactive."
        onConfirm={() => voidMutation.mutate()}
        onClose={() => setShowVoidConfirm(false)}
        loading={voidMutation.isPending}
        confirmLabel="Void"
        variant="danger"
      />
    </div>
  )
}
