import { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Pencil, Clock, Star } from 'lucide-react'
import { paymentTermsApi } from '@/api'
import { PageHeader } from '@/components/layout'
import {
  Button, Input, Select, Badge, Table, Pagination,
  SearchInput, Modal, ConfirmDialog, Card, Textarea,
} from '@/components/ui'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

const termSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(500).optional().or(z.literal('')),
  dueDays: z.coerce.number().int().min(0, 'Must be 0 or more').optional().or(z.literal('')),
  isActive: z.boolean(),
  isDefault: z.boolean(),
})

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
          checked ? 'bg-brand-600' : 'bg-gray-200'
        }`}
      >
        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  )
}

export default function PaymentTermsMaintenancePage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editTerm, setEditTerm] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const { data: res, isLoading } = useQuery({
    queryKey: ['payment-terms'],
    queryFn: () => paymentTermsApi.getAll({ page: 1, pageSize: 1000 }).then(r => r.data),
  })

  const allTerms = res?.data ?? []

  const filtered = useMemo(() => {
    let list = allTerms
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t => t.name.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q))
    }
    if (statusFilter !== '') {
      const active = statusFilter === 'true'
      list = list.filter(t => t.isActive === active)
    }
    return list
  }, [allTerms, search, statusFilter])

  const totalCount = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleFilterChange = (setter) => (val) => { setter(val); setPage(1) }

  const deleteMutation = useMutation({
    mutationFn: (id) => paymentTermsApi.delete(id),
    onSuccess: () => {
      toast.success('Payment term deleted')
      qc.invalidateQueries({ queryKey: ['payment-terms'] })
      qc.invalidateQueries({ queryKey: ['payment-terms-lookup'] })
      setDeleteId(null)
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to delete'),
  })

  const columns = [
    {
      key: 'name',
      header: 'Term',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-brand-50 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-brand-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{row.name}</p>
            {row.description && <p className="text-xs text-gray-400">{row.description}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'dueDays',
      header: 'Due days',
      align: 'right',
      render: (row) => row.dueDays != null
        ? <span className="text-sm font-medium text-gray-700">{row.dueDays} days</span>
        : <span className="text-gray-300">—</span>,
    },
    {
      key: 'isDefault',
      header: 'Default',
      render: (row) => row.isDefault
        ? <Badge variant="warning"><Star className="w-3 h-3 inline mr-1 fill-amber-400" />Default</Badge>
        : <span className="text-gray-300 text-sm">—</span>,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => row.isActive
        ? <Badge variant="success" dot>Active</Badge>
        : <Badge variant="default" dot>Inactive</Badge>,
    },
    {
      key: 'updatedDate',
      header: 'Updated',
      render: (row) => <span className="text-sm text-gray-500">{row.updatedDate ? formatDate(row.updatedDate) : '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => setEditTerm(row)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setDeleteId(row.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Payment Terms"
        description="Manage available payment terms for invoices."
        breadcrumbs={[{ label: 'Maintenance' }, { label: 'Payment Terms' }]}
        action={
          <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(true)}>
            Add term
          </Button>
        }
      />

      <Card padding={false}>
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <SearchInput value={search} onChange={handleFilterChange(setSearch)} placeholder="Search terms…" className="w-60" />
          <Select options={STATUS_OPTIONS} value={statusFilter} onChange={e => handleFilterChange(setStatusFilter)(e.target.value)} className="w-40" />
          <span className="ml-auto text-xs text-gray-400">{totalCount} {totalCount === 1 ? 'term' : 'terms'}</span>
        </div>

        <Table columns={columns} data={paginated} loading={isLoading} rowKey={r => r.id} emptyMessage="No payment terms found." />

        <Pagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} totalPages={totalPages} onPageChange={setPage} />
      </Card>

      <PaymentTermModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['payment-terms'] }); qc.invalidateQueries({ queryKey: ['payment-terms-lookup'] }) }}
      />

      <PaymentTermModal
        open={editTerm !== null}
        term={editTerm}
        onClose={() => setEditTerm(null)}
        onSuccess={() => { setEditTerm(null); qc.invalidateQueries({ queryKey: ['payment-terms'] }); qc.invalidateQueries({ queryKey: ['payment-terms-lookup'] }) }}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete payment term"
        message="This payment term will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function PaymentTermModal({ open, term, onClose, onSuccess }) {
  const isEdit = !!term

  const { register, handleSubmit, reset, control, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(termSchema),
    defaultValues: { name: '', description: '', dueDays: '', isActive: true, isDefault: false },
  })

  const watchedIsDefault = watch('isDefault')

  useEffect(() => {
    if (open) {
      reset(isEdit ? {
        name: term.name ?? '',
        description: term.description ?? '',
        dueDays: term.dueDays ?? '',
        isActive: term.isActive ?? true,
        isDefault: term.isDefault ?? false,
      } : { name: '', description: '', dueDays: '', isActive: true, isDefault: false })
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data) => {
    const payload = { ...data, dueDays: data.dueDays === '' ? null : Number(data.dueDays) }
    try {
      if (isEdit) {
        await paymentTermsApi.save({ ...payload, id: term.id })
        toast.success('Payment term updated')
      } else {
        await paymentTermsApi.save(payload)
        toast.success('Payment term created')
      }
      onSuccess()
    } catch (err) {
      toast.error(err?.response?.data?.message ?? `Failed to ${isEdit ? 'update' : 'create'} payment term`)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose() }}
      title={isEdit ? 'Edit payment term' : 'Add payment term'}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => { reset(); onClose() }}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create term'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Name" required placeholder="e.g. Net 30" error={errors.name?.message} {...register('name')} />
        <Input
          label="Due days"
          type="number"
          min="0"
          placeholder="e.g. 30 (leave blank if not applicable)"
          error={errors.dueDays?.message}
          {...register('dueDays')}
        />
        <Textarea label="Description" rows={2} placeholder="Optional notes about this term" error={errors.description?.message} {...register('description')} />
        <div className="flex flex-col gap-3 pt-1 border-t border-gray-100">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Toggle checked={field.value} onChange={field.onChange} label={field.value ? 'Active' : 'Inactive'} />
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">Default term</span>
            <Controller
              name="isDefault"
              control={control}
              render={({ field }) => (
                <Toggle checked={field.value} onChange={field.onChange} label={field.value ? 'Yes — this is the default' : 'No'} />
              )}
            />
            {watchedIsDefault && (
              <p className="text-xs text-amber-600">Setting this as default will remove the default flag from the current default term.</p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
