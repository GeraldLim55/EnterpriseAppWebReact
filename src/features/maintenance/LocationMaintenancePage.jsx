import { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, MapPin, Pencil, Star } from 'lucide-react'
import { locationsApi } from '@/api'
import { PageHeader } from '@/components/layout'
import {
  Button, Input, Select, Badge, Table, Pagination,
  SearchInput, Modal, ConfirmDialog, Card, Textarea,
} from '@/components/ui'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { CountryCitySelect } from '@/components/ui/CountryCitySelect'
import { formatDate, toastFormErrors } from '@/lib/utils'
import toast from 'react-hot-toast'

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

const locationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
  phoneCountryCode: z.string().optional(),
  phone: z.string().max(50).optional().or(z.literal('')),
  isActive: z.boolean(),
  isDefault: z.boolean(),
})

// ─── Toggle ───────────────────────────────────────────────────────────────
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

// ─── Location Maintenance Page ─────────────────────────────────────────────
export default function LocationMaintenancePage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editLocation, setEditLocation] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const { data: res, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.getAll().then(r => r.data),
  })

  const allLocations = res?.data ?? []

  const filtered = useMemo(() => {
    let list = allLocations
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(l =>
        l.name.toLowerCase().includes(q) ||
        (l.city ?? '').toLowerCase().includes(q) ||
        (l.state ?? '').toLowerCase().includes(q) ||
        (l.country ?? '').toLowerCase().includes(q)
      )
    }
    if (statusFilter !== '') {
      const active = statusFilter === 'true'
      list = list.filter(l => l.isActive === active)
    }
    return list
  }, [allLocations, search, statusFilter])

  const totalCount = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleFilterChange = (setter) => (val) => {
    setter(val)
    setPage(1)
  }

  const deleteMutation = useMutation({
    mutationFn: (id) => locationsApi.delete(id),
    onSuccess: () => {
      toast.success('Location deleted')
      qc.invalidateQueries({ queryKey: ['locations'] })
      qc.invalidateQueries({ queryKey: ['locations-lookup'] })
      setDeleteId(null)
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to delete location'),
  })

  const columns = [
    {
      key: 'name',
      header: 'Location',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${row.isDefault ? 'bg-amber-50' : 'bg-brand-50'}`}>
            {row.isDefault
              ? <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              : <MapPin className="w-4 h-4 text-brand-400" />}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{row.name}</p>
            {row.city && <p className="text-xs text-gray-400">{[row.city, row.state, row.country].filter(Boolean).join(', ')}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      render: (row) => <span className="text-sm text-gray-500 line-clamp-1">{row.address || '—'}</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => <span className="text-sm text-gray-500">{row.phone || '—'}</span>,
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
          <button
            onClick={() => setEditLocation(row)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => !row.isDefault && setDeleteId(row.id)}
            disabled={row.isDefault}
            title={row.isDefault ? 'Cannot delete the default location — set another as default first' : 'Delete'}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
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
        title="Location Maintenance"
        description="Manage business locations."
        breadcrumbs={[{ label: 'Maintenance' }, { label: 'Location Maintenance' }]}
        action={
          <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(true)}>
            Add location
          </Button>
        }
      />

      <Card padding={false}>
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <SearchInput
            value={search}
            onChange={handleFilterChange(setSearch)}
            placeholder="Search locations…"
            className="w-60"
          />
          <Select
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={e => handleFilterChange(setStatusFilter)(e.target.value)}
            className="w-40"
          />
          <span className="ml-auto text-xs text-gray-400">
            {totalCount} {totalCount === 1 ? 'location' : 'locations'}
          </span>
        </div>

        <Table
          columns={columns}
          data={paginated}
          loading={isLoading}
          rowKey={r => r.id}
          emptyMessage="No locations found."
        />

        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={totalCount}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </Card>

      <LocationModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setShowCreate(false)
          qc.invalidateQueries({ queryKey: ['locations'] })
          qc.invalidateQueries({ queryKey: ['locations-lookup'] })
        }}
      />

      <LocationModal
        open={editLocation !== null}
        location={editLocation}
        onClose={() => setEditLocation(null)}
        onSuccess={() => {
          setEditLocation(null)
          qc.invalidateQueries({ queryKey: ['locations'] })
          qc.invalidateQueries({ queryKey: ['locations-lookup'] })
        }}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete location"
        message="This location will be permanently removed. Invoices already linked to it will keep their location name."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

// ─── Location Modal (create + edit) ──────────────────────────────────────
function LocationModal({ open, location, onClose, onSuccess }) {
  const isEdit = !!location

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(locationSchema),
    defaultValues: { name: '', address: '', city: '', state: '', country: '', postalCode: '', phoneCountryCode: '60', phone: '', isActive: true, isDefault: false },
  })

  const watchedIsDefault = watch('isDefault')

  useEffect(() => {
    if (open) {
      reset(isEdit ? {
        name: location.name ?? '',
        address: location.address ?? '',
        city: location.city ?? '',
        state: location.state ?? '',
        country: location.country ?? '',
        postalCode: location.postalCode ?? '',
        phoneCountryCode: location.phoneCountryCode ?? '60',
        phone: location.phone ?? '',
        isActive: location.isActive ?? true,
        isDefault: location.isDefault ?? false,
      } : { name: '', address: '', city: '', state: '', country: '', postalCode: '', phoneCountryCode: '60', phone: '', isActive: true, isDefault: false })
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await locationsApi.update(location.id, data)
        toast.success('Location updated')
      } else {
        await locationsApi.create(data)
        toast.success('Location created')
      }
      onSuccess()
    } catch (err) {
      toast.error(err?.response?.data?.message ?? `Failed to ${isEdit ? 'update' : 'create'} location`)
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
      title={isEdit ? 'Edit location' : 'Add location'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit, e => toastFormErrors(e, toast))} loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create location'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Name" required error={errors.name?.message} {...register('name')} />
        <Textarea label="Address" rows={2} error={errors.address?.message} {...register('address')} />
        <div className="grid grid-cols-2 gap-3">
          <CountryCitySelect
            countryProps={register('country')}
            cityProps={register('city')}
            watchedCountry={watch('country')}
            onClearCity={() => setValue('city', '')}
            countryError={errors.country?.message}
            cityError={errors.city?.message}
          />
          <Input label="State / Province" error={errors.state?.message} {...register('state')} />
          <Input label="Postal code" error={errors.postalCode?.message} {...register('postalCode')} />
        </div>
        <PhoneInput
          countryCodeProps={register('phoneCountryCode')}
          phoneProps={register('phone')}
        />

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
            <span className="text-sm font-medium text-gray-700">Default location</span>
            <Controller
              name="isDefault"
              control={control}
              render={({ field }) => (
                <Toggle checked={field.value} onChange={field.onChange} label={field.value ? 'Yes — this is the default' : 'No'} />
              )}
            />
            {watchedIsDefault && (
              <p className="text-xs text-amber-600">
                Setting this as default will remove the default flag from the current default location.
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
