import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Download, Trash2, ArrowLeft, FileText, CheckCircle, XCircle, Copy, Mail, X } from 'lucide-react'
import { invoicesApi, itemsApi, locationsApi, companyApi, paymentTermsApi } from '@/api'
import { PageHeader } from '@/components/layout'
import {
  Button, Input, Select, Textarea, Badge, Table, Pagination,
  SearchInput, ConfirmDialog, Card, CardHeader, Empty, Spinner, Modal,
} from '@/components/ui'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { formatCurrency, formatDate, downloadBlob, toastFormErrors } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

// ─── Status helpers ───────────────────────────────────────────────────────
const STATUS_LABELS = { 0: 'Draft', 1: 'Pending', 2: 'Paid', 3: 'Cancelled', 4: 'Overdue', 5: 'Approved', 6: 'Rejected' }
const STATUS_VARIANTS = {
  0: 'default', 1: 'info', 2: 'success', 3: 'danger', 4: 'warning', 5: 'success', 6: 'danger',
}

function StatusBadge({ status }) {
  return <Badge variant={STATUS_VARIANTS[status]} dot>{STATUS_LABELS[status]}</Badge>
}

// ─── Invoices List Page ───────────────────────────────────────────────────
export default function InvoicesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasMinLevel } = useAuth()
  const isManager = hasMinLevel(60)

  const [filters, setFilters] = useState({ page: 1, pageSize: 20 })
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null) // { id }
  const [emailTarget, setEmailTarget] = useState(null) // { id, customerEmail }

  const { data: res, isLoading } = useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => invoicesApi.getAll({ ...filters, search: search || undefined }).then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => invoicesApi.delete(id),
    onSuccess: () => {
      toast.success('Invoice deleted')
      qc.invalidateQueries({ queryKey: ['invoices'] })
      setDeleteId(null)
    },
    onError: (err) => {
      const msg = err?.response?.data?.message ?? 'Failed to delete'
      toast.error(msg)
    },
  })

  const approveMutation = useMutation({
    mutationFn: ({ id }) => invoicesApi.approve(id),
    onSuccess: (_, { id, customerEmail }) => {
      toast.success('Invoice approved')
      qc.invalidateQueries({ queryKey: ['invoices'] })
      setEmailTarget({ id, customerEmail })
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to approve'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => invoicesApi.reject(id, reason),
    onSuccess: () => { toast.success('Invoice rejected'); qc.invalidateQueries({ queryKey: ['invoices'] }); setRejectTarget(null) },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to reject'),
  })

  const sendEmailMutation = useMutation({
    mutationFn: (id) => invoicesApi.sendEmail(id),
    onSuccess: (res) => { toast.success(res.data?.message ?? 'Email sent'); setEmailTarget(null) },
    onError: (err) => { toast.error(err?.response?.data?.message ?? 'Failed to send email'); setEmailTarget(null) },
  })

  const handleExport = async (format) => {
    setExporting(true)
    try {
      const res = await invoicesApi.export(filters, format)
      const ext = { Excel: '.xlsx', Csv: '.csv', Pdf: '.pdf' }[format]
      downloadBlob(res.data, `invoices-${Date.now()}${ext}`)
      toast.success('Export downloaded')
    } catch { toast.error('Export failed') } finally { setExporting(false) }
  }

  const columns = [
    { key: 'invoiceNumber', header: 'Invoice #', sortable: true,
      render: (row) => (
        <Link to={`/invoices/${row.id}`} className="font-mono text-sm font-semibold text-brand-600 hover:text-brand-700">
          {row.invoiceNumber}
        </Link>
      )
    },
    { key: 'invoiceDate', header: 'Date', sortable: true,
      render: (row) => formatDate(row.invoiceDate)
    },
    { key: 'customerName', header: 'Customer',
      render: (row) => <span className="text-sm">{row.customerName ?? '—'}</span>
    },
    { key: 'totalAmount', header: 'Amount', sortable: true, align: 'right',
      render: (row) => <span className="font-semibold">{formatCurrency(row.totalAmount)}</span>
    },
    { key: 'status', header: 'Status',
      render: (row) => <StatusBadge status={row.status} />
    },
    { key: 'dueDate', header: 'Due',
      render: (row) => row.dueDate ? (
        <span className={row.status === 4 ? 'text-red-600 text-sm font-medium' : 'text-sm text-gray-600'}>
          {formatDate(row.dueDate)}
        </span>
      ) : '—'
    },
    { key: 'updatedDate', header: 'Updated',
      render: (row) => <span className="text-sm text-gray-500">{row.updatedDate ? formatDate(row.updatedDate) : '—'}</span>
    },
    { key: 'actions', header: '', width: '150px',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => navigate(`/invoices/${row.id}/edit`)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="Edit"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6.364-6.364a2 2 0 012.828 2.828L11.828 13.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
            </svg>
          </button>
          {isManager && row.status === 1 && (
            <>
              <button
                onClick={() => approveMutation.mutate({ id: row.id, customerEmail: row.customerEmail })}
                disabled={approveMutation.isPending}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-green-50 hover:text-green-600 disabled:opacity-30"
                title="Approve"
              >
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setRejectTarget({ id: row.id })}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                title="Reject"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {row.status === 5 && (
            <button
              onClick={() => {
                if (!row.customerEmail) {
                  toast.error('No customer email on file — edit the invoice to add one.')
                  return
                }
                setEmailTarget({ id: row.id, customerEmail: row.customerEmail })
              }}
              disabled={sendEmailMutation.isPending}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30"
              title="Resend email"
            >
              <Mail className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setDeleteId(row.id)}
            disabled={row.status === 2}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
            title={row.status === 2 ? 'Paid invoices cannot be deleted' : 'Delete'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    },
  ]

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Create and manage customer invoices."
        breadcrumbs={[{ label: 'Invoices' }]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />} loading={exporting} onClick={() => handleExport('Excel')}>
              Export
            </Button>
            <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => navigate('/invoices/create')}>
              New invoice
            </Button>
          </div>
        }
      />

      <Card padding={false}>
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100">
          <SearchInput value={search} onChange={v => { setSearch(v); setFilters(p => ({ ...p, page: 1 })) }} placeholder="Invoice # or customer…" className="w-56" />
          <Select
            options={[
              { value: '', label: 'All status' },
              { value: '0', label: 'Draft' }, { value: '1', label: 'Pending' },
              { value: '2', label: 'Paid' }, { value: '3', label: 'Cancelled' },
              { value: '4', label: 'Overdue' }, { value: '5', label: 'Approved' }, { value: '6', label: 'Rejected' },
            ]}
            value={filters.status ?? ''}
            onChange={e => setFilters(p => ({ ...p, status: e.target.value !== '' ? Number(e.target.value) : undefined, page: 1 }))}
            className="w-36"
          />
          <Input
            type="date" placeholder="From"
            value={filters.fromDate ?? ''}
            onChange={e => setFilters(p => ({ ...p, fromDate: e.target.value || undefined, page: 1 }))}
            className="w-36"
          />
          <Input
            type="date" placeholder="To"
            value={filters.toDate ?? ''}
            onChange={e => setFilters(p => ({ ...p, toDate: e.target.value || undefined, page: 1 }))}
            className="w-36"
          />
        </div>

        <Table
          columns={columns}
          data={res?.data ?? []}
          loading={isLoading}
          rowKey={r => r.id}
          sortBy={filters.sortBy}
          sortDirection={filters.sortDirection}
          onSort={key => setFilters(p => ({
            ...p, sortBy: key,
            sortDirection: p.sortBy === key && p.sortDirection === 'asc' ? 'desc' : 'asc',
          }))}
          emptyMessage="No invoices yet. Create your first invoice."
        />
        <Pagination
          page={filters.page ?? 1}
          pageSize={filters.pageSize ?? 20}
          totalCount={res?.totalCount ?? 0}
          totalPages={res?.totalPages ?? 0}
          onPageChange={page => setFilters(p => ({ ...p, page }))}
        />
      </Card>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete invoice"
        message="This invoice will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />

      <RejectModal
        open={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        onConfirm={(reason) => rejectMutation.mutate({ id: rejectTarget.id, reason })}
        loading={rejectMutation.isPending}
      />

      <SendEmailModal
        open={emailTarget !== null}
        onClose={() => setEmailTarget(null)}
        onSend={() => sendEmailMutation.mutate(emailTarget.id)}
        loading={sendEmailMutation.isPending}
        customerEmail={emailTarget?.customerEmail}
        invoiceId={emailTarget?.id}
      />
    </div>
  )
}

// ─── Invoice HTML Preview Modal ───────────────────────────────────────────
function InvoicePreviewModal({ open, onClose, invoiceId }) {
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !invoiceId) return
    setLoading(true)
    invoicesApi.getPreviewHtml(invoiceId)
      .then(res => setHtml(res.data?.data ?? ''))
      .catch(() => toast.error('Failed to load preview'))
      .finally(() => setLoading(false))
  }, [open, invoiceId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-gray-900/80 backdrop-blur-sm">
      {/* toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b shrink-0">
        <span className="font-semibold text-gray-800 text-sm">Invoice Preview</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-1 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>
      {/* content */}
      <div className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-white mt-20">
            <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            Loading preview…
          </div>
        ) : (
          <iframe
            srcDoc={html}
            title="Invoice Preview"
            className="w-[210mm] min-h-[297mm] bg-white shadow-xl border-0"
            sandbox="allow-same-origin"
          />
        )}
      </div>
    </div>
  )
}

