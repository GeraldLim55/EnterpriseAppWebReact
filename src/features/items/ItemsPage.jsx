import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Download, Upload, Pencil, Trash2, Image, Package } from 'lucide-react'
import { itemsApi, categoriesApi, brandsApi } from '@/api'
import { PageHeader } from '@/components/layout'
import {
  Button, Input, Select, Textarea, Badge, Table, Pagination,
  SearchInput, Modal, ConfirmDialog, Card, CardHeader, Empty, Spinner, StatCard,
} from '@/components/ui'
import { formatCurrency, formatDate, downloadBlob } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import { ROLE_LEVELS } from '@/types'

// ─── Item Status Badge ────────────────────────────────────────────────────
function ItemStatusBadge({ status }) {
  return status === 1
    ? <Badge variant="success" dot>Active</Badge>
    : <Badge variant="default" dot>Inactive</Badge>
}

// ─── Item Form Schema ─────────────────────────────────────────────────────
const itemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
  sku: z.string().max(100).optional(),
  price: z.coerce.number().min(0, 'Price must be 0 or more'),
  costPrice: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0, 'Stock must be 0 or more'),
  categoryId: z.coerce.number().optional(),
  subCategoryId: z.coerce.number().optional(),
  brandId: z.coerce.number().optional(),
  status: z.coerce.number().default(1),
})

