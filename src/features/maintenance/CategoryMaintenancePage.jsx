import { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Pencil, ChevronDown, ChevronRight, FolderTree } from 'lucide-react'
import { categoriesApi } from '@/api'
import { PageHeader } from '@/components/layout'
import {
  Button, Input, Badge, Table, Pagination,
  SearchInput, Modal, ConfirmDialog, Card,
} from '@/components/ui'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const PAGE_SIZE = 20

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(500).optional(),
  isActive: z.boolean(),
})

const subCategorySchema = z.object({
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

// ─── Flatten tree for table display ───────────────────────────────────────
function flattenCategories(categories, search, depth = 0) {
  const rows = []
  for (const cat of categories) {
    const matchesSelf = !search || cat.name.toLowerCase().includes(search) || (cat.description ?? '').toLowerCase().includes(search)
    const childRows = flattenCategories(cat.subCategories ?? [], search, depth + 1)
    if (matchesSelf || childRows.length > 0) {
      rows.push({ ...cat, _depth: depth, _hasChildren: (cat.subCategories ?? []).length > 0 })
      rows.push(...childRows)
    }
  }
  return rows
}

// ─── Category Maintenance Page ─────────────────────────────────────────────
export default function CategoryMaintenancePage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [showCreateSub, setShowCreateSub] = useState(false)
  const [editCategory, setEditCategory] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [subParentId, setSubParentId] = useState(null)
  const [subParentName, setSubParentName] = useState('')

  const { data: allCategories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll().then(r => r.data.data ?? []),
  })

  // Build visible rows (respect expand/collapse for subcategories)
  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const flat = flattenCategories(allCategories, q)
    if (!q) {
      // Filter out subcategories whose parent is collapsed
      return flat.filter(row => {
        if (row._depth === 0) return true
        // Find parent id — walk back
        return expanded.has(row.categoryId)
      })
    }
    return flat
  }, [allCategories, search, expanded])

  const totalCount = visibleRows.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const paginated = visibleRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const deleteMutation = useMutation({
    mutationFn: (id) => categoriesApi.delete(id),
    onSuccess: () => {
      toast.success('Category deleted')
      qc.invalidateQueries({ queryKey: ['categories'] })
      setDeleteId(null)
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to delete category'),
  })

  const columns = [
    {
      key: 'name',
      header: 'Category',
      render: (row) => (
        <div className="flex items-center gap-2" style={{ paddingLeft: row._depth * 32 }}>
          {row._hasChildren && (
            <button
              onClick={() => toggleExpand(row.id)}
              className="p-0.5 rounded text-gray-400 hover:text-gray-600 transition-colors"
            >
              {expanded.has(row.id)
                ? <ChevronDown className="w-3.5 h-3.5" />
                : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
          <div className="w-7 h-7 rounded bg-brand-50 flex items-center justify-center flex-shrink-0">
            <FolderTree className="w-3.5 h-3.5 text-brand-400" />
          </div>
          <span className={`text-sm font-medium text-gray-900 ${row._depth > 0 ? 'text-gray-700' : ''}`}>
            {row.name}
          </span>
          {row._depth > 0 && (
            <span className="text-xs text-gray-400 ml-1">sub</span>
          )}
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
      width: '100px',
      render: (row) => (
        <div className="flex items-center gap-1">
          {row._depth === 0 && (
            <button
              onClick={() => { setSubParentId(row.id); setSubParentName(row.name); setShowCreateSub(true) }}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
              title="Add sub-category"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setEditCategory(row)}
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
        title="Category Maintenance"
        description="Manage product categories and sub-categories."
        breadcrumbs={[{ label: 'Maintenance' }, { label: 'Category Maintenance' }]}
        action={
          <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(true)}>
            Add category
          </Button>
        }
      />

      <Card padding={false}>
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <SearchInput
            value={search}
            onChange={(val) => { setSearch(val); setPage(1) }}
            placeholder="Search categories…"
            className="w-60"
          />
          <span className="ml-auto text-xs text-gray-400">
            {allCategories.length} {allCategories.length === 1 ? 'category' : 'categories'}
          </span>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={paginated}
          loading={isLoading}
          rowKey={r => r.categoryId ? `sub-${r.id}` : `cat-${r.id}`}
          emptyMessage="No categories found."
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

      {/* Create Category Modal */}
      <CategoryModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setShowCreate(false)
          qc.invalidateQueries({ queryKey: ['categories'] })
        }}
      />

      {/* Create Sub-category Modal */}
      <CategoryModal
        key={subParentId}
        open={showCreateSub}
        parentId={subParentId}
        parentName={subParentName}
        onClose={() => { setShowCreateSub(false); setSubParentId(null); setSubParentName('') }}
        onSuccess={() => {
          setShowCreateSub(false)
          setSubParentId(null)
          setSubParentName('')
          setExpanded(prev => new Set([...prev, subParentId]))
          qc.invalidateQueries({ queryKey: ['categories'] })
        }}
      />

      {/* Edit Modal */}
      <CategoryModal
        open={editCategory !== null}
        category={editCategory}
        onClose={() => setEditCategory(null)}
        onSuccess={() => {
          setEditCategory(null)
          qc.invalidateQueries({ queryKey: ['categories'] })
        }}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete category"
        message="This category will be permanently removed. Items linked to it will have their category cleared."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

// ─── Category Modal (create / create-sub / edit) ───────────────────────────
function CategoryModal({ open, category, parentId, parentName, onClose, onSuccess }) {
  const isEdit = !!category
  const isSub = !isEdit && parentId != null

  const schema = isSub ? subCategorySchema : categorySchema

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', isActive: true },
  })

  useEffect(() => {
    if (open) {
      if (isEdit) {
        reset({
          name: category.name ?? '',
          description: category.description ?? '',
          isActive: category.isActive ?? true,
        })
      } else {
        reset({ name: '', description: '', isActive: true })
      }
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        if (category.categoryId) {
          await categoriesApi.saveSub({ id: category.id, categoryId: category.categoryId, name: data.name, description: data.description, isActive: data.isActive })
        } else {
          await categoriesApi.save({ id: category.id, name: data.name, description: data.description, isActive: data.isActive })
        }
        toast.success('Category updated')
      } else if (isSub) {
        await categoriesApi.saveSub({ categoryId: parentId, name: data.name, description: data.description, isActive: data.isActive })
        toast.success('Sub-category created')
      } else {
        await categoriesApi.save({ name: data.name, description: data.description, isActive: data.isActive })
        toast.success('Category created')
      }
      onSuccess()
    } catch (err) {
      toast.error(err?.response?.data?.message ?? `Failed to ${isEdit ? 'update' : 'create'} category`)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const title = isEdit
    ? `Edit ${category?.categoryId ? 'sub-' : ''}category`
    : isSub
      ? `Add sub-category [${parentName}]`
      : 'Add category'

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? 'Save changes' : isSub ? 'Create sub-category' : 'Create category'}
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