// ─── Send Email Modal ─────────────────────────────────────────────────────
function SendEmailModal({ open, onClose, onSend, loading, customerEmail, invoiceId }) {
  const hasEmail = !!customerEmail
  const [downloading, setDownloading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const handleDownload = async () => {
    if (!invoiceId || downloading) return
    setDownloading(true)
    try {
      const res = await invoicesApi.downloadPdf(invoiceId)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch {
      toast.error('Failed to download PDF')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <InvoicePreviewModal open={showPreview} onClose={() => setShowPreview(false)} invoiceId={invoiceId} />
      <Modal open={open} onClose={onClose} title="Send invoice to customer" size="md"
        footer={
          <div className="flex gap-2 justify-between">
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(true)}
                leftIcon={<FileText className="w-3.5 h-3.5" />}>
                Preview
              </Button>
              <Button variant="ghost" size="sm" loading={downloading} onClick={handleDownload}
                leftIcon={<Download className="w-3.5 h-3.5" />}>
                Download PDF
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Skip</Button>
              <Button loading={loading} disabled={!hasEmail} onClick={onSend}>
                Send email
              </Button>
            </div>
          </div>
        }
      >
        {hasEmail ? (
          <p className="text-sm text-gray-600">
            Send the approved invoice with a PDF attachment to{' '}
            <span className="font-semibold text-gray-900">{customerEmail}</span>?
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-600">Would you like to email this invoice to the customer?</p>
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              No customer email on file — cannot send. Edit the invoice to add one.
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}

// ─── Reject Reason Modal ──────────────────────────────────────────────────
function RejectModal({ open, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('')
  useEffect(() => { if (open) setReason('') }, [open])
  return (
    <Modal open={open} onClose={onClose} title="Reject invoice" size="sm"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={loading} disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>
            Reject
          </Button>
        </div>
      }
    >
      <Textarea
        label="Reason for rejection"
        required
        rows={3}
        placeholder="Explain why this invoice is being rejected…"
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
    </Modal>
  )
}

// ─── Invoice Create Schema ─────────────────────────────────────────────────
// Accepts string | null | undefined — normalises null to undefined for optional fields
const ns = z.string().nullish().transform(v => v ?? undefined)

const lineSchema = z.object({
  itemId: z.coerce.number().optional().nullable(),
  locationId: z.coerce.number().min(1, 'Location required').or(z.literal(0)).optional().nullable(),
  itemName: z.string().min(1, 'Required'),
  description: ns,
  quantity: z.coerce.number().int().min(1, 'Min 1'),
  unitPrice: z.coerce.number().min(0.01, 'Must be > 0'),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
})

const invoiceSchema = z.object({
  locationId: z.coerce.number().min(1, 'Location is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  dueDate: ns,
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email('Invalid email').optional().or(z.literal('')).or(z.null()).transform(v => v ?? ''),
  customerPhoneCountryCode: ns,
  customerPhone: ns,
  customerAddress: ns,
  taxRate: z.coerce.number().min(0.01, 'Tax rate must be greater than 0').max(100),
  discountAmount: z.coerce.number().min(0).default(0),
  notes: ns,
  paymentTerms: ns,
  paymentNotes: ns,
  paymentReference: ns,
  details: z.array(lineSchema).min(1, 'Add at least one line item'),
  status: z.number().default(1),
}).refine(
  data => !data.dueDate || data.dueDate >= data.invoiceDate,
  { message: 'Due date must be on or after invoice date', path: ['dueDate'] }
)

// ─── Invoice Create Page ──────────────────────────────────────────────────
export function InvoiceCreatePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { state: routeState } = useLocation()
  const { hasMinLevel } = useAuth()

  const [activeTab, setActiveTab] = useState('Invoice')
  const [confirmReplace, setConfirmReplace] = useState(null) // { locationId, locationName }

  const { data: items = [] } = useQuery({
    queryKey: ['items-lookup'],
    queryFn: () => itemsApi.getLookup().then(r => r.data.data ?? []),
    staleTime: 1000 * 60 * 5,
  })

  const { data: locations = [] } = useQuery({
    queryKey: ['locations-lookup'],
    queryFn: () => locationsApi.getLookup().then(r => r.data.data ?? []),
    staleTime: 1000 * 60 * 5,
  })

  const { data: company } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => companyApi.get().then(r => r.data.data),
    staleTime: 1000 * 60 * 10,
  })

  const { data: paymentTerms = [] } = useQuery({
    queryKey: ['payment-terms-lookup'],
    queryFn: () => paymentTermsApi.getLookup().then(r => r.data.data ?? []),
    staleTime: 1000 * 60 * 5,
  })

  const { data: invoiceSettings } = useQuery({
    queryKey: ['invoice-settings'],
    queryFn: () => invoicesApi.getSettings().then(r => r.data?.data),
    staleTime: 1000 * 60 * 5,
  })

  const prefill = routeState?.prefill
  const { register, control, handleSubmit, watch, setValue, getValues, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: prefill ? {
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      taxRate: prefill.taxRate,
      discountAmount: prefill.discountAmount,
      customerName: prefill.customerName ?? '',
      customerEmail: prefill.customerEmail ?? '',
      customerPhoneCountryCode: prefill.customerPhoneCountryCode ?? '60',
      customerPhone: prefill.customerPhone ?? '',
      customerAddress: prefill.customerAddress ?? '',
      locationId: prefill.locationId,
      notes: prefill.notes ?? '',
      paymentTerms: prefill.paymentTerms ?? '',
      paymentNotes: prefill.paymentNotes ?? '',
      details: prefill.details,
      status: 1,
      invoiceNumber: '',
    } : {
      invoiceDate: new Date().toISOString().split('T')[0],
      taxRate: 6, discountAmount: 0,
      customerPhoneCountryCode: '60',
      paymentTerms: company?.paymentTerms ?? '',
      paymentNotes: company?.paymentNotes ?? '',
      details: [{ itemName: '', quantity: 1, unitPrice: 0, discountPercent: 0 }],
      status: 1,
      invoiceNumber: '',
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'details' })

  useEffect(() => {
    if (invoiceSettings?.nextInvoiceNumber) {
      setValue('invoiceNumber', invoiceSettings.nextInvoiceNumber)
    }
  }, [invoiceSettings]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select the default location once the lookup loads
  useEffect(() => {
    if (!locations.length) return
    const def = locations.find(l => l.isDefault)
    if (!def) return
    setValue('locationId', def.id)
    const details = getValues('details')
    details.forEach((_, i) => setValue(`details.${i}.locationId`, def.id))
  }, [locations]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select the default payment term and calculate due date
  useEffect(() => {
    if (!paymentTerms.length) return
    const def = paymentTerms.find(t => t.isDefault)
    if (!def) return
    setValue('paymentTerms', def.name)
    if (def.dueDays != null) {
      const invoiceDate = getValues('invoiceDate')
      if (invoiceDate) {
        const due = new Date(invoiceDate)
        due.setDate(due.getDate() + def.dueDays)
        setValue('dueDate', due.toISOString().split('T')[0])
      }
    }
  }, [paymentTerms]) // eslint-disable-line react-hooks/exhaustive-deps

  const watchedDetails = watch('details')
  const watchedTax = watch('taxRate')
  const watchedDiscount = watch('discountAmount')

  const grossTotal = watchedDetails?.reduce((sum, d) =>
    sum + (Number(d.quantity) * Number(d.unitPrice)), 0) ?? 0

  const subTotal = watchedDetails?.reduce((sum, d) => {
    const disc = 1 - (Number(d.discountPercent) / 100)
    return sum + (Number(d.quantity) * Number(d.unitPrice) * disc)
  }, 0) ?? 0

  const lineDiscountTotal = grossTotal - subTotal
  const masterDiscount = Number(watchedDiscount) || 0
  const taxAmount = subTotal * ((Number(watchedTax) || 0) / 100)
  const total = subTotal + taxAmount - masterDiscount

  const [createdInvoice, setCreatedInvoice] = useState(null) // for email modal after save+confirm
  const [showCreateEmailModal, setShowCreateEmailModal] = useState(false)

  const sendEmailAfterCreate = useMutation({
    mutationFn: (id) => invoicesApi.sendEmail(id),
    onSuccess: (res) => { toast.success(res.data?.message ?? 'Email sent'); setShowCreateEmailModal(false); navigate('/invoices') },
    onError: (err) => { toast.error(err?.response?.data?.message ?? 'Failed to send email'); setShowCreateEmailModal(false); navigate('/invoices') },
  })

  const mutation = useMutation({
    mutationFn: (data) => invoicesApi.create(data),
    onSuccess: (res, variables) => {
      const inv = res.data.data
      toast.success(`Invoice ${inv?.invoiceNumber} created`)
      qc.invalidateQueries({ queryKey: ['invoices'] })
      if (variables.status === 5) {
        setCreatedInvoice(inv)
        setShowCreateEmailModal(true)
      } else {
        navigate('/invoices')
      }
    },
    onError: () => toast.error('Failed to create invoice'),
  })

  const handleItemSelect = (index, itemId) => {
    const item = items.find(i => i.id === Number(itemId))
    if (item) {
      setValue(`details.${index}.itemId`, item.id)
      setValue(`details.${index}.itemName`, item.name)
      setValue(`details.${index}.unitPrice`, item.price)
    }
  }

  // Called when master location changes — fills empty lines, prompts for lines that already have one
  const handleMasterLocationChange = (e) => {
    const locationId = e.target.value ? Number(e.target.value) : undefined
    setValue('locationId', locationId)

    if (!locationId) return

    const details = getValues('details')
    const hasExisting = details.some(d => d.locationId)

    if (hasExisting) {
      const loc = locations.find(l => l.id === locationId)
      setConfirmReplace({ locationId, locationName: loc?.name ?? '' })
    } else {
      details.forEach((_, i) => setValue(`details.${i}.locationId`, locationId))
    }
  }

  // Fill lines based on user's choice — replaceAll=true fills everything, false fills only empty ones
  const applyLocationToDetails = (replaceAll) => {
    const { locationId, details } = getValues()
    details.forEach((d, i) => {
      if (replaceAll || !d.locationId) {
        setValue(`details.${i}.locationId`, locationId)
      }
    })
    setConfirmReplace(null)
  }

  const locationOptions = [{ value: '', label: 'No location' }, ...locations.map(l => ({ value: l.id, label: l.city ? `${l.name} — ${l.city}` : l.name }))]

  return (
    <div>
      <PageHeader
        title={prefill ? 'Duplicate invoice' : 'New invoice'}
        breadcrumbs={[{ label: 'Invoices', href: '/invoices' }, { label: prefill ? 'Duplicate invoice' : 'New invoice' }]}
        action={<Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => navigate(-1)}>Back</Button>}
      />

      <form onSubmit={e => e.preventDefault()}>
        <div className="flex flex-col gap-5">

          {/* Row 1 — Tabbed: Invoice / Customer */}
          <Card>
            {/* Tab bar with error indicators */}
            {(() => {
              const tabErrors = {
                Invoice: !!(errors.invoiceNumber || errors.invoiceDate || errors.dueDate || errors.locationId || errors.taxRate),
                Customer: !!(errors.customerName || errors.customerEmail),
                Payment: false,
              }
              return (
                <div className="flex gap-1 border-b border-gray-200 mb-4">
                  {['Invoice', 'Customer', 'Payment'].map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`relative px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                        activeTab === tab
                          ? 'text-brand-600 border-b-2 border-brand-600 -mb-px'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab}
                      {tabErrors[tab] && (
                        <span className="absolute top-1.5 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
                      )}
                    </button>
                  ))}
                </div>
              )
            })()}

            {activeTab === 'Invoice' && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Invoice number"
                  placeholder="Auto-generated if left empty"
                  error={errors.invoiceNumber?.message}
                  {...register('invoiceNumber')}
                />
                <div />
                <Input
                  label="Invoice date" type="date" required
                  error={errors.invoiceDate?.message}
                  {...register('invoiceDate', {
                    onChange: e => {
                      const newInvoiceDate = e.target.value
                      const dueDate = getValues('dueDate')
                      if (dueDate && dueDate < newInvoiceDate) setValue('dueDate', newInvoiceDate)
                    }
                  })}
                />
                <Input
                  label="Due date" type="date"
                  min={watch('invoiceDate')}
                  error={errors.dueDate?.message}
                  {...register('dueDate')}
                />
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`w-full h-9 rounded-lg border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                      errors.locationId ? 'border-red-400 ring-1 ring-red-400' : 'border-gray-300'
                    }`}
                    onChange={handleMasterLocationChange}
                    value={watch('locationId') ?? ''}
                  >
                    {locationOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {errors.locationId && (
                    <p className="text-xs text-red-500 mt-1">{errors.locationId.message}</p>
                  )}
                </div>
                <Input label="Tax rate (%)" type="number" step="0.1" required error={errors.taxRate?.message} {...register('taxRate')} />
                <Input label="Discount (MYR)" type="number" step="0.01" {...register('discountAmount')} />
                <div className="col-span-2">
                  <Textarea label="Notes" rows={2} {...register('notes')} />
                </div>
              </div>
            )}

            {activeTab === 'Payment' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Payment terms</label>
                  <select
                    className="w-full h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={watch('paymentTerms') ?? ''}
                    onChange={e => {
                      const name = e.target.value
                      setValue('paymentTerms', name)
                      const term = paymentTerms.find(t => t.name === name)
                      if (term?.dueDays != null) {
                        const invoiceDate = getValues('invoiceDate')
                        if (invoiceDate) {
                          const due = new Date(invoiceDate)
                          due.setDate(due.getDate() + term.dueDays)
                          setValue('dueDate', due.toISOString().split('T')[0])
                        }
                      }
                    }}
                  >
                    <option value="">Select a term…</option>
                    {paymentTerms.map(t => (
                      <option key={t.id} value={t.name}>{t.name}{t.dueDays != null ? ` (${t.dueDays} days)` : ''}</option>
                    ))}
                  </select>
                </div>
                <Input label="Payment reference" placeholder="e.g. PO-12345" {...register('paymentReference')} />
                <div className="col-span-2">
                  <Textarea label="Payment notes (bank details, instructions)" rows={4} {...register('paymentNotes')} />
                </div>
              </div>
            )}

            {activeTab === 'Customer' && (
              <div className="grid grid-cols-2 gap-4">
                <Input label="Customer name" required error={errors.customerName?.message} {...register('customerName')} />
                <Input label="Customer email" type="email" error={errors.customerEmail?.message} {...register('customerEmail')} />
                <PhoneInput
                  label="Customer phone"
                  countryCodeProps={register('customerPhoneCountryCode')}
                  phoneProps={register('customerPhone')}
                  colSpan2={false}
                />
                <div className="col-span-2">
                  <Textarea label="Address" rows={2} {...register('customerAddress')} />
                </div>
              </div>
            )}
          </Card>

          {/* Row 2 — Line items */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Line items</h2>
              <Button
                type="button" size="sm" variant="outline"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => append({ itemName: '', quantity: 1, unitPrice: 0, discountPercent: 0 })}
              >
                Add line
              </Button>
            </div>

            {fields.length === 0 ? (
              <Empty icon={<FileText className="w-8 h-8" />} title="No line items" description="Add at least one item to this invoice." />
            ) : (
              <>
                {/* Column headers */}
                <div className="hidden sm:grid grid-cols-12 gap-2 px-3 mb-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div className="col-span-2">Item</div>
                  <div className="col-span-2">Name</div>
                  <div className="col-span-2">Location</div>
                  <div className="col-span-1 text-center">Qty</div>
                  <div className="col-span-2 text-right">Unit price</div>
                  <div className="col-span-1 text-right">Disc %</div>
                  <div className="col-span-1 text-right">Total</div>
                  <div className="col-span-1" />
                </div>

                <div className="flex flex-col gap-2">
                  {fields.map((field, index) => {
                    const d = watchedDetails?.[index]
                    const lineTotal = d ? Number(d.quantity) * Number(d.unitPrice) * (1 - Number(d.discountPercent) / 100) : 0
                    return (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2 bg-gray-50 rounded-lg">
                        {/* Item picker */}
                        <div className="col-span-12 sm:col-span-2">
                          <select
                            className="w-full h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            onChange={e => handleItemSelect(index, e.target.value)}
                            defaultValue=""
                          >
                            <option value="">Custom…</option>
                            {items.map(item => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </select>
                        </div>
                        {/* Name */}
                        <div className="col-span-12 sm:col-span-2">
                          <Input
                            placeholder="Item name"
                            error={errors.details?.[index]?.itemName?.message}
                            {...register(`details.${index}.itemName`)}
                          />
                        </div>
                        {/* Line location */}
                        <div className="col-span-12 sm:col-span-2">
                          <select
                            className="w-full h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            {...register(`details.${index}.locationId`)}
                          >
                            {locationOptions.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        {/* Qty */}
                        <div className="col-span-4 sm:col-span-1">
                          <Input type="number" min="1" placeholder="Qty"
                            error={errors.details?.[index]?.quantity?.message}
                            {...register(`details.${index}.quantity`)} />
                        </div>
                        {/* Unit price */}
                        <div className="col-span-4 sm:col-span-2">
                          <Input type="number" step="0.01" placeholder="0.00" className="text-right"
                            error={errors.details?.[index]?.unitPrice?.message}
                            {...register(`details.${index}.unitPrice`)} />
                        </div>
                        {/* Disc % */}
                        <div className="col-span-3 sm:col-span-1">
                          <Input type="number" step="0.1" placeholder="0" className="text-right" {...register(`details.${index}.discountPercent`)} />
                        </div>
                        {/* Line total — read-only */}
                        <div className="col-span-4 sm:col-span-1 text-right text-sm font-semibold text-gray-800 pr-1">
                          {formatCurrency(lineTotal)}
                        </div>
                        {/* Remove */}
                        <div className="col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

              </>
            )}
            {errors.details?.message && (
              <p className="text-xs text-red-500 mt-2">{errors.details.message}</p>
            )}
          </Card>

          {/* Row 3 — Summary */}
          <Card>
            <div className="flex justify-end">
            <div className="w-80">
              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Gross</span><span className="font-medium text-gray-800">{formatCurrency(grossTotal)}</span>
                </div>
                {lineDiscountTotal > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Line discount</span><span className="font-medium text-red-500">−{formatCurrency(lineDiscountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span><span className="font-medium text-gray-800">{formatCurrency(subTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Tax ({Number(watchedTax) || 0}%)</span><span className="font-medium text-gray-800">{formatCurrency(taxAmount)}</span>
                </div>
                {masterDiscount > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Discount</span><span className="font-medium text-red-500">−{formatCurrency(masterDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200 text-base font-bold text-gray-900">
                  <span>Total</span><span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
            </div>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              loading={isSubmitting}
              onClick={handleSubmit(d => mutation.mutate({ ...d, status: 0 }), e => toastFormErrors(e, toast))}
            >
              Save as draft
            </Button>
            <Button
              type="button"
              loading={isSubmitting}
              onClick={handleSubmit(d => mutation.mutate({ ...d, status: 1 }), e => toastFormErrors(e, toast))}
            >
              Create invoice
            </Button>
            {hasMinLevel(60) && (
              <Button
                type="button"
                variant="success"
                loading={isSubmitting}
                onClick={handleSubmit(d => mutation.mutate({ ...d, status: 5 }), e => toastFormErrors(e, toast))}
              >
                Save &amp; confirm
              </Button>
            )}
          </div>

        </div>
      </form>

      {/* Confirm replace existing line locations */}
      <ConfirmDialog
        open={confirmReplace !== null}
        onClose={() => setConfirmReplace(null)}
        onConfirm={() => applyLocationToDetails(true)}
        title="Replace line item locations?"
        message={`Some line items already have a location set. Replace them all with "${confirmReplace?.locationName}"? Empty lines will always be filled.`}
        confirmLabel="Replace all"
        cancelLabel="Fill empty only"
        variant="warning"
        onCancel={() => applyLocationToDetails(false)}
      />

      <SendEmailModal
        open={showCreateEmailModal}
        onClose={() => { setShowCreateEmailModal(false); navigate('/invoices') }}
        onSend={() => sendEmailAfterCreate.mutate(createdInvoice?.id)}
        loading={sendEmailAfterCreate.isPending}
        customerEmail={createdInvoice?.customerEmail}
        invoiceId={createdInvoice?.id}
      />
    </div>
  )
}

// ─── Invoice Detail Page ──────────────────────────────────────────────────
export function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasMinLevel } = useAuth()
  const isManager = hasMinLevel(60)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [activeTab, setActiveTab] = useState('Invoice')

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.getById(Number(id)).then(r => r.data.data),
    enabled: !!id,
  })

  const updateStatus = useMutation({
    mutationFn: (status) =>
      invoicesApi.update(Number(id), {
        ...invoice,
        details: invoice.details.map(d => ({
          itemId: d.itemId, itemName: d.itemName, description: d.description,
          quantity: d.quantity, unitPrice: d.unitPrice, discountPercent: d.discountPercent,
        })),
        status,
      }),
    onSuccess: () => {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['invoice', id] })
      setShowStatusModal(false)
    },
    onError: () => toast.error('Failed to update status'),
  })

  const approveMutation = useMutation({
    mutationFn: () => invoicesApi.approve(Number(id)),
    onSuccess: () => {
      toast.success('Invoice approved')
      qc.invalidateQueries({ queryKey: ['invoice', id] })
      setShowEmailModal(true)
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to approve'),
  })

  const sendEmailMutation = useMutation({
    mutationFn: () => invoicesApi.sendEmail(Number(id)),
    onSuccess: (res) => { toast.success(res.data?.message ?? 'Email sent'); setShowEmailModal(false) },
    onError: (err) => { toast.error(err?.response?.data?.message ?? 'Failed to send email'); setShowEmailModal(false) },
  })

  const rejectMutation = useMutation({
    mutationFn: (reason) => invoicesApi.reject(Number(id), reason),
    onSuccess: () => { toast.success('Invoice rejected'); qc.invalidateQueries({ queryKey: ['invoice', id] }); setShowRejectModal(false) },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to reject'),
  })

  const handleDuplicate = () => {
    navigate('/invoices/create', {
      state: {
        prefill: {
          customerName: invoice.customerName,
          customerEmail: invoice.customerEmail,
          customerPhoneCountryCode: invoice.customerPhoneCountryCode,
          customerPhone: invoice.customerPhone,
          customerAddress: invoice.customerAddress,
          locationId: invoice.locationId,
          taxRate: invoice.taxRate,
          discountAmount: invoice.discountAmount,
          notes: invoice.notes,
          paymentTerms: invoice.paymentTerms,
          paymentNotes: invoice.paymentNotes,
          details: invoice.details.map(d => ({
            itemId: d.itemId,
            itemName: d.itemName,
            description: d.description,
            quantity: d.quantity,
            unitPrice: d.unitPrice,
            discountPercent: d.discountPercent,
            locationId: d.locationId,
          })),
        },
      },
    })
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!invoice) return <Empty title="Invoice not found" />

  const canEdit = isManager || invoice.status === 0 || invoice.status === 1

  return (
    <div>
      <PageHeader
        title={invoice.invoiceNumber}
        breadcrumbs={[{ label: 'Invoices', href: '/invoices' }, { label: invoice.invoiceNumber }]}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={invoice.status} />
            {isManager && invoice.status === 1 && (
              <>
                <Button size="sm" variant="success" leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                  loading={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
                  Approve
                </Button>
                <Button size="sm" variant="danger" leftIcon={<XCircle className="w-3.5 h-3.5" />}
                  onClick={() => setShowRejectModal(true)}>
                  Reject
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" leftIcon={<Copy className="w-3.5 h-3.5" />}
              onClick={handleDuplicate}>
              Duplicate
            </Button>
            {canEdit && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowStatusModal(true)}>Update status</Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/invoices/${id}/edit`)}>Edit</Button>
              </>
            )}
            <Button size="sm" variant="ghost" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-5">
        {/* Row 1 — Tabbed info card (mirrors create page) */}
        <Card>
          {(() => {
            const tabs = ['Invoice', 'Customer', 'Payment']
            return (
              <>
                <div className="flex gap-1 border-b border-gray-200 mb-4">
                  {tabs.map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                        activeTab === tab
                          ? 'text-brand-600 border-b-2 border-brand-600 -mb-px'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === 'Invoice' && (
                  <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    {[
                      ['Invoice #', invoice.invoiceNumber],
                      ['Date', formatDate(invoice.invoiceDate)],
                      ['Due date', invoice.dueDate ? formatDate(invoice.dueDate) : '—'],
                      ['Location', invoice.locationName ?? '—'],
                      ['Tax rate', `${invoice.taxRate}%`],
                      ['Discount', invoice.discountAmount > 0 ? formatCurrency(invoice.discountAmount) : '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-4">
                        <dt className="text-gray-500">{label}</dt>
                        <dd className="font-medium text-gray-900 text-right">{value}</dd>
                      </div>
                    ))}
                    {invoice.rejectionReason && (
                      <div className="col-span-2 flex flex-col gap-1 pt-2 border-t border-red-100 bg-red-50 rounded-lg p-3 mt-1">
                        <dt className="text-red-600 font-medium text-xs uppercase tracking-wide">Rejection reason</dt>
                        <dd className="text-red-700 leading-relaxed">{invoice.rejectionReason}</dd>
                      </div>
                    )}
                    {invoice.notes && (
                      <div className="col-span-2 flex flex-col gap-1 pt-2 border-t border-gray-100">
                        <dt className="text-gray-500">Notes</dt>
                        <dd className="text-gray-700 leading-relaxed">{invoice.notes}</dd>
                      </div>
                    )}
                  </dl>
                )}

                {activeTab === 'Customer' && (
                  <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    {[
                      ['Name', invoice.customerName ?? '—'],
                      ['Email', invoice.customerEmail ?? '—'],
                      ['Phone', invoice.customerPhone ? `+${invoice.customerPhoneCountryCode ?? ''}${invoice.customerPhone}` : '—'],
                      ['Address', invoice.customerAddress ?? '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-4">
                        <dt className="text-gray-500 shrink-0">{label}</dt>
                        <dd className="font-medium text-gray-900 text-right">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {activeTab === 'Payment' && (
                  <dl className="text-sm flex flex-col gap-3">
                    {invoice.paymentTerms && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500 shrink-0">Terms</dt>
                        <dd className="font-medium text-gray-900 text-right">{invoice.paymentTerms}</dd>
                      </div>
                    )}
                    {invoice.paymentReference && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500 shrink-0">Reference</dt>
                        <dd className="font-medium text-gray-900 text-right">{invoice.paymentReference}</dd>
                      </div>
                    )}
                    {invoice.paymentNotes && (
                      <div className="flex flex-col gap-1 pt-1 border-t border-gray-100">
                        <dt className="text-gray-500">Instructions</dt>
                        <dd className="text-gray-700 leading-relaxed whitespace-pre-line">{invoice.paymentNotes}</dd>
                      </div>
                    )}
                    {!invoice.paymentTerms && !invoice.paymentReference && !invoice.paymentNotes && (
                      <p className="text-gray-400 text-sm">No payment information.</p>
                    )}
                  </dl>
                )}
              </>
            )
          })()}
        </Card>

        {/* Row 2 — Line items (full width, mirrors create page) */}
        <Card>
          <CardHeader title="Line items" />
          <Table
            columns={[
              { key: 'itemName', header: 'Item',
                render: (r) => (
                  <div><p className="text-sm font-medium text-gray-900">{r.itemName}</p>
                  {r.description && <p className="text-xs text-gray-400">{r.description}</p>}</div>
                )
              },
              { key: 'locationName', header: 'Location',
                render: r => r.locationName ? <span className="text-sm text-gray-600">{r.locationName}</span> : <span className="text-gray-300">—</span>
              },
              { key: 'quantity', header: 'Qty', align: 'right' },
              { key: 'unitPrice', header: 'Unit price', align: 'right',
                render: r => formatCurrency(r.unitPrice)
              },
              { key: 'discountPercent', header: 'Disc', align: 'right',
                render: r => r.discountPercent > 0 ? `${r.discountPercent}%` : '—'
              },
              { key: 'lineTotal', header: 'Total', align: 'right',
                render: r => <span className="font-semibold">{formatCurrency(r.lineTotal)}</span>
              },
            ]}
            data={invoice.details}
            rowKey={r => r.id}
          />
          <div className="mt-4 flex flex-col items-end gap-1 text-sm border-t border-gray-100 pt-4">
            <div className="flex gap-16 text-gray-600"><span>Subtotal</span><span>{formatCurrency(invoice.subTotal)}</span></div>
            <div className="flex gap-16 text-gray-600"><span>Tax ({invoice.taxRate}%)</span><span>{formatCurrency(invoice.taxAmount)}</span></div>
            {invoice.discountAmount > 0 && (
              <div className="flex gap-16 text-red-600"><span>Discount</span><span>−{formatCurrency(invoice.discountAmount)}</span></div>
            )}
            <div className="flex gap-16 font-semibold text-base text-gray-900 border-t border-gray-200 pt-1 mt-1">
              <span>Total</span><span>{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Status update modal */}
      <Modal
        open={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Update invoice status"
        size="sm"
        footer={<Button variant="outline" onClick={() => setShowStatusModal(false)}>Cancel</Button>}
      >
        <div className="flex flex-col gap-2">
          {[{ value: 0, label: 'Draft' }, { value: 1, label: 'Pending' }, { value: 2, label: 'Paid' }, { value: 3, label: 'Cancelled' }, { value: 4, label: 'Overdue' }]
            .filter(s => s.value !== invoice.status)
            .map(s => {
              const isThisLoading = updateStatus.isPending && updateStatus.variables === s.value
              return (
                <button
                  key={s.value}
                  onClick={() => updateStatus.mutate(s.value)}
                  disabled={updateStatus.isPending}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors text-sm font-medium text-gray-700 text-left disabled:opacity-60"
                >
                  {isThisLoading ? <Spinner size="sm" /> : <StatusBadge status={s.value} />}
                  Mark as {s.label}
                </button>
              )
            })}
        </div>
      </Modal>

      <RejectModal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={(reason) => rejectMutation.mutate(reason)}
        loading={rejectMutation.isPending}
      />

      <SendEmailModal
        open={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSend={() => sendEmailMutation.mutate()}
        loading={sendEmailMutation.isPending}
        customerEmail={invoice?.customerEmail}
        invoiceId={Number(id)}
      />
    </div>
  )
}

// ─── Invoice Edit Page ────────────────────────────────────────────────────
export function InvoiceEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasMinLevel } = useAuth()
  const isManager = hasMinLevel(60)

  const [activeTab, setActiveTab] = useState('Invoice')
  const [confirmReplace, setConfirmReplace] = useState(null)
  const [showResendModal, setShowResendModal] = useState(false)
  const [pendingSave, setPendingSave] = useState(null) // form data waiting for resend decision

  const { data: invoice, isLoading: loadingInvoice } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.getById(Number(id)).then(r => r.data.data),
    enabled: !!id,
  })

  const { data: items = [] } = useQuery({
    queryKey: ['items-lookup'],
    queryFn: () => itemsApi.getLookup().then(r => r.data.data ?? []),
    staleTime: 1000 * 60 * 5,
  })

  const { data: locations = [] } = useQuery({
    queryKey: ['locations-lookup'],
    queryFn: () => locationsApi.getLookup().then(r => r.data.data ?? []),
    staleTime: 1000 * 60 * 5,
  })

  const { data: paymentTerms = [] } = useQuery({
    queryKey: ['payment-terms-lookup'],
    queryFn: () => paymentTermsApi.getLookup().then(r => r.data.data ?? []),
    staleTime: 1000 * 60 * 5,
  })

  const { register, control, handleSubmit, watch, setValue, getValues, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(invoiceSchema),
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'details' })

  // Pre-fill form when invoice loads
  useEffect(() => {
    if (!invoice) return
    reset({
      invoiceDate: invoice.invoiceDate?.split('T')[0] ?? '',
      dueDate: invoice.dueDate?.split('T')[0] ?? '',
      taxRate: invoice.taxRate,
      discountAmount: invoice.discountAmount,
      customerName: invoice.customerName ?? '',
      customerEmail: invoice.customerEmail ?? '',
      customerPhoneCountryCode: invoice.customerPhoneCountryCode ?? '60',
      customerPhone: invoice.customerPhone ?? '',
      customerAddress: invoice.customerAddress ?? '',
      locationId: invoice.locationId,
      notes: invoice.notes ?? '',
      paymentTerms: invoice.paymentTerms ?? '',
      paymentNotes: invoice.paymentNotes ?? '',
      paymentReference: invoice.paymentReference ?? '',
      status: invoice.status,
      details: invoice.details?.map(d => ({
        itemId: d.itemId,
        itemName: d.itemName ?? '',
        description: d.description ?? '',
        quantity: d.quantity,
        unitPrice: d.unitPrice,
        discountPercent: d.discountPercent ?? 0,
        locationId: d.locationId,
      })) ?? [],
    })
  }, [invoice, reset])

  const watchedDetails = watch('details')
  const watchedTax = watch('taxRate')
  const watchedDiscount = watch('discountAmount')

  const grossTotal = watchedDetails?.reduce((sum, d) =>
    sum + (Number(d.quantity) * Number(d.unitPrice)), 0) ?? 0

  const subTotal = watchedDetails?.reduce((sum, d) => {
    const disc = 1 - (Number(d.discountPercent) / 100)
    return sum + (Number(d.quantity) * Number(d.unitPrice) * disc)
  }, 0) ?? 0

  const lineDiscountTotal = grossTotal - subTotal
  const masterDiscount = Number(watchedDiscount) || 0
  const taxAmount = subTotal * ((Number(watchedTax) || 0) / 100)
  const total = subTotal + taxAmount - masterDiscount

  const saveMutation = useMutation({
    mutationFn: (data) => invoicesApi.update(Number(id), data),
    onSuccess: (_, variables) => {
      toast.success('Invoice updated')
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['invoice', id] })
      if (variables._resend) {
        setPendingSave(null)
        setShowResendModal(true)
      } else {
        navigate(`/invoices/${id}`)
      }
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to save invoice'),
  })

  const resendMutation = useMutation({
    mutationFn: () => invoicesApi.sendEmail(Number(id)),
    onSuccess: (res) => { toast.success(res.data?.message ?? 'Email sent'); setShowResendModal(false); navigate(`/invoices/${id}`) },
    onError: (err) => { toast.error(err?.response?.data?.message ?? 'Failed to send email'); setShowResendModal(false); navigate(`/invoices/${id}`) },
  })

  const handleSave = (data, resend = false) => {
    const payload = {
      ...data,
      id: Number(id),
      status: invoice.status,
      _resend: resend,
    }
    saveMutation.mutate(payload)
  }

  const handleItemSelect = (index, itemId) => {
    const item = items.find(i => i.id === Number(itemId))
    if (item) {
      setValue(`details.${index}.itemId`, item.id)
      setValue(`details.${index}.itemName`, item.name)
      setValue(`details.${index}.unitPrice`, item.price)
    }
  }

  const handleMasterLocationChange = (e) => {
    const locationId = e.target.value ? Number(e.target.value) : undefined
    setValue('locationId', locationId)
    if (!locationId) return
    const details = getValues('details')
    const hasExisting = details.some(d => d.locationId)
    if (hasExisting) {
      const loc = locations.find(l => l.id === locationId)
      setConfirmReplace({ locationId, locationName: loc?.name ?? '' })
    } else {
      details.forEach((_, i) => setValue(`details.${i}.locationId`, locationId))
    }
  }

  const applyLocationToDetails = (replaceAll) => {
    const { locationId, details } = getValues()
    details.forEach((d, i) => {
      if (replaceAll || !d.locationId) setValue(`details.${i}.locationId`, locationId)
    })
    setConfirmReplace(null)
  }

  const locationOptions = [{ value: '', label: 'No location' }, ...locations.map(l => ({ value: l.id, label: l.city ? `${l.name} — ${l.city}` : l.name }))]

  if (loadingInvoice) return <div className="flex justify-center py-16"><Spinner /></div>
  if (!invoice) return null

  const isApproved = invoice.status === 5

  return (
    <div>
      <PageHeader
        title={`Edit ${invoice.invoiceNumber}`}
        breadcrumbs={[{ label: 'Invoices', href: '/invoices' }, { label: invoice.invoiceNumber, href: `/invoices/${id}` }, { label: 'Edit' }]}
        action={<Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => navigate(-1)}>Back</Button>}
      />

      <form onSubmit={e => e.preventDefault()}>
        <div className="flex flex-col gap-5">

          {/* Row 1 — Tabbed: Invoice / Customer / Payment */}
          <Card>
            {(() => {
              const tabErrors = {
                Invoice: !!(errors.invoiceDate || errors.dueDate || errors.locationId || errors.taxRate),
                Customer: !!(errors.customerName || errors.customerEmail),
                Payment: false,
              }
              return (
                <div className="flex gap-1 border-b border-gray-200 mb-4">
                  {['Invoice', 'Customer', 'Payment'].map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`relative px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                        activeTab === tab
                          ? 'text-brand-600 border-b-2 border-brand-600 -mb-px'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab}
                      {tabErrors[tab] && (
                        <span className="absolute top-1.5 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
                      )}
                    </button>
                  ))}
                </div>
              )
            })()}

            {activeTab === 'Invoice' && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Invoice date" type="date" required
                  error={errors.invoiceDate?.message}
                  {...register('invoiceDate', {
                    onChange: e => {
                      const newInvoiceDate = e.target.value
                      const dueDate = getValues('dueDate')
                      if (dueDate && dueDate < newInvoiceDate) setValue('dueDate', newInvoiceDate)
                    }
                  })}
                />
                <Input
                  label="Due date" type="date"
                  min={watch('invoiceDate')}
                  error={errors.dueDate?.message}
                  {...register('dueDate')}
                />
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`w-full h-9 rounded-lg border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                      errors.locationId ? 'border-red-400 ring-1 ring-red-400' : 'border-gray-300'
                    }`}
                    onChange={handleMasterLocationChange}
                    value={watch('locationId') ?? ''}
                  >
                    {locationOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {errors.locationId && (
                    <p className="text-xs text-red-500 mt-1">{errors.locationId.message}</p>
                  )}
                </div>
                <Input label="Tax rate (%)" type="number" step="0.1" required error={errors.taxRate?.message} {...register('taxRate')} />
                <Input label="Discount (MYR)" type="number" step="0.01" {...register('discountAmount')} />
                <div className="col-span-2">
                  <Textarea label="Notes" rows={2} {...register('notes')} />
                </div>
              </div>
            )}

            {activeTab === 'Payment' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Payment terms</label>
                  <select
                    className="w-full h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={watch('paymentTerms') ?? ''}
                    onChange={e => {
                      const name = e.target.value
                      setValue('paymentTerms', name)
                      const term = paymentTerms.find(t => t.name === name)
                      if (term?.dueDays != null) {
                        const invoiceDate = getValues('invoiceDate')
                        if (invoiceDate) {
                          const due = new Date(invoiceDate)
                          due.setDate(due.getDate() + term.dueDays)
                          setValue('dueDate', due.toISOString().split('T')[0])
                        }
                      }
                    }}
                  >
                    <option value="">Select a term…</option>
                    {paymentTerms.map(t => (
                      <option key={t.id} value={t.name}>{t.name}{t.dueDays != null ? ` (${t.dueDays} days)` : ''}</option>
                    ))}
                  </select>
                </div>
                <Input label="Payment reference" placeholder="e.g. PO-12345" {...register('paymentReference')} />
                <div className="col-span-2">
                  <Textarea label="Payment notes (bank details, instructions)" rows={4} {...register('paymentNotes')} />
                </div>
              </div>
            )}

            {activeTab === 'Customer' && (
              <div className="grid grid-cols-2 gap-4">
                <Input label="Customer name" required error={errors.customerName?.message} {...register('customerName')} />
                <Input label="Customer email" type="email" error={errors.customerEmail?.message} {...register('customerEmail')} />
                <PhoneInput
                  label="Customer phone"
                  countryCodeProps={register('customerPhoneCountryCode')}
                  phoneProps={register('customerPhone')}
                  colSpan2={false}
                />
                <div className="col-span-2">
                  <Textarea label="Address" rows={2} {...register('customerAddress')} />
                </div>
              </div>
            )}
          </Card>

          {/* Row 2 — Line items */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Line items</h2>
              <Button
                type="button" size="sm" variant="outline"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => append({ itemName: '', quantity: 1, unitPrice: 0, discountPercent: 0 })}
              >
                Add line
              </Button>
            </div>

            {fields.length === 0 ? (
              <Empty icon={<FileText className="w-8 h-8" />} title="No line items" description="Add at least one item to this invoice." />
            ) : (
              <>
                <div className="hidden sm:grid grid-cols-12 gap-2 px-3 mb-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div className="col-span-2">Item</div>
                  <div className="col-span-2">Name</div>
                  <div className="col-span-2">Location</div>
                  <div className="col-span-1 text-center">Qty</div>
                  <div className="col-span-2 text-right">Unit price</div>
                  <div className="col-span-1 text-right">Disc %</div>
                  <div className="col-span-1 text-right">Total</div>
                  <div className="col-span-1" />
                </div>

                <div className="flex flex-col gap-2">
                  {fields.map((field, index) => {
                    const d = watchedDetails?.[index]
                    const lineTotal = d ? Number(d.quantity) * Number(d.unitPrice) * (1 - Number(d.discountPercent) / 100) : 0
                    return (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2 bg-gray-50 rounded-lg">
                        <div className="col-span-12 sm:col-span-2">
                          <select
                            className="w-full h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            onChange={e => handleItemSelect(index, e.target.value)}
                            defaultValue=""
                          >
                            <option value="">Custom…</option>
                            {items.map(item => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-12 sm:col-span-2">
                          <Input
                            placeholder="Item name"
                            error={errors.details?.[index]?.itemName?.message}
                            {...register(`details.${index}.itemName`)}
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-2">
                          <select
                            className="w-full h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            {...register(`details.${index}.locationId`)}
                          >
                            {locationOptions.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-4 sm:col-span-1">
                          <Input type="number" min="1" placeholder="Qty"
                            error={errors.details?.[index]?.quantity?.message}
                            {...register(`details.${index}.quantity`)} />
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <Input type="number" step="0.01" placeholder="0.00" className="text-right"
                            error={errors.details?.[index]?.unitPrice?.message}
                            {...register(`details.${index}.unitPrice`)} />
                        </div>
                        <div className="col-span-3 sm:col-span-1">
                          <Input type="number" step="0.1" placeholder="0" className="text-right" {...register(`details.${index}.discountPercent`)} />
                        </div>
                        <div className="col-span-4 sm:col-span-1 text-right text-sm font-semibold text-gray-800 pr-1">
                          {formatCurrency(lineTotal)}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
            {errors.details?.message && (
              <p className="text-xs text-red-500 mt-2">{errors.details.message}</p>
            )}
          </Card>

          {/* Row 3 — Summary */}
          <Card>
            <div className="flex justify-end">
              <div className="w-80">
                <div className="flex flex-col gap-1.5 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Gross</span><span className="font-medium text-gray-800">{formatCurrency(grossTotal)}</span>
                  </div>
                  {lineDiscountTotal > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Line discount</span><span className="font-medium text-red-500">−{formatCurrency(lineDiscountTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span><span className="font-medium text-gray-800">{formatCurrency(subTotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Tax ({Number(watchedTax) || 0}%)</span><span className="font-medium text-gray-800">{formatCurrency(taxAmount)}</span>
                  </div>
                  {masterDiscount > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Discount</span><span className="font-medium text-red-500">−{formatCurrency(masterDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200 text-base font-bold text-gray-900">
                    <span>Total</span><span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              loading={saveMutation.isPending}
              onClick={handleSubmit(d => handleSave(d, false), e => toastFormErrors(e, toast))}
            >
              Save invoice
            </Button>
            {isApproved && (
              <Button
                type="button"
                variant="success"
                loading={saveMutation.isPending}
                onClick={handleSubmit(d => handleSave(d, true), e => toastFormErrors(e, toast))}
              >
                Save &amp; resend email
              </Button>
            )}
          </div>

        </div>
      </form>

      <ConfirmDialog
        open={confirmReplace !== null}
        onClose={() => setConfirmReplace(null)}
        onConfirm={() => applyLocationToDetails(true)}
        title="Replace line item locations?"
        message={`Some line items already have a location set. Replace them all with "${confirmReplace?.locationName}"? Empty lines will always be filled.`}
        confirmLabel="Replace all"
        cancelLabel="Fill empty only"
        variant="warning"
        onCancel={() => applyLocationToDetails(false)}
      />

      <SendEmailModal
        open={showResendModal}
        onClose={() => { setShowResendModal(false); navigate(`/invoices/${id}`) }}
        onSend={() => resendMutation.mutate()}
        loading={resendMutation.isPending}
        customerEmail={invoice?.customerEmail}
        invoiceId={Number(id)}
      />
    </div>
  )
}
