import { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Tag, Pencil } from 'lucide-react'
import { brandsApi } from '@/api'
import { PageHeader } from '@/components/layout'
import {
  Button, Input, Select, Badge, Table, Pagination,
  SearchInput, Modal, ConfirmDialog, Card,
} from '@/components/ui'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

const brandSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(500).optional(),
  isActive: z.boolean(),
})

// ─── Toggle component ──────────────────────────────────────────────────────
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
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  )
}

// ─── Brand Maintenance Page ────────────────────────────────────────────────
export default function BrandMaintenancePage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editBrand, setEditBrand] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const { data: res, isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.getAll().then(r => r.data),
  })

  const allBrands = res?.data ?? []

  const filtered = useMemo(() => {
    let list = allBrands
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b => b.name.toLowerCase().includes(q) || (b.description ?? '').toLowerCase().includes(q))
    }
    if (statusFilter !== '') {
      const active = statusFilter === 'true'
      list = list.filter(b => b.isActive === active)
    }
    return list
  }, [allBrands, search, statusFilter])

  const totalCount = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleFilterChange = (setter) => (val) => {
    setter(val)
    setPage(1)
  }

  const deleteMutation = useMutation({
    mutationFn: (id) => brandsApi.delete(id),
    onSuccess: () => {
      toast.success('Brand deleted')
      qc.invalidateQueries({ queryKey: ['brands'] })
      setDeleteId(null)
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to delete brand'),
  })

  const columns = [
    {
      key: 'name',
      header: 'Brand',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.logoUrl ? (
            <img src={row.logoUrl} alt={row.name} className="w-8 h-8 rounded object-contain border border-gray-100 bg-gray-50 flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded bg-brand-50 flex items-center justify-center flex-shrink-0">
              <Tag className="w-4 h-4 text-brand-400" />
            </div>
          )}
          <span className="text-sm font-medium text-gray-900">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => (
        <span className="text-sm text-gray-500 line-clamp-1">{row.description || '—'}</span>
      ),
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
      render: (row) => (
        <span className="text-sm text-gray-500">{row.updatedDate ? formatDate(row.updatedDate) : '—'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditBrand(row)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeleteId(row.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Brand Maintenance"
        description="Manage product brands."
        breadcrumbs={[{ label: 'Maintenance' }, { label: 'Brand Maintenance' }]}
        action={
          <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(true)}>
            Add brand
          </Button>
        }
      />

      <Card padding={false}>
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <SearchInput
            value={search}
            onChange={handleFilterChange(setSearch)}
            placeholder="Search brands…"
            className="w-60"
          />
          <Select
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={e => handleFilterChange(setStatusFilter)(e.target.value)}
            className="w-40"
          />
          <span className="ml-auto text-xs text-gray-400">
            {totalCount} {totalCount === 1 ? 'brand' : 'brands'}
          </span>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={paginated}
          loading={isLoading}
          rowKey={r => r.id}
          emptyMessage="No brands found."
        />

        {/* Pagination */}
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={totalCount}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </Card>

      {/* Create Modal */}
      <BrandModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setShowCreate(false)
          qc.invalidateQueries({ queryKey: ['brands'] })
        }}
      />

      {/* Edit Modal */}
      <BrandModal
        open={editBrand !== null}
        brand={editBrand}
        onClose={() => setEditBrand(null)}
        onSuccess={() => {
          setEditBrand(null)
          qc.invalidateQueries({ queryKey: ['brands'] })
        }}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete brand"
        message="This brand will be permanently removed. Items linked to it will have their brand cleared."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

// ─── Brand Modal (create + edit) ───────────────────────────────────────────
function BrandModal({ open, brand, onClose, onSuccess }) {
  const isEdit = !!brand

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(brandSchema),
    defaultValues: { name: '', description: '', isActive: true },
  })

  // Populate form when opening
  useEffect(() => {
    if (open) {
      reset(isEdit
        ? { name: brand.name ?? '', description: brand.description ?? '', isActive: brand.isActive ?? true }
        : { name: '', description: '', isActive: true }
      )
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await brandsApi.update(brand.id, data)
        toast.success('Brand updated')
      } else {
        await brandsApi.create(data)
        toast.success('Brand created')
      }
      onSuccess()
    } catch (err) {
      toast.error(err?.response?.data?.message ?? `Failed to ${isEdit ? 'update' : 'create'} brand`)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit brand' : 'Add brand'}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create brand'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          required
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Description"
          error={errors.description?.message}
          {...register('description')}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gray-700">Status</span>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Toggle
                checked={field.value}
                onChange={field.onChange}
                label={field.value ? 'Active' : 'Inactive'}
              />
            )}
          />
        </div>
      </div>
    </Modal>
  )
}
