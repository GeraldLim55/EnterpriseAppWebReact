import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { usersApi } from '@/api'
import { toastFormErrors } from '@/lib/utils'
import { PageHeader } from '@/components/layout'
import {
  Button, Input, Select, Badge, Table, Pagination, SearchInput,
  Modal, ConfirmDialog, Card, Empty,
} from '@/components/ui'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { formatDate, getInitials } from '@/lib/utils'
import { ROLE_LEVELS } from '@/types'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'

// ─── Role Badge ───────────────────────────────────────────────────────────
function RoleBadge({ roleName }) {
  const variants = {
    SuperAdmin: 'purple', Admin: 'danger', Manager: 'info', Staff: 'warning', User: 'default',
  }
  return <Badge variant={variants[roleName] ?? 'default'}>{roleName}</Badge>
}

// ─── User Form Schema ─────────────────────────────────────────────────────
const createUserSchema = z.object({
  username: z.string().min(3).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneCountryCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  userLevel: z.coerce.number(),
  locationId: z.coerce.number().optional(),
})

const editUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneCountryCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  isActive: z.coerce.boolean(),
  userLevel: z.coerce.number(),
})

// ─── Users Page ───────────────────────────────────────────────────────────
export default function UsersPage() {
  const qc = useQueryClient()
  const { session } = useAuth()
  const [params, setParams] = useState({ page: 1, pageSize: 20 })
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const { data: res, isLoading } = useQuery({
    queryKey: ['users', params, search],
    queryFn: () => usersApi.getAll({ ...params, search: search || undefined }).then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => usersApi.delete(id),
    onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries({ queryKey: ['users'] }); setDeleteId(null) },
    onError: () => toast.error('Failed to delete user'),
  })

  const columns = [
    { key: 'username', header: 'User',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700 flex-shrink-0">
            {getInitials(row.firstName, row.lastName, row.username)}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {row.firstName ? `${row.firstName} ${row.lastName ?? ''}`.trim() : row.username}
            </p>
            <p className="text-xs text-gray-400">{row.email}</p>
          </div>
        </div>
      )
    },
    { key: 'roleName', header: 'Role', render: (row) => <RoleBadge roleName={row.roleName} /> },
    { key: 'locationName', header: 'Location', render: (row) => <span className="text-sm text-gray-600">{row.locationName ?? '—'}</span> },
    { key: 'isActive', header: 'Status',
      render: (row) => row.isActive
        ? <Badge variant="success" dot>Active</Badge>
        : <Badge variant="default" dot>Inactive</Badge>
    },
    { key: 'lastLoginDate', header: 'Last login',
      render: (row) => <span className="text-sm text-gray-500">{row.lastLoginDate ? formatDate(row.lastLoginDate) : 'Never'}</span>
    },
    { key: 'updatedDate', header: 'Updated',
      render: (row) => <span className="text-sm text-gray-500">{row.updatedDate ? formatDate(row.updatedDate) : '—'}</span>
    },
    { key: 'actions', header: '', width: '80px',
      render: (row) => row.id !== session?.userId ? (
        <div className="flex items-center gap-1">
          <button onClick={() => setEditUser(row)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setDeleteId(row.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null
    },
  ]

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage user accounts and role assignments."
        breadcrumbs={[{ label: 'Users' }]}
        action={
          <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(true)}>
            Add user
          </Button>
        }
      />

      <Card padding={false}>
        <div className="p-4 border-b border-gray-100">
          <SearchInput value={search} onChange={v => { setSearch(v); setParams(p => ({ ...p, page: 1 })) }} placeholder="Search users…" className="w-64" />
        </div>
        <Table
          columns={columns} data={res?.data ?? []}
          loading={isLoading} rowKey={r => r.id}
          emptyMessage="No users found."
        />
        <Pagination page={params.page ?? 1} pageSize={params.pageSize ?? 20}
          totalCount={res?.totalCount ?? 0} totalPages={res?.totalPages ?? 0}
          onPageChange={page => setParams(p => ({ ...p, page }))} />
      </Card>

      {/* Create Modal */}
      <CreateUserModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['users'] }) }}
        tenantId={session?.tenantId ?? 1}
      />

      {/* Edit Modal */}
      {editUser && (
        <EditUserModal
          user={editUser}
          open onClose={() => setEditUser(null)}
          onSuccess={() => { setEditUser(null); qc.invalidateQueries({ queryKey: ['users'] }) }}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete user" message="This user account will be permanently removed."
        confirmLabel="Delete" variant="danger" loading={deleteMutation.isPending}
      />
    </div>
  )
}

// ─── Create User Modal ────────────────────────────────────────────────────
function CreateUserModal({ open, onClose, onSuccess, tenantId }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: { userLevel: ROLE_LEVELS.User },
  })

  const onSubmit = async (data) => {
    try {
      await usersApi.create({ ...data, tenantId })
      toast.success('User created')
      reset()
      onSuccess()
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to create user')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add user" size="md"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit(onSubmit, e => toastFormErrors(e, toast))} loading={isSubmitting}>Create user</Button>
      </>}
    >
      <div className="grid grid-cols-2 gap-4">
        <Input label="First name" {...register('firstName')} />
        <Input label="Last name" {...register('lastName')} />
        <div className="col-span-2"><Input label="Username" required error={errors.username?.message} {...register('username')} /></div>
        <div className="col-span-2"><Input label="Email" type="email" required error={errors.email?.message} {...register('email')} /></div>
        <div className="col-span-2"><Input label="Password" type="password" required error={errors.password?.message} hint="Min 8 chars with uppercase, digit, and special character" {...register('password')} /></div>
        <div className="col-span-2">
          <Select label="Role" options={Object.entries(ROLE_LEVELS).map(([k, v]) => ({ value: v, label: k }))} {...register('userLevel')} />
        </div>
      </div>
    </Modal>
  )
}

// ─── Edit User Modal ──────────────────────────────────────────────────────
function EditUserModal({ user, open, onClose, onSuccess }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: user.firstName, lastName: user.lastName,
      phoneCountryCode: user.phoneCountryCode ?? '60',
      phoneNumber: user.phoneNumber, isActive: user.isActive, userLevel: user.userLevel,
    },
  })

  const onSubmit = async (data) => {
    try {
      await usersApi.update(user.id, data)
      toast.success('User updated')
      onSuccess()
    } catch { toast.error('Failed to update user') }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit user" size="md"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit(onSubmit, e => toastFormErrors(e, toast))} loading={isSubmitting}>Save changes</Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold">
            {getInitials(user.firstName, user.lastName, user.username)}
          </div>
          <div>
            <p className="font-medium text-gray-900">{user.username}</p>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="First name" {...register('firstName')} />
          <Input label="Last name" {...register('lastName')} />
          <PhoneInput
            countryCodeProps={register('phoneCountryCode')}
            phoneProps={register('phoneNumber')}
            colSpan2={false}
          />
          <Select label="Role" options={Object.entries(ROLE_LEVELS).map(([k,v])=>({value:v,label:k}))} {...register('userLevel')} />
          <Select label="Status" options={[{value:'true',label:'Active'},{value:'false',label:'Inactive'}]} {...register('isActive')} />
        </div>
      </div>
    </Modal>
  )
}
