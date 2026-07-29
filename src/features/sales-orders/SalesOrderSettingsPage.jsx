import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesOrdersApi, usersApi } from '@/api'
import { PageHeader } from '@/components/layout'
import { Button, Input, Card, CardHeader, Spinner } from '@/components/ui'
import toast from 'react-hot-toast'
import { ShoppingCart } from 'lucide-react'

const schema = z.object({
  prefix: z.string().min(1).max(20),
  runningNumber: z.coerce.number().int().min(1),
  paddingDigits: z.coerce.number().int().min(1).max(10),
  autoSendEmailOnApproval: z.boolean(),
  notifyManagerIds: z.array(z.number()),
  ccEmails: z.string().optional(),
  bccEmails: z.string().optional(),
})

export default function SalesOrderSettingsPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['so-settings'],
    queryFn: () => salesOrdersApi.getSettings().then(r => r.data?.data),
  })

  const { data: usersData } = useQuery({
    queryKey: ['users', { pageSize: 100, page: 1 }],
    queryFn: () => usersApi.getAll({ pageSize: 100, page: 1 }).then(r => r.data?.data ?? []),
    staleTime: 1000 * 60 * 5,
  })

  const managers = (usersData ?? []).filter(u => u.userLevel >= 60 && u.isActive)

  const { register, handleSubmit, reset, watch, control, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      prefix: 'SO-', runningNumber: 1, paddingDigits: 5,
      autoSendEmailOnApproval: false, notifyManagerIds: [], ccEmails: '', bccEmails: '',
    },
  })

  useEffect(() => {
    if (data) {
      reset({
        prefix: data.prefix ?? 'SO-',
        runningNumber: data.runningNumber ?? 1,
        paddingDigits: data.paddingDigits ?? 5,
        autoSendEmailOnApproval: data.autoSendEmailOnApproval ?? false,
        notifyManagerIds: data.notifyManagerIds ?? [],
        ccEmails: data.ccEmails ?? '',
        bccEmails: data.bccEmails ?? '',
      })
    }
  }, [data, reset])

  const save = useMutation({
    mutationFn: (values) => salesOrdersApi.saveSettings(values),
    onSuccess: () => { toast.success('Settings saved'); qc.invalidateQueries({ queryKey: ['so-settings'] }) },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to save'),
  })

  const prefix = watch('prefix') ?? ''
  const running = watch('runningNumber') ?? 1
  const padding = watch('paddingDigits') ?? 5
  const notifyIds = watch('notifyManagerIds') ?? []
  const autoSend = watch('autoSendEmailOnApproval')
  const preview = `${prefix}${String(running).padStart(Number(padding), '0')}`

  const toggleManager = (id) => {
    const current = notifyIds
    setValue('notifyManagerIds', current.includes(id)
      ? current.filter(x => x !== id)
      : [...current, id])
  }

  if (isLoading) return <div className="flex justify-center p-20"><Spinner /></div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Sales Order Settings"
        description="Configure sales order number format and email notifications."
        breadcrumbs={[{ label: 'Settings' }, { label: 'Sales Orders' }]}
      />

      <form onSubmit={handleSubmit(v => save.mutate(v))} className="space-y-5">
        <Card>
          <CardHeader title="Order Number Format" icon={<ShoppingCart className="w-4 h-4" />} />
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Prefix" placeholder="e.g. SO-" error={errors.prefix?.message} {...register('prefix')} />
              <Input label="Padding digits" type="number" min={1} max={10}
                error={errors.paddingDigits?.message} {...register('paddingDigits')} />
            </div>
            <Input label="Next running number" type="number" min={1}
              error={errors.runningNumber?.message} {...register('runningNumber')} />
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Preview: </span>
              <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">{preview}</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Email Notifications" icon={<ShoppingCart className="w-4 h-4" />} />
          <div className="p-5 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <Controller name="autoSendEmailOnApproval" control={control} render={({ field }) => (
                <input type="checkbox" checked={field.value} onChange={field.onChange}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand-600" />
              )} />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Auto-send email to customer when sales order is approved
              </span>
            </label>

            {managers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notify managers on approval
                </label>
                <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                  {managers.map(m => (
                    <label key={m.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                      <input type="checkbox" checked={notifyIds.includes(m.id)} onChange={() => toggleManager(m.id)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand-600" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {m.firstName && m.lastName ? `${m.firstName} ${m.lastName}` : m.username}
                        <span className="text-gray-400 ml-1">({m.email})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Input label="CC Emails" placeholder="email1@example.com, email2@example.com"
              {...register('ccEmails')} />
            <Input label="BCC Emails" placeholder="email1@example.com, email2@example.com"
              {...register('bccEmails')} />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={save.isPending}>Save Settings</Button>
        </div>
      </form>
    </div>
  )
}
