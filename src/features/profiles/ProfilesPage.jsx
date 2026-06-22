import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { usersApi } from '@/api'
import { PageHeader } from '@/components/layout'
import { Card, Spinner, Table } from '@/components/ui'
import { getInitials } from '@/lib/utils'

export default function ProfilesPage() {
  const navigate = useNavigate()

  const { data: res, isLoading } = useQuery({
    queryKey: ['users-profiles'],
    queryFn: () => usersApi.getAll({ page: 1, pageSize: 1000 }).then(r => r.data),
  })

  const users = res?.data ?? []

  const columns = [
    {
      key: 'user',
      header: 'User',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700 flex-shrink-0">
            {getInitials(row.firstName, row.lastName, row.username)}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{row.firstName} {row.lastName}</p>
            <p className="text-xs text-gray-400">{row.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => <span className="text-sm text-gray-500">{row.email}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      render: (row) => (
        <button
          onClick={() => navigate(`/profiles/${row.id}`)}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
          View profile →
        </button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Profiles"
        description="View and manage profile information for all users."
        breadcrumbs={[{ label: 'Profiles' }, { label: 'Profiles' }]}
      />
      <Card padding={false}>
        <Table columns={columns} data={users} loading={isLoading} rowKey={r => r.id} emptyMessage="No users found." />
      </Card>
    </div>
  )
}