// ─── Items List Page ──────────────────────────────────────────────────────
export default function ItemsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasMinLevel } = useAuth()
  const canManage = hasMinLevel(ROLE_LEVELS.Manager)

  const [filters, setFilters] = useState({ page: 1, pageSize: 20 })
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [exporting, setExporting] = useState(false)

  const { data: res, isLoading } = useQuery({
    queryKey: ['items', filters],
    queryFn: () => itemsApi.getAll({ ...filters, search: search || undefined }).then(r => r.data),
  })

  const { data: categoriesRes } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll().then(r => r.data.data ?? []),
    staleTime: Infinity,
  })

  const { data: brandsRes } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.getAll().then(r => r.data),
    staleTime: Infinity,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => itemsApi.delete(id),
    onSuccess: () => {
      toast.success('Item deleted')
      qc.invalidateQueries({ queryKey: ['items'] })
      setDeleteId(null)
    },
    onError: () => toast.error('Failed to delete item'),
  })

  const handleSearch = (v) => {
    setSearch(v)
    setFilters(p => ({ ...p, page: 1, search: v || undefined }))
  }

  const handleExport = async (format) => {
    setExporting(true)
    try {
      const res = await itemsApi.export(filters, format)
      const ext = { Excel: '.xlsx', Csv: '.csv', Pdf: '.pdf' }[format]
      downloadBlob(res.data, `items-${Date.now()}${ext}`)
      toast.success('Export downloaded')
    } catch {
      toast.error('Export failed')
    } finally { setExporting(false) }
  }

  const columns = [
    {
      key: 'imageUrl', header: '', width: '52px',
      render: (row) => row.imageUrl
        ? <img src={row.imageUrl} alt={row.name} className="w-9 h-9 rounded-lg object-cover border border-gray-100" />
        : <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center"><Package className="w-4 h-4 text-gray-400" /></div>
    },
    { key: 'name', header: 'Name', sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900 text-sm">{row.name}</p>
          {row.sku && <p className="text-xs text-gray-400">{row.sku}</p>}
        </div>
      )
    },
    { key: 'categoryName', header: 'Category',
      render: (row) => <span className="text-sm text-gray-600">{row.categoryName ?? '—'}</span>
    },
    { key: 'price', header: 'Price', sortable: true, align: 'right',
      render: (row) => <span className="font-medium text-gray-900">{formatCurrency(row.price)}</span>
    },
    { key: 'stock', header: 'Stock', sortable: true, align: 'right',
      render: (row) => (
        <span className={row.stock <= 5 ? 'text-red-600 font-medium' : 'text-gray-700'}>{row.stock}</span>
      )
    },
    { key: 'status', header: 'Status',
      render: (row) => <ItemStatusBadge status={row.status} />
    },
    { key: 'updatedDate', header: 'Updated',
      render: (row) => <span className="text-sm text-gray-500">{row.updatedDate ? formatDate(row.updatedDate) : '—'}</span>
    },
    { key: 'actions', header: '', width: '80px',
      render: (row) => canManage ? (
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setEditItem(row); setShowForm(true) }}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigate(`/items/${row.id}`)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeleteId(row.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null
    },
  ]

  return (
    <div>
      <PageHeader
        title="Items"
        description="Manage your product catalogue."
        breadcrumbs={[{ label: 'Items' }]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />} loading={exporting} onClick={() => handleExport('Excel')}>
              Export
            </Button>
            {canManage && (
              <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setEditItem(null); setShowForm(true) }}>
                Add item
              </Button>
            )}
          </div>
        }
      />

      <Card padding={false}>
        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <SearchInput value={search} onChange={handleSearch} placeholder="Search items…" className="w-64" />
          <Select
            options={[{ value: '', label: 'All categories' }, ...(categoriesRes ?? []).map(c => ({ value: c.id, label: c.name }))]}
            value={filters.categoryId ?? ''}
            onChange={e => setFilters(p => ({ ...p, categoryId: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
            className="w-44"
          />
          <Select
            options={[{ value: '', label: 'All status' }, { value: '1', label: 'Active' }, { value: '0', label: 'Inactive' }]}
            value={filters.status ?? ''}
            onChange={e => setFilters(p => ({ ...p, status: e.target.value !== '' ? Number(e.target.value) : undefined, page: 1 }))}
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
          emptyMessage="No items found. Add your first item."
        />
        <Pagination
          page={filters.page ?? 1}
          pageSize={filters.pageSize ?? 20}
          totalCount={res?.totalCount ?? 0}
          totalPages={res?.totalPages ?? 0}
          onPageChange={page => setFilters(p => ({ ...p, page }))}
        />
      </Card>

      {/* Create / Edit Modal */}
      <ItemFormModal
        open={showForm}
        item={editItem}
        categories={categoriesRes ?? []}
        brands={brandsRes?.data ?? []}
        onClose={() => { setShowForm(false); setEditItem(null) }}
        onSuccess={() => { setShowForm(false); setEditItem(null); qc.invalidateQueries({ queryKey: ['items'] }) }}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete item"
        message="This item will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

// ─── Item Form Modal ──────────────────────────────────────────────────────
function ItemFormModal({ open, item, categories, brands, onClose, onSuccess }) {
  const { register, handleSubmit, reset, watch, setValue, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: { status: 1, stock: 0, price: 0 },
  })

  // Populate form when opening
  useEffect(() => {
    if (open) {
      reset(item ? {
        name: item.name, description: item.description ?? '', sku: item.sku ?? '',
        price: item.price, costPrice: item.costPrice ?? '', stock: item.stock,
        categoryId: item.categoryId ?? '', subCategoryId: item.subCategoryId ?? '',
        brandId: item.brandId ?? '', status: item.status,
      } : { status: 1, stock: 0, price: 0, name: '', description: '', sku: '', costPrice: '', categoryId: '', subCategoryId: '', brandId: '' })
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const categoryId = watch('categoryId')
  const selectedCategory = categories.find(c => c.id === Number(categoryId))
  const subCategories = selectedCategory?.subCategories ?? []
  const hasSubCategories = subCategories.length > 0

  // Clear sub-category when category changes (skip on initial render)
  const prevCategoryId = useRef(categoryId)
  useEffect(() => {
    if (prevCategoryId.current !== categoryId) {
      setValue('subCategoryId', '')
      prevCategoryId.current = categoryId
    }
  }, [categoryId]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data) => {
    if (hasSubCategories && !data.subCategoryId) {
      setError('subCategoryId', { message: 'Sub-category is required' })
      return
    }
    try {
      if (item) {
        await itemsApi.update(item.id, data)
        toast.success('Item updated')
      } else {
        await itemsApi.create(data)
        toast.success('Item created')
      }
      reset()
      onSuccess()
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Failed to save item'
      toast.error(msg)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? 'Edit item' : 'Add item'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {item ? 'Save changes' : 'Create item'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input label="Name" required error={errors.name?.message} {...register('name')} />
        </div>
        <Input label="SKU" placeholder="SKU-001" {...register('sku')} />
        <Select
          label="Status"
          options={[{ value: 1, label: 'Active' }, { value: 0, label: 'Inactive' }]}
          {...register('status')}
        />
        <Input label="Price (MYR)" type="number" step="0.01" required error={errors.price?.message} {...register('price')} />
        <Input label="Cost price (MYR)" type="number" step="0.01" {...register('costPrice')} />
        <Input label="Stock" type="number" required error={errors.stock?.message} {...register('stock')} />
        <Select
          label="Brand"
          placeholder="Select brand"
          options={brands.map(b => ({ value: b.id, label: b.name }))}
          {...register('brandId')}
        />
        <Select
          label="Category"
          placeholder="Select category"
          options={categories.map(c => ({ value: c.id, label: c.name }))}
          {...register('categoryId')}
        />
        <Select
          label="Sub-category"
          placeholder={hasSubCategories ? 'Select sub-category' : 'No sub-categories'}
          required={hasSubCategories}
          disabled={!hasSubCategories}
          error={errors.subCategoryId?.message}
          options={subCategories.map(s => ({ value: s.id, label: s.name }))}
          {...register('subCategoryId')}
        />
        <div className="sm:col-span-2">
          <Textarea label="Description" rows={3} {...register('description')} />
        </div>
      </div>
    </Modal>
  )
}

// ─── Item Detail / Image Upload Page ─────────────────────────────────────
export function ItemDetailPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const { data: res, isLoading } = useQuery({
    queryKey: ['item', id],
    queryFn: () => itemsApi.getById(Number(id)).then(r => r.data.data),
    enabled: !!id,
  })

  const item = res

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setUploading(true)
    try {
      await itemsApi.uploadImage(Number(id), file)
      toast.success('Image uploaded')
      qc.invalidateQueries({ queryKey: ['item', id] })
      qc.invalidateQueries({ queryKey: ['items'] })
    } catch {
      toast.error('Upload failed. Check file type and size (max 5 MB).')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!item) return <Empty title="Item not found" />

  return (
    <div>
      <PageHeader
        title={item.name}
        breadcrumbs={[{ label: 'Items', href: '/items' }, { label: item.name }]}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image card */}
        <Card className="flex flex-col items-center gap-4">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full rounded-lg object-cover max-h-64 border border-gray-100" />
          ) : (
            <div className="w-full h-48 rounded-lg bg-gray-100 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Image className="w-10 h-10" />
              <p className="text-sm">No image</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleImageUpload} />
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Upload className="w-3.5 h-3.5" />}
            loading={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {item.imageUrl ? 'Replace image' : 'Upload image'}
          </Button>
          <p className="text-xs text-gray-400">JPG, PNG, WebP — max 5 MB</p>
        </Card>

        {/* Details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Item details" />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {[
                ['Name', item.name], ['SKU', item.sku ?? '—'],
                ['Price', formatCurrency(item.price)],
                ['Cost price', item.costPrice ? formatCurrency(item.costPrice) : '—'],
                ['Stock', String(item.stock)],
                ['Category', item.categoryName ?? '—'],
                ['Brand', item.brandName ?? '—'],
                ['Created', formatDate(item.createdDate)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
                  <dd className="text-gray-900 font-medium">{value}</dd>
                </div>
              ))}
              <div className="col-span-2">
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Status</dt>
                <dd><ItemStatusBadge status={item.status} /></dd>
              </div>
              {item.description && (
                <div className="col-span-2">
                  <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Description</dt>
                  <dd className="text-gray-700 leading-relaxed">{item.description}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  )
}
